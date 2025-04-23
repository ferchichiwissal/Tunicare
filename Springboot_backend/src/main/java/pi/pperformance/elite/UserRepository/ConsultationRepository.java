package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.Consultation;

import java.util.List;

@Repository
public interface ConsultationRepository extends JpaRepository<Consultation, Long> {

    // Find consultations by patient ID, ordered by date descending (for history)
    List<Consultation> findByPatient_IdOrderByDateConsultationDesc(Long patientId);

    // Add other custom query methods if needed later
}
