package pi.pperformance.elite.UserController;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pi.pperformance.elite.UserServices.AdminCentreExamenService;
import pi.pperformance.elite.entities.AdminCentreExamen;
import pi.pperformance.elite.exceptions.ResourceNotFoundException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin-centre-examen")
public class AdminCentreExamenController {

    @Autowired
    private AdminCentreExamenService adminCentreExamenService;

    // Get all Admin Centres (for Admin role)
    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AdminCentreExamen>> getAllAdminCentres() {
        List<AdminCentreExamen> adminCentres = adminCentreExamenService.getAllAdminCentres();
        return ResponseEntity.ok(adminCentres);
    }

    // Get Admin Centre by ID (for Admin role)
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAdminCentreById(@PathVariable Long id) {
        try {
            AdminCentreExamen adminCentre = adminCentreExamenService.getAdminCentreById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("AdminCentreExamen not found with id " + id));
            return ResponseEntity.ok(adminCentre);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // Update Admin Centre by ID (for Admin role)
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateAdminCentre(@PathVariable Long id, @RequestBody AdminCentreExamen adminCentreExamenDetails) {
        try {
            AdminCentreExamen updatedAdminCentre = adminCentreExamenService.updateAdminCentre(id, adminCentreExamenDetails);
            return ResponseEntity.ok(updatedAdminCentre);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Error updating AdminCentreExamen: " + e.getMessage()));
        }
    }

    // Delete Admin Centre by ID (for Admin role)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteAdminCentre(@PathVariable Long id) {
        try {
            adminCentreExamenService.deleteAdminCentre(id);
            return ResponseEntity.noContent().build(); // 204 No Content
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Error deleting AdminCentreExamen: " + e.getMessage()));
        }
    }

    // Toggle Admin Centre status by ID (for Admin role)
    @PutMapping("/{id}/toggle-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> toggleAdminCentreStatus(@PathVariable Long id) {
        try {
            AdminCentreExamen updatedAdminCentre = adminCentreExamenService.toggleAdminCentreStatus(id);
            return ResponseEntity.ok(Map.of(
                    "message", "Admin Centre status updated successfully.",
                    "adminCentreId", updatedAdminCentre.getId(),
                    "newStatus", updatedAdminCentre.isActive()
            ));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Error toggling Admin Centre status: " + e.getMessage()));
        }
    }
}
