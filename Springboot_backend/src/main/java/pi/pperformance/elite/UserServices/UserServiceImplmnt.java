package pi.pperformance.elite.UserServices;

import java.io.IOException; // Added import
import org.springframework.web.multipart.MultipartFile; // Added import
import pi.pperformance.elite.exceptions.ResourceNotFoundException; // Added import

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional; // Use Spring's Transactional
import pi.pperformance.elite.UserRepository.PasswordResetTokenRepository;
import pi.pperformance.elite.UserRepository.UserCabinetRegistrationRepository; // Import the new repository
import pi.pperformance.elite.entities.CabinetDr; // Add import
import pi.pperformance.elite.UserRepository.UserRepository;
import pi.pperformance.elite.UserRepository.CabinetDrRepository; // Add missing import
import pi.pperformance.elite.entities.Admin;
import pi.pperformance.elite.entities.Assistant;
import pi.pperformance.elite.entities.UserCabinetRegistration; // Import the new entity
import pi.pperformance.elite.entities.Doctor;
import pi.pperformance.elite.entities.PasswordResetToken;
import pi.pperformance.elite.entities.Patient;
import pi.pperformance.elite.entities.Role;
import pi.pperformance.elite.entities.User;
import pi.pperformance.elite.exceptions.AccountNotFoundException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList; // Add import
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set; // Import Set
import java.util.UUID;
import java.util.stream.Collectors; // Add import

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException; // Import for catching constraint violations
import org.springframework.security.access.AccessDeniedException; // Add import
import org.springframework.security.core.Authentication; // Add import
import org.springframework.security.core.context.SecurityContextHolder; // Add import
import dto.UserUpdateDTO; // Import the DTO


@Service
public class UserServiceImplmnt implements UserServiceInterface {

    private static final Logger log = LoggerFactory.getLogger(UserServiceImplmnt.class); // Add logger instance
    @Autowired
    private UserRepository UsrRepo;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;


    @Autowired
    private EmailService emailService;

    // Remove the temporary tokenStorage map, it's not needed
    // private final Map<String, String> tokenStorage = new HashMap<>();

    @Autowired // Need CabinetDrRepository for patient registration logic
    private CabinetDrRepository cabinetDrRepository;

    @Autowired // Inject the new repository
    private UserCabinetRegistrationRepository userCabinetRegistrationRepository;

    // --- Authorization Helper Methods ---

