package pi.pperformance.elite.entities;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "Patients")
public class Patient extends User {

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Set<UserCabinetRegistration> registrations = new HashSet<>();


    public Patient() {
        super();
        this.setRole(Role.PATIENT);
    }

    public Patient(String firstName, String lastName, String email, String password, LocalDate birthDate, String tel, String address) {
        super(firstName, lastName, email, password, birthDate, tel, address);
        this.setRole(Role.PATIENT);
    }

    // Getters et Setters for registrations
    public Set<UserCabinetRegistration> getRegistrations() {
        return registrations;
    }

    public void setRegistrations(Set<UserCabinetRegistration> registrations) {
        this.registrations = registrations;
    }

    // Optional: Helper methods to add/remove registrations
    public void addRegistration(UserCabinetRegistration registration) {
        registrations.add(registration);
        registration.setUser(this);
    }

    public void removeRegistration(UserCabinetRegistration registration) {
        registrations.remove(registration);
        registration.setUser(null);
    }
}
