package pi.pperformance.elite.UserServices;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.stereotype.Service;

import pi.pperformance.elite.UserRepository.UserRepository;
import pi.pperformance.elite.entities.Role;
import pi.pperformance.elite.entities.User;
import pi.pperformance.elite.Authentif.CustomUserDetails; // Import CustomUserDetails
import pi.pperformance.elite.UserRepository.DoctorCentreDexamenRepository; // Import DoctorCentreDexamenRepository
import pi.pperformance.elite.entities.DoctorCentreDexamen; // Import DoctorCentreDexamen
import pi.pperformance.elite.entities.AdminCentreExamen; // Import AdminCentreExamen

import java.util.Optional; // Import Optional
import org.slf4j.Logger; // Add logger import
import org.slf4j.LoggerFactory; // Add logger import

@Service
public class MyUserDetailsService implements UserDetailsService {

    private static final Logger log = LoggerFactory.getLogger(MyUserDetailsService.class); // Add logger instance

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DoctorCentreDexamenRepository doctorCentreDexamenRepository; // Inject DoctorCentreDexamenRepository

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        log.info("Attempting to load user by email: {}", email); // Log email being searched
        // Fetch the user by email
        User user = userRepository.findByEmail(email);
        if (user == null) {
            log.warn("User not found with email: {}", email); // Log if not found
            throw new UsernameNotFoundException("User not found with email: " + email);
        }
        // Log user ID as well
        log.info("User found with email: {}. ID: {}. Role: {}", email, user.getId(), user.getRole());

        // Removed isActive check here. The UserDetails.isEnabled() is checked by Spring Security.
        // Our User entity implements isEnabled() to return true.
        // Cabinet-specific activation is checked later in AuthController.

        // Get the role from the user and map it to a SimpleGrantedAuthority
        Role userRole = user.getRole();
        if (userRole == null) {
            throw new UsernameNotFoundException("User does not have a valid role.");
        }

        SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + userRole.name());

        Long centreId = null;
        // If the user is an ADMIN_CENTRE_EXAMEN or DOCTOR_CENTRE_EXAMEN, get their associated centre ID
        if (userRole == Role.ADMIN_CENTRE_EXAMEN) {
            if (user instanceof AdminCentreExamen) {
                AdminCentreExamen adminCentreExamenUser = (AdminCentreExamen) user;
                if (adminCentreExamenUser.getCentreDexamen() != null && adminCentreExamenUser.getCentreDexamen().getIdCentre() != null) {
                    centreId = adminCentreExamenUser.getCentreDexamen().getIdCentre();
                    log.info("Loaded Centre ID {} from AdminCentreExamen object for user {}", centreId, email);
                } else {
                    log.error("ADMIN_CENTRE_EXAMEN user {} found but has no associated CentreDexamen. This user will not have a centreId claim in the token.", email);
                }
            } else {
                log.error("User with role ADMIN_CENTRE_EXAMEN is not an instance of AdminCentreExamen: {}. This indicates a potential data inconsistency or mapping issue. This user will not have a centreId claim in the token.", email);
            }
        } else if (userRole == Role.DOCTOR_CENTRE_EXAMEN) {
             if (user instanceof DoctorCentreDexamen) {
                 DoctorCentreDexamen doctorCentreExamenUser = (DoctorCentreDexamen) user;
                 if (doctorCentreExamenUser.getCentreDexamen() != null && doctorCentreExamenUser.getCentreDexamen().getIdCentre() != null) {
                     centreId = doctorCentreExamenUser.getCentreDexamen().getIdCentre();
                     log.info("Loaded Centre ID {} from DoctorCentreDexamen object for user {}", centreId, email);
                 } else {
                     log.error("DOCTOR_CENTRE_EXAMEN user {} found but has no associated CentreDexamen. This user will not have a centreId claim in the token.", email);
                 }
             } else {
                 log.error("User with role DOCTOR_CENTRE_EXAMEN is not an instance of DoctorCentreDexamen: {}. This indicates a potential data inconsistency or mapping issue. This user will not have a centreId claim in the token.", email);
             }
        }

        // Log the final centreId before creating CustomUserDetails
        log.info("Final centreId for user {}: {}", email, centreId);


        // Return CustomUserDetails including the user ID and centre ID
        return new CustomUserDetails(
                user.getId(), // Pass the user ID
                user.getEmail(),
                user.getPassword(),
                // Pass other UserDetails flags (enabled, etc.) - assuming they are true based on previous logic
                true, true, true, true,
                List.of(authority),
                centreId // Pass the centre ID (will be null for other roles)
        );
    }

    // Removed obsolete methods getUsersByIsActive and getactiveUsers
}
