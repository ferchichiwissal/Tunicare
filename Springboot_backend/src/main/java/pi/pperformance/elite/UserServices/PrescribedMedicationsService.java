package pi.pperformance.elite.UserServices;

// Removed Lombok import
import org.springframework.beans.factory.annotation.Autowired; // Import Autowired
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pi.pperformance.elite.UserRepository.ConsultationRepository;
import pi.pperformance.elite.UserRepository.PrescribedMedicationsRepository;
import pi.pperformance.elite.entities.Consultation;
import pi.pperformance.elite.entities.PrescribedMedications;
import pi.pperformance.elite.exceptions.ResourceNotFoundException;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
// Removed @AllArgsConstructor
public class PrescribedMedicationsService implements IPrescribedMedicationsService {

    private final PrescribedMedicationsRepository prescribedMedicationsRepository;
    private final ConsultationRepository consultationRepository;

    // Explicit constructor for dependency injection
    @Autowired
    public PrescribedMedicationsService(PrescribedMedicationsRepository prescribedMedicationsRepository,
                                        ConsultationRepository consultationRepository) {
        this.prescribedMedicationsRepository = prescribedMedicationsRepository;
        this.consultationRepository = consultationRepository;
    }

    @Override
    public List<PrescribedMedications> getPrescriptionsByPatientId(Long patientId) {
        // Find all consultations for the patient using the correct repository method name
        List<Consultation> consultations = consultationRepository.findByPatient_IdOrderByDateConsultationDesc(patientId); // Corrected method name

        if (consultations.isEmpty()) {
            return Collections.emptyList();
        }

        // Extract all non-null prescriptions from these consultations
        // Fetching might be LAZY, consider EAGER or custom query if needed.
        return consultations.stream()
                .map(Consultation::getPrescribedMedications) // Get the prescription from each consultation
                .filter(Objects::nonNull) // Filter out consultations without prescriptions
                .collect(Collectors.toList());

        // Alternative: Custom query in PrescribedMedicationsRepository joining Consultation
        // Example:
        // @Query("SELECT pm FROM PrescribedMedications pm JOIN pm.consultation c WHERE c.patient.idPatient = :patientId ORDER BY c.dateConsultation DESC")
        // List<PrescribedMedications> findByPatientIdOrderByDateDesc(@Param("patientId") Long patientId);
        // return prescribedMedicationsRepository.findByPatientIdOrderByDateDesc(patientId);
    }

    @Override
    @Transactional
    public PrescribedMedications updatePrescription(Long prescriptionId, String updatedText) {
        PrescribedMedications prescription = prescribedMedicationsRepository.findById(prescriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found with id: " + prescriptionId));

        // Update the text
        prescription.setPrescribedMedications(updatedText);

        // Save the updated prescription
        return prescribedMedicationsRepository.save(prescription);
    }

    @Override
    public PrescribedMedications getPrescriptionByConsultationId(Long consultationId) {
        // Use the repository method to find the prescription by consultation ID
        // This might return null if no prescription is found for the given consultation ID
        return prescribedMedicationsRepository.findByConsultation_IdConsultation(consultationId);
        // Consider adding error handling or Optional return type if needed
    }
}
