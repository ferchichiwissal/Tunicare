package pi.pperformance.elite.UserServices;

import org.springframework.security.access.AccessDeniedException; // Keep for permission checks if needed later
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // Import Transactional
import pi.pperformance.elite.UserRepository.*; // Import all repositories
import pi.pperformance.elite.entities.*; // Import all entities for convenience
import pi.pperformance.elite.exceptions.ResourceNotFoundException; // Use specific exception

import org.springframework.beans.factory.annotation.Autowired; // Added import
import org.springframework.security.core.Authentication; // Added import
import org.springframework.security.core.context.SecurityContextHolder; // Added import

import java.time.LocalDate; // Import LocalDate
import java.time.LocalDateTime; // Import LocalDateTime
import java.util.List;
import java.util.Optional; // Ensure import is present
import java.util.function.Function; // Added for claim extraction if needed
import io.jsonwebtoken.Claims; // Added for claim extraction if needed
// Collectors import removed as it's not used in the corrected version
// import java.util.stream.Collectors;

@Service
public class RendezVousServiceImpl implements RendezVousService { // Implements the interface

    private final RendezVousRepository rendezVousRepository;
    private final PatientRepository patientRepository; // Added missing field declaration
    private final CabinetDrRepository cabinetDrRepository;
    private final UserRepository userRepository; // Need this to find patient by email
    private final UserCabinetRegistrationRepository userCabinetRegistrationRepository; // Need this for registrations
    private final ConsultationRepository consultationRepository; // Added ConsultationRepository
    private final pi.pperformance.elite.Authentif.JwtUtils jwtUtils; // Inject via constructor

    // Explicit constructor for dependency injection including JwtUtils
    @Autowired // Add Autowired if using Spring context for instantiation
    public RendezVousServiceImpl(RendezVousRepository rendezVousRepository,
                                 PatientRepository patientRepository,
                                 CabinetDrRepository cabinetDrRepository,
                                 UserRepository userRepository,
                                 UserCabinetRegistrationRepository userCabinetRegistrationRepository,
                                 ConsultationRepository consultationRepository, // Added ConsultationRepository
                                 pi.pperformance.elite.Authentif.JwtUtils jwtUtils) { // Add JwtUtils here
        this.rendezVousRepository = rendezVousRepository;
        this.patientRepository = patientRepository;
        this.cabinetDrRepository = cabinetDrRepository;
        this.userRepository = userRepository;
        this.userCabinetRegistrationRepository = userCabinetRegistrationRepository;
        this.consultationRepository = consultationRepository; // Initialize ConsultationRepository
        this.jwtUtils = jwtUtils; // Initialize JwtUtils
    }

    // --- Implementation of methods from RendezVousService interface ---
    // Removed the duplicate constructor block


    @Override
    @Transactional
    // Reverted signature - cabinetId will be extracted from authentication context
    public RendezVous addAppointmentForCurrentUser(String userEmail, RendezVous rendezVousDetails, Long originalAppointmentId) {
        // 1. Find the user by email and ensure they exist
        User user = userRepository.findByEmail(userEmail);
        if (user == null) {
            throw new ResourceNotFoundException("User not found with email: " + userEmail);
        }

        // 2. Ensure the user is a Patient
        if (!(user instanceof Patient)) {
            throw new IllegalStateException("User is not a patient.");
        }
        Patient patient = (Patient) user;

        // 3. Extract Cabinet ID from Authentication Context
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
             throw new IllegalStateException("Cannot determine cabinet: No authentication context found.");
        }

        // Extract cabinetId from the Authentication details map set by JwtRequestFilter
        Long extractedCabinetId = null; // Use a temporary non-final variable
        Object details = authentication.getDetails();

        if (details instanceof java.util.Map) {
            @SuppressWarnings("unchecked") // Suppress warning for the cast
            java.util.Map<String, Object> detailsMap = (java.util.Map<String, Object>) details;
            Object cabinetIdObj = detailsMap.get("cabinetId");
            if (cabinetIdObj instanceof Integer) {
                extractedCabinetId = ((Integer) cabinetIdObj).longValue();
            } else if (cabinetIdObj instanceof Long) {
                extractedCabinetId = (Long) cabinetIdObj;
            }
             org.slf4j.LoggerFactory.getLogger(getClass()).debug("Extracted cabinetId {} from authentication details map for user {}.", extractedCabinetId, userEmail);
        } else {
             org.slf4j.LoggerFactory.getLogger(getClass()).warn("Authentication details are not a Map for user {}. Details type: {}", userEmail, (details != null ? details.getClass().getName() : "null"));
             // extractedCabinetId remains null
        }

