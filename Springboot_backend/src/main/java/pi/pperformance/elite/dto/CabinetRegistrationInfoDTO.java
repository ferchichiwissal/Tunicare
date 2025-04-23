package pi.pperformance.elite.dto;

import java.util.Objects;

public class CabinetRegistrationInfoDTO {
    private Long cabinetId;
    private String cabinetName;
    // Add any other relevant info needed by the frontend, e.g., address

    // No-argument constructor
    public CabinetRegistrationInfoDTO() {
    }

    // All-argument constructor
    public CabinetRegistrationInfoDTO(Long cabinetId, String cabinetName) {
        this.cabinetId = cabinetId;
        this.cabinetName = cabinetName;
    }

    // Getters
    public Long getCabinetId() {
        return cabinetId;
    }

    public String getCabinetName() {
        return cabinetName;
    }

    // Setters
    public void setCabinetId(Long cabinetId) {
        this.cabinetId = cabinetId;
    }

    public void setCabinetName(String cabinetName) {
        this.cabinetName = cabinetName;
    }

    // equals()
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CabinetRegistrationInfoDTO that = (CabinetRegistrationInfoDTO) o;
        return Objects.equals(cabinetId, that.cabinetId) && Objects.equals(cabinetName, that.cabinetName);
    }

    // hashCode()
    @Override
    public int hashCode() {
        return Objects.hash(cabinetId, cabinetName);
    }

    // toString()
    @Override
    public String toString() {
        return "CabinetRegistrationInfoDTO{" +
               "cabinetId=" + cabinetId +
               ", cabinetName='" + cabinetName + '\'' +
               '}';
    }
}
