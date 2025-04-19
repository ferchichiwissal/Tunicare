package pi.pperformance.elite.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class PrescribedMedications implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_ord") // Matches diagram field name
    private Long idOrd;

    @Lob // Assuming this could be a large text field
    private String prescribedMedications; // Matches diagram field name

    // Relationship: MedicalExamination 'prescrire' PrescribedMedications (1 to 0..1)
    // This relationship is typically mapped from the owning side (MedicalExamination).
    // We add a reference here if needed, but the mapping is defined in MedicalExamination.
    @OneToOne(mappedBy = "prescribedMedications")
    private MedicalExamination medicalExamination;

    // Note: Timestamps (createdAt, updatedAt) are not shown in the diagram for this entity.
}