    private User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            log.warn("Attempted action by unauthenticated user.");
            // Consider throwing a specific AuthenticationException or returning null based on how you handle this elsewhere
            throw new AccessDeniedException("User is not authenticated.");
        }
        String email = authentication.getName();
        // findByEmail now returns User or null, so this direct usage is fine if findByEmail handles the Optional
        User user = findByEmail(email);
        if (user == null) {
            // This case should ideally not happen if authentication succeeded with a valid user
            log.error("Authenticated user '{}' not found in database.", email);
            throw new AccountNotFoundException("Authenticated user not found.");
        }
        return user;
    }

    /**
     * Checks if the acting user has permission to perform an action on the target user based on roles and cabinet membership.
     * Admins can act on anyone. Doctors/Assistants can only act on users within their own cabinet.
     *
     * @param actor The user performing the action.
     * @param target The user being acted upon.
     * @throws AccessDeniedException if the actor does not have permission.
     * @throws AccountNotFoundException if the target user is not found.
     * @throws IllegalArgumentException if actor or target is null.
     */
     @Transactional(readOnly = true) // Ensure lazy loading works if needed
     private void checkCabinetPermission(User actor, User target) throws AccessDeniedException {
         if (actor == null || target == null) {
             throw new IllegalArgumentException("Actor and Target users cannot be null for permission check.");
         }

         // Admins have universal permission
         if (actor.getRole() == Role.ADMIN) {
             log.debug("Admin user {} performing action on user {}. Permission granted.", actor.getEmail(), target.getEmail());
             return;
         }

         // Doctors and Assistants need cabinet checks
         if (actor.getRole() == Role.DOCTOR || actor.getRole() == Role.ASSISTANT) {
             Long actorCabinetId = null;
             // Need to fetch the actor again within this transaction if cabinet isn't already loaded
             User currentActor = UsrRepo.findById(actor.getId()).orElse(null);
             if (currentActor instanceof Doctor) {
                 actorCabinetId = ((Doctor) currentActor).getCabinetId();
             } else if (currentActor instanceof Assistant) {
                 actorCabinetId = ((Assistant) currentActor).getCabinetId();
             }

             // Doctor/Assistant must belong to a cabinet to manage others
             if (actorCabinetId == null) {
                 log.warn("Permission denied: Actor {} (Role: {}) has no assigned cabinet.", actor.getEmail(), actor.getRole());
                 throw new AccessDeniedException("User must belong to a cabinet to perform this action.");
             }

             log.debug("Actor {} (Role: {}, Cabinet: {}) attempting action on Target {} (Role: {}).",
                     actor.getEmail(), actor.getRole(), actorCabinetId, target.getEmail(), target.getRole());

             // Doctors/Assistants cannot manage Admins
             if (target.getRole() == Role.ADMIN) {
                  log.warn("Permission denied: Actor {} cannot manage Admin {}.", actor.getEmail(), target.getEmail());
                 throw new AccessDeniedException("Permission denied to manage this user.");
             }

             // Check target's cabinet
             boolean targetIsInActorsCabinet = false;
             // Fetch the target user again to ensure cabinet data is loaded within the transaction
             User currentTarget = UsrRepo.findById(target.getId()).orElse(null);
             if (currentTarget == null) {
                 // Should not happen if target was valid initially, but good check
                 throw new AccountNotFoundException("Target user not found during permission check.");
             }


             if (currentTarget instanceof Doctor) {
                 Long targetCabinetId = ((Doctor) currentTarget).getCabinetId();
                 if (targetCabinetId != null && targetCabinetId.equals(actorCabinetId)) {
                     targetIsInActorsCabinet = true;
                 }
             } else if (currentTarget instanceof Assistant) {
                 Long targetCabinetId = ((Assistant) currentTarget).getCabinetId();
                  if (targetCabinetId != null && targetCabinetId.equals(actorCabinetId)) {
                     targetIsInActorsCabinet = true;
                 }
             } else if (currentTarget instanceof Patient) {
                 // Ensure Patient's cabinets are loaded
                 // Patient targetPatient = (Patient) currentTarget; // No need to cast if getCabinet is on User or handled polymorphically
                 // Check if the patient has a registration in the actor's cabinet
                 // Ensure Patient's registrations are loaded (rely on @Transactional or fetch explicitly)
                 Set<UserCabinetRegistration> patientRegistrations = ((Patient) currentTarget).getRegistrations();
                 if (patientRegistrations != null) {
                     // Initialize the collection if it's lazy-loaded and not already fetched
                     // org.hibernate.Hibernate.initialize(patientRegistrations); // May not be needed
                     for (UserCabinetRegistration registration : patientRegistrations) {
                         // Check if the registration's cabinet ID matches the actor's cabinet ID
                         if (registration.getCabinet() != null && registration.getCabinet().getIdSite().equals(actorCabinetId)) {
                             targetIsInActorsCabinet = true;
                             break; // Found a matching registration
                         }
                     }
                 }
             }

             // If the target user is not in the actor's cabinet, deny access
             if (!targetIsInActorsCabinet) {
                  log.warn("Permission denied: Actor {} (Cabinet: {}) cannot manage Target {} (Not in same cabinet).",
                          actor.getEmail(), actorCabinetId, target.getEmail());
                 throw new AccessDeniedException("Permission denied: User is not in your cabinet.");
             }

             log.debug("Permission granted for Actor {} on Target {} within Cabinet {}.", actor.getEmail(), target.getEmail(), actorCabinetId);
             return; // Permission granted for Doctor/Assistant within their cabinet
         }

         // Other roles (e.g., Patient) cannot perform these actions
         log.warn("Permission denied: Actor {} (Role: {}) is not authorized for this action.", actor.getEmail(), actor.getRole());
         throw new AccessDeniedException("User role not authorized for this action.");
     }


    @Override
    public boolean validateResetToken(String token) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token);
        // Check if token exists and is not expired
        return resetToken != null && resetToken.getExpiryDate().isAfter(LocalDateTime.now());
    }

    @Override // Add the Override annotation here
    public boolean resetPassword(String token, String newPassword) {
        // Find the token in the database
        PasswordResetToken resetToken = tokenRepository.findByToken(token); // Use the injected repository
        if (resetToken == null) {
            // Log or handle invalid token case
            System.err.println("Attempt to reset password with invalid token: " + token);
            return false; // Invalid token
        }

        // Check if the token is expired (although validateResetToken should have caught this)
        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            tokenRepository.delete(resetToken); // Delete expired token
             System.err.println("Attempt to reset password with expired token: " + token);
            return false; // Expired token
        }

        // Get the user associated with the token
        User user = resetToken.getUser();
        if (user == null) {
             System.err.println("Password reset token " + token + " has no associated user.");
             tokenRepository.delete(resetToken); // Clean up orphan token
            return false; // Should not happen if DB is consistent
        }

        // Hash the new password before saving
        user.setPassword(passwordEncoder.encode(newPassword));

        // Save the user with the updated password using the primary repository
        UsrRepo.save(user); // Use UsrRepo for consistency

        // Delete the token after successful password reset
        tokenRepository.delete(resetToken);

        return true;
    }


    // Add a new user and hash the password before saving
    // Signature matches the interface now
    @Override
    @Transactional // Ensure atomicity, especially for patient logic
    // Updated signature to match interface
    public User addUser(User user, Long cabinetId, boolean passwordToBeEncrypted, boolean initialRegistrationActive) {
        log.info("addUser called for email: {}, role: {}, targetCabinetId: {}, initialActive: {}",
                 user.getEmail(), user.getRole(), cabinetId, initialRegistrationActive);

        // Delegate based on user type
        if (user instanceof Patient) {
            // Ensure cabinetId is provided for Patients
            if (cabinetId == null) {
                log.error("Cabinet ID is required when adding a Patient (email: {})", user.getEmail());
                // This exception should now be caught earlier in the controller if verifyEmail requires it
                throw new IllegalArgumentException("Cabinet ID cannot be null for Patient registration.");
            }
            log.debug("Delegating to addPatient for email: {}", user.getEmail());
            // Pass the received cabinetId and initial active status to the helper
            return addPatient((Patient) user, cabinetId, passwordToBeEncrypted, initialRegistrationActive);
        } else {
            // For non-patients (Admin, Doctor, Assistant) - initialRegistrationActive is ignored
             if (cabinetId != null) {
                 log.warn("Cabinet ID {} provided for non-Patient role ({}), ignoring.", cabinetId, user.getRole());
             }
            log.debug("Delegating to saveUserInternal for email: {}", user.getEmail());
            return saveUserInternal(user, passwordToBeEncrypted);
        }
    }
    // Returns a list of all users
    @Override
    public List<User> getAllUsers() {
        return UsrRepo.findAll();
    }

    // Returns a user by id, throws AccountNotFoundException if not found

    // Returns a user by email. Throws AccountNotFoundException if not found.
    @Override
    public User getUserByEmail(String email) {
        User user = UsrRepo.findByEmail(email);
        if (user == null) {
            throw new AccountNotFoundException("User with email " + email + " not found");
        }
        return user;
    }

    // Updates a user's information using DTO; throws AccountNotFoundException if not found
    // @Override // This method signature will change, so @Override might not apply if not in interface
    @Transactional
    public User updateUserAndPhoto(Long id, UserUpdateDTO userDetailsDTO, MultipartFile photoProfilFile) throws IOException {
        log.info("Attempting to update user ID: {} with DTO and potentially a profile picture.", id);

        User user = UsrRepo.findById(id)
                .orElseThrow(() -> {
                    log.error("User not found with ID: {} during update.", id);
                    return new AccountNotFoundException("User with ID " + id + " not found");
                });

        // Update text fields from DTO
        if (userDetailsDTO.getFirstName() != null) {
            user.setFirstName(userDetailsDTO.getFirstName());
        }
        if (userDetailsDTO.getLastName() != null) {
            user.setLastName(userDetailsDTO.getLastName());
        }
        if (userDetailsDTO.getAddress() != null) {
            user.setAddress(userDetailsDTO.getAddress());
        }
        if (userDetailsDTO.getTel() != null) {
            user.setTel(userDetailsDTO.getTel());
        }
        if (userDetailsDTO.getBirthDate() != null) {
            user.setBirthDate(userDetailsDTO.getBirthDate());
        }
        // Gender is not in UserUpdateDTO based on EditUserForm.js
        // if (userDetailsDTO.getGender() != null) {
        //     user.setGender(userDetailsDTO.getGender());
        // }
        if (userDetailsDTO.getEmail() != null) {
            // Consider uniqueness validation if email can be changed and must be unique
            user.setEmail(userDetailsDTO.getEmail());
        }

        // Process the new profile picture if provided
        if (photoProfilFile != null && !photoProfilFile.isEmpty()) {
            log.debug("Processing new profile picture for user ID: {}", id);
            try {
                // Basic validation (already done in controller, but good for service layer too)
                if (!photoProfilFile.getContentType().startsWith("image/")) {
                    log.warn("Invalid profile picture type for user ID {}: {}", id, photoProfilFile.getContentType());
                    throw new IOException("Invalid file type. Only images are allowed.");
                }
                if (photoProfilFile.getSize() > 5 * 1024 * 1024) { // 5MB limit
                    log.warn("Profile picture size {} exceeds limit for user ID {}", photoProfilFile.getSize(), id);
                    throw new IOException("File size exceeds the limit of 5 MB.");
                }
                byte[] photoBytes = photoProfilFile.getBytes();
                user.setPhotoProfil(photoBytes);
                log.debug("New profile picture byte array set for user ID: {}", id);
            } catch (IOException e) {
                log.error("Failed to read bytes from profile picture file for user ID: {}", id, e);
                throw e; // Re-throw to be handled by the controller
            }
        }

        user.setUpdatedAt(LocalDate.now());
        User savedUser = UsrRepo.save(user);
        log.info("Successfully updated user ID: {}", id);
        return savedUser;
    }




    // Deletes a user by id; throws AccountNotFoundException if user doesn't exist
    @Override
    @Transactional
    public void deleteUser(Long targetUserId) {
        User actor = getCurrentAuthenticatedUser();
        User targetUser = UsrRepo.findById(targetUserId)
                .orElseThrow(() -> new AccountNotFoundException("User with ID " + targetUserId + " not found"));

        // Initial permission check (can actor manage target at all?)
        checkCabinetPermission(actor, targetUser);

        // --- Deletion Logic based on Roles ---
        if (actor.getRole() == Role.ADMIN) {
            // Admin deletes the user entirely
            log.info("ADMIN {} deleting user {} (ID: {}) entirely.", actor.getEmail(), targetUser.getEmail(), targetUserId);
            UsrRepo.delete(targetUser); // Cascade should handle registrations if configured
        } else if (actor.getRole() == Role.DOCTOR || actor.getRole() == Role.ASSISTANT) {
            // Doctor/Assistant can only 'remove' a patient from their specific cabinet
            if (targetUser instanceof Patient) {
                Long actorCabinetId = (actor instanceof Doctor) ? ((Doctor) actor).getCabinetId() : ((Assistant) actor).getCabinetId();
                if (actorCabinetId == null) {
                     log.error("Critical Error: Actor {} (Role: {}) has no cabinet ID during delete operation.", actor.getEmail(), actor.getRole());
                     throw new IllegalStateException("Cannot perform deletion without an assigned cabinet.");
                }

                // Find the specific registration linking the patient to the actor's cabinet
                Optional<UserCabinetRegistration> registrationOpt = userCabinetRegistrationRepository
                        .findByUserIdAndCabinetIdSite(targetUserId, actorCabinetId);

                if (registrationOpt.isPresent()) {
                    UserCabinetRegistration registrationToDelete = registrationOpt.get();
                    log.info("User {} (Role: {}, Cabinet: {}) removing Patient {} (ID: {}) registration from cabinet {}.",
                             actor.getEmail(), actor.getRole(), actorCabinetId, targetUser.getEmail(), targetUserId, actorCabinetId);
                    userCabinetRegistrationRepository.delete(registrationToDelete);
                    // DO NOT delete the targetUser (Patient) itself
                } else {
                    log.warn("User {} (Role: {}, Cabinet: {}) attempted to delete Patient {} (ID: {}), but no registration found in cabinet {}.",
                             actor.getEmail(), actor.getRole(), actorCabinetId, targetUser.getEmail(), targetUserId, actorCabinetId);
                    // Optionally throw an exception or just log the warning
                    // throw new AccountNotFoundException("Patient is not registered in your cabinet.");
                }
            } else {
                // Doctors/Assistants cannot delete other Doctors, Assistants, or Admins via this method
                log.warn("Permission Denied: User {} (Role: {}) cannot delete user {} (Role: {}).",
                         actor.getEmail(), actor.getRole(), targetUser.getEmail(), targetUser.getRole());
                throw new AccessDeniedException("You do not have permission to delete this type of user.");
            }
        } else {
            // Other roles (e.g., Patient) cannot delete users
             log.warn("Permission Denied: User {} (Role: {}) attempted to delete user {}.", actor.getEmail(), actor.getRole(), targetUser.getEmail());
            throw new AccessDeniedException("You do not have permission to delete users.");
        }
        // --- End Deletion Logic ---
 }

	      @Override
	      public List<User> getAllPatientsByCabinetId(Long cabinetId) {
	          log.info("Fetching all patients (active and inactive) for cabinet ID: {}", cabinetId);
	          if (cabinetId == null) {
	              log.error("getAllPatientsByCabinetId called with null cabinetId.");
	              return new ArrayList<>();
	          }
	          List<User> patients = UsrRepo.findAllPatientsByCabinetId(cabinetId);
	          log.info("Found {} patients for cabinet ID: {}", patients.size(), cabinetId);
	          return patients;
	      }

	   @Override
	   @Transactional(readOnly = true)
	   public List<User> getActiveUsersByCabinet(Long cabinetId) {
	       log.info("Fetching active users (Doctor, Assistant, Patient) for cabinet ID: {}", cabinetId);
	       if (cabinetId == null) {
	           log.error("getActiveUsersByCabinet called with null cabinetId.");
	           return new ArrayList<>();
	       }
	       List<User> activeUsers = new ArrayList<>();
	       activeUsers.addAll(UsrRepo.findActiveDoctorsByCabinetId(cabinetId));
	       activeUsers.addAll(UsrRepo.findActiveAssistantsByCabinetId(cabinetId));
	       activeUsers.addAll(UsrRepo.findActivePatientsByCabinetId(cabinetId));
	          log.info("Found {} active users for cabinet ID: {}", activeUsers.size(), cabinetId);
	          return activeUsers; // Added missing return statement
	   }

	   @Override
	   @Transactional(readOnly = true)
	   public List<User> getInactiveUsersByCabinet(Long cabinetId) {
	       log.info("Fetching inactive users (Doctor, Assistant, Patient) for cabinet ID: {}", cabinetId);
	       if (cabinetId == null) {
	           log.error("getInactiveUsersByCabinet called with null cabinetId.");
	           return new ArrayList<>();
	       }
	       List<User> inactiveUsers = new ArrayList<>();
	       // inactiveUsers.addAll(UsrRepo.findInactiveDoctorsByCabinetId(cabinetId)); // Removed - No inactive concept for Doctor
	       // inactiveUsers.addAll(UsrRepo.findInactiveAssistantsByCabinetId(cabinetId)); // Removed - No inactive concept for Assistant
	       inactiveUsers.addAll(UsrRepo.findInactivePatientsByCabinetId(cabinetId)); // Only inactive patients are relevant now
	       log.info("Found {} inactive users (Patients only) for cabinet ID: {}", inactiveUsers.size(), cabinetId);
	       return inactiveUsers;
	   }

	   // Note: getPatientsByCabinet is effectively getAllPatientsByCabinetId which already exists.



	   

    // Finds a user by email, returns null if not found
    @Override
    @Transactional // Add Transactional to keep the session open for lazy loading
    public User findByEmail(String email) {
        User user = UsrRepo.findByEmail(email); // UsrRepo.findByEmail() now returns User
        if (user != null) {
            // Explicitly trigger lazy loading within the transaction
            if (user instanceof Doctor) {
                // Accessing the getter triggers the load
                ((Doctor) user).getCabinet();
            } else if (user instanceof Assistant) {
                 // Accessing the getter triggers the load
                ((Assistant) user).getCabinet();
            }
        }
        return user; // Can be null if not found
    }


      // Marwa

    /*
     @Override
    public User toggleUserStatus(Long id) {
        // Retrieve the user by ID
        User user = UsrRepo.findById(id)
         .orElseThrow(() -> new AccountNotFoundException("User with ID " + id + " not found"));


        // Toggle the current isActive status
        user.setIsActive(!user.getIsActive());

        // Save and return the updated user
        return UsrRepo.save(user);
    }
       */

      //Marwa


    //wissal
    // Removed obsolete method getactiveUsers(boolean)

    @Override
    public List<User> getPatients() {
        return UsrRepo.findByRole(Role.PATIENT);
    }

    @Override
    public List<User> getdoctors() {
        return UsrRepo.findByRole(Role.DOCTOR);
    }

    // --- Activation/Deactivation Logic (Refactored for UserCabinetRegistration) ---

    /**
     * Activates a user's registration within a specific cabinet.
     * Requires the ID of the user and the ID of the cabinet.
     */
    @Override
    @Transactional
    // Updated signature to match interface
    public UserCabinetRegistration activateUserRegistration(Long actingUserId, Long targetUserId, Long cabinetId) {
        // Fetch actor using the provided ID
        User actor = UsrRepo.findById(actingUserId)
                .orElseThrow(() -> new AccountNotFoundException("Acting user with ID " + actingUserId + " not found."));

        // Fetch the registration first to check cabinet association
        // Fetch the registration using targetUserId and cabinetId
        UserCabinetRegistration registration = userCabinetRegistrationRepository.findByUserIdAndCabinetIdSite(targetUserId, cabinetId)
                .orElseThrow(() -> new AccountNotFoundException(
                        "Registration not found for User ID " + targetUserId + " and Cabinet ID " + cabinetId));

        // Permission Check: Admins can activate anyone. Doctors/Assistants only in their own cabinet.
        if (actor.getRole() == Role.DOCTOR || actor.getRole() == Role.ASSISTANT) {
            Long actorCabinetId = (actor instanceof Doctor) ? ((Doctor) actor).getCabinetId() : ((Assistant) actor).getCabinetId();
            if (actorCabinetId == null || !actorCabinetId.equals(registration.getCabinet().getIdSite())) {
                 log.warn("Permission Denied: User {} (Role: {}, Cabinet: {}) cannot activate registration ID {} (Cabinet: {})",
                          actor.getEmail(), actor.getRole(), actorCabinetId, registration.getId(), registration.getCabinet().getIdSite());
                 throw new AccessDeniedException("You can only activate registrations within your own cabinet.");
            }
        }
        // --- End Permission Check ---

        // Registration already fetched above for permission check

        if (!registration.isActive()) {
            registration.setActive(true);
            log.info("Activating registration ID {}", registration.getId());
            return userCabinetRegistrationRepository.save(registration);
        } else {
            log.info("Registration ID {} is already active.", registration.getId());
            return registration; // Already active, return current state
        }
    }

    /**
     * Deactivates a user's registration within a specific cabinet.
     * Requires the ID of the user and the ID of the cabinet.
     */
    @Override
    @Transactional
     // Updated signature to match interface
    public UserCabinetRegistration deactivateUserRegistration(Long actingUserId, Long targetUserId, Long cabinetId) {
       // Fetch actor using the provided ID
        User actor = UsrRepo.findById(actingUserId)
                .orElseThrow(() -> new AccountNotFoundException("Acting user with ID " + actingUserId + " not found."));

        // Fetch the registration first to check cabinet association
        // Fetch the registration using targetUserId and cabinetId
        UserCabinetRegistration registration = userCabinetRegistrationRepository.findByUserIdAndCabinetIdSite(targetUserId, cabinetId)
                .orElseThrow(() -> new AccountNotFoundException(
                        "Registration not found for User ID " + targetUserId + " and Cabinet ID " + cabinetId));

        // Permission Check: Admins can deactivate anyone. Doctors/Assistants only in their own cabinet.
        if (actor.getRole() == Role.DOCTOR || actor.getRole() == Role.ASSISTANT) {
            Long actorCabinetId = (actor instanceof Doctor) ? ((Doctor) actor).getCabinetId() : ((Assistant) actor).getCabinetId();
            if (actorCabinetId == null || !actorCabinetId.equals(registration.getCabinet().getIdSite())) {
                 log.warn("Permission Denied: User {} (Role: {}, Cabinet: {}) cannot deactivate registration ID {} (Cabinet: {})",
                          actor.getEmail(), actor.getRole(), actorCabinetId, registration.getId(), registration.getCabinet().getIdSite());
                 throw new AccessDeniedException("You can only deactivate registrations within your own cabinet.");
            }
        }
        // --- End Permission Check ---

        // Registration already fetched above for permission check

        if (registration.isActive()) {
            registration.setActive(false);
            log.info("Deactivating registration ID {}", registration.getId());
            return userCabinetRegistrationRepository.save(registration);
        } else {
             log.info("Registration ID {} is already inactive.", registration.getId());
            return registration; // Already inactive, return current state
        }
    }


    // Note: The original activateUser/deactivateUser methods operating globally are removed/replaced.
    // The interface UserServiceInterface might need updating to reflect these changes.


    @Override
    @Transactional // Important pour la cohérence de l'opération delete/create
    public User changeUserRole(Long userId, Role newRole) {
        log.info("Attempting to change role for user ID {} to {}", userId, newRole);

        // --- Permission Check: Only Admin can change roles this way ---
        User actor = getCurrentAuthenticatedUser();
        if (actor.getRole() != Role.ADMIN) {
            log.warn("Permission Denied: User {} (Role: {}) attempted to change role for user ID {}.",
                     actor.getEmail(), actor.getRole(), userId);
            throw new AccessDeniedException("Only administrators can change user roles.");
        }
        // --- End Permission Check ---


        User targetUser = UsrRepo.findById(userId)
                .orElseThrow(() -> new AccountNotFoundException("User with ID " + userId + " not found for role change."));

        Role currentRole = targetUser.getRole();
        if (currentRole == newRole) {
            log.warn("User ID {} already has the target role {}. No change needed.", userId, newRole);
            return targetUser; // No change needed
        }

        // Prevent changing Admin role or changing to Admin role via this method (use specific endpoints/logic)
        if (currentRole == Role.ADMIN || newRole == Role.ADMIN) {
             log.error("Attempted to change role from/to ADMIN for user ID {}. This is not allowed via changeUserRole.", userId);
             throw new IllegalArgumentException("Cannot change role from or to ADMIN using this method.");
        }


        // --- Preserve Original Data ---
        // Use final variables for clarity within this scope
        final Long originalId = targetUser.getId(); // Keep the original ID!
        final String firstName = targetUser.getFirstName();
        final String lastName = targetUser.getLastName();
        final String email = targetUser.getEmail();
        final String passwordHash = targetUser.getPassword(); // Keep the hashed password
        final LocalDate birthDate = targetUser.getBirthDate();
        final String tel = targetUser.getTel();
        final String address = targetUser.getAddress();
        final String gender = targetUser.getGender();
        final byte[] photoProfil = targetUser.getPhotoProfil() != null ? targetUser.getPhotoProfil().clone() : null; // Clone byte array
        final LocalDate createdAt = targetUser.getCreatedAt(); // Keep original creation date

        // Preserve cabinet/registration info based on the *original* role
        CabinetDr originalCabinet = null; // For Doctor/Assistant
        List<UserCabinetRegistration> originalRegistrations = new ArrayList<>(); // For Patient

        if (targetUser instanceof Doctor) {
            originalCabinet = ((Doctor) targetUser).getCabinet();
             log.debug("Preserved cabinet ID {} for original Doctor {}", originalCabinet != null ? originalCabinet.getIdSite() : "null", email);
        } else if (targetUser instanceof Assistant) {
            originalCabinet = ((Assistant) targetUser).getCabinet();
             log.debug("Preserved cabinet ID {} for original Assistant {}", originalCabinet != null ? originalCabinet.getIdSite() : "null", email);
        } else if (targetUser instanceof Patient) {
            // Eagerly fetch registrations if lazy (though @Transactional should handle it)
            // Ensure registrations are loaded within the transaction
            originalRegistrations.addAll(userCabinetRegistrationRepository.findByUserId(originalId));
            log.debug("Preserved {} registrations for original Patient {}", originalRegistrations.size(), email);
        }
        // --- End Data Preservation ---


        // --- Delete Old User Record ---
        // Deleting the user might cascade delete registrations depending on JPA config (e.g., orphanRemoval=true on Patient's registrations)
        // It's crucial that relations are handled correctly.
        log.debug("Deleting original user record for ID: {}", originalId);
        UsrRepo.delete(targetUser);
        UsrRepo.flush(); // Ensure delete completes before potential insert with same ID (though JPA might handle this)
        log.debug("Original user record deleted.");
        // --- End Delete Old User Record ---


        // --- Create and Populate New User Instance ---
        User newUser;
        switch (newRole) {
            case DOCTOR:    newUser = new Doctor();    break;
            case ASSISTANT: newUser = new Assistant(); break;
            case PATIENT:   newUser = new Patient();   break;
            // ADMIN case already prevented above
            default: throw new IllegalStateException("Unexpected target role: " + newRole);
        }

        // Copy preserved attributes
        // IMPORTANT: Do NOT set the ID here. Let JPA generate it or handle potential conflicts if reusing IDs is intended (very risky).
        // If reusing ID is absolutely necessary, specific JPA strategies are needed. Assuming new ID generation for safety.
        // newUser.setId(originalId); // REMOVED - Let JPA handle ID generation or use specific strategy if reuse is intended.

        newUser.setFirstName(firstName);
        newUser.setLastName(lastName);
        newUser.setEmail(email); // Assuming email is unique constraint
        newUser.setPassword(passwordHash); // Keep original password
        newUser.setBirthDate(birthDate);
        newUser.setTel(tel);
        newUser.setAddress(address);
        newUser.setGender(gender);
        newUser.setPhotoProfil(photoProfil);
        newUser.setCreatedAt(createdAt); // Keep original creation date
        newUser.setUpdatedAt(LocalDate.now()); // Set new update date
        newUser.setRole(newRole);
        // Global isActive is removed
        log.debug("Populated new {} entity for email {}", newRole, email);
        // --- End Create and Populate New User Instance ---


        // --- Save New User Record (Get new ID) ---
        // Save first to get the new generated ID before linking registrations/cabinets
        log.info("Saving new user record for {} with role {}", email, newRole);
        User savedNewUser = userRepository.saveAndFlush(newUser); // Save and flush to get ID immediately
        log.info("Saved new user record with NEW ID: {} for email {}", savedNewUser.getId(), email);
        // --- End Save New User Record ---


        // --- Handle Cabinet/Registration Re-linking (Using savedNewUser with its new ID) ---
        try {
            if (savedNewUser instanceof Doctor || savedNewUser instanceof Assistant) {
                CabinetDr cabinetToAssign = null;
                if (targetUser instanceof Doctor || targetUser instanceof Assistant) {
                    // If original was D/A, use their cabinet
                    cabinetToAssign = originalCabinet;
                } else if (targetUser instanceof Patient && !originalRegistrations.isEmpty()) {
                    // If original was Patient, choose a cabinet from registrations (e.g., the first active one, or just the first)
                    cabinetToAssign = originalRegistrations.stream()
                                        .filter(reg -> reg.getCabinet() != null && reg.isActive()) // Ensure cabinet exists and prioritize active
                                        .findFirst()
                                        .map(UserCabinetRegistration::getCabinet)
                                        .orElse(originalRegistrations.stream() // Fallback to first registration with a cabinet
                                                .filter(reg -> reg.getCabinet() != null)
                                                .findFirst()
                                                .map(UserCabinetRegistration::getCabinet)
                                                .orElse(null)); // No cabinet if no registrations had one
                }

                if (cabinetToAssign != null) {
                     final Long cabinetIdToFind = cabinetToAssign.getIdSite();
                     // Fetch the managed instance of the cabinet before assigning
                     CabinetDr managedCabinet = cabinetDrRepository.findById(cabinetIdToFind)
                         .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Cabinet with ID " + cabinetIdToFind + " not found during role change re-linking."));

                    if (savedNewUser instanceof Doctor) {
                        // Check for potential constraint violation before assigning
                        boolean doctorExists = UsrRepo.existsDoctorByCabinetId(managedCabinet.getIdSite());
                        if (doctorExists) {
                             log.warn("Cannot assign cabinet ID {} to new Doctor {}: Another Doctor already exists in this cabinet. Manual assignment required.", managedCabinet.getIdSite(), email);
                             // Do not assign the cabinet - the Doctor will be created without one.
                        } else {
                            ((Doctor) savedNewUser).setCabinet(managedCabinet);
                            log.info("Assigned cabinet ID {} to new Doctor {}", managedCabinet.getIdSite(), email);
                        }
                    } else { // Assistant
                        ((Assistant) savedNewUser).setCabinet(managedCabinet);
                        log.info("Assigned cabinet ID {} to new Assistant {}", managedCabinet.getIdSite(), email);
                    }
                    // Save again to persist cabinet assignment
                    savedNewUser = userRepository.save(savedNewUser);

                } else {
                     log.warn("No cabinet could be determined to assign to new Doctor/Assistant {} during role change.", email);
                }

            } else if (savedNewUser instanceof Patient) {
                Patient newPatient = (Patient) savedNewUser;
                List<UserCabinetRegistration> newRegistrations = new ArrayList<>();

                if (targetUser instanceof Doctor || targetUser instanceof Assistant) {
                    // If original was D/A, create a single registration for their cabinet
                    if (originalCabinet != null) {
                         final Long originalCabinetId = originalCabinet.getIdSite();
                         CabinetDr managedCabinet = cabinetDrRepository.findById(originalCabinetId)
                             .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Cabinet with ID " + originalCabinetId + " not found during role change re-linking."));

                        UserCabinetRegistration newReg = new UserCabinetRegistration(newPatient, managedCabinet);
                        newReg.setActive(true); // Assume active when converting from D/A?
                        newRegistrations.add(newReg);
                        log.info("Creating new active registration for user {} changing to Patient in cabinet {}", email, managedCabinet.getIdSite());
                    } else {
                         log.warn("Original Doctor/Assistant {} had no cabinet assigned. Cannot create registration for new Patient.", email);
                    }
                } else if (targetUser instanceof Patient) {
                    // If original was Patient, re-create their registrations
                    log.info("Re-creating {} registrations for user {} changing role to Patient.", originalRegistrations.size(), email);
                    for (UserCabinetRegistration oldReg : originalRegistrations) {
                         if (oldReg.getCabinet() == null) {
                             log.warn("Skipping registration recreation for user {} because original registration had null cabinet.", email);
                             continue;
                         }
                         CabinetDr managedCabinet = cabinetDrRepository.findById(oldReg.getCabinet().getIdSite())
                             .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Cabinet with ID " + oldReg.getCabinet().getIdSite() + " not found during role change registration recreation."));

                        UserCabinetRegistration newReg = new UserCabinetRegistration(newPatient, managedCabinet);
                        newReg.setActive(oldReg.isActive()); // Preserve original status
                        newRegistrations.add(newReg);
                    }
                     log.info("Finished preparing {} registrations for user {}.", newRegistrations.size(), email);
                }
                // Batch save new registrations
                if (!newRegistrations.isEmpty()) {
                    userCabinetRegistrationRepository.saveAllAndFlush(newRegistrations);
                    log.info("Saved {} new registrations for patient {}", newRegistrations.size(), email);
                    // Refresh patient entity to reflect saved registrations if needed (depends on cascade types)
                    // savedNewUser = userRepository.findById(savedNewUser.getId()).orElseThrow(...); // Re-fetch
                }
            }
        } catch (Exception e) {
             log.error("Error during cabinet/registration re-linking for user {} (New ID: {}): {}", email, savedNewUser.getId(), e.getMessage(), e);
             // Consider how to handle this - transaction should roll back, but maybe specific error handling is needed.
             throw new RuntimeException("Failed to re-link cabinet/registrations during role change.", e);
        }
        // --- End Handle Cabinet/Registration Re-linking ---

        log.info("Role change process complete for original user ID {}. New user ID is {}.", originalId, savedNewUser.getId());
        return savedNewUser;
    }

    @Override // Add Override annotation
    public void savePasswordResetToken(User user, String token) {
        PasswordResetToken resetToken = new PasswordResetToken(token, user);
        tokenRepository.save(resetToken);
    }

    // --- Method for AuthController: Find all active users by email ---
    // Removed duplicate/obsolete findActiveUsersByEmail method block (Lines 524-560)
    // The correct version starts around line 663 and uses UserCabinetRegistrationRepository


    // --- Helper method for saving non-patient users (used by refactored addUser) ---
    // Removed duplicate saveUserInternal method block (Lines 564-574)
    // The correct version starts around line 697

     // --- Helper method for Patient Addition (used by refactored addUser) ---
    // Removed duplicate addPatient method block (Lines 577-661)
    // The correct version starts around line 710
