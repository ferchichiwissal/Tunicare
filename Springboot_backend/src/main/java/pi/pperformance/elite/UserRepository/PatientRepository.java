package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import pi.pperformance.elite.entities.Patient;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {
    // Méthodes personnalisées pour la gestion des patients
    Patient findByEmail(String email); // Exemple de méthode pour rechercher un patient par email
    // Vous pouvez ajouter d'autres méthodes de recherche si nécessaie
}