        // Assign to a final variable *after* all potential assignments
        final Long cabinetId = extractedCabinetId;

        // Check final cabinetId immediately after assignment
        if (cabinetId == null) {
            // Log specific error if cabinetId is null after extraction attempt
             org.slf4j.LoggerFactory.getLogger(getClass()).error("Could not extract cabinet ID from authentication details for user {}.", userEmail);
            throw new IllegalStateException("Could not extract a valid cabinet ID from authentication context.");
        }

        // Now cabinetId is effectively final and can be used in lambdas


        // 4. Find the specific cabinet the appointment is for using the extracted final ID
        CabinetDr cabinet = cabinetDrRepository.findById(cabinetId) // Use cabinetId directly
                .orElseThrow(() -> new ResourceNotFoundException("Cabinet not found with id extracted from token: " + cabinetId));

        // 5. Verify the patient has an active registration for THIS specific cabinet
        boolean isActiveInCabinet = userCabinetRegistrationRepository.existsByUserIdAndCabinetIdSiteAndIsActiveTrue(patient.getId(), cabinetId); // Use cabinetId directly
        if (!isActiveInCabinet) {
            throw new IllegalStateException("Patient does not have an active registration for the cabinet associated with the login session (ID: " + cabinetId + ")."); // Use cabinetId directly
        }


        // 6. Handle original appointment if rescheduling
        if (originalAppointmentId != null) {
            RendezVous originalRdv = findAppointmentAndVerifyPatient(originalAppointmentId, userEmail); // Reuse helper
            if (!"refusé".equalsIgnoreCase(originalRdv.getApptState())) {
                 throw new IllegalStateException("Cannot reschedule an appointment that is not in 'refusé' state.");
            }
            if (originalRdv.isSuperseded()) {
                 throw new IllegalStateException("This appointment has already been rescheduled.");
            }
            originalRdv.setSuperseded(true);
            rendezVousRepository.save(originalRdv); // Save the change to the original appointment
            // Optionally clear the proposed date on the original?
            // originalRdv.setApptProposedDateTime(null);
        }


        // 4. Create and save the new appointment
        RendezVous newRendezVous = new RendezVous();
        newRendezVous.setPatient(patient);
        newRendezVous.setCabinet(cabinet); // Set the automatically determined cabinet
        newRendezVous.setApptDateTime(rendezVousDetails.getApptDateTime()); // Updated field name
        newRendezVous.setApptType(rendezVousDetails.getApptType());
        newRendezVous.setApptState("en attente"); // Default state
        newRendezVous.setApptProposedDateTime(null); // Updated field name, ensure proposed date is null initially
        // createdAt and updatedAt are handled by @PrePersist/@PreUpdate

