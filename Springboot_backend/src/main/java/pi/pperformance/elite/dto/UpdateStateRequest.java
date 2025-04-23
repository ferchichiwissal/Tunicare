package pi.pperformance.elite.dto;

import jakarta.validation.constraints.NotBlank;


public class UpdateStateRequest {

    @NotBlank(message = "Le nouvel état ne peut pas être vide.")
    private String newState; // e.g., "accepté", "refusé", "réalisé"

    // Getter
    public String getNewState() {
        return newState;
    }

    // Setter
    public void setNewState(String newState) {
        this.newState = newState;
    }
}
