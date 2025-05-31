package pi.pperformance.elite.Authentif;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User; // Can extend Spring's User

import java.util.Collection;

public class CustomUserDetails extends User {

    private final Long id; // User ID
    private final Long centreId; // Add the centre ID field

    public CustomUserDetails(Long id, String username, String password, Collection<? extends GrantedAuthority> authorities, Long centreId) {
        super(username, password, authorities);
        this.id = id;
        this.centreId = centreId;
    }

    public CustomUserDetails(Long id, String username, String password, boolean enabled, boolean accountNonExpired, boolean credentialsNonExpired, boolean accountNonLocked, Collection<? extends GrantedAuthority> authorities, Long centreId) {
        super(username, password, enabled, accountNonExpired, credentialsNonExpired, accountNonLocked, authorities);
        this.id = id;
        this.centreId = centreId;
    }

    // Getter for the ID
    public Long getId() {
        return id;
    }

    // Getter for the Centre ID
    public Long getCentreId() {
        return centreId;
    }
}
