package pi.pperformance.elite.UserServices;

import org.springframework.web.multipart.MultipartFile;
import pi.pperformance.elite.entities.Certificate;

import java.io.IOException;
import java.util.Optional;

public interface ICertificateService {
    Certificate saveCertificate(Long consultationId, MultipartFile file) throws IOException;
    Optional<Certificate> getCertificateByConsultationId(Long consultationId);
    Optional<Certificate> getCertificateById(Long certificateId); // Might be useful
}
