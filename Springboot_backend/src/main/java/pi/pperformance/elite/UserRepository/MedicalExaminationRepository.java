package pi.pperformance.elite.UserRepository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import pi.pperformance.elite.entities.MedicalExamination;
import pi.pperformance.elite.entities.Patient; // Import Patient

import java.util.List;

import pi.pperformance.elite.entities.DoctorCentreDexamen;


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
    // Corrected Query: Filter by patient ID and navigate through r.cabinet to get idSite
    @Query("SELECT me FROM MedicalExamination me JOIN me.rendezVous r WHERE r.patient.id = :patientId AND r.cabinet.idSite = :cabinetId")
    List<MedicalExamination> findExaminationsByPatientAndSite(@Param("patientId") Long patientId, @Param("cabinetId") Long cabinetId);

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

    // Add other custom query methods if needed later
}
