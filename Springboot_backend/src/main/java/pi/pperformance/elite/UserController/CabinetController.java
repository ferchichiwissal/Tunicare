package pi.pperformance.elite.UserController;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication; // For checking user
import org.springframework.security.core.context.SecurityContextHolder; // For checking user
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile; // For file upload

import pi.pperformance.elite.entities.CabinetDr;
import pi.pperformance.elite.UserRepository.CabinetDrRepository;
import pi.pperformance.elite.UserRepository.UserRepository;
import pi.pperformance.elite.entities.Patient; // Import Patient
import pi.pperformance.elite.entities.User; // Import User (if needed for casting)
import org.springframework.transaction.annotation.Transactional;
import java.util.List; // Import List

// import java.sql.Date; // Remove if not needed elsewhere
import java.time.LocalDate;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files; // For file operations
import java.nio.file.Path; // For file operations
import java.nio.file.Paths; // For file operations
import java.nio.file.StandardCopyOption; // For file operations
import java.util.Optional;
import java.util.UUID; // For unique filenames

import javax.imageio.ImageIO; // Correct import for ImageIO

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

import org.springframework.http.MediaType; // Import MediaType

@RestController
@RequestMapping("/cabinets")
// Add @CrossOrigin if needed, similar to UserController
public class CabinetController {

    @Autowired
    private CabinetDrRepository cabinetRepository;

    @Autowired
    private UserRepository userRepository; // Inject UserRepository

    // Endpoint to create a new cabinet - Only accessible by ADMIN
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createCabinet(@RequestBody CabinetDr cabinetDetails) {
        try {
            // Basic validation (can be enhanced)
            if (cabinetDetails.getName() == null || cabinetDetails.getName().isEmpty() ||
                cabinetDetails.getAddress() == null || cabinetDetails.getAddress().isEmpty()) {
                return ResponseEntity.badRequest().body("Cabinet name and address are required.");
            }

            // Check for existing cabinet with the same name and address
            Optional<CabinetDr> existingCabinet = cabinetRepository.findByNameAndAddress(cabinetDetails.getName(), cabinetDetails.getAddress());
            if (existingCabinet.isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("Un cabinet avec ce nom et cette adresse existe déjà.");
            }

            // Set creation/update timestamps using LocalDate
            LocalDate today = LocalDate.now();
            cabinetDetails.setCreatedAt(today);
            cabinetDetails.setUpdatedAt(today);

            CabinetDr savedCabinet = cabinetRepository.save(cabinetDetails);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedCabinet);

        } catch (Exception e) {
            // Log the exception e.g., using SLF4J logger
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error creating cabinet: " + e.getMessage());
        }
    }

    // Endpoint to get all cabinets (optional, maybe useful for Admin)
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')") // Or allow other roles if needed
    public ResponseEntity<?> getAllCabinets() {
        try {
            return ResponseEntity.ok(cabinetRepository.findAll());
        } catch (Exception e) {
             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error retrieving cabinets: " + e.getMessage());
        }
    }

    // Endpoint to get a single cabinet by ID - Accessible by ADMIN
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getCabinetById(@PathVariable Long id) {
        try {
            Optional<CabinetDr> cabinetOpt = cabinetRepository.findById(id);
            if (cabinetOpt.isPresent()) {
                return ResponseEntity.ok(cabinetOpt.get());
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Cabinet not found with id: " + id);
            }
        } catch (Exception e) {
            // Log the exception
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error retrieving cabinet: " + e.getMessage());
        }
    }

    // Endpoint to generate QR code for a specific cabinet ID
    @GetMapping("/{id}/qrcode")
    // Decide who can generate QR codes (Admin? Doctor? Assistant?) - Let's allow Admin for now
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> generateCabinetQrCode(@PathVariable Long id) {
        Optional<CabinetDr> cabinetOpt = cabinetRepository.findById(id);
        if (!cabinetOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Cabinet not found.");
        }

        // Define the URL for the frontend registration page, including the cabinetId
        // Adjust the base URL (http://localhost:3000) and path (/register) as needed
        String registrationUrl = "http://localhost:3000/Registration?cabinetId=" + id;
        //String registrationUrl = "http://192.168.52.84:3000/Registration?cabinetId=" + id;

        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(registrationUrl, BarcodeFormat.QR_CODE, 250, 250); // width, height

            ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);
            byte[] pngData = pngOutputStream.toByteArray();

            return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).body(pngData);

        } catch (WriterException | IOException e) {
            // Log the exception
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error generating QR code: " + e.getMessage());
        }
    }

