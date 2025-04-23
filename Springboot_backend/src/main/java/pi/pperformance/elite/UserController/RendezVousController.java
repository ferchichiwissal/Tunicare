package pi.pperformance.elite.UserController;

import org.slf4j.Logger; // Added import
import org.slf4j.LoggerFactory; // Added import
import org.springframework.beans.factory.annotation.Autowired; // Import Autowired
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication; // Import Authentication
import org.springframework.security.core.userdetails.UserDetails; // Import UserDetails
import org.springframework.web.bind.annotation.*;
import pi.pperformance.elite.UserServices.RendezVousService;
import pi.pperformance.elite.entities.RendezVous;
import pi.pperformance.elite.exceptions.ResourceNotFoundException; // Import correct

import java.time.LocalDate; // Import LocalDate
import java.time.LocalDateTime; // Import LocalDateTime
import java.util.Collections; // Added import
// Removed java.util.Date import
import java.util.List;
import java.util.Map;
import pi.pperformance.elite.entities.Patient; // Import Patient
import org.springframework.security.access.AccessDeniedException; // Import AccessDeniedException

@RestController
@RequestMapping("/api") // Base path for appointment related endpoints
public class RendezVousController {

    private static final Logger log = LoggerFactory.getLogger(RendezVousController.class); // Added logger

     private final RendezVousService rendezVousService;

     // Constructor Injection
     @Autowired
     public RendezVousController(RendezVousService rendezVousService) {
         this.rendezVousService = rendezVousService;
     }

     // --- DTOs for Request Bodies ---

