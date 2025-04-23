package pi.pperformance.elite.dto;


public class PrescriptionUpdateDTO {

    // Explicit no-argument constructor
    public PrescriptionUpdateDTO() {
    }

    private String prescriptionText; // The new text for the prescription

    // Constructors if needed

    // Getter
    public String getPrescriptionText() {
        return prescriptionText;
    }

    // Setter
    public void setPrescriptionText(String prescriptionText) {
        this.prescriptionText = prescriptionText;
    }
}
