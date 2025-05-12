package pi.pperformance.elite.UserController;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pi.pperformance.elite.UserServices.IStatisticsService;
import pi.pperformance.elite.dto.DoctorExamStatsByCenterDTO;
import pi.pperformance.elite.dto.CenterDoctorStatDTO;
import pi.pperformance.elite.dto.DoctorStatisticsDTO; // Ajout DTO
import pi.pperformance.elite.dto.PatientStatisticsDTO; // Ajout DTO
import pi.pperformance.elite.dto.DoctorCentreStatisticsDTO; // Ajout DTO
import pi.pperformance.elite.dto.AdminGlobalStatisticsDTO; // Ajout DTO
import pi.pperformance.elite.dto.AssistantStatisticsDTO; // Ajout DTO
import pi.pperformance.elite.dto.MonthlyStatDTO; // Ajout DTO
import pi.pperformance.elite.Authentif.CustomUserDetails; // Pour récupérer les infos de l'utilisateur connecté

import org.springframework.security.core.Authentication; // Pour récupérer l'authentification
import org.springframework.security.core.context.SecurityContextHolder; // Pour accéder au contexte de sécurité

import java.util.List;
import java.util.Map; // Pour les détails du token

@RestController
@RequestMapping("/api/statistics")
public class StatisticsController {

    private final IStatisticsService statisticsService;

    @Autowired
    public StatisticsController(IStatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @GetMapping("/doctor/exams-by-center")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<List<DoctorExamStatsByCenterDTO>> getDoctorExamStatsByCenter(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        List<DoctorExamStatsByCenterDTO> stats = statisticsService.getDoctorExamStatsByCenter(year, month);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/center/exams-by-doctor")
    @PreAuthorize("hasRole('DOCTOR_CENTRE_EXAMEN')")
    public ResponseEntity<List<CenterDoctorStatDTO>> getCenterExamStatsByDoctor(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        List<CenterDoctorStatDTO> stats = statisticsService.getCenterExamStatsByDoctor(year, month);
        return ResponseEntity.ok(stats);
    }

    // Endpoint pour les statistiques du tableau de bord du docteur
    @GetMapping("/dashboard/doctor")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<DoctorStatisticsDTO> getDoctorDashboardStats() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long doctorId = userDetails.getId();
        
        // Récupérer cabinetId depuis les détails de l'authentification (ajouté par JwtRequestFilter)
        @SuppressWarnings("unchecked")
        Map<String, Object> authDetails = (Map<String, Object>) authentication.getDetails();
        Long cabinetId = null;
        if (authDetails != null && authDetails.get("cabinetId") != null) {
            Object cabinetIdObj = authDetails.get("cabinetId");
            if (cabinetIdObj instanceof Integer) {
                cabinetId = ((Integer) cabinetIdObj).longValue();
            } else if (cabinetIdObj instanceof Long) {
                cabinetId = (Long) cabinetIdObj;
            }
        }

        if (cabinetId == null) {
            // Gérer le cas où cabinetId n'est pas trouvé, peut-être une erreur ou une valeur par défaut
            return ResponseEntity.status(400).body(null); // Bad Request
        }

        DoctorStatisticsDTO stats = statisticsService.getDoctorDashboardStatistics(doctorId, cabinetId);
        return ResponseEntity.ok(stats);
    }

    // Endpoint pour les statistiques du tableau de bord du patient
    @GetMapping("/dashboard/patient")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PatientStatisticsDTO> getPatientDashboardStats() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long patientId = userDetails.getId();

        @SuppressWarnings("unchecked")
        Map<String, Object> authDetails = (Map<String, Object>) authentication.getDetails();
        Long cabinetId = null;
         if (authDetails != null && authDetails.get("cabinetId") != null) {
            Object cabinetIdObj = authDetails.get("cabinetId");
            if (cabinetIdObj instanceof Integer) {
                cabinetId = ((Integer) cabinetIdObj).longValue();
            } else if (cabinetIdObj instanceof Long) {
                cabinetId = (Long) cabinetIdObj;
            }
        }
        
        if (cabinetId == null) {
             // Pour un patient, le cabinetId est crucial pour filtrer ses données spécifiques à un cabinet.
             // Si non présent, cela pourrait indiquer un problème de contexte ou que le patient n'est pas lié à un cabinet spécifique dans cette session.
            return ResponseEntity.status(400).body(null); // Bad Request
        }

        PatientStatisticsDTO stats = statisticsService.getPatientDashboardStatistics(patientId, cabinetId);
        return ResponseEntity.ok(stats);
    }

