package pi.pperformance.elite.entities;

import com.fasterxml.jackson.annotation.JsonBackReference; // Import Jackson annotation
import jakarta.persistence.*;

import java.io.Serializable;

@Entity
public class PrescribedMedications implements Serializable {

    // Explicit no-argument constructor
    public PrescribedMedications() {
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_ord") // Matches diagram field name
    private Long idOrd;

    @Lob // Assuming this could be a large text field
    private String prescribedMedications; // Matches diagram field name

    // Relationship: PrescribedMedications 'belongs to' Consultation (1 to 1 - Owning Side)
    @OneToOne(fetch = FetchType.LAZY) // Owning side, LAZY is often good practice
    @JoinColumn(name = "consultation_id", referencedColumnName = "idConsultation") // FK in this table
    @JsonBackReference // To handle circular reference during JSON serialization
    private Consultation consultation;

    // Note: Timestamps (createdAt, updatedAt) are not shown in the diagram for this entity.
    // Consider adding them if tracking creation/modification time is important.

    // Getters
    public Long getIdOrd() {
        return idOrd;
    }

    public String getPrescribedMedications() {
        return prescribedMedications;
    }

    public Consultation getConsultation() {
        return consultation;
    }

    // Setters
    public void setIdOrd(Long idOrd) {
        this.idOrd = idOrd;
    }

    public void setPrescribedMedications(String prescribedMedications) {
        this.prescribedMedications = prescribedMedications;
    }

    public void setConsultation(Consultation consultation) {
        this.consultation = consultation;
    }
}
