package pi.pperformance.elite.dto;

public class CabinetInfoDTO {
    private Long id;
    private String name;
    private String address;
    // Add other fields if needed by the frontend dropdown

    // No-argument constructor
    public CabinetInfoDTO() {
    }

    // All-argument constructor
    public CabinetInfoDTO(Long id, String name, String address) {
        this.id = id;
        this.name = name;
        this.address = address;
    }

    // Getters
    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getAddress() {
        return address;
    }

    // Setters
    public void setId(Long id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setAddress(String address) {
        this.address = address;
    }
}
