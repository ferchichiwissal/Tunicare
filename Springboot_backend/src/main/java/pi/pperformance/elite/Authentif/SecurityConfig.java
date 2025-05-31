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
// PutMapping is not used here, can be removed if not needed elsewhere
// import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.security.core.context.SecurityContextHolder; // Import SecurityContextHolder
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.Arrays;
import java.util.List; // Import List

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
        http.cors(cors -> cors.configurationSource(corsConfigurationSource())) // Use explicit CORS config source
            .csrf(csrf -> csrf.disable()) // Updated csrf configuration
            .authorizeHttpRequests(authz -> authz // Use authorizeHttpRequests
                // Allow CORS preflight requests globally
                .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                // Public endpoints FIRST
                .requestMatchers("/auth/login", "/auth/refresh").permitAll()
                .requestMatchers("/auth/request-password-reset", "/auth/reset-password").permitAll()
                .requestMatchers("/Users/addInactive", "/Users/verifyEmail").permitAll() // Moved higher
                .requestMatchers("/Users/checkUserExists").permitAll() // Moved higher
                // --- Allow public access to preview images ---
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/modeles-compte-rendu/*/preview-image").permitAll()
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
                .requestMatchers("/api/doctor-admin/**").hasRole("ADMIN") // Nouveaux endpoints pour la gestion des docteurs centre
                // NEW: Admin Centre Examen endpoints (for Admin)
                .requestMatchers("/api/admin-centre-examen/**").hasRole("ADMIN")
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
                // NEW: Allow authenticated users to update visibility (PreAuthorize handles roles)
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/consultations/*/visibility/patient").authenticated()
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/consultations/*/visibility/doctor").authenticated()
                // Other Consultation endpoints (Doctors/Assistants) - This should come AFTER more specific rules
                .requestMatchers("/api/consultations/**").hasAnyRole("DOCTOR", "ASSISTANT") // This rule now applies to remaining /api/consultations paths

                // --- Medical Examination Endpoints ---
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/medical-examinations").hasRole("DOCTOR") // Create exam request
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/medical-examinations/{examId}").hasRole("DOCTOR") // Update exam request
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/medical-examinations/doctor/me").hasRole("DOCTOR") // Get exams for logged-in doctor
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/medical-examinations/centre/pending").hasAnyRole("DOCTOR_CENTRE_EXAMEN", "ADMIN_CENTRE_EXAMEN") // Get pending exams for centre doctor
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/medical-examinations/centre/archived").hasAnyRole("DOCTOR_CENTRE_EXAMEN", "ADMIN_CENTRE_EXAMEN") // Get archived exams for centre doctor
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/medical-examinations/{examId}/save-report").hasRole("DOCTOR_CENTRE_EXAMEN") // Save report
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/medical-examinations/my-examinations/{patientId}").authenticated() // Patient gets their exams (PreAuthorize checks ID)
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/medical-examinations/{examId}/download").authenticated() // Download exam request PDF (PreAuthorize checks patient)
                // Add rule for PUT status update
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/medical-examinations/{examId}/status").hasAnyRole("DOCTOR_CENTRE_EXAMEN", "ADMIN_CENTRE_EXAMEN")
                // Add rule for GET report PDF download
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/medical-examinations/{examId}/report/download-pdf").hasAnyRole("DOCTOR_CENTRE_EXAMEN", "PATIENT", "ADMIN_CENTRE_EXAMEN")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/medical-examinations/{examId}").authenticated() // Get specific exam details (Authenticated, PreAuthorize for finer control)
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/medical-examinations/{examId}/hide-for-doctor").hasRole("DOCTOR")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/medical-examinations/{examId}/hide-for-centre-doctor").hasRole("DOCTOR_CENTRE_EXAMEN")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/medical-examinations/{examId}").hasRole("DOCTOR") // Delete exam request
                // Statistics for DOCTOR
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/statistics/doctor/exams-by-center").hasRole("DOCTOR")

                // --- DoctorCentreDexamen Specific Endpoints ---
                .requestMatchers("/api/doctor-centre-examen/centre/{centreId}").hasAnyRole("ADMIN_CENTRE_EXAMEN", "ADMIN") // Allow Admin Centre Examen and Admin to list doctors by centre
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/doctor-centre-examen/centre/{centreId}/doctor/{userId}/toggle-status").hasAnyRole("ADMIN_CENTRE_EXAMEN", "ADMIN") // Allow Admin Centre Examen and Admin to toggle doctor status by centre
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/doctor-centre-examen/centre/{centreId}/doctor/{userId}").hasAnyRole("ADMIN_CENTRE_EXAMEN", "ADMIN") // Allow Admin Centre Examen and Admin to delete doctor by centre
                .requestMatchers("/api/doctor-centre-examen/{id}").hasAnyRole("ADMIN", "DOCTOR_CENTRE_EXAMEN")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/doctor-centre-examen/signature").hasRole("DOCTOR_CENTRE_EXAMEN") // Upload signature
                // Statistics for DOCTOR_CENTRE_EXAMEN and ADMIN_CENTRE_EXAMEN
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/statistics/center/exams-by-doctor").hasAnyRole("DOCTOR_CENTRE_EXAMEN", "ADMIN_CENTRE_EXAMEN")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/statistics/dashboard/doctor-centre").hasAnyRole("DOCTOR_CENTRE_EXAMEN", "ADMIN_CENTRE_EXAMEN") // Dashboard stats
                // Statistics for ADMIN
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/statistics/dashboard/admin").hasRole("ADMIN") // Admin Dashboard stats
                // Statistics for ADMIN monthly graphs
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/statistics/admin/total-admin-centres").hasRole("ADMIN") // Added rule for total admin centres endpoint
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/statistics/admin/**").hasRole("ADMIN")
                // Statistics for PATIENT graphs
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/statistics/patient/consultations-per-month").hasRole("PATIENT")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/statistics/patient/exams-per-month").hasRole("PATIENT")

                // Statistics for ADMIN_CENTRE_EXAMEN
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/statistics/admin-centre/exams-by-type").hasRole("ADMIN_CENTRE_EXAMEN")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/statistics/admin-centre/exams-by-doctor").hasRole("ADMIN_CENTRE_EXAMEN")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/statistics/admin-centre/tile-stats").hasRole("ADMIN_CENTRE_EXAMEN") // Added rule for tile stats
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/statistics/admincentre/tiles/{centreId}").hasRole("ADMIN_CENTRE_EXAMEN") // Added rule for admin centre tile stats by centreId
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/statistics/doctor-centre/reports-per-month").hasAnyRole("DOCTOR_CENTRE_EXAMEN", "ADMIN_CENTRE_EXAMEN") // Added rule for monthly reports stats


                // --- Report Model Endpoints ---
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/modeles-compte-rendu").hasAnyRole("DOCTOR_CENTRE_EXAMEN", "ADMIN", "ADMIN_CENTRE_EXAMEN") // List models
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/modeles-compte-rendu").hasAnyRole("ADMIN", "ADMIN_CENTRE_EXAMEN") // Create model
                // Add rule for PUT model update
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/modeles-compte-rendu/{id}").hasAnyRole("ADMIN", "ADMIN_CENTRE_EXAMEN") // Update model
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/modeles-compte-rendu/{id}").hasAnyRole("DOCTOR_CENTRE_EXAMEN", "ADMIN", "ADMIN_CENTRE_EXAMEN") // Get specific model
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/modeles-compte-rendu/{id}").hasAnyRole("ADMIN", "ADMIN_CENTRE_EXAMEN") // Delete model

                // --- Certificate Endpoints ---
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/certificates/upload/**").hasRole("DOCTOR") // Upload only by Doctor
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/certificates/download/consultation/**").hasAnyRole("PATIENT", "DOCTOR") // Download by Patient or Doctor
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/certificates/details/consultation/**").hasAnyRole("PATIENT", "DOCTOR") // Details check by Patient or Doctor

                // Chatbot endpoint - requires authentication
                .requestMatchers("/api/chatbot/**").authenticated()


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

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:3000"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Cache-Control", "Content-Type", "X-Requested-With"));
        configuration.setAllowCredentials(true); // Important if you use cookies/sessions or Authorization headers
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration); // Apply this config to all paths
        return source;
    }
}
