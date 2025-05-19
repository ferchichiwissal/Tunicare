package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.User;
import pi.pperformance.elite.entities.CabinetDr;
import pi.pperformance.elite.entities.UserCabinetRegistration;
import pi.pperformance.elite.entities.Role; // Import Role

import java.util.List;
import java.util.Optional;
import java.time.LocalDate; // Import manquant

@Repository
public interface UserCabinetRegistrationRepository extends JpaRepository<UserCabinetRegistration, Long> {

    // Find a specific registration by User and Cabinet
    Optional<UserCabinetRegistration> findByUserAndCabinet(User user, CabinetDr cabinet);

    // Find a specific registration by User ID and Cabinet ID
    Optional<UserCabinetRegistration> findByUserIdAndCabinetIdSite(Long userId, Long cabinetId);

    // Check if a registration exists for a specific User ID and Cabinet ID
    boolean existsByUserIdAndCabinetIdSite(Long userId, Long cabinetId);

    // Check if an *active* registration exists for a specific User ID and Cabinet ID
    boolean existsByUserIdAndCabinetIdSiteAndIsActiveTrue(Long userId, Long cabinetId);

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

    // Find an active Patient entity (by name) associated with a specific cabinet via an active registration
    // Used by UserServiceImplmnt.findActivePatientByCabinetAndName
    // Made case-insensitive using LOWER() and checks for swapped names
    // Selects the User 'u' directly, cast to Patient in the query result type.
    @Query("SELECT u FROM UserCabinetRegistration r JOIN r.user u JOIN r.cabinet c " +
           "WHERE c.idSite = :cabinetId AND u.role = pi.pperformance.elite.entities.Role.PATIENT AND r.isActive = true " +
           "AND ( (LOWER(u.firstName) = LOWER(:firstName) AND LOWER(u.lastName) = LOWER(:lastName)) OR " +
           "      (LOWER(u.firstName) = LOWER(:lastName) AND LOWER(u.lastName) = LOWER(:firstName)) )")
    Optional<pi.pperformance.elite.entities.Patient> findActivePatientByUserFirstNameAndLastNameAndCabinetId( // Changed return type and method name slightly for clarity
            @Param("firstName") String firstName,
            @Param("lastName") String lastName,
            @Param("cabinetId") Long cabinetId);

    // Méthode pour StatisticsService
    long countByCabinetAndIsActive(CabinetDr cabinet, boolean isActive);

    // Compter les inscriptions de patients en attente de confirmation pour un cabinet donné
    long countByCabinetAndIsActiveAndUser_Role(CabinetDr cabinet, boolean isActive, Role userRole);

    // Compter les patients actifs enregistrés aujourd'hui dans le cabinet
    long countByCabinetAndIsActiveTrueAndRegistrationDate(CabinetDr cabinet, LocalDate registrationDate);

    // Compter les nouveaux patients (basé sur User.createdAt) enregistrés aujourd'hui dans le cabinet
    long countByCabinetAndUser_CreatedAt(CabinetDr cabinet, LocalDate createdAt);

    // Compter les inscriptions au cabinet pour un rôle utilisateur spécifique et dans une plage de dates d'inscription
    long countByCabinetAndUser_RoleAndRegistrationDateBetween(CabinetDr cabinet, Role userRole, LocalDate startDate, LocalDate endDate);

    // For Doctor graph: Count active patient registrations by month for the last 12 months for a specific cabinet
    @Query("SELECT new pi.pperformance.elite.dto.MonthlyStatDTO(YEAR(r.registrationDate), MONTH(r.registrationDate), COUNT(r)) " +
           "FROM UserCabinetRegistration r " +
           "WHERE r.cabinet.idSite = :cabinetId AND r.isActive = true AND r.user.role = pi.pperformance.elite.entities.Role.PATIENT AND r.registrationDate >= :startDate " +
           "GROUP BY YEAR(r.registrationDate), MONTH(r.registrationDate) " +
           "ORDER BY YEAR(r.registrationDate) DESC, MONTH(r.registrationDate) DESC")
    List<pi.pperformance.elite.dto.MonthlyStatDTO> countActivePatientRegistrationsByMonthForCabinet(@Param("cabinetId") Long cabinetId, @Param("startDate") LocalDate startDate);

    // For Admin global graph: Count global active patient registrations by month for the last 12 months
    @Query("SELECT new pi.pperformance.elite.dto.MonthlyStatDTO(YEAR(r.registrationDate), MONTH(r.registrationDate), COUNT(r)) " +
           "FROM UserCabinetRegistration r " +
           "WHERE r.isActive = true AND r.user.role = pi.pperformance.elite.entities.Role.PATIENT AND r.registrationDate >= :startDate " +
           "GROUP BY YEAR(r.registrationDate), MONTH(r.registrationDate) " +
           "ORDER BY YEAR(r.registrationDate) DESC, MONTH(r.registrationDate) DESC")
    List<pi.pperformance.elite.dto.MonthlyStatDTO> countGlobalActivePatientRegistrationsByMonth(@Param("startDate") LocalDate startDate);
}
