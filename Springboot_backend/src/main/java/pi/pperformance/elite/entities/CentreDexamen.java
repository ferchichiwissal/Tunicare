package pi.pperformance.elite.entities;

import jakarta.persistence.*;

import java.io.Serializable;
import java.util.Date;
import java.util.Set; // For OneToMany relationship

@Entity
public class CentreDexamen implements Serializable {

    // Explicit no-argument constructor
    public CentreDexamen() {
    }

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

    // Getters
    public Long getIdCentre() {
        return idCentre;
    }

    public String getName() {
        return name;
    }

    public String getAdress() {
        return adress;
    }

    public String getTel() {
        return tel;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public Date getUpdatedAt() {
        return updatedAt;
    }

    public Set<DoctorCentreDexamen> getDoctorCentreDexamens() {
        return doctorCentreDexamens;
    }

    // Setters
    public void setIdCentre(Long idCentre) {
        this.idCentre = idCentre;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setAdress(String adress) {
        this.adress = adress;
    }

    public void setTel(String tel) {
        this.tel = tel;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(Date updatedAt) {
        this.updatedAt = updatedAt;
    }

    public void setDoctorCentreDexamens(Set<DoctorCentreDexamen> doctorCentreDexamens) {
        this.doctorCentreDexamens = doctorCentreDexamens;
    }
}
