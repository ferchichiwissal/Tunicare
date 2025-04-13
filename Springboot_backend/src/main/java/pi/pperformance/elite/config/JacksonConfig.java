package pi.pperformance.elite.config;

import com.fasterxml.jackson.databind.Module;
import com.fasterxml.jackson.datatype.hibernate6.Hibernate6Module;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JacksonConfig {

    /**
     * Configures the Jackson ObjectMapper to properly handle Hibernate-specific types and lazy loading.
     * This prevents serialization errors when returning entities with uninitialized lazy associations.
     *
     * By default, Hibernate6Module serializes uninitialized lazy-loaded properties as null.
     * You can customize features like:
     * module.configure(Hibernate6Module.Feature.FORCE_LAZY_LOADING, true); // To force initialization (can cause N+1 issues)
     * module.configure(Hibernate6Module.Feature.SERIALIZE_IDENTIFIER_FOR_LAZY_NOT_LOADED_OBJECTS, true); // To serialize only the ID
     *
     * @return The configured Hibernate6Module.
     */
    @Bean
    public Module hibernate6Module() {
        Hibernate6Module module = new Hibernate6Module();
        // Default configuration is usually sufficient (serializes lazy proxies as null if not loaded)
        // Add custom configurations here if needed, e.g.:
        // module.configure(Hibernate6Module.Feature.FORCE_LAZY_LOADING, false); // Default is false
        // module.configure(Hibernate6Module.Feature.SERIALIZE_IDENTIFIER_FOR_LAZY_NOT_LOADED_OBJECTS, true); // Default is false
        return module;
    }
}
