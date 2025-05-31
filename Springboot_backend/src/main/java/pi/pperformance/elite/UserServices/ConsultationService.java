package pi.pperformance.elite.UserServices;

// Removed Lombok import
import org.springframework.beans.factory.annotation.Autowired; // Import Autowired
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pi.pperformance.elite.UserRepository.*; // Import all repositories
import pi.pperformance.elite.dto.ConsultationDTO; // Import the DTO
import pi.pperformance.elite.entities.*; // Import all entities
import pi.pperformance.elite.exceptions.ResourceNotFoundException; // Make sure this class exists in the specified package

import java.util.Date;
import java.util.List;
import java.util.Optional; // Import Optional

@Service
// Removed @AllArgsConstructor
public class ConsultationService implements IConsultationService {

    private final ConsultationRepository consultationRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final CabinetDrRepository cabinetDrRepository; // Inject CabinetDrRepository

    // Explicit constructor for dependency injection
    @Autowired
    public ConsultationService(ConsultationRepository consultationRepository,
                               PatientRepository patientRepository,
                               UserRepository userRepository,
                               CabinetDrRepository cabinetDrRepository) { // Add CabinetDrRepository to constructor
        this.consultationRepository = consultationRepository;
        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
        this.cabinetDrRepository = cabinetDrRepository; // Initialize CabinetDrRepository
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
        // Use the correct repository method filtering by isHiddenForPatient
        return consultationRepository.findByPatient_IdAndIsHiddenForPatientFalseOrderByDateConsultationDesc(patientId);
    }

