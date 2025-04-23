package pi.pperformance.elite.UserController;

// Removed Lombok import
import org.springframework.beans.factory.annotation.Autowired; // Import Autowired
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pi.pperformance.elite.UserServices.IMedicalExaminationService;
import pi.pperformance.elite.entities.MedicalExamination;
import pi.pperformance.elite.dto.MedicalExaminationInputDTO; // Assuming a DTO for input
// Import necessary DTO for print data later
// import pi.pperformance.elite.dto.ExamPrintDataDTO;

import java.util.List;

@RestController
@RequestMapping("/api/medical-examinations")
// Removed @AllArgsConstructor
public class MedicalExaminationController {

    private final IMedicalExaminationService medicalExaminationService;

    // Explicit constructor for dependency injection
    @Autowired
    public MedicalExaminationController(IMedicalExaminationService medicalExaminationService) {
        this.medicalExaminationService = medicalExaminationService;
    }

    // Endpoint pour enregistrer une nouvelle demande d'examen (Médecin)
    // Utilisé par le bouton OK dans /consultation/exam/new
    @PostMapping
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<MedicalExamination> createMedicalExamination(@RequestBody MedicalExaminationInputDTO examInput) {
        // Map DTO to Entity
        MedicalExamination examination = new MedicalExamination();
        examination.setAct(examInput.getTypeExamen()); // Assuming 'act' field stores the type
        examination.setRecommandation(examInput.getRecommandation());
        // We need consultationId from the context/path, assuming it's in DTO for now
        // Pass appointmentId (from DTO's consultationId field), centreId, and null for actual consultationId
        MedicalExamination savedExam = medicalExaminationService.saveMedicalExamination(
                examination,
                examInput.getConsultationId(), // This is the appointmentId
                examInput.getCentreId(),
                null // Pass null for consultationId as it's not available in the current DTO/frontend flow
        );
        // TODO: Return DTO instead of raw entity
        return new ResponseEntity<>(savedExam, HttpStatus.CREATED);
    }

    // Endpoint pour récupérer les examens d'un patient (Patient, Médecin, Assistant)
    // Utilisé dans /my-examinations
    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('PATIENT', 'DOCTOR', 'ASSISTANT')") // Adjust roles as needed
    public ResponseEntity<List<MedicalExamination>> getPatientExaminations(@PathVariable Long patientId) {
        // TODO: Add finer-grained security check (e.g., patient can only see their own)
        // This might involve checking principal.id against patientId
        List<MedicalExamination> exams = medicalExaminationService.getMedicalExaminationsByPatientId(patientId);
        // TODO: Return DTOs instead of raw entities
        return ResponseEntity.ok(exams);
    }

    // Endpoint pour récupérer les données nécessaires à l'impression d'une demande d'examen (Médecin)
    // Le frontend utilisera ces données pour générer le PDF
    @GetMapping("/{examId}/print-data")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<?> getExaminationPrintData(@PathVariable Long examId) {
        // 1. Fetch the MedicalExamination by ID using the service
        //    Need getMedicalExaminationById method in IMedicalExaminationService & implementation
        // MedicalExamination exam = medicalExaminationService.getMedicalExaminationById(examId);
        // if (exam == null) {
        //     return ResponseEntity.notFound().build();
        // }

        // 2. Fetch related data (Patient name, Doctor name, Centre name if linked)
        //    This requires relationships to be correctly defined and fetched.
        // String patientName = exam.getConsultation().getPatient().getFirstName() + " " + exam.getConsultation().getPatient().getLastName();
        // String doctorName = "Dr. " + exam.getConsultation().getDoctor().getLastName(); // Assuming Consultation links to Doctor User
        // String centreName = (exam.getCentreDexamen() != null) ? exam.getCentreDexamen().getName() : "Autre"; // Assuming link exists

        // 3. Create and return a DTO containing all necessary data
        // ExamPrintDataDTO printData = new ExamPrintDataDTO(
        //     doctorName,
        //     patientName,
        //     exam.getConsultation().getDateConsultation(), // Or exam creation date?
        //     exam.getAct(), // Type
        //     centreName,
        //     exam.getRecommandation()
        // );
        // return ResponseEntity.ok(printData);

        // Placeholder implementation until service method and DTO are created:
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body("Print data endpoint requires getMedicalExaminationById in service and ExamPrintDataDTO.");
    }

}
