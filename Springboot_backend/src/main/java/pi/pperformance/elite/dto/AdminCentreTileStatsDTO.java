package pi.pperformance.elite.dto;

public class AdminCentreTileStatsDTO {

    private Long dailyExaminationsCount;
    private Long pendingExaminationsCount;
    private Long monthlyReportsCount;
    private Long totalDoctorsCount;

    // Constructeur
    public AdminCentreTileStatsDTO(Long dailyExaminationsCount, Long pendingExaminationsCount, Long monthlyReportsCount, Long totalDoctorsCount) {
        this.dailyExaminationsCount = dailyExaminationsCount;
        this.pendingExaminationsCount = pendingExaminationsCount;
        this.monthlyReportsCount = monthlyReportsCount;
        this.totalDoctorsCount = totalDoctorsCount;
    }

    // Getters
    public Long getDailyExaminationsCount() {
        return dailyExaminationsCount;
    }

    public Long getPendingExaminationsCount() {
        return pendingExaminationsCount;
    }

    public Long getMonthlyReportsCount() {
        return monthlyReportsCount;
    }

    public Long getTotalDoctorsCount() {
        return totalDoctorsCount;
    }

    // Setters
    public void setDailyExaminationsCount(Long dailyExaminationsCount) {
        this.dailyExaminationsCount = dailyExaminationsCount;
    }

    public void setPendingExaminationsCount(Long pendingExaminationsCount) {
        this.pendingExaminationsCount = pendingExaminationsCount;
    }

    public void setMonthlyReportsCount(Long monthlyReportsCount) {
        this.monthlyReportsCount = monthlyReportsCount;
    }

    public void setTotalDoctorsCount(Long totalDoctorsCount) {
        this.totalDoctorsCount = totalDoctorsCount;
    }

    @Override
    public String toString() {
        return "AdminCentreTileStatsDTO{" +
               "dailyExaminationsCount=" + dailyExaminationsCount +
               ", pendingExaminationsCount=" + pendingExaminationsCount +
               ", monthlyReportsCount=" + monthlyReportsCount +
               ", totalDoctorsCount=" + totalDoctorsCount +
               '}';
    }
}
