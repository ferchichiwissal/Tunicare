package pi.pperformance.elite.dto;

public class SimpleAppointmentDTO {
    private String time; // e.g., "10:00 AM"
    private String patientName;

    public SimpleAppointmentDTO(String time, String patientName) {
        this.time = time;
        this.patientName = patientName;
    }

    // Getters and Setters
    public String getTime() {
        return time;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public String getPatientName() {
        return patientName;
    }

    public void setPatientName(String patientName) {
        this.patientName = patientName;
    }
}