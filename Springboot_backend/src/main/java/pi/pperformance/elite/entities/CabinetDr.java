package pi.pperformance.elite.entities;

// import java.sql.Date; // Remove this
import java.time.LocalDate; // Add this
import java.util.List;
import java.util.Set; // Add this for Set usage
import java.util.HashSet; // Add this for HashSet initialization

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;

@Entity
public class CabinetDr {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idSite;
    
    private String address;
    private String fax;
    private String tel;
    private String name;
    private String taxNumber;
    private LocalDate createdAt; // Change type
    private LocalDate updatedAt; // Change type
    private String signatureImagePath; // Path to the doctor's signature image

    // Relation inverse: Un CabinetDr a un seul Doctor
    @OneToOne(mappedBy = "cabinet", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Doctor doctor;

    // Relation inverse: Un CabinetDr peut avoir plusieurs Assistants
    @OneToMany(mappedBy = "cabinet", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Assistant> assistants;

    // Relation inverse: Un CabinetDr peut avoir plusieurs enregistrements UserCabinetRegistration
    @OneToMany(mappedBy = "cabinet", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Set<UserCabinetRegistration> registrations = new HashSet<>();


    // Constructeurs
    public CabinetDr() {}

    // Update constructor signature if needed, or rely on default/setters
    public CabinetDr(Long idSite, String address, String fax, String tel, String name, String taxNumber, LocalDate createdAt, LocalDate updatedAt) {
        this.idSite = idSite;
        this.address = address;
        this.fax = fax;
        this.tel = tel;
        this.name = name;
        this.taxNumber = taxNumber;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        // Note: signatureImagePath is not included in this constructor
    }

    // Getters et Setters
    public Long getIdSite() { return idSite; }
    public void setIdSite(Long idSite) { this.idSite = idSite; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getFax() { return fax; }
    public void setFax(String fax) { this.fax = fax; }

    public String getTel() { return tel; }
    public void setTel(String tel) { this.tel = tel; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getTaxNumber() { return taxNumber; }
    public void setTaxNumber(String taxNumber) { this.taxNumber = taxNumber; }

    public LocalDate getCreatedAt() { return createdAt; } // Change return type
    public void setCreatedAt(LocalDate createdAt) { this.createdAt = createdAt; } // Change parameter type

    public LocalDate getUpdatedAt() { return updatedAt; } // Change return type
    public void setUpdatedAt(LocalDate updatedAt) { this.updatedAt = updatedAt; } // Change parameter type

    public String getSignatureImagePath() { return signatureImagePath; }
    public void setSignatureImagePath(String signatureImagePath) { this.signatureImagePath = signatureImagePath; }

    // Getters and Setters for the specific relationships
    @JsonIgnore // Prevent serialization loop/unnecessary data
    public Doctor getDoctor() {
        return doctor;
    }

    public void setDoctor(Doctor doctor) {
        this.doctor = doctor;
    }

    @JsonIgnore // Prevent serialization loop/unnecessary data
    public List<Assistant> getAssistants() {
        return assistants;
    }

    public void setAssistants(List<Assistant> assistants) {
        this.assistants = assistants;
    }

    // Getters and Setters for registrations
    @JsonIgnore // Prevent serialization loop/unnecessary data
    public Set<UserCabinetRegistration> getRegistrations() {
        return registrations;
    }

    public void setRegistrations(Set<UserCabinetRegistration> registrations) {
        this.registrations = registrations;
    }

    // Optional: Helper methods to add/remove registrations
    public void addRegistration(UserCabinetRegistration registration) {
        registrations.add(registration);
        registration.setCabinet(this);
    }

    public void removeRegistration(UserCabinetRegistration registration) {
        registrations.remove(registration);
        registration.setCabinet(null);
    }
}
