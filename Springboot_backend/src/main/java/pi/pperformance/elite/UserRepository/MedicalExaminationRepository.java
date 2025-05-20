package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.MedicalExamination;
import pi.pperformance.elite.entities.Patient; // Import Patient
import pi.pperformance.elite.dto.MonthlyStatDTO; // Ajout pour les graphiques
import pi.pperformance.elite.dto.MonthlyReportStatsDTO; // Import MonthlyReportStatsDTO
import pi.pperformance.elite.dto.ReportTypeStatsDTO; // Import ReportTypeStatsDTO

import java.util.List;
import java.time.LocalDateTime; // Ajout de l'import manquant
import pi.pperformance.elite.entities.DoctorCentreDexamen;
import pi.pperformance.elite.entities.Doctor; 

@Repository
public interface MedicalExaminationRepository extends JpaRepository<MedicalExamination, Long> {

    // Find examinations by patient ID (needs join through Consultation)
    // We might need a custom query or fetch this via Consultation entity later
    // List<MedicalExamination> findByConsultationPatientIdPatient(Long patientId); // Example, might need adjustment

    /**
     * Finds medical examinations for a specific patient within a specific cabinet.
     * It traverses the relationships: MedicalExamination -> RendezVous -> Patient (for patientId)
     * and MedicalExamination -> RendezVous -> Doctor -> Cabinet (for cabinetId).
     *
     * @param patientId The ID of the patient.
     * @param cabinetId The ID of the cabinet (specifically, the idSite of the CabinetDr).
     * @return A list of matching medical examinations.
     */
    // Corrected Query: Filter by patient ID, cabinet ID, and ensure not hidden by patient
    @Query("SELECT me FROM MedicalExamination me JOIN me.rendezVous r WHERE r.patient.id = :patientId AND r.cabinet.idSite = :cabinetId AND me.hiddenForPatient = false ORDER BY me.createdAt DESC")
    List<MedicalExamination> findExaminationsByPatientAndSite(@Param("patientId") Long patientId, @Param("cabinetId") Long cabinetId);
/**
     * Finds medical examinations for a specific patient, ensuring they are not hidden by the patient.
     * It traverses the relationships: MedicalExamination -> RendezVous -> Patient (for patientId).
     *
     * @param patientId The ID of the patient.
     * @return A list of matching medical examinations.
     */
    @Query("SELECT me FROM MedicalExamination me JOIN me.rendezVous r WHERE r.patient.id = :patientId AND me.hiddenForPatient = false ORDER BY me.createdAt DESC")
    List<MedicalExamination> findByPatientIdAndNotHiddenForPatient(@Param("patientId") Long patientId);

    /**
     * Finds medical examinations created by a specific doctor.
     * @param doctorId The ID of the doctor.
     * @return A list of medical examinations created by the doctor.
     */
    List<MedicalExamination> findByDoctorIdAndHiddenForPrescribingDoctorIsFalse(Long doctorId);

    /**
     * Finds medical examinations assigned to a specific centre name and having a specific status.
     * @param centreName The name of the examination centre.
     * @param etat The status of the examination (e.g., "en attente").
     * @return A list of matching medical examinations.
     */
    List<MedicalExamination> findByCentreNameAndEtat(String centreName, String etat);

    /**
     * Finds medical examinations for a specific doctor centre and with a specific status.
     * @param doctorCentreDexamen The doctor centre examen entity.
     * @param etat The status of the examination.
     * @return A list of matching medical examinations.
     */
    List<MedicalExamination> findByDoctorCentreDexamenAndEtatAndHiddenForReportingCentreDoctorIsFalse(DoctorCentreDexamen doctorCentreDexamen, String etat);

    // Méthode pour StatisticsService
    @Query("SELECT COUNT(me) FROM MedicalExamination me WHERE me.rendezVous.patient = :patient")
    long countByPatient(@Param("patient") Patient patient);

