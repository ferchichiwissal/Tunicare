package pi.pperformance.elite.UserServices;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pi.pperformance.elite.UserRepository.CentreDexamenRepository;
import pi.pperformance.elite.entities.CentreDexamen;
import pi.pperformance.elite.exceptions.DuplicateResourceException; // Renamed exception import
import pi.pperformance.elite.exceptions.ResourceNotFoundException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired; // Import Autowired

@Service
// @AllArgsConstructor // Removed Lombok annotation
public class CentreDexamenService {

    private final CentreDexamenRepository centreDexamenRepository;
    // Inject DoctorCentreDexamenRepository if needed for cascading operations not handled by JPA

    // Explicit constructor for dependency injection
    @Autowired
    public CentreDexamenService(CentreDexamenRepository centreDexamenRepository) {
        this.centreDexamenRepository = centreDexamenRepository;
    }

    public List<CentreDexamen> getAllCentres() {
        return centreDexamenRepository.findAll();
    }

    public CentreDexamen getCentreById(Long id) {
        return centreDexamenRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CentreDexamen not found with id: " + id));
    }

    @Transactional
    public CentreDexamen addCentre(CentreDexamen centreDexamen) {
        // Check if a centre with the same name, address, and phone number already exists
        if (centreDexamenRepository.existsByNameAndAdressAndTel(centreDexamen.getName(), centreDexamen.getAdress(), centreDexamen.getTel())) {
            throw new DuplicateResourceException("error.centre.duplicate"); // Use translation key
        }
        // Add any other validation or business logic before saving
        return centreDexamenRepository.save(centreDexamen);
    }

    @Transactional
    public CentreDexamen updateCentre(Long id, CentreDexamen centreDetails) {
        CentreDexamen centre = getCentreById(id);

        // Check if the combination of name, address, and tel is being changed
        // AND if the new combination already exists for *another* centre.
        boolean detailsChanged = !centre.getName().equals(centreDetails.getName()) ||
                                 !centre.getAdress().equals(centreDetails.getAdress()) ||
                                 !centre.getTel().equals(centreDetails.getTel());

        if (detailsChanged && centreDexamenRepository.existsByNameAndAdressAndTel(centreDetails.getName(), centreDetails.getAdress(), centreDetails.getTel())) {
            // Optional: Add a check here to fetch the existing centre by details and compare its ID to the current 'id'
            // to ensure we are not blocking an update where only other fields (not name/address/tel) are changed.
            // For now, assume any existing match with different ID is a conflict.
            // Consider using a different key for update conflicts if needed, e.g., "error.centre.update.duplicate"
            throw new DuplicateResourceException("error.centre.duplicate"); // Use translation key (or a specific one for update)
        }

        // Update fields
        centre.setName(centreDetails.getName());
        centre.setAdress(centreDetails.getAdress());
        centre.setTel(centreDetails.getTel());
        // Update other fields as necessary (latitude/longitude removed)
        return centreDexamenRepository.save(centre);
    }

    @Transactional
    public void deleteCentre(Long id) {
        CentreDexamen centre = getCentreById(id);
        // Deleting the centre should cascade delete associated DoctorCentreDexamen
        // if CascadeType.ALL or CascadeType.REMOVE is set on the relationship in CentreDexamen entity.
        // Verify Cascade settings in CentreDexamen.java @OneToMany relationship.
        centreDexamenRepository.delete(centre);
    }

    public byte[] generateQRCode(Long centreId, String registrationUrlBase) throws WriterException, IOException {
        CentreDexamen centre = getCentreById(centreId);
        // Construct the URL the QR code should point to
        // Example: http://localhost:3000/register-doctor-centre?centreId=123
        String qrContent = registrationUrlBase + "?centreId=" + centre.getIdCentre();

        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(qrContent, BarcodeFormat.QR_CODE, 250, 250); // width, height

        ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);
        return pngOutputStream.toByteArray();
    }
}
