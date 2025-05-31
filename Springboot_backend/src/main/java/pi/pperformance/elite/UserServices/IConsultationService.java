package pi.pperformance.elite.UserServices;

import pi.pperformance.elite.entities.Consultation;
import pi.pperformance.elite.dto.ConsultationDTO; // Import the DTO
import java.util.List;

public interface IConsultationService {

    /**
     * Retrieves the consultation history for a specific patient.
     * @param patientId The ID of the patient.
     * @return A list of consultations, ordered by date descending.
     */
    List<Consultation> getConsultationHistoryByPatientId(Long patientId);

    /**
     * Saves a new consultation or updates an existing one, potentially including a prescription.
     * @param consultation The consultation entity to save (can have null ID for new).
     * @param patientId The ID of the patient associated with this consultation.
     * @param doctorId The ID of the doctor performing the consultation.
     * @param cabinetId The ID of the cabinet where the consultation took place.
     * @param prescriptionText The text of the prescription (optional).
     * @return The saved or updated consultation entity.
     */
    Consultation saveConsultation(Consultation consultation, Long patientId, Long doctorId, Long cabinetId, String prescriptionText);

    /**
     * Retrieves a single consultation by its ID as a DTO.
     * @param consultationId The ID of the consultation.
     * @return The ConsultationDTO, or throws ResourceNotFoundException if not found.
     */
    ConsultationDTO getConsultationById(Long consultationId);

    /**
     * Retrieves all consultations (potentially filtered for dashboard).
     * Needs clarification on filtering logic (e.g., by cabinet, doctor).
     * @return A list of all consultations.
     */
    List<Consultation> getAllConsultations(); // Consider adding filters

    /**
     * Updates an existing consultation.
     * @param consultationId The ID of the consultation to update.
     * @param updatedConsultation The consultation entity with updated data.
     * @return The updated consultation entity.
     */
    Consultation updateConsultation(Long consultationId, Consultation updatedConsultation);

    /**
     * Retrieves the consultation history for a specific doctor.
     * @param doctorId The ID of the doctor.
     * @return A list of consultations performed by the doctor, ordered by date descending.
     */
    List<Consultation> getConsultationsByDoctorId(Long doctorId);

/**
     * Retrieves consultations for a specific patient within a specific cabinet.
     * Used by the patient to view their consultations for the currently logged-in cabinet context.
     * @param patientId The ID of the patient.
     * @param cabinetId The ID of the cabinet.
     * @return A list of ConsultationDTOs for the patient in the specified cabinet, ordered by date descending.
     */
    List<ConsultationDTO> getPatientConsultationsByCabinet(Long patientId, Long cabinetId);

    /**
     * Retrieves a single consultation entity by its ID, ensuring related entities
     * needed for PDF generation (Patient, Cabinet, Prescription) are fetched.
     * @param consultationId The ID of the consultation.
     * @return The Consultation entity with necessary related data, or null/throws exception if not found.
     */
    Consultation getConsultationEntityById(Long consultationId);

    /**
     * Sets the visibility of a consultation for the patient.
     * @param consultationId The ID of the consultation.
     * @param patientId The ID of the patient (for verification).
     * @param isHidden True to hide, false to show.
     */
    void setConsultationVisibilityForPatient(Long consultationId, Long patientId, boolean isHidden);

    /**
     * Sets the visibility of a consultation for the doctor.
     * @param consultationId The ID of the consultation.
     * @param doctorId The ID of the doctor (for verification).
     * @param isHidden True to hide, false to show.
     */
    void setConsultationVisibilityForDoctor(Long consultationId, Long doctorId, boolean isHidden);

    // New method to delete consultations by patient ID
    void deleteConsultationsByPatientId(Long patientId);

    // Add other methods as needed
}