    long countByDoctorAndEtat(Doctor doctor, String etat);

    long countByDoctorAndEtatAndHiddenForPrescribingDoctorIsFalse(Doctor doctor, String etat);

    // Méthodes pour DoctorCentreDexamen statistics
    long countByDoctorCentreDexamenAndEtatAndUpdatedAtBetween(DoctorCentreDexamen doctorCentreDexamen, String etat, java.util.Date startDate, java.util.Date endDate);

    long countByDoctorCentreDexamenAndEtat(DoctorCentreDexamen doctorCentreDexamen, String etat);

    // Pour trouver les examens "à venir" pour un DoctorCentreDexamen (ceux qui sont en attente et dont le RDV est aujourd'hui)
    List<MedicalExamination> findByDoctorCentreDexamenAndEtatAndRendezVous_ApptDateTimeBetweenOrderByRendezVous_ApptDateTimeAsc(DoctorCentreDexamen doctorCentreDexamen, String etat, LocalDateTime startOfDay, LocalDateTime endOfDay);

    // For Admin statistics: Count all medical examinations created (requested) within a specific period
    long countByCreatedAtBetween(LocalDateTime startDateTime, LocalDateTime endDateTime);

    // For Patient graph: Count exams by month for the last 12 months
    @Query("SELECT new pi.pperformance.elite.dto.MonthlyStatDTO(YEAR(me.createdAt), MONTH(me.createdAt), COUNT(me)) " +
           "FROM MedicalExamination me " +
           "WHERE me.rendezVous.patient.id = :patientId AND me.rendezVous.cabinet.idSite = :cabinetId AND me.createdAt >= :startDate " +
           "GROUP BY YEAR(me.createdAt), MONTH(me.createdAt) " +
           "ORDER BY YEAR(me.createdAt) DESC, MONTH(me.createdAt) DESC")
    List<MonthlyStatDTO> countExamsByMonthForPatientAndCabinet(@Param("patientId") Long patientId, @Param("cabinetId") Long cabinetId, @Param("startDate") LocalDateTime startDate);

    // For Admin global graph: Count all medical examinations by month for the last 12 months
    @Query("SELECT new pi.pperformance.elite.dto.MonthlyStatDTO(YEAR(me.createdAt), MONTH(me.createdAt), COUNT(me)) " +
           "FROM MedicalExamination me " +
           "WHERE me.createdAt >= :startDate " +
           "GROUP BY YEAR(me.createdAt), MONTH(me.createdAt) " +
           "ORDER BY YEAR(me.createdAt) DESC, MONTH(me.createdAt) DESC")
    List<MonthlyStatDTO> countGlobalExamsByMonth(@Param("startDate") LocalDateTime startDate);

    // For Admin statistics: Count all medical examinations with a non-null and non-empty result
    long countByResultatIsNotNullAndResultatNot(String resultatExclu);

    // For Admin statistics: Count medical examinations with a non-null/non-empty result within a date range
    long countByResultatIsNotNullAndResultatNotAndUpdatedAtBetween(String resultatExclu, LocalDateTime startOfMonth, LocalDateTime endOfMonth);

    // Méthodes pour les statistiques basées sur centreName
    long countByCentreNameAndEtat(String centreName, String etat);

    long countByCentreNameAndEtatAndUpdatedAtBetween(String centreName, String etat, java.util.Date startDate, java.util.Date endDate);

    List<MedicalExamination> findByCentreNameAndEtatAndRendezVous_ApptDateTimeBetweenOrderByRendezVous_ApptDateTimeAsc(String centreName, String etat, LocalDateTime startOfDay, LocalDateTime endOfDay);

    // Nouvelles méthodes pour les statistiques de rapports du docteur de centre d'examen

    // Méthode pour compter le nombre total de rapports rédigés par un docteur de centre dans un centre spécifique
    long countByDoctorCentreDexamenAndCentreNameAndResultatIsNotNullAndResultatNot(DoctorCentreDexamen doctorCentreDexamen, String centreName, String resultatExclu);


