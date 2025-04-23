package pi.pperformance.elite.UserServices;

import pi.pperformance.elite.entities.RendezVous;
import pi.pperformance.elite.entities.User; // Import User if needed for actor parameters

import java.time.LocalDate; // Import LocalDate
import java.time.LocalDateTime; // Import LocalDateTime
import java.util.List;
import java.util.Optional;

// Define as an interface
public interface RendezVousService {

    // Method signatures based on Controller usage and previous ServiceImpl content

    // Part 1: Patient - Add appointment for the currently authenticated user
    // Added optional originalAppointmentId to handle rescheduling
    RendezVous addAppointmentForCurrentUser(String userEmail, RendezVous rendezVousDetails, Long originalAppointmentId);

    // Part 2: Assistant/Doctor - Getters
    List<RendezVous> getAppointmentsByCabinetStateAndDate(Long cabinetId, String state, LocalDate date); // Changed to LocalDate
    List<RendezVous> getAcceptedAppointmentsByCabinetAndDate(Long cabinetId, LocalDate date); // Changed to LocalDate

    // Part 2: Assistant/Doctor - Actions
    RendezVous acceptAppointment(Long appointmentId);
    // proposeNewDate removed
    RendezVous refuseAndProposeAppointment(Long appointmentId, LocalDateTime proposedDateTime); // Added new method
    RendezVous markAppointmentAsDone(Long appointmentId);

    // Part 3: Patient Actions (from Mes Rendez-vous page)
    RendezVous cancelAppointment(Long appointmentId, String userEmail); // Patient cancels their own accepted appointment
    RendezVous updateAppointment(Long appointmentId, RendezVous updatedDetails, String userEmail); // Patient modifies their own pending appointment

    // Helper for Patient Dashboard
    List<RendezVous> getAppointmentsByPatient(Long patientId);

    // Method to get a single appointment by ID (for Consultation Page)
    Optional<RendezVous> getAppointmentById(Long appointmentId);

    // Part 2: Assistant/Doctor - Add appointment for a specific patient
    RendezVous addAppointmentByStaff(Long cabinetId, Long patientId, LocalDateTime apptDateTime, String apptType, String actorEmail); // Updated type and name

    // Optional: Methods from the incorrect ServiceImpl if they are actually needed
    // Optional<RendezVous> findAppointmentById(Long appointmentId);
    // List<RendezVous> getAppointmentsByCriteria(Long cabinetId, LocalDateTime dateTime, String state, String searchTerm); // Updated type
    // RendezVous updateAppointmentState(Long appointmentId, String newState, User actor) throws Exception; // Consider specific exceptions

}
