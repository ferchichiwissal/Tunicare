package pi.pperformance.elite.UserServices;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class GeminiChatService {

    private static final Logger logger = LoggerFactory.getLogger(GeminiChatService.class);

    private final RestTemplate restTemplate;

    @Value("${gemini.api.key}")
    private String apiKey; // API Key will be injected from application.properties

    @Value("${gemini.api.url}")
    private String apiUrl; // API URL will be injected

    public GeminiChatService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // Constructor if RestTemplate bean is not explicitly defined (creates a new instance)
    // public GeminiChatService() {
    //     this.restTemplate = new RestTemplate();
    // }

    public String getGeminiResponse(String userMessage) {
        if (apiKey == null || apiKey.isEmpty() || apiUrl == null || apiUrl.isEmpty()) {
            logger.error("Gemini API Key or URL is not configured in application.properties");
            return "Erreur: La configuration de l'API Gemini est manquante.";
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        // The API key is now part of the URL query parameter, so no Authorization header needed here.

        // Construct the request body according to Gemini API specification
        // Simple version: just the current message
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of(
                                "role", "user",
                                "parts", List.of(
                                        Map.of("text", userMessage)
                                )
                        )
                )
                // Optional: Add generationConfig, safetySettings here if needed
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        String fullApiUrl = apiUrl + "?key=" + apiKey; // Append key to URL

        try {
            logger.info("Calling Gemini API at: {}", apiUrl); // Log URL without key
            // Use Map.class or a specific DTO class to receive the response
            Map<String, Object> response = restTemplate.postForObject(fullApiUrl, entity, Map.class);

            // Basic parsing - structure might need adjustment based on actual Gemini response
            if (response != null && response.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
                if (!candidates.isEmpty()) {
                    Map<String, Object> firstCandidate = candidates.get(0);
                    if (firstCandidate.containsKey("content")) {
                        Map<String, Object> content = (Map<String, Object>) firstCandidate.get("content");
                        if (content.containsKey("parts")) {
                            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                            if (!parts.isEmpty() && parts.get(0).containsKey("text")) {
                                return (String) parts.get(0).get("text");
                            }
                        }
                    }
                }
            }
            logger.warn("Could not parse valid response text from Gemini API response: {}", response);
            return "Désolé, je n'ai pas pu extraire la réponse de l'API.";

        } catch (HttpClientErrorException e) {
            logger.error("HTTP Error calling Gemini API: {} - {}", e.getStatusCode(), e.getResponseBodyAsString(), e);
            return "Erreur de communication avec l'API Gemini: " + e.getStatusCode();
        } catch (Exception e) {
            logger.error("Error calling Gemini API", e);
            return "Une erreur est survenue lors de la communication avec l'API Gemini.";
        }
    }
}
