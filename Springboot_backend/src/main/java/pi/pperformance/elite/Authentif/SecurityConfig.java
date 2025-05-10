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

                // --- Medical Examination Endpoints ---
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/medical-examinations").hasRole("DOCTOR") // Create exam request
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/medical-examinations/{examId}").hasRole("DOCTOR") // Update exam request
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/medical-examinations/doctor/me").hasRole("DOCTOR") // Get exams for logged-in doctor
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/medical-examinations/centre/pending").hasRole("DOCTOR_CENTRE_EXAMEN") // Get pending exams for centre doctor
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/medical-examinations/{examId}/save-report").hasRole("DOCTOR_CENTRE_EXAMEN") // Save report
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/medical-examinations/my-examinations/{patientId}").authenticated() // Patient gets their exams (PreAuthorize checks ID)
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/medical-examinations/{examId}/download").authenticated() // Download exam request PDF (PreAuthorize checks patient)
                // Add rule for PUT status update
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/medical-examinations/{examId}/status").hasRole("DOCTOR_CENTRE_EXAMEN")
                // Add rule for GET report PDF download
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/medical-examinations/{examId}/report/download-pdf").hasAnyRole("DOCTOR_CENTRE_EXAMEN", "PATIENT")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/medical-examinations/{examId}").authenticated() // Get specific exam details (Authenticated, PreAuthorize for finer control)
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/medical-examinations/{examId}").hasRole("DOCTOR") // Delete exam request

                // --- DoctorCentreDexamen Specific Endpoints ---
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/doctor-centre-examen/signature").hasRole("DOCTOR_CENTRE_EXAMEN") // Upload signature

                // --- Report Model Endpoints ---
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/modeles-compte-rendu").hasAnyRole("DOCTOR_CENTRE_EXAMEN", "ADMIN") // List models
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/modeles-compte-rendu").hasRole("ADMIN") // Create model
                // Add rule for PUT model update
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/modeles-compte-rendu/{id}").hasRole("ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/modeles-compte-rendu/{id}").hasAnyRole("DOCTOR_CENTRE_EXAMEN", "ADMIN") // Get specific model
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/modeles-compte-rendu/{id}").hasRole("ADMIN") // Delete model

                // --- Certificate Endpoints ---
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/certificates/upload/**").hasRole("DOCTOR") // Upload only by Doctor
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/certificates/download/consultation/**").hasAnyRole("PATIENT", "DOCTOR") // Download by Patient or Doctor
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/certificates/details/consultation/**").hasAnyRole("PATIENT", "DOCTOR") // Details check by Patient or Doctor

                // Chatbot endpoint - requires authentication
                .requestMatchers("/api/chatbot/**").authenticated()

                // --- Allow public access to preview images ---
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/modeles-compte-rendu/*/preview-image").permitAll()

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
        // ATTENTION: Remplacez par l'URL exacte de votre frontend React
        configuration.setAllowedOrigins(List.of("http://localhost:3000"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Cache-Control", "Content-Type", "X-Requested-With"));
        configuration.setAllowCredentials(true); // Important if you use cookies/sessions or Authorization headers
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration); // Apply this config to all paths
        return source;
    }
}
