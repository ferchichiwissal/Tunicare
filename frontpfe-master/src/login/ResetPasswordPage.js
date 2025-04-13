import React, { useEffect, useState, useCallback } from 'react'; // Added useCallback
import { useLocation, useNavigate } from 'react-router-dom'; // Added useNavigate
import './ResetPasswordPage.css'; // Import the CSS file

const ResetPasswordPage = () => {
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
            setError('Invalid or missing password reset token.');
        }
    }, [location.search]); // Depend on location.search

    const handlePasswordReset = async () => {
        setError('');
        setSuccessMessage('');

        if (!newPassword) {
            setError('New password cannot be empty.');
            return;
        }
         if (newPassword.length < 8) {
             setError('New password must be at least 8 characters long.');
             return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (!token) {
            setError('Token is missing or invalid.');
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
                setSuccessMessage('Password reset successful! Redirecting to login...');
                setNewPassword('');
                setConfirmPassword('');
                // Redirect to login after a delay
                setTimeout(() => {
                    navigate('/sign-in');
                }, 2000); // 2 second delay
            } else {
                let errorMessage = 'Failed to reset password. The token might be invalid or expired.';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (parseError) {
                    console.warn("Could not parse error response as JSON:", parseError);
                }
                setError(errorMessage);
            }
        } catch (error) {
            console.error("Password reset network/fetch error:", error);
            setError('An error occurred. Please check your network connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        // Use Bootstrap container and classes
        <div className="reset-password-container container mt-5"> {/* Added container, mt-5 */}
            <div className="card p-4 shadow-sm"> {/* Use Bootstrap card */}
                <h3 className="text-center mb-4">Reset Your Password</h3>

                {error && <div className="alert alert-danger">{error}</div>}
                {successMessage && <div className="alert alert-success">{successMessage}</div>}

                {token && !successMessage ? (
                    <form onSubmit={(e) => e.preventDefault()}>
                        <div className="mb-3">
                            <label htmlFor="newPassword" className="form-label required">New Password</label>
                            <input
                                type="password"
                                id="newPassword"
                                placeholder="Enter new password (min. 8 characters)"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={`form-control ${error && (error.includes('Password') || error.includes('match')) ? 'is-invalid' : ''}`}
                                required
                                minLength="8"
                            />
                             {/* Display general error above, or could add specific feedback here */}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="confirmPassword" className="form-label required">Confirm New Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`form-control ${error && error.includes('match') ? 'is-invalid' : ''}`}
                                required
                                minLength="8"
                            />
                             <div className="invalid-feedback">Passwords do not match.</div> {/* Example specific feedback */}
                        </div>
                        <div className="d-grid">
                            <button
                                type="button" // Change to button type if form onSubmit is prevented
                                onClick={handlePasswordReset}
                                className="btn btn-primary btn-lg"
                                disabled={loading || !newPassword || !confirmPassword}
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </div>
                    </form>
                ) : (
                     !successMessage && !error.includes('token') && <p className="text-center text-muted">Loading token...</p> // Show loading if token isn't set yet and no token error
                )}
                 {/* Show login link only on success or if token error */}
                 {(successMessage || error.includes('token')) &&
                    <div className="text-center mt-3">
                        <a href="/sign-in" className="btn btn-link">Go to Login</a>
                    </div>
                 }
            </div>
        </div>
    );
};

export default ResetPasswordPage;
