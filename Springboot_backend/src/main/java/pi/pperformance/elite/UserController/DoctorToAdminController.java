package pi.pperformance.elite.UserController;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pi.pperformance.elite.UserRepository.UserRepository;
import pi.pperformance.elite.entities.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/doctor-admin")
@PreAuthorize("hasRole('ADMIN')")
public class DoctorToAdminController {
    
    private static final Logger log = LoggerFactory.getLogger(DoctorToAdminController.class);

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/convert-to-admin")
    @Transactional
    public ResponseEntity<?> convertDoctorToAdmin(@RequestParam Long doctorId) {
        try {
            // Rechercher le docteur
            User user = userRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            if (!(user instanceof DoctorCentreDexamen)) {
                return ResponseEntity.badRequest().body("L'utilisateur n'est pas un Docteur Centre Examen");
            }

            DoctorCentreDexamen doctor = (DoctorCentreDexamen) user;

            // Créer le nouvel admin en conservant les informations de base
            AdminCentreExamen admin = new AdminCentreExamen(
                doctor.getFirstName(),
                doctor.getLastName(),
                doctor.getEmail(),
                doctor.getPassword(),
                doctor.getBirthDate(),
                doctor.getTel(),
                doctor.getAddress(),
                doctor.getCentreDexamen()
            );

            // Copier les données supplémentaires
            admin.setGender(doctor.getGender());
            admin.setPhotoProfil(doctor.getPhotoProfil());
            admin.setSignatureImagePath(doctor.getSignatureImagePath());
            admin.setActive(true);
            admin.setRole(Role.ADMIN_CENTRE_EXAMEN);

            // Sauvegarder le nouvel admin
            userRepository.save(admin);

            log.info("Docteur ID {} converti en admin centre examen", doctorId);
            return ResponseEntity.ok("Conversion en admin centre examen réussie");

        } catch (Exception e) {
            log.error("Erreur lors de la conversion du docteur en admin: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Erreur lors de la conversion: " + e.getMessage());
        }
    }

    @GetMapping("/doctors-centre")
    public ResponseEntity<?> getAllDoctorsCentre() {
        try {
            List<DoctorCentreDexamen> doctors = userRepository.findByRole(Role.DOCTOR_CENTRE_EXAMEN)
                .stream()
                .filter(user -> user instanceof DoctorCentreDexamen)
                .map(user -> (DoctorCentreDexamen) user)
                .collect(Collectors.toList());

            return ResponseEntity.ok(doctors);
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des docteurs centre: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Erreur lors de la récupération: " + e.getMessage());
        }
    }
}
