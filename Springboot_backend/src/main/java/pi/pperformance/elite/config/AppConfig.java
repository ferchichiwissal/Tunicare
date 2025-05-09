package pi.pperformance.elite.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
// Removed WebMvcConfigurer and related imports as static file serving for uploads is no longer needed

@Configuration
public class AppConfig { // No longer implements WebMvcConfigurer

    // Resource handler removed as images are served via controller endpoint

    @Bean
    public RestTemplate restTemplate() {
        // You can customize the RestTemplate here if needed (e.g., add interceptors, message converters)
        return new RestTemplate();
    }
}
