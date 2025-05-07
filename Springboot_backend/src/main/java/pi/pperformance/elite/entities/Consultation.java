package pi.pperformance.elite.entities;

import com.fasterxml.jackson.annotation.JsonManagedReference; // Import Jackson annotation
import jakarta.persistence.*;

import java.io.Serializable;
import java.util.Date;
import java.util.Set; // For the OneToMany relationship

// Assuming User entity exists and represents doctors
import pi.pperformance.elite.entities.User;
// Corrected import for the cabinet entity using the correct class name
import pi.pperformance.elite.entities.CabinetDr;


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

    // Relationship: Consultation 'avoir' Certificate (1 to 0..1 - Inverse Side)
    @OneToOne(mappedBy = "consultation", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private Certificate certificate;

    // Relationship: Doctor 'effectuer' Consultation (1 to *)
    @ManyToOne
    @JoinColumn(name = "id_doctor") // Name of the foreign key column in the consultation table
    private User doctor;

    // Relationship: Cabinet 'ou se déroule' Consultation (1 to *)
    @ManyToOne
    @JoinColumn(name = "id_cabinet") // Name of the foreign key column in the consultation table
    private CabinetDr cabinet; // Corrected type


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

    public User getDoctor() {
        return doctor;
    }

    public CabinetDr getCabinet() { // Corrected return type
        return cabinet;
    }

    public Certificate getCertificate() {
        return certificate;
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

    public void setDoctor(User doctor) {
        this.doctor = doctor;
    }

    public void setCabinet(CabinetDr cabinet) { // Corrected parameter type
        this.cabinet = cabinet;
    }

    public void setCertificate(Certificate certificate) {
        this.certificate = certificate;
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
