package pi.pperformance.elite.UserServices;

import pi.pperformance.elite.dto.DoctorExamStatsByCenterDTO;
import pi.pperformance.elite.dto.CenterDoctorStatDTO; // Changed from ExamDetailStatDTO

import java.util.List;

public interface IStatisticsService {
    List<DoctorExamStatsByCenterDTO> getDoctorExamStatsByCenter(Integer year, Integer month);
    List<CenterDoctorStatDTO> getCenterExamStatsByDoctor(Integer year, Integer month); // Changed return type
}