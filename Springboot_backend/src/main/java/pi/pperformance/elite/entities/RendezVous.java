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
public class RendezVous implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idAppointment;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    @Temporal(TemporalType.DATE)
    private Date apptDate;

    private String apptState;
    private String apptType;

    @Temporal(TemporalType.DATE)
    private Date apptProposedDate;

    @ManyToOne
    @JoinColumn(name = "idPatient")
    private Patient patient; // Relationship: patient 'avoir rdv' Rendez-vous (1 to *)

    @ManyToOne
    @JoinColumn(name = "idDoctor")
    private Doctor doctor; // Relationship: doctor 'fixer' Rendez-vous (1 to *)

    // PrePersist and PreUpdate methods to manage createdAt and updatedAt timestamps
    @PrePersist
    protected void onCreate() {
        createdAt = new Date();
        updatedAt = new Date(); // Initialize updatedAt on creation as well
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = new Date();
    }

    // Note: The 'fixer' relationship with User is omitted as it seems redundant or ambiguous
    // with the Doctor relationship. The getRendezVousList() method is not included as it's
    // typically part of a service or repository layer, not the entity itself.
}
