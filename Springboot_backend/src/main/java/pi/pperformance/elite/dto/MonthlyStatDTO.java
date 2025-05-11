package pi.pperformance.elite.dto;

public class MonthlyStatDTO {
    private String month; // e.g., "January", "February"
    private int year;
    private Long count;

    public MonthlyStatDTO(String month, int year, Long count) {
        this.month = month;
        this.year = year;
        this.count = count;
    }

    // Getters and Setters
    public String getMonth() {
        return month;
    }

    public void setMonth(String month) {
        this.month = month;
    }

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public Long getCount() {
        return count;
    }

    public void setCount(Long count) {
        this.count = count;
    }
}