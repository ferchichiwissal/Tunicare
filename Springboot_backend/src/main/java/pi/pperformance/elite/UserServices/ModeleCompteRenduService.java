package pi.pperformance.elite.UserServices;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import pi.pperformance.elite.UserRepository.ModeleCompteRenduRepository;
import pi.pperformance.elite.UserRepository.UserRepository; // Import UserRepository
import pi.pperformance.elite.entities.ModeleCompteRendu;
import pi.pperformance.elite.entities.User; // Import User
import pi.pperformance.elite.entities.AdminCentreExamen; // Import AdminCentreExamen
import pi.pperformance.elite.entities.DoctorCentreDexamen; // Import DoctorCentreDexamen
import pi.pperformance.elite.entities.CentreDexamen; // Import CentreDexamen
import pi.pperformance.elite.exceptions.ResourceNotFoundException;
import pi.pperformance.elite.exceptions.UnauthorizedActionException; // Assuming you have this exception or create one

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors; // Import Collectors


@Service
public class ModeleCompteRenduService implements IModeleCompteRenduService {

    private final ModeleCompteRenduRepository modeleRepository;
    private final UserRepository userRepository; // Inject UserRepository

    @Autowired
    public ModeleCompteRenduService(ModeleCompteRenduRepository modeleRepository, UserRepository userRepository) {
        this.modeleRepository = modeleRepository;
        this.userRepository = userRepository;
    }

    // Helper method to get the CentreDexamen of the logged-in user
    private CentreDexamen getUserCentreDexamen() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentPrincipalName = authentication.getName();
        User currentUser = userRepository.findByEmail(currentPrincipalName);

        if (currentUser == null) {
            throw new ResourceNotFoundException("User not found");
        }

        if (currentUser instanceof AdminCentreExamen) {
            return ((AdminCentreExamen) currentUser).getCentreDexamen();
        } else if (currentUser instanceof DoctorCentreDexamen) {
            return ((DoctorCentreDexamen) currentUser).getCentreDexamen();
        } else {
            // Handle other roles if necessary, maybe they don't have a centre or have a different type of association
            throw new UnauthorizedActionException("User role does not have an associated CentreDexamen");
        }
    }
    
    @Override
    public ModeleCompteRendu saveModele(ModeleCompteRendu modele, MultipartFile previewImageFile) {
        // Only AdminCentreExamen should create templates for their centre
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN_CENTRE_EXAMEN"))) {
             throw new UnauthorizedActionException("Only AdminCentreExamen can create report templates.");
        }

        CentreDexamen userCentre = getUserCentreDexamen();
        modele.setCentreDexamen(userCentre); // Associate the template with the user's centre

        if (previewImageFile != null && !previewImageFile.isEmpty()) {
            try {
                modele.setPreviewImage(previewImageFile.getBytes()); // Store image bytes
                modele.setPreviewImageType(previewImageFile.getContentType()); // Store MIME type
            } catch (IOException e) {
                throw new RuntimeException("Failed to store preview image for modele: " + modele.getNomModele(), e);
            }
        } else {
             modele.setPreviewImage(null); // Ensure it's null if no file provided
             modele.setPreviewImageType(null); // Ensure type is null too
        }
        return modeleRepository.save(modele);
    }

    @Override
    public List<ModeleCompteRendu> getAllModeles() {
        // AdminCentreExamen and DoctorCentreExamen see templates for their cabinet
        CentreDexamen userCentre = getUserCentreDexamen();
        return modeleRepository.findByCentreDexamen(userCentre); // Need to add this method to the repository
    }

    @Override
    public Optional<ModeleCompteRendu> getModeleById(Long id) {
        Optional<ModeleCompteRendu> modeleOpt = modeleRepository.findById(id);

        if (modeleOpt.isPresent()) {
            ModeleCompteRendu modele = modeleOpt.get();
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            // Global ADMIN can access any template
            if (authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                return Optional.of(modele);
            }

            // AdminCentreExamen and DoctorCentreDexamen can only access templates from their cabinet
            CentreDexamen userCentre = getUserCentreDexamen();
            if (modele.getCentreDexamen() != null && modele.getCentreDexamen().getIdCentre().equals(userCentre.getIdCentre())) {
                return Optional.of(modele);
            } else {
                // Template exists but does not belong to the user's centre
                throw new UnauthorizedActionException("You are not authorized to access this report template.");
            }
        }
        // Template not found
        return Optional.empty();
    }

    @Override
    public Optional<ModeleCompteRendu> getModelePreviewImageById(Long id) {
        // This method is intended for public access to the image data only,
        // so it does not perform authorization checks based on the user's centre.
        return modeleRepository.findById(id);
    }


    @Override
    public void deleteModele(Long id) {
        ModeleCompteRendu modele = modeleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ModeleCompteRendu not found with id: " + id));

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        // Only AdminCentreExamen can delete templates, and only from their centre
        if (authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN_CENTRE_EXAMEN"))) {
             CentreDexamen userCentre = getUserCentreDexamen();
             if (modele.getCentreDexamen() != null && modele.getCentreDexamen().getIdCentre().equals(userCentre.getIdCentre())) {
                  modeleRepository.delete(modele);
              } else {
                  throw new UnauthorizedActionException("You are not authorized to delete this report template.");
              }
         } else {
             throw new UnauthorizedActionException("Only AdminCentreExamen can delete report templates.");
         }
     }

    @Override
    public ModeleCompteRendu updateModele(Long id, ModeleCompteRendu updatedModeleDetails, MultipartFile previewImageFile) {
        ModeleCompteRendu existingModele = modeleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ModeleCompteRendu not found with id: " + id));

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        // Only AdminCentreExamen can update templates, and only from their centre
        if (authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN_CENTRE_EXAMEN"))) {
            CentreDexamen userCentre = getUserCentreDexamen();
            if (existingModele.getCentreDexamen() != null && existingModele.getCentreDexamen().getIdCentre().equals(userCentre.getIdCentre())) {
                existingModele.setNomModele(updatedModeleDetails.getNomModele());
                existingModele.setContenuModele(updatedModeleDetails.getContenuModele());
                existingModele.setTypeModele(updatedModeleDetails.getTypeModele());

                if (previewImageFile != null && !previewImageFile.isEmpty()) {
                    try {
                        existingModele.setPreviewImage(previewImageFile.getBytes());
                        existingModele.setPreviewImageType(previewImageFile.getContentType()); // Store MIME type
                    } catch (IOException e) {
                         throw new RuntimeException("Failed to store preview image for modele update: " + existingModele.getNomModele(), e);
                    }
                } else {
                    // If no new file is uploaded, decide whether to clear the existing image/type
                    // For now, let's assume we keep the old one if no new file is provided.
                    // If you need to support clearing the image, add a flag in the request.
                }
                return modeleRepository.save(existingModele);
            } else {
                throw new UnauthorizedActionException("You are not authorized to update this report template.");
            }
        } else {
            throw new UnauthorizedActionException("Only AdminCentreExamen can update report templates.");
        }
    }
}
