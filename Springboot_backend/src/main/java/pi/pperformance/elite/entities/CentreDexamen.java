package pi.pperformance.elite.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.Date;
import java.util.Set; // For OneToMany relationship

@Entity
@Getter
@Setter
@NoArgsConstructor
public class CentreDexamen implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_centre") // Matches diagram
    private Long idCentre;

    private String name;
    private String adress; // Corrected spelling from diagram
    private String tel;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    // Relationship: DoctorCentreDexamen 'orienter vers' CentreDexamen (0..1 to 1 - Inverse Side)
    // Assuming one CentreDexamen can have multiple DoctorCentreDexamen associated.
    @OneToMany(mappedBy = "centreDexamen", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<DoctorCentreDexamen> doctorCentreDexamens; // Needs DoctorCentreDexamen entity

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
