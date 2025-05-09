package pi.pperformance.elite.UserServices;

import pi.pperformance.elite.entities.ModeleCompteRendu;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Optional;

public interface IModeleCompteRenduService {

    ModeleCompteRendu saveModele(ModeleCompteRendu modele, MultipartFile previewImageFile);

    List<ModeleCompteRendu> getAllModeles();

    Optional<ModeleCompteRendu> getModeleById(Long id);

    void deleteModele(Long id);

    ModeleCompteRendu updateModele(Long id, ModeleCompteRendu updatedModele, MultipartFile previewImageFile);
}
