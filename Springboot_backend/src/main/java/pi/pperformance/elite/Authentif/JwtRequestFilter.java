package pi.pperformance.elite.Authentif;

import io.jsonwebtoken.Claims; // Import Claims
import org.slf4j.Logger; // Import Logger
import org.slf4j.LoggerFactory; // Import LoggerFactory
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
// import org.springframework.security.web.authentication.WebAuthenticationDetailsSource; // Keep commented if not using standard details
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.HashMap; // Import HashMap
import java.util.Map; // Import Map

@Component
public class JwtRequestFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtRequestFilter.class); // Add logger instance

    private final JwtUtils jwtUtil;
    private final UserDetailsService userDetailsService;

    // Constructor Injection
    @Autowired
    public JwtRequestFilter(JwtUtils jwtUtil, UserDetailsService userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        final String authorizationHeader = request.getHeader("Authorization");
        String email = null;
        String jwtToken = null;

        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            jwtToken = authorizationHeader.substring(7);
            try {
                email = jwtUtil.extractEmail(jwtToken);
            } catch (Exception e) {
                logger.error("Could not extract email from JWT: {}", e.getMessage());
                // Optionally clear token/email to prevent further processing
                jwtToken = null;
                email = null;
            }
        }

        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(email);

            if (jwtUtil.validateToken(jwtToken, userDetails.getUsername())) {
                Claims claims = null;
                try {
                    claims = jwtUtil.extractAllClaims(jwtToken); // Assume this method exists and is accessible
                } catch (Exception e) {
                    logger.error("Could not extract claims from JWT: {}", e.getMessage());
                    // Handle error - maybe prevent authentication?
                }

                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

                Map<String, Object> customDetails = new HashMap<>();

                if (claims != null) {
                    Object cabinetIdObj = claims.get("cabinetId"); // Use claim name from JWT
                    if (cabinetIdObj != null) {
                        if (cabinetIdObj instanceof Integer || cabinetIdObj instanceof Long) {
                            customDetails.put("cabinetId", cabinetIdObj);
                            logger.debug("Successfully extracted cabinetId {} for user {}", cabinetIdObj, email);
                        } else {
                            logger.warn("Cabinet ID claim ('cabinetId') is not an Integer or Long: {} for user {}",
                                    cabinetIdObj.getClass().getName(), email);
                            // Optionally try parsing if it's a String, etc.
                        }
                    } else {
                        logger.warn("Claim 'cabinetId' not found in JWT for user: {}", email);
                        // Decide if this is acceptable or an error state
                    }

                    Object centreIdObj = claims.get("centreId"); // Use claim name from JWT for centreId
                    if (centreIdObj != null) {
                        if (centreIdObj instanceof Integer || centreIdObj instanceof Long) {
                            customDetails.put("centreId", centreIdObj);
                            logger.debug("Successfully extracted centreId {} for user {}", centreIdObj, email);
                        } else {
                            logger.warn("Centre ID claim ('centreId') is not an Integer or Long: {} for user {}",
                                    centreIdObj.getClass().getName(), email);
                            // Optionally try parsing if it's a String, etc.
                        }
                    } else {
                        logger.warn("Claim 'centreId' not found in JWT for user: {}", email);
                        // Decide if this is acceptable or an error state
                    }

                    // Add other claims to details if needed
                    // customDetails.put("roles", claims.get("roles"));
                } else {
                     logger.warn("Could not extract any claims for user {}, cannot add cabinetId or centreId to details.", email);
                }


                authToken.setDetails(customDetails); // Set our custom map

                logger.debug("Attempting to set SecurityContext for user: {}", email);
                SecurityContextHolder.getContext().setAuthentication(authToken);
                logger.debug("SecurityContext successfully set for user: {}. Authentication: {}", email, SecurityContextHolder.getContext().getAuthentication());
            } else {
                 logger.warn("JWT validation failed for user: {}", email);
            }
        } else {
            if (email == null && authorizationHeader != null && !authorizationHeader.startsWith("Bearer ")) {
                 logger.warn("Authorization header present but not Bearer type: {}", authorizationHeader);
            }
            // Allow request to continue down the filter chain for potential public access or other auth methods
            // logger.debug("No JWT found or email extracted, proceeding with filter chain for request: {}", request.getRequestURI());
        }

        try {
            chain.doFilter(request, response);
            // Log after chain execution if needed, e.g., to check context after response
            // logger.debug("Filter chain completed for request: {}", request.getRequestURI());
        } catch (Exception e) {
             logger.error("Exception during filter chain execution for request {}: {}", request.getRequestURI(), e.getMessage(), e);
             throw e; // Re-throw the exception to allow standard Spring error handling
        }
    }
}
