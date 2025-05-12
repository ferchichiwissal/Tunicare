package pi.pperformance.elite.dto;

import java.time.LocalDate;

public class RecentActivityDTO {
    private String activityType;
    private LocalDate activityDate;
    private String description;
    private Long relatedId; // ID de la consultation, examen, rdv etc.

    // Constructeurs
    public RecentActivityDTO() {
    }

    public RecentActivityDTO(String activityType, LocalDate activityDate, String description, Long relatedId) {
        this.activityType = activityType;
        this.activityDate = activityDate;
        this.description = description;
        this.relatedId = relatedId;
    }

    // Getters and Setters
    public String getActivityType() {
        return activityType;
    }

    public void setActivityType(String activityType) {
        this.activityType = activityType;
    }

    public LocalDate getActivityDate() {
        return activityDate;
    }

    public void setActivityDate(LocalDate activityDate) {
        this.activityDate = activityDate;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getRelatedId() {
        return relatedId;
    }

    public void setRelatedId(Long relatedId) {
        this.relatedId = relatedId;
    }
}
