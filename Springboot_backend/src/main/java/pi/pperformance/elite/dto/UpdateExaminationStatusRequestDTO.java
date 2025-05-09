package pi.pperformance.elite.dto;

public class UpdateExaminationStatusRequestDTO {
    private String newStatus;

    // Default constructor
    public UpdateExaminationStatusRequestDTO() {
    }

    // Constructor with fields
    public UpdateExaminationStatusRequestDTO(String newStatus) {
        this.newStatus = newStatus;
    }

    // Getter
    public String getNewStatus() {
        return newStatus;
    }

    // Setter
    public void setNewStatus(String newStatus) {
        this.newStatus = newStatus;
    }
}
