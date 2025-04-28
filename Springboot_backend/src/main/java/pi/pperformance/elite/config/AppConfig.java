package pi.pperformance.elite.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {

    @Bean
    public RestTemplate restTemplate() {
        // You can customize the RestTemplate here if needed (e.g., add interceptors, message converters)
        return new RestTemplate();
    }
}