    // Endpoint pour les statistiques du tableau de bord du docteur de centre d'examen
    @GetMapping("/dashboard/doctor-centre")
    @PreAuthorize("hasRole('DOCTOR_CENTRE_EXAMEN')")
    public ResponseEntity<DoctorCentreStatisticsDTO> getDoctorCentreDashboardStats() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long doctorCentreId = userDetails.getId();

        DoctorCentreStatisticsDTO stats = statisticsService.getDoctorCentreDashboardStatistics(doctorCentreId);
        return ResponseEntity.ok(stats);
    }

    // Endpoint pour les statistiques globales du tableau de bord de l'admin
    @GetMapping("/dashboard/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminGlobalStatisticsDTO> getAdminDashboardStats() {
        AdminGlobalStatisticsDTO stats = statisticsService.getAdminGlobalDashboardStatistics();
        return ResponseEntity.ok(stats);
    }

    // Endpoint pour les statistiques du tableau de bord de l'assistant
    @GetMapping("/dashboard/assistant")
    @PreAuthorize("hasRole('ASSISTANT')")
    public ResponseEntity<AssistantStatisticsDTO> getAssistantDashboardStats() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long assistantId = userDetails.getId();

        @SuppressWarnings("unchecked")
        Map<String, Object> authDetails = (Map<String, Object>) authentication.getDetails();
        Long cabinetId = null;
        if (authDetails != null && authDetails.get("cabinetId") != null) {
            Object cabinetIdObj = authDetails.get("cabinetId");
            if (cabinetIdObj instanceof Integer) {
                cabinetId = ((Integer) cabinetIdObj).longValue();
            } else if (cabinetIdObj instanceof Long) {
                cabinetId = (Long) cabinetIdObj;
            }
        }

        if (cabinetId == null) {
            // For an assistant, cabinetId is crucial.
            return ResponseEntity.status(400).body(null); // Bad Request
        }

        AssistantStatisticsDTO stats = statisticsService.getAssistantDashboardStatistics(assistantId, cabinetId);
        return ResponseEntity.ok(stats);
    }

    // Endpoint pour les données du graphique des consultations par mois du patient
    @GetMapping("/patient/consultations-per-month")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<List<MonthlyStatDTO>> getPatientConsultationsPerMonthStats() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long patientId = userDetails.getId();

        @SuppressWarnings("unchecked")
        Map<String, Object> authDetails = (Map<String, Object>) authentication.getDetails();
        Long cabinetId = null;
        if (authDetails != null && authDetails.get("cabinetId") != null) {
            Object cabinetIdObj = authDetails.get("cabinetId");
            if (cabinetIdObj instanceof Integer) {
                cabinetId = ((Integer) cabinetIdObj).longValue();
            } else if (cabinetIdObj instanceof Long) {
                cabinetId = (Long) cabinetIdObj;
            }
        }

        if (cabinetId == null) {
            // Pour les graphiques du patient, le cabinetId est également crucial.
            return ResponseEntity.status(400).body(null); // Bad Request
        }

        List<MonthlyStatDTO> stats = statisticsService.getPatientConsultationsPerMonth(patientId, cabinetId);
        return ResponseEntity.ok(stats);
    }

    // Endpoint pour les données du graphique des examens par mois du patient
    @GetMapping("/patient/exams-per-month")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<List<MonthlyStatDTO>> getPatientExamsPerMonthStats() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long patientId = userDetails.getId();

        @SuppressWarnings("unchecked")
        Map<String, Object> authDetails = (Map<String, Object>) authentication.getDetails();
        Long cabinetId = null;
        if (authDetails != null && authDetails.get("cabinetId") != null) {
            Object cabinetIdObj = authDetails.get("cabinetId");
            if (cabinetIdObj instanceof Integer) {
                cabinetId = ((Integer) cabinetIdObj).longValue();
            } else if (cabinetIdObj instanceof Long) {
                cabinetId = (Long) cabinetIdObj;
            }
        }

        if (cabinetId == null) {
             return ResponseEntity.status(400).body(null); // Bad Request
        }

        List<MonthlyStatDTO> stats = statisticsService.getPatientExamsPerMonth(patientId, cabinetId);
        return ResponseEntity.ok(stats);
    }
}
