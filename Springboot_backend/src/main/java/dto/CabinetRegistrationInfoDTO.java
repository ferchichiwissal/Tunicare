package dto;

public class CabinetRegistrationInfoDTO {
    private Long cabinetId;
    private String cabinetName;
    private boolean isActive; // Include registration status

    // Constructors
    public CabinetRegistrationInfoDTO() {
    }

    public CabinetRegistrationInfoDTO(Long cabinetId, String cabinetName, boolean isActive) {
        this.cabinetId = cabinetId;
        this.cabinetName = cabinetName;
        this.isActive = isActive;
    }

    // Getters and Setters
    public Long getCabinetId() {
        return cabinetId;
    }

    public void setCabinetId(Long cabinetId) {
        this.cabinetId = cabinetId;
    }

    public String getCabinetName() {
        return cabinetName;
    }

    public void setCabinetName(String cabinetName) {
        this.cabinetName = cabinetName;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }
}
