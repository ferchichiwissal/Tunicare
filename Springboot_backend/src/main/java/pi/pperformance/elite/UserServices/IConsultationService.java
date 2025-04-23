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
     * Saves a new consultation, potentially including a prescription.
     * @param consultation The consultation entity to save.
     * @param patientId The ID of the patient associated with this consultation.
     * @param prescriptionText The text of the prescription (optional).
     * @return The saved consultation entity.
     */
    Consultation saveConsultation(Consultation consultation, Long patientId, String prescriptionText);

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

    // Add other methods as needed
}
