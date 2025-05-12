package pi.pperformance.elite.UserServices;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import pi.pperformance.elite.Authentif.CustomUserDetails;
import pi.pperformance.elite.UserRepository.*;
import pi.pperformance.elite.dto.AppointmentReminderDTO;
import pi.pperformance.elite.dto.CenterDoctorStatDTO;
import pi.pperformance.elite.dto.DoctorExamStatsByCenterDTO;
import pi.pperformance.elite.dto.DoctorStatisticsDTO;
import pi.pperformance.elite.dto.PatientStatisticsDTO;
import pi.pperformance.elite.dto.DoctorCentreStatisticsDTO; // Ajout de l'import
import pi.pperformance.elite.dto.AdminGlobalStatisticsDTO; // Ajout de l'import
import pi.pperformance.elite.dto.RecentActivityDTO;
import pi.pperformance.elite.dto.SimpleAppointmentDTO;
import pi.pperformance.elite.dto.AssistantStatisticsDTO; // Import the new DTO
import pi.pperformance.elite.entities.*;
import pi.pperformance.elite.enums.RendezVousStatus;

import java.util.List;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.Comparator;

@Service
public class StatisticsService implements IStatisticsService {

    private final MedicalExaminationRepository medicalExaminationRepository;
    private final UserRepository userRepository;
    private final DoctorCentreDexamenRepository doctorCentreDexamenRepository;
    private final RendezVousRepository rendezVousRepository;
    private final ConsultationRepository consultationRepository;
    private final UserCabinetRegistrationRepository userCabinetRegistrationRepository;
    private final CertificateRepository certificateRepository; 
    private final CabinetRepository cabinetRepository; // Ajout
    private final CentreDexamenRepository centreDexamenRepository; // Ajout

    @Autowired
    public StatisticsService(MedicalExaminationRepository medicalExaminationRepository,
                             UserRepository userRepository,
                             DoctorCentreDexamenRepository doctorCentreDexamenRepository,
                             RendezVousRepository rendezVousRepository,
                             ConsultationRepository consultationRepository,
                             UserCabinetRegistrationRepository userCabinetRegistrationRepository,
                             CertificateRepository certificateRepository,
                             CabinetRepository cabinetRepository, // Ajout
                             CentreDexamenRepository centreDexamenRepository) { // Ajout
        this.medicalExaminationRepository = medicalExaminationRepository;
        this.userRepository = userRepository;
        this.doctorCentreDexamenRepository = doctorCentreDexamenRepository;
        this.rendezVousRepository = rendezVousRepository;
        this.consultationRepository = consultationRepository;
        this.userCabinetRegistrationRepository = userCabinetRegistrationRepository;
        this.certificateRepository = certificateRepository;
        this.cabinetRepository = cabinetRepository; // Ajout
        this.centreDexamenRepository = centreDexamenRepository; // Ajout
    }

    private LocalDate convertToLocalDate(Date dateToConvert) {
        if (dateToConvert == null) {
            return null;
        }
        return dateToConvert.toInstant()
          .atZone(ZoneId.systemDefault())
          .toLocalDate();
    }

    private List<MedicalExamination> filterExaminationsByDateAndStatus(List<MedicalExamination> exams, Integer year, Integer month) {
        return exams.stream()
            .filter(exam -> "Terminé".equalsIgnoreCase(exam.getEtat()))
            .filter(exam -> {
                LocalDate examDate = convertToLocalDate(exam.getUpdatedAt());
                if (examDate == null) return false;

                if (year == null) return true;

                if (month == null) {
                    return examDate.getYear() == year;
                }
                return examDate.getYear() == year && examDate.getMonthValue() == month;
            })
            .collect(Collectors.toList());
    }

    @Override
    public List<DoctorExamStatsByCenterDTO> getDoctorExamStatsByCenter(Integer year, Integer month) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long doctorId = userDetails.getId();

        List<MedicalExamination> allDoctorExaminations = medicalExaminationRepository.findByDoctorIdAndHiddenForPrescribingDoctorIsFalse(doctorId);

