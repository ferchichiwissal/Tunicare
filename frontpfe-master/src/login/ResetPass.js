import React, { useState } from "react"; // Removed useEffect, useCallback as they weren't used after refactor
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { useTranslation } from 'react-i18next'; // Import useTranslation
import './ResetPass.css'; // Import the dedicated CSS file

const ResetPass = () => {
    const { t } = useTranslation(); // Initialize translation hook
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState(""); // Added error state
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate(); // Initialize navigate

    const handleResetRequest = async () => {
        setLoading(true);
        setMessage("");
        setError(""); // Clear previous error

        // Basic email validation
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError(t('resetPass.invalidEmailError')); // Use translation key
            setLoading(false);
            return;
        }

        try {
            // Use axios or keep fetch, ensure consistency if possible
            const response = await fetch("http://localhost:6952/auth/request-password-reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                setMessage(t('resetPass.successMessage')); // Use translation key
                setEmail(""); // Clear email field on success
            } else {
                const data = await response.json().catch(() => ({})); // Handle non-JSON error response
                // Note: data.message comes from the backend, ideally it should be a key itself or handled differently
                setError(data.message || t('resetPass.sendFailErrorFallback')); // Use translation key for fallback
            }
        } catch (error) {
            console.error("Password reset request error:", error); // Log error
            setError(t('resetPass.genericError')); // Use translation key
        } finally {
            setLoading(false);
        }
    };

    return (
        // Use Bootstrap container and classes
        <div className="auth-wrapper"> {/* Keep wrapper class if defined in ResetPass.css */}
            <div className="auth-inner"> {/* Keep inner class */}
                <h3 className="mb-3">{t('resetPass.title')}</h3> {/* Use translation key */}
                {message && <div className="alert alert-success">{message}</div>}
                {error && <div className="alert alert-danger">{error}</div>}

                <form onSubmit={(e) => e.preventDefault()}>
                    <div className="mb-3"> {/* Bootstrap margin */}
                        <label htmlFor="reset-email" className="form-label">{t('resetPass.emailLabel')}</label> {/* Use translation key */}
                        <input
                            id="reset-email"
                            value={email}
                             onChange={(e) => setEmail(e.target.value)}
                             type="email"
                             className={`form-control ${error ? 'is-invalid' : ''}`} // Use form-control
                             required
                         />
                         {/* No specific field error display here, using general error above */}
                    </div>

                    <div className="d-grid"> {/* Bootstrap grid for full-width button */}
                        <button
                            type="button"
                            onClick={handleResetRequest}
                            className="btn btn-primary btn-lg" // Bootstrap button classes
                            disabled={loading}
                        >
                            {loading ? t('resetPass.sendingButton') : t('resetPass.sendButton')} {/* Use translation keys */}
                        </button>
                    </div>
                     <div className="text-center mt-3"> {/* Link back to login */}
                        <a href="/sign-in">{t('resetPass.backToLoginLink')}</a> {/* Use translation key */}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPass;
