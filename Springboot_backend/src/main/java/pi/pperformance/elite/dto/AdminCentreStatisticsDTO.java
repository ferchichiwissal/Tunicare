package pi.pperformance.elite.dto;

public class AdminCentreStatisticsDTO {
    private long examsCompletedToday;
    private long pendingExams;
    private long totalReportsGeneratedThisMonth;
    private long totalDoctorCentresInCentre;

    public AdminCentreStatisticsDTO() {
    }

    public AdminCentreStatisticsDTO(long examsCompletedToday, long pendingExams, long totalReportsGeneratedThisMonth, long totalDoctorCentresInCentre) {
        this.examsCompletedToday = examsCompletedToday;
        this.pendingExams = pendingExams;
        this.totalReportsGeneratedThisMonth = totalReportsGeneratedThisMonth;
        this.totalDoctorCentresInCentre = totalDoctorCentresInCentre;
    }

    // Getters
    public long getExamsCompletedToday() {
        return examsCompletedToday;
    }

    public long getPendingExams() {
        return pendingExams;
    }

    public long getTotalReportsGeneratedThisMonth() {
        return totalReportsGeneratedThisMonth;
    }

    public long getTotalDoctorCentresInCentre() {
        return totalDoctorCentresInCentre;
    }

    // Setters
    public void setExamsCompletedToday(long examsCompletedToday) {
        this.examsCompletedToday = examsCompletedToday;
    }

    public void setPendingExams(long pendingExams) {
        this.pendingExams = pendingExams;
    }

    public void setTotalReportsGeneratedThisMonth(long totalReportsGeneratedThisMonth) {
        this.totalReportsGeneratedThisMonth = totalReportsGeneratedThisMonth;
    }

    public void setTotalDoctorCentresInCentre(long totalDoctorCentresInCentre) {
        this.totalDoctorCentresInCentre = totalDoctorCentresInCentre;
    }
}
