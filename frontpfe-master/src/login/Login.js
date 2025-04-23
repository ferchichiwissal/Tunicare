import React, { useState, useEffect, useContext } from "react"; // Import useContext
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // Import useTranslation
import styles from "./login.module.css";
import apiClient from "../utils/apiClient";
import { storeUserData } from "../utils/auth"; // Restore this import
import AuthContext from '../context/AuthContext'; // Import AuthContext

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loginMessage, setLoginMessage] = useState(null); // Store key/options instead of string
  const [loading, setLoading] = useState(false);
  const [needsCabinetSelection, setNeedsCabinetSelection] = useState(false);
  const [cabinetOptions, setCabinetOptions] = useState([]);
  const [selectedCabinetId, setSelectedCabinetId] = useState("");

  const navigate = useNavigate();
  const { t } = useTranslation(); // Get the translation function
  const { refreshUser } = useContext(AuthContext); // Get refreshUser from context

  // useEffect to check for remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true); // Also check the box if email was remembered
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setLoginMessage(null); // Clear message

    let payload;
    let isInitialAttempt = !needsCabinetSelection;

    if (needsCabinetSelection) {
        if (!selectedCabinetId) {
            setLoginMessage({ key: 'selectCabinetError' });
            setLoading(false);
            return;
        }
        payload = { 
          email, 
          password, 
          cabinetId: Number(selectedCabinetId) // Conversion en nombre
        };
    } else {
        if (!email || !password) {
            setLoginMessage({ key: 'missingCredentialsError' });
            setLoading(false);
            return;
        }
        payload = { email, password };
    }

    try {
      const response = await apiClient.post("http://localhost:6952/auth/login", payload);
      const responseData = response.data;

      // If status is 200, login is successful for the returned context (user/cabinet)
      // Reverted condition check to original
      if (response.status === 200 && responseData.user) { 
        setLoginMessage({ key: 'loginSuccess' });
        
        // Pass the rememberMe state to storeUserData for token storage duration
        // Restore the original call to storeUserData
        storeUserData(responseData, rememberMe);

        // Explicitly refresh the AuthContext state AFTER storing data
        if (refreshUser) {
          refreshUser();
          console.log("AuthContext state refreshed after login.");
        } else {
           console.error("Could not refresh AuthContext state after login.");
        }

        // Handle remembering the email address itself (remains unchanged)
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        console.log("Login successful, navigating to /dashboard");
        navigate("/dashboard"); // Navigate to the single dashboard route

      } else {
          // Handle cases where login succeeded (status 200) but user data is missing in response
          console.error("Login succeeded but user data missing in response:", responseData);
          setLoginMessage({ key: 'loginSuccessIncomplete' });
          setNeedsCabinetSelection(false);
          setCabinetOptions([]);
      }

    } catch (error) {
      if (error.response) {
        if (isInitialAttempt && error.response.status === 428 && error.response.data?.cabinets) {
          setLoginMessage({ key: 'multipleAccountsError' });
          setNeedsCabinetSelection(true);
          setCabinetOptions(error.response.data.cabinets);
          setSelectedCabinetId("");
        } else if (error.response.status === 401) {
          // Utiliser le message spécifique du backend pour les erreurs 401
          // Use key for default, but keep backend message if available
          setLoginMessage({ key: 'invalidCredentialsError' }); // Always use the key
          setNeedsCabinetSelection(false);
          setCabinetOptions([]);
        } else {
          // Use key for default, but keep backend message if available
          setLoginMessage({ key: 'serverError' }); // Always use the key
          setNeedsCabinetSelection(false);
          setCabinetOptions([]);
        }
      } else {
        setLoginMessage({ key: 'connectionError' });
        setNeedsCabinetSelection(false);
        setCabinetOptions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.App}>
      <div className={styles.authWrapper}>
        <div className={styles.authinner}>
          <form onSubmit={handleLogin}>
            <h3>{t('signInTitle')}</h3>
            <div className="mb-3">
              <label>{t('emailLabel')}</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                 type="email"
                 className={styles.formcontrol}
               />
             </div>

            <div className={styles.mb3}>
              <label>{t('passwordLabel')}</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                 type="password"
                 className={styles.formcontrol}
               />
             </div>

            <div className="mb-3 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="rememberMeCheckbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="rememberMeCheckbox">
                {t('rememberMeLabel')}
              </label>
            </div>

            {needsCabinetSelection && (
              <div className={styles.mb3}>
                <label>{t('selectCabinetLabel')}</label>
                <select
                  className={styles.formcontrol}
                  value={selectedCabinetId}
                   onChange={(e) => setSelectedCabinetId(e.target.value)}
                   required
                 >
                   <option value="" disabled>{t('selectCabinetLabel')}</option> {/* Changed placeholder key to label key */}
                   {cabinetOptions.map((cabinet) => (
                     <option key={cabinet.cabinetId} value={cabinet.cabinetId}>
                      {cabinet.cabinetName || t('cabinetOption', { id: cabinet.cabinetId })}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="d-grid">
              <button type="submit" className={styles.btn} disabled={loading}>
                {loading ? t('processingButton') : (needsCabinetSelection ? t('loginToCabinetButton') : t('submitButton'))}
              </button>
            </div>

            {/* Render translated message, checking if it's a key object or a direct string from backend */}
            {loginMessage && (
              <p className={styles.message}>
                {typeof loginMessage === 'object' && loginMessage.key ? t(loginMessage.key, loginMessage.options) : loginMessage}
              </p>
            )}

            <p className={styles.forgotpassword}>
              {t('forgotPasswordPrefix')} <Link to="/resetpassword">{t('forgotPasswordLink')}</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
