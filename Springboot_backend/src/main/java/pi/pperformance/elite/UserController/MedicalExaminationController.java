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
        // Pass the correct IDs from the updated DTO
        MedicalExamination savedExam = medicalExaminationService.saveMedicalExamination(
                examination,
                examInput.getAppointmentId(), // Pass the actual appointmentId
                examInput.getCentreId(),
                examInput.getConsultationId() // Pass the actual consultationId
        );
        // TODO: Return DTO instead of raw entity
        return new ResponseEntity<>(savedExam, HttpStatus.CREATED);
    }

    // Endpoint pour mettre à jour une demande d'examen existante (Médecin)
    @PutMapping("/{examId}")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<MedicalExamination> updateMedicalExamination(
            @PathVariable Long examId,
            @RequestBody MedicalExaminationInputDTO examInput) {
        // TODO: Add authorization check: Ensure the doctor updating the exam is the one who created it or has appropriate permissions.
        MedicalExamination updatedExam = medicalExaminationService.updateMedicalExamination(examId, examInput);
        // TODO: Return DTO instead of raw entity
        return ResponseEntity.ok(updatedExam);
    }


    // Endpoint pour récupérer les examens d'un patient POUR UN CABINET SPECIFIQUE (Patient)
    // Utilisé dans /my-examinations
    @GetMapping("/my-examinations/{patientId}")
    @PreAuthorize("hasRole('PATIENT') and #patientId == principal.id") // Ensure patient can only access their own data
    public ResponseEntity<List<MedicalExamination>> getMyExaminationsForCabinet(
            @PathVariable Long patientId,
            @RequestParam Long cabinetId) { // Get cabinetId from query parameter
        // Call a new service method that filters by both patientId and cabinetId
        List<MedicalExamination> exams = medicalExaminationService.getPatientExaminationsByCabinet(patientId, cabinetId);
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

// Endpoint pour télécharger une demande d'examen en PDF (Patient)
    @GetMapping("/{examId}/download")
    @PreAuthorize("isAuthenticated()") // Basic auth check, fine-grained check done in method
    public ResponseEntity<byte[]> downloadExaminationPdf(@PathVariable Long examId) {
        try {
            // TODO: Add authorization check: Ensure the logged-in user is the patient associated with this examId.
            // This requires fetching the exam first, getting the patient ID, and comparing with principal.id.
            // Example (requires MedicalExaminationRepository injection or a service method):
            // MedicalExamination exam = medicalExaminationRepository.findById(examId).orElseThrow(...);
            // Long patientId = exam.getRendezVous().getPatient().getId();
            // Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            // Long principalId = ((CustomUserDetails) authentication.getPrincipal()).getId(); // Assuming CustomUserDetails has getId()
            // if (!principalId.equals(patientId)) {
            //     return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            // }

            byte[] pdfBytes = medicalExaminationService.generateExaminationPdf(examId);

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_PDF);
            // Suggest a filename for the download
            headers.setContentDispositionFormData("attachment", "demande_examen_" + examId + ".pdf");
            headers.setContentLength(pdfBytes.length);

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);

        } catch (pi.pperformance.elite.exceptions.ResourceNotFoundException e) {
            // Log the error if needed
            return ResponseEntity.notFound().build();
        } catch (com.lowagie.text.DocumentException | java.io.IOException e) {
            // Log the error
            System.err.println("Error generating PDF for exam ID " + examId + ": " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null); // Avoid sending stack trace
        } catch (IllegalStateException e) {
             // Handle cases where data is missing (e.g., no patient/doctor/cabinet)
             System.err.println("Error generating PDF due to missing data for exam ID " + examId + ": " + e.getMessage());
             return ResponseEntity.status(HttpStatus.CONFLICT).body(null); // 409 Conflict might be appropriate
        }
    }
}
