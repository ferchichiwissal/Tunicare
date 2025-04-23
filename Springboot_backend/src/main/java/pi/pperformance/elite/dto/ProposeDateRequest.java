package pi.pperformance.elite.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;

import java.util.Date;


public class ProposeDateRequest {

    @NotNull(message = "La date proposée ne peut pas être nulle.")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) // Expect YYYY-MM-DD
    @FutureOrPresent(message = "La date proposée doit être aujourd'hui ou dans le futur.")
    private Date proposedDate;

    // Getter
    public Date getProposedDate() {
        return proposedDate;
    }

    // Setter
    public void setProposedDate(Date proposedDate) {
        this.proposedDate = proposedDate;
    }
}
