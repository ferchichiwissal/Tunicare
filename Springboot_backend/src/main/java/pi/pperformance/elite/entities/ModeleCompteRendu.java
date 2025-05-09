package pi.pperformance.elite.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "modele_compte_rendu") // Explicit table name as requested
public class ModeleCompteRendu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nomModele; // e.g., "IRM Cérébrale Standard", "Radio Thorax", "Scanner Abdominal"

    @Column(nullable = true) // Or false if type is mandatory
    private String typeModele; // e.g., "IRM", "Scanner", "Echographie"

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenuModele; // The actual template content (HTML or plain text)

    @Lob
    @Column(name = "preview_image", columnDefinition="LONGBLOB", nullable = true) // Use LONGBLOB for potentially larger images
    private byte[] previewImage; // Store image data directly

    // Default constructor
    public ModeleCompteRendu() {
    }

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
}
