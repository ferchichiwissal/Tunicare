package pi.pperformance.elite.dto;


public class MedicalExaminationInputDTO {

    // Explicit no-argument constructor
    public MedicalExaminationInputDTO() {
    }

    private Long consultationId; // Required: To link the exam request back to the consultation
    private String typeExamen;   // Required: e.g., "IRM", "Radio", "Analyse sanguine"
    private Long centreId;       // Optional: ID of the selected CentreDexamen
    private String centreAutre;  // Optional: Name if "Autre" is selected (consider how to store this)
    private String recommandation; // Optional: Free text recommendations

    // Note: We might need patientId as well, depending on how the frontend flow works
    // or fetch it via consultationId in the service.

    // Getters
    public Long getConsultationId() {
        return consultationId;
    }

    public String getTypeExamen() {
        return typeExamen;
    }

    public Long getCentreId() {
        return centreId;
    }

    public String getCentreAutre() {
        return centreAutre;
    }

    public String getRecommandation() {
        return recommandation;
    }

    // Setters
    public void setConsultationId(Long consultationId) {
        this.consultationId = consultationId;
    }

    public void setTypeExamen(String typeExamen) {
        this.typeExamen = typeExamen;
    }

    public void setCentreId(Long centreId) {
        this.centreId = centreId;
    }

    public void setCentreAutre(String centreAutre) {
        this.centreAutre = centreAutre;
    }

    public void setRecommandation(String recommandation) {
        this.recommandation = recommandation;
    }
}
