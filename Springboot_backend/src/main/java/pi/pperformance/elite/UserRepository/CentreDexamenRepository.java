package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.CentreDexamen;

import java.util.Optional;

@Repository
public interface CentreDexamenRepository extends JpaRepository<CentreDexamen, Long> {
    Optional<CentreDexamen> findByName(String name);
    boolean existsByNameAndAdressAndTel(String name, String adress, String tel);
}
