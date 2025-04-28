package pi.pperformance.elite.dto;

// Simple DTO to receive the user's message from the frontend
public class ChatbotRequest {
    private String message;
    // Optional: Add conversation history if needed
    // private List<ChatMessage> history; 

    // Getters and Setters
    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    // If history is added:
    // public List<ChatMessage> getHistory() {
    //     return history;
    // }
    //
    // public void setHistory(List<ChatMessage> history) {
    //     this.history = history;
    // }
}

// Optional inner class if history is implemented
// class ChatMessage {
//     private String role; // e.g., "user", "model"
//     private String text;
//     // Getters and Setters
// }
