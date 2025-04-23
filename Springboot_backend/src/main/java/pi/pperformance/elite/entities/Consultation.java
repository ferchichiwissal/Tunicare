package pi.pperformance.elite.entities;

import com.fasterxml.jackson.annotation.JsonManagedReference; // Import Jackson annotation
import jakarta.persistence.*;

import java.io.Serializable;
import java.util.Date;
import java.util.Set; // For the OneToMany relationship

@Entity
public class Consultation implements Serializable {

    // Explicit no-argument constructor
    public Consultation() {
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idConsultation;

    private Date dateConsultation;
    @Lob // Assuming text can be large
    private String text;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    // Relationship: Patient 'consulter' Consultation (1 to *)
    @ManyToOne
    @JoinColumn(name = "idPatient")
    private Patient patient;

    // Relationship: MedicalExamination is now linked to RendezVous, not Consultation directly.
    // Removed the @OneToMany mapping for medicalExaminations.

    // Relationship: Consultation 'avoir' PrescribedMedications (1 to 0..1 - Inverse Side)
    @OneToOne(mappedBy = "consultation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    // Removed @JoinColumn, as the FK is now in prescribed_medications table
    @JsonManagedReference // To handle circular reference during JSON serialization
    private PrescribedMedications prescribedMedications;

    // Explicit Setters (Workaround for potential Lombok issue)
    public void setIdConsultation(Long idConsultation) {
        this.idConsultation = idConsultation;
    }

    public void setText(String text) {
        this.text = text;
    }

    // Getters
    public Long getIdConsultation() {
        return idConsultation;
    }

    public Date getDateConsultation() {
        return dateConsultation;
    }

    public String getText() {
        return text;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public Date getUpdatedAt() {
        return updatedAt;
    }

    public Patient getPatient() {
        return patient;
    }

    // Removed getMedicalExaminations()

    public PrescribedMedications getPrescribedMedications() {
        return prescribedMedications;
    }

    // Setters (excluding idConsultation and text which are already defined)
    public void setDateConsultation(Date dateConsultation) {
        this.dateConsultation = dateConsultation;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(Date updatedAt) {
        this.updatedAt = updatedAt;
    }

    public void setPatient(Patient patient) {
        this.patient = patient;
    }

    // Removed setMedicalExaminations()

    public void setPrescribedMedications(PrescribedMedications prescribedMedications) {
        this.prescribedMedications = prescribedMedications;
    }


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
