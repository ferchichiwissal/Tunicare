package pi.pperformance.elite.dto;

public class AdminGlobalStatisticsDTO {
    private long totalUsers;
    private long totalPatients;
    private long totalDoctors;
    private long totalAssistants;
    private long totalDoctorCentres;
    private long totalCabinets;
    private long totalExamCentres;
    // private long newUsersThisWeek; // Supprimé
    private long newUsersThisMonth;
    // private long appointmentsToday; // Supprimé
    // private long appointmentsThisWeek; // Supprimé
    private long appointmentsThisMonth;
    // private long consultationsToday; // Supprimé
    // private long consultationsThisWeek; // Supprimé
    private long consultationsThisMonth;
    // private long examsToday; // Supprimé
    // private long examsThisWeek; // Supprimé
    private long examsThisMonth;
    private long medicalReportsGeneratedThisMonth; // Renommé pour la granularité mensuelle

    // Constructeur
    public AdminGlobalStatisticsDTO() {
    }

    public AdminGlobalStatisticsDTO(long totalUsers, long totalPatients, long totalDoctors, long totalAssistants,
                                  long totalDoctorCentres, long totalCabinets, long totalExamCentres,
                                  long newUsersThisMonth, long appointmentsThisMonth,
                                  long consultationsThisMonth, long examsThisMonth, long medicalReportsGeneratedThisMonth) {
        this.totalUsers = totalUsers;
        this.totalPatients = totalPatients;
        this.totalDoctors = totalDoctors;
        this.totalAssistants = totalAssistants;
        this.totalDoctorCentres = totalDoctorCentres;
        this.totalCabinets = totalCabinets;
        this.totalExamCentres = totalExamCentres;
        this.newUsersThisMonth = newUsersThisMonth;
        this.appointmentsThisMonth = appointmentsThisMonth;
        this.consultationsThisMonth = consultationsThisMonth;
        this.examsThisMonth = examsThisMonth;
        this.medicalReportsGeneratedThisMonth = medicalReportsGeneratedThisMonth;
    }

    // Getters and Setters
    public long getTotalUsers() {
        return totalUsers;
    }

    public void setTotalUsers(long totalUsers) {
        this.totalUsers = totalUsers;
    }

    public long getTotalPatients() {
        return totalPatients;
    }

    public void setTotalPatients(long totalPatients) {
        this.totalPatients = totalPatients;
    }

    public long getTotalDoctors() {
        return totalDoctors;
    }

    public void setTotalDoctors(long totalDoctors) {
        this.totalDoctors = totalDoctors;
    }

    public long getTotalAssistants() {
        return totalAssistants;
    }

    public void setTotalAssistants(long totalAssistants) {
        this.totalAssistants = totalAssistants;
    }

    public long getTotalDoctorCentres() {
        return totalDoctorCentres;
    }

    public void setTotalDoctorCentres(long totalDoctorCentres) {
        this.totalDoctorCentres = totalDoctorCentres;
    }

    public long getTotalCabinets() {
        return totalCabinets;
    }

    public void setTotalCabinets(long totalCabinets) {
        this.totalCabinets = totalCabinets;
    }

    public long getTotalExamCentres() {
        return totalExamCentres;
    }

    public void setTotalExamCentres(long totalExamCentres) {
        this.totalExamCentres = totalExamCentres;
    }

    // public long getNewUsersThisWeek() {
    //     return newUsersThisWeek;
    // }

    // public void setNewUsersThisWeek(long newUsersThisWeek) {
    //     this.newUsersThisWeek = newUsersThisWeek;
    // }

    public long getNewUsersThisMonth() {
        return newUsersThisMonth;
    }

    public void setNewUsersThisMonth(long newUsersThisMonth) {
        this.newUsersThisMonth = newUsersThisMonth;
    }

    // public long getAppointmentsToday() {
    //     return appointmentsToday;
    // }

    // public void setAppointmentsToday(long appointmentsToday) {
    //     this.appointmentsToday = appointmentsToday;
    // }

    // public long getAppointmentsThisWeek() {
    //     return appointmentsThisWeek;
    // }

    // public void setAppointmentsThisWeek(long appointmentsThisWeek) {
    //     this.appointmentsThisWeek = appointmentsThisWeek;
    // }

    public long getAppointmentsThisMonth() {
        return appointmentsThisMonth;
    }

    public void setAppointmentsThisMonth(long appointmentsThisMonth) {
        this.appointmentsThisMonth = appointmentsThisMonth;
    }

    // public long getConsultationsToday() {
    //     return consultationsToday;
    // }

    // public void setConsultationsToday(long consultationsToday) {
    //     this.consultationsToday = consultationsToday;
    // }

    // public long getConsultationsThisWeek() {
    //     return consultationsThisWeek;
    // }

    // public void setConsultationsThisWeek(long consultationsThisWeek) {
    //     this.consultationsThisWeek = consultationsThisWeek;
    // }

    public long getConsultationsThisMonth() {
        return consultationsThisMonth;
    }

    public void setConsultationsThisMonth(long consultationsThisMonth) {
        this.consultationsThisMonth = consultationsThisMonth;
    }

    // public long getExamsToday() {
    //     return examsToday;
    // }

    // public void setExamsToday(long examsToday) {
    //     this.examsToday = examsToday;
    // }

    // public long getExamsThisWeek() {
    //     return examsThisWeek;
    // }

    // public void setExamsThisWeek(long examsThisWeek) {
    //     this.examsThisWeek = examsThisWeek;
    // }

    public long getExamsThisMonth() {
        return examsThisMonth;
    }

    public void setExamsThisMonth(long examsThisMonth) {
        this.examsThisMonth = examsThisMonth;
    }

    public long getMedicalReportsGeneratedThisMonth() {
        return medicalReportsGeneratedThisMonth;
    }

    public void setMedicalReportsGeneratedThisMonth(long medicalReportsGeneratedThisMonth) {
        this.medicalReportsGeneratedThisMonth = medicalReportsGeneratedThisMonth;
    }
}
