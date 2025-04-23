package pi.pperformance.elite.UserController;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import pi.pperformance.elite.UserRepository.CentreDexamenRepository;
import pi.pperformance.elite.UserRepository.DoctorCentreDexamenRepository;
import pi.pperformance.elite.UserServices.EmailService;
import pi.pperformance.elite.UserServices.RecaptchaService;
import pi.pperformance.elite.UserServices.VerificationService;
import pi.pperformance.elite.entities.CentreDexamen;
import pi.pperformance.elite.entities.DoctorCentreDexamen;
import pi.pperformance.elite.entities.DoctorCentreVerificationRequest; // Added import
import pi.pperformance.elite.entities.Role;
// import pi.pperformance.elite.entities.VerificationRequest; // Removed import
import pi.pperformance.elite.exceptions.ResourceNotFoundException;

import java.time.LocalDate;
import java.util.List; // Added import
import java.util.Map;
import java.util.Optional; // Added import for Optional
import java.util.Random;

@RestController
@RequestMapping("/api/doctor-centre-examen")
public class DoctorCentreDexamenController {

    private static final Logger log = LoggerFactory.getLogger(DoctorCentreDexamenController.class);

    @Autowired
    private VerificationService verificationService;
    @Autowired
    private EmailService emailService;
    @Autowired
    private CentreDexamenRepository centreDexamenRepository;
    @Autowired
    private DoctorCentreDexamenRepository doctorCentreDexamenRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private RecaptchaService recaptchaService; // Assuming reCAPTCHA is needed


    // Endpoint to check if a doctor exists in a specific centre
    @GetMapping("/checkExists")
    public ResponseEntity<Boolean> checkDoctorExists(
            @RequestParam String email,
            @RequestParam Long centreId) {
        boolean exists = doctorCentreDexamenRepository.existsByEmailAndCentreDexamen_IdCentre(email, centreId);
        log.info("Existence check for Doctor Email: {}, Centre ID: {} -> Exists: {}", email, centreId, exists);
        return ResponseEntity.ok(exists);
    }


