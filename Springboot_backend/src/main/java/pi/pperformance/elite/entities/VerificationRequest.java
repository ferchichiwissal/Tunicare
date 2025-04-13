package pi.pperformance.elite.entities;

import org.springframework.web.multipart.MultipartFile;

public class VerificationRequest {
    private String firstName;
    private String lastName;
    private String email;
    private String birthDate;
    private String password;
    private String tel;
    private String address;
    private String gendre;
    private String role;
    private byte[] photoProfil; // Stocker la photo sous forme de byte[]
    private String verificationCode;
    private Long cabinetId; // Added cabinetId

    public VerificationRequest(String firstName, String lastName, String email, String birthDate, String password, String tel, String address, String gendre, String role, byte[] photoProfil, String verificationCode, Long cabinetId) { // Added cabinetId to constructor
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.birthDate = birthDate;
        this.password = password;
        this.tel = tel;
        this.address = address;
        this.gendre = gendre;
        this.role = role;
        this.photoProfil = photoProfil;
        this.verificationCode = verificationCode;
        this.cabinetId = cabinetId; // Assign cabinetId
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

    public String getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(String birthDate) {
        this.birthDate = birthDate;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
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

    public String getGendre() {
        return gendre;
    }

    public void setGendre(String gendre) {
        this.gendre = gendre;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public byte[] getPhotoProfil() {
        return photoProfil;
    }

    public void setPhotoProfil(byte[] photoProfil) {
        this.photoProfil = photoProfil;
    }

    public String getVerificationCode() {
        return verificationCode;
    }

    public void setVerificationCode(String verificationCode) {
        this.verificationCode = verificationCode;
    }

    // Getter and Setter for cabinetId
    public Long getCabinetId() {
        return cabinetId;
    }

    public void setCabinetId(Long cabinetId) {
        this.cabinetId = cabinetId;
    }
}
