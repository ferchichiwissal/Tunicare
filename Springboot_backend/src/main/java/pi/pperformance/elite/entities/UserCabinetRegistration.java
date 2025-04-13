package pi.pperformance.elite.entities;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "user_cabinet_registration", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "cabinet_id"}))
public class UserCabinetRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cabinet_id", nullable = false)
    private CabinetDr cabinet;

    @Column(nullable = false)
    private boolean isActive;

    @Column(nullable = false)
    private LocalDate registrationDate;

    // Constructors
    public UserCabinetRegistration() {
        this.registrationDate = LocalDate.now();
        this.isActive = false; // Default to inactive, activation might be a separate step
    }

    public UserCabinetRegistration(User user, CabinetDr cabinet) {
        this();
        this.user = user;
        this.cabinet = cabinet;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public CabinetDr getCabinet() {
        return cabinet;
    }

    public void setCabinet(CabinetDr cabinet) {
        this.cabinet = cabinet;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public LocalDate getRegistrationDate() {
        return registrationDate;
    }

    public void setRegistrationDate(LocalDate registrationDate) {
        this.registrationDate = registrationDate;
    }

    // equals() and hashCode() based on user and cabinet might be useful
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;

        UserCabinetRegistration that = (UserCabinetRegistration) o;

        if (!user.getId().equals(that.user.getId())) return false;
        return cabinet.getIdSite().equals(that.cabinet.getIdSite());
    }

    @Override
    public int hashCode() {
        int result = user.getId().hashCode();
        result = 31 * result + cabinet.getIdSite().hashCode();
        return result;
    }
}