// --- Method for AuthController: Find all active users by email ---
@Override
@Transactional(readOnly = true) // Important for potential lazy loading
public List<User> findActiveUsersByEmail(String email) {
    log.debug("Searching for users with active registrations by email: {}", email);

    // Use the UserCabinetRegistrationRepository to find active registrations
    List<UserCabinetRegistration> activeRegistrations = userCabinetRegistrationRepository.findActiveRegistrationsByUserEmail(email);

    // Extract unique users from these registrations
    List<User> activeUsersInCabinets = activeRegistrations.stream()
            .map(UserCabinetRegistration::getUser)
            .distinct()
            .collect(Collectors.toList());

    // Also check if an Admin exists with this email (Admins don't have registrations)
    User potentialAdmin = UsrRepo.findByEmail(email);
    List<User> finalUserList = new ArrayList<>(activeUsersInCabinets);

    if (potentialAdmin != null && potentialAdmin.getRole() == Role.ADMIN) {
        // Ensure Admin is not already in the list (shouldn't happen if logic is correct, but safe check)
        if (finalUserList.stream().noneMatch(u -> u.getId().equals(potentialAdmin.getId()))) {
            finalUserList.add(potentialAdmin);
            log.debug("Adding Admin user {} to the list of active users.", email);
        }
    }

    // Note: This method now returns users who are either Admin OR have at least one active registration.
    // The definition of "active user" has changed.
    log.debug("Found {} users (Admin or with active registrations) for email {}", finalUserList.size(), email);
    return finalUserList;
}


