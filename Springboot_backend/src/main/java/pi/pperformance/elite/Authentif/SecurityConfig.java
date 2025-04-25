package pi.pperformance.elite.Authentif;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer; // Add this import
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity; // Import EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.security.core.context.SecurityContextHolder; // Import SecurityContextHolder

import jakarta.annotation.PostConstruct; // Import PostConstruct

@Configuration
@EnableWebSecurity
@EnableMethodSecurity // Re-enable method-level security
public class SecurityConfig {

    private final UserDetailsService userDetailsService;
    private final JwtRequestFilter jwtRequestFilter;

    public SecurityConfig(UserDetailsService userDetailsService, JwtRequestFilter jwtRequestFilter) {
        this.userDetailsService = userDetailsService;
        this.jwtRequestFilter = jwtRequestFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.cors(Customizer.withDefaults()) // Use default CORS config
            .csrf(csrf -> csrf.disable()) // Updated csrf configuration
            .authorizeHttpRequests(authz -> authz // Use authorizeHttpRequests
                // Public endpoints FIRST
                .requestMatchers("/auth/login", "/auth/refresh").permitAll()
                .requestMatchers("/auth/request-password-reset", "/auth/reset-password").permitAll()
                .requestMatchers("/Users/addInactive", "/Users/verifyEmail").permitAll() // Moved higher
                .requestMatchers("/Users/checkUserExists").permitAll() // Moved higher
                // Doctor Centre Registration Flow
                .requestMatchers("/api/doctor-centre-examen/checkExists").permitAll()
                .requestMatchers("/api/doctor-centre-examen/register/**").permitAll() // Covers /register/{centreId}
                .requestMatchers("/api/doctor-centre-examen/verify-email").permitAll()
                // Other public endpoints
                .requestMatchers("/Users/admin/patientsWithRegistrations").permitAll() // Permit path in filter chain, rely on @PreAuthorize
                .requestMatchers("/Users/addadmin").permitAll()
                .requestMatchers("/error").permitAll() // Allow access to the default error page
                // Other Specific ADMIN endpoints
                .requestMatchers("/Users/alluser").hasRole("ADMIN")
                .requestMatchers("/Users/delete/{id}").hasRole("ADMIN") // Global delete only for Admin
                .requestMatchers("/api/doctor-centre-examen/{id}").hasAnyRole("ADMIN", "DOCTOR_CENTRE_EXAMEN")
                // Specific DOCTOR/ASSISTANT/ADMIN endpoints (Cabinet specific actions)
                .requestMatchers("/Users/cabinet/{cabinetId}/user/{userId}").hasAnyRole("ADMIN", "DOCTOR", "ASSISTANT") // Cabinet-specific Deletion endpoint
                .requestMatchers("/Users/cabinet/{cabinetId}/user/{userId}/toggle-status").hasAnyRole("ADMIN", "DOCTOR", "ASSISTANT") // Toggle registration status
                .requestMatchers("/Users/activateRegistration/**", "/Users/deactivateRegistration/**").hasAnyRole("ADMIN", "DOCTOR", "ASSISTANT") // Activate/Deactivate registration
                .requestMatchers("/Users/add").hasAnyRole("DOCTOR", "ASSISTANT") // Add patient (by Dr/Assist)
                .requestMatchers("/Users/transferPatient").hasAnyRole("ADMIN", "DOCTOR", "ASSISTANT") // Transfer patient
                .requestMatchers("/Users/users/{userId}/toggle-direct-status").hasAnyRole("ADMIN", "DOCTOR", "ASSISTANT") // Toggle Dr/Assistant direct status

                // Specific DOCTOR/ASSISTANT endpoints (Listing within their cabinet)
                .requestMatchers("/Users/cabinet/active-users", "/Users/cabinet/inactive-users", "/Users/cabinet/patients", "/Users/cabinet/active-patients").hasAnyRole("DOCTOR", "ASSISTANT") // Listings for Dr/Assistants

                 // Specific Authenticated User endpoints (regardless of role, but must be logged in)
                .requestMatchers("/Users/update/{id}").authenticated() // Allow any logged-in user to update their own info (service layer should check ID match)
                .requestMatchers("/Users/allid/**", "/Users/useremail/**", "/Users/findByEmail/**").authenticated() // General user info lookup

                // Specific endpoint for patients to view their own consultations in a cabinet
                .requestMatchers("/api/consultations/my-consultations/**").authenticated() // Allow any authenticated user, @PreAuthorize will check role/ID match
                // Other Consultation endpoints (Doctors/Assistants)
                .requestMatchers("/api/consultations/**").hasAnyRole("DOCTOR", "ASSISTANT") // This rule now applies to remaining /api/consultations paths

                // Specific endpoint for patients to view their own examinations in a cabinet
                .requestMatchers("/api/medical-examinations/my-examinations/**").authenticated() // Allow any authenticated user, @PreAuthorize will check role/ID match

                // Other Medical Examination endpoints (e.g., creation by Doctor)
.requestMatchers("/api/medical-examinations/*/download").authenticated() // Allow download for authenticated users (patient check in controller)
                .requestMatchers("/api/medical-examinations/**").hasRole("DOCTOR") // This secures the rest

                // Fallback: Authenticate any other request not explicitly permitted
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)); // Updated session management

        // Add JWT filter before the authentication filter
        http.addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
