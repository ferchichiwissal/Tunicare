package pi.pperformance.elite.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.Set; // For OneToMany relationship

@Entity
@Getter
@Setter
@NoArgsConstructor
public class ModeleCompteRendu implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Primary key from diagram

    // No other fields shown in the diagram for ModeleCompteRendu itself

    // Relationship: CompteRendu 'orienter vers' ModeleCompteRendu (0..* to 0..1 - Inverse Side)
    @OneToMany(mappedBy = "modeleCompteRendu", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<CompteRendu> compteRendus;

    // Note: Timestamps (createdAt, updatedAt) are not shown in the diagram for this entity.
}
