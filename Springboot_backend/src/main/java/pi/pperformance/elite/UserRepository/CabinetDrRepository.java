package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying; // Import Modifying
import org.springframework.data.jpa.repository.Query; // Import Query
import org.springframework.data.repository.query.Param; // Import Param
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.CabinetDr;
import java.util.Optional;

@Repository
public interface CabinetDrRepository extends JpaRepository<CabinetDr, Long> {
    // Find a cabinet by its name and address
    Optional<CabinetDr> findByNameAndAddress(String name, String address);

    // You can add other custom query methods here if needed later
    // Native query to delete entries from the join table (UserCabinetRegistration) for a specific cabinet
    @Modifying
    @Query(value = "DELETE FROM user_cabinet_registration WHERE cabinet_id = :cabinetId", nativeQuery = true)
    void deletePatientAssociations(@Param("cabinetId") Long cabinetId);
}
