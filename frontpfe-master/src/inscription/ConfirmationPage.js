import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate for redirection
import "./ConfirmationPage.css"; // Import the dedicated CSS file

function ConfirmationPage() {
    const [countdown, setCountdown] = useState(5);
    const navigate = useNavigate(); // Hook for navigation

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prevCount) => prevCount - 1);
        }, 1000); 

        // Redirect when countdown reaches 0
        if (countdown === 0) {
            navigate("/");
        }

        return () => clearInterval(timer); // Cleanup interval on unmount
    }, [countdown, navigate]);

    return (
        <div className="containerSuccess">
            <div className="cardSuccess text-center">
                <div className="icon-container">
                    <span className="checkmark">✓</span>
                </div>
                <h1>Inscription réussie</h1><p>
                Félicitations ! Votre inscription a été complétée avec succès.<br></br>
                Nous vous remercions pour votre confiance.
            </p>
                <br></br>
                <p className="countdown">Redirection dans <b>0{countdown}s</b>...</p>
            </div>
        </div>
    );
}

export default ConfirmationPage;
