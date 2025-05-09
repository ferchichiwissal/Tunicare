package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.ModeleCompteRendu;

@Repository
public interface ModeleCompteRenduRepository extends JpaRepository<ModeleCompteRendu, Long> {
    // Basic CRUD methods are inherited from JpaRepository
    // Add custom query methods if needed later, e.g., findByNomModele
}
