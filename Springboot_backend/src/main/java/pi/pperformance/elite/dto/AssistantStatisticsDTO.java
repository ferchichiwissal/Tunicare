package pi.pperformance.elite.dto;

import java.util.List;

public class AssistantStatisticsDTO {
    private long todaysAcceptedAppointments;
    private long pendingConfirmationAppointmentsCount;
    private long pendingPatientRegistrationsCount;
    private long totalPatientsInCabinet;
    private long patientsActivatedTodayInCabinet; // Patients activés aujourd'hui dans le cabinet
    private long newUsersTodayInCabinet;          // Nouveaux utilisateurs (tous rôles) liés au cabinet et créés aujourd'hui
    // Potentially add other relevant stats like upcoming appointments for the cabinet

    public AssistantStatisticsDTO(long todaysAcceptedAppointments, long pendingConfirmationAppointmentsCount,
                                  long pendingPatientRegistrationsCount, long totalPatientsInCabinet,
                                  long patientsActivatedTodayInCabinet, long newUsersTodayInCabinet) {
        this.todaysAcceptedAppointments = todaysAcceptedAppointments;
        this.pendingConfirmationAppointmentsCount = pendingConfirmationAppointmentsCount;
        this.pendingPatientRegistrationsCount = pendingPatientRegistrationsCount;
        this.totalPatientsInCabinet = totalPatientsInCabinet;
        this.patientsActivatedTodayInCabinet = patientsActivatedTodayInCabinet;
        this.newUsersTodayInCabinet = newUsersTodayInCabinet;
    }

    // Getters
    public long getTodaysAcceptedAppointments() {
        return todaysAcceptedAppointments;
    }

    public long getPendingConfirmationAppointmentsCount() {
        return pendingConfirmationAppointmentsCount;
    }

    public long getPendingPatientRegistrationsCount() {
        return pendingPatientRegistrationsCount;
    }

    public long getTotalPatientsInCabinet() {
        return totalPatientsInCabinet;
    }

    public long getPatientsActivatedTodayInCabinet() {
        return patientsActivatedTodayInCabinet;
    }

    public long getNewUsersTodayInCabinet() {
        return newUsersTodayInCabinet;
    }

    // Setters if needed, or use constructor only for immutability
    public void setTodaysAcceptedAppointments(long todaysAcceptedAppointments) {
        this.todaysAcceptedAppointments = todaysAcceptedAppointments;
    }

    public void setPendingConfirmationAppointmentsCount(long pendingConfirmationAppointmentsCount) {
        this.pendingConfirmationAppointmentsCount = pendingConfirmationAppointmentsCount;
    }

    public void setPendingPatientRegistrationsCount(long pendingPatientRegistrationsCount) {
        this.pendingPatientRegistrationsCount = pendingPatientRegistrationsCount;
    }

    public void setTotalPatientsInCabinet(long totalPatientsInCabinet) {
        this.totalPatientsInCabinet = totalPatientsInCabinet;
    }

    public void setPatientsActivatedTodayInCabinet(long patientsActivatedTodayInCabinet) {
        this.patientsActivatedTodayInCabinet = patientsActivatedTodayInCabinet;
    }

    public void setNewUsersTodayInCabinet(long newUsersTodayInCabinet) {
        this.newUsersTodayInCabinet = newUsersTodayInCabinet;
    }
}