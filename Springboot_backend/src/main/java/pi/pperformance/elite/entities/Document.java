package pi.pperformance.elite.entities;

import jakarta.persistence.*;

import java.io.Serializable;
import java.util.Date;
import java.util.Set; // For OneToMany relationships

@Entity
public class Document implements Serializable {

    // Explicit no-argument constructor
    public Document() {
    }

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

    // Getters
    public Long getIdDoc() {
        return idDoc;
    }

    public String getDocName() {
        return docName;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public Date getUpdatedAt() {
        return updatedAt;
    }

    public DoctorCentreDexamen getDoctorCentreDexamen() {
        return doctorCentreDexamen;
    }

    public Set<CompteRendu> getCompteRendus() {
        return compteRendus;
    }

    // Setters
    public void setIdDoc(Long idDoc) {
        this.idDoc = idDoc;
    }

    public void setDocName(String docName) {
        this.docName = docName;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(Date updatedAt) {
        this.updatedAt = updatedAt;
    }

    public void setDoctorCentreDexamen(DoctorCentreDexamen doctorCentreDexamen) {
        this.doctorCentreDexamen = doctorCentreDexamen;
    }

    public void setCompteRendus(Set<CompteRendu> compteRendus) {
        this.compteRendus = compteRendus;
    }
}
