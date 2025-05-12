package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.Certificate;

import java.util.Optional;
import pi.pperformance.elite.entities.Patient;
import pi.pperformance.elite.entities.CabinetDr;

@Repository
public interface CertificateRepository extends JpaRepository<Certificate, Long> {
    // Find a certificate by the ID of its associated consultation's ID field (idConsultation)
    Optional<Certificate> findByConsultationIdConsultation(Long consultationId);

    long countByConsultation_PatientAndConsultation_Cabinet(Patient patient, CabinetDr cabinet);
}
