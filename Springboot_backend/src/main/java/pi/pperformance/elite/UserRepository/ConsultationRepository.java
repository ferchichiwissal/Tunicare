package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query; // Import Query
import org.springframework.data.repository.query.Param; // Import Param
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.Consultation;
import pi.pperformance.elite.entities.Doctor; // Import Doctor
import pi.pperformance.elite.entities.Patient;
import pi.pperformance.elite.entities.CabinetDr;
import pi.pperformance.elite.dto.MonthlyStatDTO; // Ajout pour les graphiques
import java.time.LocalDateTime;
import java.util.Date; // Ajout pour les méthodes de statistiques

import java.util.List;
import java.util.Optional; // Import Optional

@Repository
public interface ConsultationRepository extends JpaRepository<Consultation, Long> {

    // Find consultations by patient ID, ordered by date descending (for patient history view)
    List<Consultation> findByPatient_IdAndIsHiddenForPatientFalseOrderByDateConsultationDesc(Long patientId);

    // Find consultations by doctor ID, ordered by date descending (for doctor dashboard view)
    List<Consultation> findByDoctor_IdAndIsHiddenForDoctorFalseOrderByDateConsultationDesc(Long doctorId);

    // Find consultations by patient ID AND cabinet ID, ordered by date descending (for patient's "My Consultations" view in a specific cabinet)
    List<Consultation> findByPatient_IdAndCabinet_IdSiteAndIsHiddenForPatientFalseOrderByDateConsultationDesc(Long patientId, Long cabinetId);

    // Find all consultations visible to doctors (e.g., for general doctor/assistant dashboard)
    List<Consultation> findAllByIsHiddenForDoctorFalse();

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

    // Méthodes pour StatisticsService
    long countByDoctorAndCabinetAndDateConsultationBetween(Doctor doctor, CabinetDr cabinet, Date startDate, Date endDate);
    long countByPatientAndCabinet(Patient patient, CabinetDr cabinet);

    // For Admin statistics: Count all consultations created within a specific period
    long countByDateConsultationBetween(Date startDate, Date endDate);

    // For Assistant dashboard: Count consultations by cabinet and date range
    long countByCabinetAndDateConsultationBetween(CabinetDr cabinet, Date startDate, Date endDate);

    // For Patient graph: Count consultations by month for the last 12 months
    @Query("SELECT new pi.pperformance.elite.dto.MonthlyStatDTO(YEAR(c.dateConsultation), MONTH(c.dateConsultation), COUNT(c)) " +
           "FROM Consultation c " +
           "WHERE c.patient.id = :patientId AND c.cabinet.idSite = :cabinetId AND c.dateConsultation >= :startDate " +
           "GROUP BY YEAR(c.dateConsultation), MONTH(c.dateConsultation) " +
           "ORDER BY YEAR(c.dateConsultation) DESC, MONTH(c.dateConsultation) DESC")
    List<MonthlyStatDTO> countConsultationsByMonthForPatientAndCabinet(@Param("patientId") Long patientId, @Param("cabinetId") Long cabinetId, @Param("startDate") Date startDate);

   // For Doctor graph: Count consultations by month for the last 12 months for a specific doctor and cabinet
   @Query("SELECT new pi.pperformance.elite.dto.MonthlyStatDTO(YEAR(c.dateConsultation), MONTH(c.dateConsultation), COUNT(c)) " +
          "FROM Consultation c " +
          "WHERE c.doctor.id = :doctorId AND c.cabinet.idSite = :cabinetId AND c.dateConsultation >= :startDate " +
          "GROUP BY YEAR(c.dateConsultation), MONTH(c.dateConsultation) " +
          "ORDER BY YEAR(c.dateConsultation) DESC, MONTH(c.dateConsultation) DESC")
   List<MonthlyStatDTO> countConsultationsByMonthForDoctorAndCabinet(@Param("doctorId") Long doctorId, @Param("cabinetId") Long cabinetId, @Param("startDate") Date startDate);

   // For Admin global graph: Count all consultations by month for the last 12 months
   @Query("SELECT new pi.pperformance.elite.dto.MonthlyStatDTO(YEAR(c.dateConsultation), MONTH(c.dateConsultation), COUNT(c)) " +
          "FROM Consultation c " +
          "WHERE c.dateConsultation >= :startDate " +
          "GROUP BY YEAR(c.dateConsultation), MONTH(c.dateConsultation) " +
          "ORDER BY YEAR(c.dateConsultation) DESC, MONTH(c.dateConsultation) DESC")
   List<MonthlyStatDTO> countGlobalConsultationsByMonth(@Param("startDate") Date startDate);
}