    // Méthode pour obtenir les statistiques mensuelles des rapports pour un docteur de centre d'examen et son centre
    @Query("SELECT new pi.pperformance.elite.dto.MonthlyReportStatsDTO(CAST(FUNCTION('DATE_FORMAT', me.updatedAt, '%Y-%m') AS string), COUNT(me)) " +
           "FROM MedicalExamination me " +
           "WHERE me.doctorCentreDexamen = :doctorCentreUser " + // Utiliser l'entité directement
           "AND me.centreName = :centreName " + // Utiliser le nom du centre
           "AND me.resultat IS NOT NULL AND me.resultat <> '' " +
           "AND me.updatedAt >= :startDate " +
           "GROUP BY FUNCTION('DATE_FORMAT', me.updatedAt, '%Y-%m') " +
           "ORDER BY FUNCTION('DATE_FORMAT', me.updatedAt, '%Y-%m') DESC")
    List<MonthlyReportStatsDTO> countReportsMonthlyByDoctorCentreAndCentre(@Param("doctorCentreUser") DoctorCentreDexamen doctorCentreUser, @Param("centreName") String centreName, @Param("startDate") LocalDateTime startDate);

    // Méthode pour obtenir les statistiques des rapports par type pour un docteur de centre d'examen et son centre
    @Query("SELECT new pi.pperformance.elite.dto.ReportTypeStatsDTO(me.act AS reportType, COUNT(me) AS reportCount) " +
           "FROM MedicalExamination me " +
           "WHERE me.doctorCentreDexamen = :doctorCentreUser " + // Utiliser l'entité directement
           "AND me.centreName = :centreName " + // Utiliser le nom du centre
           "AND me.resultat IS NOT NULL AND me.resultat <> '' " +
           "GROUP BY me.act")
    List<ReportTypeStatsDTO> countReportsByTypeByDoctorCentreAndCentre(@Param("doctorCentreUser") DoctorCentreDexamen doctorCentreUser, @Param("centreName") String centreName);

    // Nouvelles méthodes pour les statistiques de rapports du docteur de centre d'examen filtrées par doctorCentreDexamen
    @Query("SELECT new pi.pperformance.elite.dto.MonthlyReportStatsDTO(CAST(FUNCTION('DATE_FORMAT', me.updatedAt, '%Y-%m') AS string), COUNT(me)) " +
           "FROM MedicalExamination me " +
           "WHERE me.doctorCentreDexamen = :doctorCentreUser " + // Filtrer par l'entité DoctorCentreDexamen
           "AND me.resultat IS NOT NULL AND me.resultat <> '' " +
           "AND me.updatedAt >= :startDate " +
           "GROUP BY FUNCTION('DATE_FORMAT', me.updatedAt, '%Y-%m') " +
           "ORDER BY FUNCTION('DATE_FORMAT', me.updatedAt, '%Y-%m') DESC")
    List<MonthlyReportStatsDTO> countReportsMonthlyByDoctorCentreAndResultatIsNotNullAndResultatNot(@Param("doctorCentreUser") DoctorCentreDexamen doctorCentreUser, @Param("startDate") LocalDateTime startDate);

    @Query("SELECT new pi.pperformance.elite.dto.ReportTypeStatsDTO(me.act AS reportType, COUNT(me) AS reportCount) " +
           "FROM MedicalExamination me " +
           "WHERE me.doctorCentreDexamen = :doctorCentreUser " + // Filtrer par l'entité DoctorCentreDexamen
           "AND me.resultat IS NOT NULL AND me.resultat <> '' " +
           "GROUP BY me.act")
    List<ReportTypeStatsDTO> countReportsByTypeByDoctorCentreAndResultatIsNotNullAndResultatNot(@Param("doctorCentreUser") DoctorCentreDexamen doctorCentreUser);


    // Add other custom query methods if needed later
}
