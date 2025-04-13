package pi.pperformance.elite.Authentif; // Vérifiez que ce package est correct

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class GlobalCorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // Autoriser toutes les routes 
                .allowedOrigins("http://192.168.52.84.6952","http://192.168.52.84.3000","http://localhost:8084", "http://localhost:3000") // Origines autorisées
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // Ajout de OPTIONS pour les requêtes préliminaires
                .allowedHeaders("*") // Autoriser tous les headers
                .allowCredentials(true) // Permettre l'envoi des cookies et des headers d'authentification
                .maxAge(3600); // Cache la configuration pendant 1 heure pour éviter les requêtes répétées
    }
}
