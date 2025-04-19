package pi.pperformance.elite.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.Date;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class MedicalExamination implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idExam;

    private String act; // Assuming 'Act' is a string description
    private String recommandation; // Corrected spelling from diagram

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    // Relationship: MedicalExamination 'prescrire' PrescribedMedications (1 to 0..1 - Owning Side)
    @OneToOne(cascade = CascadeType.ALL) // Cascade operations if needed
    @JoinColumn(name = "id_ord", referencedColumnName = "id_ord") // Link to PrescribedMedications PK
    private PrescribedMedications prescribedMedications;

    // Relationship: Consultation 'avoir' MedicalExamination (1 to 0..* - Many side)
    @ManyToOne
    @JoinColumn(name = "idConsultation")
    private Consultation consultation;

    // Relationship: MedicalExamination 'avoir' CompteRendu (1 to 1 - Owning Side? Diagram unclear, assuming 1-to-1)
    // If one MedicalExamination can have only one CompteRendu
    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "idDoc", referencedColumnName = "idDoc") // Link to CompteRendu PK
    private CompteRendu compteRendu;
    // If one MedicalExamination can have multiple CompteRendu, change to @OneToMany

    @PrePersist
    protected void onCreate() {
        createdAt = new Date();
        updatedAt = new Date();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = new Date();
    }
}