// --- Helper method for saving non-patient users (used by refactored addUser) ---
private User saveUserInternal(User user, boolean passwordToBeEncrypted) {
     if (passwordToBeEncrypted) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
    }
    // Set defaults if needed
     // user.setIsActive(false); // Removed global isActive
     user.setCreatedAt(LocalDate.now());
     user.setUpdatedAt(LocalDate.now());
    log.info("Saving internal user: {}", user.getEmail());
    return UsrRepo.save(user);
}

 // --- Helper method for Patient Addition (used by refactored addUser) ---
@Transactional // Should inherit transactionality, but explicit is fine
// Updated signature to accept cabinetId and initial active status
private Patient addPatient(Patient patient, Long targetCabinetId, boolean passwordToBeEncrypted, boolean initialRegistrationActive) {
    String email = patient.getEmail();
    log.info("Processing addPatient for email: {} into cabinet ID: {}, initialActive: {}",
             email, targetCabinetId, initialRegistrationActive);

    // Fetch the actual CabinetDr entity using the provided ID
    CabinetDr managedCabinet = cabinetDrRepository.findById(targetCabinetId)
            .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Target cabinet with ID " + targetCabinetId + " not found."));

    // 1. Check if this specific User+Cabinet registration already exists
    // We need to find the base User first by email, as Patient might not be the final model
    User baseUser = UsrRepo.findByEmail(email); // Find any user type by email

    Patient patientToSave; // This will be the Patient entity persisted/updated

    if (baseUser != null) {
        // User with this email exists. Ensure it's a Patient or handle appropriately.
        if (!(baseUser instanceof Patient)) {
             log.error("Cannot add patient registration for email {}: Existing user is not a Patient (Role: {})", email, baseUser.getRole());
             throw new IllegalStateException("User with this email already exists but is not a patient.");
        }
        patientToSave = (Patient) baseUser;
        log.info("Found existing patient record for email {}. Checking registration for cabinet ID {}.", email, targetCabinetId);

        // Check if registration already exists using the repository
        // boolean alreadyRegistered = userCabinetRegistrationRepository.existsByUserIdAndCabinetIdSite(patientToSave.getId(), targetCabinetId);
        boolean alreadyRegistered = userCabinetRegistrationRepository.findByUserIdAndCabinetIdSite(patientToSave.getId(), targetCabinetId).isPresent(); // Use findBy...().isPresent()

        if (!alreadyRegistered) {
             // Create and add the new registration link
             UserCabinetRegistration newRegistration = new UserCabinetRegistration();
             newRegistration.setUser(patientToSave); // Link to the existing Patient
             newRegistration.setCabinet(managedCabinet);
             // newRegistration.setRole(Role.PATIENT); // REMOVED - Role is on User, not Registration
             // Set active status based on context: TRUE if added via /add, potentially FALSE if via /addInactive
             // For *existing* patients getting a *new* registration via /add, we default to active.
             newRegistration.setActive(true);
             // Don't need patientToSave.addRegistration if cascade persist is set on User side,
             // saving the registration should be enough if UserCabinetRegistration owns the relationship.
             // Let's save the registration directly.
             userCabinetRegistrationRepository.save(newRegistration);
             log.debug("Created and saved new registration link for existing patient {} to cabinet {}", email, targetCabinetId);
             patientToSave.setUpdatedAt(LocalDate.now()); // Update timestamp on the base user
             // Need to save patientToSave again ONLY if we modified it directly (like timestamp)
             // If only registration was added, saving registration might be enough depending on cascades.
             // Let's save patientToSave to be safe for the timestamp update.
             UsrRepo.save(patientToSave);

        } else {
             log.warn("Patient {} already has a registration for cabinet {}. No action taken.", email, targetCabinetId);
             // Optionally, throw an exception here if adding again is strictly an error
             // throw new org.springframework.dao.DataIntegrityViolationException("Patient with email " + email + " is already registered in this cabinet.");
        }
        // Ensure we return the patient entity whether a registration was added
        // or if they were already registered.
        return patientToSave;

    } else {
        // No User with this email exists, create a new Patient and the initial registration.
        log.info("Creating new patient record for email {} with registration in cabinet ID {}.", email, targetCabinetId);
        patientToSave = patient; // Use the passed-in patient object

        // Hash password if needed
        if (passwordToBeEncrypted) {
             patientToSave.setPassword(passwordEncoder.encode(patient.getPassword()));
        }
        // Set defaults for the new Patient
         // patientToSave.setIsActive(false); // REMOVED - isActive is now managed by UserCabinetRegistration
         patientToSave.setCreatedAt(LocalDate.now());
         patientToSave.setUpdatedAt(LocalDate.now());
         patientToSave.setRole(Role.PATIENT); // Set role on base Patient object

         // IMPORTANT: Save the Patient *first* to get an ID
         Patient newlySavedPatient = UsrRepo.save(patientToSave);
         log.debug("Saved new Patient record with ID: {}", newlySavedPatient.getId());


        // Create the initial registration link
        UserCabinetRegistration initialRegistration = new UserCabinetRegistration();
        initialRegistration.setUser(newlySavedPatient); // Link to the newly saved Patient
        initialRegistration.setCabinet(managedCabinet); // Link to the correct cabinet
        // initialRegistration.setRole(Role.PATIENT); // REMOVED - Role is on User
        // Set active status based on the parameter passed to addUser
        initialRegistration.setActive(initialRegistrationActive);
        log.debug("Setting initial registration active status to: {}", initialRegistrationActive);

        // Save the registration
        userCabinetRegistrationRepository.save(initialRegistration);
        log.debug("Created and saved initial registration link for new patient {} to cabinet {}", newlySavedPatient.getEmail(), targetCabinetId);

        // Return the newly saved patient (which now has an ID and the registration is linked)
        return newlySavedPatient;}
    } // End of addPatient method block
	@Override
	public User findById(Long userId) {
        return UsrRepo.findById(userId).orElse(null);
 	}
	
	


    

    public void deleteUser(User user) {
        userRepository.delete(user);
    }

    // Méthode pour supprimer un Patient de la table Patient
    public void deletePatient(Patient patient) {
        userRepository.delete(patient);
    }
	@Override
	public User getUserById(Long id) {
        return UsrRepo.findById(id).orElse(null);
		
	}


	   @Override
	      @Transactional // Keep Transactional for consistency, though less critical now
	      public List<User> getFilteredActiveUsers(User currentUser) {
	          if (currentUser == null) {
	               log.error("getFilteredActiveUsers called with null currentUser.");
	              return new ArrayList<>();
	          }

	          log.info("Fetching filtered active users for user: {}", currentUser.getEmail());
	          List<User> filteredUsers = new ArrayList<>(); // Initialize empty list

	          if (currentUser.getRole() == Role.ADMIN) {
	              // Admin sees all active users except themselves
	              final Long currentUserId = currentUser.getId();
	              log.info("Current user is ADMIN (ID: {}). Fetching all active users and filtering out self.", currentUserId);
	              // Fetch all active users directly - This needs rethinking. "Active" now means having at least one active registration.
                  // This simple findByIsActive(true) is no longer valid.
                  // TODO: Refactor Admin view to fetch users with active registrations.
	              log.warn("Admin view in getFilteredActiveUsers needs refactoring for new registration model.");
	              // List<User> allActiveUsers = UsrRepo.findByIsActive(true); // Old logic
                  List<User> allUsers = UsrRepo.findAll(); // Temporary: Fetch all, then filter later if needed
	              filteredUsers = allUsers.stream() // Placeholder: filter out self for now
	                      .filter(user -> !user.getId().equals(currentUserId))
                          // .filter(user -> hasActiveRegistration(user)) // Need a helper method like this
	                      .collect(Collectors.toList());
	              log.info("Filtered list size for ADMIN: {}", filteredUsers.size());

	          } else if (currentUser.getRole() == Role.DOCTOR || currentUser.getRole() == Role.ASSISTANT) {
	              // Doctor/Assistant logic: Use specific repository methods
	              CabinetDr userCabinet = null;
	              // Assuming currentUser passed in has cabinet loaded (e.g., from findByEmail which is @Transactional)
	              if (currentUser instanceof Doctor) {
	                  userCabinet = ((Doctor) currentUser).getCabinet();
	              } else if (currentUser instanceof Assistant) {
	                  userCabinet = ((Assistant) currentUser).getCabinet();
	              }

	              if (userCabinet == null) {
	                   log.warn("Doctor/Assistant {} has no cabinet assigned. Returning empty list.", currentUser.getEmail());
	                  return new ArrayList<>(); // Return empty list if no cabinet
	              }

	              final Long cabinetId = userCabinet.getIdSite();
	              log.info("Current user is Doctor/Assistant for cabinet ID: {}. Fetching active users for this cabinet.", cabinetId);

              // Fetch users directly using new repository methods
              // Remove duplicate additions below
              // filteredUsers.addAll(UsrRepo.findActiveDoctorsByCabinetId(cabinetId)); // Removed as per request
              filteredUsers.addAll(UsrRepo.findActiveAssistantsByCabinetId(cabinetId)); // Fetches active assistants
              filteredUsers.addAll(UsrRepo.findActivePatientsByCabinetId(cabinetId)); // Fetches active patients

	              // Ensure uniqueness before returning
	              List<User> uniqueFilteredUsers = filteredUsers.stream()
	                                                            .distinct() // Uses User's equals/hashCode based on ID
	                                                            .collect(Collectors.toList());

	              log.info("Total unique filtered list size for Doctor/Assistant (Cabinet ID {}): {}", cabinetId, uniqueFilteredUsers.size());
	              // Return the unique list
	              return uniqueFilteredUsers;

	          } else {
	              // Other roles see no users in this filtered view
	              log.info("User role {} has no access to this filtered list.", currentUser.getRole());
	              // filteredUsers remains empty
	          }

	          return filteredUsers;
	      }


	      @Override
	      @Transactional // Keep Transactional for consistency
	      public List<User> getFilteredInactiveUsers(User currentUser) {
	          if (currentUser == null) {
	              log.error("getFilteredInactiveUsers called with null currentUser.");
	              return new ArrayList<>();
	          }

	          log.info("Fetching filtered inactive users for user: {}", currentUser.getEmail());
	          List<User> filteredUsers = new ArrayList<>(); // Initialize empty list

	          if (currentUser.getRole() == Role.ADMIN) {
	              // Admin sees all inactive users - "Inactive" now means having NO active registrations.
                  // This simple findByIsActive(false) is no longer valid.
	              log.warn("Admin view in getFilteredInactiveUsers needs refactoring for new registration model.");
	              // Fetch all inactive users directly
	              // filteredUsers = UsrRepo.findByIsActive(false); // Old logic
                  List<User> allUsers = UsrRepo.findAll(); // Temporary: Fetch all
                  filteredUsers = allUsers.stream()
                          // .filter(user -> !hasActiveRegistration(user)) // Need a helper method like this
                          .collect(Collectors.toList()); // Placeholder
	              log.info("Filtered list size for ADMIN (inactive - placeholder): {}", filteredUsers.size());

	          } else if (currentUser.getRole() == Role.DOCTOR || currentUser.getRole() == Role.ASSISTANT) {
	              // Doctor/Assistant logic: Use specific repository methods for inactive users
	              CabinetDr userCabinet = null;
	              // Assuming currentUser passed in has cabinet loaded
	              if (currentUser instanceof Doctor) {
	                  userCabinet = ((Doctor) currentUser).getCabinet();
	              } else if (currentUser instanceof Assistant) {
	                  userCabinet = ((Assistant) currentUser).getCabinet();
	              }

	              if (userCabinet == null) {
	                  log.warn("Doctor/Assistant {} has no cabinet assigned. Returning empty list for inactive users.", currentUser.getEmail());
	                  return new ArrayList<>(); // Return empty list if no cabinet
	              }

	              final Long cabinetId = userCabinet.getIdSite();
	              log.info("Current user is Doctor/Assistant for cabinet ID: {}. Fetching inactive users (Patients only) for this cabinet.", cabinetId);

	              // Fetch inactive users directly using new repository methods
	              // filteredUsers.addAll(UsrRepo.findInactiveDoctorsByCabinetId(cabinetId)); // Removed
	              // filteredUsers.addAll(UsrRepo.findInactiveAssistantsByCabinetId(cabinetId)); // Removed
	              filteredUsers.addAll(UsrRepo.findInactivePatientsByCabinetId(cabinetId)); // Only fetch inactive patients

	              log.info("Total filtered list size for Doctor/Assistant (Inactive Patients, Cabinet ID {}): {}", cabinetId, filteredUsers.size());

	          } else {
	              // Other roles see no users in this filtered view
	              log.info("User role {} has no access to this filtered inactive list.", currentUser.getRole());
	              // filteredUsers remains empty
	          }

	          return filteredUsers;
	      }

		@Override
		public List<User> findInactiveUsersByCabinetId(Long cabinetId) {
			// TODO Auto-generated method stub
			// TODO: Implement this method properly if needed, or remove if redundant.
			// Currently returns null, which might cause NullPointerExceptions if used.
			log.warn("findInactiveUsersByCabinetId is not fully implemented.");
			return new ArrayList<>(); // Return empty list instead of null
		}

	    @Override
	    @Transactional(readOnly = true)
	    public boolean existsByEmailAndFirstNameAndLastNameInCabinet(String email, String firstName, String lastName, Long cabinetId) {
	        log.debug("Checking existence for email: {}, name: {} {}, cabinetId: {}", email, firstName, lastName, cabinetId);
	        if (cabinetId == null) {
	            log.warn("existsByEmailAndFirstNameAndLastNameInCabinet called with null cabinetId. Returning false.");
	            return false; // Cannot exist in a null cabinet
	        }
	        // Assuming UserRepository has a method like this (we'll add it if needed)
	        // This query needs to specifically check Patients associated with the cabinet.
	        return UsrRepo.existsPatientByEmailAndFirstNameAndLastNameAndCabinetId(email, firstName, lastName, cabinetId);
	    }
