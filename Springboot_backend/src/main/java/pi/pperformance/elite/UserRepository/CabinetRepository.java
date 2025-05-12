package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.CabinetDr;

@Repository
public interface CabinetRepository extends JpaRepository<CabinetDr, Long> {
    // Aucune méthode personnalisée nécessaire pour l'instant pour les statistiques globales (count() est fourni par JpaRepository)
}
