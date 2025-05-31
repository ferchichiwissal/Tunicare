package pi.pperformance.elite.Authentif;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import pi.pperformance.elite.entities.Role;

import javax.crypto.SecretKey;

import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
/*Marks this class as a Spring component,
so it can be automatically detected and managed by the Spring container.
This allows it to be injected into other classes where needed.*/
public class JwtUtils {
    /* Generate a strong secret key for HS256
     * It’s a method to mix the secret key with the data inside the token to create a secure signature. This signature is then used to ensure the token hasn’t been changed by anyone else.*/
    // Revert to the static final key generation
    private static final SecretKey SECRET_KEY = Keys.secretKeyFor(SignatureAlgorithm.HS256);

    // Remove the @Value injection and getSigningKey method

    // Extract a claim from the token
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public Claims extractAllClaims(String token) {
        // Use the static SECRET_KEY for parsing
        return Jwts.parserBuilder()
                .setSigningKey(SECRET_KEY)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
     // Retrieve email from JWT token
     public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    // Retrieve expiration date from JWT token
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    // --- Updated generateToken to include cabinetId and centreId ---
    public String generateToken(String email, Collection<? extends GrantedAuthority> authorities, Long cabinetId, Long centreId) {
        List<String> roleNames = authorities.stream()
                                            .map(GrantedAuthority::getAuthority)
                                            .collect(Collectors.toList());

        Claims claims = Jwts.claims().setSubject(email);
        claims.put("roles", roleNames);
        if (cabinetId != null) { // Only add cabinetId claim if it's not null
            claims.put("cabinetId", cabinetId);
        }
        if (centreId != null) { // Only add centreId claim if it's not null
            claims.put("centreId", centreId);
        }

        return Jwts.builder()
                .setClaims(claims)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60 * 10)) // 10 hours validity
                .signWith(SECRET_KEY, SignatureAlgorithm.HS256) // Use the static key
                .compact();
    }

    // --- Updated generateRefreshToken to include cabinetId and centreId ---
    public String generateRefreshToken(String email, Collection<? extends GrantedAuthority> authorities, Long cabinetId, Long centreId) {
        List<String> roleNames = authorities.stream()
                                            .map(GrantedAuthority::getAuthority)
                                            .collect(Collectors.toList());

        Claims claims = Jwts.claims().setSubject(email);
        claims.put("roles", roleNames);
         if (cabinetId != null) { // Only add cabinetId claim if it's not null
            claims.put("cabinetId", cabinetId);
        }
        if (centreId != null) { // Only add centreId claim if it's not null
            claims.put("centreId", centreId);
        }

        return Jwts.builder()
                .setClaims(claims)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + 1000L * 60 * 60 * 24 * 7)) // 7 days validity
                .signWith(SECRET_KEY, SignatureAlgorithm.HS256) // Use the static key
                .compact();
    }

    // Check if the token has expired
     private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
    // Validate token
    public Boolean validateToken(String token, String email) {
        final String emailFromToken = extractEmail(token);
        return (emailFromToken.equals(email) && !isTokenExpired(token));
    }

    // --- New method to extract cabinetId ---
    public Long extractCabinetId(String token) {
        try {
            Claims claims = extractAllClaims(token);
            Object cabinetIdObj = claims.get("cabinetId");
            if (cabinetIdObj instanceof Integer) {
                return ((Integer) cabinetIdObj).longValue();
            } else if (cabinetIdObj instanceof Long) {
                return (Long) cabinetIdObj;
            }
            return null; // Return null if claim doesn't exist or isn't a number
        } catch (Exception e) {
            // Log error or handle appropriately if needed
            System.err.println("Could not extract cabinetId from token: " + e.getMessage());
            return null;
        }
    }

    // --- New method to extract centreId ---
    public Long extractCentreId(String token) {
        try {
            Claims claims = extractAllClaims(token);
            Object centreIdObj = claims.get("centreId");
            if (centreIdObj instanceof Integer) {
                return ((Integer) centreIdObj).longValue();
            } else if (centreIdObj instanceof Long) {
                return (Long) centreIdObj;
            }
            return null; // Return null if claim doesn't exist or isn't a number
        } catch (Exception e) {
            // Log error or handle appropriately if needed
            System.err.println("Could not extract centreId from token: " + e.getMessage());
            return null;
        }
    }


    // Get roles from the token
    public List<Role> getRolesFromToken(String token) {
        Claims claims = Jwts.parserBuilder() // Use the new parser builder
                .setSigningKey(SECRET_KEY) // Use the static key
                .build()
                .parseClaimsJws(token)
                .getBody();

        List<String> roleNames = claims.get("roles", List.class); // Extract roles as strings
        return roleNames.stream()
                        .map(Role::valueOf)  // Convert strings back to Role enum
                        .collect(Collectors.toList());
    }
}
