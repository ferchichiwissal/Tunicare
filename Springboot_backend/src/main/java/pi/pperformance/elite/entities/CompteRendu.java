package pi.pperformance.elite.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.Date;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class CompteRendu implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idDoc; // Matches diagram

    private String fileName;
    private String filePath; // Assuming FilePath is a string URL or path
    @Lob
    private byte[] avoirDoc; // Assuming LONGLOB maps to byte[] for file content
    private String fileType;
    private Float price; // Matches diagram

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    // Relationship: MedicalExamination 'avoir' CompteRendu (1 to 1 - Inverse Side)
    @OneToOne(mappedBy = "compteRendu")
    private MedicalExamination medicalExamination;

    // Relationship: CompteRendu 'rédiger' Document (0..1 to * - Many side)
    // A CompteRendu seems to be a type of Document or related to one.
    // The diagram shows 'rédiger' from DoctorCentreDexamen to Document, and CompteRendu 'avoir' Document.
    // Let's assume a CompteRendu can be associated with one Document. If it's the other way, adjust.
    @ManyToOne
    @JoinColumn(name = "document_id") // Foreign key column name
    private Document document; // Needs Document entity

    // Relationship: CompteRendu 'orienter vers' ModeleCompteRendu (0..* to 0..1 - Many side)
    @ManyToOne
    @JoinColumn(name = "modele_id") // Foreign key column name
    private ModeleCompteRendu modeleCompteRendu; // Needs ModeleCompteRendu entity

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
