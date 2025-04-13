package pi.pperformance.elite.exceptions;


//Exception personnalisée pour gérer les comptes introuvables
public class AccountNotFoundException extends RuntimeException {
 // Constructeur avec un message d'erreur

    // Constructeur par défaut
    public AccountNotFoundException() {
        super("Account not found");
    }

    // Constructeur avec un message personnalisé
    public AccountNotFoundException(String message) {
        super(message);
    }

    // Constructeur avec un message et une cause
    public AccountNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }

    // Constructeur avec une cause
    public AccountNotFoundException(Throwable cause) {
        super(cause);
    }
}