     // DTO for Patient creating their own appointment
     static class CreateAppointmentRequest {
         @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) // Expect ISO DateTime format (e.g., 2023-10-27T10:15:30)
         public LocalDateTime apptDateTime; // Updated type and name
         public String apptType;
         public Long originalAppointmentId; // Optional ID for rescheduling
         // Removed cabinetId
     }

     // DTO for Staff (Doctor/Assistant) creating an appointment for a patient
     static class CreateAppointmentByStaffRequest {
         public PatientIdWrapper patient; // Nested object to match frontend structure
         @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) // Expect ISO DateTime format
         public LocalDateTime apptDateTime; // Updated type and name
         public String apptType;
         // apptState is set to 'accepté' by default in this flow

         // Inner class to match the nested patient ID structure
         static class PatientIdWrapper {
             public Long id; // Matches the 'id' field sent by frontend
         }

         // Getter for patient ID for easier access in controller/service
         public Long getPatientId() {
             return (patient != null) ? patient.id : null;
         }
     }

     // DTO for Patient updating their own appointment
     static class UpdateAppointmentRequest {
         @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
         public LocalDateTime apptDateTime;
         public String apptType;
     }

     // --- Part 1: Patient ---

     // Endpoint for authenticated patient to add their own appointment
     @PostMapping("/rendezvous/mine")
     // Request body now includes optional originalAppointmentId
     public ResponseEntity<?> addAppointmentForCurrentUser(Authentication authentication, @RequestBody CreateAppointmentRequest request) {
         // Removed cabinetId from validation
         if (request.apptDateTime == null || request.apptType == null || request.apptType.isEmpty()) {
              return ResponseEntity.badRequest().body(Map.of("error", "Missing required fields: apptDateTime, apptType"));
         }
         if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not authenticated."));
        }
        String userEmail = authentication.getName();

        RendezVous rendezVousDetails = new RendezVous();
        rendezVousDetails.setApptDateTime(request.apptDateTime); // Updated field name
        rendezVousDetails.setApptType(request.apptType);

         try {
              // Pass only userEmail, details, and originalAppointmentId. Service will get cabinetId from auth.
              RendezVous createdRendezVous = rendezVousService.addAppointmentForCurrentUser(userEmail, rendezVousDetails, request.originalAppointmentId);
              return new ResponseEntity<>(createdRendezVous, HttpStatus.CREATED);
         } catch (ResourceNotFoundException e) {
             log.warn("Resource not found during appointment creation/rescheduling for user {}: {}", userEmail, e.getMessage()); // Updated log message slightly
             return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
             log.warn("Illegal state during appointment creation for user {}: {}", userEmail, e.getMessage());
             return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
         } catch (Exception e) {
              log.error("Error adding appointment for user {}: {}", userEmail, e.getMessage(), e);
              return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "An unexpected error occurred while adding the appointment."));
         }
     }

     // Endpoint for patient to view their appointments
    @GetMapping("/patients/{patientId}/rendezvous/list")
    public ResponseEntity<List<RendezVous>> getPatientAppointments(@PathVariable Long patientId) {
        // TODO: Add security check: Ensure the logged-in user is the patient themselves or an authorized role (Admin, relevant Doctor/Assistant).
        try {
            List<RendezVous> appointments = rendezVousService.getAppointmentsByPatient(patientId);
            return ResponseEntity.ok(appointments);
        } catch (Exception e) {
            log.error("Error fetching appointments for patient {}: {}", patientId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }

    // --- Part 2: Assistant / Doctor ---

    // Get appointments by cabinet, state, and date (for 'En attente')
    @GetMapping("/cabinets/{cabinetId}/rendezvous")
    public ResponseEntity<List<RendezVous>> getAppointmentsByStateAndDate(
            @PathVariable Long cabinetId,
            @RequestParam String state,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) { // Changed to LocalDate and DATE format
        // TODO: Add security check: Ensure the logged-in user (Doctor/Assistant) belongs to this cabinetId, or is an Admin.
        try {
            List<RendezVous> appointments = rendezVousService.getAppointmentsByCabinetStateAndDate(cabinetId, state, date); // Updated service call signature
            return ResponseEntity.ok(appointments);
        } catch (ResourceNotFoundException e) {
             log.warn("Resource not found fetching appointments for cabinet {}, state {}, date {}: {}", cabinetId, state, date, e.getMessage()); // Updated log param name
             return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList());
        } catch (Exception e) {
            log.error("Error fetching appointments for cabinet {}, state {}, date {}: {}", cabinetId, state, date, e.getMessage(), e); // Updated log param name
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }

     // Get accepted appointments by cabinet and date (for 'Acceptés')
    @GetMapping("/cabinets/{cabinetId}/rendezvous/accepted")
    public ResponseEntity<List<RendezVous>> getAcceptedAppointmentsByDate(
            @PathVariable Long cabinetId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) { // Changed to LocalDate and DATE format
         // TODO: Add security check: Ensure the logged-in user (Doctor/Assistant) belongs to this cabinetId, or is an Admin.
         try {
            List<RendezVous> appointments = rendezVousService.getAcceptedAppointmentsByCabinetAndDate(cabinetId, date); // Updated service call signature
            // IMPORTANT: Ensure the service method actually fetches patient data here!
            return ResponseEntity.ok(appointments);
         } catch (ResourceNotFoundException e) {
             log.warn("Resource not found fetching accepted appointments for cabinet {}, date {}: {}", cabinetId, date, e.getMessage()); // Updated log param name
             return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList());
         } catch (Exception e) {
            log.error("Error fetching accepted appointments for cabinet {}, date {}: {}", cabinetId, date, e.getMessage(), e); // Updated log param name
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
         }
     }


     // --- Endpoint for Staff (Doctor/Assistant) to add an appointment for a patient ---
     @PostMapping("/cabinets/{cabinetId}/rendezvous")
     public ResponseEntity<?> addAppointmentByStaff(
             @PathVariable Long cabinetId,
             @RequestBody CreateAppointmentByStaffRequest request,
             Authentication authentication) {

         // 1. Basic Validation
         if (request.getPatientId() == null || request.apptDateTime == null || request.apptType == null || request.apptType.isEmpty()) { // Updated field name
             log.warn("Missing required fields in addAppointmentByStaff request for cabinet {}", cabinetId);
             return ResponseEntity.badRequest().body(Map.of("error", "Missing required fields: patient.id, apptDateTime, apptType")); // Updated field name
         }

         // 2. Authentication and Authorization Check
         if (authentication == null || !authentication.isAuthenticated()) {
             return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not authenticated."));
         }
         String userEmail = authentication.getName();
         // TODO: Implement a proper permission check in the service layer or here
         // Ensure the authenticated user (Doctor/Assistant) belongs to cabinetId.
         // This might involve fetching the user and checking their cabinet association.
         // For now, we assume the service layer will handle this check.

         // 3. Call Service Layer
         try {
             // Assuming a new service method exists: addAppointmentByStaff
             // This service method needs to handle finding the patient by ID, checking permissions,
             // creating the RendezVous entity, setting state to 'accepté', and saving.
             RendezVous createdRendezVous = rendezVousService.addAppointmentByStaff(
                     cabinetId,
                     request.getPatientId(),
                     request.apptDateTime, // Updated field name
                     request.apptType,
                     userEmail // Pass authenticated user's email for permission checks/logging
             );
             log.info("Appointment created successfully by {} for patient {} in cabinet {}", userEmail, request.getPatientId(), cabinetId);
             return new ResponseEntity<>(createdRendezVous, HttpStatus.CREATED);
         } catch (ResourceNotFoundException e) {
             log.warn("Resource not found during staff appointment creation by {}: {}", userEmail, e.getMessage());
             // Could be patient not found, or cabinet not found (if service checks that)
             return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
         } catch (AccessDeniedException e) { // Catch potential permission errors from service
             log.warn("Permission denied for {} during staff appointment creation: {}", userEmail, e.getMessage());
             return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
         } catch (IllegalStateException e) { // Catch other business logic errors
             log.warn("Illegal state during staff appointment creation by {}: {}", userEmail, e.getMessage());
             return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
         } catch (Exception e) {
             log.error("Error adding appointment by staff {} for patient {} in cabinet {}: {}", userEmail, request.getPatientId(), cabinetId, e.getMessage(), e);
             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "An unexpected error occurred while adding the appointment."));
         }
     }


     // --- Endpoint to get a single appointment by ID ---
    @GetMapping("/rendezvous/{appointmentId}")
    public ResponseEntity<?> getAppointmentById(@PathVariable Long appointmentId) {
        // TODO: Add security check: Ensure the logged-in user (Doctor/Assistant) belongs to the same cabinet as the appointment, or is an Admin, or is the patient themselves.
        return rendezVousService.getAppointmentById(appointmentId)
                .<ResponseEntity<?>>map(ResponseEntity::ok) // If found, wrap in ResponseEntity.ok()
                .orElseGet(() -> {
                    log.warn("Appointment not found with ID: {}", appointmentId);
                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                         .body(Map.of("error", "Appointment not found with id: " + appointmentId));
                }); // If not found, return 404
    }

    @PutMapping("/rendezvous/{appointmentId}/accept")
    public ResponseEntity<?> acceptAppointment(@PathVariable Long appointmentId) {
        // TODO: Add security check: Ensure the logged-in user (Doctor/Assistant) belongs to the same cabinet as the appointment, or is an Admin.
        try {
            RendezVous updatedRendezVous = rendezVousService.acceptAppointment(appointmentId);
            return ResponseEntity.ok(updatedRendezVous);
        } catch (ResourceNotFoundException e) {
             log.warn("Resource not found trying to accept appointment {}: {}", appointmentId, e.getMessage());
             return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            log.warn("Illegal state trying to accept appointment {}: {}", appointmentId, e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
             log.error("Error accepting appointment {}: {}", appointmentId, e.getMessage(), e);
             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "An unexpected error occurred while accepting the appointment."));
        }
    }

    // Endpoint to handle refusing an appointment and proposing a new date/time
    @PutMapping("/rendezvous/{appointmentId}/refuse-propose")
    public ResponseEntity<?> refuseAndProposeAppointment(
            @PathVariable Long appointmentId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime proposedDateTime) {
        // TODO: Add security check: Ensure the logged-in user (Doctor/Assistant) belongs to the same cabinet as the appointment, or is an Admin.
        if (proposedDateTime == null) {
            log.warn("Missing 'proposedDateTime' request parameter for appointment {}", appointmentId);
            return ResponseEntity.badRequest().body(Map.of("error", "Missing required request parameter: proposedDateTime. Expected ISO format (e.g., 2023-10-27T10:15:30)"));
        }
        try {
            RendezVous updatedRendezVous = rendezVousService.refuseAndProposeAppointment(appointmentId, proposedDateTime);
            log.info("Appointment {} refused and new date {} proposed.", appointmentId, proposedDateTime);
            return ResponseEntity.ok(updatedRendezVous);
        } catch (ResourceNotFoundException e) {
            log.warn("Resource not found trying to refuse/propose for appointment {}: {}", appointmentId, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            log.warn("Illegal state trying to refuse/propose for appointment {}: {}", appointmentId, e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error refusing/proposing for appointment {}: {}", appointmentId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "An unexpected error occurred while refusing the appointment and proposing a new date."));
        }
    }


    @PutMapping("/rendezvous/{appointmentId}/complete")
    public ResponseEntity<?> markAppointmentAsDone(@PathVariable Long appointmentId) {
         // TODO: Add security check: Ensure the logged-in user (Doctor) belongs to the same cabinet as the appointment, or is an Admin.
         try {
            RendezVous updatedRendezVous = rendezVousService.markAppointmentAsDone(appointmentId);
            return ResponseEntity.ok(updatedRendezVous);
        } catch (ResourceNotFoundException e) {
             log.warn("Resource not found trying to complete appointment {}: {}", appointmentId, e.getMessage());
             return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
             log.warn("Illegal state trying to complete appointment {}: {}", appointmentId, e.getMessage());
             return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
             log.error("Error completing appointment {}: {}", appointmentId, e.getMessage(), e);
             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "An unexpected error occurred while completing the appointment."));
        }
    }

    // --- Part 3: Patient Actions (from Mes Rendez-vous page) ---

    // Endpoint for authenticated patient to cancel their own accepted appointment
    @PutMapping("/rendezvous/mine/{appointmentId}/cancel")
    public ResponseEntity<?> cancelOwnAppointment(@PathVariable Long appointmentId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not authenticated."));
        }
        String userEmail = authentication.getName();

        try {
            RendezVous cancelledRendezVous = rendezVousService.cancelAppointment(appointmentId, userEmail);
            log.info("Appointment {} cancelled successfully by user {}", appointmentId, userEmail);
            return ResponseEntity.ok(cancelledRendezVous);
        } catch (ResourceNotFoundException e) {
            log.warn("Resource not found trying to cancel appointment {} by user {}: {}", appointmentId, userEmail, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            log.warn("Illegal state trying to cancel appointment {} by user {}: {}", appointmentId, userEmail, e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (AccessDeniedException e) {
            log.warn("Access denied trying to cancel appointment {} by user {}: {}", appointmentId, userEmail, e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error cancelling appointment {} by user {}: {}", appointmentId, userEmail, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "An unexpected error occurred while cancelling the appointment."));
        }
    }

    // Endpoint for authenticated patient to modify their own pending appointment
    @PutMapping("/rendezvous/mine/{appointmentId}/modify")
    public ResponseEntity<?> modifyOwnAppointment(
            @PathVariable Long appointmentId,
            @RequestBody UpdateAppointmentRequest request,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not authenticated."));
        }
        String userEmail = authentication.getName();

        if (request.apptDateTime == null || request.apptType == null || request.apptType.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing required fields: apptDateTime, apptType"));
        }

        RendezVous updatedDetails = new RendezVous();
        updatedDetails.setApptDateTime(request.apptDateTime);
        updatedDetails.setApptType(request.apptType);

        try {
            RendezVous modifiedRendezVous = rendezVousService.updateAppointment(appointmentId, updatedDetails, userEmail);
            log.info("Appointment {} modified successfully by user {}", appointmentId, userEmail);
            return ResponseEntity.ok(modifiedRendezVous);
        } catch (ResourceNotFoundException e) {
            log.warn("Resource not found trying to modify appointment {} by user {}: {}", appointmentId, userEmail, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            log.warn("Illegal state trying to modify appointment {} by user {}: {}", appointmentId, userEmail, e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (AccessDeniedException e) {
            log.warn("Access denied trying to modify appointment {} by user {}: {}", appointmentId, userEmail, e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid argument trying to modify appointment {} by user {}: {}", appointmentId, userEmail, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error modifying appointment {} by user {}: {}", appointmentId, userEmail, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "An unexpected error occurred while modifying the appointment."));
        }
    }
}
