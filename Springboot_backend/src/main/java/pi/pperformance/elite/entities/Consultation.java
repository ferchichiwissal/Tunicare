package pi.pperformance.elite.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.Date;
import java.util.Set; // For the OneToMany relationship

@Entity
@Getter
@Setter
@NoArgsConstructor
public class Consultation implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idConsultation;

    private String state;
    private Date dateConsultation;
    private String regulation;
    @Lob // Assuming text can be large
    private String text;
    private String remark;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    // Relationship: Patient 'consulter' Consultation (1 to *)
    @ManyToOne
    @JoinColumn(name = "idPatient")
    private Patient patient;

    // Relationship: Consultation 'avoir' MedicalExamination (1 to 0..* - Inverse Side)
    @OneToMany(mappedBy = "consultation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<MedicalExamination> medicalExaminations;

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
