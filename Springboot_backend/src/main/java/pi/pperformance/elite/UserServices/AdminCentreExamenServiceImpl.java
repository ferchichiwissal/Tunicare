package pi.pperformance.elite.UserServices;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pi.pperformance.elite.UserRepository.AdminCentreExamenRepository;
import pi.pperformance.elite.entities.AdminCentreExamen;
import pi.pperformance.elite.exceptions.ResourceNotFoundException;

import java.util.List;
import java.util.Optional;

@Service
public class AdminCentreExamenServiceImpl implements AdminCentreExamenService {

    @Autowired
    private AdminCentreExamenRepository adminCentreExamenRepository;

    @Override
    public List<AdminCentreExamen> getAllAdminCentres() {
        return adminCentreExamenRepository.findAll();
    }

    @Override
    public Optional<AdminCentreExamen> getAdminCentreById(Long id) {
        return adminCentreExamenRepository.findById(id);
    }

    @Override
    public AdminCentreExamen updateAdminCentre(Long id, AdminCentreExamen adminCentreExamenDetails) {
        AdminCentreExamen adminCentre = adminCentreExamenRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AdminCentreExamen not found with id " + id));

        // Update fields - adjust based on what fields are allowed to be updated
        adminCentre.setFirstName(adminCentreExamenDetails.getFirstName());
        adminCentre.setLastName(adminCentreExamenDetails.getLastName());
        adminCentre.setEmail(adminCentreExamenDetails.getEmail());
        // Do NOT update password here - should be a separate process
        adminCentre.setBirthDate(adminCentreExamenDetails.getBirthDate());
        adminCentre.setTel(adminCentreExamenDetails.getTel());
        adminCentre.setAddress(adminCentreExamenDetails.getAddress());
        adminCentre.setGender(adminCentreExamenDetails.getGender());
        adminCentre.setPhotoProfil(adminCentreExamenDetails.getPhotoProfil());
        adminCentre.setSignatureImagePath(adminCentreExamenDetails.getSignatureImagePath());
        adminCentre.setActive(adminCentreExamenDetails.isActive());
        // Assuming centreDexamen is set during creation and not updated here

        return adminCentreExamenRepository.save(adminCentre);
    }

    @Override
    public void deleteAdminCentre(Long id) {
        AdminCentreExamen adminCentre = adminCentreExamenRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AdminCentreExamen not found with id " + id));
        adminCentreExamenRepository.delete(adminCentre);
    }

    @Override
    public AdminCentreExamen toggleAdminCentreStatus(Long id) {
        AdminCentreExamen adminCentre = adminCentreExamenRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AdminCentreExamen not found with id " + id));

        adminCentre.setActive(!adminCentre.isActive());
        return adminCentreExamenRepository.save(adminCentre);
    }
}
