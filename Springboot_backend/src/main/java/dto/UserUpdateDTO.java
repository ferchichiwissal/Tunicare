package dto;

import java.time.LocalDate;

// Consider adding validation annotations (e.g., @NotBlank, @Email, @Size) from jakarta.validation
public class UserUpdateDTO {

    private String firstName;
    private String lastName;
    private String email; // Be cautious allowing email updates, ensure uniqueness checks
    private LocalDate birthDate;
    private String tel;
    private String address;
    private String gender;
    // Add other fields that should be updatable via this endpoint.
    // Exclude sensitive fields like password, role, isActive - handle those via dedicated endpoints.
    // Photo updates might require a separate multipart endpoint.

    // --- Getters and Setters ---

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
}
