package pi.pperformance.elite.UserController;

// Removed Lombok import
import org.springframework.beans.factory.annotation.Autowired; // Import Autowired
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile; // Added import
import org.springframework.security.core.Authentication; // Added import
import org.springframework.security.core.context.SecurityContextHolder; // Added import
import org.springframework.security.core.userdetails.UserDetails; // Added import
import pi.pperformance.elite.UserServices.IMedicalExaminationService;
import pi.pperformance.elite.entities.*;
import pi.pperformance.elite.dto.MedicalExaminationInputDTO;
import pi.pperformance.elite.dto.SaveReportRequestDTO;
import pi.pperformance.elite.dto.UpdateExaminationStatusRequestDTO; // Added import
import pi.pperformance.elite.dto.MedicalExaminationDTO; // Import the DTO
import pi.pperformance.elite.exceptions.ResourceNotFoundException;
import pi.pperformance.elite.UserRepository.UserRepository;
import pi.pperformance.elite.UserRepository.CentreDexamenRepository; // Import CentreDexamenRepository
import java.util.Optional; // Import Optional
// Import necessary DTO for print data later
// import pi.pperformance.elite.dto.ExamPrintDataDTO;

import java.io.IOException; // Added import
import java.util.List;

@RestController
@RequestMapping("/api/medical-examinations")
// Removed @AllArgsConstructor
public class MedicalExaminationController {

    private final IMedicalExaminationService medicalExaminationService;
    private final UserRepository userRepository; // Added repository
    private final CentreDexamenRepository centreDexamenRepository; // Added repository

