package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.DoctorCentreDexamen;

import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorCentreDexamenRepository extends JpaRepository<DoctorCentreDexamen, Long> {

    // Find by email (inherited from User)
    Optional<DoctorCentreDexamen> findByEmail(String email);

    // Find all doctors associated with a specific CentreDexamen
    List<DoctorCentreDexamen> findByCentreDexamenIdCentre(Long centreId);

    // Check if a doctor exists with a specific email in a specific CentreDexamen
    boolean existsByEmailAndCentreDexamen_IdCentre(String email, Long centreId);

    // Find by active status
    List<DoctorCentreDexamen> findByIsActive(boolean isActive);

    // Add other custom query methods if needed

    // Nouvelle méthode pour compter le nombre de DoctorCentreDexamen par CentreDexamen
    long countByCentreDexamen_IdCentre(Long centreId);
}