/* 
    // --- Implementation for AuthController ---
    @Override
    @Transactional(readOnly = true) // Ensure transaction for potential lazy loading
    public List<User> findActiveUsersByEmail(String email) {
        log.debug("Finding active users by email: {}", email);
        // Assuming UserRepository has a method like findByEmailAndIsActiveTrue
        // Need to add this method to UserRepository interface and potentially query
        // List<User> users = UsrRepo.findByEmailAndIsActiveTrue(email); // Old logic based on global isActive
        // New logic: Find active *registrations* by email
        log.debug("Finding active registrations by email: {}", email);
        List<UserCabinetRegistration> activeRegistrations = userCabinetRegistrationRepository.findActiveRegistrationsByUserEmail(email);
        log.debug("Found {} active registrations for email {}", activeRegistrations.size(), email);

        // Extract unique users from the active registrations
        List<User> users = activeRegistrations.stream()
                                            .map(UserCabinetRegistration::getUser)
                                            .distinct()
                                            .collect(Collectors.toList());

        // Eagerly load necessary associations if needed within the transaction
        // The query in UserCabinetRegistrationRepository might already fetch users eagerly,
        // but explicit loading here ensures data is available if needed later by the caller.
        // For example, load cabinets for non-admin users
        users.forEach(user -> {
             if (user instanceof Doctor) {
                 ((Doctor) user).getCabinet(); // Trigger load
             } else if (user instanceof Assistant) {
                 ((Assistant) user).getCabinet(); // Trigger load
             } else if (user instanceof Patient) {
                 // Eagerly load registrations instead of cabinets
                 ((Patient) user).getRegistrations().size(); // Trigger load of the collection
             }
        });
        return users;
    }


*/



















    @Override
    // Removed duplicate @Override
    @Transactional(readOnly = true)
    public List<User> getActivePatientsByCabinetId(Long cabinetId) {
        log.info("Fetching active patients for cabinet ID: {}", cabinetId);
        if (cabinetId == null) {
            log.error("getActivePatientsByCabinetId called with null cabinetId.");
            return new ArrayList<>();
        }
        // Utilise la méthode existante du repository qui filtre par rôle Patient et statut actif de l'enregistrement
        List<User> activePatients = UsrRepo.findActivePatientsByCabinetId(cabinetId);
        log.info("Found {} active patients for cabinet ID: {}", activePatients.size(), cabinetId);
        return activePatients;
    }


    @Override // Add missing Override annotation
    @Transactional
    // Renamed method to reflect it can handle more than just patients, though action differs
    public UserCabinetRegistration toggleUserRegistrationStatus(Long userId, Long cabinetId) {
        log.info("Attempting to toggle registration status for user ID {} in cabinet ID {}", userId, cabinetId);

        // Find the specific registration
        // Use userId instead of patientId
        UserCabinetRegistration registration = userCabinetRegistrationRepository.findByUserIdAndCabinetIdSite(userId, cabinetId)
                .orElseThrow(() -> {
                    log.error("Toggle status failed: Registration not found for User ID {} and Cabinet ID {}", userId, cabinetId);
                    // Use a more generic message
                    return new AccountNotFoundException("User registration not found in the specified cabinet.");
                });

        User targetUser = registration.getUser();

        // Check if the user is a Patient or Assistant before toggling isActive
        if (targetUser != null && (targetUser.getRole() == Role.PATIENT || targetUser.getRole() == Role.ASSISTANT)) {
            // Toggle the status for Patients or Assistants
            boolean currentStatus = registration.isActive();
            registration.setActive(!currentStatus);
            log.info("Toggling registration status for {} (User ID {}, Cabinet ID {}) from {} to {}",
                     targetUser.getRole(), userId, cabinetId, currentStatus, !currentStatus);

            // Save the updated registration
            UserCabinetRegistration updatedRegistration = userCabinetRegistrationRepository.save(registration);

            // Update the user's updatedAt timestamp
            targetUser.setUpdatedAt(LocalDate.now());
            UsrRepo.save(targetUser); // Save the user entity as well

            log.info("Successfully toggled registration status for registration ID {}", updatedRegistration.getId());
            return updatedRegistration;
        } else {
             // Handle other roles or null user if necessary
             String roleName = (targetUser != null) ? targetUser.getRole().name() : "null";
             log.error("Toggle status failed: User ID {} (Role: {}) associated with registration ID {} is not a Patient or Assistant.", userId, roleName, registration.getId());
             // Throw specific exception
             throw new IllegalArgumentException("Status toggle is only applicable to Patient or Assistant registrations.");
        }
        // No return needed here if exception is thrown or handled above
    }

    // --- deleteUserRegistration Method Modification ---
    // Keep only one instance of this method
    @Override
    @Transactional
    public void deleteUserRegistration(Long actingUserId, Long targetUserId, Long cabinetId) {
        // Fetch actor and target user first
        User actor = UsrRepo.findById(actingUserId)
                .orElseThrow(() -> new AccountNotFoundException("Acting user with ID " + actingUserId + " not found."));
        User targetUser = UsrRepo.findById(targetUserId)
                .orElseThrow(() -> new AccountNotFoundException("Target user with ID " + targetUserId + " not found."));

        log.info("User {} (Role: {}) attempting delete action on User {} (Role: {}) in context of Cabinet ID: {}",
                 actor.getEmail(), actor.getRole(), targetUser.getEmail(), targetUser.getRole(), cabinetId);

        // --- Permission Check (REMOVED - Controller performs pre-check) ---
        // The controller's checkPermissions method already verifies cabinet access before calling this service method.
        // checkCabinetPermission(actor, targetUser);
        // --- End Permission Check ---

        // --- Role-Specific Deletion Logic ---
        if (targetUser.getRole() == Role.PATIENT) {
            // Find the specific registration linking the patient to the actor's cabinet
            UserCabinetRegistration registration = userCabinetRegistrationRepository.findByUserIdAndCabinetIdSite(targetUserId, cabinetId)
                    .orElseThrow(() -> {
                        log.warn("Delete failed: Patient {} (ID: {}) has no registration in Cabinet ID {}.",
                                 targetUser.getEmail(), targetUserId, cabinetId);
                        return new AccountNotFoundException("Patient registration not found in the specified cabinet.");
                    });

            log.info("User {} deleting Patient registration ID {} (User: {}, Cabinet: {})",
                     actor.getEmail(), registration.getId(), targetUserId, cabinetId);
            userCabinetRegistrationRepository.delete(registration); // Delete the specific registration

            // Check if the Patient has any remaining registrations
            List<UserCabinetRegistration> remainingRegistrations = userCabinetRegistrationRepository.findByUserId(targetUserId);
            if (remainingRegistrations.isEmpty()) {
                log.info("Patient {} (ID: {}) has no remaining registrations. Deleting User record.", targetUser.getEmail(), targetUserId);
                UsrRepo.delete(targetUser); // Delete the User record
            } else {
                log.info("Patient {} (ID: {}) still has {} other registrations. User record not deleted.", targetUser.getEmail(), targetUserId, remainingRegistrations.size());
            }

        } else if (targetUser.getRole() == Role.ASSISTANT) {
            // Permission check already verified the actor (Doctor/Assistant) is in the same cabinet as the target Assistant.
            // Assistants are deleted directly when action is initiated by Doctor/Assistant in the same cabinet.
            // Permission check already verified the actor (Doctor/Assistant) is in the same cabinet as the target Assistant.
            // Assistants are deleted directly when action is initiated by Doctor/Assistant in the same cabinet.
            log.info("User {} deleting Assistant {} (ID: {}) directly.",
                     actor.getEmail(), targetUser.getEmail(), targetUserId);
            // Delete the targetUser fetched at the beginning of the method
            UsrRepo.delete(targetUser);
            log.info("Successfully called delete for Assistant User record ID: {}", targetUserId);

        } else {
            // Doctors cannot be deleted by other Doctors/Assistants via this method. Admins use the global deleteUser.
            log.warn("Permission Denied: User {} (Role: {}) cannot delete user {} (Role: {}) using the cabinet-specific delete method.",
                     actor.getEmail(), actor.getRole(), targetUser.getEmail(), targetUser.getRole());
            throw new AccessDeniedException("This action is not permitted for the target user's role via this endpoint.");
        }
        // --- End Role-Specific Deletion Logic ---
    }
    // --- End deleteUserRegistration Method ---

    // --- Toggle Status for Doctor/Assistant ---
    @Override // Added back now that interface is updated
    @Transactional
    public User toggleDoctorAssistantStatus(Long targetUserId) {
        log.info("Attempting to toggle direct isActive status for user ID {}", targetUserId);

        User actor = getCurrentAuthenticatedUser();
        User targetUser = UsrRepo.findById(targetUserId)
                .orElseThrow(() -> new AccountNotFoundException("User with ID " + targetUserId + " not found for status toggle."));

        // Permission Check: Only Admin or Doctor/Assistant in the same cabinet (acting on Assistant)
        checkCabinetPermission(actor, targetUser); // Reuse existing permission check

        // Ensure target is Doctor or Assistant
        if (!(targetUser instanceof Doctor) && !(targetUser instanceof Assistant)) {
            log.error("Toggle status failed: User ID {} is not a Doctor or Assistant (Role: {}).", targetUserId, targetUser.getRole());
            throw new IllegalArgumentException("Direct status toggle is only applicable to Doctors and Assistants.");
        }

        // Perform the toggle based on the specific type
        boolean currentStatus;
        if (targetUser instanceof Doctor) {
            Doctor doctor = (Doctor) targetUser;
            currentStatus = doctor.isActive();
            doctor.setActive(!currentStatus);
            log.info("Toggling Doctor {} status from {} to {}", targetUser.getEmail(), currentStatus, !currentStatus);
        } else { // Assistant
            Assistant assistant = (Assistant) targetUser;
            currentStatus = assistant.isActive();
            assistant.setActive(!currentStatus);
            log.info("Toggling Assistant {} status from {} to {}", targetUser.getEmail(), currentStatus, !currentStatus);
        }

        targetUser.setUpdatedAt(LocalDate.now()); // Update timestamp
        User savedUser = UsrRepo.save(targetUser); // Save the updated user
        log.info("Successfully toggled direct status for user ID {}", targetUserId);
        return savedUser;
    }
    // --- End Toggle Status for Doctor/Assistant ---


    // --- New Method for Patient Transfer ---
    @Override
    @Transactional
    public User transferPatientToRole(Long actingUserId, Long patientUserId, Long targetCabinetId, Role targetRole) {
        log.info("Attempting transfer: Actor ID {}, Patient ID {}, Target Cabinet ID {}, Target Role {}",
                 actingUserId, patientUserId, targetCabinetId, targetRole);

        // 1. Fetch Entities
        User actor = UsrRepo.findById(actingUserId)
                .orElseThrow(() -> new AccountNotFoundException("Acting user with ID " + actingUserId + " not found."));
        User userToTransfer = UsrRepo.findById(patientUserId)
                .orElseThrow(() -> new AccountNotFoundException("Patient user with ID " + patientUserId + " not found."));
        CabinetDr targetCabinet = cabinetDrRepository.findById(targetCabinetId)
                .orElseThrow(() -> new AccountNotFoundException("Target cabinet with ID " + targetCabinetId + " not found."));

        // 2. Validate Input Types
        if (!(userToTransfer instanceof Patient)) {
            log.error("Transfer failed: User ID {} is not a Patient (Role: {}).", patientUserId, userToTransfer.getRole());
            throw new IllegalArgumentException("The user being transferred must be a Patient.");
        }
        Patient patient = (Patient) userToTransfer; // Cast for easier access

        if (targetRole != Role.DOCTOR && targetRole != Role.ASSISTANT) {
            log.error("Transfer failed: Invalid target role specified: {}", targetRole);
            throw new IllegalArgumentException("Target role must be DOCTOR or ASSISTANT.");
        }

        // 3. Permission Check
        // Admin can transfer anyone to any cabinet.
        // Doctor/Assistant can only transfer patients *from* their own cabinet *to* their own cabinet.
        if (actor.getRole() != Role.ADMIN) {
            Long actorCabinetId = null;
            if (actor instanceof Doctor) actorCabinetId = ((Doctor) actor).getCabinetId();
            else if (actor instanceof Assistant) actorCabinetId = ((Assistant) actor).getCabinetId();

            if (actorCabinetId == null || !actorCabinetId.equals(targetCabinetId)) {
                log.warn("Permission Denied: Actor {} (Role: {}, Cabinet: {}) cannot transfer patient to target cabinet {}.",
                         actor.getEmail(), actor.getRole(), actorCabinetId, targetCabinetId);
                throw new AccessDeniedException("You can only transfer patients within your own cabinet.");
            }
            // Also check if the patient is actually registered in the actor's cabinet
            boolean patientInActorsCabinet = userCabinetRegistrationRepository
                    .existsByUserIdAndCabinetIdSite(patientUserId, actorCabinetId);
            if (!patientInActorsCabinet) {
                 log.warn("Permission Denied: Patient {} (ID: {}) is not registered in Actor {}'s cabinet (ID: {}).",
                          patient.getEmail(), patientUserId, actor.getEmail(), actorCabinetId);
                 throw new AccessDeniedException("The patient is not registered in your cabinet.");
            }
        }
        log.debug("Permission check passed for actor {} transferring patient {} to cabinet {}", actor.getEmail(), patient.getEmail(), targetCabinetId);


        // 4. Doctor Constraint Check
        if (targetRole == Role.DOCTOR) {
            boolean doctorExists = UsrRepo.existsDoctorByCabinetId(targetCabinetId);
            if (doctorExists) {
                log.warn("Transfer to Doctor failed: Cabinet ID {} already has a Doctor.", targetCabinetId);
                // Throw specific exception that can be caught by controller for a 409 Conflict response
                throw new DataIntegrityViolationException("This cabinet already contains a doctor.");
            }
        }

        // 5. Create New Doctor/Assistant Instance
        User newUser;
        if (targetRole == Role.DOCTOR) {
            newUser = new Doctor();
            ((Doctor) newUser).setActive(true); // Set active as per requirement
            ((Doctor) newUser).setCabinet(targetCabinet);
        } else { // Assistant
            newUser = new Assistant();
            ((Assistant) newUser).setActive(true); // Set active as per requirement
            ((Assistant) newUser).setCabinet(targetCabinet);
        }

        // 6. Copy Details from Patient
        newUser.setFirstName(patient.getFirstName());
        newUser.setLastName(patient.getLastName());
        newUser.setEmail(patient.getEmail()); // Assume email is unique and should be kept
        newUser.setPassword(patient.getPassword()); // Keep original hashed password
        newUser.setBirthDate(patient.getBirthDate());
        newUser.setTel(patient.getTel());
        newUser.setAddress(patient.getAddress());
        newUser.setGender(patient.getGender());
        newUser.setPhotoProfil(patient.getPhotoProfil() != null ? patient.getPhotoProfil().clone() : null);
        newUser.setCreatedAt(patient.getCreatedAt()); // Keep original creation date
        newUser.setUpdatedAt(LocalDate.now()); // Set new update date
        newUser.setRole(targetRole);
        // Note: ID will be generated upon saving

        // 7. Save New User Record
        log.info("Saving new {} record for email {} linked to cabinet {}", targetRole, newUser.getEmail(), targetCabinetId);
        User savedNewUser = UsrRepo.save(newUser);
        log.info("Saved new user with ID: {}", savedNewUser.getId());

        // 8. Delete Patient's Registration for the Target Cabinet
        UserCabinetRegistration registrationToDelete = userCabinetRegistrationRepository
                .findByUserIdAndCabinetIdSite(patientUserId, targetCabinetId)
                .orElseThrow(() -> {
                    // This should ideally not happen if permission checks passed, but safety first
                    log.error("Critical Error: Registration for Patient ID {} in Cabinet ID {} not found during transfer cleanup.", patientUserId, targetCabinetId);
                    return new AccountNotFoundException("Patient registration unexpectedly not found in the target cabinet during transfer cleanup.");
                });

        log.info("Deleting registration ID {} (Patient: {}, Cabinet: {})",
                 registrationToDelete.getId(), patientUserId, targetCabinetId);
        userCabinetRegistrationRepository.delete(registrationToDelete);

        // 9. Check Remaining Registrations and Delete Patient if None Left
        List<UserCabinetRegistration> remainingRegistrations = userCabinetRegistrationRepository.findByUserId(patientUserId);
        if (remainingRegistrations.isEmpty()) {
            log.info("Patient {} (ID: {}) has no remaining registrations after transfer. Deleting Patient record.", patient.getEmail(), patientUserId);
            UsrRepo.delete(patient); // Delete the original Patient record
        } else {
            log.info("Patient {} (ID: {}) still has {} other registrations. Original Patient record retained.", patient.getEmail(), patientUserId, remainingRegistrations.size());
        }

        log.info("Transfer successful. New {} (ID: {}) created for email {}.", targetRole, savedNewUser.getId(), savedNewUser.getEmail());
        return savedNewUser; // Return the newly created Doctor or Assistant
    }
    // --- End New Method for Patient Transfer ---


    // --- New Method for Admin: Get Patients with Registrations ---
    @Override
    @Transactional(readOnly = true) // Read-only transaction
    public List<dto.PatientWithRegistrationsDTO> getAllPatientsWithRegistrations() {
        log.info("Fetching all patients with their registrations for Admin view.");

        // 1. Fetch all users with the PATIENT role
        List<User> allUsers = UsrRepo.findByRole(Role.PATIENT);
        List<Patient> allPatients = allUsers.stream()
                                            .filter(Patient.class::isInstance)
                                            .map(Patient.class::cast)
                                            .collect(Collectors.toList());

        log.debug("Found {} users with PATIENT role.", allPatients.size());

        // 2. Map each Patient to the DTO, including their registrations
        List<dto.PatientWithRegistrationsDTO> results = new ArrayList<>();
        for (Patient patient : allPatients) {
            // Fetch registrations for the current patient
            // Using the existing repository method findByUserId
            List<UserCabinetRegistration> registrations = userCabinetRegistrationRepository.findByUserId(patient.getId());

            // Map registrations to CabinetRegistrationInfoDTO
            List<dto.CabinetRegistrationInfoDTO> regInfoDTOs = registrations.stream()
                .map(reg -> new dto.CabinetRegistrationInfoDTO(
                    reg.getCabinet() != null ? reg.getCabinet().getIdSite() : null, // Handle null cabinet just in case
                    reg.getCabinet() != null ? reg.getCabinet().getName() : "N/A", // Handle null cabinet
                    reg.isActive()
                ))
                .collect(Collectors.toList());

            // Create the main DTO for the patient
            dto.PatientWithRegistrationsDTO patientDTO = new dto.PatientWithRegistrationsDTO(
                patient.getId(),
                patient.getFirstName(),
                patient.getLastName(),
                patient.getEmail(),
                patient.getBirthDate(),
                patient.getTel(),
                patient.getAddress(),
                patient.getGender(),
                patient.getRole(), // Should be PATIENT
                regInfoDTOs
            );
            results.add(patientDTO);
        }

        log.info("Returning {} patients with registration details.", results.size());
        return results;
    }
    // --- End New Method for Admin ---


    // --- Implementation for Change Password ---
    @Override
    @Transactional // Ensure atomicity
    public boolean changeUserPassword(String email, String oldPassword, String newPassword) {
        User user = userRepository.findByEmail(email);
        if (user == null) {
            log.warn("Attempt to change password for non-existent user: {}", email);
            throw new AccountNotFoundException("User not found with email: " + email);
        }

        // Check if the provided old password matches the stored hashed password
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            log.warn("Incorrect old password provided for user: {}", email);
            return false; // Indicate incorrect old password
        }

        // Optional: Add password strength validation here if needed
        // Example: Minimum length check
        if (newPassword == null || newPassword.length() < 8) {
             throw new IllegalArgumentException("New password must be at least 8 characters long.");
        }
        // Add more checks (uppercase, lowercase, number, symbol) if required by policy

        // Encode the new password
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDate.now()); // Update timestamp

        // Save the user with the new password
        userRepository.save(user);
        log.info("Password successfully changed for user: {}", email);
        return true; // Indicate success
    }
    // --- End Implementation for Change Password ---

    // --- Implementation for findActivePatientByCabinetAndName ---
    @Override
    @Transactional(readOnly = true) // Read-only as we are just searching
    public Optional<Patient> findActivePatientByCabinetAndName(Long cabinetId, String firstName, String lastName) {
        log.debug("Searching for active patient with name '{} {}' in cabinet ID {}", firstName, lastName, cabinetId);

        // Call the updated repository method which directly returns Optional<Patient>
        Optional<Patient> patientOpt = userCabinetRegistrationRepository
                .findActivePatientByUserFirstNameAndLastNameAndCabinetId(firstName, lastName, cabinetId);

        if (patientOpt.isPresent()) {
            log.info("Active patient found for name '{} {}' in cabinet {}: ID {}", firstName, lastName, cabinetId, patientOpt.get().getId());
        } else {
            log.warn("Active patient not found for name '{} {}' in cabinet {}", firstName, lastName, cabinetId);
        }

        // Directly return the result from the repository method
        return patientOpt;
    }
    // --- End Implementation for findActivePatientByCabinetAndName ---
// The updateUserProfilePicture method is now integrated into updateUserAndPhoto
// and can be removed if no longer called directly.

	@Override
	public User updateUser(Long id, UserUpdateDTO userDetailsDTO) {
		// TODO Auto-generated method stub
		return null;
	}
}
