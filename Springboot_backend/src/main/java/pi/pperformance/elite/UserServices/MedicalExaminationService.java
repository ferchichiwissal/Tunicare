package pi.pperformance.elite.UserServices;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.hibernate.Hibernate; // Import Hibernate
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pi.pperformance.elite.UserRepository.CentreDexamenRepository;
import pi.pperformance.elite.UserRepository.*; // Import all repositories
import pi.pperformance.elite.entities.*;
import pi.pperformance.elite.exceptions.ResourceNotFoundException;
import org.springframework.web.multipart.MultipartFile; // Added import

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

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import pi.pperformance.elite.dto.MedicalExaminationInputDTO;
import pi.pperformance.elite.dto.MedicalExaminationDTO;
import pi.pperformance.elite.dto.ExaminationResultDTO; // Import new DTO

@Service
public class MedicalExaminationService implements IMedicalExaminationService {

    private static final Logger log = LoggerFactory.getLogger(MedicalExaminationService.class);

    private final MedicalExaminationRepository medicalExaminationRepository;
    private final CentreDexamenRepository centreDexamenRepository;
    private final RendezVousRepository rendezVousRepository;
    private final UserRepository userRepository;
    private final PdfGenerationService pdfGenerationService;
    private final FichierAttacheRapportRepository fichierAttacheRapportRepository; // Added repository

    @Autowired
    public MedicalExaminationService(MedicalExaminationRepository medicalExaminationRepository,
                                     CentreDexamenRepository centreDexamenRepository,
                                     RendezVousRepository rendezVousRepository,
                                     UserRepository userRepository,
                                     PdfGenerationService pdfGenerationService,
                                     FichierAttacheRapportRepository fichierAttacheRapportRepository) { // Added repository
        this.medicalExaminationRepository = medicalExaminationRepository;
        this.centreDexamenRepository = centreDexamenRepository;
        this.rendezVousRepository = rendezVousRepository;
        this.userRepository = userRepository;
        this.pdfGenerationService = pdfGenerationService;
        this.fichierAttacheRapportRepository = fichierAttacheRapportRepository; // Initialize repository
    }

