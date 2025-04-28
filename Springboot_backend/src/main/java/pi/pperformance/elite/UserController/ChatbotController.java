package pi.pperformance.elite.UserController;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pi.pperformance.elite.UserServices.GeminiChatService;
import pi.pperformance.elite.dto.ChatbotRequest;
import pi.pperformance.elite.dto.ChatbotResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/chatbot")
// Consider adding @CrossOrigin if frontend and backend are on different origins
// @CrossOrigin(origins = "http://localhost:3000") // Adjust origin as needed
public class ChatbotController {

    private static final Logger logger = LoggerFactory.getLogger(ChatbotController.class);

    private final GeminiChatService geminiChatService;

    @Autowired
    public ChatbotController(GeminiChatService geminiChatService) {
        this.geminiChatService = geminiChatService;
    }

    @PostMapping("/query")
    public ResponseEntity<ChatbotResponse> handleChatQuery(@RequestBody ChatbotRequest request) {
        if (request == null || request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            logger.warn("Received empty or invalid chatbot request");
            return ResponseEntity.badRequest().body(new ChatbotResponse("Votre message est vide."));
        }

        logger.info("Received chatbot query: {}", request.getMessage());
        try {
            String reply = geminiChatService.getGeminiResponse(request.getMessage());
            logger.info("Sending chatbot reply: {}", reply);
            return ResponseEntity.ok(new ChatbotResponse(reply));
        } catch (Exception e) {
            logger.error("Error processing chatbot query", e);
            return ResponseEntity.internalServerError().body(new ChatbotResponse("Une erreur interne est survenue lors du traitement de votre demande."));
        }
    }
}
