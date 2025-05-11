package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query; // Import Query
import org.springframework.data.repository.query.Param; // Import Param
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.RendezVous;
import pi.pperformance.elite.entities.Doctor; // Import Doctor
import pi.pperformance.elite.entities.Patient; // Import Patient
import pi.pperformance.elite.entities.CabinetDr; // Import CabinetDr

import java.time.LocalDate; // Import LocalDate
import java.time.LocalDateTime; // Import LocalDateTime
import java.util.List;
import java.util.Optional; // Import Optional

@Repository
public interface RendezVousRepository extends JpaRepository<RendezVous, Long> {

    // Find appointments by state and date for a specific cabinet
    // Eagerly fetch the patient associated with the appointment
    // Method to find appointments by cabinet, state, and date (using LocalDate for the date part)
    // JPA should handle the query against the LocalDateTime field for the given date range.
    // Added OrderByApptDateTimeAsc for sorting.
    @EntityGraph(attributePaths = {"patient"})
    List<RendezVous> findByCabinet_IdSiteAndApptStateAndApptDateTimeBetweenOrderByApptDateTimeAsc(Long cabinetId, String apptState, LocalDateTime startOfDay, LocalDateTime endOfDay);

    // Overload for just cabinet and state (no date filter) - Keep this as is
    // Added OrderByApptDateTimeAsc for sorting.
    List<RendezVous> findByCabinet_IdSiteAndApptStateOrderByApptDateTimeAsc(Long cabinetId, String apptState);

    // Duplicate method removed. The one on line 25 is kept.

    // Find appointments by patient, excluding superseded and patient-cancelled ones.
    // Eagerly fetch the patient.
    @EntityGraph(attributePaths = {"patient"})
    @Query("SELECT r FROM RendezVous r WHERE r.patient.id = :patientId AND r.superseded = false AND (r.apptState <> 'refusé' OR r.apptProposedDateTime IS NOT NULL)")
    List<RendezVous> findActiveAppointmentsForPatient(@Param("patientId") Long patientId);

    // Find active appointments by patient AND cabinet
    @EntityGraph(attributePaths = {"patient", "cabinet"}) // Eagerly fetch patient and cabinet
    @Query("SELECT r FROM RendezVous r WHERE r.patient.id = :patientId AND r.cabinet.idSite = :cabinetId AND r.superseded = false AND (r.apptState <> 'refusé' OR r.apptProposedDateTime IS NOT NULL)")
    List<RendezVous> findActiveAppointmentsForPatientAndCabinet(@Param("patientId") Long patientId, @Param("cabinetId") Long cabinetId);


    // Find appointments by doctor and date
    // Eagerly fetch the patient
    // Method to find appointments by doctor and date (using LocalDate)
    // Added OrderByApptDateTimeAsc for sorting.
    @EntityGraph(attributePaths = {"patient"})
     List<RendezVous> findByDoctor_IdAndApptDateTimeBetweenOrderByApptDateTimeAsc(Long doctorId, LocalDateTime startOfDay, LocalDateTime endOfDay);

     // Method to find appointments by cabinet and date (using LocalDate)
     // Eagerly fetch the patient
     // Added OrderByApptDateTimeAsc for sorting.
     @EntityGraph(attributePaths = {"patient"})
     List<RendezVous> findByCabinet_IdSiteAndApptDateTimeBetweenOrderByApptDateTimeAsc(Long cabinetId, LocalDateTime startOfDay, LocalDateTime endOfDay);

     // Override findById to ensure patient is fetched eagerly for the consultation page
     @Override
     @EntityGraph(attributePaths = {"patient"})
     Optional<RendezVous> findById(Long id);

}
