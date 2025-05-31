package pi.pperformance.elite.UserServices;

import pi.pperformance.elite.entities.AdminCentreExamen;

import java.util.List;
import java.util.Optional;

public interface AdminCentreExamenService {

    List<AdminCentreExamen> getAllAdminCentres();
    Optional<AdminCentreExamen> getAdminCentreById(Long id);
    AdminCentreExamen updateAdminCentre(Long id, AdminCentreExamen adminCentreExamenDetails);
    void deleteAdminCentre(Long id);
    AdminCentreExamen toggleAdminCentreStatus(Long id);
    // Add other methods as needed, e.g., for creation if not handled by a generic registration flow
}
