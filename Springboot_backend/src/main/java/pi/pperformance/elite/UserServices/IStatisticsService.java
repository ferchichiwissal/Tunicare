package pi.pperformance.elite.UserServices;

import pi.pperformance.elite.dto.DoctorExamStatsByCenterDTO;
import pi.pperformance.elite.dto.CenterDoctorStatDTO; // Changed from ExamDetailStatDTO
import pi.pperformance.elite.dto.DoctorStatisticsDTO; // Ajout de l'import
import pi.pperformance.elite.dto.PatientStatisticsDTO; // Ajout de l'import
import pi.pperformance.elite.dto.DoctorCentreStatisticsDTO; // Ajout de l'import
import pi.pperformance.elite.dto.AdminGlobalStatisticsDTO; // Ajout de l'import
import pi.pperformance.elite.dto.AssistantStatisticsDTO; // Ajout de l'import
import pi.pperformance.elite.dto.MonthlyStatDTO; // Ajout de l'import
import pi.pperformance.elite.dto.AppointmentDistributionDTO; // Import the new DTO

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

    // Nouvelles méthodes pour les graphiques du docteur
    List<MonthlyStatDTO> getDoctorConsultationsPerMonth(Long doctorId, Long cabinetId);
    List<MonthlyStatDTO> getDoctorPatientsPerMonth(Long doctorId, Long cabinetId);

    // New method for appointment distribution by month for the doctor
    AppointmentDistributionDTO getDoctorAppointmentDistributionByMonth(Long cabinetId, Integer year, Integer month);

    // Nouvelles méthodes pour les graphiques de l'administrateur global
    List<MonthlyStatDTO> getGlobalConsultationsPerMonth();
    List<MonthlyStatDTO> getGlobalExamsPerMonth();
    List<MonthlyStatDTO> getGlobalPatientsPerMonth();
}
