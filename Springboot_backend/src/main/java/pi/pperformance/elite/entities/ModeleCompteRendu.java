package pi.pperformance.elite.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "modele_compte_rendu")
public class ModeleCompteRendu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nomModele;

    @Lob // Use @Lob for large text content
    @Column(nullable = false, columnDefinition = "LONGTEXT") // Explicitly define column type for large text
    private String contenuModele;

    private String typeModele; // e.g., "General", "Cardiologie", etc.

    @Lob // Use @Lob for binary data like images
    @Column(columnDefinition = "LONGBLOB") // Or appropriate type for your DB (e.g., BYTEA for PostgreSQL)
    private byte[] previewImage;

    private String previewImageType; // Store MIME type of the image

    @ManyToOne
    @JoinColumn(name = "centre_dexamen_id") // Foreign key column name
    private CentreDexamen centreDexamen;

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNomModele() {
        return nomModele;
    }

    public void setNomModele(String nomModele) {
        this.nomModele = nomModele;
    }

    public String getContenuModele() {
        return contenuModele;
    }

    public void setContenuModele(String contenuModele) {
        this.contenuModele = contenuModele;
    }

    public String getTypeModele() {
        return typeModele;
    }

    public void setTypeModele(String typeModele) {
        this.typeModele = typeModele;
    }

    public byte[] getPreviewImage() {
        return previewImage;
    }

    public void setPreviewImage(byte[] previewImage) {
        this.previewImage = previewImage;
    }

    public String getPreviewImageType() {
        return previewImageType;
    }

    public void setPreviewImageType(String previewImageType) {
        this.previewImageType = previewImageType;
    }

    public CentreDexamen getCentreDexamen() {
        return centreDexamen;
    }

    public void setCentreDexamen(CentreDexamen centreDexamen) {
        this.centreDexamen = centreDexamen;
    }
}
