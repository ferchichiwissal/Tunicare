package pi.pperformance.elite.dto;

public class MonthlyStatDTO {
    private int month; // Changed to int
    private int year;
    private Long count;

    public MonthlyStatDTO(int year, int month, Long count) { // Constructor updated
        this.year = year;
        this.month = month;
        this.count = count;
    }

    // Getters and Setters
    public int getMonth() { // Getter updated
        return month;
    }

    public void setMonth(int month) { // Setter updated
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