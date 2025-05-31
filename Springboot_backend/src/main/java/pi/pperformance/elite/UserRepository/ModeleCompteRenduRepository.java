package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.ModeleCompteRendu;
import pi.pperformance.elite.entities.CentreDexamen; // Import CentreDexamen

import java.util.List; // Import List

@Repository
public interface ModeleCompteRenduRepository extends JpaRepository<ModeleCompteRendu, Long> {
    // Basic CRUD methods are inherited from JpaRepository

    // Find all ModeleCompteRendu associated with a specific CentreDexamen
    List<ModeleCompteRendu> findByCentreDexamen(CentreDexamen centreDexamen);
}
