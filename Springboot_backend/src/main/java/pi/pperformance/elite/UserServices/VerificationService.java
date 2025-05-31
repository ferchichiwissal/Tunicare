package pi.pperformance.elite.UserServices;

import org.springframework.stereotype.Service;
// import pi.pperformance.elite.entities.VerificationRequest; // No longer storing this specific type directly
import pi.pperformance.elite.entities.PatientVerificationRequest; // Import new types if needed for context, though map uses Object
import pi.pperformance.elite.entities.DoctorCentreVerificationRequest;
import pi.pperformance.elite.entities.CentreDexamen; // Import CentreDexamen
import pi.pperformance.elite.entities.DoctorCentreDexamen; // Import DoctorCentreDexamen

import org.springframework.beans.factory.annotation.Autowired; // Import Autowired
import org.springframework.security.crypto.password.PasswordEncoder; // Import PasswordEncoder
import pi.pperformance.elite.UserRepository.DoctorCentreDexamenRepository; // Import DoctorCentreDexamenRepository
import pi.pperformance.elite.UserRepository.CentreDexamenRepository; // Import CentreDexamenRepository
import pi.pperformance.elite.entities.Role; // Import Role
import pi.pperformance.elite.exceptions.ResourceNotFoundException; // Import ResourceNotFoundException

import java.time.LocalDate; // Import LocalDate
import java.util.Optional; // Import Optional
import java.util.concurrent.ConcurrentHashMap;

@Service
public class VerificationService {
    // Store Object to hold either PatientVerificationRequest or DoctorCentreVerificationRequest
    private final ConcurrentHashMap<String, Object> verificationRequests = new ConcurrentHashMap<>();

    @Autowired
    private DoctorCentreDexamenRepository doctorCentreDexamenRepository; // Inject repository
    @Autowired
    private CentreDexamenRepository centreDexamenRepository; // Inject repository
    @Autowired
    private PasswordEncoder passwordEncoder; // Inject PasswordEncoder

    // Accept Object to store either type
    public void storeVerificationRequest(String email, Object request) {
        // Optional: Add runtime check to ensure request is one of the expected types
        if (request instanceof PatientVerificationRequest || request instanceof DoctorCentreVerificationRequest) {
            verificationRequests.put(email, request);
        } else {
            // Handle error: Log, throw exception, etc.
            // For simplicity, just logging an error here.
            System.err.println("Attempted to store unsupported verification request type: " + request.getClass().getName());
            // Or throw new IllegalArgumentException("Unsupported verification request type");
        }
    }

    // Return Object, caller needs to cast
    public Object getVerificationRequest(String email) {
        return verificationRequests.get(email);
    }

    public void removeVerificationRequest(String email) {
        verificationRequests.remove(email);
    }

    // New method to verify DoctorCentreDexamen email
    public void verifyDoctorCentreEmail(String email, String code) {
        Object request = verificationRequests.get(email);

        if (!(request instanceof DoctorCentreVerificationRequest)) {
            // Request not found or is not the correct type for DoctorCentreDexamen
            throw new ResourceNotFoundException("Invalid or expired verification request for doctor.");
        }

        DoctorCentreVerificationRequest doctorRequest = (DoctorCentreVerificationRequest) request;

        // Validate the code
        if (!doctorRequest.getVerificationCode().equals(code)) {
            throw new IllegalArgumentException("Invalid verification code.");
        }

        // Check if CentreDexamen exists
        CentreDexamen centre = centreDexamenRepository.findById(doctorRequest.getCentreId())
                .orElseThrow(() -> new ResourceNotFoundException("Examination center not found for registration."));

        // Check if a doctor with this email already exists in this centre (more robust check here)
        if (doctorCentreDexamenRepository.existsByEmailAndCentreDexamen_IdCentre(email, doctorRequest.getCentreId())) {
             // Remove the request even if a duplicate exists to prevent retries with the same code
             removeVerificationRequest(email);
             throw new IllegalArgumentException("A doctor with this email already exists in this center.");
        }


        // Create the DoctorCentreDexamen entity
        DoctorCentreDexamen doctor = new DoctorCentreDexamen();
        doctor.setFirstName(doctorRequest.getFirstName());
        doctor.setLastName(doctorRequest.getLastName());
        doctor.setEmail(doctorRequest.getEmail());
        doctor.setBirthDate(LocalDate.parse(doctorRequest.getBirthDate())); // Assuming birthDate is in a parseable format
        doctor.setPassword(passwordEncoder.encode(doctorRequest.getPassword())); // Encode password
        doctor.setTel(doctorRequest.getTel());
        doctor.setAddress(doctorRequest.getAddress());
        doctor.setGender(doctorRequest.getGender()); // Use getGender
        doctor.setRole(Role.DOCTOR_CENTRE_EXAMEN); // Set the correct role
        doctor.setActive(false); // Mark as inactive upon successful verification, requires admin activation
        doctor.setSpeciality(doctorRequest.getSpeciality()); // Set speciality
        doctor.setCentreDexamen(centre); // Associate with the centre

        if (doctorRequest.getPhotoProfil() != null) {
            doctor.setPhotoProfil(doctorRequest.getPhotoProfil());
        }

        doctor.setCreatedAt(LocalDate.now());
        doctor.setUpdatedAt(LocalDate.now());

        // Save the DoctorCentreDexamen entity
        doctorCentreDexamenRepository.save(doctor);

        // Remove the verification request after successful creation
        removeVerificationRequest(email);
    }
}
