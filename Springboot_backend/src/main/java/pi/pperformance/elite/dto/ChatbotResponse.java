package pi.pperformance.elite.dto;

// Simple DTO to send the bot's response back to the frontend
public class ChatbotResponse {
    private String reply;

    // Constructor
    public ChatbotResponse(String reply) {
        this.reply = reply;
    }

    // Getter
    public String getReply() {
        return reply;
    }

    // Setter (optional, depending on usage)
    public void setReply(String reply) {
        this.reply = reply;
    }
}
