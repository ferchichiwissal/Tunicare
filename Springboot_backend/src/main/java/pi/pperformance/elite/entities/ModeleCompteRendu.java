package pi.pperformance.elite.entities;

import jakarta.persistence.*;

import java.io.Serializable;
import java.util.Set; // For OneToMany relationship

@Entity
public class ModeleCompteRendu implements Serializable {

    // Explicit no-argument constructor
    public ModeleCompteRendu() {
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Primary key from diagram

    // No other fields shown in the diagram for ModeleCompteRendu itself

    // Relationship: CompteRendu 'orienter vers' ModeleCompteRendu (0..* to 0..1 - Inverse Side)
    @OneToMany(mappedBy = "modeleCompteRendu", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<CompteRendu> compteRendus;

    // Note: Timestamps (createdAt, updatedAt) are not shown in the diagram for this entity.

    // Getters
    public Long getId() {
        return id;
    }

    public Set<CompteRendu> getCompteRendus() {
        return compteRendus;
    }

    // Setters
    public void setId(Long id) {
        this.id = id;
    }

    public void setCompteRendus(Set<CompteRendu> compteRendus) {
        this.compteRendus = compteRendus;
    }
}
