package pi.pperformance.elite.dto;

public class SimpleAppointmentDTO {
    private Long id; // Ajout de l'ID
    private String time; // e.g., "10:00 AM"
    private String patientName;

    public SimpleAppointmentDTO(Long id, String time, String patientName) { // Constructeur mis à jour
        this.id = id;
        this.time = time;
        this.patientName = patientName;
    }

    // Getters and Setters
    public Long getId() { // Getter pour l'ID
        return id;
    }

    public void setId(Long id) { // Setter pour l'ID
        this.id = id;
    }

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
