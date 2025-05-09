package pi.pperformance.elite.UserServices;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import pi.pperformance.elite.UserRepository.ModeleCompteRenduRepository;
import pi.pperformance.elite.entities.ModeleCompteRendu;
import pi.pperformance.elite.exceptions.ResourceNotFoundException; // Assuming you have this exception

import java.io.IOException;
import java.util.List;
import java.util.Optional;


@Service
public class ModeleCompteRenduService implements IModeleCompteRenduService {

    private final ModeleCompteRenduRepository modeleRepository;

    @Autowired
    public ModeleCompteRenduService(ModeleCompteRenduRepository modeleRepository) {
        this.modeleRepository = modeleRepository;
    }
    
    @Override
    public ModeleCompteRendu saveModele(ModeleCompteRendu modele, MultipartFile previewImageFile) {
        if (previewImageFile != null && !previewImageFile.isEmpty()) {
            try {
                modele.setPreviewImage(previewImageFile.getBytes()); // Store image bytes
            } catch (IOException e) {
                // Handle exception (e.g., log it, throw custom exception)
                throw new RuntimeException("Failed to store preview image for modele: " + modele.getNomModele(), e);
            }
        } else {
             modele.setPreviewImage(null); // Ensure it's null if no file provided
        }
        return modeleRepository.save(modele);
    }

    @Override
    public List<ModeleCompteRendu> getAllModeles() {
        return modeleRepository.findAll();
    }

    @Override
    public Optional<ModeleCompteRendu> getModeleById(Long id) {
        return modeleRepository.findById(id);
    }

    @Override
    public void deleteModele(Long id) {
        if (!modeleRepository.existsById(id)) {
            throw new ResourceNotFoundException("ModeleCompteRendu not found with id: " + id);
        }
        modeleRepository.deleteById(id);
    }

    @Override
    public ModeleCompteRendu updateModele(Long id, ModeleCompteRendu updatedModeleDetails, MultipartFile previewImageFile) {
        ModeleCompteRendu existingModele = modeleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ModeleCompteRendu not found with id: " + id));

        existingModele.setNomModele(updatedModeleDetails.getNomModele());
        existingModele.setContenuModele(updatedModeleDetails.getContenuModele());
        existingModele.setTypeModele(updatedModeleDetails.getTypeModele());

        if (previewImageFile != null && !previewImageFile.isEmpty()) {
            try {
                existingModele.setPreviewImage(previewImageFile.getBytes()); // Update with new image bytes
            } catch (IOException e) {
                 throw new RuntimeException("Failed to store preview image for modele update: " + existingModele.getNomModele(), e);
            }
        }
        // If previewImageFile is null, the existing image (if any) is kept.
        // To explicitly remove an image, the frontend would need to send a specific signal,
        // or the backend could interpret a null/empty value in updatedModeleDetails differently.
        // For now, we only update if a new file is provided.

        return modeleRepository.save(existingModele);
    }
}
