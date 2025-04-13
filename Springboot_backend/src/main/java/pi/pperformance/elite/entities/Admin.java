package pi.pperformance.elite.entities;

import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "admin")
public class Admin extends User {

    public Admin() {
        super();
        // On peut ajouter un rôle spécifique ou des comportements ici si nécessaire
        this.setRole(Role.ADMIN);
    }

    public Admin(String firstName, String lastName, String email, String password, LocalDate birthDate, String tel, String address) {
        super(firstName, lastName, email, password, birthDate, tel, address);
        this.setRole(Role.ADMIN);
    }

    // D'autres fonctionnalités spécifiques à Admin peuvent être ajoutées ici
}
