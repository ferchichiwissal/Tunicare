package pi.pperformance.elite.UserServices;

import pi.pperformance.elite.dto.DoctorExamStatsByCenterDTO;
import pi.pperformance.elite.dto.CenterDoctorStatDTO; // Changed from ExamDetailStatDTO
import pi.pperformance.elite.dto.DoctorStatisticsDTO; // Ajout de l'import
import pi.pperformance.elite.dto.PatientStatisticsDTO; // Ajout de l'import
import pi.pperformance.elite.dto.DoctorCentreStatisticsDTO; // Ajout de l'import
import pi.pperformance.elite.dto.AdminGlobalStatisticsDTO; // Ajout de l'import
import pi.pperformance.elite.dto.AssistantStatisticsDTO; // Ajout de l'import
import pi.pperformance.elite.dto.MonthlyStatDTO; // Ajout de l'import

import java.util.List;

public interface IStatisticsService {
    List<DoctorExamStatsByCenterDTO> getDoctorExamStatsByCenter(Integer year, Integer month);
    List<CenterDoctorStatDTO> getCenterExamStatsByDoctor(Integer year, Integer month); // Changed return type

    // Nouvelles méthodes pour le tableau de bord personnalisé
    DoctorStatisticsDTO getDoctorDashboardStatistics(Long doctorId, Long cabinetId);
    PatientStatisticsDTO getPatientDashboardStatistics(Long patientId, Long cabinetId); // cabinetId est important pour filtrer les RDV/consultations/examens du patient dans ce cabinet spécifique
    DoctorCentreStatisticsDTO getDoctorCentreDashboardStatistics(Long doctorCentreId);
    AdminGlobalStatisticsDTO getAdminGlobalDashboardStatistics();
    AssistantStatisticsDTO getAssistantDashboardStatistics(Long assistantId, Long cabinetId);

    // Méthodes pour les graphiques
    List<MonthlyStatDTO> getPatientConsultationsPerMonth(Long patientId, Long cabinetId);
    List<MonthlyStatDTO> getPatientExamsPerMonth(Long patientId, Long cabinetId);
}
