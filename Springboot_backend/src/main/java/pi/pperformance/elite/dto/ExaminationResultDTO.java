package pi.pperformance.elite.dto;

import java.time.LocalDate;

public class ExaminationResultDTO {

    private String patientName;
    private String doctorCentreExamenName;
    private String centreName;
    private String centreAddress;
    private String centrePhone;
    private LocalDate examinationDate;
    private String examinationType;
    private String examinationResultText;

    // Constructors
    public ExaminationResultDTO() {
    }

    public ExaminationResultDTO(String patientName, String doctorCentreExamenName, String centreName, String centreAddress, String centrePhone, LocalDate examinationDate, String examinationType, String examinationResultText) {
        this.patientName = patientName;
        this.doctorCentreExamenName = doctorCentreExamenName;
        this.centreName = centreName;
        this.centreAddress = centreAddress;
        this.centrePhone = centrePhone;
        this.examinationDate = examinationDate;
        this.examinationType = examinationType;
        this.examinationResultText = examinationResultText;
    }

    // Getters and Setters
    public String getPatientName() {
        return patientName;
    }

    public void setPatientName(String patientName) {
        this.patientName = patientName;
    }

    public String getDoctorCentreExamenName() {
        return doctorCentreExamenName;
    }

    public void setDoctorCentreExamenName(String doctorCentreExamenName) {
        this.doctorCentreExamenName = doctorCentreExamenName;
    }

    public String getCentreName() {
        return centreName;
    }

    public void setCentreName(String centreName) {
        this.centreName = centreName;
    }

    public String getCentreAddress() {
        return centreAddress;
    }

    public void setCentreAddress(String centreAddress) {
        this.centreAddress = centreAddress;
    }

    public String getCentrePhone() {
        return centrePhone;
    }

    public void setCentrePhone(String centrePhone) {
        this.centrePhone = centrePhone;
    }

    public LocalDate getExaminationDate() {
        return examinationDate;
    }

    public void setExaminationDate(LocalDate examinationDate) {
        this.examinationDate = examinationDate;
    }

    public String getExaminationType() {
        return examinationType;
    }

    public void setExaminationType(String examinationType) {
        this.examinationType = examinationType;
    }

    public String getExaminationResultText() {
        return examinationResultText;
    }

    public void setExaminationResultText(String examinationResultText) {
        this.examinationResultText = examinationResultText;
    }
}
