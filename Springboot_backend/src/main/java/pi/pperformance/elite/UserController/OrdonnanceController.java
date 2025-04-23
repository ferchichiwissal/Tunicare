package pi.pperformance.elite.UserController;

// Removed Lombok import
import org.springframework.beans.factory.annotation.Autowired; // Import Autowired
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pi.pperformance.elite.UserServices.IPrescribedMedicationsService;
import pi.pperformance.elite.UserServices.IConsultationService; // Needed for print data
import pi.pperformance.elite.entities.PrescribedMedications;
import pi.pperformance.elite.entities.Consultation; // Needed for print data
import pi.pperformance.elite.dto.ConsultationDTO; // Import the DTO
import pi.pperformance.elite.dto.PrescriptionUpdateDTO; // DTO for updating text
// Import necessary DTO for print data later
// import pi.pperformance.elite.dto.OrdonnancePrintDataDTO;


import java.util.List;

@RestController
@RequestMapping("/api/ordonnances")
// Removed @AllArgsConstructor
public class OrdonnanceController {

    private final IPrescribedMedicationsService prescribedMedicationsService;
    private final IConsultationService consultationService;

    // Explicit constructor for dependency injection
    @Autowired
    public OrdonnanceController(IPrescribedMedicationsService prescribedMedicationsService, IConsultationService consultationService) {
        this.prescribedMedicationsService = prescribedMedicationsService;
        this.consultationService = consultationService;
    }

    // Endpoint pour récupérer toutes les ordonnances d'un patient (Médecin)
    // Utilisé dans /ordonnance/edit
    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<List<PrescribedMedications>> getPrescriptionsByPatient(@PathVariable Long patientId) {
        List<PrescribedMedications> prescriptions = prescribedMedicationsService.getPrescriptionsByPatientId(patientId);
        // TODO: Return DTOs instead of raw entities, maybe include consultation date?
        return ResponseEntity.ok(prescriptions);
    }

    // Endpoint pour mettre à jour le texte d'une ordonnance spécifique (Médecin)
    // Utilisé dans /ordonnance/edit
    @PutMapping("/{prescriptionId}")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<PrescribedMedications> updatePrescription(
            @PathVariable Long prescriptionId,
            @RequestBody PrescriptionUpdateDTO updateDTO) {
        PrescribedMedications updatedPrescription = prescribedMedicationsService.updatePrescription(
                prescriptionId,
                updateDTO.getPrescriptionText()
        );
        // TODO: Return DTO
        return ResponseEntity.ok(updatedPrescription);
    }

    // Endpoint pour récupérer les données nécessaires à l'impression d'une ordonnance (Médecin)
    // Le frontend utilisera ces données pour générer le PDF
    // Note: This might be better placed in ConsultationController if printing is always from the consultation context
    // Or it could fetch based on prescriptionId if needed independently. Let's assume it's linked to a consultation.
    @GetMapping("/consultation/{consultationId}/print-data")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<?> getOrdonnancePrintData(@PathVariable Long consultationId) {
        // 1. Fetch the Consultation DTO by ID
        ConsultationDTO consultation = consultationService.getConsultationById(consultationId); // Changed type to DTO
        // Assuming ConsultationDTO has a method like getPrescriptionText() or similar
        // Adjust this check based on the actual DTO structure
        if (consultation == null /* || check if prescription text is null/empty in DTO */ ) {
            // TODO: Refine this check based on ConsultationDTO structure
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Consultation or associated prescription not found.");
        }

        // 2. Fetch related data (Patient name, Doctor name)
        // String patientName = consultation.getPatient().getFirstName() + " " + consultation.getPatient().getLastName();
        // String doctorName = "Dr. " + consultation.getDoctor().getLastName(); // Assuming Consultation links to Doctor User

        // 3. Create and return a DTO
        // OrdonnancePrintDataDTO printData = new OrdonnancePrintDataDTO(
        //     doctorName,
        //     patientName,
        //     consultation.getDateConsultation(),
        //     consultation.getPrescribedMedications().getPrescribedMedications() // The prescription text
        // );
        // return ResponseEntity.ok(printData);

         // Placeholder implementation until service method and DTO are created:
         return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body("Print data endpoint requires Consultation link to Doctor and OrdonnancePrintDataDTO.");
    }

}
