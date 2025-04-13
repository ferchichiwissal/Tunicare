package pi.pperformance.elite.UserController;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;

import org.slf4j.Logger; // Add logger import
import org.slf4j.LoggerFactory; // Add logger import
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException; // Import for catching constraint violations
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException; // Import AccessDeniedException
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import pi.pperformance.elite.Authentif.JwtUtils;
import pi.pperformance.elite.UserServices.EmailService;
import pi.pperformance.elite.UserServices.RecaptchaService;
import pi.pperformance.elite.UserServices.UserServiceInterface;
import pi.pperformance.elite.UserServices.VerificationService;
import pi.pperformance.elite.entities.Admin;
import pi.pperformance.elite.entities.Assistant;
import pi.pperformance.elite.entities.Doctor;
import pi.pperformance.elite.entities.Patient;
import pi.pperformance.elite.entities.Role;
import pi.pperformance.elite.entities.User;
import pi.pperformance.elite.entities.VerificationRequest;
import pi.pperformance.elite.exceptions.AccountNotFoundException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import dto.UserUpdateDTO; // Import the new DTO
import pi.pperformance.elite.UserRepository.*;
import pi.pperformance.elite.entities.CabinetDr;
import pi.pperformance.elite.entities.UserCabinetRegistration; // Import the new entity
import org.springframework.security.crypto.password.PasswordEncoder; // Added for password change
import java.util.Map; // Added for response map
import java.util.Optional; // Added for Optional
import java.util.Optional; // Added for Optional

@RestController
@RequestMapping("/Users")
public class UserController {
    private static final Logger log = LoggerFactory.getLogger(UserController.class); // Add logger instance

    @Autowired
    private UserRepository UsrRepo;
    @Autowired
    private PatientRepository PatientRepo;
    @Autowired
    private CabinetDrRepository cabinetDrRepository;
    @Autowired
    private JwtUtils jwtUtils;
    @Autowired
    private UserServiceInterface usrService;
    @Autowired
    private EmailService emailService;
    @Autowired
    private VerificationService verificationService;
    @Autowired
    private RecaptchaService RecaptchaService;

    // Inject PasswordEncoder (assuming it's configured as a bean in SecurityConfig)
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UserCabinetRegistrationRepository registrationRepository; // Inject Registration Repo


    // DTO for the change password request body (defined inline for simplicity)
    public static class ChangePasswordRequest {
        private String oldPassword;
        private String newPassword;
        private String confirmPassword;

        // Getters
        public String getOldPassword() { return oldPassword; }
        public String getNewPassword() { return newPassword; }
        public String getConfirmPassword() { return confirmPassword; }

        // Setters (optional, but good practice)
        public void setOldPassword(String oldPassword) { this.oldPassword = oldPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
        public void setConfirmPassword(String confirmPassword) { this.confirmPassword = confirmPassword; }
    }


    @GetMapping("/checkUserExists")
    public ResponseEntity<Boolean> checkUserExists(
            @RequestParam String email,
            @RequestParam("first_name") String firstName,
            @RequestParam("last_name") String lastName,
            @RequestParam Long cabinetId) {

        // Optional: Validate cabinetId exists, though the service method might handle it.
        // CabinetDr cabinet = cabinetDrRepository.findById(cabinetId).orElse(null);
        // if (cabinet == null) {
        //     log.warn("Existence check requested for non-existent cabinet ID: {}", cabinetId);
        //     return ResponseEntity.ok(false); // Or return bad request? Returning false seems safer for frontend logic.
        // }

        boolean exists = usrService.existsByEmailAndFirstNameAndLastNameInCabinet(email, firstName, lastName, cabinetId);
        log.info("Existence check for Email: {}, Name: {} {}, Cabinet ID: {} -> Exists: {}", email, firstName, lastName, cabinetId, exists);
        return ResponseEntity.ok(exists);
    }


    
    
    @PostMapping("/addadmin")
    public ResponseEntity<String> addUser(
            @RequestParam("first_name") String first_name,
            @RequestParam("lastName") String lastName,
            @RequestParam("email") String email,
            @RequestParam("birthDate") String birthDate,
            @RequestParam(value = "role", required = false) String role,
            @RequestParam("password") String password,
            @RequestParam("tel") String tel,
            @RequestParam("address") String address,
            @RequestParam("gendre") String gendre,
            @RequestParam(value = "photoProfil", required = false) MultipartFile photoProfil) {

        // Stricter email format validation (gmail or yahoo)
        if (email == null || !email.matches("^[\\w-\\.]+@(gmail\\.com|yahoo\\.com)$")) {
            return ResponseEntity.badRequest().body("Invalid email format. Only @gmail.com and @yahoo.com are allowed.");
        }

        if (usrService.findByEmail(email) != null) {
            return ResponseEntity.badRequest().body("Email already exists.");
        }

        if (photoProfil != null && !photoProfil.isEmpty()) {
            if (!photoProfil.getContentType().startsWith("image/")) {
                return ResponseEntity.badRequest().body("Invalid file type. Only images are allowed.");
            }
            if (photoProfil.getSize() > 5 * 1024 * 1024) {
                return ResponseEntity.badRequest().body("File size exceeds the limit of 5 MB.");
            }
        }

        Admin admin = new Admin();
        User user = admin; // Assign to User variable for common properties

        user.setFirstName(first_name);
        user.setLastName(lastName);
        user.setEmail(email);
        user.setBirthDate(LocalDate.parse(birthDate));
        user.setPassword(password);
        user.setTel(tel);
        user.setAddress(address);
        user.setGender(gendre);
        user.setRole(Role.ADMIN); // Forcer le rôle ADMIN
        // user.setIsActive(true); // Removed: Admins are implicitly active, no cabinet registration needed

        if (photoProfil != null && !photoProfil.isEmpty()) {
            try {
                user.setPhotoProfil(photoProfil.getBytes());
            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to process profile image.");
            }
        }

        // Admins don't have a specific cabinet, pass null for cabinetId. initialRegistrationActive is irrelevant here.
        User savedUser = usrService.addUser(user, null, true, false); // Pass default false for initialActive
        return ResponseEntity.ok("Registration successful! added  an admin.");
    }    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    @PostMapping("/add")
    public ResponseEntity<?> addUser( // Changed return type to handle potential errors better
            @RequestParam("first_name") String first_name,
            @RequestParam("lastName") String lastName,
            @RequestParam("email") String email,
            @RequestParam("birthDate") String birthDate,
            // Role is implicitly PATIENT when added by Doctor/Assistant via this endpoint
            // @RequestParam(value = "role", required = false) String role,
            @RequestParam("password") String password,
            @RequestParam("tel") String tel,
            @RequestParam("address") String address,
            @RequestParam("gendre") String gendre,
            @RequestParam(value = "photoProfil", required = false) MultipartFile photoProfil) {

        // Email validation (optional, but validate format if provided)
        if (email != null && !email.isEmpty() && !email.matches("^[\\w-\\.]+@(gmail\\.com|yahoo\\.com)$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid email format. Only @gmail.com and @yahoo.com are allowed."));
        }

