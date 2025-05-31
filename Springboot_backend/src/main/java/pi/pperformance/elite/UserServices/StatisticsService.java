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
import pi.pperformance.elite.dto.AppointmentDistributionDTO; // Import the new DTO
import pi.pperformance.elite.dto.MonthlyStatDTO; // Import MonthlyStatDTO
import pi.pperformance.elite.dto.MonthlyReportStatsDTO; // Import MonthlyReportStatsDTO
import pi.pperformance.elite.dto.ReportTypeStatsDTO; // Import ReportTypeStatsDTO
import pi.pperformance.elite.dto.AdminCentreStatisticsDTO; // Import AdminCentreStatisticsDTO
import pi.pperformance.elite.dto.AdminCentreTileStatsDTO; // Ensure import is present
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
        // Calculate total appointments this month in the cabinet (regardless of state)
        long totalAppointmentsThisMonthInCabinet = rendezVousRepository.countByCabinetAndApptDateTimeBetween(
            currentCabinet, startOfMonth, endOfMonth);
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
                                       newPatientsThisMonthInCabinet, totalAppointmentsThisMonthInCabinet, pendingPatientRegistrationsCount);
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
            // Assuming the constructor is DoctorCentreStatisticsDTO(long, String, long, List, long, List, List)
            return new DoctorCentreStatisticsDTO(0, "N/A", 0, Collections.emptyList(), 0, Collections.emptyList(), Collections.emptyList());
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long authenticatedDoctorCentreId = userDetails.getId();

        if (!authenticatedDoctorCentreId.equals(doctorCentreId)) {
             // Return empty stats if the requested ID doesn't match the authenticated user's ID
             return new DoctorCentreStatisticsDTO(0, "N/A", 0, Collections.emptyList(), 0, Collections.emptyList(), Collections.emptyList());
        }


        DoctorCentreDexamen doctorCentreUser = doctorCentreDexamenRepository.findById(doctorCentreId).orElse(null);
        if (doctorCentreUser == null || doctorCentreUser.getCentreDexamen() == null) {
            // Si l'utilisateur docteur du centre ou son centre associé n'est pas trouvé, retourner des stats vides.
            return new DoctorCentreStatisticsDTO(0, "N/A", 0, Collections.emptyList(), 0, Collections.emptyList(), Collections.emptyList());
        }

        String centreName = doctorCentreUser.getCentreDexamen().getName();
        if (centreName == null || centreName.isEmpty()) {
            // Si le nom du centre est invalide, retourner des stats vides.
            return new DoctorCentreStatisticsDTO(0, "N/A", 0, Collections.emptyList(), 0, Collections.emptyList(), Collections.emptyList());
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

        // Calculate total reports count for the doctor centre in their centre
        long totalReportsCount = medicalExaminationRepository.countByDoctorCentreDexamenAndCentreNameAndResultatIsNotNullAndResultatNot(doctorCentreUser, centreName, "");

        // Fetch monthly report statistics for the doctor centre in their centre
        LocalDate todayForMonthly = LocalDate.now();
        LocalDateTime twelveMonthsAgoDateTime = todayForMonthly.minusMonths(12).withDayOfMonth(1).atStartOfDay();
        List<MonthlyReportStatsDTO> monthlyReportStats = medicalExaminationRepository.countReportsMonthlyByDoctorCentreAndCentre(doctorCentreUser, centreName, twelveMonthsAgoDateTime);

        // Fetch report type statistics for the doctor centre in their centre
        List<ReportTypeStatsDTO> reportTypeStats = medicalExaminationRepository.countReportsByTypeByDoctorCentreAndCentre(doctorCentreUser, centreName);


        // Return the DTO with all calculated statistics
        return new DoctorCentreStatisticsDTO(examsPerformedTodayCount, averageExamProcessingTime, pendingExamsCount, upcomingExamsToday,
                                             totalReportsCount, monthlyReportStats, reportTypeStats);
    }

    @Override
    public AdminGlobalStatisticsDTO getAdminGlobalDashboardStatistics() {
        // Implémentation pour les statistiques globales de l'administrateur
        long totalUsers = userRepository.count();
        long totalPatients = userRepository.countByRole(Role.PATIENT);
        long totalDoctors = userRepository.countByRole(Role.DOCTOR);
        long totalAssistants = userRepository.countByRole(Role.ASSISTANT);
        long totalDoctorCentres = userRepository.countByRole(Role.DOCTOR_CENTRE_EXAMEN); // Assumant que DOCTOR_CENTRE_EXAMEN est un rôle
        long totalCabinets = cabinetRepository.count();
        long totalExamCentres = centreDexamenRepository.count();

        LocalDate today = LocalDate.now();
        LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime endOfMonth = today.withDayOfMonth(today.lengthOfMonth()).plusDays(1).atStartOfDay();
        Date startOfMonthDateForRepo = Date.from(startOfMonth.atZone(ZoneId.systemDefault()).toInstant());
        Date endOfMonthDateForRepo = Date.from(endOfMonth.atZone(ZoneId.systemDefault()).toInstant());

        // User statistics (User entity has createdAt as LocalDate)
        long newUsersThisMonth = userRepository.countByCreatedAtBetween(startOfMonth.toLocalDate(), endOfMonth.toLocalDate().minusDays(1)); // endOfMonth is exclusive start of next day

        // Appointment statistics (assuming RendezVous entity has a createdAt field of type LocalDateTime)
        long appointmentsThisMonth = rendezVousRepository.countByCreatedAtBetween(startOfMonth, endOfMonth);

        // Consultation statistics (Consultation entity has dateConsultation of type Date)
        long consultationsThisMonth = consultationRepository.countByDateConsultationBetween(startOfMonthDateForRepo, endOfMonthDateForRepo);

        // Medical Examination statistics (assuming MedicalExamination entity has a createdAt field of type LocalDateTime)
        long examsThisMonth = medicalExaminationRepository.countByCreatedAtBetween(startOfMonth, endOfMonth);
        long medicalReportsGeneratedThisMonth = medicalExaminationRepository.countByResultatIsNotNullAndResultatNotAndUpdatedAtBetween("", startOfMonth, endOfMonth);

        // Fetch the total count of AdminCentreExamen users
        long totalAdminCentreCount = getTotalAdminCentreCount();

        return new AdminGlobalStatisticsDTO(
            totalUsers, totalPatients, totalDoctors, totalAssistants, totalDoctorCentres,
            totalCabinets, totalExamCentres, totalAdminCentreCount, // Added totalAdminCentreCount
            newUsersThisMonth, appointmentsThisMonth, consultationsThisMonth, examsThisMonth, medicalReportsGeneratedThisMonth
        );
    }

    @Override
    public List<MonthlyStatDTO> getPatientConsultationsPerMonth(Long patientId, Long cabinetId) {
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
    public List<MonthlyStatDTO> getPatientExamsPerMonth(Long patientId, Long cabinetId) {
        if (patientId == null || cabinetId == null) {
            return Collections.emptyList();
        }
        // Calculate the date 12 months ago to limit the query
        LocalDate today = LocalDate.now();
        LocalDateTime twelveMonthsAgoDateTime = today.minusMonths(12).withDayOfMonth(1).atStartOfDay();
        // The repository method for exams expects LocalDateTime for startDate
        return medicalExaminationRepository.countExamsByMonthForPatientAndCabinet(patientId, cabinetId, twelveMonthsAgoDateTime);
    }

    // --- Start of Doctor Centre Statistics Methods ---

    @Override
    public List<MonthlyReportStatsDTO> getDoctorCentreReportsPerMonth(Long doctorCentreId, Long centreId) {
        // We only need doctorCentreId for filtering reports written by this doctor centre user.
        // The centreId is not needed for this specific report statistic based on the database structure.
        DoctorCentreDexamen doctorCentreUser = doctorCentreDexamenRepository.findById(doctorCentreId).orElse(null);
        if (doctorCentreUser == null) {
            return Collections.emptyList();
        }
        LocalDate today = LocalDate.now();
        LocalDateTime twelveMonthsAgoDateTime = today.minusMonths(12).withDayOfMonth(1).atStartOfDay();
        // Use the repository method that filters by doctorCentreDexamen and checks for non-empty result
        return medicalExaminationRepository.countReportsMonthlyByDoctorCentreAndResultatIsNotNullAndResultatNot(doctorCentreUser, twelveMonthsAgoDateTime);
    }

    @Override
    public List<ReportTypeStatsDTO> getDoctorCentreReportsByType(Long doctorCentreId, Long centreId) {
        // We only need doctorCentreId for filtering reports written by this doctor centre user.
        // The centreId is not needed for this specific report statistic based on the database structure.
        DoctorCentreDexamen doctorCentreUser = doctorCentreDexamenRepository.findById(doctorCentreId).orElse(null);
         if (doctorCentreUser == null) {
            return Collections.emptyList();
        }
        // Use the repository method that filters by doctorCentreDexamen and checks for non-empty result
        return medicalExaminationRepository.countReportsByTypeByDoctorCentreAndResultatIsNotNullAndResultatNot(doctorCentreUser);
    }

    // --- End of Doctor Centre Statistics Methods ---


    @Override
    public AssistantStatisticsDTO getAssistantDashboardStatistics(Long assistantId, Long cabinetId) {
        if (assistantId == null || cabinetId == null) {
            return new AssistantStatisticsDTO(0, 0, 0, 0, 0, 0);
        }
        User assistantUser = userRepository.findById(assistantId).orElse(null);
        if (assistantUser == null || !(assistantUser instanceof Assistant)) {
             return new AssistantStatisticsDTO(0, 0, 0, 0, 0, 0);
        }
        Assistant currentAssistant = (Assistant) assistantUser;

        CabinetDr currentCabinet = cabinetRepository.findById(cabinetId).orElse(null);
        if (currentCabinet == null) {
            return new AssistantStatisticsDTO(0, 0, 0, 0, 0, 0); // Cabinet not found
        }

        LocalDate today = LocalDate.now();
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDateTime endOfToday = today.plusDays(1).atStartOfDay();

        // Count appointments for today in the assistant's cabinet
        long todaysAppointmentsCount = rendezVousRepository.countByCabinetAndApptDateTimeBetween(currentCabinet, startOfToday, endOfToday);

        // Count pending appointments in the assistant's cabinet
        long pendingConfirmationAppointmentsCount = rendezVousRepository.countByCabinet_IdSiteAndApptState(cabinetId, "en attente"); // Match database string

        // Count total patients registered in the assistant's cabinet
        long totalPatientsInCabinet = userCabinetRegistrationRepository.countByCabinetAndIsActive(currentCabinet, true);

        // Count pending patient registrations in the assistant's cabinet
        long pendingPatientRegistrationsCount = userCabinetRegistrationRepository.countByCabinetAndIsActiveAndUser_Role(currentCabinet, false, Role.PATIENT);

        // Count total doctors associated with the cabinet (assuming UserCabinetRegistration links doctors to cabinets)
        long totalDoctorsInCabinet = userCabinetRegistrationRepository.countByCabinetAndIsActiveAndUser_Role(currentCabinet, true, Role.DOCTOR);

        // Count total examinations performed in the cabinet (assuming MedicalExamination has a link to Cabinet or CentreDexamen linked to Cabinet)
        // This might need adjustment based on how exams are linked to cabinets/centres
        // long totalExamsInCabinet = medicalExaminationRepository.countByCabinetId(cabinetId); // Assuming a method like this exists or can be added

        return new AssistantStatisticsDTO(
            todaysAppointmentsCount,
            pendingConfirmationAppointmentsCount,
            totalPatientsInCabinet,
            pendingPatientRegistrationsCount,
            totalDoctorsInCabinet,
            0 // Temporarily set totalExamsInCabinet to 0 to resolve compilation error
        );
    }

    @Override
    public AppointmentDistributionDTO getDoctorAppointmentDistributionByMonth(Long cabinetId, Integer year, Integer month) {
        if (cabinetId == null || year == null || month == null) {
            return new AppointmentDistributionDTO(0, 0, 0);
        }

        // Calculate the start and end of the specified month
        LocalDate startOfMonth = LocalDate.of(year, month, 1);
        LocalDateTime startOfMonthDateTime = startOfMonth.atStartOfDay();
        LocalDateTime endOfMonthDateTime = startOfMonth.plusMonths(1).atStartOfDay();

        // Get counts for each status for the given month and cabinet
        long acceptedCount = rendezVousRepository.countByCabinet_IdSiteAndApptStateAndApptDateTimeBetween(
                cabinetId, RendezVousStatus.ACCEPTE.name(), startOfMonthDateTime, endOfMonthDateTime);
        long realizedCount = rendezVousRepository.countByCabinet_IdSiteAndApptStateAndApptDateTimeBetween(
                cabinetId, RendezVousStatus.REALISE.name(), startOfMonthDateTime, endOfMonthDateTime);
        long refusedCount = rendezVousRepository.countByCabinet_IdSiteAndApptStateAndApptDateTimeBetween(
                cabinetId, RendezVousStatus.REFUSE.name(), startOfMonthDateTime, endOfMonthDateTime);

        return new AppointmentDistributionDTO(acceptedCount, realizedCount, refusedCount);
    }

    // Implement the new methods for Doctor graphs
    @Override
    public List<MonthlyStatDTO> getDoctorConsultationsPerMonth(Long doctorId, Long cabinetId) {
        if (doctorId == null || cabinetId == null) {
            return Collections.emptyList();
        }

        User userDoctor = userRepository.findById(doctorId).orElse(null);
        if (userDoctor == null || !(userDoctor instanceof Doctor)) {
             System.err.println("Doctor entity not found for ID: " + doctorId);
             return Collections.emptyList();
        }
        Doctor currentDoctor = (Doctor) userDoctor;

        CabinetDr currentCabinet = cabinetRepository.findById(cabinetId).orElse(null);
        if (currentCabinet == null) {
             System.err.println("Cabinet entity not found for ID: " + cabinetId);
             return Collections.emptyList();
        }

        // Calculate the date 12 months ago to limit the query
        LocalDate today = LocalDate.now();
        Date twelveMonthsAgoDate = Date.from(today.minusMonths(12).withDayOfMonth(1).atStartOfDay(ZoneId.systemDefault()).toInstant());

        return consultationRepository.countConsultationsByMonthForDoctorAndCabinet(doctorId, cabinetId, twelveMonthsAgoDate);
    }

    @Override
    public List<MonthlyStatDTO> getDoctorPatientsPerMonth(Long doctorId, Long cabinetId) {
        if (doctorId == null || cabinetId == null) {
            return Collections.emptyList();
        }

        // Although doctorId is passed, the patient count is per cabinet, so we only strictly need cabinetId here.
        // However, keeping doctorId in the signature aligns with the consultation method and controller endpoint.

        CabinetDr currentCabinet = cabinetRepository.findById(cabinetId).orElse(null);
        if (currentCabinet == null) {
             System.err.println("Cabinet entity not found for ID: " + cabinetId);
             return Collections.emptyList();
        }

        // Calculate the date 12 months ago to limit the query
        LocalDate today = LocalDate.now();
        LocalDate twelveMonthsAgoDate = today.minusMonths(12).withDayOfMonth(1);

        // Note: The repository method expects LocalDate for startDate
        return userCabinetRegistrationRepository.countActivePatientRegistrationsByMonthForCabinet(cabinetId, twelveMonthsAgoDate);
    }

    // Implement the new methods for Admin global graphs
    @Override
    public List<MonthlyStatDTO> getGlobalConsultationsPerMonth() {
        // Calculate the date 12 months ago to limit the query
        LocalDate today = LocalDate.now();
        Date twelveMonthsAgoDate = Date.from(today.minusMonths(12).withDayOfMonth(1).atStartOfDay(ZoneId.systemDefault()).toInstant());

        return consultationRepository.countGlobalConsultationsByMonth(twelveMonthsAgoDate);
    }

    @Override
    public List<MonthlyStatDTO> getGlobalExamsPerMonth() {
        // Implement real logic to fetch global exams per month
        // This requires a method in MedicalExaminationRepository
        // Calculate the date 12 months ago to limit the query
        LocalDate today = LocalDate.now();
        LocalDateTime twelveMonthsAgoDateTime = today.minusMonths(12).withDayOfMonth(1).atStartOfDay();
        return medicalExaminationRepository.countGlobalExamsByMonth(twelveMonthsAgoDateTime); // Corrected method name and added parameter
    }

    @Override
    public List<MonthlyStatDTO> getGlobalPatientsPerMonth() {
        // Implement real logic to fetch global active patient registrations per month
        // This requires a method in UserCabinetRegistrationRepository
        // Calculate the date 12 months ago to limit the query
        LocalDate today = LocalDate.now();
        LocalDate twelveMonthsAgoDate = today.minusMonths(12).withDayOfMonth(1);
        return userCabinetRegistrationRepository.countGlobalActivePatientRegistrationsByMonth(twelveMonthsAgoDate); // Added parameter
    }

    @Override
    public AdminCentreStatisticsDTO getAdminCentreDashboardStatistics(Long adminCentreId) {
        if (adminCentreId == null) {
            return new AdminCentreStatisticsDTO(0, 0, 0, 0);
        }

        User adminUser = userRepository.findById(adminCentreId).orElse(null);

        if (adminUser == null || !(adminUser instanceof AdminCentreExamen)) {
            System.err.println("AdminCentreExamen entity not found for user ID: " + adminCentreId);
            return new AdminCentreStatisticsDTO(0, 0, 0, 0);
        }

        AdminCentreExamen adminCentre = (AdminCentreExamen) adminUser;

        // Vérifier si l'administrateur est rattaché à un centre
        CentreDexamen associatedCentre = adminCentre.getCentreDexamen();
        if (associatedCentre == null || associatedCentre.getName() == null) {
            System.err.println("AdminCentreExamen with ID " + adminCentreId + " is not associated with a CentreDexamen or centre name is null.");
            return new AdminCentreStatisticsDTO(0, 0, 0, 0);
        }

        String centreName = associatedCentre.getName();
        Long centreId = associatedCentre.getIdCentre(); // Corrected method name

        LocalDate today = LocalDate.now();
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDateTime endOfToday = today.plusDays(1).atStartOfDay();
        Date startDateToday = Date.from(startOfToday.atZone(ZoneId.systemDefault()).toInstant());
        Date endDateToday = Date.from(endOfToday.atZone(ZoneId.systemDefault()).toInstant());

        // 1. Nombre d'examens réalisés aujourd'hui dans le centre
        // Assuming "Terminé" is the status for completed exams and updatedAt is the completion date
        long examsCompletedToday = medicalExaminationRepository.countByCentreNameAndEtatAndUpdatedAtBetween(centreName, "Terminé", startDateToday, endDateToday);

        // 2. Nombre d'examens en attente dans le centre
        // Assuming "EN_ATTENTE" is the status for pending exams
        long pendingExams = medicalExaminationRepository.countByCentreNameAndEtat(centreName, "EN_ATTENTE");

        // 3. Nombre total de rapports générés (dans le mois en cours) dans le centre
        // Reports are generated when resultat is not null/empty and exam status is "Terminé"
        // We need to count exams in this centre with a result generated this month
        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        LocalDateTime startOfMonthDateTime = startOfMonth.atStartOfDay();
        LocalDateTime endOfMonthDateTime = startOfMonth.plusMonths(1).atStartOfDay();

        long totalReportsGeneratedThisMonth = medicalExaminationRepository.countByCentreNameAndEtatAndResultatIsNotNullAndResultatNotAndUpdatedAtBetween(
            centreName, "Terminé", "", startOfMonthDateTime, endOfMonthDateTime
        );


        // 4. Nombre total des doctor_centre_examen dans le centre
        // Assuming DoctorCentreDexamen entity has a link to CentreDexamen
        long totalDoctorCentresInCentre = doctorCentreDexamenRepository.countByCentreDexamen_IdCentre(associatedCentre.getIdCentre()); // Corrected method call


        return new AdminCentreStatisticsDTO(
            examsCompletedToday,
            pendingExams,
            totalReportsGeneratedThisMonth,
            totalDoctorCentresInCentre
        );
    }

    @Override
    public List<CenterDoctorStatDTO> getAdminCentreExamStatsByDoctor(Long adminCentreId, Integer year, Integer month) {
        // 1. Récupérer l'entité AdminCentreExamen
        User adminUser = userRepository.findById(adminCentreId).orElse(null);

        if (adminUser == null || !(adminUser instanceof AdminCentreExamen)) {
            System.err.println("AdminCentreExamen entity not found for user ID: " + adminCentreId);
            return new ArrayList<>();
        }

        AdminCentreExamen adminCentre = (AdminCentreExamen) adminUser;

        // 2. Vérifier si l'administrateur est rattaché à un centre
        CentreDexamen associatedCentre = adminCentre.getCentreDexamen();
        if (associatedCentre == null || associatedCentre.getName() == null) {
            System.err.println("AdminCentreExamen with ID " + adminCentreId + " is not associated with a CentreDexamen or centre name is null.");
            return new ArrayList<>();
        }

        String centreName = associatedCentre.getName();

        // 3. Récupérer les examens terminés pour ce centre, filtrés par date
        List<MedicalExamination> completedExaminations = medicalExaminationRepository.findCompletedByCentreNameAndDate(centreName, year, month);

        System.out.println("DEBUG: Found " + completedExaminations.size() + " completed examinations for centre " + centreName + " in " + (month != null ? month + "/" : "") + (year != null ? year : "any year"));

        // 4. Regrouper par médecin prescripteur et compter
        Map<String, Map<String, Long>> statsByDoctorAndCabinet = completedExaminations.stream()
            .filter(exam -> exam.getDoctor() != null) // S'assurer qu'il y a un médecin prescripteur
            .collect(Collectors.groupingBy(
                exam -> exam.getDoctor().getFirstName() + " " + exam.getDoctor().getLastName(), // Clé: Nom du médecin
                Collectors.groupingBy(
                    exam -> exam.getDoctor().getCabinet() != null ? exam.getDoctor().getCabinet().getName() : "N/A", // Clé interne: Nom du cabinet ou "N/A"
                    Collectors.counting() // Valeur: Nombre d'examens
                )
            ));

        // 5. Mapper les résultats à une liste de CenterDoctorStatDTO
        List<CenterDoctorStatDTO> result = new ArrayList<>();
        statsByDoctorAndCabinet.forEach((doctorName, cabinetMap) -> {
            cabinetMap.forEach((cabinetName, count) -> {
                result.add(new CenterDoctorStatDTO(doctorName, cabinetName.equals("N/A") ? null : cabinetName, count));
            });
        });

        // Optionnel: Trier les résultats
        result.sort(Comparator.comparing(CenterDoctorStatDTO::getPrescribingDoctorName)
                               .thenComparing(CenterDoctorStatDTO::getPrescribingDoctorCabinetName, Comparator.nullsLast(String::compareTo)));

        return result;
    }

    @Override
    public List<CenterDoctorStatDTO> getAdminCentreExamStatsByDoctorCentre(Long adminCentreId, Integer year, Integer month) {
        // 1. Récupérer l'entité AdminCentreExamen
        User adminUser = userRepository.findById(adminCentreId).orElse(null);

        if (adminUser == null || !(adminUser instanceof AdminCentreExamen)) {
            System.err.println("AdminCentreExamen entity not found for user ID: " + adminCentreId);
            return new ArrayList<>();
        }

        AdminCentreExamen adminCentre = (AdminCentreExamen) adminUser;

        // 2. Vérifier si l'administrateur est rattaché à un centre
        CentreDexamen associatedCentre = adminCentre.getCentreDexamen();
        if (associatedCentre == null || associatedCentre.getName() == null) {
            System.err.println("AdminCentreExamen with ID " + adminCentreId + " is not associated with a CentreDexamen or centre name is null.");
            return new ArrayList<>();
        }

        String centreName = associatedCentre.getName();

        // 3. Récupérer les examens terminés pour ce centre, filtrés par date
        List<MedicalExamination> completedExaminations = medicalExaminationRepository.findCompletedByCentreNameAndDate(centreName, year, month);

        System.out.println("DEBUG: Found " + completedExaminations.size() + " completed examinations for centre " + centreName + " in " + (month != null ? month + "/" : "") + (year != null ? year : "any year"));

        // 4. Regrouper par doctor_centre_examen et compter
        Map<String, Long> statsByDoctorCentre = completedExaminations.stream()
            .filter(exam -> exam.getDoctorCentreDexamen() != null) // S'assurer qu'il y a un doctor_centre_examen
            .collect(Collectors.groupingBy(
                exam -> exam.getDoctorCentreDexamen().getFirstName() + " " + exam.getDoctorCentreDexamen().getLastName(), // Clé: Nom du doctor_centre_examen
                Collectors.counting() // Valeur: Nombre d'examens
            ));

        // 5. Mapper les résultats à une liste de CenterDoctorStatDTO
        // On réutilise CenterDoctorStatDTO, en mettant le nom du doctor_centre_examen dans prescribingDoctorName
        List<CenterDoctorStatDTO> result = new ArrayList<>();
        statsByDoctorCentre.forEach((doctorCentreName, count) -> {
            result.add(new CenterDoctorStatDTO(doctorCentreName, null, count)); // cabinetName est null car non pertinent ici
        });

        // Optionnel: Trier les résultats
        result.sort(Comparator.comparing(CenterDoctorStatDTO::getPrescribingDoctorName));

        return result;
    }


    @Override
    public List<ReportTypeStatsDTO> getAdminCentreExamStatsByType(Long adminCentreId, Integer year, Integer month) {
        // 1. Récupérer l'entité AdminCentreExamen
        User adminUser = userRepository.findById(adminCentreId).orElse(null);

        if (adminUser == null || !(adminUser instanceof AdminCentreExamen)) {
            System.err.println("AdminCentreExamen entity not found for user ID: " + adminCentreId);
            return new ArrayList<>();
        }

        AdminCentreExamen adminCentre = (AdminCentreExamen) adminUser;

        // 2. Vérifier si l'administrateur est rattaché à un centre
        CentreDexamen associatedCentre = adminCentre.getCentreDexamen();
        if (associatedCentre == null || associatedCentre.getName() == null) {
            System.err.println("AdminCentreExamen with ID " + adminCentreId + " is not associated with a CentreDexamen or centre name is null.");
            return new ArrayList<>();
        }

        String centreName = associatedCentre.getName();

        // 3. Récupérer les examens terminés pour ce centre, filtrés par date
        List<MedicalExamination> completedExaminations = medicalExaminationRepository.findCompletedByCentreNameAndDate(centreName, year, month);

        System.out.println("DEBUG: Found " + completedExaminations.size() + " completed examinations for centre " + centreName + " in " + (month != null ? month + "/" : "") + (year != null ? year : "any year"));

        // 4. Regrouper par doctor_centre_examen et par type d'examen, puis compter
        Map<String, Map<String, Long>> statsByDoctorCentreAndExamType = completedExaminations.stream()
            .filter(exam -> exam.getDoctorCentreDexamen() != null && exam.getAct() != null && !exam.getAct().isEmpty()) // S'assurer qu'il y a un doctor_centre_examen et un type d'examen (act)
            .collect(Collectors.groupingBy(
                exam -> exam.getDoctorCentreDexamen().getFirstName() + " " + exam.getDoctorCentreDexamen().getLastName(), // Clé externe: Nom du doctor_centre_examen
                Collectors.groupingBy(
                    MedicalExamination::getAct, // Clé interne: Type d'examen (act)
                    Collectors.counting() // Valeur: Nombre d'examens de ce type par ce doctor_centre_examen
                )
            ));

        // 5. Mapper les résultats à une liste de ReportTypeStatsDTO (en adaptant le DTO si nécessaire, ou en créant un nouveau)
        // Comme précédemment, ReportTypeStatsDTO n'est pas idéal, mais je vais l'adapter en concaténant.
        List<ReportTypeStatsDTO> result = new ArrayList<>();
        statsByDoctorCentreAndExamType.forEach((doctorCentreName, examTypeMap) -> {
            examTypeMap.forEach((examType, count) -> {
                // Format: "Nom du DoctorCentreExamen - Type d'Examen"
                result.add(new ReportTypeStatsDTO(doctorCentreName + " - " + examType, count));
            });
        });

        // Optionnel: Trier les résultats
        // Assurez-vous que ReportTypeStatsDTO a une méthode getType() ou utilisez une autre approche de tri
        // Si ReportTypeStatsDTO a un champ 'type' et un constructeur ReportTypeStatsDTO(String type, Long count)
        // alors Comparator.comparing(ReportTypeStatsDTO::getType) devrait fonctionner.
        // Je vais supposer que ReportTypeStatsDTO a bien un getter getType().
        result.sort(Comparator.comparing(ReportTypeStatsDTO::getReportType)); // Correction ici

        return result;
    }

    @Override
    public List<ReportTypeStatsDTO> getAdminCentreExamDistributionByType(Long adminCentreId, Integer year, Integer month) {
        // 1. Récupérer l'entité AdminCentreExamen
        User adminUser = userRepository.findById(adminCentreId).orElse(null);

        if (adminUser == null || !(adminUser instanceof AdminCentreExamen)) {
            System.err.println("AdminCentreExamen entity not found for user ID: " + adminCentreId);
            return new ArrayList<>();
        }

        AdminCentreExamen adminCentre = (AdminCentreExamen) adminUser;

        // 2. Vérifier si l'administrateur est rattaché à un centre
        CentreDexamen associatedCentre = adminCentre.getCentreDexamen();
        if (associatedCentre == null || associatedCentre.getName() == null) {
            System.err.println("AdminCentreExamen with ID " + adminCentreId + " is not associated with a CentreDexamen or centre name is null.");
            return new ArrayList<>();
        }

        String centreName = associatedCentre.getName();

        // 3. Récupérer les examens terminés pour ce centre, filtrés par date
        List<MedicalExamination> completedExaminations = medicalExaminationRepository.findCompletedByCentreNameAndDate(centreName, year, month);

        System.out.println("DEBUG: Found " + completedExaminations.size() + " completed examinations for centre " + centreName + " in " + (month != null ? month + "/" : "") + (year != null ? year : "any year"));

        // 4. Regrouper par type d'examen (act) et compter
        Map<String, Long> statsByExamType = completedExaminations.stream()
            .filter(exam -> exam.getAct() != null && !exam.getAct().isEmpty()) // S'assurer qu'il y a un type d'examen (act)
            .collect(Collectors.groupingBy(
                MedicalExamination::getAct, // Clé: Type d'examen (act)
                Collectors.counting() // Valeur: Nombre total d'examens de ce type dans le centre
            ));

        // 5. Mapper les résultats à une liste de ReportTypeStatsDTO
        List<ReportTypeStatsDTO> result = new ArrayList<>();
        statsByExamType.forEach((examType, count) -> {
            result.add(new ReportTypeStatsDTO(examType, count));
        });

        // Optionnel: Trier les résultats
        // Assurez-vous que ReportTypeStatsDTO a une méthode getType() ou utilisez une autre approche de tri
        // Je vais supposer que ReportTypeStatsDTO a bien un getter getType().
        result.sort(Comparator.comparing(ReportTypeStatsDTO::getReportType)); // Correction ici

        return result;
    }


    @Override
    public AdminCentreTileStatsDTO getAdminCentreTileStats(Long centreId) {
        if (centreId == null) {
            return new AdminCentreTileStatsDTO(0L, 0L, 0L, 0L);
        }

        CentreDexamen associatedCentre = centreDexamenRepository.findById(centreId).orElse(null);

        if (associatedCentre == null || associatedCentre.getName() == null) {
            System.err.println("CentreDexamen with ID " + centreId + " not found or centre name is null.");
            return new AdminCentreTileStatsDTO(0L, 0L, 0L, 0L);
        }

        String centreName = associatedCentre.getName();

        LocalDate today = LocalDate.now();
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDateTime endOfToday = today.plusDays(1).atStartOfDay();
        Date startDateToday = Date.from(startOfToday.atZone(ZoneId.systemDefault()).toInstant());
        Date endDateToday = Date.from(endOfToday.atZone(ZoneId.systemDefault()).toInstant());

        // Nombre d'examens réalisés aujourd'hui dans le centre
        long dailyExaminationsCount = medicalExaminationRepository.countByCentreNameAndEtatAndUpdatedAtBetween(centreName, "Terminé", startDateToday, endDateToday);

        // Nombre d'examens en attente dans le centre
        long pendingExaminationsCount = medicalExaminationRepository.countByCentreNameAndEtat(centreName, "EN_ATTENTE");

        // Nombre total de rapports générés (dans le mois en cours) dans le centre
        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        LocalDateTime startOfMonthDateTime = startOfMonth.atStartOfDay();
        LocalDateTime endOfMonthDateTime = startOfMonth.plusMonths(1).atStartOfDay();

        long monthlyReportsCount = medicalExaminationRepository.countByCentreNameAndEtatAndResultatIsNotNullAndResultatNotAndUpdatedAtBetween(
            centreName, "Terminé", "", startOfMonthDateTime, endOfMonthDateTime
        );

        // Nombre total des doctor_centre_examen dans le centre
        long totalDoctorsCount = doctorCentreDexamenRepository.countByCentreDexamen_IdCentre(associatedCentre.getIdCentre()); // Corrected method call

        return new AdminCentreTileStatsDTO(
            dailyExaminationsCount,
            pendingExaminationsCount,
            monthlyReportsCount,
            totalDoctorsCount
        );
    }

    @Override
    public Long getTotalAdminCentreCount() {
        return userRepository.countByRole(Role.ADMIN_CENTRE_EXAMEN);
    }
}
