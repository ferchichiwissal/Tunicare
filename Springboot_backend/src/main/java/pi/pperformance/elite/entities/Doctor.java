package pi.pperformance.elite.entities;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "doctor")
public class Doctor extends User {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cabinet_id", referencedColumnName = "idSite", unique = true, nullable = true)
    private CabinetDr cabinet;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true; // Par défaut, le docteur est actif

    public Doctor() {
        super();
        this.setRole(Role.DOCTOR);
    }

    public Doctor(String firstName, String lastName, String email, String password, LocalDate birthDate, String tel, String address) {
        super(firstName, lastName, email, password, birthDate, tel, address);
        this.setRole(Role.DOCTOR);
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
        this.isActive = active;
    }
}
