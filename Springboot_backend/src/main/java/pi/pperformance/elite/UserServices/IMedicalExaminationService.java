package pi.pperformance.elite.UserServices;

import pi.pperformance.elite.entities.MedicalExamination;
// Import DTOs if needed
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

    // Add other methods as needed (e.g., getById, update)
}