    @Override
    @Transactional
    public MedicalExamination saveMedicalExamination(MedicalExamination examination, Long appointmentId, Long centreId, Long consultationId) {
        RendezVous rendezVous = rendezVousRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("RendezVous not found with id: " + appointmentId));
        examination.setRendezVous(rendezVous);
        examination.setConsultationId(consultationId);

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("User must be authenticated to create an examination.");
        }
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        User currentUser = userRepository.findByEmail(username);
        if (currentUser == null) {
            throw new ResourceNotFoundException("Authenticated user not found: " + username);
        }
        if (!(currentUser instanceof Doctor)) {
            throw new IllegalStateException("User creating the examination must be a Doctor.");
        }
        Doctor currentDoctor = (Doctor) currentUser;
        examination.setDoctor(currentDoctor);

        if (centreId != null) {
            CentreDexamen centre = centreDexamenRepository.findById(centreId)
                    .orElseThrow(() -> new ResourceNotFoundException("Centre d'examen not found with id: " + centreId));
            examination.setCentreName(centre.getName());
        } else {
            examination.setCentreName("Autre");
        }
        return medicalExaminationRepository.save(examination);
    }

    @Override
    public List<MedicalExamination> getMedicalExaminationsByPatientId(Long patientId) {
        System.out.println("WARN: getMedicalExaminationsByPatientId needs refactoring due to entity changes.");
        return Collections.emptyList();
    }

    @Override
    public List<MedicalExamination> getPatientExaminationsByCabinet(Long patientId, Long cabinetId) {
        return medicalExaminationRepository.findExaminationsByPatientAndSite(patientId, cabinetId);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generateExaminationPdf(Long examId) throws DocumentException, IOException {
        MedicalExamination exam = medicalExaminationRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical Examination not found with id: " + examId));
        RendezVous rendezVous = exam.getRendezVous();
        if (rendezVous == null) {
            throw new IllegalStateException("Examination " + examId + " is not linked to an appointment (RendezVous).");
        }
        Patient patient = rendezVous.getPatient();
        Doctor doctor = exam.getDoctor();
        CabinetDr cabinet = rendezVous.getCabinet();

        if (patient == null || doctor == null || cabinet == null) {
            throw new IllegalStateException("Missing Patient, Doctor, or Cabinet information for Examination ID: " + examId);
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        com.lowagie.text.Document document = new com.lowagie.text.Document(PageSize.A4);
        PdfWriter writer = PdfWriter.getInstance(document, baos);
        document.open();

        // Header
        Paragraph header = new Paragraph("Dr. " + doctor.getFirstName() + " " + doctor.getLastName());
        header.setAlignment(Element.ALIGN_LEFT);
        document.add(header);
        document.add(new Paragraph(cabinet.getAddress() != null ? cabinet.getAddress() : "Adresse non spécifiée"));
        document.add(new Paragraph("Tél: " + (cabinet.getTel() != null ? cabinet.getTel() : "N/A")));
        document.add(Chunk.NEWLINE);

        // Title
        Paragraph title = new Paragraph("Demande d'Examen Médical", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16));
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);
        document.add(Chunk.NEWLINE);

        // Patient Info
        document.add(new Paragraph("Patient: " + patient.getFirstName() + " " + patient.getLastName()));
        if (patient.getBirthDate() != null) {
            document.add(new Paragraph("Date de Naissance: " + patient.getBirthDate().format(DateTimeFormatter.ISO_DATE)));
            document.add(new Paragraph("Âge: " + calculateAge(patient.getBirthDate()) + " ans"));
        } else {
            document.add(new Paragraph("Date de Naissance: Non spécifiée"));
            document.add(new Paragraph("Âge: Non spécifié"));
        }
        String createdAtFormatted = "N/A";
        if (exam.getCreatedAt() != null) {
            LocalDate createdAtLocalDate = exam.getCreatedAt().toInstant()
                                               .atZone(ZoneId.systemDefault())
                                               .toLocalDate();
            createdAtFormatted = createdAtLocalDate.format(DateTimeFormatter.ISO_DATE);
        }
        document.add(new Paragraph("Date de la demande: " + createdAtFormatted));
        document.add(Chunk.NEWLINE);

        // Examination Details
        document.add(new Paragraph("Examen demandé:", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
        document.add(new Paragraph(exam.getAct() != null ? exam.getAct() : "Non spécifié"));
        document.add(Chunk.NEWLINE);
        document.add(new Paragraph("Centre d'examen:", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
        document.add(new Paragraph(exam.getCentreName() != null ? exam.getCentreName() : "Non spécifié"));
        document.add(Chunk.NEWLINE);
        if (exam.getRecommandation() != null && !exam.getRecommandation().trim().isEmpty()) {
            document.add(new Paragraph("Recommandation:", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
            String cleanedRecommandation = exam.getRecommandation()
                                               .replaceAll("(?i)<p>", "")
                                               .replaceAll("(?i)</p>", "\n")
                                               .trim();
            document.add(new Paragraph(cleanedRecommandation));
            document.add(Chunk.NEWLINE);
        }
        document.add(Chunk.NEWLINE);

        // Signature
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

        document.close();
        writer.close();
        return baos.toByteArray();
    }

    private int calculateAge(LocalDate birthLocalDate) {
        if (birthLocalDate == null) {
            return 0;
        }
        return Period.between(birthLocalDate, LocalDate.now()).getYears();
    }

    @Override
    @Transactional
    public MedicalExamination updateMedicalExamination(Long examId, MedicalExaminationInputDTO examInput) {
        MedicalExamination existingExam = medicalExaminationRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical Examination not found with id: " + examId));
        existingExam.setAct(examInput.getTypeExamen());
        existingExam.setRecommandation(examInput.getRecommandation());
        Long centreId = examInput.getCentreId();
        if (centreId != null) {
            CentreDexamen centre = centreDexamenRepository.findById(centreId)
                    .orElseThrow(() -> new ResourceNotFoundException("Centre d'examen not found with id: " + centreId));
            existingExam.setCentreName(centre.getName());
        } else {
            existingExam.setCentreName("Autre");
        }
        if (examInput.getEtat() != null && !examInput.getEtat().trim().isEmpty()) {
            existingExam.setEtat(examInput.getEtat());
        }
        return medicalExaminationRepository.save(existingExam);
    }

    @Override
    @Transactional(readOnly = true)
    public MedicalExamination getMedicalExaminationById(Long examId) {
        return medicalExaminationRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical Examination not found with id: " + examId));
    }

    @Override
    @Transactional
    public void deleteMedicalExamination(Long examId) {
        MedicalExamination exam = getMedicalExaminationById(examId);
        if (!"en attente".equalsIgnoreCase(exam.getEtat())) {
            throw new IllegalStateException("Cannot delete examination with status: " + exam.getEtat());
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("User must be authenticated to delete an examination.");
        }
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        User currentUser = userRepository.findByEmail(username);
        if (currentUser == null) {
            throw new ResourceNotFoundException("Authenticated user not found: " + username);
        }
        if (!(currentUser instanceof Doctor)) {
            throw new IllegalStateException("User deleting the examination must be a Doctor.");
        }
        Doctor currentDoctor = (Doctor) currentUser;
        if (exam.getDoctor() == null || !exam.getDoctor().getId().equals(currentDoctor.getId())) {
            throw new IllegalStateException("Doctor is not authorized to delete this examination request.");
        }
        medicalExaminationRepository.delete(exam);
    }

    private MedicalExaminationDTO mapToDTO(MedicalExamination exam) {
        MedicalExaminationDTO dto = new MedicalExaminationDTO();
        dto.setIdExam(exam.getIdExam());
        dto.setAct(exam.getAct());
        dto.setRecommandation(exam.getRecommandation());
        dto.setCreatedAt(exam.getCreatedAt());
        dto.setUpdatedAt(exam.getUpdatedAt());
        dto.setEtat(exam.getEtat());
        dto.setResultat(exam.getResultat());
        dto.setConsultationId(exam.getConsultationId());
        dto.setCentreName(exam.getCentreName());

        if (exam.getRendezVous() != null) {
            dto.setRendezVousId(exam.getRendezVous().getIdAppointment()); // Corrected getter
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

    @Override
    @Transactional(readOnly = true)
    public List<MedicalExaminationDTO> getExaminationsByDoctor(Long doctorId) {
        log.info("Fetching examinations for doctorId: {}", doctorId);
        List<MedicalExamination> exams = medicalExaminationRepository.findByDoctorId(doctorId);
        log.info("Found {} examinations in repository for doctorId: {}", exams.size(), doctorId);

        if (exams.isEmpty()) {
            return Collections.emptyList();
        }

        List<MedicalExaminationDTO> dtos = exams.stream()
                .map(exam -> {
                    try {
                        return mapToDTO(exam);
                    } catch (Exception e) {
                        log.error("Error mapping examination ID {} to DTO: {}", exam.getIdExam(), e.getMessage(), e);
                        return null;
                    }
                })
                .filter(dto -> dto != null)
                .collect(Collectors.toList());

        log.info("Successfully mapped {} examinations to DTOs for doctorId: {}", dtos.size(), doctorId);
        if (!dtos.isEmpty()) {
            log.debug("First mapped DTO details: {}", dtos.get(0));
        }
        return dtos;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicalExaminationDTO> getExaminationsByCentreAndStatus(String centreName, String etat) { // Return DTO list
        log.info("Fetching examinations for centre: {} with status: {}", centreName, etat);
        List<MedicalExamination> exams = medicalExaminationRepository.findByCentreNameAndEtat(centreName, etat);
        log.info("Found {} examinations in repository for centre: {} with status: {}", exams.size(), centreName, etat);

        if (exams.isEmpty()) {
            return Collections.emptyList();
        }

        List<MedicalExaminationDTO> dtos = exams.stream()
                .map(exam -> {
                    try {
                        return mapToDTO(exam); // Use the helper method
                    } catch (Exception e) {
                        log.error("Error mapping examination ID {} to DTO for centre {}: {}", exam.getIdExam(), centreName, e.getMessage(), e);
                        return null; // Skip problematic mappings
                    }
                })
                .filter(dto -> dto != null) // Filter out nulls
                .collect(Collectors.toList());

        log.info("Successfully mapped {} examinations to DTOs for centre: {} with status: {}", dtos.size(), centreName, etat);
        return dtos;
    }

    @Override
    @Transactional
    public MedicalExamination saveReportAndUpdateStatus(Long examId, String reportContent, List<MultipartFile> attachedFiles) throws IOException {
        MedicalExamination exam = getMedicalExaminationById(examId);

        // Authorization check (already present, seems correct)
        // Check status - allow saving report only if 'en attente' or maybe 'terminé' if re-saving?
        // For now, let's stick to the original logic: only save if 'en attente'. // Commenting out this check to allow updates on 'terminé' status
        // If you need to allow overwriting a 'terminé' report, adjust this logic.
        /* // Removing the status check to allow updates even if 'terminé'
        if (!"en attente".equalsIgnoreCase(exam.getEtat())) {
             log.warn("Attempting to save report for examination {} which is not 'en attente'. Status: {}", examId, exam.getEtat());
             // Depending on requirements, either throw an exception or allow overwriting.
             // For now, let's throw:
             throw new IllegalStateException("Cannot save report for examination that is not 'en attente'. Current status: " + exam.getEtat());
        }
        */

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("User must be authenticated to save a report.");
        }
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        User currentUser = userRepository.findByEmail(username);
        if (currentUser == null) {
            throw new ResourceNotFoundException("Authenticated user not found: " + username);
        }
        if (!(currentUser instanceof DoctorCentreDexamen)) {
            throw new IllegalStateException("User saving the report must be a DOCTOR_CENTRE_EXAMEN.");
        }
        DoctorCentreDexamen currentCentreDoctor = (DoctorCentreDexamen) currentUser;
        if (currentCentreDoctor.getCentreDexamen() == null ||
            !currentCentreDoctor.getCentreDexamen().getName().equalsIgnoreCase(exam.getCentreName())) {
            throw new IllegalStateException("User is not authorized to save reports for centre: " + exam.getCentreName());
        }

        // Save main report content
        exam.setResultat(reportContent); // Save HTML/text content
        exam.setDoctorCentreDexamen(currentCentreDoctor); // Explicitly link the doctor who saved the report
        
        // Only update status to 'terminé' if it's not already 'terminé'
        if (!"terminé".equalsIgnoreCase(exam.getEtat())) {
            exam.setEtat("terminé"); 
            log.info("Updating status of examination {} to 'terminé'", examId);
        } else {
             log.info("Examination {} status is already 'terminé', only updating report content.", examId);
        }


        // Process and save attached files (Handle updates: clear existing? Add new?)
        // Current logic adds files. If updating, maybe clear existing first?
        // For simplicity now, it just adds any new files provided.
        if (attachedFiles != null && !attachedFiles.isEmpty()) {
            for (MultipartFile file : attachedFiles) {
                if (file != null && !file.isEmpty()) {
                    String fileName = file.getOriginalFilename();
                    String contentType = file.getContentType();
                    byte[] fileContent = file.getBytes();

                    FichierAttacheRapport fichierAttache = new FichierAttacheRapport(fileName, contentType, fileContent, exam);
                    // Use the helper method to maintain bidirectional relationship
                    exam.addFichierAttache(fichierAttache);
                    log.info("Prepared attached file '{}' ({}) for examination {}", fileName, contentType, examId);
                }
            }
        }
        log.info("Before saving report for exam ID {}: doctorCentreDexamen ID is {}, centreName on doctor is {}",
            examId,
            (exam.getDoctorCentreDexamen() != null ? exam.getDoctorCentreDexamen().getId() : "null"),
            (exam.getDoctorCentreDexamen() != null && exam.getDoctorCentreDexamen().getCentreDexamen() != null ? exam.getDoctorCentreDexamen().getCentreDexamen().getName() : "null or centre not linked"));

        // Save the examination and its attached files (due to CascadeType.ALL)
        MedicalExamination savedExam = medicalExaminationRepository.save(exam);
        log.info("After saving report for exam ID {}: doctorCentreDexamen ID is {}, centreName on doctor is {}",
            savedExam.getIdExam(),
            (savedExam.getDoctorCentreDexamen() != null ? savedExam.getDoctorCentreDexamen().getId() : "null"),
            (savedExam.getDoctorCentreDexamen() != null && savedExam.getDoctorCentreDexamen().getCentreDexamen() != null ? savedExam.getDoctorCentreDexamen().getCentreDexamen().getName() : "null or centre not linked"));
        return savedExam;
    }


    @Override
    @Transactional
    public MedicalExamination updateExaminationStatus(Long examId, String newStatus) {
        MedicalExamination exam = getMedicalExaminationById(examId);

        // Authorization: Check if the current user is a DOCTOR_CENTRE_EXAMEN
        // and is associated with the examination's centre.
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("User must be authenticated to update examination status.");
        }
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        User currentUser = userRepository.findByEmail(username);
        if (currentUser == null) {
            throw new ResourceNotFoundException("Authenticated user not found: " + username);
        }

        if (!(currentUser instanceof DoctorCentreDexamen)) {
            throw new IllegalStateException("User updating the status must be a DOCTOR_CENTRE_EXAMEN.");
        }
        DoctorCentreDexamen currentCentreDoctor = (DoctorCentreDexamen) currentUser;

        // Check if the doctor is associated with the examination's centre
        // This assumes DoctorCentreDexamen has a getCentreDexamen() method
        // and MedicalExamination has a getCentreName() method.
        if (currentCentreDoctor.getCentreDexamen() == null ||
            !currentCentreDoctor.getCentreDexamen().getName().equalsIgnoreCase(exam.getCentreName())) {
            throw new IllegalStateException("User is not authorized to update status for examinations in centre: " + exam.getCentreName());
        }

        // Optionally, add logic to restrict which status transitions are allowed.
        // For example, can only go from "en attente" to "terminé".
        if (!"en attente".equalsIgnoreCase(exam.getEtat()) && "terminé".equalsIgnoreCase(newStatus)) {
             // Allow setting to "terminé" even if not "en attente" for this specific flow,
             // but generally, you might want more restrictions.
             // For now, we allow setting to "terminé" as per the request.
        } else if (!"en attente".equalsIgnoreCase(exam.getEtat())) {
            log.warn("Attempting to change status from {} to {} for examId {}. This might be an unintended transition.", exam.getEtat(), newStatus, examId);
            // throw new IllegalStateException("Examination status can only be changed from 'en attente'. Current status: " + exam.getEtat());
        }


        log.info("Updating status of examination {} from {} to {}", examId, exam.getEtat(), newStatus);
        exam.setEtat(newStatus);
        return medicalExaminationRepository.save(exam);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generateReportPdf(Long examId) throws com.lowagie.text.DocumentException, IOException { // Specify DocumentException
        MedicalExamination exam = medicalExaminationRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical Examination not found with id: " + examId));

        log.info("Generating report PDF for exam ID {}. Current state: Etat={}, Resultat Present={}",
            examId, exam.getEtat(), (exam.getResultat() != null && !exam.getResultat().isEmpty()));
        log.info("Exam ID {}: RendezVous ID is {}, Patient ID is {}, DoctorCentreDexamen ID is {}",
            examId,
            (exam.getRendezVous() != null ? exam.getRendezVous().getIdAppointment() : "null"),
            (exam.getRendezVous() != null && exam.getRendezVous().getPatient() != null ? exam.getRendezVous().getPatient().getId() : "null"),
            (exam.getDoctorCentreDexamen() != null ? exam.getDoctorCentreDexamen().getId() : "null"));

        if (exam.getDoctorCentreDexamen() != null) {
            log.info("Exam ID {}: DoctorCentreDexamen {} has Centre ID {}, Centre Name {}, Signature Path: {}",
                examId,
                exam.getDoctorCentreDexamen().getId(),
                (exam.getDoctorCentreDexamen().getCentreDexamen() != null ? exam.getDoctorCentreDexamen().getCentreDexamen().getIdCentre() : "null"),
                (exam.getDoctorCentreDexamen().getCentreDexamen() != null ? exam.getDoctorCentreDexamen().getCentreDexamen().getName() : "null"),
                exam.getDoctorCentreDexamen().getSignatureImagePath());
        }


        if (!"terminé".equalsIgnoreCase(exam.getEtat())) {
            throw new IllegalStateException("Cannot generate report PDF for examination that is not 'terminé'. Current status: " + exam.getEtat());
        }
        if (exam.getResultat() == null || exam.getResultat().trim().isEmpty()) {
             log.warn("Attempting to generate PDF report for examination {} with empty 'resultat' field.", examId);
             // Decide how to handle this: throw error or generate PDF with a note?
             // For now, let's generate a PDF indicating the main content is missing.
        }

        // Ensure all necessary entities are loaded, especially DoctorCentreDexamen and its relations
        // The MedicalExamination entity should have DoctorCentreDexamen eagerly fetched or fetched here.
        // If DoctorCentreDexamen is lazy, you might need to initialize it:
        if (exam.getRendezVous() != null) {
            Hibernate.initialize(exam.getRendezVous());
            if (exam.getRendezVous().getPatient() != null) {
                Hibernate.initialize(exam.getRendezVous().getPatient());
            }
        }
        if (exam.getDoctorCentreDexamen() != null) {
            Hibernate.initialize(exam.getDoctorCentreDexamen());
            if (exam.getDoctorCentreDexamen().getCentreDexamen() != null) {
                Hibernate.initialize(exam.getDoctorCentreDexamen().getCentreDexamen());
            }
        }
        // Delegate to the PdfGenerationService's new method
        return pdfGenerationService.generateExaminationResultPdf(exam);
    }

    @Override
    @Transactional(readOnly = true)
    public ExaminationResultDTO getExaminationResult(Long examinationId) {
        log.debug("Fetching examination result for ID: {}", examinationId);
        MedicalExamination exam = medicalExaminationRepository.findById(examinationId)
                .orElseThrow(() -> {
                    log.warn("Medical Examination not found with id: {}", examinationId);
                    return new ResourceNotFoundException("Medical Examination not found with id: " + examinationId);
                });

        RendezVous rendezVous = exam.getRendezVous();
        if (rendezVous == null) {
            log.error("Examination {} is not linked to an appointment (RendezVous).", examinationId);
            throw new IllegalStateException("Examination " + examinationId + " is not linked to an appointment (RendezVous).");
        }

        Patient patient = rendezVous.getPatient();
        if (patient == null) {
            log.error("Patient not found for RendezVous ID: {}", rendezVous.getIdAppointment());
            throw new IllegalStateException("Patient not found for RendezVous ID: " + rendezVous.getIdAppointment());
        }

        DoctorCentreDexamen doctorCentre = exam.getDoctorCentreDexamen();
        CentreDexamen centreDexamen = null;
        String doctorCentreExamenName = "N/A";

        if (doctorCentre != null) {
            doctorCentreExamenName = (doctorCentre.getFirstName() != null ? doctorCentre.getFirstName() : "") + " " + (doctorCentre.getLastName() != null ? doctorCentre.getLastName() : "");
            doctorCentreExamenName = doctorCentreExamenName.trim();
            if (doctorCentreExamenName.isEmpty()) doctorCentreExamenName = "N/A";
            centreDexamen = doctorCentre.getCentreDexamen();
            log.debug("Found DoctorCentreDexamen: {}, Centre: {}", doctorCentreExamenName, centreDexamen != null ? centreDexamen.getName() : "null");
        } else if (exam.getCentreName() != null && !exam.getCentreName().equalsIgnoreCase("Autre")) {
            log.debug("DoctorCentreDexamen not directly linked, attempting to find CentreDexamen by name: {}", exam.getCentreName());
            Optional<CentreDexamen> foundCentre = centreDexamenRepository.findByName(exam.getCentreName());
            if (foundCentre.isPresent()) {
                centreDexamen = foundCentre.get();
                log.debug("Found CentreDexamen by name: {}", centreDexamen.getName());
            } else {
                 log.warn("CentreDexamen named '{}' not found for exam ID {}", exam.getCentreName(), examinationId);
            }
        }


        String centreName = "N/A";
        String centreAddress = "N/A";
        String centrePhone = "N/A";

        if (centreDexamen != null) {
            centreName = centreDexamen.getName();
            centreAddress = centreDexamen.getAdress(); 
            centrePhone = centreDexamen.getTel();
        } else if (exam.getCentreName() != null && !exam.getCentreName().equalsIgnoreCase("Autre")) {
            centreName = exam.getCentreName();
        } else if (exam.getCentreName() != null && exam.getCentreName().equalsIgnoreCase("Autre") && exam.getDoctorCentreDexamen() == null) {
            centreName = "Autre";
        }
        log.debug("Final Centre Details - Name: {}, Address: {}, Phone: {}", centreName, centreAddress, centrePhone);


        LocalDate examDate = null;
        if (exam.getUpdatedAt() != null) { 
            examDate = exam.getUpdatedAt().toInstant()
                                       .atZone(ZoneId.systemDefault())
                                       .toLocalDate();
        } else if (exam.getCreatedAt() != null) {
             examDate = exam.getCreatedAt().toInstant()
                                       .atZone(ZoneId.systemDefault())
                                       .toLocalDate();
        }
        log.debug("Examination Date determined as: {}", examDate);


        ExaminationResultDTO resultDTO = new ExaminationResultDTO(
                (patient.getFirstName() != null ? patient.getFirstName() : "") + " " + (patient.getLastName() != null ? patient.getLastName() : "").trim(),
                doctorCentreExamenName,
                centreName,
                centreAddress,
                centrePhone,
                examDate,
                exam.getAct(), 
                exam.getResultat() 
        );
        log.info("Successfully created ExaminationResultDTO for exam ID: {}", examinationId);
        return resultDTO;
    }
}
