import React, { useEffect, useState } from 'react'; // Removed useCallback as it wasn't used
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import './ResetPasswordPage.css'; // Import the CSS file

const ResetPasswordPage = () => {
    const { t } = useTranslation(); // Initialize translation hook
    const [token, setToken] = useState(null);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate(); // Initialize navigate

    // Get the token from the URL query parameters using useLocation hook
    const location = useLocation();

    // Extract token only once on component mount
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const tokenFromUrl = queryParams.get('token');
        if (tokenFromUrl) {
            setToken(tokenFromUrl);
        } else {
            setError(t('resetPasswordPage.error.invalidToken')); // Use translation key
        }
    }, [location.search, t]); // Add t to dependency array

    const handlePasswordReset = async () => {
        setError('');
        setSuccessMessage('');

        if (!newPassword) {
            setError(t('resetPasswordPage.error.passwordEmpty')); // Use translation key
            return;
        }
         if (newPassword.length < 8) {
             setError(t('resetPasswordPage.error.passwordTooShort')); // Use translation key
             return;
        }
        if (newPassword !== confirmPassword) {
            setError(t('resetPasswordPage.error.passwordsMismatch')); // Use translation key
            return;
        }
        if (!token) {
            setError(t('resetPasswordPage.error.tokenMissingOrInvalid')); // Use translation key
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('http://localhost:6952/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword }), // Only send token and newPassword
            });

            if (response.ok) {
                setSuccessMessage(t('resetPasswordPage.successMessage')); // Use translation key
                setNewPassword('');
                setConfirmPassword('');
                // Redirect to login after a delay
                setTimeout(() => {
                    navigate('/sign-in');
                }, 2000); // 2 second delay
            } else {
                let errorMessage = t('resetPasswordPage.error.resetFailedFallback'); // Use translation key for fallback
                try {
                    const errorData = await response.json();
                    // Backend messages should ideally be keys too, but we use the message if available
                    errorMessage = errorData.message || errorMessage;
                } catch (parseError) {
                    console.warn("Could not parse error response as JSON:", parseError);
                }
                setError(errorMessage);
            }
        } catch (error) {
            console.error("Password reset network/fetch error:", error);
            setError(t('resetPasswordPage.error.networkError')); // Use translation key
        } finally {
            setLoading(false);
        }
    };

    return (
        // Use Bootstrap container and classes
        <div className="reset-password-container container mt-5"> {/* Added container, mt-5 */}
            <div className="card p-4 shadow-sm"> {/* Use Bootstrap card */}
                <h3 className="text-center mb-4">{t('resetPasswordPage.title')}</h3> {/* Use translation key */}

                {error && <div className="alert alert-danger">{error}</div>}
                {successMessage && <div className="alert alert-success">{successMessage}</div>}

                {token && !successMessage ? (
                    <form onSubmit={(e) => e.preventDefault()}>
                        <div className="mb-3">
                            <label htmlFor="newPassword" className="form-label required">{t('resetPasswordPage.newPasswordLabel')}</label> {/* Use translation key */}
                            <input
                                 type="password"
                                 id="newPassword"
                                 value={newPassword}
                                 onChange={(e) => setNewPassword(e.target.value)}
                                className={`form-control ${error && (error.includes('Password') || error.includes('match')) ? 'is-invalid' : ''}`}
                                required
                                minLength="8"
                            />
                             {/* Display general error above, or could add specific feedback here */}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="confirmPassword" className="form-label required">{t('resetPasswordPage.confirmPasswordLabel')}</label> {/* Use translation key */}
                            <input
                                 type="password"
                                 id="confirmPassword"
                                 value={confirmPassword}
                                 onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`form-control ${error && error.includes('match') ? 'is-invalid' : ''}`}
                                required
                                minLength="8"
                            />
                             {/* Consider removing this specific feedback if general error covers it */}
                             <div className="invalid-feedback">{t('resetPasswordPage.error.passwordsMismatch')}</div>
                        </div>
                        <div className="d-grid">
                            <button
                                type="button" // Change to button type if form onSubmit is prevented
                                onClick={handlePasswordReset}
                                className="btn btn-primary btn-lg"
                                disabled={loading || !newPassword || !confirmPassword}
                            >
                                {loading ? t('resetPasswordPage.resettingButton') : t('resetPasswordPage.resetButton')} {/* Use translation keys */}
                            </button>
                        </div>
                    </form>
                ) : (
                     !successMessage && !error.includes(t('resetPasswordPage.error.invalidToken')) && <p className="text-center text-muted">{t('resetPasswordPage.loadingToken')}</p> // Show loading if token isn't set yet and no token error
                )}
                 {/* Show login link only on success or if token error */}
                 {(successMessage || error === t('resetPasswordPage.error.invalidToken') || error === t('resetPasswordPage.error.tokenMissingOrInvalid')) &&
                    <div className="text-center mt-3">
                        <a href="/sign-in" className="btn btn-link">{t('resetPasswordPage.goToLoginLink')}</a> {/* Use translation key */}
                    </div>
                 }
            </div>
        </div>
    );
};

export default ResetPasswordPage;
