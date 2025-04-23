package pi.pperformance.elite.dto;

import org.springframework.format.annotation.DateTimeFormat; // Pour gérer le format de date

import jakarta.validation.constraints.FutureOrPresent; // Validation de date
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Date;


public class CreateAppointmentRequest {

    @NotNull(message = "L'ID du cabinet ne peut pas être nul.")
    private Long cabinetId;

    @NotNull(message = "La date du rendez-vous ne peut pas être nulle.")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) // Spécifie le format attendu (YYYY-MM-DD)
    @FutureOrPresent(message = "La date du rendez-vous doit être aujourd'hui ou dans le futur.")
    private Date apptDate;

    @NotBlank(message = "Le type de rendez-vous ne peut pas être vide.")
    private String apptType; // e.g., "Nouvelle consultation", "Séance de contrôle"

    // Note: patientId n'est pas inclus ici, car nous supposerons qu'il est obtenu
    // à partir de l'utilisateur authentifié dans le contrôleur.

    // Getters
    public Long getCabinetId() {
        return cabinetId;
    }

    public Date getApptDate() {
        return apptDate;
    }

    public String getApptType() {
        return apptType;
    }

    // Setters
    public void setCabinetId(Long cabinetId) {
        this.cabinetId = cabinetId;
    }

    public void setApptDate(Date apptDate) {
        this.apptDate = apptDate;
    }

    public void setApptType(String apptType) {
        this.apptType = apptType;
    }
}
