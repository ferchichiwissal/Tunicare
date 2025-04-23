package pi.pperformance.elite.entities;

import jakarta.persistence.*;

import java.io.Serializable;
import java.util.Date;

@Entity
public class CompteRendu implements Serializable {

    // Explicit no-argument constructor
    public CompteRendu() {
    }

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

    // Getters
    public Long getIdDoc() {
        return idDoc;
    }

    public String getFileName() {
        return fileName;
    }

    public String getFilePath() {
        return filePath;
    }

    public byte[] getAvoirDoc() {
        return avoirDoc;
    }

    public String getFileType() {
        return fileType;
    }

    public Float getPrice() {
        return price;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public Date getUpdatedAt() {
        return updatedAt;
    }

    public MedicalExamination getMedicalExamination() {
        return medicalExamination;
    }

    public Document getDocument() {
        return document;
    }

    public ModeleCompteRendu getModeleCompteRendu() {
        return modeleCompteRendu;
    }

    // Setters
    public void setIdDoc(Long idDoc) {
        this.idDoc = idDoc;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public void setAvoirDoc(byte[] avoirDoc) {
        this.avoirDoc = avoirDoc;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public void setPrice(Float price) {
        this.price = price;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(Date updatedAt) {
        this.updatedAt = updatedAt;
    }

    public void setMedicalExamination(MedicalExamination medicalExamination) {
        this.medicalExamination = medicalExamination;
    }

    public void setDocument(Document document) {
        this.document = document;
    }

    public void setModeleCompteRendu(ModeleCompteRendu modeleCompteRendu) {
        this.modeleCompteRendu = modeleCompteRendu;
    }
}
