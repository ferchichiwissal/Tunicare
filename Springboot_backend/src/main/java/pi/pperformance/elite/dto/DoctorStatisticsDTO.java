package pi.pperformance.elite.dto;

import java.util.List;

// SimpleAppointmentDTO is now in its own file

public class DoctorStatisticsDTO {
    private long todaysAcceptedAppointments;
    private long todaysConsultationsRealized;
    private long totalPatientsInCabinet;
    private List<SimpleAppointmentDTO> upcomingAppointmentsToday; // Optional
    private long pendingConfirmationAppointmentsCount; // Nouveau champ
    private long pendingExaminationRequestsCount; // Nouveau champ
    private long unreadExaminationResultsCount; // Nouveau champ
    private double appointmentCompletionRate; // Nouveau champ (peut être conservé pour un taux global ou journalier si besoin)
    // private double appointmentCompletionRateWeek; // Supprimé
    // private double appointmentCompletionRateMonth; // Supprimé
    private long newPatientsThisMonthInCabinet; // Nouveaux patients ce mois-ci dans le cabinet
    private long totalAppointmentsThisMonthInCabinet; // Total RDV ce mois-ci dans le cabinet
    private long pendingPatientRegistrationsCount; // Nombre de patients en attente de confirmation d'inscription au cabinet

    // Constructors
    public DoctorStatisticsDTO() {
    }

    public DoctorStatisticsDTO(long todaysAcceptedAppointments, long todaysConsultationsRealized, long totalPatientsInCabinet, List<SimpleAppointmentDTO> upcomingAppointmentsToday,
                               long pendingConfirmationAppointmentsCount, long pendingExaminationRequestsCount, long unreadExaminationResultsCount, double appointmentCompletionRate,
                               long newPatientsThisMonthInCabinet, long totalAppointmentsThisMonthInCabinet, long pendingPatientRegistrationsCount) {
        this.todaysAcceptedAppointments = todaysAcceptedAppointments;
        this.todaysConsultationsRealized = todaysConsultationsRealized;
        this.totalPatientsInCabinet = totalPatientsInCabinet;
        this.upcomingAppointmentsToday = upcomingAppointmentsToday;
        this.pendingConfirmationAppointmentsCount = pendingConfirmationAppointmentsCount;
        this.pendingExaminationRequestsCount = pendingExaminationRequestsCount;
        this.unreadExaminationResultsCount = unreadExaminationResultsCount;
        this.appointmentCompletionRate = appointmentCompletionRate;
        this.newPatientsThisMonthInCabinet = newPatientsThisMonthInCabinet;
        this.totalAppointmentsThisMonthInCabinet = totalAppointmentsThisMonthInCabinet;
        this.pendingPatientRegistrationsCount = pendingPatientRegistrationsCount;
    }

    // Getters and Setters
    public long getTodaysAcceptedAppointments() {
        return todaysAcceptedAppointments;
    }

    public void setTodaysAcceptedAppointments(long todaysAcceptedAppointments) {
        this.todaysAcceptedAppointments = todaysAcceptedAppointments;
    }

    public long getTodaysConsultationsRealized() {
        return todaysConsultationsRealized;
    }

    public void setTodaysConsultationsRealized(long todaysConsultationsRealized) {
        this.todaysConsultationsRealized = todaysConsultationsRealized;
    }

    public long getTotalPatientsInCabinet() {
        return totalPatientsInCabinet;
    }

    public void setTotalPatientsInCabinet(long totalPatientsInCabinet) {
        this.totalPatientsInCabinet = totalPatientsInCabinet;
    }

    public List<SimpleAppointmentDTO> getUpcomingAppointmentsToday() {
        return upcomingAppointmentsToday;
    }

    public void setUpcomingAppointmentsToday(List<SimpleAppointmentDTO> upcomingAppointmentsToday) {
        this.upcomingAppointmentsToday = upcomingAppointmentsToday;
    }

    public long getPendingConfirmationAppointmentsCount() {
        return pendingConfirmationAppointmentsCount;
    }

    public void setPendingConfirmationAppointmentsCount(long pendingConfirmationAppointmentsCount) {
        this.pendingConfirmationAppointmentsCount = pendingConfirmationAppointmentsCount;
    }

    public long getPendingExaminationRequestsCount() {
        return pendingExaminationRequestsCount;
    }

    public void setPendingExaminationRequestsCount(long pendingExaminationRequestsCount) {
        this.pendingExaminationRequestsCount = pendingExaminationRequestsCount;
    }

    public long getUnreadExaminationResultsCount() {
        return unreadExaminationResultsCount;
    }

    public void setUnreadExaminationResultsCount(long unreadExaminationResultsCount) {
        this.unreadExaminationResultsCount = unreadExaminationResultsCount;
    }

    public double getAppointmentCompletionRate() {
        return appointmentCompletionRate;
    }

    public void setAppointmentCompletionRate(double appointmentCompletionRate) {
        this.appointmentCompletionRate = appointmentCompletionRate;
    }

    // public double getAppointmentCompletionRateWeek() {
    //     return appointmentCompletionRateWeek;
    // }

    // public void setAppointmentCompletionRateWeek(double appointmentCompletionRateWeek) {
    //     this.appointmentCompletionRateWeek = appointmentCompletionRateWeek;
    // }

    // public double getAppointmentCompletionRateMonth() {
    //     return appointmentCompletionRateMonth;
    // }

    // public void setAppointmentCompletionRateMonth(double appointmentCompletionRateMonth) {
    //     this.appointmentCompletionRateMonth = appointmentCompletionRateMonth;
    // }

    public long getNewPatientsThisMonthInCabinet() {
        return newPatientsThisMonthInCabinet;
    }

    public void setNewPatientsThisMonthInCabinet(long newPatientsThisMonthInCabinet) {
        this.newPatientsThisMonthInCabinet = newPatientsThisMonthInCabinet;
    }

    public long getTotalAppointmentsThisMonthInCabinet() {
        return totalAppointmentsThisMonthInCabinet;
    }

    public void setTotalAppointmentsThisMonthInCabinet(long totalAppointmentsThisMonthInCabinet) {
        this.totalAppointmentsThisMonthInCabinet = totalAppointmentsThisMonthInCabinet;
    }

    public long getPendingPatientRegistrationsCount() {
        return pendingPatientRegistrationsCount;
    }

    public void setPendingPatientRegistrationsCount(long pendingPatientRegistrationsCount) {
        this.pendingPatientRegistrationsCount = pendingPatientRegistrationsCount;
    }
}
