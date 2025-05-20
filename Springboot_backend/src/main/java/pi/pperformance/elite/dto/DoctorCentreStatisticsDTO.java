package pi.pperformance.elite.dto;

import java.util.List;

public class DoctorCentreStatisticsDTO {
    private long examsPerformedTodayCount;
    private String averageExamProcessingTime; // Pourrait être un Double ou une représentation textuelle
    private long pendingExamsCount; // Nombre total d'examens en attente pour le centre
    private List<SimpleAppointmentDTO> upcomingExamsToday; // Ou un DTO similaire pour les examens
    private long totalReportsCount; // Nouveau champ pour le nombre total de rapports
    private List<MonthlyReportStatsDTO> monthlyReportStats; // Nouveau champ pour les stats mensuelles
    private List<ReportTypeStatsDTO> reportTypeStats; // Nouveau champ pour les stats par type de rapport

    // Constructeurs
    public DoctorCentreStatisticsDTO() {
    }

    public DoctorCentreStatisticsDTO(long examsPerformedTodayCount, String averageExamProcessingTime, long pendingExamsCount, List<SimpleAppointmentDTO> upcomingExamsToday,
                                     long totalReportsCount, List<MonthlyReportStatsDTO> monthlyReportStats, List<ReportTypeStatsDTO> reportTypeStats) {
        this.examsPerformedTodayCount = examsPerformedTodayCount;
        this.averageExamProcessingTime = averageExamProcessingTime;
        this.pendingExamsCount = pendingExamsCount;
        this.upcomingExamsToday = upcomingExamsToday;
        this.totalReportsCount = totalReportsCount;
        this.monthlyReportStats = monthlyReportStats;
        this.reportTypeStats = reportTypeStats;
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

    public long getTotalReportsCount() {
        return totalReportsCount;
    }

    public void setTotalReportsCount(long totalReportsCount) {
        this.totalReportsCount = totalReportsCount;
    }

    public List<MonthlyReportStatsDTO> getMonthlyReportStats() {
        return monthlyReportStats;
    }

    public void setMonthlyReportStats(List<MonthlyReportStatsDTO> monthlyReportStats) {
        this.monthlyReportStats = monthlyReportStats;
    }

    public List<ReportTypeStatsDTO> getReportTypeStats() {
        return reportTypeStats;
    }

    public void setReportTypeStats(List<ReportTypeStatsDTO> reportTypeStats) {
        this.reportTypeStats = reportTypeStats;
    }
}
