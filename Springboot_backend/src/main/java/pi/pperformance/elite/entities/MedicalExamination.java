package pi.pperformance.elite.entities;

import jakarta.persistence.*;
import pi.pperformance.elite.entities.RendezVous; // Added import
// import pi.pperformance.elite.entities.Patient; // Removed import
import pi.pperformance.elite.entities.Doctor; // Import Doctor

import java.io.Serializable;
import java.util.Date;

@Entity
public class MedicalExamination implements Serializable {

    // Explicit no-argument constructor
    public MedicalExamination() {
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idExam;

    private String act; // Assuming 'Act' is a string description
    private String recommandation; // Corrected spelling from diagram

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    // Relationship: RendezVous 'avoir' MedicalExamination (1 to 0..* - Many side)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "idRendezVous")
    private RendezVous rendezVous;

    // Patient can be accessed via rendezVous.getPatient()
    // Removed direct link to Patient

    @Column(name = "consultation_id") // Explicitly map to the database column name
    private Long consultationId;

    // Store the name of the selected centre (either from CentreDexamen or "Autre")
    @Column(name = "centre_name") // Added column for centre name
    private String centreName;

    // Relationship: MedicalExamination 'avoir' CompteRendu (1 to 1 - Owning Side? Diagram unclear, assuming 1-to-1)
    // If one MedicalExamination can have only one CompteRendu
    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "idDoc", referencedColumnName = "idDoc") // Link to CompteRendu PK
    private CompteRendu compteRendu;
    // If one MedicalExamination can have multiple CompteRendu, change to @OneToMany

    // Add relationship to the Doctor who created the examination
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id") // Name of the foreign key column in medical_examination table
    private Doctor doctor;

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
    public Long getIdExam() {
        return idExam;
    }

    public String getAct() {
        return act;
    }

    public String getRecommandation() {
        return recommandation;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public Date getUpdatedAt() {
        return updatedAt;
    }

    public RendezVous getRendezVous() { // Changed return type and name
        return rendezVous;
    }

    // Removed getPatient()

    public Long getConsultationId() {
        return consultationId;
    }

    public String getCentreName() { // Added getter
        return centreName;
    }

    public CompteRendu getCompteRendu() {
        return compteRendu;
    }

    // Setters
    public void setIdExam(Long idExam) {
        this.idExam = idExam;
    }

    public void setAct(String act) {
        this.act = act;
    }

    public void setRecommandation(String recommandation) {
        this.recommandation = recommandation;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(Date updatedAt) {
        this.updatedAt = updatedAt;
    }

    public void setRendezVous(RendezVous rendezVous) { // Changed parameter type and name
        this.rendezVous = rendezVous;
    }

    // Removed setPatient()

    public void setConsultationId(Long consultationId) {
        this.consultationId = consultationId;
    }

    // Removed erroneous setPatient and duplicate setConsultationId from failed diff apply

    public void setCentreName(String centreName) { // Added setter
        this.centreName = centreName;
    }

    public void setCompteRendu(CompteRendu compteRendu) {
        this.compteRendu = compteRendu;
    }

    // Add getter and setter for Doctor
    public Doctor getDoctor() {
        return doctor;
    }

    public void setDoctor(Doctor doctor) {
        this.doctor = doctor;
    }
}
