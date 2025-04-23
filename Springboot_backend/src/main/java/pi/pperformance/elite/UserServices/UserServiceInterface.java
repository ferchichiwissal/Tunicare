package pi.pperformance.elite.UserServices;
import java.util.List;

import java.util.List;

import dto.UserUpdateDTO; // Import the DTO
import pi.pperformance.elite.entities.Patient;
import pi.pperformance.elite.entities.Role;
import pi.pperformance.elite.entities.User;
import pi.pperformance.elite.entities.UserCabinetRegistration; // Import the new entity


//the service interface where we're going to declare the function we'll use in both the controller and the service class
public interface UserServiceInterface{
//please make sure to name the entity "User" so the code recognize it and most of the red underlined User will be gone

    public User updateUser(Long id, UserUpdateDTO userDetailsDTO); // Changed parameter type to DTO
    public void deleteUser(Long id);
    public List<User> getAllUsers();
    public User getUserByEmail(String email);
    public User getUserById(Long id);
    User findByEmail(String email);
     // marwa
    //User toggleUserStatus(Long id);
    
  
    
    
    
    
    // public List<User> getUsersByIsActive(boolean is_active); // Removed - Replaced by cabinet-specific or registration-based logic
    // public List<User> getactiveUsers(boolean is_notactive) ; // Removed - Replaced by cabinet-specific or registration-based logic
    // public User activateUser(Long id); // Removed - Replaced by activateUserRegistration
    // public User deactivateUser(Long id); // Removed - Replaced by deactivateUserRegistration

    // New methods for activating/deactivating specific registrations (added actingUserId)
    public UserCabinetRegistration activateUserRegistration(Long actingUserId, Long targetUserId, Long cabinetId);
    public UserCabinetRegistration deactivateUserRegistration(Long actingUserId, Long targetUserId, Long cabinetId);

    //wissal

    User changeUserRole(Long userId, Role newRole); // Nouvelle méthode

	public User findById(Long userId);

	public void deletePatient(Patient user);
    /**
     * Adds a new user or adds a registration for an existing user.
     * @param user The user entity to add/update.
     * @param cabinetId The target cabinet ID (required for Patients, ignored otherwise unless creating Dr/Assist).
     * @param passwordToBeEncrypted Whether the provided password needs hashing.
     * @param initialRegistrationActive The desired active status for the *initial* registration if a *new* Patient is created.
     * @return The saved/updated User entity.
     */
    public User addUser(User user, Long cabinetId, boolean passwordToBeEncrypted, boolean initialRegistrationActive);
  	public List<User> getPatients();
	boolean validateResetToken(String token);
	boolean resetPassword(String token, String newPassword); // Uncommented this line

	   // New method for getting active users filtered by the current user's context
	   List<User> getFilteredActiveUsers(User currentUser);

	   // New method to get all patients (active and inactive) for a specific cabinet
	   List<User> getAllPatientsByCabinetId(Long cabinetId);

	   // New method for getting inactive users filtered by the current user's context (cabinet)
	   List<User> getFilteredInactiveUsers(User currentUser); // This seems context-based, not just cabinet ID based. Keep for now.

	   // Check if a user with the same email, first name, and last name exists in a specific cabinet
	   boolean existsByEmailAndFirstNameAndLastNameInCabinet(String email, String firstName, String lastName, Long cabinetId);

	   // --- New Methods for Cabinet-Specific Filtering by ID ---
	   List<User> getActiveUsersByCabinet(Long cabinetId);
	   List<User> getInactiveUsersByCabinet(Long cabinetId);
	public List<User> findInactiveUsersByCabinetId(Long cabinetId);

	// --- Methods needed for AuthController ---
    List<User> findActiveUsersByEmail(String email); // For login logic
    void savePasswordResetToken(User user, String token); // For password reset
	List<User> getdoctors();
	
	// New method for deleting a specific registration (added actingUserId)
	   void deleteUserRegistration(Long actingUserId, Long targetUserId, Long cabinetId);

	   // Nouvelle méthode pour obtenir les patients actifs d'un cabinet spécifique
	   List<User> getActivePatientsByCabinetId(Long cabinetId);

	   // Renamed: Nouvelle méthode pour basculer le statut d'un enregistrement utilisateur (Patient uniquement)
	   UserCabinetRegistration toggleUserRegistrationStatus(Long userId, Long cabinetId);

	   // New method to toggle the direct isActive status for Doctors and Assistants
	   User toggleDoctorAssistantStatus(Long targetUserId);

	   /**
	    * Transfers a Patient to a Doctor or Assistant role within a specific cabinet.
	    * Creates a new Doctor/Assistant record, copies patient details, sets isActive=true,
	    * assigns the target cabinet, and deletes the patient's registration ONLY for that cabinet.
	    * The original Patient record remains if registered elsewhere.
	    *
	    * @param actingUserId ID of the user performing the transfer (Admin, Doctor, Assistant).
	    * @param patientUserId ID of the Patient user to transfer.
	    * @param targetCabinetId ID of the cabinet where the transfer occurs.
	    * @param targetRole The target role (DOCTOR or ASSISTANT).
	    * @return The newly created Doctor or Assistant user.
	    * @throws AccountNotFoundException If actor, patient, or cabinet not found.
	    * @throws AccessDeniedException If the actor lacks permission.
	    * @throws IllegalArgumentException If target user is not a Patient or target role is invalid.
	    * @throws DataIntegrityViolationException If transferring to Doctor and the cabinet already has one.
	    */
	   User transferPatientToRole(Long actingUserId, Long patientUserId, Long targetCabinetId, Role targetRole);

	   /**
	    * Retrieves all patients along with their cabinet registration details.
	    * Intended for Admin use.
	    *
	    * @return A list of PatientWithRegistrationsDTO.
	    */
	   List<dto.PatientWithRegistrationsDTO> getAllPatientsWithRegistrations();

	   /**
	    * Changes the password for a user identified by email.
	    * Verifies the old password before setting the new one.
	    *
	    * @param email The email of the user.
	    * @param oldPassword The user's current password (plain text).
	    * @param newPassword The desired new password (plain text).
	    * @return true if the password was changed successfully, false if the old password was incorrect.
	    * @throws AccountNotFoundException If the user with the given email is not found.
	    * @throws IllegalArgumentException If the new password is invalid (e.g., too weak - implementation specific).
	    */
	   boolean changeUserPassword(String email, String oldPassword, String newPassword);

	   /**
	    * Finds an active patient within a specific cabinet by their first and last name.
	    *
	    * @param cabinetId The ID of the cabinet to search within.
	    * @param firstName The first name of the patient.
	    * @param lastName The last name of the patient.
	    * @return An Optional containing the Patient if found and active in the cabinet, otherwise empty.
	    */
	   java.util.Optional<Patient> findActivePatientByCabinetAndName(Long cabinetId, String firstName, String lastName); // Added for patient search
	 }
