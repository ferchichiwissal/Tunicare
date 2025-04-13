package pi.pperformance.elite.UserServices;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class RecaptchaService {

    @Value("${recaptcha.secret.key}")
    private String secretKey;

    private static final String RECAPTCHA_URL = "https://www.google.com/recaptcha/api/siteverify";

    public boolean verifyCaptcha(String captchaResponse) {
        if (captchaResponse == null || captchaResponse.isEmpty()) {
            return false;
        }

        RestTemplate restTemplate = new RestTemplate();
        String url = UriComponentsBuilder.fromHttpUrl(RECAPTCHA_URL)
                .queryParam("secret", secretKey) // Assurez-vous que la clé secrète est correcte
                .queryParam("response", captchaResponse)
                .toUriString();

        System.out.println("Sending reCAPTCHA verification request to: " + url);

        RecaptchaResponse response = restTemplate.getForObject(url, RecaptchaResponse.class);
        System.out.println("reCAPTCHA response: " + response);

        if (response != null && response.getErrorCodes() != null) {
            System.out.println("reCAPTCHA errors: " + response.getErrorCodes());
        }

        return response != null && response.isSuccess();
    }

    private static class RecaptchaResponse {
        private boolean success;
        private String challenge_ts;
        private String hostname;
        private List<String> errorCodes;

        public boolean isSuccess() {
            return success;
        }

        public void setSuccess(boolean success) {
            this.success = success;
        }

        public String getChallenge_ts() {
            return challenge_ts;
        }

        public void setChallenge_ts(String challenge_ts) {
            this.challenge_ts = challenge_ts;
        }

        public String getHostname() {
            return hostname;
        }

        public void setHostname(String hostname) {
            this.hostname = hostname;
        }

        public List<String> getErrorCodes() {
            return errorCodes;
        }

        public void setErrorCodes(List<String> errorCodes) {
            this.errorCodes = errorCodes;
        }

        @Override
        public String toString() {
            return "RecaptchaResponse{" +
                    "success=" + success +
                    ", challenge_ts='" + challenge_ts + '\'' +
                    ", hostname='" + hostname + '\'' +
                    ", errorCodes=" + errorCodes +
                    '}';
        }
    }
}