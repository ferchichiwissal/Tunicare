package pi.pperformance.elite.UserServices;

import pi.pperformance.elite.entities.MedicalExamination;
import pi.pperformance.elite.dto.MedicalExaminationInputDTO;
import pi.pperformance.elite.dto.MedicalExaminationDTO;
import pi.pperformance.elite.dto.ExaminationResultDTO; // Import new DTO
import org.springframework.web.multipart.MultipartFile; // Added import
import pi.pperformance.elite.exceptions.ResourceNotFoundException; // Added import

import java.io.IOException; // Added import
import java.util.List;

public interface IMedicalExaminationService {

    /**
     * Saves a new medical examination.
     * Needs details on how it's linked (e.g., to a Consultation or directly to Patient/Cabinet).
     * The scenario implies linking via Consultation after redirection from /consultation/exam/new.
     * We might need consultationId, patientId, centreId, etc.
     * @param examination The examination entity to save.
     * @param appointmentId The ID of the RendezVous (appointment) this exam belongs to.
     * @param centreId The ID of the examination center (or null if 'Autre').
     * @param consultationId The ID of the associated Consultation (can be null).
     * @return The saved medical examination entity.
     */
    // Updated signature to include consultationId (can be null) and renamed consultationId param to appointmentId for clarity
    MedicalExamination saveMedicalExamination(MedicalExamination examination, Long appointmentId, Long centreId, Long consultationId);

    /**
     * Retrieves all medical examinations for a specific patient.
     * @param patientId The ID of the patient.
     * @return A list of medical examinations for the patient.
     */
    List<MedicalExamination> getMedicalExaminationsByPatientId(Long patientId);

    /**
     * Retrieves all medical examinations for a specific patient within a specific cabinet.
     * @param patientId The ID of the patient.
     * @param cabinetId The ID of the cabinet.
     * @return A list of medical examinations for the patient in the specified cabinet.
     */
    List<MedicalExamination> getPatientExaminationsByCabinet(Long patientId, Long cabinetId);

    // Add other methods as needed (e.g., getById, update)

    /**
     * Updates an existing medical examination.
     * @param examId The ID of the examination to update.
     * @param examInput The DTO containing the updated data.
     * @return The updated medical examination entity.
     * @throws pi.pperformance.elite.exceptions.ResourceNotFoundException if the examination is not found.
     */
    MedicalExamination updateMedicalExamination(Long examId, MedicalExaminationInputDTO examInput);

    byte[] generateExaminationPdf(Long examId) throws com.lowagie.text.DocumentException, java.io.IOException; // Added for PDF generation

    /**
     * Retrieves a medical examination by its ID.
     * @param examId The ID of the examination.
      * @return The medical examination entity, or null if not found.
      */
     MedicalExamination getMedicalExaminationById(Long examId);

    /**
     * Deletes a medical examination by its ID.
     * Should include checks for authorization and status ('en attente').
     * @param examId The ID of the examination to delete.
     */
    void deleteMedicalExamination(Long examId);

    /**
     * Retrieves all medical examinations created by a specific doctor.
     * @param doctorId The ID of the doctor.
     * @return A list of medical examination DTOs.
     */
    List<MedicalExaminationDTO> getExaminationsByDoctor(Long doctorId);

    /**
     * Retrieves all medical examinations for a specific centre with a specific status.
     * @param centreName The name of the examination centre.
      * @param etat The status to filter by (e.g., "en attente").
      * @return A list of matching medical examination DTOs.
      */
     List<MedicalExaminationDTO> getExaminationsByCentreAndStatus(String centreName, String etat);

    /**
     * Saves the report content and updates the status of a medical examination to 'terminé'.
     * Should include authorization checks (e.g., only the assigned DOCTOR_CENTRE_EXAMEN).
     * @param examId The ID of the examination to update.
     * @param reportContent The content of the main text report (e.g., HTML).
     * @param attachedFiles A list of attached files (PDFs, images, etc.).
     * @return The updated medical examination entity.
     * @throws ResourceNotFoundException if the examination is not found.
     * @throws IllegalStateException if the user is not authorized or the exam is not in the correct state.
     * @throws IOException if there is an error processing the attached files.
     */
    MedicalExamination saveReportAndUpdateStatus(Long examId, String reportContent, List<MultipartFile> attachedFiles) throws IOException;

    /**
     * Updates the status of a medical examination.
     * @param examId The ID of the examination to update.
     * @param newStatus The new status to set.
     * @return The updated medical examination entity.
     * @throws pi.pperformance.elite.exceptions.ResourceNotFoundException if the examination is not found.
     */
    MedicalExamination updateExaminationStatus(Long examId, String newStatus);

    /**
     * Generates a PDF representation of the final medical report.
     * @param examId The ID of the examination whose report is to be generated.
     * @return A byte array containing the generated PDF.
     * @throws ResourceNotFoundException if the examination is not found.
     * @throws com.lowagie.text.DocumentException if there is an error during PDF generation.
     * @throws IOException if there is an I/O error.
     */
    byte[] generateReportPdf(Long examId) throws com.lowagie.text.DocumentException, IOException;

    /**
     * Retrieves the detailed result of a medical examination.
     * @param examinationId The ID of the medical examination.
     * @return An ExaminationResultDTO containing the details.
     * @throws pi.pperformance.elite.exceptions.ResourceNotFoundException if the examination is not found.
     */
    ExaminationResultDTO getExaminationResult(Long examinationId);

    /**
     * Retrieves all medical examinations for a specific doctor centre and status.
     * @param doctorCentreDexamenId The ID of the doctor centre examen.
     * @param etat The status to filter by (e.g., "terminé").
     * @return A list of matching medical examination DTOs.
     */
    List<MedicalExaminationDTO> getExaminationsByDoctorCentreAndStatus(Long doctorCentreDexamenId, String etat);

    /**
     * Marks an examination as hidden for the prescribing doctor.
     * @param examId The ID of the examination.
     * @param requestingDoctorId The ID of the doctor requesting the hide action.
     * @throws ResourceNotFoundException if the examination or doctor is not found.
     * @throws IllegalStateException if the doctor is not authorized to hide this examination.
     */
    void hideExaminationForPrescribingDoctor(Long examId, Long requestingDoctorId);

    /**
     * Marks an examination as hidden for the reporting centre doctor.
     * @param examId The ID of the examination.
     * @param requestingCentreDoctorId The ID of the centre doctor requesting the hide action.
     * @throws ResourceNotFoundException if the examination or centre doctor is not found.
     * @throws IllegalStateException if the centre doctor is not authorized to hide this examination.
     */
    void hideExaminationForReportingCentreDoctor(Long examId, Long requestingCentreDoctorId);
/**
     * Sets the visibility of a medical examination for the patient.
     * @param examId The ID of the examination.
     * @param patientId The ID of the patient (for verification).
     * @param isHidden True to hide, false to show.
     * @throws ResourceNotFoundException if the examination is not found.
     * @throws SecurityException if the patient is not authorized.
     */
    void setExaminationVisibilityForPatient(Long examId, Long patientId, boolean isHidden);
}
