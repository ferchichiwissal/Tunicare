package pi.pperformance.elite.entities;

import jakarta.persistence.*;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Set;

@Entity
@Table(name = "admin_centre_examen")
public class AdminCentreExamen extends User implements Serializable {

    // Explicit no-argument constructor
    public AdminCentreExamen() {
        super();
        this.role = Role.ADMIN_CENTRE_EXAMEN;
        this.isActive = false;
    }

    @Column(nullable = false)
    private boolean isActive = false;

    private String signatureImagePath;

    // Relationship with CentreDexamen
    @ManyToOne
    @JoinColumn(name = "id_centre")
    private CentreDexamen centreDexamen;

    // Constructor
    public AdminCentreExamen(String firstName, String lastName, String email, String password, LocalDate birthDate, String tel, String address, CentreDexamen centreDexamen) {
        super(firstName, lastName, email, password, birthDate, tel, address);
        this.role = Role.ADMIN_CENTRE_EXAMEN;
        this.centreDexamen = centreDexamen;
        this.isActive = false;
    }

    // Getters
    public boolean isActive() {
        return isActive;
    }

    public String getSignatureImagePath() {
        return signatureImagePath;
    }

    public CentreDexamen getCentreDexamen() {
        return centreDexamen;
    }

    // Setters
    public void setActive(boolean active) {
        isActive = active;
    }

    public void setSignatureImagePath(String signatureImagePath) {
        this.signatureImagePath = signatureImagePath;
    }

    public void setCentreDexamen(CentreDexamen centreDexamen) {
        this.centreDexamen = centreDexamen;
    }
}
