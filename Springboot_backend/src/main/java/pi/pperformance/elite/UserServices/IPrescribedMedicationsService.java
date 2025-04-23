package pi.pperformance.elite.UserServices;

import pi.pperformance.elite.entities.PrescribedMedications;
// Import DTOs if needed
import java.util.List;

public interface IPrescribedMedicationsService {

    /**
     * Retrieves all prescriptions associated with a specific patient.
     * Requires joining through Consultation.
     * @param patientId The ID of the patient.
     * @return A list of prescriptions for the patient, ordered by consultation date descending.
     */
    List<PrescribedMedications> getPrescriptionsByPatientId(Long patientId);

    /**
     * Updates the text of a specific prescription.
     * @param prescriptionId The ID of the prescription (PrescribedMedications) to update.
     * @param updatedText The new text for the prescription.
     * @return The updated PrescribedMedications entity.
     */
    PrescribedMedications updatePrescription(Long prescriptionId, String updatedText);

    // Add other methods as needed (e.g., getById)
}
