import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next"; // Import useTranslation
import { useNavigate } from "react-router-dom"; // Import useNavigate for redirection
import "./ConfirmationPage.css"; // Import the dedicated CSS file

function ConfirmationPage() {
  const { t } = useTranslation(); // Initialize translation function
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
                <h1>{t('confirmation.successTitle')}</h1>
                <p>
                  {t('confirmation.successMessage1')}<br />
                  {t('confirmation.successMessage2')}
                </p>
                <br />
                <p className="countdown">{t('confirmation.redirectMessage', { count: countdown })}</p>
            </div>
        </div>
    );
}

export default ConfirmationPage;
