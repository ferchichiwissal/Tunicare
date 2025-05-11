package pi.pperformance.elite.dto;

import java.util.List;

// SimpleAppointmentDTO is now in its own file

public class DoctorStatisticsDTO {
    private long todaysAcceptedAppointments;
    private long todaysConsultationsRealized;
    private long totalPatientsInCabinet;
    private List<SimpleAppointmentDTO> upcomingAppointmentsToday; // Optional

    // Constructors
    public DoctorStatisticsDTO() {
    }

    public DoctorStatisticsDTO(long todaysAcceptedAppointments, long todaysConsultationsRealized, long totalPatientsInCabinet, List<SimpleAppointmentDTO> upcomingAppointmentsToday) {
        this.todaysAcceptedAppointments = todaysAcceptedAppointments;
        this.todaysConsultationsRealized = todaysConsultationsRealized;
        this.totalPatientsInCabinet = totalPatientsInCabinet;
        this.upcomingAppointmentsToday = upcomingAppointmentsToday;
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
}