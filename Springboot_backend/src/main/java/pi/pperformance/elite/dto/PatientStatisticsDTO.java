package pi.pperformance.elite.dto;

import java.util.List;

// RecentActivityDTO is now in its own file

public class PatientStatisticsDTO {
    private long totalConsultations;
    private long totalExams;
    private AppointmentReminderDTO nextAcceptedAppointment; // Can be null
    private List<RecentActivityDTO> recentActivity; // Optional
    private long pendingAppointmentsCount; // Nouveau champ
    private long availableCertificatesCount; // Nouveau champ
    private AppointmentReminderDTO nextRefusedAppointmentWithProposal; // Nouveau champ pour RDV refusé avec proposition

    // Constructors
    public PatientStatisticsDTO() {
    }

    public PatientStatisticsDTO(long totalConsultations, long totalExams,
                                AppointmentReminderDTO nextAcceptedAppointment, List<RecentActivityDTO> recentActivity,
                                long pendingAppointmentsCount, long availableCertificatesCount,
                                AppointmentReminderDTO nextRefusedAppointmentWithProposal) {
        this.totalConsultations = totalConsultations;
        this.totalExams = totalExams;
        this.nextAcceptedAppointment = nextAcceptedAppointment;
        this.recentActivity = recentActivity;
        this.pendingAppointmentsCount = pendingAppointmentsCount;
        this.availableCertificatesCount = availableCertificatesCount;
        this.nextRefusedAppointmentWithProposal = nextRefusedAppointmentWithProposal;
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

    public long getPendingAppointmentsCount() {
        return pendingAppointmentsCount;
    }

    public void setPendingAppointmentsCount(long pendingAppointmentsCount) {
        this.pendingAppointmentsCount = pendingAppointmentsCount;
    }

    public long getAvailableCertificatesCount() {
        return availableCertificatesCount;
    }

    public void setAvailableCertificatesCount(long availableCertificatesCount) {
        this.availableCertificatesCount = availableCertificatesCount;
    }

    public AppointmentReminderDTO getNextRefusedAppointmentWithProposal() {
        return nextRefusedAppointmentWithProposal;
    }

    public void setNextRefusedAppointmentWithProposal(AppointmentReminderDTO nextRefusedAppointmentWithProposal) {
        this.nextRefusedAppointmentWithProposal = nextRefusedAppointmentWithProposal;
    }
}
