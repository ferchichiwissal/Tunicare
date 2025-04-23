package pi.pperformance.elite.UserServices;

// Removed Lombok import
import org.springframework.beans.factory.annotation.Autowired; // Import Autowired
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pi.pperformance.elite.UserRepository.ConsultationRepository;
import pi.pperformance.elite.UserRepository.PatientRepository;
import pi.pperformance.elite.UserRepository.PrescribedMedicationsRepository;
import pi.pperformance.elite.dto.ConsultationDTO; // Import the DTO
import pi.pperformance.elite.entities.Consultation;
import pi.pperformance.elite.entities.Patient;
import pi.pperformance.elite.entities.PrescribedMedications;
import pi.pperformance.elite.exceptions.ResourceNotFoundException; // Make sure this class exists in the specified package

import java.util.Date;
import java.util.List;
import java.util.Optional; // Import Optional

@Service
// Removed @AllArgsConstructor
public class ConsultationService implements IConsultationService {

    private final ConsultationRepository consultationRepository;
    private final PatientRepository patientRepository;
    // Explicit constructor for dependency injection
    @Autowired
    public ConsultationService(ConsultationRepository consultationRepository, PatientRepository patientRepository) {
        this.consultationRepository = consultationRepository;
        this.patientRepository = patientRepository;
    }
    // PrescribedMedicationsRepository is not directly used here for saving,
    // as CascadeType.ALL handles it via ConsultationRepository.
    // It might be needed for specific prescription operations later.
    // private final PrescribedMedicationsRepository prescribedMedicationsRepository;

    @Override
    public List<Consultation> getConsultationHistoryByPatientId(Long patientId) {
        // Ensure patient exists (optional, depends on requirements)
        if (!patientRepository.existsById(patientId)) {
             throw new ResourceNotFoundException("Patient not found with id: " + patientId);
        }
        // Corrected repository method name
        return consultationRepository.findByPatient_IdOrderByDateConsultationDesc(patientId);
    }

    @Override
    @Transactional // Ensure atomicity when saving consultation and prescription
    public Consultation saveConsultation(Consultation consultationData, Long patientId, String prescriptionText) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));

        // Check if it's a new consultation (no ID) or an update
        Consultation consultationToSave;
        if (consultationData.getIdConsultation() == null) {
            // New Consultation
            consultationToSave = consultationData;
            consultationToSave.setPatient(patient);
            consultationToSave.setDateConsultation(new Date()); // Set current date/time for new consultation
        } else {
            // Updating existing consultation - fetch it first
            consultationToSave = consultationRepository.findById(consultationData.getIdConsultation())
                    .orElseThrow(() -> new ResourceNotFoundException("Consultation not found with id: " + consultationData.getIdConsultation()));
            // Update only the text from the input
            consultationToSave.setText(consultationData.getText());
            // Do not update patient or date on existing consultations unless specifically intended
        }


        // Handle prescription: Create new or update existing one associated with this consultation
        PrescribedMedications existingPrescription = consultationToSave.getPrescribedMedications();

        if (prescriptionText != null && !prescriptionText.trim().isEmpty()) {
            if (existingPrescription != null) {
                // Update existing prescription text
                existingPrescription.setPrescribedMedications(prescriptionText);
            } else {
                // Create new prescription and link it
                PrescribedMedications newPrescription = new PrescribedMedications();
                newPrescription.setPrescribedMedications(prescriptionText);
                consultationToSave.setPrescribedMedications(newPrescription); // Set inverse side
                newPrescription.setConsultation(consultationToSave); // Explicitly set owning side for clarity
                // The cascade from consultationToSave will save the newPrescription
            }
        } else {
            // If prescription text is empty/null, remove existing prescription if any
            if (existingPrescription != null) {
                consultationToSave.setPrescribedMedications(null);
                // Depending on orphanRemoval setting, the old prescription might be deleted from DB
                // Or you might need to delete it explicitly: prescribedMedicationsRepository.delete(existingPrescription);
            }
        }

        return consultationRepository.save(consultationToSave);
    }

    @Override
    public ConsultationDTO getConsultationById(Long consultationId) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation not found with id: " + consultationId));

        // Map entity to DTO
        Patient patient = consultation.getPatient(); // Patient is eagerly loaded
        return new ConsultationDTO(
                consultation.getIdConsultation(),
                consultation.getDateConsultation(),
                consultation.getText(),
                patient != null ? patient.getId() : null, // Corrected getter for user ID
                patient != null ? patient.getFirstName() : null,
                patient != null ? patient.getLastName() : null
                // Add mapping for other DTO fields if needed (e.g., prescription summary)
        );
    }

    @Override
    public List<Consultation> getAllConsultations() {
        // Basic implementation - returns all. Needs refinement for dashboard filtering (by cabinet, doctor, role etc.)
        // This will likely require SecurityContextHolder to get current user/role and potentially custom queries.
        return consultationRepository.findAll(); // Placeholder
    }

    @Override
    @Transactional
    public Consultation updateConsultation(Long consultationId, Consultation updatedConsultationData) {
       // This method might be redundant now as saveConsultation handles updates.
       // Kept for interface compliance, but logic is merged into saveConsultation.
       // Or, refine this to only update specific fields if needed.
       // Fetch directly from repository as getConsultationById now returns DTO
       Consultation existingConsultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation not found with id: " + consultationId));
       existingConsultation.setText(updatedConsultationData.getText());
       // Prescription update should be handled by saveConsultation or a dedicated prescription service method.
       return consultationRepository.save(existingConsultation);
    }
}
