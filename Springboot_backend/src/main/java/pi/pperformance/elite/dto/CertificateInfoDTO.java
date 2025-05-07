package pi.pperformance.elite.dto;

// No Lombok here, using standard Java
public class CertificateInfoDTO {

    private Long id;
    private String fileName;
    private String contentType;

    // Constructor
    public CertificateInfoDTO(Long id, String fileName, String contentType) {
        this.id = id;
        this.fileName = fileName;
        this.contentType = contentType;
    }

    // Getters (Setters might not be needed for a simple DTO)
    public Long getId() {
        return id;
    }

    public String getFileName() {
        return fileName;
    }

    public String getContentType() {
        return contentType;
    }

    // Optional: Setters if needed later
    public void setId(Long id) {
        this.id = id;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }
}
