package pi.pperformance.elite.UserServices;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import pi.pperformance.elite.UserRepository.PatientRepository;
import pi.pperformance.elite.entities.Patient;

@Service
public class PatientService {

    @Autowired
    private PatientRepository patientRepository;

    // Méthode pour trouver un patient par ID
    public Patient findPatientById(Long id) {
        return patientRepository.findById(id).orElseThrow(() -> new RuntimeException("Patient not found"));
    }

    // Méthode pour supprimer un patient
    public void deletePatient(Patient patient) {
        patientRepository.delete(patient);
    }

    // Méthode pour ajouter un nouveau patient
    public Patient addPatient(Patient patient) {
        return patientRepository.save(patient);
    }
}