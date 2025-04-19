import React, { useState, useEffect, useCallback } from "react"; // Added useEffect, useCallback
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import './ResetPass.css'; // Import the dedicated CSS file
// Removed unused styles import

const ResetPass = () => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState(""); // Added error state
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate(); // Initialize navigate

    // Optional: Add inactivity/token checks if this page requires authentication
    // For a public password reset request, usually no auth is needed.

    const handleResetRequest = async () => {
        setLoading(true);
        setMessage("");
        setError(""); // Clear previous error

        // Basic email validation
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError("Please enter a valid email address.");
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
                setMessage("A password reset link has been sent to your email.");
                setEmail(""); // Clear email field on success
            } else {
                const data = await response.json().catch(() => ({})); // Handle non-JSON error response
                setError(data.message || "Failed to send reset email. Please check the email address and try again.");
            }
        } catch (error) {
            console.error("Password reset request error:", error); // Log error
            setError("An error occurred. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        // Use Bootstrap container and classes
        <div className="auth-wrapper"> {/* Keep wrapper class if defined in ResetPass.css */}
            <div className="auth-inner"> {/* Keep inner class */}
                <h3 className="mb-3">Reset Password</h3> {/* Bootstrap margin */}
                {message && <div className="alert alert-success">{message}</div>}
                {error && <div className="alert alert-danger">{error}</div>}

                <form onSubmit={(e) => e.preventDefault()}>
                    <div className="mb-3"> {/* Bootstrap margin */}
                        <label htmlFor="reset-email" className="form-label">Email address</label>
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
                            {loading ? "Sending..." : "Send Reset Link"}
                        </button>
                    </div>
                     <div className="text-center mt-3"> {/* Link back to login */}
                        <a href="/sign-in">Back to Login</a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPass;
