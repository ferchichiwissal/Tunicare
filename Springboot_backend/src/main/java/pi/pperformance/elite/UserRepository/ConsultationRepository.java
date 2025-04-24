package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query; // Import Query
import org.springframework.data.repository.query.Param; // Import Param
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.Consultation;

import java.util.List;
import java.util.Optional; // Import Optional

@Repository
public interface ConsultationRepository extends JpaRepository<Consultation, Long> {

    // Find consultations by patient ID, ordered by date descending (for history)
    List<Consultation> findByPatient_IdOrderByDateConsultationDesc(Long patientId);

    // Find consultations by doctor ID, ordered by date descending
    List<Consultation> findByDoctor_IdOrderByDateConsultationDesc(Long doctorId);
// Find consultations by patient ID AND cabinet ID (using idSite), ordered by date descending (for patient's view)
List<Consultation> findByPatient_IdAndCabinet_IdSiteOrderByDateConsultationDesc(Long patientId, Long cabinetId); // Corrected: Use IdSite

    // Add other custom query methods if needed later

    /**
     * Finds a Consultation by its ID and eagerly fetches related entities
     * needed for PDF generation (Patient, Cabinet, PrescribedMedications).
     * @param consultationId The ID of the consultation.
     * @return An Optional containing the Consultation with fetched relations, or empty if not found.
     */
    @Query("SELECT c FROM Consultation c " +
           "LEFT JOIN FETCH c.patient " +
           "LEFT JOIN FETCH c.cabinet cab " + // Fetch cabinet
           "LEFT JOIN FETCH cab.doctor " + // Also fetch doctor linked to cabinet if needed for footer info
           "LEFT JOIN FETCH c.prescribedMedications " +
           "WHERE c.idConsultation = :consultationId")
    Optional<Consultation> findByIdWithDetails(@Param("consultationId") Long consultationId);
}
