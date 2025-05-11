package pi.pperformance.elite.dto;

public class CenterDoctorStatDTO {
    private String prescribingDoctorName;
    private String prescribingDoctorCabinetName;
    private Long examCount;

    public CenterDoctorStatDTO(String prescribingDoctorName, String prescribingDoctorCabinetName, Long examCount) {
        this.prescribingDoctorName = prescribingDoctorName;
        this.prescribingDoctorCabinetName = prescribingDoctorCabinetName;
        this.examCount = examCount;
    }

    // Getters and Setters
    public String getPrescribingDoctorName() {
        return prescribingDoctorName;
    }

    public void setPrescribingDoctorName(String prescribingDoctorName) {
        this.prescribingDoctorName = prescribingDoctorName;
    }

    public String getPrescribingDoctorCabinetName() {
        return prescribingDoctorCabinetName;
    }

    public void setPrescribingDoctorCabinetName(String prescribingDoctorCabinetName) {
        this.prescribingDoctorCabinetName = prescribingDoctorCabinetName;
    }

    public Long getExamCount() {
        return examCount;
    }

    public void setExamCount(Long examCount) {
        this.examCount = examCount;
    }
}