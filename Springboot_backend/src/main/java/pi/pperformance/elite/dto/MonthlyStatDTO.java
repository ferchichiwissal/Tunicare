package pi.pperformance.elite.dto;

import java.time.LocalDate;

public class MonthlyStatDTO {

    private int year;
    private int month;
    private Long count;

    // Existing constructor (keep if still used elsewhere)
    public MonthlyStatDTO(LocalDate month, Long count) {
        // This constructor might need adjustment if LocalDate is not the desired type for 'month'
        // For now, let's assume it's used elsewhere and keep it, but the JPQL needs the new one.
        // A better approach might be to represent month/year as separate fields or a String in the DTO.
        // Based on the JPQL, it seems year and month as integers are expected.
        if (month != null) {
            this.year = month.getYear();
            this.month = month.getMonthValue();
        } else {
            this.year = 0; // Or handle appropriately
            this.month = 0; // Or handle appropriately
        }
        this.count = count;
    }

    // New constructor matching the JPQL query
    public MonthlyStatDTO(int year, int month, Long count) {
        this.year = year;
        this.month = month;
        this.count = count;
    }


    // Getters and setters (or use Lombok)
    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public int getMonth() {
        return month;
    }

    public void setMonth(int month) {
        this.month = month;
    }

    public Long getCount() {
        return count;
    }

    public void setCount(Long count) {
        this.count = count;
    }

    @Override
    public String toString() {
        return "MonthlyStatDTO{" +
               "year=" + year +
               ", month=" + month +
               ", count=" + count +
               '}';
    }
}
