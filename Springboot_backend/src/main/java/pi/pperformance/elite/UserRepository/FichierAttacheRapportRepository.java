package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.FichierAttacheRapport;

import java.util.List;

@Repository
public interface FichierAttacheRapportRepository extends JpaRepository<FichierAttacheRapport, Long> {
    List<FichierAttacheRapport> findByMedicalExaminationIdExam(Long medicalExaminationId);
}
