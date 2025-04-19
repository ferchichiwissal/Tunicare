package pi.pperformance.elite.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.Date;
import java.util.Set; // For OneToMany relationships

@Entity
@Getter
@Setter
@NoArgsConstructor
public class Document implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idDoc; // Assuming this is the primary key, though diagram shows it in CompteRendu

    private String docName;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    // Relationship: DoctorCentreDexamen 'rédiger' Document (1 to * - Inverse Side)
    @ManyToOne
    @JoinColumn(name = "id_dr_ce") // Foreign key to DoctorCentreDexamen
    private DoctorCentreDexamen doctorCentreDexamen; // Needs DoctorCentreDexamen entity

    // Relationship: CompteRendu 'avoir' Document (0..1 to * - Inverse Side)
    // One Document might be associated with multiple CompteRendus if it's a template or shared resource.
    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<CompteRendu> compteRendus;

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
