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

import org.slf4j.Logger; // Add logger import
import org.slf4j.LoggerFactory; // Add logger import

@Service
public class MyUserDetailsService implements UserDetailsService {

    private static final Logger log = LoggerFactory.getLogger(MyUserDetailsService.class); // Add logger instance

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        log.info("Attempting to load user by email: {}", email); // Log email being searched
        // Fetch the user by email
        User user = userRepository.findByEmail(email);
        if (user == null) {
            log.warn("User not found with email: {}", email); // Log if not found
            throw new UsernameNotFoundException("User not found with email: " + email);
        }
        log.info("User found with email: {}. Role: {}", email, user.getRole()); // Log if found

        // Removed isActive check here. The UserDetails.isEnabled() is checked by Spring Security.
        // Our User entity implements isEnabled() to return true.
        // Cabinet-specific activation is checked later in AuthController.

        // Get the role from the user and map it to a SimpleGrantedAuthority
        Role userRole = user.getRole();
        if (userRole == null) {
            throw new UsernameNotFoundException("User does not have a valid role.");
        }
        
        SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + userRole.name());

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                List.of(authority)
        );
    }

    // Removed obsolete methods getUsersByIsActive and getactiveUsers
}
