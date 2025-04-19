package pi.pperformance.elite.UserServices;

import org.springframework.stereotype.Service;
// import pi.pperformance.elite.entities.VerificationRequest; // No longer storing this specific type directly
import pi.pperformance.elite.entities.PatientVerificationRequest; // Import new types if needed for context, though map uses Object
import pi.pperformance.elite.entities.DoctorCentreVerificationRequest;

import java.util.concurrent.ConcurrentHashMap;

@Service
public class VerificationService {
    // Store Object to hold either PatientVerificationRequest or DoctorCentreVerificationRequest
    private final ConcurrentHashMap<String, Object> verificationRequests = new ConcurrentHashMap<>();

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
}
