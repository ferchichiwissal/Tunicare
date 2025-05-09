package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.CentreDexamen;

import java.util.Optional; // Import Optional

@Repository
public interface CentreDexamenRepository extends JpaRepository<CentreDexamen, Long> {
    // Basic CRUD methods are inherited from JpaRepository

    // Find by name (assuming name is unique or we take the first match)
    Optional<CentreDexamen> findByName(String name);

    /**
     * Checks if a CentreDexamen exists with the given name, address, and telephone number.
     * @param name The name to check.
     * @param adress The address to check.
     * @param tel The telephone number to check.
     * @return true if a centre exists with this combination, false otherwise.
     */
    boolean existsByNameAndAdressAndTel(String name, String adress, String tel);

    // Add other custom query methods here if needed
}
