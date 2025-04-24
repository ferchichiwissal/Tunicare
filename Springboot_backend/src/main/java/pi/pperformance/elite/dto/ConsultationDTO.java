package pi.pperformance.elite.dto;

import java.util.Date;

// Using basic getters/setters for simplicity, consider Lombok if preferred
public class ConsultationDTO {

    private Long idConsultation;
    private Date dateConsultation;
    private String text;
    private Long patientId;
    private String patientFirstName;
    private String patientLastName;
    private String prescriptionText; // Added field

    // Constructors
    public ConsultationDTO() {
    }

    // Original constructor (assuming 7 arguments)
    public ConsultationDTO(Long idConsultation, Date dateConsultation, String text, Long patientId, String patientFirstName, String patientLastName, String prescriptionText) {
        this.idConsultation = idConsultation;
        this.dateConsultation = dateConsultation;
        this.text = text;
        this.patientId = patientId;
        this.patientFirstName = patientFirstName;
        this.patientLastName = patientLastName;
        this.prescriptionText = prescriptionText;
    }

    // Getters and Setters
    public Long getIdConsultation() {
        return idConsultation;
    }

    public void setIdConsultation(Long idConsultation) {
        this.idConsultation = idConsultation;
    }

    public Date getDateConsultation() {
        return dateConsultation;
    }

    public void setDateConsultation(Date dateConsultation) {
        this.dateConsultation = dateConsultation;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public Long getPatientId() {
        return patientId;
    }

    public void setPatientId(Long patientId) {
        this.patientId = patientId;
    }

    public String getPatientFirstName() {
        return patientFirstName;
    }

    public void setPatientFirstName(String patientFirstName) {
        this.patientFirstName = patientFirstName;
    }

    public String getPatientLastName() {
        return patientLastName;
    }

    public void setPatientLastName(String patientLastName) {
        this.patientLastName = patientLastName;
    }

    public String getPrescriptionText() { // Added getter
        return prescriptionText;
    }

    public void setPrescriptionText(String prescriptionText) { // Added setter
        this.prescriptionText = prescriptionText;
    }

    // Removed getters/setters for patientBirthDate and patientEmail
}
