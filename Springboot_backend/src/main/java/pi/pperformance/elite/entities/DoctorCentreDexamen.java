package pi.pperformance.elite.entities;

import jakarta.persistence.*;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Set; // For OneToMany relationship

@Entity
@Table(name = "doctor_centre_examen") // Explicit table name for this subclass
public class DoctorCentreDexamen extends User implements Serializable {

    // Explicit no-argument constructor
    public DoctorCentreDexamen() {
        super(); // Call superclass constructor if needed
        this.role = Role.DOCTOR_CENTRE_EXAMEN; // Ensure role is set even in default constructor
        this.isActive = false; // Default value
    }

    // id_DrCe from diagram is inherited as 'id' from User

    private String speciality; // Specific field for this type of user

    @Column(nullable = false) // Ensure it's not null
    private boolean isActive = false; // Add isActive field, default to false

    private String signatureImagePath; // Path to the doctor's signature image

    // Relationship: DoctorCentreDexamen 'rédiger' Document (1 to * - Owning Side)
    @OneToMany(mappedBy = "doctorCentreDexamen", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<Document> documents;

    // Relationship: DoctorCentreDexamen 'orienter vers' CentreDexamen (0..1 to 1 - Owning Side)
    @ManyToOne
    @JoinColumn(name = "id_centre") // Foreign key column
    private CentreDexamen centreDexamen;

    // Relationship: DoctorCentreDexamen 'réaliser' MedicalExamination (1 to * - Owning Side)
    @OneToMany(mappedBy = "doctorCentreDexamen", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Set<MedicalExamination> medicalExaminations;


    // Constructor to set the role specifically for this entity
    public DoctorCentreDexamen(String firstName, String lastName, String email, String password, LocalDate birthDate, String tel, String address, String speciality, CentreDexamen centreDexamen) {
        super(firstName, lastName, email, password, birthDate, tel, address); // Call User constructor
        this.role = Role.DOCTOR_CENTRE_EXAMEN; // Set the role
        this.speciality = speciality;
        this.centreDexamen = centreDexamen;
        this.isActive = false; // Explicitly set to false on creation
        // Ensure createdAt and updatedAt are handled (already done in User constructor/PrePersist)
    }

    // Note: The 'role' field itself is inherited from User. We just ensure it's set correctly via the constructor.

    // Getters for fields specific to this class
    public String getSpeciality() {
        return speciality;
    }

    public Set<MedicalExamination> getMedicalExaminations() {
        return medicalExaminations;
    }

    public boolean isActive() { // Getter for boolean often uses 'is' prefix
        return isActive;
    }

    public String getSignatureImagePath() {
        return signatureImagePath;
    }

    public Set<Document> getDocuments() {
        return documents;
    }

    public CentreDexamen getCentreDexamen() {
        return centreDexamen;
    }

    // Setters for fields specific to this class
    public void setSpeciality(String speciality) {
        this.speciality = speciality;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public void setSignatureImagePath(String signatureImagePath) {
        this.signatureImagePath = signatureImagePath;
    }

    public void setDocuments(Set<Document> documents) {
        this.documents = documents;
    }

    public void setCentreDexamen(CentreDexamen centreDexamen) {
        this.centreDexamen = centreDexamen;
    }
}