    // Updated method signature to include doctorId and cabinetId
    @Override
    @Transactional // Ensure atomicity when saving consultation and prescription
    public Consultation saveConsultation(Consultation consultationData, Long patientId, Long doctorId, Long cabinetId, String prescriptionText) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));

        // Fetch the doctor
        User doctor = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + doctorId));

        // Fetch the cabinet
        CabinetDr cabinet = cabinetDrRepository.findById(cabinetId)
                .orElseThrow(() -> new ResourceNotFoundException("Cabinet not found with id: " + cabinetId));


        // Check if it's a new consultation (no ID) or an update
        Consultation consultationToSave;
        if (consultationData.getIdConsultation() == null) {
            // New Consultation
            consultationToSave = consultationData;
            consultationToSave.setPatient(patient);
            consultationToSave.setDoctor(doctor); // Set the doctor
            consultationToSave.setCabinet(cabinet); // Set the cabinet
            consultationToSave.setDateConsultation(new Date()); // Set current date/time for new consultation
        } else {
            // Updating existing consultation - fetch it first
            consultationToSave = consultationRepository.findById(consultationData.getIdConsultation())
                    .orElseThrow(() -> new ResourceNotFoundException("Consultation not found with id: " + consultationData.getIdConsultation()));
            // Update only the text from the input
            consultationToSave.setText(consultationData.getText());
            // Optionally update the doctor/cabinet if needed, though usually these don't change for an existing consultation.
            // consultationToSave.setDoctor(doctor);
            // consultationToSave.setCabinet(cabinet);
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

    // New method to get consultations by doctor ID
    @Override
    public List<Consultation> getConsultationsByDoctorId(Long doctorId) {
        // Ensure doctor exists (optional)
        if (!userRepository.existsById(doctorId)) {
            throw new ResourceNotFoundException("Doctor not found with id: " + doctorId);
        }
        // Use the correct repository method filtering by isHiddenForDoctor
        return consultationRepository.findByDoctor_IdAndIsHiddenForDoctorFalseOrderByDateConsultationDesc(doctorId);
    }


    @Override
    public ConsultationDTO getConsultationById(Long consultationId) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation not found with id: " + consultationId));

        // Map entity to DTO
        Patient patient = consultation.getPatient(); // Patient is eagerly loaded
        // Reverting to 7-argument call as requested
        return new ConsultationDTO(
                 consultation.getIdConsultation(),
                 consultation.getDateConsultation(),
                 consultation.getText(),
                 patient != null ? patient.getId() : null,
                 patient != null ? patient.getFirstName() : null,
                 patient != null ? patient.getLastName() : null,
                 // Fetch and include prescription text
                 consultation.getPrescribedMedications() != null ? consultation.getPrescribedMedications().getPrescribedMedications() : null
         );
     }

    @Override
    public List<Consultation> getAllConsultations() {
        // Basic implementation - returns all. Needs refinement for dashboard filtering (by cabinet, doctor, role etc.)
        // This should ideally depend on the user's role. Assuming it's for doctors/assistants for now.
        return consultationRepository.findAllByIsHiddenForDoctorFalse();
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
@Override
    public List<ConsultationDTO> getPatientConsultationsByCabinet(Long patientId, Long cabinetId) {
        // Verify patient and cabinet exist (optional, for robustness)
        if (!patientRepository.existsById(patientId)) {
            throw new ResourceNotFoundException("Patient not found with id: " + patientId);
        }
        if (!cabinetDrRepository.existsById(cabinetId)) {
            throw new ResourceNotFoundException("Cabinet not found with id: " + cabinetId);
        }

        // Fetch consultations filtered by patient, cabinet, and isHiddenForPatient
        List<Consultation> consultations = consultationRepository.findByPatient_IdAndCabinet_IdSiteAndIsHiddenForPatientFalseOrderByDateConsultationDesc(patientId, cabinetId); // Corrected method name

        // Map List<Consultation> to List<ConsultationDTO>
        return consultations.stream()
                .map(consultation -> {
                    Patient patient = consultation.getPatient(); // Assuming eager/available
                    return new ConsultationDTO(
                            consultation.getIdConsultation(),
                            consultation.getDateConsultation(),
                            consultation.getText(), // Include consultation text
                            patient != null ? patient.getId() : null,
                            patient != null ? patient.getFirstName() : null,
                            patient != null ? patient.getLastName() : null,
                            consultation.getPrescribedMedications() != null ? consultation.getPrescribedMedications().getPrescribedMedications() : null // Include prescription text
                    );
                })
                .toList(); // Use .toList() for Java 16+ or .collect(Collectors.toList()) for older versions
    }

    @Override
    public Consultation getConsultationEntityById(Long consultationId) {
        // Use the custom repository method to fetch the consultation with details
        return consultationRepository.findByIdWithDetails(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation not found with id: " + consultationId + " or required details are missing."));
        // This ensures Patient, Cabinet, Doctor (via Cabinet), and Prescription are loaded if they exist.
    }

    @Override
    @Transactional
    public void setConsultationVisibilityForPatient(Long consultationId, Long patientId, boolean isHidden) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation not found with id: " + consultationId));

        // Verify the patient ID matches the consultation's patient
        if (consultation.getPatient() == null || !consultation.getPatient().getId().equals(patientId)) {
            // Or throw an authorization exception
            throw new SecurityException("Patient ID mismatch or consultation has no patient.");
        }

        consultation.setHiddenForPatient(isHidden);
        consultationRepository.save(consultation);
    }

    @Override
    @Transactional
    public void setConsultationVisibilityForDoctor(Long consultationId, Long doctorId, boolean isHidden) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation not found with id: " + consultationId));

        // Verify the doctor ID matches the consultation's doctor
        if (consultation.getDoctor() == null || !consultation.getDoctor().getId().equals(doctorId)) {
            // Or throw an authorization exception
            throw new SecurityException("Doctor ID mismatch or consultation has no doctor.");
        }

        consultation.setHiddenForDoctor(isHidden);
        consultationRepository.save(consultation);
    }

    @Override
    @Transactional // Ensure atomicity for deletion
    public void deleteConsultationsByPatientId(Long patientId) {
        // Use the repository method to delete consultations by patient ID
        consultationRepository.deleteByPatient_Id(patientId);
    }
}
