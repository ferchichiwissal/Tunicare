package pi.pperformance.elite.dto;

public class AppointmentDistributionDTO {
    private long acceptedCount;
    private long realizedCount;
    private long refusedCount;

    public AppointmentDistributionDTO() {
    }

    public AppointmentDistributionDTO(long acceptedCount, long realizedCount, long refusedCount) {
        this.acceptedCount = acceptedCount;
        this.realizedCount = realizedCount;
        this.refusedCount = refusedCount;
    }

    public long getAcceptedCount() {
        return acceptedCount;
    }

    public void setAcceptedCount(long acceptedCount) {
        this.acceptedCount = acceptedCount;
    }

    public long getRealizedCount() {
        return realizedCount;
    }

    public void setRealizedCount(long realizedCount) {
        this.realizedCount = realizedCount;
    }

    public long getRefusedCount() {
        return refusedCount;
    }

    public void setRefusedCount(long refusedCount) {
        this.refusedCount = refusedCount;
    }
}