    // Endpoint to initiate registration: Sends verification email
    @PostMapping("/register/{centreId}")
    public ResponseEntity<?> initiateDoctorRegistration(
            @PathVariable Long centreId,
            // Receive individual fields instead of the full entity
            @RequestParam String firstName,
            @RequestParam String lastName,
            @RequestParam String email,
            @RequestParam String password, // Raw password from form
            @RequestParam String birthDate,
            @RequestParam String tel,
            @RequestParam String address,
            @RequestParam String gender, // Changed from 'gendre' for consistency
            @RequestParam String speciality, // Added speciality
            @RequestParam("g-recaptcha-response") String captchaResponse // Assuming reCAPTCHA
            // Add @RequestParam for photoProfil (MultipartFile) if needed
    ) {
        log.info("Initiating registration for doctor {} {} for centre ID: {}", firstName, lastName, centreId);

        // 1. Validate reCAPTCHA
        if (!recaptchaService.verifyCaptcha(captchaResponse)) {
            log.warn("reCAPTCHA verification failed for email: {}", email);
            return ResponseEntity.badRequest().body(Map.of("message", "reCAPTCHA verification failed."));
        }

        // 2. Validate Email Format
        if (email == null || !email.matches("^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$")) {
            log.warn("Invalid email format during registration initiation: {}", email);
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid email format."));
        }

        // 3. Check if Centre Exists
        CentreDexamen centre = centreDexamenRepository.findById(centreId)
                .orElse(null);
        if (centre == null) {
            log.warn("Attempt to register doctor for non-existent centre ID: {}", centreId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Examination center not found."));
        }

        // 4. Check for existing Doctor with same email in this Centre (optional but recommended)
        // Note: This check might be better placed in the /verify-email step to avoid sending unnecessary emails
        // if (doctorCentreDexamenRepository.existsByEmailAndCentreDexamen_IdCentre(email, centreId)) {
        //     log.warn("Attempt to register duplicate doctor email {} for centre ID: {}", email, centreId);
        //     return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "A doctor with this email already exists in this center."));
        // }

        // 5. Generate Verification Code
        String verificationCode = String.format("%06d", new Random().nextInt(999999));

        // 6. Create and Store Verification Request
        // Assuming no photo for now. Add photoProfilBytes if needed.
        DoctorCentreVerificationRequest doctorCentreVerificationRequest = new DoctorCentreVerificationRequest(
                firstName, lastName, email, birthDate, password, tel, address, gender,
                Role.DOCTOR_CENTRE_EXAMEN.name(), // Store role name
                null, // photoProfilBytes
                verificationCode,
                centreId, // Store centreId
                speciality // Store speciality
        );
        // TODO: Update VerificationService to handle DoctorCentreVerificationRequest specifically
        verificationService.storeVerificationRequest(email, doctorCentreVerificationRequest);
        log.info("Stored verification request for email: {}", email);

        // 7. Send Verification Email
        try {
            emailService.sendVerificationEmail(email, verificationCode);
            log.info("Verification email sent successfully to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", email, e.getMessage());
            // Consider removing the stored request if email fails, or have a cleanup mechanism
            // TODO: Update VerificationService method name/signature if needed
            verificationService.removeVerificationRequest(email);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Failed to send verification email. Please try again."));
        }

        return ResponseEntity.ok(Map.of("message", "Verification code sent to email."));
    }


    // Endpoint to complete registration after email verification
    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyDoctorEmail(
            @RequestParam String email,
            @RequestParam String code) {
        log.info("Attempting to verify email: {}", email);

        // 1. Retrieve Verification Request
        // TODO: Update VerificationService to return DoctorCentreVerificationRequest specifically
        // For now, casting the result, assuming getVerificationRequest returns a compatible type or Object
        var verificationRequestData = verificationService.getVerificationRequest(email);
        if (verificationRequestData == null) {
             log.warn("No verification request found for email: {}", email);
             return ResponseEntity.badRequest().body(Map.of("message", "Invalid or expired verification code."));
        }
        // Add type check before casting
        if (!(verificationRequestData instanceof DoctorCentreVerificationRequest)) {
            log.error("Verification request for {} is not of type DoctorCentreVerificationRequest. Found type: {}", email, verificationRequestData.getClass().getName());
            verificationService.removeVerificationRequest(email); // Clean up mismatched request
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Internal error during verification. Please try registering again."));
        }
        DoctorCentreVerificationRequest request = (DoctorCentreVerificationRequest) verificationRequestData;

        // 2. Validate Code and Request
        if (request == null || !request.getVerificationCode().equals(code)) {
            log.warn("Invalid or expired verification code for email: {}", email);
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid or expired verification code."));
        }

        // 3. Validate Centre ID from Request
        Long centreId = request.getCentreId();
        if (centreId == null) {
            log.error("Verification request for {} is missing centreId.", email);
            // TODO: Update VerificationService method name/signature if needed
            verificationService.removeVerificationRequest(email); // Clean up invalid request
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Registration data is incomplete (missing center ID). Please register again."));
        }

        // 4. Check if Centre Exists
        CentreDexamen centre = centreDexamenRepository.findById(centreId).orElse(null);
        if (centre == null) {
            log.error("Centre with ID {} specified in verification request for {} not found.", centreId, email);
            // TODO: Update VerificationService method name/signature if needed
            verificationService.removeVerificationRequest(email); // Clean up invalid request
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Associated examination center no longer exists. Please register again."));
        }

        // 5. Check for Duplicates (Email within the specific Centre)
        if (doctorCentreDexamenRepository.existsByEmailAndCentreDexamen_IdCentre(email, centreId)) {
             log.warn("Attempt to verify email for duplicate doctor (Email: {}) in centre ID: {}", email, centreId);
             // TODO: Update VerificationService method name/signature if needed
             verificationService.removeVerificationRequest(email); // Clean up verification request
             return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "A doctor with this email already exists in this examination center."));
        }


        // 6. Create DoctorCentreDexamen Entity
        DoctorCentreDexamen newDoctor = new DoctorCentreDexamen();
        newDoctor.setFirstName(request.getFirstName());
        newDoctor.setLastName(request.getLastName());
        newDoctor.setEmail(request.getEmail());
        newDoctor.setPassword(passwordEncoder.encode(request.getPassword())); // Encode password
        try {
            if (request.getBirthDate() != null && !request.getBirthDate().isEmpty()) {
                newDoctor.setBirthDate(LocalDate.parse(request.getBirthDate()));
            }
        } catch (Exception e) {
             log.error("Error parsing birth date '{}' for email {}: {}", request.getBirthDate(), email, e.getMessage());
             // Decide how to handle: reject, set null, etc. Rejecting seems safer.
             // TODO: Update VerificationService method name/signature if needed
             verificationService.removeVerificationRequest(email);
             return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid birth date format provided during registration."));
        }
        newDoctor.setTel(request.getTel());
        newDoctor.setAddress(request.getAddress());
        newDoctor.setGender(request.getGender()); // Ensure frontend sends 'gender' consistently
        newDoctor.setSpeciality(request.getSpeciality());
        newDoctor.setRole(Role.DOCTOR_CENTRE_EXAMEN); // Set role
        newDoctor.setActive(false); // Set as inactive initially
        newDoctor.setCentreDexamen(centre); // Associate with the centre
        // Set photo if handled: newDoctor.setPhotoProfil(request.getPhotoProfil());
        newDoctor.setCreatedAt(LocalDate.now()); // Set timestamps
        newDoctor.setUpdatedAt(LocalDate.now());

