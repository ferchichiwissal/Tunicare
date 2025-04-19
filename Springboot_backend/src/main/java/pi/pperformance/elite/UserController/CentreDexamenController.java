package pi.pperformance.elite.UserController;

import com.google.zxing.WriterException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pi.pperformance.elite.UserServices.CentreDexamenService;
import pi.pperformance.elite.entities.CentreDexamen;
import pi.pperformance.elite.exceptions.DuplicateResourceException;
import pi.pperformance.elite.exceptions.ResourceNotFoundException;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/centres-examen")
// @CrossOrigin(origins = "*") // Consider more specific origins for production
public class CentreDexamenController {

    private final CentreDexamenService centreDexamenService;
    private final MessageSource messageSource;

    @Autowired
    public CentreDexamenController(CentreDexamenService centreDexamenService, MessageSource messageSource) {
        this.centreDexamenService = centreDexamenService;
        this.messageSource = messageSource;
    }

    // --- CRUD Operations ---

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<CentreDexamen>> getAllCentres() {
        List<CentreDexamen> centres = centreDexamenService.getAllCentres();
        return ResponseEntity.ok(centres);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CentreDexamen> getCentreById(@PathVariable Long id) {
        CentreDexamen centre = centreDexamenService.getCentreById(id);
        return ResponseEntity.ok(centre);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CentreDexamen> addCentre(@RequestBody CentreDexamen centreDexamen) {
        CentreDexamen newCentre = centreDexamenService.addCentre(centreDexamen);
        return new ResponseEntity<>(newCentre, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CentreDexamen> updateCentre(@PathVariable Long id, @RequestBody CentreDexamen centreDetails) {
        CentreDexamen updatedCentre = centreDexamenService.updateCentre(id, centreDetails);
        return ResponseEntity.ok(updatedCentre);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCentre(@PathVariable Long id) {
        centreDexamenService.deleteCentre(id);
        return ResponseEntity.noContent().build();
    }

    // --- QR Code Generation ---

    @GetMapping("/{id}/qrcode")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> getCentreQRCode(@PathVariable Long id, @RequestParam(defaultValue = "http://localhost:3000/register-doctor-centre") String registrationUrlBase) {
        try {
            byte[] qrCode = centreDexamenService.generateQRCode(id, registrationUrlBase);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_PNG);
            headers.setContentLength(qrCode.length);
            // Optional: Set filename for download
            // headers.setContentDispositionFormData("attachment", "centre_" + id + "_qrcode.png");
            return new ResponseEntity<>(qrCode, headers, HttpStatus.OK);
        } catch (ResourceNotFoundException e) {
            // Log the exception if desired
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        } catch (WriterException | IOException e) {
            // Log the exception for QR generation/IO errors
            System.err.println("Error generating QR code for centre ID " + id + ": " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    // --- Exception Handling ---

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<String> handleDuplicateResourceException(DuplicateResourceException ex) {
        // Resolve the message key using MessageSource and the current locale
        String message = messageSource.getMessage(ex.getMessage(), null, LocaleContextHolder.getLocale());

        return ResponseEntity
                .status(HttpStatus.CONFLICT) // 409 Conflict
                .body(message); // Return the resolved, translated message
    }

    // Consider adding a @ControllerAdvice for more centralized exception handling
}
