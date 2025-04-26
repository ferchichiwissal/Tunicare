package pi.pperformance.elite.UserServices;

// Removed Lombok import
import org.springframework.beans.factory.annotation.Autowired; // Import Autowired
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pi.pperformance.elite.UserRepository.CentreDexamenRepository;
import pi.pperformance.elite.UserRepository.UserRepository; // Added import
// import pi.pperformance.elite.UserRepository.ConsultationRepository; // No longer needed here for saving
import pi.pperformance.elite.UserRepository.MedicalExaminationRepository;
import pi.pperformance.elite.UserRepository.RendezVousRepository; // Added import
import pi.pperformance.elite.entities.*; // Import all entities for User, Doctor etc.
import pi.pperformance.elite.exceptions.ResourceNotFoundException;
// Removed import for non-existent UnauthorizedOperationException
// import pi.pperformance.elite.exceptions.UnauthorizedOperationException; // For security checks

// Imports for PDF Generation
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;


import java.util.Collections; // For empty list
import java.util.List;
import java.util.Optional; // Added import for Optional
import java.util.stream.Collectors;

import pi.pperformance.elite.dto.MedicalExaminationInputDTO; // Import DTO for update method

@Service
// Removed @AllArgsConstructor
public class MedicalExaminationService implements IMedicalExaminationService {

    private final MedicalExaminationRepository medicalExaminationRepository;
    // private final ConsultationRepository consultationRepository; // Removed
    private final CentreDexamenRepository centreDexamenRepository;
    private final RendezVousRepository rendezVousRepository; // Added
    private final UserRepository userRepository; // Added
    private final PdfGenerationService pdfGenerationService; // Added for PDF generation

    // Explicit constructor for dependency injection
    @Autowired
    public MedicalExaminationService(MedicalExaminationRepository medicalExaminationRepository,
                                     // ConsultationRepository consultationRepository, // Removed
                                     CentreDexamenRepository centreDexamenRepository,
                                     RendezVousRepository rendezVousRepository, // Added
                                     UserRepository userRepository, // Added
                                     PdfGenerationService pdfGenerationService) { // Added
        this.medicalExaminationRepository = medicalExaminationRepository;
        // this.consultationRepository = consultationRepository; // Removed
        this.centreDexamenRepository = centreDexamenRepository;
        this.rendezVousRepository = rendezVousRepository; // Added
        this.userRepository = userRepository; // Added
        this.pdfGenerationService = pdfGenerationService; // Added
    }

    @Override
    @Transactional
    // Added consultationId parameter (can be null)
    public MedicalExamination saveMedicalExamination(MedicalExamination examination, Long appointmentId, Long centreId, Long consultationId) {
        // 1. Find the associated RendezVous (Appointment)
        RendezVous rendezVous = rendezVousRepository.findById(appointmentId) // Use RendezVousRepository
                .orElseThrow(() -> new ResourceNotFoundException("RendezVous not found with id: " + appointmentId)); // Changed message
        examination.setRendezVous(rendezVous); // Use the correct setter

        // Patient is accessible via rendezVous.getPatient() if needed elsewhere
        // Removed setting patient directly on examination

        // 2. Set the (potentially null) consultationId
        examination.setConsultationId(consultationId); // Set the consultation ID (already correct)

        // 3. Get the currently authenticated Doctor
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            // Use IllegalStateException instead of custom exception
            throw new IllegalStateException("User must be authenticated to create an examination.");
        }
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        // Fetch user by email, handle null case
        User currentUser = userRepository.findByEmail(username);
        if (currentUser == null) {
            throw new ResourceNotFoundException("Authenticated user not found: " + username);
        }

        // Ensure the user is a Doctor
        if (!(currentUser instanceof Doctor)) {
             // Use IllegalStateException instead of custom exception
            throw new IllegalStateException("User creating the examination must be a Doctor.");
        }
        Doctor currentDoctor = (Doctor) currentUser;
        examination.setDoctor(currentDoctor); // Set the doctor who created the exam

        // 4. Find the associated CentreDexamen and set centreName
        if (centreId != null) {
            CentreDexamen centre = centreDexamenRepository.findById(centreId)
                    .orElseThrow(() -> new ResourceNotFoundException("Centre d'examen not found with id: " + centreId));
            examination.setCentreName(centre.getName()); // Set the name from the found centre
        } else {
            // Handle 'Autre' case if centreAutre name is provided in DTO (assuming DTO has centreAutre field)
            // If DTO has centreAutre: examination.setCentreName(examInput.getCentreAutre());
            // Otherwise, default to "Autre"
            examination.setCentreName("Autre"); // Set name to "Autre" if no specific centre ID
        }

