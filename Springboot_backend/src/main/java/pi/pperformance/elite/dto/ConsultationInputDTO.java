package pi.pperformance.elite.dto;

// Removed Lombok imports

public class ConsultationInputDTO {

    private Long idConsultation;
    private Long patientId;
    private Long doctorId; // Added doctorId
    private Long cabinetId; // Added cabinetId
    private String consultationText;
    private String prescriptionText;

    // Default constructor
    public ConsultationInputDTO() {
    }

    // Getters
    public Long getIdConsultation() {
        return idConsultation;
    }

    public Long getPatientId() {
        return patientId;
    }

    public Long getDoctorId() { // Added getter for doctorId
        return doctorId;
    }

    public Long getCabinetId() { // Added getter for cabinetId
        return cabinetId;
    }

    public String getConsultationText() {
        return consultationText;
    }

    public String getPrescriptionText() {
        return prescriptionText;
    }

    // Setters
    public void setIdConsultation(Long idConsultation) {
        this.idConsultation = idConsultation;
    }

    public void setPatientId(Long patientId) {
        this.patientId = patientId;
    }

    public void setDoctorId(Long doctorId) { // Added setter for doctorId
        this.doctorId = doctorId;
    }

    public void setCabinetId(Long cabinetId) { // Added setter for cabinetId
        this.cabinetId = cabinetId;
    }

    public void setConsultationText(String consultationText) {
        this.consultationText = consultationText;
    }

    public void setPrescriptionText(String prescriptionText) {
        this.prescriptionText = prescriptionText;
    }
}
