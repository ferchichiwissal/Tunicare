package pi.pperformance.elite.dto;

public class MonthlyReportStatsDTO {
    private String month;
    private long reportCount;

    public MonthlyReportStatsDTO(String month, long reportCount) {
        this.month = month;
        this.reportCount = reportCount;
    }

    public String getMonth() {
        return month;
    }

    public void setMonth(String month) {
        this.month = month;
    }

    public long getReportCount() {
        return reportCount;
    }

    public void setReportCount(long reportCount) {
        this.reportCount = reportCount;
    }
}
