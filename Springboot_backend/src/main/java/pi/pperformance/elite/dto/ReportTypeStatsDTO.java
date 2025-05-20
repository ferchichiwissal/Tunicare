package pi.pperformance.elite.dto;

public class ReportTypeStatsDTO {
    private String reportType;
    private long reportCount;

    public ReportTypeStatsDTO(String reportType, long reportCount) {
        this.reportType = reportType;
        this.reportCount = reportCount;
    }

    public String getReportType() {
        return reportType;
    }

    public void setReportType(String reportType) {
        this.reportType = reportType;
    }

    public long getReportCount() {
        return reportCount;
    }

    public void setReportCount(long reportCount) {
        this.reportCount = reportCount;
    }
}
