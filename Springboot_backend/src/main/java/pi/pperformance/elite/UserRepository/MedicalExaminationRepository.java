package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.MedicalExamination;

import java.util.List;

@Repository
public interface MedicalExaminationRepository extends JpaRepository<MedicalExamination, Long> {

    // Find examinations by patient ID (needs join through Consultation)
    // We might need a custom query or fetch this via Consultation entity later
    // List<MedicalExamination> findByConsultationPatientIdPatient(Long patientId); // Example, might need adjustment

    // Add other custom query methods if needed later
}
