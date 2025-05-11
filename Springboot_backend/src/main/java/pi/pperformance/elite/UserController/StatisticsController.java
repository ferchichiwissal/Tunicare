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
import pi.pperformance.elite.dto.CenterDoctorStatDTO; // Changed from ExamDetailStatDTO

import java.util.List;

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
    public ResponseEntity<List<CenterDoctorStatDTO>> getCenterExamStatsByDoctor( // Changed return type
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        List<CenterDoctorStatDTO> stats = statisticsService.getCenterExamStatsByDoctor(year, month); // Changed variable type
        return ResponseEntity.ok(stats);
    }
}