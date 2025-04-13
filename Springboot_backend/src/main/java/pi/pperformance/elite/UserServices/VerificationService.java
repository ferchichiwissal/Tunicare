package pi.pperformance.elite.UserServices;

import org.springframework.stereotype.Service;
import pi.pperformance.elite.entities.VerificationRequest;

import java.util.concurrent.ConcurrentHashMap;

@Service
public class VerificationService {
    private final ConcurrentHashMap<String, VerificationRequest> verificationRequests = new ConcurrentHashMap<>();

    public void storeVerificationRequest(String email, VerificationRequest request) {
        verificationRequests.put(email, request);
    }

    public VerificationRequest getVerificationRequest(String email) {
        return verificationRequests.get(email);
    }

    public void removeVerificationRequest(String email) {
        verificationRequests.remove(email);
    }
}
