package pi.pperformance.elite.entities;

import jakarta.persistence.*;

import java.io.Serializable;
import java.time.LocalDateTime; // Import LocalDateTime
import java.util.Date; // Add missing import for Date

@Entity
public class RendezVous implements Serializable {

    // Explicit no-argument constructor
    public RendezVous() {
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idAppointment;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP) // Keep for createdAt/updatedAt if using Date
    private java.util.Date updatedAt; // Keep Date type if needed, or change to LocalDateTime

    // Changed to LocalDateTime and renamed
    private LocalDateTime apptDateTime;

    private String apptState;
    private String apptType;

    // Changed to LocalDateTime and renamed
    private LocalDateTime apptProposedDateTime;

    // Added superseded field
    private boolean superseded = false; // Default to false

    @ManyToOne
    @JoinColumn(name = "idPatient")
    private Patient patient; // Relationship: patient 'avoir rdv' Rendez-vous (1 to *)

    @ManyToOne
    @JoinColumn(name = "idDoctor")
    private Doctor doctor; // Relationship: doctor 'fixer' Rendez-vous (1 to *)

    // Added relationship to CabinetDr
    @ManyToOne
    @JoinColumn(name = "id_site") // Assuming foreign key column name is id_site
    private CabinetDr cabinet;

    // PrePersist and PreUpdate methods to manage createdAt and updatedAt timestamps
    @PrePersist
    protected void onCreate() {
        createdAt = new java.util.Date(); // Keep Date if field type is Date
        updatedAt = new java.util.Date(); // Initialize updatedAt on creation as well
        // If createdAt/updatedAt are LocalDateTime, use LocalDateTime.now()
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = new Date();
    }

    // Note: The 'fixer' relationship with User is omitted as it seems redundant or ambiguous
    // with the Doctor relationship. The getRendezVousList() method is not included as it's
    // typically part of a service or repository layer, not the entity itself.

    // Getters
    public Long getIdAppointment() {
        return idAppointment;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public Date getUpdatedAt() {
        return updatedAt;
    }

    public LocalDateTime getApptDateTime() {
        return apptDateTime;
    }

    public String getApptState() {
        return apptState;
    }

    public String getApptType() {
        return apptType;
    }

    public LocalDateTime getApptProposedDateTime() {
        return apptProposedDateTime;
    }

    public boolean isSuperseded() {
        return superseded;
    }

    public Patient getPatient() {
        return patient;
    }

    public Doctor getDoctor() {
        return doctor;
    }

    public CabinetDr getCabinet() {
        return cabinet;
    }

    // Setters
    public void setIdAppointment(Long idAppointment) {
        this.idAppointment = idAppointment;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(Date updatedAt) {
        this.updatedAt = updatedAt;
    }

    public void setApptDateTime(LocalDateTime apptDateTime) {
        this.apptDateTime = apptDateTime;
    }

    public void setApptState(String apptState) {
        this.apptState = apptState;
    }

    public void setApptType(String apptType) {
        this.apptType = apptType;
    }

    public void setApptProposedDateTime(LocalDateTime apptProposedDateTime) {
        this.apptProposedDateTime = apptProposedDateTime;
    }

    public void setSuperseded(boolean superseded) {
        this.superseded = superseded;
    }

    public void setPatient(Patient patient) {
        this.patient = patient;
    }

    public void setDoctor(Doctor doctor) {
        this.doctor = doctor;
    }

    public void setCabinet(CabinetDr cabinet) {
        this.cabinet = cabinet;
    }
}
