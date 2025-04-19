package pi.pperformance.elite.UserServices;

import lombok.AllArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pi.pperformance.elite.UserRepository.CentreDexamenRepository;
import pi.pperformance.elite.UserRepository.DoctorCentreDexamenRepository;
import pi.pperformance.elite.entities.CentreDexamen;
import pi.pperformance.elite.entities.DoctorCentreDexamen;
import pi.pperformance.elite.entities.Role;
import pi.pperformance.elite.exceptions.ResourceNotFoundException;

import java.time.LocalDate; // Import LocalDate

import org.springframework.beans.factory.annotation.Autowired; // Import Autowired

@Service
// @AllArgsConstructor // Removed Lombok annotation
public class DoctorCentreDexamenService {

    private final DoctorCentreDexamenRepository doctorCentreDexamenRepository;
    private final CentreDexamenRepository centreDexamenRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    // Explicit constructor for dependency injection
    @Autowired
    public DoctorCentreDexamenService(DoctorCentreDexamenRepository doctorCentreDexamenRepository,
                                      CentreDexamenRepository centreDexamenRepository,
                                      BCryptPasswordEncoder passwordEncoder) {
        this.doctorCentreDexamenRepository = doctorCentreDexamenRepository;
        this.centreDexamenRepository = centreDexamenRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public DoctorCentreDexamen registerDoctor(DoctorCentreDexamen doctorDetails, Long centreId) {
        // 1. Find the CentreDexamen
        CentreDexamen centre = centreDexamenRepository.findById(centreId)
                .orElseThrow(() -> new ResourceNotFoundException("CentreDexamen not found with id: " + centreId));

        // 2. Check if email already exists for this role (optional, depending on requirements)
        // doctorCentreDexamenRepository.findByEmail(doctorDetails.getEmail()).ifPresent(u -> {
        //     throw new IllegalArgumentException("Email already exists for a DoctorCentreDexamen");
        // });

        // 3. Prepare the DoctorCentreDexamen entity
        DoctorCentreDexamen newDoctor = new DoctorCentreDexamen();
        newDoctor.setFirstName(doctorDetails.getFirstName());
        newDoctor.setLastName(doctorDetails.getLastName());
        newDoctor.setEmail(doctorDetails.getEmail());
        newDoctor.setPassword(passwordEncoder.encode(doctorDetails.getPassword())); // Encode password
        newDoctor.setBirthDate(doctorDetails.getBirthDate());
        newDoctor.setTel(doctorDetails.getTel());
        newDoctor.setAddress(doctorDetails.getAddress());
        newDoctor.setGender(doctorDetails.getGender());
        newDoctor.setSpeciality(doctorDetails.getSpeciality());
        newDoctor.setPhotoProfil(doctorDetails.getPhotoProfil()); // Handle photo if provided

        newDoctor.setRole(Role.DOCTOR_CENTRE_EXAMEN); // Explicitly set the role
        newDoctor.setCentreDexamen(centre); // Associate with the centre

        // Set creation/update timestamps (handled by @PrePersist in User)
        // newDoctor.setCreatedAt(LocalDate.now());
        // newDoctor.setUpdatedAt(LocalDate.now());

        // Calculate age (handled by @PrePersist/@PreUpdate in User)
        // newDoctor.calculateAge();

        // 4. Save the new doctor
        return doctorCentreDexamenRepository.save(newDoctor);
    }

    // Add other service methods if needed (e.g., find by email, update, etc.)
}
