/*package pi.pperformance.elite.UserController;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.mail.MessagingException;
import pi.pperformance.elite.UserServices.PasswordResetTokenService;
import pi.pperformance.elite.entities.PasswordResetToken;

@RestController
@RequestMapping("/forget")
@RequiredArgsConstructor
 public class ForgetPasswordController {
    private final PasswordResetTokenService passwordResetTokenService;



    //send mail for email verification
     
    @PostMapping("/verifyMail/{email}")
    public ResponseEntity<Response> verifyEmail(@PathVariable String email) throws MessagingException {

        return PasswordResetToken.verifyEmail(email);

    }
 
    @PostMapping("/verifyOtp/{otp}/{email}")
    public ResponseEntity<Response> verifyOtp(@PathVariable String otp,@PathVariable String email) throws MessagingException {
        return passwordResetTokenService.verifyOtp(otp, email);
    }

    //Now User Can change the password

    
    @PostMapping("/changePassword/{email}")
    public ResponseEntity<Response> changePasswordHandler(
            @RequestBody ChangePasswordResetRequest changePassword,
            @PathVariable String email
    ){
        return PasswordResetToken.changePasswordHandler(changePassword,email);
    }
}*/