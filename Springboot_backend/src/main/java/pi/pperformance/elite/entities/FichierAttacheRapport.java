package pi.pperformance.elite.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "fichier_attache_rapport")
public class FichierAttacheRapport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nomFichier;

    @Column(nullable = false)
    private String typeMime; // e.g., "application/pdf", "image/jpeg"

    @Lob
    @Column(nullable = false, columnDefinition = "BLOB")
    private byte[] contenu;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medical_examination_id", nullable = false)
    private MedicalExamination medicalExamination;

    // Constructors
    public FichierAttacheRapport() {
    }

    public FichierAttacheRapport(String nomFichier, String typeMime, byte[] contenu, MedicalExamination medicalExamination) {
        this.nomFichier = nomFichier;
        this.typeMime = typeMime;
        this.contenu = contenu;
        this.medicalExamination = medicalExamination;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNomFichier() {
        return nomFichier;
    }

    public void setNomFichier(String nomFichier) {
        this.nomFichier = nomFichier;
    }

    public String getTypeMime() {
        return typeMime;
    }

    public void setTypeMime(String typeMime) {
        this.typeMime = typeMime;
    }

    public byte[] getContenu() {
        return contenu;
    }

    public void setContenu(byte[] contenu) {
        this.contenu = contenu;
    }

    public MedicalExamination getMedicalExamination() {
        return medicalExamination;
    }

    public void setMedicalExamination(MedicalExamination medicalExamination) {
        this.medicalExamination = medicalExamination;
    }
}
