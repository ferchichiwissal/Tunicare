package pi.pperformance.elite.UserRepository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying; // Import Modifying
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import pi.pperformance.elite.entities.Role;
import pi.pperformance.elite.entities.CabinetDr; // Import CabinetDr
import pi.pperformance.elite.entities.User;
import pi.pperformance.elite.entities.Patient; // Add import
import pi.pperformance.elite.entities.Doctor; // Add import
import pi.pperformance.elite.entities.Assistant; // Add import
import pi.pperformance.elite.entities.Admin; // Add import
import java.util.Optional; // Add import

//the repository interface, it doesn't contain any function they're all comming from the interface "JPARepository" , we'll add others if we needed
@Repository
//please make sure to name the entity "User" so the code recognize it and most of the red underlined User will be gone
public interface UserRepository extends JpaRepository<User, Long> {
    User findByEmail(String email);
    // List<User> findByIsActive(boolean is_active); // Removed: isActive is now per registration
    void delete(User user);
    List<User> findByRole(Role role);

    // Find Doctors by cabinet ID (They are implicitly "active" if associated)
    @Query("SELECT u FROM Doctor u WHERE u.cabinet.idSite = :cabinetId")
    List<User> findActiveDoctorsByCabinetId(@Param("cabinetId") Long cabinetId);

    // Check if a Doctor exists for a specific cabinet ID
    @Query("SELECT CASE WHEN COUNT(d) > 0 THEN true ELSE false END FROM Doctor d WHERE d.cabinet.idSite = :cabinetId")
    boolean existsDoctorByCabinetId(@Param("cabinetId") Long cabinetId);

    // Find *active* Assistants by cabinet ID (checking the Assistant's own isActive field)
    @Query("SELECT u FROM Assistant u WHERE u.cabinet.idSite = :cabinetId AND u.isActive = true")
    List<User> findActiveAssistantsByCabinetId(@Param("cabinetId") Long cabinetId);

    // Find active Patients by cabinet ID (using UserCabinetRegistration)
    @Query("SELECT p FROM Patient p JOIN p.registrations r WHERE r.isActive = true AND r.cabinet.idSite = :cabinetId")
    List<User> findActivePatientsByCabinetId(@Param("cabinetId") Long cabinetId);

    // Find ALL Patients registered in a cabinet ID (using UserCabinetRegistration)
    @Query("SELECT p FROM Patient p JOIN p.registrations r WHERE r.cabinet.idSite = :cabinetId")
    List<User> findAllPatientsByCabinetId(@Param("cabinetId") Long cabinetId);

    // Find inactive Doctors by cabinet ID - This concept is removed for Doctor/Assistant
    // @Query("SELECT u FROM Doctor u WHERE u.isActive = false AND u.cabinet.idSite = :cabinetId")
    // List<User> findInactiveDoctorsByCabinetId(@Param("cabinetId") Long cabinetId); // Removed

    // Find inactive Assistants by cabinet ID - This concept is removed for Doctor/Assistant
    // @Query("SELECT u FROM Assistant u WHERE u.isActive = false AND u.cabinet.idSite = :cabinetId")
    // List<User> findInactiveAssistantsByCabinetId(@Param("cabinetId") Long cabinetId); // Removed

    // Find inactive Patients registered in a cabinet ID (using UserCabinetRegistration)
    @Query("SELECT p FROM Patient p JOIN p.registrations r WHERE r.isActive = false AND r.cabinet.idSite = :cabinetId")
    List<User> findInactivePatientsByCabinetId(@Param("cabinetId") Long cabinetId);

    // Delete Doctors associated with a specific cabinet
    @Modifying // Indicates a query that modifies data (DELETE)
    @Query("DELETE FROM Doctor d WHERE d.cabinet = :cabinet")
    void deleteDoctorsByCabinet(@Param("cabinet") CabinetDr cabinet);

    // Delete Assistants associated with a specific cabinet
    @Modifying
    @Query("DELETE FROM Assistant a WHERE a.cabinet = :cabinet")
    void deleteAssistantsByCabinet(@Param("cabinet") CabinetDr cabinet);

    // Note: Patients have a ManyToMany relationship, handled differently in the controller.

    // Check if a Patient exists with the given email, first name, last name, and has a registration with the specified cabinet ID
    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END " +
           "FROM Patient p JOIN p.registrations r " +
           "WHERE p.email = :email " +
           "AND p.firstName = :firstName " +
           "AND p.lastName = :lastName " +
           "AND r.cabinet.idSite = :cabinetId")
    boolean existsPatientByEmailAndFirstNameAndLastNameAndCabinetId(
            @Param("email") String email,
            @Param("firstName") String firstName,
            @Param("lastName") String lastName,
            @Param("cabinetId") Long cabinetId);

    // Removed findByEmailAndIsActiveTrue as isActive is no longer global

    // --- Methods needed for UserServiceImplmnt (Review/Refactor) ---

    // Finders by email and active status for specific roles are now problematic due to isActive removal.
    // The service layer should use UserCabinetRegistrationRepository for active checks.
    // We might keep finders by email only.

    // Removed findPatientsByEmailAndIsActive
    // Removed findDoctorByEmailAndIsActive
    // Removed findAssistantByEmailAndIsActive
    // Removed findAdminByEmailAndIsActive

    // Finder for all patients by email (still potentially useful)
    @Query("SELECT p FROM Patient p WHERE p.email = :email")
    List<Patient> findPatientsByEmail(@Param("email") String email);

    // Finder for a patient by email with a registration in a specific cabinet (used in addPatient)
    // This checks for *any* registration (active or inactive)
    @Query("SELECT p FROM Patient p JOIN p.registrations r WHERE p.email = :email AND r.cabinet.idSite = :cabinetId")
    Optional<Patient> findPatientByEmailAndCabinetId(@Param("email") String email, @Param("cabinetId") Long cabinetId);

}
