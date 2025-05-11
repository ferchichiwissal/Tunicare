package pi.pperformance.elite.dto;

public class RecentActivityDTO {
    private String type; // e.g., "consultation", "examen"
    private String date; // e.g., "2024-05-10"

    public RecentActivityDTO(String type, String date) {
        this.type = type;
        this.date = date;
    }

    // Getters and Setters
    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }
}