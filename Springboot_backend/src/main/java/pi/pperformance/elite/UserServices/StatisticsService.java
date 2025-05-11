package pi.pperformance.elite.UserServices;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import pi.pperformance.elite.Authentif.CustomUserDetails;
import pi.pperformance.elite.UserRepository.MedicalExaminationRepository;
import pi.pperformance.elite.UserRepository.DoctorCentreDexamenRepository;
import pi.pperformance.elite.dto.DoctorExamStatsByCenterDTO;
import pi.pperformance.elite.dto.CenterDoctorStatDTO;
import pi.pperformance.elite.entities.MedicalExamination;
import pi.pperformance.elite.entities.Doctor;
import pi.pperformance.elite.entities.DoctorCentreDexamen;
import pi.pperformance.elite.entities.CabinetDr;
import pi.pperformance.elite.UserRepository.UserRepository;

import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.stream.Collectors;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import java.util.Comparator;

@Service
public class StatisticsService implements IStatisticsService {

    private final MedicalExaminationRepository medicalExaminationRepository;
    private final UserRepository userRepository;
    private final DoctorCentreDexamenRepository doctorCentreDexamenRepository; // Ensure this line is correct

    @Autowired
    public StatisticsService(MedicalExaminationRepository medicalExaminationRepository,
                             UserRepository userRepository,
                             DoctorCentreDexamenRepository doctorCentreDexamenRepository) { // Ensure parameter is present
        this.medicalExaminationRepository = medicalExaminationRepository;
        this.userRepository = userRepository;
        this.doctorCentreDexamenRepository = doctorCentreDexamenRepository; // Ensure assignment is correct
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
}