// Endpoint to update an existing cabinet - Only accessible by ADMIN
@PutMapping("/{id}")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<?> updateCabinet(@PathVariable Long id, @RequestBody CabinetDr cabinetDetails) {
    try {
        Optional<CabinetDr> cabinetOpt = cabinetRepository.findById(id);
        if (!cabinetOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Cabinet not found with id: " + id);
        }

        CabinetDr existingCabinet = cabinetOpt.get();

        // Basic validation for required fields if they are being updated
        if (cabinetDetails.getName() != null && cabinetDetails.getName().isEmpty()) {
             return ResponseEntity.badRequest().body("Cabinet name cannot be empty.");
        }
         if (cabinetDetails.getAddress() != null && cabinetDetails.getAddress().isEmpty()) {
             return ResponseEntity.badRequest().body("Cabinet address cannot be empty.");
        }

        // Check for duplicate name/address conflict ONLY if name or address is changed
        boolean nameChanged = cabinetDetails.getName() != null && !cabinetDetails.getName().equals(existingCabinet.getName());
        boolean addressChanged = cabinetDetails.getAddress() != null && !cabinetDetails.getAddress().equals(existingCabinet.getAddress());

        if (nameChanged || addressChanged) {
            String checkName = nameChanged ? cabinetDetails.getName() : existingCabinet.getName();
            String checkAddress = addressChanged ? cabinetDetails.getAddress() : existingCabinet.getAddress();

            Optional<CabinetDr> conflictCabinet = cabinetRepository.findByNameAndAddress(checkName, checkAddress);
            // Ensure the conflict is not with the cabinet itself
            if (conflictCabinet.isPresent() && !conflictCabinet.get().getIdSite().equals(id)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("Un autre cabinet avec ce nom et cette adresse existe déjà.");
            }
            } // End of check for name/address conflict in updateCabinet


        // Update fields from request body (only update non-null fields)
        if (cabinetDetails.getName() != null) {
            existingCabinet.setName(cabinetDetails.getName());
        }
        if (cabinetDetails.getAddress() != null) {
            existingCabinet.setAddress(cabinetDetails.getAddress());
        }
        if (cabinetDetails.getTel() != null) { // Allow updating tel
            existingCabinet.setTel(cabinetDetails.getTel());
        }
         if (cabinetDetails.getFax() != null) { // Allow updating fax
            existingCabinet.setFax(cabinetDetails.getFax());
        }
         if (cabinetDetails.getTaxNumber() != null) { // Allow updating taxNumber
            existingCabinet.setTaxNumber(cabinetDetails.getTaxNumber());
        }

        // Update the timestamp
        existingCabinet.setUpdatedAt(LocalDate.now());

        CabinetDr updatedCabinet = cabinetRepository.save(existingCabinet);
        return ResponseEntity.ok(updatedCabinet);

    } catch (Exception e) {
        // Log the exception
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error updating cabinet: " + e.getMessage());
    }
} // End of updateCabinet method

    // Endpoint to delete a cabinet and its associated users - Only accessible by ADMIN
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional // Ensure atomicity: all operations succeed or none do
    public ResponseEntity<?> deleteCabinet(@PathVariable Long id) {
        try {
            // 1. Check if cabinet exists
            Optional<CabinetDr> cabinetOpt = cabinetRepository.findById(id);
            if (!cabinetOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Cabinet not found with id: " + id);
            }
            CabinetDr cabinetToDelete = cabinetOpt.get();

            // 2. Delete associated Doctors and Assistants directly
            userRepository.deleteDoctorsByCabinet(cabinetToDelete);
            userRepository.deleteAssistantsByCabinet(cabinetToDelete);

            // 3. Handle Patients (ManyToMany relationship) - Delete associations from join table
            cabinetRepository.deletePatientAssociations(cabinetToDelete.getIdSite());

            // 4. Delete the cabinet itself
            cabinetRepository.delete(cabinetToDelete);

            return ResponseEntity.status(HttpStatus.NO_CONTENT).build(); // Success, no content to return

        } catch (Exception e) {
            // Log the exception e.g., using SLF4J logger
            // Consider more specific exception handling (e.g., DataAccessException)
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error deleting cabinet: " + e.getMessage());
        }
    }

    // --- Signature Upload Endpoint ---

    // Define the upload directory relative to the application's running location
    // IMPORTANT: In production, make this path configurable and external if possible.
    private static final String SIGNATURE_UPLOAD_DIR = "uploads/signatures/";

    @PostMapping("/{id}/signature")
    @PreAuthorize("hasRole('DOCTOR') or hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> uploadSignature(@PathVariable Long id, @RequestParam("signatureFile") MultipartFile file) {
        try {
            // 1. Validate Cabinet Exists
            Optional<CabinetDr> cabinetOpt = cabinetRepository.findById(id);
            if (!cabinetOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Cabinet not found with id: " + id);
            }
            CabinetDr cabinet = cabinetOpt.get();

            // 2. Security Check: Ensure the logged-in user is the doctor associated with this cabinet or an Admin
            // TODO: Implement more robust security check. Compare authenticated user's ID/Cabinet ID
            //       with the cabinet being modified, especially for the DOCTOR role.
            // Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            // String currentUsername = authentication.getName();
            // User currentUser = userRepository.findByEmail(currentUsername).orElse(null);
            // if (currentUser == null || (!currentUser.getRole().equals(Role.ADMIN) &&
            //     (currentUser.getRole().equals(Role.DOCTOR) && (cabinet.getDoctor() == null || !cabinet.getDoctor().getId().equals(currentUser.getId()))))) {
            //     return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are not authorized to update this cabinet's signature.");
            // }


            // 3. Validate File
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("Please select a signature file to upload.");
            }

            // Basic content type validation (allow common image types)
            String contentType = file.getContentType();
            if (contentType == null || (!contentType.equals("image/png") && !contentType.equals("image/jpeg") && !contentType.equals("image/jpg"))) {
                 return ResponseEntity.badRequest().body("Invalid file type. Only PNG, JPG, or JPEG are allowed.");
            }

            // 4. Prepare Storage Path and Filename
            Path uploadPath = Paths.get(SIGNATURE_UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath); // Create directories if they don't exist
            }

            // Create a unique filename or use a predictable one (e.g., based on cabinet ID)
            String originalFilename = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            // Using cabinet ID for predictability, ensure extension is valid
            String filename = "signature_cabinet_" + id + (fileExtension.isEmpty() ? ".png" : fileExtension); // Default to .png if no extension found
            Path filePath = uploadPath.resolve(filename);

            // 5. Save the File
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // 6. Update Cabinet Entity
            // Store the relative path or a path identifier in the database
            cabinet.setSignatureImagePath(SIGNATURE_UPLOAD_DIR + filename); // Store relative path
            cabinet.setUpdatedAt(LocalDate.now()); // Update timestamp
            cabinetRepository.save(cabinet);

            return ResponseEntity.ok().body("Signature uploaded successfully for cabinet " + id);

        } catch (IOException e) {
            // Log the exception
             System.err.println("Could not save signature file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Could not save signature file: " + e.getMessage());
        } catch (Exception e) {
            // Log the exception
             System.err.println("Error uploading signature: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error uploading signature: " + e.getMessage());
        }
    }


} // End of CabinetController class