        return rendezVousRepository.save(newRendezVous);
    }

    @Override
    public List<RendezVous> getAppointmentsByCabinetStateAndDate(Long cabinetId, String state, LocalDate date) {
        // Verify staff access to the requested cabinet
        verifyStaffAccess(cabinetId, SecurityContextHolder.getContext().getAuthentication().getName(), true); // Throw exception if no access

        // Optional: Validate if cabinet exists first (already handled implicitly by verifyStaffAccess if it checks repo)
        // cabinetDrRepository.findById(cabinetId)
        //        .orElseThrow(() -> new ResourceNotFoundException("Cabinet not found with id: " + cabinetId));

        // Calculate start and end of the day for the given LocalDate
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.plusDays(1).atStartOfDay(); // End is exclusive in 'Between'

        // Call the repository method that accepts LocalDateTime range and sorts
        return rendezVousRepository.findByCabinet_IdSiteAndApptStateAndApptDateTimeBetweenOrderByApptDateTimeAsc(cabinetId, state, startOfDay, endOfDay);
    }

    @Override
    public List<RendezVous> getAcceptedAppointmentsByCabinetAndDate(Long cabinetId, LocalDate date) {
        // Verify staff access to the requested cabinet
        verifyStaffAccess(cabinetId, SecurityContextHolder.getContext().getAuthentication().getName(), true); // Throw exception if no access

        // Optional: Validate if cabinet exists first (already handled implicitly by verifyStaffAccess if it checks repo)
        // cabinetDrRepository.findById(cabinetId)
        //        .orElseThrow(() -> new ResourceNotFoundException("Cabinet not found with id: " + cabinetId));

        // Calculate start and end of the day
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();

        // Fetch accepted ('accepté') appointments using the range
        // Assuming the repository method handles the state implicitly or explicitly.
        // Let's call the specific 'Between' method and filter by state here if needed,
        // but the repository method findByCabinet_IdSiteAndApptStateAndApptDateTimeBetweenOrderByApptDateTimeAsc already includes state.
        // So we call that one with "accepté".
        return rendezVousRepository.findByCabinet_IdSiteAndApptStateAndApptDateTimeBetweenOrderByApptDateTimeAsc(cabinetId, "accepté", startOfDay, endOfDay);
    }

    @Override
    @Transactional
    public RendezVous acceptAppointment(Long appointmentId) {
        RendezVous rendezVous = findAppointmentAndVerifyStaffAccess(appointmentId, SecurityContextHolder.getContext().getAuthentication().getName()); // Use helper

        // Validate current state
        if (!"en attente".equalsIgnoreCase(rendezVous.getApptState())) { // Use equalsIgnoreCase for robustness
            throw new IllegalStateException("Only appointments 'en attente' can be accepted. Current state: " + rendezVous.getApptState());
        }
        rendezVous.setApptState("accepté");
        rendezVous.setApptProposedDateTime(null); // Updated field name, Clear any previously proposed date
        return rendezVousRepository.save(rendezVous);
    }

    // Removed proposeNewDate method as its logic is replaced by refuseAndProposeAppointment

    @Override
    @Transactional
    public RendezVous refuseAndProposeAppointment(Long appointmentId, LocalDateTime proposedDateTime) {
        RendezVous rendezVous = findAppointmentAndVerifyStaffAccess(appointmentId, SecurityContextHolder.getContext().getAuthentication().getName()); // Use helper

        // Allow refusal for 'en attente' or 'accepté' states
        String currentState = rendezVous.getApptState();
        if (!"en attente".equalsIgnoreCase(currentState) && !"accepté".equalsIgnoreCase(currentState)) {
            throw new IllegalStateException("Cannot refuse an appointment with state: " + currentState);
        }

        rendezVous.setApptState("refusé");
        rendezVous.setApptProposedDateTime(proposedDateTime); // Set the proposed date and time

        // TODO: Implement notification logic to inform the patient about refusal and proposal

        return rendezVousRepository.save(rendezVous);
    }


    @Override
    @Transactional
    public RendezVous markAppointmentAsDone(Long appointmentId) {
         RendezVous rendezVous = findAppointmentAndVerifyStaffAccess(appointmentId, SecurityContextHolder.getContext().getAuthentication().getName()); // Use helper

        // Validate current state - can only complete 'accepté' appointments
         if (!"accepté".equalsIgnoreCase(rendezVous.getApptState())) {
             throw new IllegalStateException("Only 'accepté' appointments can be marked as 'réalisé'. Current state: " + rendezVous.getApptState());
         }
         rendezVous.setApptState("réalisé");
         RendezVous savedRendezVous = rendezVousRepository.save(rendezVous); // Save updated RDV

         // --- Create the corresponding Consultation record ---
         // Check if patient exists on the RDV
         if (savedRendezVous.getPatient() == null) {
             // Log error and potentially throw exception, as we cannot create a consultation without a patient
             org.slf4j.LoggerFactory.getLogger(getClass()).error("Cannot create Consultation for RendezVous ID {} because Patient is null.", appointmentId);
             // Depending on requirements, you might throw an exception or just return the savedRendezVous
             throw new IllegalStateException("Cannot complete appointment: Patient details are missing.");
         }

         Consultation newConsultation = new Consultation();
         newConsultation.setPatient(savedRendezVous.getPatient()); // Link to the patient
         newConsultation.setDateConsultation(new java.util.Date()); // Set consultation date to now
         newConsultation.setText(""); // Initialize with empty text for the doctor to fill

         // Save the new consultation
         try {
             Consultation createdConsultation = consultationRepository.save(newConsultation);
             org.slf4j.LoggerFactory.getLogger(getClass()).info("Created new Consultation with ID {} for completed RendezVous ID {}", createdConsultation.getIdConsultation(), appointmentId);
             // Optionally link Consultation back to RendezVous if the entity relationship exists
             // savedRendezVous.setConsultation(createdConsultation); // If RendezVous has a @OneToOne field for Consultation
             // rendezVousRepository.save(savedRendezVous); // Save again if RDV was modified
         } catch (Exception e) {
             // Log error during consultation creation but potentially still return the updated RDV
             org.slf4j.LoggerFactory.getLogger(getClass()).error("Failed to create Consultation record for completed RendezVous ID {}: {}", appointmentId, e.getMessage(), e);
             // Decide on error handling: re-throw, return RDV anyway, etc.
             // For now, let's re-throw to make the transaction rollback
             throw new RuntimeException("Failed to create consultation record after completing appointment.", e);
         }
         // --- End Consultation Creation ---

         return savedRendezVous; // Return the updated RendezVous
     }

    @Override
    public List<RendezVous> getAppointmentsByPatient(Long patientId) {
        // 1. Get Authentication and Extract Cabinet ID
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long cabinetId = extractCabinetIdFromAuth(authentication); // Use helper

        // 2. Verify the patient ID matches the authenticated user OR the user is staff for the cabinet
        User authenticatedUser = userRepository.findByEmail(authentication.getName());
        if (authenticatedUser == null) {
            throw new ResourceNotFoundException("Authenticated user not found.");
        }

        boolean isPatientViewingOwn = authenticatedUser instanceof Patient && authenticatedUser.getId().equals(patientId);
        boolean isStaffViewingPatientInTheirCabinet = (authenticatedUser.getRole() == Role.DOCTOR || authenticatedUser.getRole() == Role.ASSISTANT) &&
                                                      verifyStaffAccess(cabinetId, authenticatedUser.getEmail(), false); // Check if staff belongs to the *extracted* cabinetId

        if (!isPatientViewingOwn && !isStaffViewingPatientInTheirCabinet) {
             throw new AccessDeniedException("User not authorized to view appointments for patient " + patientId + " in cabinet " + cabinetId);
        }

        // 3. Fetch appointments for the patient *within the specific cabinet context*
        return rendezVousRepository.findActiveAppointmentsForPatientAndCabinet(patientId, cabinetId);
    }

    // --- Implementation for getting a single appointment by ID ---
    @Override
    public Optional<RendezVous> getAppointmentById(Long appointmentId) {
        // Fetch the appointment first
        Optional<RendezVous> rdvOpt = rendezVousRepository.findById(appointmentId); // Already fetches patient eagerly

        if (rdvOpt.isPresent()) {
            RendezVous rdv = rdvOpt.get();
            Long requiredCabinetId = rdv.getCabinet().getIdSite();

            // Get Authentication
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                 throw new AccessDeniedException("User not authenticated.");
            }
            String userEmail = authentication.getName();
            User authenticatedUser = userRepository.findByEmail(userEmail);
            if (authenticatedUser == null) {
                throw new ResourceNotFoundException("Authenticated user not found.");
            }

            // Check 1: Is the user the patient associated with the appointment AND is the request context for the correct cabinet?
            Long authCabinetId = extractCabinetIdFromAuth(authentication);
            boolean isPatientForThisRdv = authenticatedUser instanceof Patient &&
                                          authenticatedUser.getId().equals(rdv.getPatient().getId()) &&
                                          requiredCabinetId.equals(authCabinetId);

            // Check 2: Is the user staff (Doctor/Assistant) belonging to the appointment's cabinet?
            boolean isStaffForThisRdvCabinet = (authenticatedUser.getRole() == Role.DOCTOR || authenticatedUser.getRole() == Role.ASSISTANT) &&
                                               verifyStaffAccess(requiredCabinetId, userEmail, false); // Check against the *appointment's* cabinet

            if (!isPatientForThisRdv && !isStaffForThisRdvCabinet) {
                throw new AccessDeniedException("User " + userEmail + " not authorized to view appointment " + appointmentId);
            }
        }
        // Return the optional (empty if not found, or containing the authorized appointment)
        return rdvOpt;
    }


    // --- Implementation for adding appointment by staff ---
    @Override
    @Transactional
    public RendezVous addAppointmentByStaff(Long cabinetId, Long patientId, LocalDateTime apptDateTime, String apptType, String actorEmail) { // Updated type and name
        // 1. Find Actor and check role/permissions
        User actor = userRepository.findByEmail(actorEmail);
        if (actor == null) {
            throw new ResourceNotFoundException("Actor not found with email: " + actorEmail);
        }
        if (actor.getRole() != Role.DOCTOR && actor.getRole() != Role.ASSISTANT) {
            throw new AccessDeniedException("User does not have permission to add appointments in this manner.");
        }

        // 2. Find Cabinet and verify actor belongs to it
        CabinetDr cabinet = cabinetDrRepository.findById(cabinetId)
                .orElseThrow(() -> new ResourceNotFoundException("Cabinet not found with id: " + cabinetId));

        Long actorCabinetId = null;
        if (actor instanceof Doctor) {
            actorCabinetId = ((Doctor) actor).getCabinetId();
        } else if (actor instanceof Assistant) {
            actorCabinetId = ((Assistant) actor).getCabinetId();
        }

        if (actorCabinetId == null || !actorCabinetId.equals(cabinetId)) {
            throw new AccessDeniedException("Actor does not belong to the specified cabinet.");
        }

        // 3. Find Patient
        // Use patientRepository or userRepository depending on your setup
        Patient patient = userRepository.findById(patientId)
                .filter(Patient.class::isInstance) // Ensure it's a Patient
                .map(Patient.class::cast)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));

        // 4. Optional: Verify patient is registered in this cabinet (active or inactive)
        boolean isRegistered = userCabinetRegistrationRepository.existsByUserIdAndCabinetIdSite(patientId, cabinetId);
        if (!isRegistered) {
             // Or handle differently - maybe allow adding if not registered? For now, require registration.
             throw new IllegalStateException("Patient is not registered in the specified cabinet.");
        }

        // 5. Create and save the new appointment
        RendezVous newRendezVous = new RendezVous();
        newRendezVous.setPatient(patient);
        newRendezVous.setCabinet(cabinet);
        newRendezVous.setApptDateTime(apptDateTime); // Updated field name
        newRendezVous.setApptType(apptType);
        newRendezVous.setApptState("accepté"); // Set state directly to 'accepté'
        newRendezVous.setApptProposedDateTime(null); // Updated field name

        return rendezVousRepository.save(newRendezVous);
    } // <-- Add missing closing brace for addAppointmentByStaff method

    // --- Part 3: Patient Actions ---

    @Override
    @Transactional
    public RendezVous cancelAppointment(Long appointmentId, String userEmail) {
        // Verify patient owns the appointment AND the action is within the correct cabinet context
        RendezVous rendezVous = findAppointmentAndVerifyPatientAndContext(appointmentId, userEmail);

        // Validate current state - only 'accepté' appointments can be cancelled by patient
        if (!"accepté".equalsIgnoreCase(rendezVous.getApptState())) {
            throw new IllegalStateException("Only 'accepté' appointments can be cancelled by the patient. Current state: " + rendezVous.getApptState());
        }

        rendezVous.setApptState("refusé"); // Change state to 'refusé'
        rendezVous.setApptProposedDateTime(null); // Clear proposed date on cancellation

        // TODO: Optionally notify the cabinet/doctor about the cancellation

        return rendezVousRepository.save(rendezVous);
    }

    @Override
    @Transactional
    public RendezVous updateAppointment(Long appointmentId, RendezVous updatedDetails, String userEmail) {
        // Verify patient owns the appointment AND the action is within the correct cabinet context
        RendezVous rendezVous = findAppointmentAndVerifyPatientAndContext(appointmentId, userEmail);

        // Validate current state - only 'en attente' appointments can be modified by patient
        if (!"en attente".equalsIgnoreCase(rendezVous.getApptState())) {
            throw new IllegalStateException("Only 'en attente' appointments can be modified by the patient. Current state: " + rendezVous.getApptState());
        }

        // Validate input details
        if (updatedDetails.getApptDateTime() == null || updatedDetails.getApptType() == null || updatedDetails.getApptType().trim().isEmpty()) {
             throw new IllegalArgumentException("Appointment date/time and type cannot be empty for update.");
        }

        // Update the modifiable fields
        rendezVous.setApptDateTime(updatedDetails.getApptDateTime());
        rendezVous.setApptType(updatedDetails.getApptType().trim());
        // State remains 'en attente'

        // TODO: Optionally notify the cabinet/doctor about the modification

        return rendezVousRepository.save(rendezVous);
    }

    // --- Helper method for patient verification ---
    private RendezVous findAppointmentAndVerifyPatient(Long appointmentId, String userEmail) {
        RendezVous rendezVous = rendezVousRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found with id: " + appointmentId));

        User user = userRepository.findByEmail(userEmail);
        if (user == null) {
            // This shouldn't happen if the user is authenticated, but good practice to check
            throw new ResourceNotFoundException("User not found with email: " + userEmail);
        }

        // Check if the user is the patient associated with the appointment
        if (rendezVous.getPatient() == null || !rendezVous.getPatient().getId().equals(user.getId())) {
            throw new AccessDeniedException("User (" + userEmail + ") is not authorized to modify appointment " + appointmentId);
        }

        return rendezVous;
    }

    // --- Helper method for staff verification ---
    private boolean verifyStaffAccess(Long requiredCabinetId, String actorEmail, boolean throwExceptionOnFail) {
        User actor = userRepository.findByEmail(actorEmail);
        if (actor == null) {
            if (throwExceptionOnFail) throw new ResourceNotFoundException("Actor not found with email: " + actorEmail);
            else return false;
        }

        if (actor.getRole() != Role.DOCTOR && actor.getRole() != Role.ASSISTANT) {
            if (throwExceptionOnFail) throw new AccessDeniedException("User " + actorEmail + " is not Doctor or Assistant.");
            else return false;
        }

        Long actorCabinetId = null;
        if (actor instanceof Doctor) {
            actorCabinetId = ((Doctor) actor).getCabinetId();
        } else if (actor instanceof Assistant) {
            actorCabinetId = ((Assistant) actor).getCabinetId();
        }

        if (actorCabinetId == null || !actorCabinetId.equals(requiredCabinetId)) {
            if (throwExceptionOnFail) throw new AccessDeniedException("Actor " + actorEmail + " does not belong to the required cabinet " + requiredCabinetId);
            else return false;
        }
        return true; // Access granted
    }

    // --- Helper method to find appointment and verify staff access ---
    private RendezVous findAppointmentAndVerifyStaffAccess(Long appointmentId, String actorEmail) {
        RendezVous rendezVous = rendezVousRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found with id: " + appointmentId));

        Long requiredCabinetId = rendezVous.getCabinet().getIdSite();
        verifyStaffAccess(requiredCabinetId, actorEmail, true); // Throws exception if access denied

        return rendezVous;
    }

    // --- Helper method to find appointment, verify patient ownership AND cabinet context ---
    private RendezVous findAppointmentAndVerifyPatientAndContext(Long appointmentId, String userEmail) {
        RendezVous rendezVous = findAppointmentAndVerifyPatient(appointmentId, userEmail); // First verify ownership

        // Now verify cabinet context from authentication
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long authCabinetId = extractCabinetIdFromAuth(authentication);
        Long rdvCabinetId = rendezVous.getCabinet().getIdSite();

        if (!rdvCabinetId.equals(authCabinetId)) {
            throw new AccessDeniedException("Action on appointment " + appointmentId + " is not allowed for the current cabinet context (" + authCabinetId + "). Appointment belongs to cabinet " + rdvCabinetId);
        }

        return rendezVous;
    }

    // --- Helper method to extract Cabinet ID from Authentication ---
    private Long extractCabinetIdFromAuth(Authentication authentication) {
        if (authentication == null || authentication.getDetails() == null) {
            throw new IllegalStateException("Cannot determine cabinet: Authentication details are missing.");
        }

        Object details = authentication.getDetails();
        Long extractedCabinetId = null;

        if (details instanceof java.util.Map) {
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> detailsMap = (java.util.Map<String, Object>) details;
            Object cabinetIdObj = detailsMap.get("cabinetId");
            if (cabinetIdObj instanceof Integer) {
                extractedCabinetId = ((Integer) cabinetIdObj).longValue();
            } else if (cabinetIdObj instanceof Long) {
                extractedCabinetId = (Long) cabinetIdObj;
            }
        }

        if (extractedCabinetId == null) {
            org.slf4j.LoggerFactory.getLogger(getClass()).error("Could not extract cabinet ID from authentication details for user {}. Details type: {}", authentication.getName(), details.getClass().getName());
            throw new IllegalStateException("Could not extract a valid cabinet ID from authentication context.");
        }
        return extractedCabinetId;
    }


    // --- Removed methods that were not in the interface ---
    // createAppointment(Patient patient, CabinetDr cabinet, Date apptDate, String apptType)
    // getAppointmentsByCriteria(Long cabinetId, Date date, String state, String searchTerm)
    // findAppointmentById(Long appointmentId)
    // updateAppointmentState(Long appointmentId, String newState, User actor)
    // proposeAlternativeDate removed

} // Ensure this is the final closing brace for the class
