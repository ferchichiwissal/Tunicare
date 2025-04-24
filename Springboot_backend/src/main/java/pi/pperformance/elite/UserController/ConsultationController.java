package pi.pperformance.elite.UserController;

// Removed Lombok import
import org.springframework.beans.factory.annotation.Autowired; // Import Autowired
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pi.pperformance.elite.UserServices.IConsultationService;
import pi.pperformance.elite.entities.Consultation;
import pi.pperformance.elite.dto.ConsultationDTO; // Import the output DTO
import pi.pperformance.elite.dto.ConsultationInputDTO; // Assuming a DTO for input

import java.util.List;

@RestController
@RequestMapping("/api/consultations")
// Removed @AllArgsConstructor
public class ConsultationController {

    private final IConsultationService consultationService;

    // Explicit constructor for dependency injection
    @Autowired
    public ConsultationController(IConsultationService consultationService) {
        this.consultationService = consultationService;
    }

    // Endpoint pour récupérer une consultation par son ID (Médecin/Assistant)
    // Utilisé pour charger les données dans /consultation/:idConsultation ou /consultation/edit/:id
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ASSISTANT')")
    public ResponseEntity<ConsultationDTO> getConsultationById(@PathVariable Long id) {
        // Service now returns DTO directly
        ConsultationDTO consultationDTO = consultationService.getConsultationById(id);
        return ResponseEntity.ok(consultationDTO);
    }

    // Endpoint pour récupérer l'historique des consultations d'un patient (Médecin)
    // Utilisé dans la section historique de /consultation/:idConsultation
    @GetMapping("/patient/{patientId}/history")
    @PreAuthorize("hasRole('DOCTOR')") // Only doctors see full history with prescriptions? Or Assistants too? Adjust if needed.
    public ResponseEntity<List<Consultation>> getConsultationHistory(@PathVariable Long patientId) {
        List<Consultation> history = consultationService.getConsultationHistoryByPatientId(patientId);
        // TODO: Consider returning DTOs that maybe exclude prescription text for Assistants?
        return ResponseEntity.ok(history);
    }
// Endpoint pour récupérer les consultations d'un patient POUR UN CABINET SPECIFIQUE (Patient)
    // Utilisé par la page "Mes Consultations" du patient
    @GetMapping("/my-consultations/{patientId}")
    @PreAuthorize("hasRole('PATIENT') and #patientId == principal.id") // Ensure patient can only access their own data
    public ResponseEntity<List<ConsultationDTO>> getMyConsultationsForCabinet(
            @PathVariable Long patientId,
            @RequestParam Long cabinetId) { // Get cabinetId from query parameter
        // Call a new service method that filters by both patientId and cabinetId
        List<ConsultationDTO> consultations = consultationService.getPatientConsultationsByCabinet(patientId, cabinetId);
        return ResponseEntity.ok(consultations);
    }

    // Endpoint pour enregistrer une nouvelle consultation ou mettre à jour une existante (Médecin)
    // Utilisé par le bouton ENREGISTRER dans /consultation/:idConsultation
    // Prend potentiellement un DTO en entrée pour séparer les données
    @PostMapping // Can handle both create and update based on whether ID is present in DTO/body
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<Consultation> saveOrUpdateConsultation(@RequestBody ConsultationInputDTO consultationInput) {
         // Map DTO to Consultation entity
         Consultation consultation = new Consultation();
         if (consultationInput.getIdConsultation() != null) {
             consultation.setIdConsultation(consultationInput.getIdConsultation());
         }
         consultation.setText(consultationInput.getConsultationText());
         // Assuming patientId is part of the input DTO or fetched differently
         // Pass doctorId from the DTO to the service method
         // Pass doctorId and cabinetId from the DTO to the service method
         Consultation savedConsultation = consultationService.saveConsultation(
                 consultation,
                 consultationInput.getPatientId(),
                 consultationInput.getDoctorId(),
                 consultationInput.getCabinetId(), // Added cabinetId
                 consultationInput.getPrescriptionText()
         );
         // TODO: Return a DTO representing the saved consultation, including doctor and cabinet info if needed
         return new ResponseEntity<>(savedConsultation, HttpStatus.CREATED); // Or OK if updated
    }

    // Endpoint pour récupérer les consultations d'un médecin spécifique
    @GetMapping("/doctor/{doctorId}")
    @PreAuthorize("hasRole('DOCTOR') or #doctorId == principal.id") // Allow doctor to see their own, or potentially admin/assistant in future
    public ResponseEntity<List<Consultation>> getConsultationsByDoctorId(@PathVariable Long doctorId) {
        List<Consultation> consultations = consultationService.getConsultationsByDoctorId(doctorId);
        // TODO: Consider returning DTOs
        return ResponseEntity.ok(consultations);
    }


    // Endpoint pour récupérer toutes les consultations (Dashboard Médecin/Assistant)
    // TODO: Implement filtering/pagination and role-based data access
    // This might be replaced or refined now that we have /doctor/{doctorId}
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ASSISTANT')")
    public ResponseEntity<List<Consultation>> getAllConsultations() {
        // Needs refinement: Filter by cabinet, apply security checks based on user role
        // This endpoint might be less useful now, or needs better filtering (e.g., by cabinet for assistants)
        List<Consultation> consultations = consultationService.getAllConsultations();
        // TODO: Return DTOs, potentially filtered based on role
        return ResponseEntity.ok(consultations);
    }

    // PUT /{id} might not be needed if POST handles updates based on ID presence.
    // If kept, it should specifically handle updates.
    // @PutMapping("/{id}")
    // @PreAuthorize("hasRole('DOCTOR')")
    // public ResponseEntity<Consultation> updateConsultation(@PathVariable Long id, @RequestBody Consultation consultation) {
    //     Consultation updated = consultationService.updateConsultation(id, consultation);
    //     return ResponseEntity.ok(updated);
    // }

}
