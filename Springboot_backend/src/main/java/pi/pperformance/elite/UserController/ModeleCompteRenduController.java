package pi.pperformance.elite.UserController;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*; // Import HttpHeaders
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pi.pperformance.elite.UserServices.IModeleCompteRenduService;
import pi.pperformance.elite.entities.ModeleCompteRendu;
import pi.pperformance.elite.UserServices.IModeleCompteRenduService;
import pi.pperformance.elite.entities.ModeleCompteRendu;
import pi.pperformance.elite.exceptions.ResourceNotFoundException;

import java.util.List;
import java.util.Optional; // Import Optional
import java.util.stream.Collectors; // For modifying the list response

@RestController
@RequestMapping("/api/modeles-compte-rendu")
public class ModeleCompteRenduController {

    private final IModeleCompteRenduService modeleService;

    @Autowired
    public ModeleCompteRenduController(IModeleCompteRenduService modeleService) {
        this.modeleService = modeleService;
    }

    // Endpoint pour créer un nouveau modèle (Admin ou rôle spécifique ?)
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')") // Adjust authorization as needed
    public ResponseEntity<ModeleCompteRendu> createModele(
            @RequestPart("nomModele") String nomModele,
            @RequestPart("contenuModele") String contenuModele,
            @RequestPart(value = "typeModele", required = false) String typeModele,
            @RequestPart(value = "previewImageFile", required = false) MultipartFile previewImageFile) {
        
        ModeleCompteRendu modele = new ModeleCompteRendu();
        modele.setNomModele(nomModele);
        modele.setContenuModele(contenuModele);
        if (typeModele != null) {
            modele.setTypeModele(typeModele);
        }
        
        ModeleCompteRendu savedModele = modeleService.saveModele(modele, previewImageFile);
        return new ResponseEntity<>(savedModele, HttpStatus.CREATED);
    }

    // Endpoint pour récupérer tous les modèles (Accessible par DOCTOR_CENTRE_EXAMEN)
    @GetMapping
    @PreAuthorize("hasRole('DOCTOR_CENTRE_EXAMEN') or hasRole('ADMIN')") // Allow centre doctors and admins
    public ResponseEntity<List<ModeleCompteRendu>> getAllModeles() {
        List<ModeleCompteRendu> modeles = modeleService.getAllModeles();
        // Set image data to null to avoid sending large blobs in the list
        modeles.forEach(modele -> modele.setPreviewImage(null)); 
        return ResponseEntity.ok(modeles);
    }

    // Endpoint pour récupérer un modèle par ID (Admin ou rôle spécifique ?) - WITHOUT image data
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DOCTOR_CENTRE_EXAMEN')") // Adjust authorization
    public ResponseEntity<ModeleCompteRendu> getModeleById(@PathVariable Long id) {
        return modeleService.getModeleById(id)
                .map(modele -> {
                    modele.setPreviewImage(null); // Exclude image data from standard GET by ID
                    return ResponseEntity.ok(modele);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Endpoint pour récupérer SEULEMENT l'image preview d'un modèle par ID
    // Made public to allow direct access from <img> tags (no @PreAuthorize)
    @GetMapping("/{id}/preview-image")
    public ResponseEntity<byte[]> getModelePreviewImage(@PathVariable Long id) {
        Optional<ModeleCompteRendu> modeleOpt = modeleService.getModeleById(id);

        if (modeleOpt.isPresent()) {
            ModeleCompteRendu modele = modeleOpt.get();
            if (modele.getPreviewImage() != null && modele.getPreviewImage().length > 0) {
                HttpHeaders headers = new HttpHeaders();
                // Simplify content type for debugging - let browser infer or use generic stream
                headers.setContentType(MediaType.APPLICATION_OCTET_STREAM); 
                headers.setContentLength(modele.getPreviewImage().length);
                // Optional: Add Content-Disposition if you want to suggest a filename (might not be needed for direct display)
                // headers.setContentDisposition(ContentDisposition.builder("inline").filename("preview.jpg").build()); 
                System.out.println("Serving image for template ID: " + id + " with size: " + modele.getPreviewImage().length); // Add logging
                return new ResponseEntity<>(modele.getPreviewImage(), headers, HttpStatus.OK);
            } else {
                // Template exists, but no image data
                System.out.println("No image data found for template ID: " + id); // Add logging
                return ResponseEntity.notFound().build();
            }
        } else {
            // Template not found
             System.out.println("Template not found for ID: " + id); // Add logging
            return ResponseEntity.notFound().build();
        }
    }


    // Endpoint pour supprimer un modèle (Admin ou rôle spécifique ?)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')") // Adjust authorization
    public ResponseEntity<Void> deleteModele(@PathVariable Long id) {
        try {
            modeleService.deleteModele(id);
            return ResponseEntity.noContent().build();
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            // Log error
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Endpoint pour mettre à jour un modèle (si nécessaire)
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')") // Adjust authorization
    public ResponseEntity<ModeleCompteRendu> updateModele(
            @PathVariable Long id,
            @RequestPart("nomModele") String nomModele,
            @RequestPart("contenuModele") String contenuModele,
            @RequestPart(value = "typeModele", required = false) String typeModele,
            @RequestPart(value = "previewImageFile", required = false) MultipartFile previewImageFile) {
        try {
            ModeleCompteRendu updatedModeleDetails = new ModeleCompteRendu();
            updatedModeleDetails.setNomModele(nomModele);
            updatedModeleDetails.setContenuModele(contenuModele);
            if (typeModele != null) {
                updatedModeleDetails.setTypeModele(typeModele);
            }

            ModeleCompteRendu modele = modeleService.updateModele(id, updatedModeleDetails, previewImageFile);
            return ResponseEntity.ok(modele);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            // Log error
            System.err.println("Error updating modele compte rendu " + id + ": " + e.getMessage()); // Added logging
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
