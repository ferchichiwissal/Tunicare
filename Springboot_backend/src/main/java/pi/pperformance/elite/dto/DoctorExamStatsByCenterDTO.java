package pi.pperformance.elite.dto;

public class DoctorExamStatsByCenterDTO {
    private String centerName;
    private Long examCount; // Represents total exams for the filtered period

    public DoctorExamStatsByCenterDTO(String centerName, Long examCount) {
        this.centerName = centerName;
        this.examCount = examCount;
    }

    // Getters and Setters
    public String getCenterName() {
        return centerName;
    }

    public void setCenterName(String centerName) {
        this.centerName = centerName;
    }

    public Long getExamCount() {
        return examCount;
    }

    public void setExamCount(Long examCount) {
        this.examCount = examCount;
    }
}