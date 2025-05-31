package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.AdminCentreExamen;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdminCentreExamenRepository extends JpaRepository<AdminCentreExamen, Long> {

    // Find by email
    Optional<AdminCentreExamen> findByEmail(String email);

    // Find by isActive status
    List<AdminCentreExamen> findByIsActive(boolean isActive);

    // Find by Centre ID
    List<AdminCentreExamen> findByCentreDexamen_IdCentre(Long centreId);

    // Check existence by email and Centre ID
    boolean existsByEmailAndCentreDexamen_IdCentre(String email, Long centreId);
}
