package pi.pperformance.elite.UserController;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import pi.pperformance.elite.Authentif.JwtUtils;
import pi.pperformance.elite.UserServices.EmailService;
import pi.pperformance.elite.UserServices.UserServiceInterface;
import pi.pperformance.elite.entities.*;
import pi.pperformance.elite.UserRepository.CabinetDrRepository;
import pi.pperformance.elite.UserRepository.UserCabinetRegistrationRepository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Optional;
import pi.pperformance.elite.entities.UserCabinetRegistration;
import java.time.LocalDate; // Add import for LocalDate
import java.time.Period;   // Add import for Period
import java.util.Base64;   // Add import for Base64

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    // --- Dependency Injection ---
    private final JwtUtils jwtUtil;
    private final UserServiceInterface userServices;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final CabinetDrRepository cabinetDrRepository;
    private final UserCabinetRegistrationRepository userCabinetRegistrationRepository;

    @Autowired
    public AuthController(
            JwtUtils jwtUtil,
            UserServiceInterface userServices,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            CabinetDrRepository cabinetDrRepository,
            UserCabinetRegistrationRepository userCabinetRegistrationRepository
    ) {
        this.jwtUtil = jwtUtil;
        this.userServices = userServices;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.cabinetDrRepository = cabinetDrRepository;
        this.userCabinetRegistrationRepository = userCabinetRegistrationRepository;
    }
    // --- End Dependency Injection ---

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, Object> loginRequest) {
        String email = (String) loginRequest.get("email");
        String password = (String) loginRequest.get("password");
        Object cabinetIdObj = loginRequest.get("cabinetId");
        Long parsedRequestedCabinetId = null; // Use a different name for the parsed value

        // Parse requestedCabinetId if provided
        if (cabinetIdObj != null) {
             if (cabinetIdObj instanceof Integer) {
                parsedRequestedCabinetId = ((Integer) cabinetIdObj).longValue();
            } else if (cabinetIdObj instanceof Long) {
                parsedRequestedCabinetId = (Long) cabinetIdObj;
            } else if (cabinetIdObj instanceof String) {
                try {
                    parsedRequestedCabinetId = Long.parseLong((String) cabinetIdObj);
                } catch (NumberFormatException e) {
                    log.warn("Invalid cabinetId format received: {}", cabinetIdObj);
                    return ResponseEntity.badRequest().body(Map.of("message", "Invalid cabinetId format."));
                }
            }
        }
        // Use a final variable for lambda access
        final Long finalRequestedCabinetId = parsedRequestedCabinetId;


        // 1. Find user by email
        User baseUser = userServices.findByEmail(email);
        if (baseUser == null) {
            log.warn("Login failed: No user found for email {}", email);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid credentials."));
        }

        // 2. Verify password
        if (!passwordEncoder.matches(password, baseUser.getPassword())) {
            log.warn("Login failed: Incorrect password for user {}", email);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid credentials."));
        }
        log.info("Password verified for user {}", email);

        // 3. Handle Role-Specific Logic & Cabinet Selection (Simplified - No active check here)
        Long cabinetIdForToken = null;

        if (baseUser.getRole() == Role.ADMIN) {
            cabinetIdForToken = null;
            log.info("Admin login successful for {}", email);

        } else if (baseUser instanceof Doctor || baseUser instanceof Assistant) {
            // Check if Doctor/Assistant is active
            boolean isActive = false;
            if (baseUser instanceof Doctor) {
                isActive = ((Doctor) baseUser).isActive();
            } else if (baseUser instanceof Assistant) {
                isActive = ((Assistant) baseUser).isActive();
            }

            if (!isActive) {
                log.warn("Login failed: Doctor/Assistant {} account is inactive.", email);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Your account is currently inactive. Please contact support."));
            }

            cabinetIdForToken = getDoctorOrAssistantCabinetId(baseUser);
            if (cabinetIdForToken == null) {
                log.error("Login failed: Doctor/Assistant {} has no assigned cabinet.", email);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Account not associated with a cabinet."));
            }
            // Check if requested cabinet matches assigned cabinet
            if (finalRequestedCabinetId != null && !finalRequestedCabinetId.equals(cabinetIdForToken)) {
                log.warn("Login failed: Doctor/Assistant {} requested cabinet {} but belongs to {}", email, finalRequestedCabinetId, cabinetIdForToken);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Access denied for the selected cabinet."));
            }
            log.info("Doctor/Assistant login successful for {} in cabinet {}", email, cabinetIdForToken);

        } else if (baseUser instanceof Patient) {
            Patient patient = (Patient) baseUser;
            List<UserCabinetRegistration> allRegistrations = userCabinetRegistrationRepository.findByUserId(patient.getId());

            if (allRegistrations.isEmpty()) {
                 log.warn("Login failed: Patient {} has no registrations.", email);
                 return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Account not registered with any cabinet."));
            }

            if (finalRequestedCabinetId != null) {
                // Check if registration exists for the requested cabinet (active or inactive)
                Optional<UserCabinetRegistration> targetReg = allRegistrations.stream()
                        .filter(reg -> reg.getCabinet().getIdSite().equals(finalRequestedCabinetId)) // Use final variable
                        .findFirst();

                if (targetReg.isPresent()) {
                     // Check if this specific registration is active
                     if (targetReg.get().isActive()) {
                         cabinetIdForToken = finalRequestedCabinetId;
                         log.info("Patient login successful for {} in requested active cabinet {}", email, cabinetIdForToken);
                     } else {
                         log.warn("Login failed: Patient {} registration in requested cabinet {} is inactive.", email, finalRequestedCabinetId);
                         return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Account is inactive in the selected cabinet."));
                     }
                } else {
                    log.warn("Login failed: Patient {} has no registration for requested cabinet {}", email, finalRequestedCabinetId);
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not registered in the selected cabinet."));
                }
            } else {
                // No specific cabinet requested, check active registrations
                 List<UserCabinetRegistration> activeRegistrations = allRegistrations.stream()
                         .filter(UserCabinetRegistration::isActive)
                         .collect(Collectors.toList());

                 if (activeRegistrations.isEmpty()) {
                     log.warn("Login failed: Patient {} has registrations, but none are active.", email);
                     return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "No active cabinet registration found for this account."));
                 } else if (activeRegistrations.size() == 1) {
                     cabinetIdForToken = activeRegistrations.get(0).getCabinet().getIdSite();
                     log.info("Patient login successful for {} in single active cabinet {}", email, cabinetIdForToken);
                 } else {
                     // Multiple active registrations, require selection
                     log.info("Patient {} has multiple active registrations ({}). Prompting for selection.", email, activeRegistrations.size());
                     List<Map<String, Object>> cabinetOptions = activeRegistrations.stream()
                             .map(reg -> {
                                 CabinetDr cabinet = reg.getCabinet();
                                 Map<String, Object> cabinetInfo = new HashMap<>();
                                 cabinetInfo.put("cabinetId", cabinet.getIdSite());
                                 cabinetInfo.put("cabinetName", getCabinetName(cabinet.getIdSite()));
                                 return cabinetInfo;
                             })
                             .distinct()
                             .collect(Collectors.toList());
                     return ResponseEntity.status(HttpStatus.PRECONDITION_REQUIRED)
                             .body(Map.of(
                                     "message", "Multiple active accounts found. Please select a cabinet.",
                                     "needsCabinetSelection", true,
                                     "cabinets", cabinetOptions
                             ));
                 }
            }
        } else if (baseUser instanceof DoctorCentreDexamen) {
            DoctorCentreDexamen doctorCentre = (DoctorCentreDexamen) baseUser;

            // Check if active (isActive == 1 means true)
            if (!doctorCentre.isActive()) {
                log.warn("Login failed: DoctorCentreDexamen {} account is inactive.", email);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Your account is currently inactive. Please contact support."));
            }

            // Get the associated CentreDexamen and its ID
            CentreDexamen centre = doctorCentre.getCentreDexamen();
            if (centre == null || centre.getIdCentre() == null) { // Use the correct getter getIdCentre()
                log.error("Login failed: DoctorCentreDexamen {} has no assigned centre or centre has no ID.", email);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Account not associated with a valid examination centre."));
            }
            cabinetIdForToken = centre.getIdCentre(); // Store centre ID here using the correct getter

            // Optional: Check against requestedCabinetId if DoctorCentreDexamen can also select cabinets (unlikely based on request)
            // if (finalRequestedCabinetId != null && !finalRequestedCabinetId.equals(cabinetIdForToken)) {
            //     log.warn("Login failed: DoctorCentreDexamen {} requested centre {} but belongs to {}", email, finalRequestedCabinetId, cabinetIdForToken);
            //     return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Access denied for the selected centre.")); // Or appropriate message
            // }

            log.info("DoctorCentreDexamen login successful for {} in centre {}", email, cabinetIdForToken);

        } else {
             log.error("Login failed: Unhandled user type for email {}", email);
             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Login failed due to unexpected user role."));
        }

        // 4. Generate Tokens and Respond (Simplified)
        Collection<GrantedAuthority> authorities = List.of(() -> "ROLE_" + baseUser.getRole().name());
        final String accessToken = jwtUtil.generateToken(baseUser.getEmail(), authorities, cabinetIdForToken);
        final String refreshToken = jwtUtil.generateRefreshToken(baseUser.getEmail(), authorities, cabinetIdForToken);

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("accessToken", accessToken);
        responseBody.put("refreshToken", refreshToken);
        responseBody.put("roles", authorities.stream().map(GrantedAuthority::getAuthority).collect(Collectors.toList()));

        // Include minimal user info needed by frontend
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", baseUser.getId());
        userInfo.put("email", baseUser.getEmail());
        userInfo.put("firstName", baseUser.getFirstName());
        userInfo.put("lastName", baseUser.getLastName());
        userInfo.put("role", baseUser.getRole());
        userInfo.put("cabinetId", cabinetIdForToken);

        // --- Add requested fields ---
        userInfo.put("birthDate", baseUser.getBirthDate() != null ? baseUser.getBirthDate().toString() : null); // Format as ISO string
        userInfo.put("gender", baseUser.getGender());
        userInfo.put("address", baseUser.getAddress()); // User's own address
        userInfo.put("tel", baseUser.getTel()); // User's own tel

        // Add active cabinet details if a cabinetIdForToken was determined
        if (cabinetIdForToken != null && !(baseUser instanceof Admin)) { // Admins don't have an active cabinet in this context
            Optional<CabinetDr> activeCabinetOpt = cabinetDrRepository.findById(cabinetIdForToken);
            if (activeCabinetOpt.isPresent()) {
                CabinetDr activeCabinet = activeCabinetOpt.get();
                Map<String, Object> activeCabinetInfo = new HashMap<>();
                activeCabinetInfo.put("id", activeCabinet.getIdSite());
                activeCabinetInfo.put("name", activeCabinet.getName());
                activeCabinetInfo.put("address", activeCabinet.getAddress());
                activeCabinetInfo.put("tel", activeCabinet.getTel());
                // Add other cabinet details if needed
                userInfo.put("activeCabinet", activeCabinetInfo);
                log.info("Included active cabinet details for cabinetId: {}", cabinetIdForToken);
            } else {
                log.warn("Could not find details for active cabinetId: {}", cabinetIdForToken);
                userInfo.put("activeCabinet", null); // Indicate cabinet details couldn't be found
            }
        } else {
             userInfo.put("activeCabinet", null); // No active cabinet applicable (e.g., Admin) or determined
        }


        // Handle photoProfil (convert byte[] to Base64 string)
        if (baseUser.getPhotoProfil() != null && baseUser.getPhotoProfil().length > 0) {
            String photoBase64 = Base64.getEncoder().encodeToString(baseUser.getPhotoProfil());
            // Optionally add MIME type prefix if needed by frontend: "data:image/jpeg;base64," + photoBase64
            userInfo.put("photoProfil", photoBase64);
        } else {
            userInfo.put("photoProfil", null);
        }

        // Calculate age
        if (baseUser.getBirthDate() != null) {
            userInfo.put("age", Period.between(baseUser.getBirthDate(), LocalDate.now()).getYears());
        } else {
            userInfo.put("age", null);
        }

        // Add speciality specifically for DoctorCentreDexamen
        if (baseUser instanceof DoctorCentreDexamen) {
            userInfo.put("speciality", ((DoctorCentreDexamen) baseUser).getSpeciality());
        }
        // --- End adding fields ---

        responseBody.put("user", userInfo);

        return ResponseEntity.ok(responseBody);
    }


    // Helper method to get cabinet ID for Doctor or Assistant
    private Long getDoctorOrAssistantCabinetId(User user) {
        if (user instanceof Doctor) {
            CabinetDr cabinet = ((Doctor) user).getCabinet();
            return cabinet != null ? cabinet.getIdSite() : null;
        } else if (user instanceof Assistant) {
            CabinetDr cabinet = ((Assistant) user).getCabinet();
            return cabinet != null ? cabinet.getIdSite() : null;
        }
        return null; // Not a Doctor or Assistant
    }

     // Helper method to get cabinet name (optional, requires repository)
    private String getCabinetName(Long cabinetId) {
        if (cabinetId == null) return null;
        return cabinetDrRepository.findById(cabinetId)
                                 .map(CabinetDr::getName)
                                 .orElse(null);
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshAccessToken(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        if (refreshToken == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Refresh token is missing!", "errorCode", "AUTH003"));
        }

        String email;
        Long cabinetIdFromToken = null;
        try {
            email = jwtUtil.extractEmail(refreshToken);
             cabinetIdFromToken = jwtUtil.extractCabinetId(refreshToken);
        } catch (Exception e) {
            log.error("Error extracting data from refresh token: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid refresh token format!", "errorCode", "AUTH004"));
        }

        if (!jwtUtil.validateToken(refreshToken, email)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid or expired refresh token!", "errorCode", "AUTH005"));
        }

        User baseUser = userServices.findByEmail(email);
        if (baseUser == null) {
             log.error("Refresh failed: User {} not found during refresh.", email);
             return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User account not found.", "errorCode", "AUTH006"));
        }

        // Simplified active check for refresh (can be enhanced if needed)
        boolean isActiveInContext = true; // Assume active if token is valid for now
        // Add more sophisticated checks here if needed based on role and cabinetIdFromToken

        if (!isActiveInContext) {
            log.warn("Refresh failed: User {} is not active in the context of cabinetId {}", email, cabinetIdFromToken);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User account is inactive or invalid context.", "errorCode", "AUTH007"));
        }

        Collection<GrantedAuthority> authorities = List.of(() -> "ROLE_" + baseUser.getRole().name());
        String newAccessToken = jwtUtil.generateToken(email, authorities, cabinetIdFromToken);

        return ResponseEntity.ok(Map.of("accessToken", newAccessToken));
    }

    @PostMapping("/request-password-reset")
    public ResponseEntity<?> requestPasswordReset(@RequestBody Map<String, String> request) {
        String email = request.get("email");

        User user = userServices.findByEmail(email);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Email not found."));
        }

        String token = UUID.randomUUID().toString();
        userServices.savePasswordResetToken(user, token);

        String resetLink = "http://localhost:3000/reset-password?token=" + token;
        emailService.sendEmail(email, "Password Reset Request", "Click the link to reset your password: " + resetLink);

        return ResponseEntity.ok(Map.of("message", "Password reset link sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String newPassword = request.get("newPassword");

        if (token == null || token.trim().isEmpty() || newPassword == null || newPassword.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Token and new password are required."));
        }

        try {
            boolean isValid = userServices.validateResetToken(token);
            if (!isValid) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid or expired password reset token."));
            }

            boolean isReset = userServices.resetPassword(token, newPassword);
            if (!isReset) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Failed to reset password. Please try requesting a new link."));
            }

            return ResponseEntity.ok(Map.of("message", "Password successfully reset."));

        } catch (Exception e) {
            log.error("Error during password reset for token {}: {}", token, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "An unexpected error occurred during password reset."));
        }
    }
}