        // Telephone validation (optional, but validate format if provided)
        if (tel != null && !tel.isEmpty() && !tel.matches("^\\d+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Phone number must contain only digits."));
        }

        // Password validation: No explicit backend validation needed here if optional.
        // Frontend handles strength/confirmation if password is provided.
        // If password is provided but empty string, it might still be saved depending on DB constraints.
        // Consider adding a check if an empty string password should be treated as null or rejected if provided but empty.
        // For now, aligning with "no control if empty", we allow empty strings if sent.

        // Get the authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
             return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User not authenticated"));
        }
        String userEmail = authentication.getName();
        User currentUser = usrService.findByEmail(userEmail); // findByEmail now fetches cabinet eagerly

        if (currentUser == null) {
             return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Authenticated user not found in database"));
        }

        CabinetDr associatedCabinet = null;
        // Determine the cabinet based on the logged-in user's role
        if (currentUser.getRole() == Role.DOCTOR) {
            associatedCabinet = ((Doctor) currentUser).getCabinet();
             log.info("Adding patient under Doctor {}'s cabinet (ID: {})", currentUser.getEmail(), associatedCabinet != null ? associatedCabinet.getIdSite() : "None");
        } else if (currentUser.getRole() == Role.ASSISTANT) {
            associatedCabinet = ((Assistant) currentUser).getCabinet();
             log.info("Adding patient under Assistant {}'s cabinet (ID: {})", currentUser.getEmail(), associatedCabinet != null ? associatedCabinet.getIdSite() : "None");
        } else {
             log.warn("User {} with role {} is attempting to add a patient via /add endpoint. Patient will not be associated with a specific cabinet.", currentUser.getEmail(), currentUser.getRole());
        }

        if ((currentUser.getRole() == Role.DOCTOR || currentUser.getRole() == Role.ASSISTANT) && associatedCabinet == null) {
            log.error("User {} (Role: {}) tried to add a patient but has no associated cabinet.", currentUser.getEmail(), currentUser.getRole());
             return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Cannot add patient: Logged-in user has no associated cabinet."));
        }

        // Check if user already exists in this specific cabinet
        if (associatedCabinet != null && usrService.existsByEmailAndFirstNameAndLastNameInCabinet(email, first_name, lastName, associatedCabinet.getIdSite())) {
            log.warn("Attempt to add duplicate user (Email: {}, Name: {} {}) to cabinet ID: {}", email, first_name, lastName, associatedCabinet.getIdSite());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "A user with this email and name already exists in this cabinet."));
        }


        if (photoProfil != null && !photoProfil.isEmpty()) {
            if (!photoProfil.getContentType().startsWith("image/")) {
                return ResponseEntity.badRequest().body("Invalid file type. Only images are allowed.");
            }
            if (photoProfil.getSize() > 5 * 1024 * 1024) {
                return ResponseEntity.badRequest().body("File size exceeds the limit of 5 MB.");
            }
        }

        Patient patient = new Patient(); // Create a Patient specifically
        User user = patient; // Assign to User variable for common properties
        user.setFirstName(first_name);
        user.setLastName(lastName);
        user.setEmail(email);
        user.setBirthDate(LocalDate.parse(birthDate));
        user.setPassword(password);
        user.setTel(tel);
        user.setAddress(address);
        user.setGender(gendre);
        user.setRole(Role.PATIENT);
        // user.setIsActive(true); // Removed: Activation handled by registration status

        if (photoProfil != null && !photoProfil.isEmpty()) {
            try {
                user.setPhotoProfil(photoProfil.getBytes());
            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to process profile image.");
            }
        }

        // The service layer (addPatient helper) now handles creating the UserCabinetRegistration
        // We just need to ensure the Patient object *could* hold the cabinet info if needed,
        // but the service extracts it differently now. No need to set cabinets here.
        // if (associatedCabinet != null) {
        //     // This part is removed as the service handles registration creation
        // }

        // Pass the patient object; the service will handle creating the registration
        // Ensure the Patient object itself has the necessary info if the service expects it,
        // but the current service logic seems to handle it based on the logged-in user's cabinet.
        // Pass the cabinetId from the logged-in user's context
        Long cabinetIdToAdd = (associatedCabinet != null) ? associatedCabinet.getIdSite() : null;
        // Note: The service layer addUser->addPatient should ideally re-verify cabinetId existence
        // Pass initialRegistrationActive = true because this endpoint adds active patients/registrations
        User savedUser = usrService.addUser(patient, cabinetIdToAdd, true, true);
        return ResponseEntity.ok(Map.of(
            "message", "Patient added successfully!",
            "patientId", savedUser.getId(),
            "associatedCabinetId", associatedCabinet != null ? associatedCabinet.getIdSite() : null
        ));
    }

    
    @PostMapping("/addInactive")
    public ResponseEntity<String> addInactiveUser(
            @RequestParam("first_name") String first_name,
            @RequestParam("last_name") String lastName,
            @RequestParam("email") String email,
            @RequestParam("birthDate") String birthDate,
            @RequestParam(value = "role", required = false) String role,
            @RequestParam("password") String password,
            @RequestParam("tel") String tel,
            @RequestParam("address") String address,
            @RequestParam("gendre") String gendre,
            @RequestParam(value = "photoProfil", required = false) MultipartFile photoProfil,
            @RequestParam("g-recaptcha-response") String captchaResponse,
            @RequestParam(value = "cabinetId", required = true) Long cabinetId) {

        // General email format validation
        if (email == null || !email.matches("^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$")) { // General email pattern
            return ResponseEntity.badRequest().body("Invalid email format.");
        }

        // Telephone validation: only if provided, must be digits
        if (tel != null && !tel.isEmpty() && !tel.matches("^\\d+$")) {
            return ResponseEntity.badRequest().body("Phone number must contain only digits.");
        }
        // Address is optional, no validation needed if empty.

        // --- Add Existence Check Here ---
        CabinetDr cabinet = cabinetDrRepository.findById(cabinetId).orElse(null);
        if (cabinet == null) {
             log.warn("Attempt to register inactive user for non-existent cabinet ID: {}", cabinetId);
             return ResponseEntity.badRequest().body("Invalid registration link: Cabinet not found.");
        }
        if (usrService.existsByEmailAndFirstNameAndLastNameInCabinet(email, first_name, lastName, cabinetId)) {
            log.warn("Attempt to register inactive user - duplicate found (Email: {}, Name: {} {}) in cabinet ID: {}", email, first_name, lastName, cabinetId);
            // Return CONFLICT (409) to indicate the specific reason
            return ResponseEntity.status(HttpStatus.CONFLICT).body("A user with this email, first name, and last name already exists in this cabinet.");
        }
        // --- End Existence Check ---


        if (!RecaptchaService.verifyCaptcha(captchaResponse)) {
            return ResponseEntity.badRequest().body("reCAPTCHA verification failed.");
        }

        if (photoProfil != null && !photoProfil.isEmpty()) {
            if (!photoProfil.getContentType().startsWith("image/")) {
                return ResponseEntity.badRequest().body("Invalid file type. Only images are allowed.");
            }
            if (photoProfil.getSize() > 5 * 1024 * 1024) {
                return ResponseEntity.badRequest().body("File size exceeds the limit of 5 MB.");
            }
        }

        byte[] photoProfilBytes = null;
        if (photoProfil != null && !photoProfil.isEmpty()) {
            try {
                photoProfilBytes = photoProfil.getBytes();
            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to process profile image.");
            }
        }

        String verificationCode = String.format("%06d", new Random().nextInt(999999));

        VerificationRequest verificationRequest = new VerificationRequest(
                first_name, lastName, email, birthDate, password, tel, address, gendre, role, photoProfilBytes, verificationCode, cabinetId
        );
        verificationService.storeVerificationRequest(email, verificationRequest);

        emailService.sendVerificationEmail(email, verificationCode);

        return ResponseEntity.ok("Verification code sent to email.");
    }
    
    
    
    

    @PostMapping("/verifyEmail")
    public ResponseEntity<String> verifyEmail(@RequestParam String email, @RequestParam String code) {
        // Stricter email format validation (gmail or yahoo)
        if (email == null || !email.matches("^[\\w-\\.]+@(gmail\\.com|yahoo\\.com)$")) {
             return ResponseEntity.badRequest().body("Invalid email format provided for verification. Only @gmail.com and @yahoo.com are allowed.");
        }

        VerificationRequest verificationRequest = verificationService.getVerificationRequest(email);

        if (verificationRequest == null || !verificationRequest.getVerificationCode().equals(code)) {
            return ResponseEntity.badRequest().body("Invalid or expired verification code.");
        }

        Long cabinetId = verificationRequest.getCabinetId();
        CabinetDr cabinet = cabinetDrRepository.findById(cabinetId).orElse(null);

        if (cabinet == null) {
            verificationService.removeVerificationRequest(email);
            return ResponseEntity.badRequest().body("Invalid Cabinet ID provided during registration.");
        }

        // Check if user already exists in this specific cabinet before creating
        if (usrService.existsByEmailAndFirstNameAndLastNameInCabinet(
                verificationRequest.getEmail(),
                verificationRequest.getFirstName(),
                verificationRequest.getLastName(),
                cabinetId)) {
            log.warn("Attempt to verify email for duplicate user (Email: {}, Name: {} {}) in cabinet ID: {}",
                    verificationRequest.getEmail(), verificationRequest.getFirstName(), verificationRequest.getLastName(), cabinetId);
            verificationService.removeVerificationRequest(email); // Clean up verification request
            return ResponseEntity.status(HttpStatus.CONFLICT).body("A user with this email and name already exists in this cabinet.");
        }


        Role requestedRole = verificationRequest.getRole() != null ? Role.valueOf(verificationRequest.getRole().toUpperCase()) : Role.PATIENT;
        User user;

        // Instantiate the correct User subclass based on the role
        switch (requestedRole) {
            case ADMIN:
                user = new Admin();
                break;
            case DOCTOR:
                // Doctor needs cabinet association - how is this provided during verification? Assuming not supported here yet.
                // For now, let's prevent Doctor/Assistant creation via this endpoint if it requires cabinet setup.
                // Or, if verificationRequest contains cabinetId, create Doctor/Assistant and set cabinet.
                 log.error("Doctor creation via email verification not fully supported without cabinet assignment logic.");
                 return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Doctor role assignment requires additional setup.");
                // user = new Doctor();
                // break; // Uncomment and add cabinet logic if needed
            case ASSISTANT:
                 log.error("Assistant creation via email verification not fully supported without cabinet assignment logic.");
                 return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Assistant role assignment requires additional setup.");
                // user = new Assistant();
                // break; // Uncomment and add cabinet logic if needed
            case PATIENT:
            default: // Default to Patient
                user = new Patient();
                // For patients, associate the cabinet specified in the request
                // Use the cabinetId already retrieved from verificationRequest (line 383)
                if (cabinetId == null) { // cabinetId from line 383
                     log.error("Patient verification request for {} missing cabinetId.", verificationRequest.getEmail());
                     return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Cabinet ID is required for patient registration.");
                }
                 // The cabinet association is handled by the service layer via UserCabinetRegistration
                 // using the cabinetId passed to addUser. No need to set it directly here.
                break;
        }

        // Set common properties
        user.setFirstName(verificationRequest.getFirstName());
        user.setLastName(verificationRequest.getLastName());
        user.setEmail(verificationRequest.getEmail());
        if (verificationRequest.getBirthDate() != null) { // Check for null birthDate
             user.setBirthDate(LocalDate.parse(verificationRequest.getBirthDate()));
        }
        user.setPassword(verificationRequest.getPassword()); // Password will be hashed by addUser
        user.setTel(verificationRequest.getTel());
        user.setAddress(verificationRequest.getAddress());
        user.setGender(verificationRequest.getGendre());
        user.setRole(requestedRole); // Set the determined role
        // user.setIsActive(false); // Removed: Activation handled by registration status

        if (verificationRequest.getPhotoProfil() != null) {
            user.setPhotoProfil(verificationRequest.getPhotoProfil());
        }

        // The service layer (addPatient helper) now handles creating the UserCabinetRegistration.
        // We need to ensure the Patient object passed to addUser contains enough info
        // for the service to identify the target cabinet (which it gets from verificationRequest.getCabinetId()).
        // The check below might need adjustment depending on how Doctor/Assistant creation is handled
        // if (!(user instanceof Patient) && !(user instanceof Admin) /* && !(user instanceof Doctor) etc. */ ) {
        //     verificationService.removeVerificationRequest(email);
        //     return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error during user creation: incorrect user type.");
        // }
        // Simpler: Let addUser handle type-specific logic. If it fails, it will throw an exception.

        // Pass the user object AND the target cabinetId to the service
        // Pass initialRegistrationActive = false because this endpoint completes the inactive registration flow
        User savedUser = usrService.addUser(user, cabinetId, true, false);
        log.info("User {} processed by addUser via verifyEmail.", email);

        // --- Explicitly ensure registration is inactive ---
        try {
            // Fetch the user again to ensure we have the correct ID after potential creation/update
            User persistedUser = usrService.findByEmail(verificationRequest.getEmail());
            if (persistedUser == null) {
                log.error("User {} not found after supposedly successful addUser call in verifyEmail.", verificationRequest.getEmail());
                verificationService.removeVerificationRequest(email); // Clean up verification request
                 return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error finalizing registration status (user not found post-add).");
            }

            // Use the correct method name from the repository
            Optional<UserCabinetRegistration> registrationOpt = registrationRepository.findByUserIdAndCabinetIdSite(persistedUser.getId(), cabinetId);

            if (registrationOpt.isPresent()) {
                UserCabinetRegistration registration = registrationOpt.get();
                if (registration.isActive()) { // Only update if it's currently active
                    registration.setActive(false); // Ensure it's inactive
                    registrationRepository.save(registration); // Save the change
                    log.info("Explicitly set registration status to INACTIVE for user {} in cabinet {}.", persistedUser.getId(), cabinetId);
                } else {
                     log.info("Registration for user {} in cabinet {} was already inactive.", persistedUser.getId(), cabinetId);
                }
            } else {
                // This case is unexpected if addUser succeeded in creating/linking the registration
                log.error("Could not find UserCabinetRegistration for user {} and cabinet {} after addUser call in verifyEmail.", persistedUser.getId(), cabinetId);
                verificationService.removeVerificationRequest(email); // Clean up verification request
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to retrieve registration record after creation.");
            }
        } catch (Exception e) {
            log.error("Error explicitly setting registration inactive for user {} in cabinet {}: {}",
                      verificationRequest.getEmail(), cabinetId, e.getMessage(), e);
            verificationService.removeVerificationRequest(email); // Clean up verification request
            // Return an error, as the final state might be incorrect
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error finalizing registration status.");
        }
        // --- End explicit inactive check ---


        verificationService.removeVerificationRequest(email);
        log.info("Verification request removed for {}.", email); // Log after removing request
        // The account is verified, and the registration is now guaranteed to be inactive.
        log.info("Returning OK response for verifyEmail for {}.", email); // Log before returning
        return ResponseEntity.ok("Account successfully verified! Please wait for activation.");
    }
    
    
    
    

    @PostMapping("/transferUser")
    public ResponseEntity<String> transferUser(
            @RequestParam Long userId,
            @RequestParam String targetRole,
            @RequestParam(required = false) boolean passwordToBeEncrypted) {

        User user = usrService.findById(userId);
        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }

        Role newRole;
        try {
            newRole = Role.valueOf(targetRole.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid target role.");
        }

        if (!(user instanceof Patient)) {
            return ResponseEntity.badRequest().body("User is not a Patient.");
        }

        Patient patient = (Patient) user;
        User newUser;
        // CabinetDr targetCabinet = getFirstCabinet(patient); // Get cabinet from patient's registrations

        if (newRole == Role.DOCTOR) {
            newUser = new Doctor();
            // ((Doctor) newUser).setCabinet(targetCabinet); // Removed: Service layer handles this logic (with TODOs)
        } else if (newRole == Role.ASSISTANT) {
            newUser = new Assistant();
            // ((Assistant) newUser).setCabinet(targetCabinet); // Removed: Service layer handles this logic
        } else if (newRole == Role.ADMIN) {
            newUser = new Admin();
        } else {
            return ResponseEntity.badRequest().body("Unsupported target role.");
        }

        copyUserDetails(user, newUser, newRole);

        try {
            // Call the service method responsible for handling the role change logic
            log.info("Attempting role change for user ID {} to role {}", userId, newRole);
            User updatedUser = usrService.changeUserRole(userId, newRole);
            log.info("Successfully changed role for user ID {} to {}", userId, newRole);
            return ResponseEntity.ok("User role successfully changed to " + newRole.name() + ". User ID: " + updatedUser.getId());
        } catch (DataIntegrityViolationException e) {
            log.error("Data integrity violation during transfer for user ID {}: {}. Likely due to unique constraint (e.g., cabinet already has a doctor).", userId, e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Could not transfer user. The target cabinet might already have a doctor assigned.");
        } catch (Exception e) {
            log.error("Error during user transfer save/delete for user ID {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An error occurred during the final steps of user transfer.");
        }
    }

    // This helper might still be needed if the service layer doesn't fully handle cabinet transfer logic yet
    private CabinetDr getFirstCabinet(Patient patient) {
        // Get cabinet from the first registration, if available
        return patient.getRegistrations().stream()
                      .findFirst()
                      .map(UserCabinetRegistration::getCabinet)
                      .orElse(null);
    }

    private void copyUserDetails(User from, User to, Role targetRole) {
        to.setFirstName(from.getFirstName());
        to.setLastName(from.getLastName());
        to.setEmail(from.getEmail());
        if (from.getPhotoProfil() != null) {
             to.setPhotoProfil(from.getPhotoProfil().clone());
        }
        to.setBirthDate(from.getBirthDate());
        to.setPassword(from.getPassword());
        to.setTel(from.getTel());
        to.setAddress(from.getAddress());
        to.setGender(from.getGender());
        to.setRole(targetRole);
        // to.setIsActive(true); // Removed: Activation handled by registration status
        to.setCreatedAt(from.getCreatedAt());
        to.setUpdatedAt(LocalDate.now());
    }

    @GetMapping("/alluser")
     public List<User> getAllUsers() {
        log.info("Admin request: Fetching all users.");
        return usrService.getAllUsers();
    }

    @GetMapping("/useremail/{email}")
    public ResponseEntity<?> getUserByEmail(@PathVariable String email) {
        try {
            User user = usrService.getUserByEmail(email);
            return ResponseEntity.ok(user);
        } catch (AccountNotFoundException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
        }
    }
    
    
    

    @GetMapping("/allid/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        User user = usrService.getUserById(id);
        if (user != null) {
            return ResponseEntity.ok(user);
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User with ID " + id + " not found");
        }
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody UserUpdateDTO userDetailsDTO) {
        try {
            User updatedUser = usrService.updateUser(id, userDetailsDTO);
            return ResponseEntity.ok(updatedUser);
        } catch (AccountNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        } catch (Exception e) {
            log.error("Error updating user with ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @PreAuthorize("hasRole('ADMIN')") // Restrict global delete to Admins
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> deleteUser(@PathVariable Long id) {
        try {
            usrService.deleteUser(id);
            return ResponseEntity.ok("User with ID " + id + " has been deleted successfully.");
        } catch (AccountNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User with ID " + id + " not found.");
        }
    }

    @GetMapping("/findByEmail/{email}")
    public ResponseEntity<User> findByEmail(@PathVariable String email) {
        User user = usrService.findByEmail(email);
        if (user != null) {
            return ResponseEntity.ok(user);
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        }
    }

    // Removed obsolete endpoint /inactiveusers
    // Removed obsolete endpoint /activeusers
    
    
//changer de role autant admin 
    @GetMapping("/patients")
    public ResponseEntity<List<User>> getPatients() {
        // This likely needs refinement - should it get ALL patients ever, or patients with active registrations?
        // For now, keep existing behavior which gets all users with PATIENT role.
        List<User> patients = usrService.getPatients();
        return ResponseEntity.ok(patients);
    }

    //affichage pour admin 
    @GetMapping("/doctors")
    public ResponseEntity<List<User>> getdoctors() {
        // This likely needs refinement - should it get ALL patients ever, or patients with active registrations?
        // For now, keep existing behavior which gets all users with PATIENT role.
        List<User> doctors = usrService.getdoctors();
        return ResponseEntity.ok(doctors);
    }

    
    
    

    @PutMapping("/activateRegistration/{userId}")
    public ResponseEntity<?> activateUserRegistration(
            @PathVariable Long userId,
            @RequestParam Long cabinetId,
            Authentication authentication) { // Add Authentication
        try {
            // --- Permission Check ---
            User currentUser = checkPermissions(authentication, cabinetId, "activate registration for user " + userId);
            // --- End Permission Check ---

            // Pass acting user ID for potential service-layer checks if needed, though controller check is primary here
            UserCabinetRegistration updatedRegistration = usrService.activateUserRegistration(currentUser.getId(), userId, cabinetId);
            // TODO: Add permission checks here based on logged-in user and target cabinet/user
            // UserCabinetRegistration updatedRegistration = usrService.activateUserRegistration(userId, cabinetId); // Original call
            // Return relevant info, maybe just a success message or the updated registration details
            return ResponseEntity.ok(Map.of(
                "message", "Registration activated successfully.",
                "registrationId", updatedRegistration.getId(),
                "userId", updatedRegistration.getUser().getId(),
                "cabinetId", updatedRegistration.getCabinet().getIdSite(),
                "isActive", updatedRegistration.isActive()
            ));
        } catch (AccountNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (AccessDeniedException e) {
             return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error activating registration for user {} in cabinet {}: {}", userId, cabinetId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "An unexpected error occurred."));
        }
    }

    @PutMapping("/deactivateRegistration/{userId}")
    public ResponseEntity<?> deactivateUserRegistration(
            @PathVariable Long userId,
            @RequestParam Long cabinetId,
            Authentication authentication) { // Add Authentication
        try {
            // --- Permission Check ---
            User currentUser = checkPermissions(authentication, cabinetId, "deactivate registration for user " + userId);
            // --- End Permission Check ---

             // Pass acting user ID for potential service-layer checks if needed
            UserCabinetRegistration updatedRegistration = usrService.deactivateUserRegistration(currentUser.getId(), userId, cabinetId);
             // TODO: Add permission checks here based on logged-in user and target cabinet/user
            // UserCabinetRegistration updatedRegistration = usrService.deactivateUserRegistration(userId, cabinetId); // Original call
             // Return relevant info
            return ResponseEntity.ok(Map.of(
                "message", "Registration deactivated successfully.",
                "registrationId", updatedRegistration.getId(),
                "userId", updatedRegistration.getUser().getId(),
                "cabinetId", updatedRegistration.getCabinet().getIdSite(),
                "isActive", updatedRegistration.isActive()
            ));
        } catch (AccountNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (AccessDeniedException e) {
             return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error deactivating registration for user {} in cabinet {}: {}", userId, cabinetId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "An unexpected error occurred."));
        }
    }


    // --- New Endpoint for Cabinet-Specific Deletion ---
    @DeleteMapping("/cabinet/{cabinetId}/user/{userId}")
    public ResponseEntity<?> deleteUserRegistration(
            @PathVariable Long cabinetId,
            @PathVariable Long userId,
            Authentication authentication) {
        try {
            // --- Permission Check ---
            User currentUser = checkPermissions(authentication, cabinetId, "delete registration for user " + userId);
            // --- End Permission Check ---

            usrService.deleteUserRegistration(currentUser.getId(), userId, cabinetId);
            return ResponseEntity.ok(Map.of("message", "User registration in cabinet " + cabinetId + " deleted successfully."));

        } catch (AccountNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (AccessDeniedException e) {
             return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error deleting registration for user {} in cabinet {}: {}", userId, cabinetId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "An unexpected error occurred during registration deletion."));
        }
    }
    // --- End New Endpoint ---


    // --- Helper method for Permission Checks ---
    private User checkPermissions(Authentication authentication, Long targetCabinetId, String actionDescription) {
        if (authentication == null || !authentication.isAuthenticated()) {
            log.warn("Unauthorized attempt to {}: No authentication found.", actionDescription);
            throw new AccessDeniedException("User not authenticated.");
        }
        String userEmail = authentication.getName();
        User currentUser = usrService.findByEmail(userEmail); // Assuming findByEmail fetches necessary details including role and cabinet

        if (currentUser == null) {
            log.error("Authenticated user {} not found in database during attempt to {}.", userEmail, actionDescription);
            // Throw AccessDenied or specific exception? AccessDenied seems appropriate as they are authenticated but lack DB record.
            throw new AccessDeniedException("Authenticated user record not found.");
        }

        // Admins have universal permission
        if (currentUser.getRole() == Role.ADMIN) {
            log.info("Admin {} granted permission to {}.", userEmail, actionDescription);
            return currentUser;
        }

        // Doctors and Assistants need matching cabinet ID
        if (currentUser.getRole() == Role.DOCTOR || currentUser.getRole() == Role.ASSISTANT) {
            CabinetDr userCabinet = null;
            if (currentUser instanceof Doctor) {
                userCabinet = ((Doctor) currentUser).getCabinet();
            } else if (currentUser instanceof Assistant) {
                userCabinet = ((Assistant) currentUser).getCabinet();
            }

            if (userCabinet != null && userCabinet.getIdSite().equals(targetCabinetId)) {
                log.info("User {} (Role: {}) granted permission for cabinet {} to {}.",
                         userEmail, currentUser.getRole(), targetCabinetId, actionDescription);
                return currentUser;
            } else {
                Long currentCabinetId = (userCabinet != null) ? userCabinet.getIdSite() : null;
                log.warn("Permission denied for user {} (Role: {}, Cabinet: {}) to {} in target cabinet {}.",
                         userEmail, currentUser.getRole(), currentCabinetId, actionDescription, targetCabinetId);
                throw new AccessDeniedException("User does not have permission for the specified cabinet.");
            }
        }

        // Other roles (e.g., Patient) are denied
        log.warn("Permission denied for user {} (Role: {}) to {}. Insufficient role.",
                 userEmail, currentUser.getRole(), actionDescription);
        throw new AccessDeniedException("User role does not grant permission for this action.");
    }
    // --- End Helper Method ---


   // pour  changer de role selon le cabinet ASSISTANT DOCTOR
    @PreAuthorize("hasAnyRole('DOCTOR', 'ASSISTANT')") // Keep this for fetching list, specific actions checked above
    @GetMapping("/cabinet/patients")
    public ResponseEntity<List<User>> getPatientsForCabinet(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String userEmail = authentication.getName();
        User currentUser = usrService.findByEmail(userEmail);
        if (currentUser == null) {
            log.error("Authenticated user {} not found in database.", userEmail);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        }
        CabinetDr userCabinet = null;
        if (currentUser instanceof Doctor) {
            userCabinet = ((Doctor) currentUser).getCabinet();
        } else if (currentUser instanceof Assistant) {
            userCabinet = ((Assistant) currentUser).getCabinet();
        }
        if (userCabinet == null) {
            log.warn("User {} (Role: {}) has no associated cabinet. Cannot fetch cabinet patients.", currentUser.getEmail(), currentUser.getRole());
            return ResponseEntity.ok(new ArrayList<>());
        }
        final Long cabinetId = userCabinet.getIdSite();
        log.info("User {} (Role: {}) requesting patients for cabinet ID: {}", currentUser.getEmail(), currentUser.getRole(), cabinetId);
        // Assuming getAllPatientsByCabinetId fetches users with a registration in that cabinet
        List<User> cabinetPatients = usrService.getAllPatientsByCabinetId(cabinetId);
        log.info("Found {} patients for cabinet ID {}", cabinetPatients.size(), cabinetId);
        return ResponseEntity.ok(cabinetPatients);
    }


    //pour supprimer editer, desactiver selon le cabinet
    @GetMapping("/cabinet/active-users") // Fetching lists might not need cabinet check if service filters correctly
    public ResponseEntity<List<User>> getActiveUsersForCabinet(Authentication authentication) {
         if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String userEmail = authentication.getName();
        User currentUser = usrService.findByEmail(userEmail);
        if (currentUser == null) {
            log.error("Authenticated user {} not found in database.", userEmail);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        }
        log.info("User {} (Role: {}) requesting filtered active users.", currentUser.getEmail(), currentUser.getRole());
        // Assuming getFilteredActiveUsers filters based on currentUser's context (role/cabinet)
        List<User> activeUsers = usrService.getFilteredActiveUsers(currentUser);
        log.info("Found {} filtered active users for user {}", activeUsers.size(), currentUser.getEmail());
        return ResponseEntity.ok(activeUsers);
    }




    //pour confirmer

    @GetMapping("/cabinet/inactive-users") // Fetching lists might not need cabinet check if service filters correctly
    public ResponseEntity<List<User>> getInactiveUsersForCabinet(Authentication authentication) {
         if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String userEmail = authentication.getName();
        User currentUser = usrService.findByEmail(userEmail);
        if (currentUser == null) {
            log.error("Authenticated user {} not found in database.", userEmail);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        }
        log.info("User {} (Role: {}) requesting filtered inactive users.", currentUser.getEmail(), currentUser.getRole());
         // Assuming getFilteredInactiveUsers filters based on currentUser's context (role/cabinet)
        List<User> inactiveUsers = usrService.getFilteredInactiveUsers(currentUser);
        log.info("Found {} filtered inactive users for user {}", inactiveUsers.size(), currentUser.getEmail());
        return ResponseEntity.ok(inactiveUsers);
    }
    
    
    
    // Nouvel endpoint pour les Assistants (et Admins via contexte ?)
    @GetMapping("/cabinet/active-patients")
    public ResponseEntity<List<User>> getActivePatientsForCabinet(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String userEmail = authentication.getName();
        User currentUser = usrService.findByEmail(userEmail); // Assure que les détails sont chargés

        if (currentUser == null) {
            log.error("Authenticated user {} not found in database.", userEmail);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        }

        CabinetDr userCabinet = null;
        // Seuls les Assistants et Docteurs (et Admins implicitement via checkPermissions dans le service) peuvent voir les patients d'un cabinet
        if (currentUser instanceof Assistant) {
            userCabinet = ((Assistant) currentUser).getCabinet();
        } else if (currentUser instanceof Doctor) { // Un docteur peut aussi voir les patients actifs de son cabinet
             userCabinet = ((Doctor) currentUser).getCabinet();
        } else if (currentUser.getRole() == Role.ADMIN) {
             // Pour l'Admin, comment déterminer le cabinet cible ?
             // L'approche actuelle basée sur le cabinet de l'utilisateur connecté ne fonctionne pas bien pour l'Admin.
             // Il faudrait idéalement un endpoint comme /admin/cabinet/{id}/active-patients
             // Pour l'instant, on retourne une liste vide ou une erreur pour l'Admin sur cet endpoint spécifique.
             log.warn("Admin user {} attempted to access /cabinet/active-patients without specifying a cabinet.", userEmail);
             // Retourner une erreur ou une liste vide ? Retournons une liste vide pour éviter une erreur 4xx.
             return ResponseEntity.ok(new ArrayList<>());
             // Ou : return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Admin must use a cabinet-specific endpoint or provide a cabinet ID."));
        } else {
             log.warn("User {} with role {} attempted to access cabinet patients.", userEmail, currentUser.getRole());
             return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }


        if (userCabinet == null && !(currentUser.getRole() == Role.ADMIN)) { // Vérifie si non-Admin n'a pas de cabinet
            log.warn("User {} (Role: {}) has no associated cabinet. Cannot fetch cabinet active patients.", currentUser.getEmail(), currentUser.getRole());
            return ResponseEntity.ok(new ArrayList<>()); // Retourne liste vide si pas de cabinet
        }

        // Si c'est un Admin, userCabinet sera null ici, géré ci-dessus.
        // Si c'est un Docteur/Assistant, on a le cabinetId.
        if (userCabinet != null) {
            final Long cabinetId = userCabinet.getIdSite();
            log.info("User {} (Role: {}) requesting active patients for cabinet ID: {}", currentUser.getEmail(), currentUser.getRole(), cabinetId);
            // Appel de la nouvelle méthode de service
            List<User> activePatients = usrService.getActivePatientsByCabinetId(cabinetId);
            log.info("Found {} active patients for cabinet ID {}", activePatients.size(), cabinetId);
            return ResponseEntity.ok(activePatients);
        } else {
             // Ne devrait pas être atteint à cause des vérifications précédentes, mais sécurité.
             // Si c'est un Admin, on a déjà retourné une liste vide.
             // Donc, si on arrive ici, c'est une erreur interne inattendue.
             log.error("Unexpected state reached in getActivePatientsForCabinet for user {}", userEmail);
             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Renamed endpoint path from /patient/{patientId}/ to /user/{userId}/
    @PutMapping("/cabinet/{cabinetId}/user/{userId}/toggle-status")
    public ResponseEntity<?> toggleUserRegistrationStatus( // Renamed method
            @PathVariable Long cabinetId,
            @PathVariable Long userId, // Renamed path variable
            Authentication authentication) {
        // Updated action description
        String actionDescription = String.format("toggle registration status for user ID %d in cabinet ID %d", userId, cabinetId);
        try {
            // --- Permission Check ---
            User currentUser = checkPermissions(authentication, cabinetId, actionDescription);
            // --- End Permission Check ---

            // Call the renamed service method
            UserCabinetRegistration updatedRegistration = usrService.toggleUserRegistrationStatus(userId, cabinetId);

            // Return relevant info
            return ResponseEntity.ok(Map.of(
                "message", "User registration status toggled successfully.", // More generic message
                "registrationId", updatedRegistration.getId(),
                "userId", updatedRegistration.getUser().getId(),
                "cabinetId", updatedRegistration.getCabinet().getIdSite(),
                "isActiveNow", updatedRegistration.isActive() // Indicate the new status
            ));

        } catch (AccountNotFoundException e) {
            // Use userId instead of patientId in log message
            log.warn("Toggle status failed for user {} in cabinet {}: {}", userId, cabinetId, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (AccessDeniedException e) {
             // Permission check already logged the denial reason
             return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) { // Catch specific exceptions from service first
             log.error("Toggle status failed for user {} in cabinet {}: {}", userId, cabinetId, e.getMessage());
             return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            // Catch specific case where the user is not a patient/assistant (or other invalid state)
            // Use userId instead of patientId in log message
            log.error("Toggle status failed for user {} in cabinet {}: {}", userId, cabinetId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (Exception e) { // General exception catch last
             // Use userId instead of patientId in log message
            log.error("Error toggling status for user {} in cabinet {}: {}", userId, cabinetId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "An unexpected error occurred while toggling user registration status."));
        }
    }


    // --- New Endpoint for Toggling Doctor/Assistant Direct Status ---
    @PutMapping("/users/{userId}/toggle-direct-status")
    public ResponseEntity<?> toggleDoctorAssistantDirectStatus(
            @PathVariable Long userId,
            Authentication authentication) {

        String actionDescription = String.format("toggle direct status for user ID %d", userId);
        try {
            // --- Permission Check (using service layer's internal check) ---
            // We need the actor for the service call, but the primary check happens inside toggleDoctorAssistantStatus
             if (authentication == null || !authentication.isAuthenticated()) {
                log.warn("Unauthorized attempt to {}: No authentication found.", actionDescription);
                throw new AccessDeniedException("User not authenticated.");
            }
            // --- End Permission Check ---

            // Call the service method which includes permission checks
            User updatedUser = usrService.toggleDoctorAssistantStatus(userId);

            // Determine the new status for the response
            boolean newStatus = false;
            if (updatedUser instanceof Doctor) {
                newStatus = ((Doctor) updatedUser).isActive();
            } else if (updatedUser instanceof Assistant) {
                newStatus = ((Assistant) updatedUser).isActive();
            }

            // Return relevant info
            return ResponseEntity.ok(Map.of(
                "message", "User direct status toggled successfully.",
                "userId", updatedUser.getId(),
                "role", updatedUser.getRole().name(),
                "isActiveNow", newStatus // Indicate the new status
            ));

        } catch (AccountNotFoundException e) {
            log.warn("Toggle direct status failed for user {}: {}", userId, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (AccessDeniedException e) {
             // Permission check inside service logged the denial reason
             return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) { // Catch specific exceptions from service first
             log.error("Toggle direct status failed for user {}: {}", userId, e.getMessage());
             return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (Exception e) { // General exception catch last
            log.error("Error toggling direct status for user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "An unexpected error occurred while toggling user direct status."));
        }
    }
    // --- End New Endpoint ---


    // --- New Endpoint for Patient Transfer ---
    @PostMapping("/transferPatient")
    public ResponseEntity<?> transferPatient(
            @RequestParam Long patientUserId,
            @RequestParam Long targetCabinetId,
            @RequestParam String targetRoleString, // Receive role as String
            Authentication authentication) {

        String actionDescription = String.format("transfer patient ID %d to role %s in cabinet ID %d",
                                                 patientUserId, targetRoleString, targetCabinetId);
        try {
            // 1. Get Actor from Authentication context
            if (authentication == null || !authentication.isAuthenticated()) {
                log.warn("Unauthorized attempt to {}: No authentication found.", actionDescription);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User not authenticated."));
            }
            String actorEmail = authentication.getName();
            User actor = usrService.findByEmail(actorEmail); // Use service to find user by email
            if (actor == null) {
                log.error("Authenticated user {} not found in database during attempt to {}.", actorEmail, actionDescription);
                // Should not happen if authentication is valid, but good check
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Authenticated user record not found."));
            }
            log.debug("Action initiated by Actor: {} (ID: {}, Role: {})", actor.getEmail(), actor.getId(), actor.getRole());


            // 2. Validate Target Role String
            Role targetRole;
            try {
                targetRole = Role.valueOf(targetRoleString.toUpperCase());
                if (targetRole != Role.DOCTOR && targetRole != Role.ASSISTANT) {
                    throw new IllegalArgumentException("Invalid target role specified.");
                }
            } catch (IllegalArgumentException e) {
                log.warn("Invalid target role '{}' provided for transfer.", targetRoleString);
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid target role. Must be DOCTOR or ASSISTANT."));
            }

            // 3. Call Service Method
            log.info("Controller invoking transferPatientToRole for {}", actionDescription);
            User transferredUser = usrService.transferPatientToRole(actor.getId(), patientUserId, targetCabinetId, targetRole);

            // 4. Return Success Response
            return ResponseEntity.ok(Map.of(
                    "message", "Patient successfully transferred to " + targetRole.name(),
                    "newUser", Map.of( // Return some basic info about the new user
                            "id", transferredUser.getId(),
                            "email", transferredUser.getEmail(),
                            "role", transferredUser.getRole().name()
                    )
            ));

        } catch (AccountNotFoundException e) {
            log.warn("Transfer failed for {}: {}", actionDescription, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (AccessDeniedException e) {
            log.warn("Permission denied for actor during {}: {}", actionDescription, e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid argument during {}: {}", actionDescription, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (DataIntegrityViolationException e) {
            // Specific handling for the "doctor already exists" constraint
            log.warn("Data integrity violation during {}: {}", actionDescription, e.getMessage());
            // Check if the message indicates the specific constraint violation we expect
            if (e.getMessage() != null && e.getMessage().contains("cabinet already contains a doctor")) {
                 return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "This cabinet already contains a doctor. Cannot transfer patient to Doctor role."));
            } else {
                 // Generic conflict message for other potential integrity issues
                 return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Could not complete transfer due to a data conflict."));
            }
        } catch (Exception e) { // Catch-all for unexpected errors
            log.error("Unexpected error during {}: {}", actionDescription, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "An unexpected server error occurred during the transfer."));
        }
    }
    // --- End New Endpoint for Patient Transfer ---


    // --- New Endpoint for Admin: Get Patients with Registrations ---
    // Path relative to the class-level @RequestMapping("/Users")
    @GetMapping("/admin/patientsWithRegistrations")
    @PreAuthorize("hasRole('ADMIN')") // Restore method-level security check
    public ResponseEntity<?> getAllPatientsWithRegistrationsForAdmin() {
        // Removed manual role check - relying on @PreAuthorize

        try {
            log.info("Admin request: Fetching all patients with registration details.");
            List<dto.PatientWithRegistrationsDTO> patients = usrService.getAllPatientsWithRegistrations();
            return ResponseEntity.ok(patients);
        } catch (Exception e) {
            log.error("Error fetching patients with registrations for admin: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                 .body(Map.of("message", "An unexpected error occurred while fetching patient data."));
        }
    }
    // --- End New Endpoint for Admin ---


    // --- Endpoint for Changing User Password ---
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User not authenticated."));
        }
        String userEmail = authentication.getName();

        // Basic validation: check if new passwords match
        if (request.getNewPassword() == null || request.getNewPassword().isEmpty() || !request.getNewPassword().equals(request.getConfirmPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "New passwords do not match or are empty."));
        }
        // Basic validation: check if old password is provided
        if (request.getOldPassword() == null || request.getOldPassword().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Old password is required."));
        }

        // Optional: Add more complex password validation (length, characters) here or in service

        try {
            // Call the service layer to handle the password change logic
            // This method needs to be added to UserServiceInterface and UserServiceImplmnt
            boolean success = usrService.changeUserPassword(userEmail, request.getOldPassword(), request.getNewPassword());

            if (success) {
                log.info("Password changed successfully for user {}", userEmail);
                return ResponseEntity.ok(Map.of("message", "Password changed successfully."));
            } else {
                // If the service returns false, it likely means the old password was incorrect
                log.warn("Incorrect old password provided for user {}", userEmail);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Incorrect old password."));
            }
        } catch (AccountNotFoundException e) {
             log.warn("Attempt to change password for non-existent user {}", userEmail);
             return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found."));
        } catch (IllegalArgumentException e) { // Catch potential validation errors from service (e.g., weak password)
             log.warn("Password change validation failed for user {}: {}", userEmail, e.getMessage());
             return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error changing password for user {}: {}", userEmail, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "An unexpected error occurred while changing password."));
        }
    }
    // --- End Change Password Endpoint ---

}
