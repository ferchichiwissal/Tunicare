package dto;

import java.time.LocalDate;
import java.util.List;
import pi.pperformance.elite.entities.Role; // Import Role if needed

public class PatientWithRegistrationsDTO {
    // Basic User fields
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private LocalDate birthDate;
    private String tel;
    private String address;
    private String gender;
    private Role role; // Keep role for consistency, should be PATIENT
    // Add photo if needed: private byte[] photoProfil;

    // List of cabinet registrations
    private List<CabinetRegistrationInfoDTO> registrations;

    // Constructors
    public PatientWithRegistrationsDTO() {
    }

    public PatientWithRegistrationsDTO(Long id, String firstName, String lastName, String email, LocalDate birthDate, String tel, String address, String gender, Role role, List<CabinetRegistrationInfoDTO> registrations) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.birthDate = birthDate;
        this.tel = tel;
        this.address = address;
        this.gender = gender;
        this.role = role;
        this.registrations = registrations;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(LocalDate birthDate) {
        this.birthDate = birthDate;
    }

    public String getTel() {
        return tel;
    }

    public void setTel(String tel) {
        this.tel = tel;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public List<CabinetRegistrationInfoDTO> getRegistrations() {
        return registrations;
    }

    public void setRegistrations(List<CabinetRegistrationInfoDTO> registrations) {
        this.registrations = registrations;
    }
}