    // Explicit constructor for dependency injection
    @Autowired
    public MedicalExaminationController(IMedicalExaminationService medicalExaminationService, UserRepository userRepository, CentreDexamenRepository centreDexamenRepository) { // Added CentreDexamenRepository
        this.medicalExaminationService = medicalExaminationService;
        this.userRepository = userRepository; // Initialize userRepository
        this.centreDexamenRepository = centreDexamenRepository; // Initialize CentreDexamenRepository
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
        if (examInput.getEtat() != null && !examInput.getEtat().trim().isEmpty()) {
            examination.setEtat(examInput.getEtat());
        }
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

    // Endpoint pour récupérer une demande d'examen par son ID (returns DTO)
    @GetMapping("/{examId}")
    @PreAuthorize("isAuthenticated()") // Adjust authorization as needed (e.g., DOCTOR or associated PATIENT)
    public ResponseEntity<MedicalExaminationDTO> getMedicalExaminationById(@PathVariable Long examId) {
        // TODO: Add more fine-grained authorization if necessary
        try {
            MedicalExamination exam = medicalExaminationService.getMedicalExaminationById(examId);
            MedicalExaminationDTO dto = convertToDTO(exam); // Convert to DTO
            return ResponseEntity.ok(dto);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            // Log unexpected errors
            System.err.println("Error fetching medical examination DTO for ID " + examId + ": " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Endpoint pour supprimer une demande d'examen (Médecin)
    @DeleteMapping("/{examId}")
    @PreAuthorize("hasRole('DOCTOR')") // Ensure only doctors can attempt deletion
    public ResponseEntity<Void> deleteMedicalExamination(@PathVariable Long examId) {
        // Authorization (is the current doctor the owner?) and status check ('en attente')
        // are handled within the service method.
        try {
            medicalExaminationService.deleteMedicalExamination(examId);
            return ResponseEntity.noContent().build(); // HTTP 204 No Content on success
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build(); // HTTP 404 Not Found
        } catch (IllegalStateException e) {
            // This catches status errors or authorization errors from the service
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build(); // HTTP 403 Forbidden
        } catch (Exception e) {
            // Log unexpected errors
            System.err.println("Error deleting medical examination " + examId + ": " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build(); // HTTP 500 Internal Server Error
        }
    }

    // Endpoint pour récupérer les examens créés par le médecin connecté (returns DTOs)
    @GetMapping("/doctor/me")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<List<MedicalExaminationDTO>> getMyDoctorExaminations() { // Return DTO list
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        User currentUser = userRepository.findByEmail(userDetails.getUsername()); // Assuming userRepository is injected

        if (currentUser == null || !(currentUser instanceof Doctor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build(); // Or handle appropriately
        }
        Doctor currentDoctor = (Doctor) currentUser;
        // Call the service method that now returns DTOs
        List<MedicalExaminationDTO> examDTOs = medicalExaminationService.getExaminationsByDoctor(currentDoctor.getId());
        return ResponseEntity.ok(examDTOs); // Return the list of DTOs
    }

    // Endpoint pour récupérer les examens "en attente" pour le centre du DOCTOR_CENTRE_EXAMEN connecté (returns DTOs)
    @GetMapping("/centre/pending")
    @PreAuthorize("hasRole('DOCTOR_CENTRE_EXAMEN')")
    public ResponseEntity<List<MedicalExaminationDTO>> getPendingCentreExaminations() { // Return DTO list
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        User currentUser = userRepository.findByEmail(userDetails.getUsername()); // Assuming userRepository is injected

        if (currentUser == null || !(currentUser instanceof DoctorCentreDexamen)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        DoctorCentreDexamen currentCentreDoctor = (DoctorCentreDexamen) currentUser;

        // Ensure the centre doctor is associated with a centre
        if (currentCentreDoctor.getCentreDexamen() == null || currentCentreDoctor.getCentreDexamen().getName() == null) {
             System.err.println("Error: DOCTOR_CENTRE_EXAMEN " + currentUser.getId() + " is not associated with a centre or centre name is null.");
             return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null); // Or handle differently
        }

        String centreName = currentCentreDoctor.getCentreDexamen().getName();
        // Call the service method that now returns DTOs
        List<MedicalExaminationDTO> examDTOs = medicalExaminationService.getExaminationsByCentreAndStatus(centreName, "en attente");
        return ResponseEntity.ok(examDTOs); // Return the list of DTOs
    } // Added missing closing brace here


    // Endpoint pour enregistrer le rapport (texte + fichiers) et marquer l'examen comme terminé (DOCTOR_CENTRE_EXAMEN)
    // Consumes multipart/form-data
    @PostMapping(value = "/{examId}/save-report", consumes = {"multipart/form-data"})
    @PreAuthorize("hasRole('DOCTOR_CENTRE_EXAMEN')")
    public ResponseEntity<MedicalExaminationDTO> saveReportAndUpdateStatus(
            @PathVariable Long examId,
            @RequestPart("reportContent") String reportContent, // Main text content
            @RequestPart(value = "files", required = false) List<MultipartFile> files) { // Attached files
        try {
            // Authorization and status checks are handled within the service method.
            MedicalExamination updatedExamEntity = medicalExaminationService.saveReportAndUpdateStatus(examId, reportContent, files);
            MedicalExaminationDTO updatedExamDTO = convertToDTO(updatedExamEntity); // Convert to DTO
            return ResponseEntity.ok(updatedExamDTO);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            // Catches status errors or authorization errors from the service
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (IOException e) {
            // Handle file processing errors
             System.err.println("Error processing attached files for medical examination " + examId + ": " + e.getMessage());
             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (Exception e) {
            // Log other unexpected errors
            System.err.println("Error saving report for medical examination " + examId + ": " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }


    // Endpoint pour mettre à jour le statut d'une demande d'examen (DOCTOR_CENTRE_EXAMEN)
    @PutMapping("/{examId}/status")
    @PreAuthorize("hasRole('DOCTOR_CENTRE_EXAMEN')")
    public ResponseEntity<MedicalExaminationDTO> updateExaminationStatus(
            @PathVariable Long examId,
            @RequestBody UpdateExaminationStatusRequestDTO statusRequest) {
        try {
            if (statusRequest == null || statusRequest.getNewStatus() == null || statusRequest.getNewStatus().trim().isEmpty()) {
                return ResponseEntity.badRequest().build(); // Or a more descriptive error
            }
            MedicalExamination updatedExamEntity = medicalExaminationService.updateExaminationStatus(examId, statusRequest.getNewStatus());
            // Convert entity to DTO before sending response
            MedicalExaminationDTO updatedExamDTO = convertToDTO(updatedExamEntity); // Assuming you have or will create this helper
            return ResponseEntity.ok(updatedExamDTO);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build(); // Or HttpStatus.CONFLICT if it's a state transition issue
        } catch (Exception e) {
            System.err.println("Error updating status for medical examination " + examId + ": " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Helper method to convert MedicalExamination entity to MedicalExaminationDTO
    // This can be moved to a dedicated mapper class if preferred
    private MedicalExaminationDTO convertToDTO(MedicalExamination exam) {
        if (exam == null) return null;
        MedicalExaminationDTO dto = new MedicalExaminationDTO();
        dto.setIdExam(exam.getIdExam());
        dto.setAct(exam.getAct());
        dto.setRecommandation(exam.getRecommandation());
        dto.setCreatedAt(exam.getCreatedAt());
        dto.setUpdatedAt(exam.getUpdatedAt());
        dto.setEtat(exam.getEtat());
        dto.setResultat(exam.getResultat());
        dto.setConsultationId(exam.getConsultationId());
        dto.setCentreName(exam.getCentreName()); // Keep the stored name as fallback

        // Fetch CentreDexamen details if centreName exists
        if (exam.getCentreName() != null && !exam.getCentreName().equalsIgnoreCase("Autre")) {
            Optional<CentreDexamen> centreOpt = centreDexamenRepository.findByName(exam.getCentreName());
            if (centreOpt.isPresent()) {
                CentreDexamen centre = centreOpt.get();
                dto.setCentreAddress(centre.getAdress()); // Corrected getter
                dto.setCentrePhone(centre.getTel());   // Corrected getter
                // Optionally overwrite centreName if the fetched one is more accurate, though they should match
                // dto.setCentreName(centre.getName()); 
            } else {
                 System.err.println("Warning: CentreDexamen not found in repository for name: " + exam.getCentreName());
                 // Keep address/phone null or empty in DTO if not found
            }
        }


        if (exam.getRendezVous() != null) {
            dto.setRendezVousId(exam.getRendezVous().getIdAppointment());
            if (exam.getRendezVous().getPatient() != null) {
                dto.setPatientId(exam.getRendezVous().getPatient().getId());
                dto.setPatientFirstName(exam.getRendezVous().getPatient().getFirstName());
                dto.setPatientLastName(exam.getRendezVous().getPatient().getLastName());
            }
        }
        if (exam.getDoctor() != null) {
            dto.setDoctorId(exam.getDoctor().getId());
            dto.setDoctorFirstName(exam.getDoctor().getFirstName());
            dto.setDoctorLastName(exam.getDoctor().getLastName());
        }
        return dto;
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

    // Endpoint pour télécharger le compte rendu final en PDF (DOCTOR_CENTRE_EXAMEN, Patient?)
    @GetMapping("/{examId}/report/download-pdf")
    @PreAuthorize("hasRole('DOCTOR_CENTRE_EXAMEN') or hasRole('PATIENT')") // Adjust authorization as needed
    public ResponseEntity<byte[]> downloadReportPdf(@PathVariable Long examId) {
        try {
            // TODO: Add fine-grained authorization if needed (e.g., patient can only download their own report)
            byte[] pdfBytes = medicalExaminationService.generateReportPdf(examId);

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "compte_rendu_" + examId + ".pdf");
            headers.setContentLength(pdfBytes.length);

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);

        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            // Handle cases like report not yet 'terminé'
            return ResponseEntity.status(HttpStatus.CONFLICT).body(null); // 409 Conflict
        } catch (com.lowagie.text.DocumentException | IOException e) {
            System.err.println("Error generating PDF report for exam ID " + examId + ": " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
}
