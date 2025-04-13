package dto;

import pi.pperformance.elite.entities.Role;
import java.time.LocalDate;
import java.time.Period;

public class LoginResponseDTO {
    private String jwt;
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private LocalDate birthDate;
    private Role role;
    private String gender;
    private String address;
    private String tel;
    private byte[] photoProfil; // Assuming byte array for photo
    private Integer age; // Calculated age
    private Long cabinetId; // Include cabinetId for Doctor/Assistant if available

    // Constructors
    public LoginResponseDTO() {}

    // Constructor including cabinetId
    public LoginResponseDTO(String jwt, Long id, String firstName, String lastName, String email,
                          LocalDate birthDate, Role role, String gender, String address,
                          String tel, byte[] photoProfil, Long cabinetId) {
        this.jwt = jwt;
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.birthDate = birthDate;
        this.role = role;
        this.gender = gender;
        this.address = address;
        this.tel = tel;
        this.photoProfil = photoProfil;
        this.age = calculateAge(birthDate);
        this.cabinetId = cabinetId; // Set cabinetId
    }

    // Helper method to calculate age
    private static Integer calculateAge(LocalDate birthDate) {
        if (birthDate != null) {
            return Period.between(birthDate, LocalDate.now()).getYears();
        }
        return null;
    }

    // Getters and Setters
    public String getJwt() { return jwt; }
    public void setJwt(String jwt) { this.jwt = jwt; }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; this.age = calculateAge(birthDate); }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getTel() { return tel; }
    public void setTel(String tel) { this.tel = tel; }
    public byte[] getPhotoProfil() { return photoProfil; }
    public void setPhotoProfil(byte[] photoProfil) { this.photoProfil = photoProfil; }
    public Integer getAge() { return age; }
    // Age is calculated, no public setter
    public Long getCabinetId() { return cabinetId; }
    public void setCabinetId(Long cabinetId) { this.cabinetId = cabinetId; }
}