        // 7. Save the new Doctor
        try {
            doctorCentreDexamenRepository.save(newDoctor);
            log.info("Successfully verified and created inactive doctor: {}", email);
        } catch (Exception e) {
            log.error("Failed to save new doctor {} after verification: {}", email, e.getMessage());
            // Don't remove verification request here, user might retry verification
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Failed to save doctor information after verification. Please try verifying again or contact support."));
        }

        // 8. Clean up Verification Request
        // TODO: Update VerificationService method name/signature if needed
        verificationService.removeVerificationRequest(email);

        // 9. Return Success
        // Consider returning the created doctor ID or a simple success message
        return ResponseEntity.ok(Map.of("message", "Email verified successfully. Your account is created but requires activation by an administrator."));
    }

    // --- Admin Management Endpoints ---

    // Endpoint for Admin/System to get a single doctor by ID (needed for edit form)
    @GetMapping("/{id}")
    // Allow ADMIN to get any, or DOCTOR_CENTRE_EXAMEN to get their own
    // Allow ADMIN to get any, or DOCTOR_CENTRE_EXAMEN to get their own (by comparing email/username)
    // Allow ADMIN or DOCTOR_CENTRE_EXAMEN roles - ownership check done inside method
    @PreAuthorize("hasAnyRole('ADMIN', 'ROLE_DOCTOR_CENTRE_EXAMEN')")
    public ResponseEntity<?> getDoctorById(@PathVariable Long id, org.springframework.security.core.Authentication authentication) { // Inject Authentication
        log.info("Request to fetch DoctorCentreDexamen by ID: {} for principal: {}", id, authentication.getName()); // Use authentication.getName()
        Optional<DoctorCentreDexamen> doctorOptional = doctorCentreDexamenRepository.findById(id);

        if (doctorOptional.isPresent()) {
            DoctorCentreDexamen doctor = doctorOptional.get();

            // Ownership check for DOCTOR_CENTRE_EXAMEN role
            boolean isAdmin = authentication.getAuthorities().stream()
                                .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ROLE_ADMIN"));

            if (!isAdmin && authentication.getAuthorities().stream()
                    .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ROLE_DOCTOR_CENTRE_EXAMEN"))) {
                // It's a doctor, check if the requested ID's email matches their username
                if (!doctor.getEmail().equals(authentication.getName())) {
                    log.warn("Forbidden access attempt: User {} tried to access DoctorCentreDexamen ID {}", authentication.getName(), id);
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("message", "You do not have permission to access this resource."));
                }
            }
            // If admin or owner, return the data
            return ResponseEntity.ok(doctor);
        } else {
            log.warn("DoctorCentreDexamen not found with ID: {}", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Doctor not found with ID: " + id));
        }
    }

    // Endpoint for Admin to get all *active* doctors
    @GetMapping("/active")
    @PreAuthorize("hasRole('ADMIN')") // Only Admins can access this
    public ResponseEntity<List<DoctorCentreDexamen>> getActiveDoctors() {
        log.info("Admin request to fetch active DoctorCentreDexamen");
        // Assuming findByIsActive exists in the repository
        List<DoctorCentreDexamen> activeDoctors = doctorCentreDexamenRepository.findByIsActive(true);
        return ResponseEntity.ok(activeDoctors);
    }

    // Endpoint for Admin to get all inactive doctors
    @GetMapping("/inactive")
    @PreAuthorize("hasRole('ADMIN')") // Only Admins can access this
    public ResponseEntity<List<DoctorCentreDexamen>> getInactiveDoctors() {
        log.info("Admin request to fetch inactive DoctorCentreDexamen");
        List<DoctorCentreDexamen> inactiveDoctors = doctorCentreDexamenRepository.findByIsActive(false);
        return ResponseEntity.ok(inactiveDoctors);
    }

    // Endpoint for Admin to get ALL doctors (active and inactive)
    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')") // Only Admins can access this
    public ResponseEntity<List<DoctorCentreDexamen>> getAllDoctors() {
        log.info("Admin request to fetch all DoctorCentreDexamen");
        List<DoctorCentreDexamen> allDoctors = doctorCentreDexamenRepository.findAll();
        return ResponseEntity.ok(allDoctors);
    }

    // Endpoint for Admin to toggle the active status of a doctor
    @PutMapping("/{id}/toggle-status")
    @PreAuthorize("hasRole('ADMIN')") // Only Admins can access this
    public ResponseEntity<?> toggleDoctorStatus(@PathVariable Long id) {
        log.info("Admin request to toggle status for DoctorCentreDexamen ID: {}", id);
        return doctorCentreDexamenRepository.findById(id)
                .map(doctor -> {
                    boolean currentStatus = doctor.isActive();
                    doctor.setActive(!currentStatus); // Toggle status
                    doctor.setUpdatedAt(LocalDate.now()); // Update timestamp
                    doctorCentreDexamenRepository.save(doctor);
                    log.info("Successfully toggled status for DoctorCentreDexamen ID: {} to {}", id, !currentStatus);
                    // Return the updated doctor or just a success message with the new status
                    return ResponseEntity.ok(Map.of(
                            "message", "Doctor status updated successfully.",
                            "doctorId", doctor.getId(),
                            "newStatus", doctor.isActive()
                    ));
                })
                .orElseGet(() -> {
                    log.warn("Admin attempt to toggle status for non-existent DoctorCentreDexamen ID: {}", id);
                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(Map.of("message", "Doctor not found with ID: " + id));
                 });
    }

    // Endpoint for Admin to update a doctor's details
    @PutMapping("/{id}")
    // Allow ADMIN or DOCTOR_CENTRE_EXAMEN roles - ownership check done inside method
    @PreAuthorize("hasAnyRole('ADMIN', 'ROLE_DOCTOR_CENTRE_EXAMEN')")
    public ResponseEntity<?> updateDoctor(@PathVariable Long id, @RequestBody DoctorCentreDexamen updatedDoctorData, org.springframework.security.core.Authentication authentication) { // Inject Authentication
        log.info("Request to update DoctorCentreDexamen ID: {} for principal: {}", id, authentication.getName()); // Use authentication.getName()
        Optional<DoctorCentreDexamen> doctorOptional = doctorCentreDexamenRepository.findById(id);

        if (doctorOptional.isPresent()) {
            DoctorCentreDexamen doctor = doctorOptional.get();

            // Ownership check for DOCTOR_CENTRE_EXAMEN role
            boolean isAdmin = authentication.getAuthorities().stream()
                                .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ROLE_ADMIN"));

            if (!isAdmin && authentication.getAuthorities().stream()
                    .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ROLE_DOCTOR_CENTRE_EXAMEN"))) {
                // It's a doctor, check if the requested ID's email matches their username
                if (!doctor.getEmail().equals(authentication.getName())) {
                    log.warn("Forbidden update attempt: User {} tried to update DoctorCentreDexamen ID {}", authentication.getName(), id);
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("message", "You do not have permission to update this resource."));
                }
            }

            // If admin or owner, proceed with update
            // Update only allowed fields
            doctor.setFirstName(updatedDoctorData.getFirstName());
            doctor.setLastName(updatedDoctorData.getLastName());
            // Consider adding validation for birthDate format if updated
            if (updatedDoctorData.getBirthDate() != null) {
                 // Basic check, add proper parsing/validation if needed
                 doctor.setBirthDate(updatedDoctorData.getBirthDate());
            }
            doctor.setTel(updatedDoctorData.getTel());
            doctor.setAddress(updatedDoctorData.getAddress());
            doctor.setGender(updatedDoctorData.getGender());
            doctor.setSpeciality(updatedDoctorData.getSpeciality());
            // Do NOT update: email, password, role, centre, active status, createdAt
            doctor.setUpdatedAt(LocalDate.now()); // Update timestamp

            DoctorCentreDexamen savedDoctor = doctorCentreDexamenRepository.save(doctor);
            log.info("Successfully updated DoctorCentreDexamen ID: {}", id);
            return ResponseEntity.ok(savedDoctor); // Return ResponseEntity<DoctorCentreDexamen>
        } else {
            log.warn("Admin attempt to update non-existent DoctorCentreDexamen ID: {}", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Doctor not found with ID: " + id)); // Return ResponseEntity<Map<String, String>>
        }
    }


    // Endpoint for Admin to delete a doctor registration
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')") // Only Admins can access this
    public ResponseEntity<?> deleteDoctor(@PathVariable Long id) {
        log.info("Admin request to delete DoctorCentreDexamen ID: {}", id);
        return doctorCentreDexamenRepository.findById(id)
                .map(doctor -> {
                    doctorCentreDexamenRepository.delete(doctor);
                    log.info("Successfully deleted DoctorCentreDexamen ID: {}", id);
                    return ResponseEntity.noContent().build(); // Standard practice for DELETE success
                })
                .orElseGet(() -> {
                    log.warn("Admin attempt to delete non-existent DoctorCentreDexamen ID: {}", id);
                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(Map.of("message", "Doctor not found with ID: " + id));
                });
    }

}
