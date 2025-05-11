package pi.pperformance.elite.dto;

import java.util.List;

public class CenterExamStatsByDoctorDTO {
    private String doctorOrCabinetName;
    private List<MonthlyStatDTO> monthlyStats;
    private Long totalExams; // Keep a total for overall view if needed


    public CenterExamStatsByDoctorDTO(String doctorOrCabinetName, List<MonthlyStatDTO> monthlyStats, Long totalExams) {
        this.doctorOrCabinetName = doctorOrCabinetName;
        this.monthlyStats = monthlyStats;
        this.totalExams = totalExams;
    }

    // Getters and Setters
    public String getDoctorOrCabinetName() {
        return doctorOrCabinetName;
    }

    public void setDoctorOrCabinetName(String doctorOrCabinetName) {
        this.doctorOrCabinetName = doctorOrCabinetName;
    }

    public List<MonthlyStatDTO> getMonthlyStats() {
        return monthlyStats;
    }

    public void setMonthlyStats(List<MonthlyStatDTO> monthlyStats) {
        this.monthlyStats = monthlyStats;
    }

    public Long getTotalExams() {
        return totalExams;
    }

    public void setTotalExams(Long totalExams) {
        this.totalExams = totalExams;
    }
}