        // 5. Save the examination
        // Creation/update dates are handled by @PrePersist/@PreUpdate in the entity
        return medicalExaminationRepository.save(examination);
    }

    // TODO: Refactor this method to fetch exams based on RendezVous or directly via Patient ID if needed
    @Override
    public List<MedicalExamination> getMedicalExaminationsByPatientId(Long patientId) {
         // Find all consultations for the patient using the correct repository method name
         // List<Consultation> consultations = consultationRepository.findByPatient_IdOrderByDateConsultationDesc(patientId); // Corrected method name
         //
         // if (consultations.isEmpty()) {
         //     return Collections.emptyList();
         // }
         //
         // // Extract all medical examinations from these consultations
         // // This relies on the OneToMany relationship being fetched correctly (LAZY by default)
         // // Consider EAGER fetch or a dedicated query if performance becomes an issue.
         // return consultations.stream()
         //         .flatMap(consultation -> consultation.getMedicalExaminations().stream()) // This needs update based on new relationship
         //         .collect(Collectors.toList());
         //
         // // Alternative using a custom query in MedicalExaminationRepository (more efficient):
         // // return medicalExaminationRepository.findByRendezVousPatientId(patientId); // Example
         // // Requires defining this method in the repository interface.

         // Returning empty list for now to avoid compilation errors until refactored
         System.out.println("WARN: getMedicalExaminationsByPatientId needs refactoring due to entity changes.");
         return Collections.emptyList();
    }

    @Override
    public List<MedicalExamination> getPatientExaminationsByCabinet(Long patientId, Long cabinetId) {
        // Delegate to the repository to find examinations linked to a patient via RendezVous
        // and filtered by the site ID (cabinet ID) directly on the RendezVous.
        // Use the method with the corrected @Query annotation
        return medicalExaminationRepository.findExaminationsByPatientAndSite(patientId, cabinetId);
    }

    @Override
    @Transactional(readOnly = true) // Read-only transaction for fetching data
    public byte[] generateExaminationPdf(Long examId) throws DocumentException, IOException {
        MedicalExamination exam = medicalExaminationRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical Examination not found with id: " + examId));

        // Fetch related data - Ensure relationships are loaded (consider EAGER fetch or join fetch query if needed)
        RendezVous rendezVous = exam.getRendezVous();
        if (rendezVous == null) {
            throw new IllegalStateException("Examination " + examId + " is not linked to an appointment (RendezVous).");
        }
        Patient patient = rendezVous.getPatient();
        Doctor doctor = exam.getDoctor(); // Doctor who created the exam request
        CabinetDr cabinet = rendezVous.getCabinet(); // Corrected: Use getCabinet()

        if (patient == null || doctor == null || cabinet == null) {
            throw new IllegalStateException("Missing Patient, Doctor, or Cabinet information for Examination ID: " + examId);
        }

        // --- PDF Generation Logic (Adapted from PdfGenerationService) ---
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        // Explicitly qualify Document to avoid ambiguity
        com.lowagie.text.Document document = new com.lowagie.text.Document(PageSize.A4);
        PdfWriter writer = PdfWriter.getInstance(document, baos);

        document.open();

        // --- Header ---
        Paragraph header = new Paragraph("Dr. " + doctor.getFirstName() + " " + doctor.getLastName());
        header.setAlignment(Element.ALIGN_LEFT);
        document.add(header);
        document.add(new Paragraph(cabinet.getAddress() != null ? cabinet.getAddress() : "Adresse non spécifiée"));
        document.add(new Paragraph("Tél: " + (cabinet.getTel() != null ? cabinet.getTel() : "N/A")));
        document.add(Chunk.NEWLINE);

        // --- Title ---
        Paragraph title = new Paragraph("Demande d'Examen Médical", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16));
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);
        document.add(Chunk.NEWLINE);

        // --- Patient Info ---
        document.add(new Paragraph("Patient: " + patient.getFirstName() + " " + patient.getLastName()));
        if (patient.getBirthDate() != null) {
            document.add(new Paragraph("Date de Naissance: " + patient.getBirthDate().format(DateTimeFormatter.ISO_DATE)));
            document.add(new Paragraph("Âge: " + calculateAge(patient.getBirthDate()) + " ans"));
        } else {
            document.add(new Paragraph("Date de Naissance: Non spécifiée"));
            document.add(new Paragraph("Âge: Non spécifié"));
        }
        // Use exam creation date as the request date - Corrected Date to LocalDate conversion
        String createdAtFormatted = "N/A";
        if (exam.getCreatedAt() != null) {
            LocalDate createdAtLocalDate = exam.getCreatedAt().toInstant()
                                               .atZone(ZoneId.systemDefault())
                                               .toLocalDate();
            createdAtFormatted = createdAtLocalDate.format(DateTimeFormatter.ISO_DATE);
        }
        document.add(new Paragraph("Date de la demande: " + createdAtFormatted));
        document.add(Chunk.NEWLINE);

        // --- Examination Details ---
        document.add(new Paragraph("Examen demandé:", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
        document.add(new Paragraph(exam.getAct() != null ? exam.getAct() : "Non spécifié"));
        document.add(Chunk.NEWLINE);

        document.add(new Paragraph("Centre d'examen:", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
        document.add(new Paragraph(exam.getCentreName() != null ? exam.getCentreName() : "Non spécifié"));
        document.add(Chunk.NEWLINE);

        if (exam.getRecommandation() != null && !exam.getRecommandation().trim().isEmpty()) {
            document.add(new Paragraph("Recommandation:", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
            // Clean HTML tags from recommendation
            String cleanedRecommandation = exam.getRecommandation()
                                               .replaceAll("(?i)<p>", "") // Remove <p> tags (case-insensitive)
                                               .replaceAll("(?i)</p>", "\n") // Replace </p> with newline (case-insensitive)
                                               .trim();
            document.add(new Paragraph(cleanedRecommandation));
            document.add(Chunk.NEWLINE);
        }
        document.add(Chunk.NEWLINE); // Extra space before signature

        // --- Signature ---
        Paragraph signatureLabel = new Paragraph("Signature du Médecin");
        signatureLabel.setAlignment(Element.ALIGN_RIGHT);
        document.add(signatureLabel);
        document.add(Chunk.NEWLINE);

        String signaturePath = cabinet.getSignatureImagePath();
        if (signaturePath != null && !signaturePath.trim().isEmpty()) {
            java.nio.file.Path path = Paths.get(signaturePath);
            if (Files.exists(path) && Files.isReadable(path)) {
                try {
                    Image signatureImage = Image.getInstance(signaturePath);
                    signatureImage.scaleToFit(150, 75);
                    signatureImage.setAlignment(Element.ALIGN_RIGHT);
                    document.add(signatureImage);
                } catch (BadElementException | MalformedURLException e) {
                    System.err.println("Erreur chargement image signature (examen PDF): " + signaturePath + " - " + e.getMessage());
                    document.add(new Paragraph("[Erreur: Image signature invalide]", FontFactory.getFont(FontFactory.HELVETICA, 8, Font.ITALIC)));
                } catch (IOException e) {
                     System.err.println("Erreur I/O image signature (examen PDF): " + signaturePath + " - " + e.getMessage());
                    document.add(new Paragraph("[Erreur: Lecture image signature impossible]", FontFactory.getFont(FontFactory.HELVETICA, 8, Font.ITALIC)));
                }
            } else {
                 System.err.println("Fichier signature non trouvé/lisible (examen PDF): " + signaturePath);
                document.add(new Paragraph("[Erreur: Fichier signature non trouvé]", FontFactory.getFont(FontFactory.HELVETICA, 8, Font.ITALIC)));
            }
        } else {
            document.add(new Paragraph("[Signature non configurée]", FontFactory.getFont(FontFactory.HELVETICA, 8, Font.ITALIC)));
        }

        // --- Footer ---
        // Consider using PdfPageEventHelper for consistent footer placement
        // Paragraph footer = new Paragraph("Contact: Tel: " + cabinet.getTel() + " | Email: " + doctor.getEmail());
        // footer.setAlignment(Element.ALIGN_CENTER);
        // document.add(footer); // This won't place it at the absolute bottom

        document.close();
        writer.close();

        return baos.toByteArray();
    }

    // Helper method to calculate age (copied from PdfGenerationService)
    private int calculateAge(LocalDate birthLocalDate) {
        if (birthLocalDate == null) {
            return 0;
        }
        return Period.between(birthLocalDate, LocalDate.now()).getYears();
    }

    @Override
    @Transactional
    public MedicalExamination updateMedicalExamination(Long examId, MedicalExaminationInputDTO examInput) {
        // 1. Find the existing examination
        MedicalExamination existingExam = medicalExaminationRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical Examination not found with id: " + examId));

        // 2. Update fields from DTO
        existingExam.setAct(examInput.getTypeExamen());
        existingExam.setRecommandation(examInput.getRecommandation());

        // 3. Update Centre information
        Long centreId = examInput.getCentreId();
        if (centreId != null) {
            CentreDexamen centre = centreDexamenRepository.findById(centreId)
                    .orElseThrow(() -> new ResourceNotFoundException("Centre d'examen not found with id: " + centreId));
            existingExam.setCentreName(centre.getName()); // Update the name
        } else {
            // Handle 'Autre' case - assuming 'Autre' means no specific centre is linked
            existingExam.setCentreName("Autre");
        }

        // 4. Update associated RendezVous and Consultation if provided and different (Optional - depends on requirements)
        // For now, we assume these don't change during an exam update.
        // If appointmentId or consultationId in DTO are different, handle logic here.
        // Example:
        // if (examInput.getAppointmentId() != null && !examInput.getAppointmentId().equals(existingExam.getRendezVous().getId())) {
        //     RendezVous newRendezVous = rendezVousRepository.findById(examInput.getAppointmentId())
        //             .orElseThrow(() -> new ResourceNotFoundException("New RendezVous not found with id: " + examInput.getAppointmentId()));
        //     existingExam.setRendezVous(newRendezVous);
        // }
        // if (examInput.getConsultationId() != null && !examInput.getConsultationId().equals(existingExam.getConsultationId())) {
        //     existingExam.setConsultationId(examInput.getConsultationId());
        // }


        // 5. Save the updated examination
        // The @PreUpdate annotation in the entity should handle the updatedAt timestamp automatically
        return medicalExaminationRepository.save(existingExam);
    }
} // Added missing closing brace for the class