        List<MedicalExamination> relevantExaminations = filterExaminationsByDateAndStatus(allDoctorExaminations, year, month);

        Map<String, List<MedicalExamination>> examsByCenter = relevantExaminations.stream()
                .filter(exam -> exam.getCentreName() != null && !exam.getCentreName().isEmpty())
                .collect(Collectors.groupingBy(MedicalExamination::getCentreName));

        return examsByCenter.entrySet().stream()
                .map(entry -> {
                    long totalForCenterInPeriod = entry.getValue().size();
                    return new DoctorExamStatsByCenterDTO(entry.getKey(), totalForCenterInPeriod);
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<CenterDoctorStatDTO> getCenterExamStatsByDoctor(Integer year, Integer month) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long connectedUserDoctorCentreId = userDetails.getId();

        DoctorCentreDexamen doctorCentre = doctorCentreDexamenRepository.findById(connectedUserDoctorCentreId)
                .orElse(null);

        if (doctorCentre == null) {
            System.err.println("DoctorCentreDexamen entity not found for user ID: " + connectedUserDoctorCentreId);
            return new ArrayList<>();
        }

        List<MedicalExamination> allExaminationsForCentre = medicalExaminationRepository.findAll().stream()
            .filter(me -> doctorCentre.equals(me.getDoctorCentreDexamen()))
            .collect(Collectors.toList());

        List<MedicalExamination> relevantExaminations = filterExaminationsByDateAndStatus(allExaminationsForCentre, year, month);

        Map<String, Map<String, Long>> statsByDoctorAndCabinet = relevantExaminations.stream()
            .filter(exam -> exam.getDoctor() != null)
            .collect(Collectors.groupingBy(
                exam -> exam.getDoctor().getFirstName() + " " + exam.getDoctor().getLastName(),
                Collectors.groupingBy(
                    exam -> exam.getDoctor().getCabinet() != null ? exam.getDoctor().getCabinet().getName() : "N/A",
                    Collectors.counting()
                )
            ));

        List<CenterDoctorStatDTO> result = new ArrayList<>();
        statsByDoctorAndCabinet.forEach((doctorName, cabinetMap) -> {
            cabinetMap.forEach((cabinetName, count) -> {
                result.add(new CenterDoctorStatDTO(doctorName, cabinetName.equals("N/A") ? null : cabinetName, count));
            });
        });

        result.sort(Comparator.comparing(CenterDoctorStatDTO::getPrescribingDoctorName)
                              .thenComparing(CenterDoctorStatDTO::getPrescribingDoctorCabinetName, Comparator.nullsLast(String::compareTo)));

        return result;
    }

    @Override
    public DoctorStatisticsDTO getDoctorDashboardStatistics(Long doctorId, Long cabinetId) {
        if (doctorId == null || cabinetId == null) {
            // Ajuster pour le nouveau constructeur: (long, long, long, List, long, long, long, double, long, long, long)
            return new DoctorStatisticsDTO(0, 0, 0, Collections.emptyList(), 0, 0, 0, 0.0, 0, 0, 0);
        }

        User userDoctor = userRepository.findById(doctorId).orElse(null);
        if (userDoctor == null || !(userDoctor instanceof Doctor)) {
            // Ajuster pour le nouveau constructeur
            return new DoctorStatisticsDTO(0, 0, 0, Collections.emptyList(), 0, 0, 0, 0.0, 0, 0, 0);
        }
        Doctor currentDoctor = (Doctor) userDoctor;

        CabinetDr currentCabinet = cabinetRepository.findById(cabinetId).orElse(null);
        if (currentCabinet == null) {
            // Cabinet not found, return DTO with zeros
            return new DoctorStatisticsDTO(0, 0, 0, Collections.emptyList(), 0, 0, 0, 0.0, 0, 0, 0);
        }

        LocalDate today = LocalDate.now();
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDateTime endOfToday = today.plusDays(1).atStartOfDay();
        Date todayDateForRepo = Date.from(startOfToday.atZone(ZoneId.systemDefault()).toInstant());

        // Count accepted appointments for the entire cabinet today
        long todaysAcceptedAppointments = rendezVousRepository.countByCabinetAndApptDateTimeBetweenAndApptState(
                currentCabinet, startOfToday, endOfToday, "accepté"); // Assuming "accepté" is the correct string from previous fixes

        long todaysConsultationsRealized = consultationRepository.countByDoctorAndCabinetAndDateConsultationBetween(
                currentDoctor, currentCabinet, todayDateForRepo, Date.from(endOfToday.atZone(ZoneId.systemDefault()).toInstant()));

        long totalPatientsInCabinet = userCabinetRegistrationRepository.countByCabinetAndIsActive(currentCabinet, true);

        List<RendezVous> upcomingRvs = rendezVousRepository.findByDoctorAndCabinetAndApptDateTimeBetweenAndApptStateOrderByApptDateTimeAsc(
            currentDoctor, currentCabinet, startOfToday, endOfToday, "accepté" // Assumed "accepté" from previous discussions
        );

        List<SimpleAppointmentDTO> upcomingAppointmentsToday = upcomingRvs.stream()
            .filter(rv -> rv.getApptDateTime() != null && rv.getPatient() != null)
            .map(rv -> new SimpleAppointmentDTO(
                rv.getIdAppointment(),
                rv.getPatient().getFirstName() + " " + rv.getPatient().getLastName(),
                rv.getApptDateTime().toLocalTime().toString()
            ))
            .collect(Collectors.toList());
        
        // Calculer pendingConfirmationAppointmentsCount
        long pendingConfirmationAppointmentsCount = rendezVousRepository.countByCabinet_IdSiteAndApptState(cabinetId, "en attente"); // Match database string, count for cabinet

        // Calculer pendingExaminationRequestsCount
        long pendingExaminationRequestsCount = medicalExaminationRepository.countByDoctorAndEtat(currentDoctor, "EN_ATTENTE"); // Ou le statut approprié pour les demandes en attente

        // Calculer unreadExaminationResultsCount (examens terminés non cachés pour le médecin prescripteur)
        long unreadExaminationResultsCount = medicalExaminationRepository.countByDoctorAndEtatAndHiddenForPrescribingDoctorIsFalse(currentDoctor, "Terminé");
        
        // Calculer appointmentCompletionRate
        long completedAppointments = rendezVousRepository.countByDoctorAndCabinetAndApptState(currentDoctor, currentCabinet, "réalisé"); // Assumed "réalisé" to match DB
        long acceptedAndCompletedAppointments = todaysAcceptedAppointments + completedAppointments; // This is a daily/overall rate based on current logic
        double appointmentCompletionRate = (acceptedAndCompletedAppointments > 0) ? ((double) completedAppointments / acceptedAndCompletedAppointments) * 100 : 0.0;

        // Calculate weekly completion rate
        LocalDateTime startOfWeek = today.with(java.time.DayOfWeek.MONDAY).atStartOfDay();
        LocalDateTime endOfWeek = today.with(java.time.DayOfWeek.SUNDAY).plusDays(1).atStartOfDay();

        long acceptedAppointmentsWeek = rendezVousRepository.countByDoctorAndCabinetAndApptStateAndApptDateTimeBetween(
                currentDoctor, currentCabinet, "accepté", startOfWeek, endOfWeek); // Match database string "accepté"
        long realizedAppointmentsWeek = rendezVousRepository.countByDoctorAndCabinetAndApptStateAndApptDateTimeBetween(
                currentDoctor, currentCabinet, "réalisé", startOfWeek, endOfWeek); // Match database string "réalisé"
        double appointmentCompletionRateWeek = (acceptedAppointmentsWeek > 0) ? ((double) realizedAppointmentsWeek / acceptedAppointmentsWeek) * 100 : 0.0;

        // Calculate monthly completion rate
        LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime endOfMonth = today.withDayOfMonth(today.lengthOfMonth()).plusDays(1).atStartOfDay();

        // long acceptedAppointmentsMonth = rendezVousRepository.countByDoctorAndCabinetAndApptStateAndApptDateTimeBetween(
        //     currentDoctor, currentCabinet, RendezVousStatus.ACCEPTE.name(), startOfMonth, endOfMonth); // Not needed for current DTO
        long realizedAppointmentsMonth = rendezVousRepository.countByCabinetAndApptDateTimeBetweenAndApptState(
            currentCabinet, startOfMonth, endOfMonth, "réalisé"); // Corrected parameter order
        // double appointmentCompletionRateMonth = (acceptedAppointmentsMonth > 0) ? ((double) realizedAppointmentsMonth / acceptedAppointmentsMonth) * 100 : 0.0; // This was for the rate

        // Calculer pendingPatientRegistrationsCount
        long pendingPatientRegistrationsCount = userCabinetRegistrationRepository.countByCabinetAndIsActiveAndUser_Role(currentCabinet, false, Role.PATIENT);

        // Nouveaux patients ce mois-ci dans le cabinet
        // Assumes UserCabinetRegistration has registrationDate and User has role
        // We need a method like countByCabinetAndUserRoleAndRegistrationDateBetween
        long newPatientsThisMonthInCabinet = userCabinetRegistrationRepository.countByCabinetAndUser_RoleAndRegistrationDateBetween(
            currentCabinet, Role.PATIENT, startOfMonth.toLocalDate(), endOfMonth.toLocalDate().minusDays(1) // endOfMonth is exclusive start of next day
        );


        return new DoctorStatisticsDTO(todaysAcceptedAppointments, todaysConsultationsRealized, totalPatientsInCabinet, upcomingAppointmentsToday,
                                       pendingConfirmationAppointmentsCount, pendingExaminationRequestsCount, unreadExaminationResultsCount, appointmentCompletionRate,
                                       newPatientsThisMonthInCabinet, realizedAppointmentsMonth, pendingPatientRegistrationsCount);
    }

    @Override
    public PatientStatisticsDTO getPatientDashboardStatistics(Long patientId, Long cabinetId) {
        if (patientId == null || cabinetId == null) {
            return new PatientStatisticsDTO(0, 0, null, Collections.emptyList(), 0, 0, null);
        }

        User userPatient = userRepository.findById(patientId).orElse(null);
        if (userPatient == null || !(userPatient instanceof Patient)) {
             return new PatientStatisticsDTO(0, 0, null, Collections.emptyList(), 0, 0, null);
        }
        Patient currentPatient = (Patient) userPatient;

        CabinetDr currentCabinet = cabinetRepository.findById(cabinetId).orElse(null);
        if (currentCabinet == null) {
            return new PatientStatisticsDTO(0, 0, null, Collections.emptyList(), 0, 0, null); // Cabinet not found
        }

        long totalConsultations = consultationRepository.countByPatientAndCabinet(currentPatient, currentCabinet);
        long totalExams = medicalExaminationRepository.countByPatient(currentPatient);

        LocalDateTime now = LocalDateTime.now();

        Optional<RendezVous> nextRvOptional = rendezVousRepository
            .findFirstByPatientAndCabinetAndApptDateTimeGreaterThanEqualAndApptStateOrderByApptDateTimeAsc(
                currentPatient, currentCabinet, now, "accepté"); // Match database string

        // If no appointment found in the specific cabinet, try finding one across all cabinets for the patient
        if (!nextRvOptional.isPresent()) {
            nextRvOptional = rendezVousRepository
                .findFirstByPatientAndApptDateTimeGreaterThanEqualAndApptStateOrderByApptDateTimeAsc(
                    currentPatient, now, "accepté"); // Match database string
        }

        AppointmentReminderDTO nextAcceptedAppointment = null;
        if (nextRvOptional.isPresent()) {
            RendezVous nextRv = nextRvOptional.get();
            // Ensure essential details are present to create the DTO
            // Ensure essential details are present to create the DTO, primarily the appointment time.
            // Doctor and Cabinet can have placeholders if not available.
            if (nextRv.getApptDateTime() != null) {
                Doctor appointmentDoctor = nextRv.getDoctor();
                String doctorName = "Médecin non spécifié";

                if (appointmentDoctor != null && appointmentDoctor.getFirstName() != null && appointmentDoctor.getLastName() != null) {
                    doctorName = appointmentDoctor.getFirstName() + " " + appointmentDoctor.getLastName();
                } else if (nextRv.getCabinet() != null) {
                    // If direct doctor link is missing/incomplete, try to find doctor via cabinet
                    Optional<Doctor> cabinetDoctorOpt = userRepository.findDoctorByCabinet(nextRv.getCabinet());
                    if (cabinetDoctorOpt.isPresent()) {
                        Doctor cabinetDoctor = cabinetDoctorOpt.get();
                        if (cabinetDoctor.getFirstName() != null && cabinetDoctor.getLastName() != null) {
                            doctorName = cabinetDoctor.getFirstName() + " " + cabinetDoctor.getLastName();
                        }
                    }
                }

                String cabinetName = (nextRv.getCabinet() != null && nextRv.getCabinet().getName() != null)
                                     ? nextRv.getCabinet().getName()
                                     : "Cabinet non spécifié";

                nextAcceptedAppointment = new AppointmentReminderDTO(
                    nextRv.getIdAppointment(),
                    nextRv.getApptDateTime().toLocalDate(),
                    nextRv.getApptDateTime().toLocalTime().toString(),
                    doctorName,
                    cabinetName
                );
            }
        }

        List<RecentActivityDTO> recentActivity = new ArrayList<>(); // Logique à implémenter
        
        // Calculer pendingAppointmentsCount
        long pendingAppointmentsCount = rendezVousRepository.countByPatientAndCabinetAndApptState(currentPatient, currentCabinet, "en attente"); // Match database string

        // Calculer availableCertificatesCount
        long availableCertificatesCount = certificateRepository.countByConsultation_PatientAndConsultation_Cabinet(currentPatient, currentCabinet);

        // Trouver le prochain RDV refusé avec proposition
        Optional<RendezVous> nextRefusedWithProposalOpt = rendezVousRepository
            .findFirstByPatientAndCabinetAndApptStateAndApptProposedDateTimeNotNullOrderByApptProposedDateTimeAsc(
                currentPatient, currentCabinet, "refusé"); // Assumed "refusé"

        AppointmentReminderDTO nextRefusedAppointmentWithProposal = null;
        if (nextRefusedWithProposalOpt.isPresent()) {
            RendezVous refusedRv = nextRefusedWithProposalOpt.get();
            if (refusedRv.getApptProposedDateTime() != null) { // Double check, though query implies NotNull
                Doctor refusedDoctor = refusedRv.getDoctor();
                String refusedDoctorName = "Médecin non spécifié";
                if (refusedDoctor != null && refusedDoctor.getFirstName() != null && refusedDoctor.getLastName() != null) {
                    refusedDoctorName = refusedDoctor.getFirstName() + " " + refusedDoctor.getLastName();
                }
                // Cabinet name is already known from currentCabinet or can be from refusedRv.getCabinet()
                String refusedCabinetName = (refusedRv.getCabinet() != null && refusedRv.getCabinet().getName() != null)
                                     ? refusedRv.getCabinet().getName()
                                     : "Cabinet non spécifié";

                nextRefusedAppointmentWithProposal = new AppointmentReminderDTO(
                    refusedRv.getIdAppointment(),
                    refusedRv.getApptProposedDateTime().toLocalDate(),
                    refusedRv.getApptProposedDateTime().toLocalTime().toString(),
                    refusedDoctorName,
                    refusedCabinetName
                );
            }
        }

        return new PatientStatisticsDTO(totalConsultations, totalExams, nextAcceptedAppointment, recentActivity, pendingAppointmentsCount, availableCertificatesCount, nextRefusedAppointmentWithProposal);
    }

    @Override
    public DoctorCentreStatisticsDTO getDoctorCentreDashboardStatistics(Long doctorCentreId) {
        if (doctorCentreId == null) {
            return new DoctorCentreStatisticsDTO(0, "N/A", 0, Collections.emptyList());
        }

        DoctorCentreDexamen doctorCentreUser = doctorCentreDexamenRepository.findById(doctorCentreId).orElse(null);
        if (doctorCentreUser == null || doctorCentreUser.getCentreDexamen() == null) {
            // Si l'utilisateur docteur du centre ou son centre associé n'est pas trouvé, retourner des stats vides.
            return new DoctorCentreStatisticsDTO(0, "N/A", 0, Collections.emptyList());
        }

        String centreName = doctorCentreUser.getCentreDexamen().getName();
        if (centreName == null || centreName.isEmpty()) {
            // Si le nom du centre est invalide, retourner des stats vides.
            return new DoctorCentreStatisticsDTO(0, "N/A", 0, Collections.emptyList());
        }

        LocalDate today = LocalDate.now();
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDateTime endOfToday = today.plusDays(1).atStartOfDay();
        Date startDate = Date.from(startOfToday.atZone(ZoneId.systemDefault()).toInstant());
        Date endDate = Date.from(endOfToday.atZone(ZoneId.systemDefault()).toInstant());

        // Utiliser centreName pour filtrer les examens
        long examsPerformedTodayCount = medicalExaminationRepository.countByCentreNameAndEtatAndUpdatedAtBetween(centreName, "terminé", startDate, endDate);
        long pendingExamsCount = medicalExaminationRepository.countByCentreNameAndEtat(centreName, "en attente");
        
        // Pour l'instant, averageExamProcessingTime est un placeholder
        String averageExamProcessingTime = "N/A";

        // Utiliser centreName pour filtrer les examens à venir
        List<MedicalExamination> upcomingExams = medicalExaminationRepository.findByCentreNameAndEtatAndRendezVous_ApptDateTimeBetweenOrderByRendezVous_ApptDateTimeAsc(
            centreName, "en attente", startOfToday, endOfToday
        );

        List<SimpleAppointmentDTO> upcomingExamsToday = upcomingExams.stream()
            .filter(exam -> exam.getRendezVous() != null && exam.getRendezVous().getPatient() != null && exam.getRendezVous().getApptDateTime() != null)
            .map(exam -> new SimpleAppointmentDTO(
                exam.getIdExam(), // Ou exam.getRendezVous().getIdAppointment() si plus pertinent
                exam.getRendezVous().getPatient().getFirstName() + " " + exam.getRendezVous().getPatient().getLastName(),
                exam.getRendezVous().getApptDateTime().toLocalTime().toString()
            ))
            .collect(Collectors.toList());

        return new DoctorCentreStatisticsDTO(examsPerformedTodayCount, averageExamProcessingTime, pendingExamsCount, upcomingExamsToday);
    }

    @Override
    public AdminGlobalStatisticsDTO getAdminGlobalDashboardStatistics() {
        // Implémentation temporaire, les vrais calculs viendront ensuite
        long totalUsers = userRepository.count();
        long totalPatients = userRepository.countByRole(Role.PATIENT);
        long totalDoctors = userRepository.countByRole(Role.DOCTOR);
        long totalAssistants = userRepository.countByRole(Role.ASSISTANT);
        long totalDoctorCentres = userRepository.countByRole(Role.DOCTOR_CENTRE_EXAMEN); // Assumant que DOCTOR_CENTRE_EXAMEN est un rôle
        long totalCabinets = cabinetRepository.count();
        long totalExamCentres = centreDexamenRepository.count();

        LocalDate today = LocalDate.now();
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDateTime endOfToday = today.plusDays(1).atStartOfDay();
        Date todayDateForRepo = Date.from(startOfToday.atZone(ZoneId.systemDefault()).toInstant());
        Date tomorrowDateForRepo = Date.from(endOfToday.atZone(ZoneId.systemDefault()).toInstant());

        LocalDateTime startOfWeek = today.with(java.time.DayOfWeek.MONDAY).atStartOfDay();
        LocalDateTime endOfWeek = today.with(java.time.DayOfWeek.SUNDAY).plusDays(1).atStartOfDay();
        Date startOfWeekDateForRepo = Date.from(startOfWeek.atZone(ZoneId.systemDefault()).toInstant());
        Date endOfWeekDateForRepo = Date.from(endOfWeek.atZone(ZoneId.systemDefault()).toInstant());

        LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime endOfMonth = today.withDayOfMonth(today.lengthOfMonth()).plusDays(1).atStartOfDay();
        Date startOfMonthDateForRepo = Date.from(startOfMonth.atZone(ZoneId.systemDefault()).toInstant());
        Date endOfMonthDateForRepo = Date.from(endOfMonth.atZone(ZoneId.systemDefault()).toInstant());

        // User statistics (User entity has createdAt as LocalDate)
        // long newUsersThisWeek = userRepository.countByCreatedAtBetween(startOfWeek.toLocalDate(), endOfWeek.toLocalDate().minusDays(1)); // Supprimé
        long newUsersThisMonth = userRepository.countByCreatedAtBetween(startOfMonth.toLocalDate(), endOfMonth.toLocalDate().minusDays(1)); // endOfMonth is exclusive start of next day

        // Appointment statistics (assuming RendezVous entity has a createdAt field of type LocalDateTime)
        // long appointmentsToday = rendezVousRepository.countByCreatedAtBetween(startOfToday, endOfToday); // Supprimé
        // long appointmentsThisWeek = rendezVousRepository.countByCreatedAtBetween(startOfWeek, endOfWeek); // Supprimé
        long appointmentsThisMonth = rendezVousRepository.countByCreatedAtBetween(startOfMonth, endOfMonth);

        // Consultation statistics (Consultation entity has dateConsultation of type Date)
        // long consultationsToday = consultationRepository.countByDateConsultationBetween(todayDateForRepo, tomorrowDateForRepo); // Supprimé
        // long consultationsThisWeek = consultationRepository.countByDateConsultationBetween(startOfWeekDateForRepo, endOfWeekDateForRepo); // Supprimé
        long consultationsThisMonth = consultationRepository.countByDateConsultationBetween(startOfMonthDateForRepo, endOfMonthDateForRepo);

        // Medical Examination statistics (assuming MedicalExamination entity has a createdAt field of type LocalDateTime)
        // long examsToday = medicalExaminationRepository.countByCreatedAtBetween(startOfToday, endOfToday); // Supprimé
        // long examsThisWeek = medicalExaminationRepository.countByCreatedAtBetween(startOfWeek, endOfWeek); // Supprimé
        long examsThisMonth = medicalExaminationRepository.countByCreatedAtBetween(startOfMonth, endOfMonth);
        long medicalReportsGeneratedThisMonth = medicalExaminationRepository.countByResultatIsNotNullAndResultatNotAndUpdatedAtBetween("", startOfMonth, endOfMonth);
        
        return new AdminGlobalStatisticsDTO(
            totalUsers, totalPatients, totalDoctors, totalAssistants, totalDoctorCentres,
            totalCabinets, totalExamCentres, newUsersThisMonth,
            appointmentsThisMonth, consultationsThisMonth, examsThisMonth, medicalReportsGeneratedThisMonth
        );
    }

    @Override
    public List<pi.pperformance.elite.dto.MonthlyStatDTO> getPatientConsultationsPerMonth(Long patientId, Long cabinetId) {
        if (patientId == null || cabinetId == null) {
            return Collections.emptyList();
        }
        // Calculate the date 12 months ago to limit the query
        LocalDate today = LocalDate.now();
        LocalDateTime twelveMonthsAgoDateTime = today.minusMonths(12).withDayOfMonth(1).atStartOfDay();
        Date twelveMonthsAgoDate = Date.from(twelveMonthsAgoDateTime.atZone(ZoneId.systemDefault()).toInstant());

        return consultationRepository.countConsultationsByMonthForPatientAndCabinet(patientId, cabinetId, twelveMonthsAgoDate);
    }

    @Override
    public List<pi.pperformance.elite.dto.MonthlyStatDTO> getPatientExamsPerMonth(Long patientId, Long cabinetId) {
        if (patientId == null || cabinetId == null) {
            return Collections.emptyList();
        }
        // Calculate the date 12 months ago to limit the query
        LocalDate today = LocalDate.now();
        LocalDateTime twelveMonthsAgoDateTime = today.minusMonths(12).withDayOfMonth(1).atStartOfDay();
        // The repository method for exams expects LocalDateTime for startDate
        return medicalExaminationRepository.countExamsByMonthForPatientAndCabinet(patientId, cabinetId, twelveMonthsAgoDateTime);
    }

    @Override
    public AssistantStatisticsDTO getAssistantDashboardStatistics(Long assistantId, Long cabinetId) {
        if (assistantId == null || cabinetId == null) {
            return new AssistantStatisticsDTO(0, 0, 0, 0, 0, 0);
        }

        User assistantUser = userRepository.findById(assistantId).orElse(null);
        if (assistantUser == null || !(assistantUser instanceof Assistant)) {
            return new AssistantStatisticsDTO(0, 0, 0, 0, 0, 0);
        }

        CabinetDr currentCabinet = cabinetRepository.findById(cabinetId).orElse(null);
        if (currentCabinet == null) {
            return new AssistantStatisticsDTO(0, 0, 0, 0, 0, 0); // Cabinet not found
        }

        LocalDate today = LocalDate.now();
        LocalDateTime startOfTodayLdt = today.atStartOfDay();
        LocalDateTime endOfTodayLdt = today.plusDays(1).atStartOfDay();
        Date startOfTodayDate = Date.from(startOfTodayLdt.atZone(ZoneId.systemDefault()).toInstant());
        Date endOfTodayDate = Date.from(endOfTodayLdt.atZone(ZoneId.systemDefault()).toInstant());


        // RDV Acceptés Aujourd'hui pour le cabinet
        long todaysAcceptedAppointments = rendezVousRepository.countByCabinetAndApptDateTimeBetweenAndApptState(
                currentCabinet, startOfTodayLdt, endOfTodayLdt, "accepté");

        // RDV à confirmer pour le cabinet
        long pendingConfirmationAppointmentsCount = rendezVousRepository.countByCabinet_IdSiteAndApptState(cabinetId, "en attente"); // Match database string

        // Inscriptions de Patients en Attente pour le cabinet
        long pendingPatientRegistrationsCount = userCabinetRegistrationRepository.countByCabinetAndIsActiveAndUser_Role(currentCabinet, false, Role.PATIENT);
        
        // Total patients in cabinet
        long totalPatientsInCabinet = userCabinetRegistrationRepository.countByCabinetAndIsActive(currentCabinet, true);

        // Patients activés aujourd'hui dans le cabinet (i.e., enregistrés aujourd'hui et actifs)
        long patientsActivatedTodayInCabinet = userCabinetRegistrationRepository.countByCabinetAndIsActiveTrueAndRegistrationDate(currentCabinet, today);

        // Nouveaux utilisateurs (patients) liés au cabinet et créés aujourd'hui
        // This counts patients registered to this cabinet and whose User account was created today.
        long newPatientsTodayInCabinet = userCabinetRegistrationRepository.countByCabinetAndUser_CreatedAt(currentCabinet, today);
        
        // Nouveaux utilisateurs (assistants) liés au cabinet et créés aujourd'hui
        // Assumes Assistant entity has 'cabinet' and User (parent) has 'createdAt'
        // And a method countByCabinetAndCreatedAt exists in UserRepository for Assistants
        long newAssistantsTodayInCabinet = userRepository.countAssistantsByCabinetAndCreatedAt(currentCabinet, today);

        long newUsersTodayInCabinet = newPatientsTodayInCabinet + newAssistantsTodayInCabinet;


        return new AssistantStatisticsDTO(
            todaysAcceptedAppointments,
            pendingConfirmationAppointmentsCount,
            pendingPatientRegistrationsCount,
            totalPatientsInCabinet,
            patientsActivatedTodayInCabinet,
            newUsersTodayInCabinet
        );
    }
}
