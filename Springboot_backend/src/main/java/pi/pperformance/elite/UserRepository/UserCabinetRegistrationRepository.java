package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.User;
import pi.pperformance.elite.entities.CabinetDr;
import pi.pperformance.elite.entities.UserCabinetRegistration;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserCabinetRegistrationRepository extends JpaRepository<UserCabinetRegistration, Long> {

    // Find a specific registration by User and Cabinet
    Optional<UserCabinetRegistration> findByUserAndCabinet(User user, CabinetDr cabinet);

    // Find a specific registration by User ID and Cabinet ID
    Optional<UserCabinetRegistration> findByUserIdAndCabinetIdSite(Long userId, Long cabinetId);

    // Check if a registration exists for a specific User ID and Cabinet ID
    boolean existsByUserIdAndCabinetIdSite(Long userId, Long cabinetId);

    // Find all registrations for a specific user
    List<UserCabinetRegistration> findByUser(User user);

    // Find all registrations for a specific user ID
    List<UserCabinetRegistration> findByUserId(Long userId);

    // Find all active registrations for a user based on their email
    @Query("SELECT r FROM UserCabinetRegistration r JOIN r.user u WHERE u.email = :email AND r.isActive = true")
    List<UserCabinetRegistration> findActiveRegistrationsByUserEmail(@Param("email") String email);
    
    // Find all registrations (active and inactive) for a user based on their email
    @Query("SELECT r FROM UserCabinetRegistration r JOIN r.user u WHERE u.email = :email")
    List<UserCabinetRegistration> findAllRegistrationsByUserEmail(@Param("email") String email);

    // Find a specific active registration by user email and cabinet ID
    @Query("SELECT r FROM UserCabinetRegistration r JOIN r.user u WHERE u.email = :email AND r.cabinet.idSite = :cabinetId AND r.isActive = true")
    Optional<UserCabinetRegistration> findActiveRegistrationByUserEmailAndCabinetId(@Param("email") String email, @Param("cabinetId") Long cabinetId);

    // Find a specific registration (active or inactive) by user email and cabinet ID
    @Query("SELECT r FROM UserCabinetRegistration r JOIN r.user u WHERE u.email = :email AND r.cabinet.idSite = :cabinetId")
    Optional<UserCabinetRegistration> findRegistrationByUserEmailAndCabinetId(@Param("email") String email, @Param("cabinetId") Long cabinetId);
    
    // Find registrations by cabinet ID
    List<UserCabinetRegistration> findByCabinetIdSite(Long cabinetId);

    // Find all *active* registrations for a specific user ID
    List<UserCabinetRegistration> findByUserIdAndIsActiveTrue(Long userId);

    // Delete all registrations associated with a specific user ID
    @Modifying // Required for delete operations
    @Query("DELETE FROM UserCabinetRegistration r WHERE r.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
