package pi.pperformance.elite.UserController;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pi.pperformance.elite.UserServices.ICertificateService;
import pi.pperformance.elite.dto.CertificateInfoDTO; // Import the DTO
import pi.pperformance.elite.entities.Certificate;
import pi.pperformance.elite.exceptions.ResourceNotFoundException; // Assuming you have this

import java.io.IOException;

@RestController
@RequestMapping("/api/certificates")
// Removed @AllArgsConstructor
// Removed conflicting @CrossOrigin annotation; will inherit global CORS config
public class CertificateController {

    private final ICertificateService certificateService;

    // Explicit constructor for dependency injection
    @Autowired
    public CertificateController(ICertificateService certificateService) {
        this.certificateService = certificateService;
    }

    // Endpoint for Doctor to upload a certificate for a consultation
    @PostMapping("/upload/{consultationId}")
    @PreAuthorize("hasRole('DOCTOR')") // Only doctors can upload
    public ResponseEntity<?> uploadCertificate(@PathVariable Long consultationId,
                                               @RequestParam("file") MultipartFile file) {
        try {
            Certificate savedCertificate = certificateService.saveCertificate(consultationId, file);
            // Return minimal info, perhaps just the ID or a success message
            return ResponseEntity.status(HttpStatus.CREATED).body("Certificate uploaded successfully for consultation " + consultationId);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Could not upload the file: " + e.getMessage());
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            // Catch any other unexpected errors
             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An unexpected error occurred during file upload.");
        }
    }

    // Endpoint for Patient (or Doctor) to download the certificate for a consultation
    @GetMapping("/download/consultation/{consultationId}")
    @PreAuthorize("hasAnyRole('PATIENT', 'DOCTOR')") // Allow both roles
    public ResponseEntity<Resource> downloadCertificateByConsultationId(@PathVariable Long consultationId) {
        Certificate certificate = certificateService.getCertificateByConsultationId(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Certificate not found for consultation id: " + consultationId));

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(certificate.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + certificate.getFileName() + "\"")
                .body(new ByteArrayResource(certificate.getData()));
    }

    // Optional: Endpoint to get certificate details (without data) by consultation ID
    @GetMapping("/details/consultation/{consultationId}")
    @PreAuthorize("hasAnyRole('PATIENT', 'DOCTOR')")
    public ResponseEntity<?> getCertificateDetailsByConsultationId(@PathVariable Long consultationId) {
         return certificateService.getCertificateByConsultationId(consultationId)
                .map(cert -> ResponseEntity.ok().body(new CertificateInfoDTO(cert.getId(), cert.getFileName(), cert.getContentType()))) // Need to create CertificateInfoDTO
                 .orElse(ResponseEntity.notFound().build());
    }

    // Removed static inner class CertificateInfoDTO definition
}
