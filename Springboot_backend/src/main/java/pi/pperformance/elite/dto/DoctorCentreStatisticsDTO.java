package pi.pperformance.elite.dto;

import java.util.List;

public class DoctorCentreStatisticsDTO {
    private long examsPerformedTodayCount;
    private String averageExamProcessingTime; // Pourrait être un Double ou une représentation textuelle
    private long pendingExamsCount; // Nombre total d'examens en attente pour le centre
    private List<SimpleAppointmentDTO> upcomingExamsToday; // Ou un DTO similaire pour les examens

    // Constructeurs
    public DoctorCentreStatisticsDTO() {
    }

    public DoctorCentreStatisticsDTO(long examsPerformedTodayCount, String averageExamProcessingTime, long pendingExamsCount, List<SimpleAppointmentDTO> upcomingExamsToday) {
        this.examsPerformedTodayCount = examsPerformedTodayCount;
        this.averageExamProcessingTime = averageExamProcessingTime;
        this.pendingExamsCount = pendingExamsCount;
        this.upcomingExamsToday = upcomingExamsToday;
    }

    // Getters and Setters
    public long getExamsPerformedTodayCount() {
        return examsPerformedTodayCount;
    }

    public void setExamsPerformedTodayCount(long examsPerformedTodayCount) {
        this.examsPerformedTodayCount = examsPerformedTodayCount;
    }

    public String getAverageExamProcessingTime() {
        return averageExamProcessingTime;
    }

    public void setAverageExamProcessingTime(String averageExamProcessingTime) {
        this.averageExamProcessingTime = averageExamProcessingTime;
    }

    public long getPendingExamsCount() {
        return pendingExamsCount;
    }

    public void setPendingExamsCount(long pendingExamsCount) {
        this.pendingExamsCount = pendingExamsCount;
    }

    public List<SimpleAppointmentDTO> getUpcomingExamsToday() {
        return upcomingExamsToday;
    }

    public void setUpcomingExamsToday(List<SimpleAppointmentDTO> upcomingExamsToday) {
        this.upcomingExamsToday = upcomingExamsToday;
    }
}
