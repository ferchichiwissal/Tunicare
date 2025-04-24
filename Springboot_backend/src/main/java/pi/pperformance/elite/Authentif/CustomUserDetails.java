package pi.pperformance.elite.Authentif;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User; // Can extend Spring's User

import java.util.Collection;

public class CustomUserDetails extends User {

    private final Long id; // Add the user ID field

    public CustomUserDetails(Long id, String username, String password, Collection<? extends GrantedAuthority> authorities) {
        super(username, password, authorities);
        this.id = id;
    }

    public CustomUserDetails(Long id, String username, String password, boolean enabled, boolean accountNonExpired, boolean credentialsNonExpired, boolean accountNonLocked, Collection<? extends GrantedAuthority> authorities) {
        super(username, password, enabled, accountNonExpired, credentialsNonExpired, accountNonLocked, authorities);
        this.id = id;
    }

    // Getter for the ID
    public Long getId() {
        return id;
    }
}