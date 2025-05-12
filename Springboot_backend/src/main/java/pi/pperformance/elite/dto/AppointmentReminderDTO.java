package pi.pperformance.elite.dto;

import java.time.LocalDate;

public class AppointmentReminderDTO {
    private Long appointmentId;
    private LocalDate appointmentDate;
    private String appointmentTime;
    private String doctorName;
    private String cabinetName; // Ou centreName si applicable

    // Constructeurs
    public AppointmentReminderDTO() {
    }

    public AppointmentReminderDTO(Long appointmentId, LocalDate appointmentDate, String appointmentTime, String doctorName, String cabinetName) {
        this.appointmentId = appointmentId;
        this.appointmentDate = appointmentDate;
        this.appointmentTime = appointmentTime;
        this.doctorName = doctorName;
        this.cabinetName = cabinetName;
    }

    // Getters and Setters
    public Long getAppointmentId() {
        return appointmentId;
    }

    public void setAppointmentId(Long appointmentId) {
        this.appointmentId = appointmentId;
    }

    public LocalDate getAppointmentDate() {
        return appointmentDate;
    }

    public void setAppointmentDate(LocalDate appointmentDate) {
        this.appointmentDate = appointmentDate;
    }

    public String getAppointmentTime() {
        return appointmentTime;
    }

    public void setAppointmentTime(String appointmentTime) {
        this.appointmentTime = appointmentTime;
    }

    public String getDoctorName() {
        return doctorName;
    }

    public void setDoctorName(String doctorName) {
        this.doctorName = doctorName;
    }

    public String getCabinetName() {
        return cabinetName;
    }

    public void setCabinetName(String cabinetName) {
        this.cabinetName = cabinetName;
    }
}
