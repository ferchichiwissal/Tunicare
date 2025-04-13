package pi.pperformance.elite.entities;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "Assistant")
public class Assistant extends User {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cabinet_id", nullable = true)
    private CabinetDr cabinet;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true; // valeur par défaut : actif

    public Assistant() {
        super();
        this.setRole(Role.ASSISTANT);
    }

    public Assistant(String firstName, String lastName, String email, String password, LocalDate birthDate, String tel, String address) {
        super(firstName, lastName, email, password, birthDate, tel, address);
        this.setRole(Role.ASSISTANT);
    }

    @com.fasterxml.jackson.annotation.JsonIgnore
    public CabinetDr getCabinet() {
        return cabinet;
    }

    public void setCabinet(CabinetDr cabinet) {
        this.cabinet = cabinet;
    }

    public Long getCabinetId() {
        return (this.cabinet != null) ? this.cabinet.getIdSite() : null;
    }

    // Getter et Setter pour isActive
    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }
}
