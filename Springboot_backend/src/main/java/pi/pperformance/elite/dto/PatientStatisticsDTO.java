package pi.pperformance.elite.dto;

import java.util.List;

// RecentActivityDTO is now in its own file

public class PatientStatisticsDTO {
    private long totalConsultations;
    private long totalExams;
    private AppointmentReminderDTO nextAcceptedAppointment; // Can be null
    private List<RecentActivityDTO> recentActivity; // Optional

    // Constructors
    public PatientStatisticsDTO() {
    }

    public PatientStatisticsDTO(long totalConsultations, long totalExams, AppointmentReminderDTO nextAcceptedAppointment, List<RecentActivityDTO> recentActivity) {
        this.totalConsultations = totalConsultations;
        this.totalExams = totalExams;
        this.nextAcceptedAppointment = nextAcceptedAppointment;
        this.recentActivity = recentActivity;
    }

    // Getters and Setters
    public long getTotalConsultations() {
        return totalConsultations;
    }

    public void setTotalConsultations(long totalConsultations) {
        this.totalConsultations = totalConsultations;
    }

    public long getTotalExams() {
        return totalExams;
    }

    public void setTotalExams(long totalExams) {
        this.totalExams = totalExams;
    }

    public AppointmentReminderDTO getNextAcceptedAppointment() {
        return nextAcceptedAppointment;
    }

    public void setNextAcceptedAppointment(AppointmentReminderDTO nextAcceptedAppointment) {
        this.nextAcceptedAppointment = nextAcceptedAppointment;
    }

    public List<RecentActivityDTO> getRecentActivity() {
        return recentActivity;
    }

    public void setRecentActivity(List<RecentActivityDTO> recentActivity) {
        this.recentActivity = recentActivity;
    }
}