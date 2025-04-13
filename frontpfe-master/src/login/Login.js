import React, { useState, useEffect } from "react"; // Import useEffect
import { Link, useNavigate } from "react-router-dom";
import styles from "./login.module.css";
import apiClient from "../utils/apiClient";
import { storeUserData } from "../utils/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsCabinetSelection, setNeedsCabinetSelection] = useState(false);
  const [cabinetOptions, setCabinetOptions] = useState([]);
  const [selectedCabinetId, setSelectedCabinetId] = useState("");

  const navigate = useNavigate();

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
    setLoginMessage("");

    let payload;
    let isInitialAttempt = !needsCabinetSelection;

    if (needsCabinetSelection) {
        if (!selectedCabinetId) {
            setLoginMessage("Please select a cabinet.");
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
            setLoginMessage("Please insert your email and password");
            setLoading(false);
            return;
        }
        payload = { email, password };
    }

    try {
      const response = await apiClient.post("http://localhost:6952/auth/login", payload);
      const responseData = response.data;

      // If status is 200, login is successful for the returned context (user/cabinet)
      if (response.status === 200 && responseData.user) {
        setLoginMessage("Login successful!");
        // Pass the rememberMe state to storeUserData for token storage duration
        storeUserData(responseData, rememberMe); 

        // Handle remembering the email address itself
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
          setLoginMessage("Login successful, but failed to load user details.");
          setNeedsCabinetSelection(false);
          setCabinetOptions([]);
      }

    } catch (error) {
      if (error.response) {
        if (isInitialAttempt && error.response.status === 428 && error.response.data?.cabinets) {
          setLoginMessage("Multiple accounts found. Please select your cabinet.");
          setNeedsCabinetSelection(true);
          setCabinetOptions(error.response.data.cabinets);
          setSelectedCabinetId("");
        } else if (error.response.status === 401) {
          // Utiliser le message spécifique du backend pour les erreurs 401
          setLoginMessage(error.response.data?.message || "Invalid email or password."); 
          setNeedsCabinetSelection(false);
          setCabinetOptions([]);
        } else {
          setLoginMessage(error.response.data?.message || "Login failed due to a server error.");
          setNeedsCabinetSelection(false);
          setCabinetOptions([]);
        }
      } else {
        setLoginMessage("Login failed. Please check your connection or contact support.");
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
            <h3>Sign In</h3>
            <div className="mb-3">
              <label>Email address</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className={styles.formcontrol}
                placeholder="Enter email"
              />
            </div>

            <div className={styles.mb3}>
              <label>Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className={styles.formcontrol}
                placeholder="Enter password"
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
                Remember me
              </label>
            </div>

            {needsCabinetSelection && (
              <div className={styles.mb3}>
                <label>Select Cabinet</label>
                <select
                  className={styles.formcontrol}
                  value={selectedCabinetId}
                  onChange={(e) => setSelectedCabinetId(e.target.value)}
                  required
                >
                  <option value="" disabled>-- Select a Cabinet --</option>
                  {cabinetOptions.map((cabinet) => (
                    <option key={cabinet.cabinetId} value={cabinet.cabinetId}>
                      {cabinet.cabinetName || `Cabinet ${cabinet.cabinetId}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="d-grid">
              <button type="submit" className={styles.btn} disabled={loading}>
                {loading ? "Processing..." : (needsCabinetSelection ? "Login to Selected Cabinet" : "Submit")}
              </button>
            </div>

            {loginMessage && <p className={styles.message}>{loginMessage}</p>}

            <p className={styles.forgotpassword}>
              Forgot <Link to="/resetpassword">password?</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
