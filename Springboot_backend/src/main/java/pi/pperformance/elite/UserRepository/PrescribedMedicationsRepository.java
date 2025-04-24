package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.PrescribedMedications;

import java.util.List;

@Repository
public interface PrescribedMedicationsRepository extends JpaRepository<PrescribedMedications, Long> {

    // Find prescriptions by patient ID (needs join through Consultation)
    // We might need a custom query or fetch this via Consultation entity later
    // List<PrescribedMedications> findByConsultationPatientIdPatientOrderByConsultationDateConsultationDesc(Long patientId); // Example

    // Add other custom query methods if needed later

    /**
     * Finds the prescription associated with a specific consultation ID.
     * Assumes a 'consultation' field exists in PrescribedMedications entity
     * linked via 'consultation_id'.
     * @param consultationId The ID of the consultation.
     * @return The PrescribedMedications entity, or null if not found.
     */
    PrescribedMedications findByConsultation_IdConsultation(Long consultationId);
}
