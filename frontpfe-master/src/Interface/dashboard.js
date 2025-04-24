 import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // Import useTranslation
import { Line, Bar } from 'react-chartjs-2';
import { jwtDecode } from "jwt-decode";
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import './dashboard.css';  // Make sure the styles are loaded

// Register chart elements
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);
const INACTIVITY_TIMEOUT = 30 * 1000; // 1 minute

const Dashboard = ({ onLogout }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // State for sidebar visibility
  const navigate = useNavigate();
  const { t } = useTranslation(); // Get translation function

  // Perform logout and redirect
  const performLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    navigate("/sign-in");
  };

  // Handle token expiration logic
  const handleTokenExpiry = () => {
    const accessToken =
      localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");

    if (accessToken) {
      try {
        const decodedToken = jwtDecode(accessToken);
        const expiryTime = decodedToken.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();

        if (expiryTime > currentTime) {
          setTimeout(performLogout, expiryTime - currentTime);
        } else {
          performLogout();
        }
      } catch (error) {
        console.error("Error decoding token:", error);
        performLogout();
      }
    } else {
      performLogout();
    }
  };

  // -------------------- React Hooks -------------------- //
  
  // Monitor token expiry on component mount
  useEffect(() => {
    handleTokenExpiry();
  }, []); // Run once when the component is mounted

  // Handle session timeout due to inactivity
  useEffect(() => {
    let inactivityTimer;

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        setSessionExpired(true);
        onLogout();
        alert(t('sessionExpiredAlert')); // Use translation key for alert
        navigate("/sign-in");
      }, INACTIVITY_TIMEOUT);
    };

    const events = ["mousemove", "keydown", "scroll", "click"];
    events.forEach((event) => window.addEventListener(event, resetInactivityTimer));
    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach((event) => window.removeEventListener(event, resetInactivityTimer));
    };
  }, [onLogout, navigate]);

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUser = () => {
      const storedUser = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user"));
      if (storedUser) {
        setUser(storedUser);
        setLoading(false);
      } else {
        navigate("/sign-in");
      }
    };
    fetchUser();
  }, [navigate]);

  // ---------------------------------------------------- //

  // Redirect if session has expired
  if (sessionExpired) return null;

  if (loading) {
    return <div>{t('loading')}</div>; // Translate loading text
  }

  // Data for the first chart: Payments Over Time
  const paymentData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: t('dashboard.charts.payments.label'),
        data: [800, 980, 1200, 1580, 1850, 2000],
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Options for the payment chart
  const paymentOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: t('dashboard.charts.payments.title'),
      },
      legend: {
        position: 'top',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: t('dashboard.charts.monthAxisLabel'),
        },
      },
      y: {
        title: {
          display: true,
          text: t('dashboard.charts.payments.yAxisLabel'),
        },
        beginAtZero: true,
      },
    },
  };

  // Data for the second chart: Number of Phone Calls per Month
  const phoneCallsData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: t('dashboard.charts.phoneCalls.label'),
        data: [200, 400, 510, 620, 730, 800],
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Options for the phone calls chart
  const phoneCallsOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: t('dashboard.charts.phoneCalls.title'),
      },
      legend: {
        position: 'top',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: t('dashboard.charts.monthAxisLabel'), // Reuse month label
        },
      },
      y: {
        title: {
          display: true,
          text: t('dashboard.charts.phoneCalls.yAxisLabel'),
        },
        beginAtZero: true,
      },
    },
  };




  // Define navigation links based on the user's role
  let navigationLinks;
  const id = user.id;

  if (user.role === "ADMIN") {
    navigationLinks = (
      <>
        <a href="#">{t('nav.dashboard')}</a>
       {/* <a href="/add">{t('nav.addAccount')}</a>*/}
        {/* <a href="/Tovalidate">{t('nav.confirmation')}</a>*/}
        <a href="/users">{t('nav.doctorsManagement')}</a>
         {/*<a href="/bloque">{t('nav.deactivateAccounts')}</a>*/}
        <a href="/UserManagement">{t('nav.changeRole')}</a>
        <a href="/add-cabinet">{t('nav.addCabinet')}</a>
        <a href="/manage-cabinets">{t('nav.manageCabinets')}</a> {/* Link for Admin Cabinets */}
        <a href="/add-centre">{t('nav.addExamCentre')}</a> {/* Link for Admin Centres */}
        <a href="/manage-centres">{t('nav.manageExamCentres')}</a> {/* Link for Admin Centres */}
        <a href="/activation">{t('nav.activationManagement')}</a> {/* Added Activation Link */}
        <a href={`/edit-user/${id}`}>{t('nav.editMyAccount')}</a>
        <a href="/change-password">{t('nav.changePassword')}</a>
        <a href="/Logout">{t('nav.logout')}</a>
      </>
    );
  } else if (user.role === "DOCTOR") {
    navigationLinks = (
      <>
        <a href="#">{t('nav.dashboard')}</a>
        {/* Assistants/Doctors might not need 'Add an Account' directly, adjust if needed */}
         <a href="/add">{t('nav.addAccount')}</a>
        <a href="/Tovalidate">{t('nav.confirmation')}</a>
        <a href="/users">{t('nav.userManagement')}</a> {/* Consider filtering users by their cabinet */}
        {/*<a href="/bloque">{t('nav.deactivateAccounts')}</a> {/* Consider filtering users by their cabinet */}
        <a href="/UserManagement">{t('nav.changeRole')}</a> {/* Consider filtering users by their cabinet */}
        <a href="/consultation/all">{t('nav.consultationDashboard', 'Tableau de Bord Consultations')}</a> {/* Added Consultation Dashboard Link */}
        <a href="/manage-appointments">{t('nav.manageAppointments', 'Manage Appointments')}</a> {/* Added Manage Appointments Link */}
        <a href="/parametres-cabinet">{t('nav.cabinetSettings', 'Paramètres du Cabinet')}</a> {/* Added Cabinet Settings Link */}
        <a href={`/edit-user/${id}`}>{t('nav.editMyAccount')}</a>
        <a href="/change-password">{t('nav.changePassword')}</a>
        <a href="/Logout">{t('nav.logout')}</a>
      </>
    );
  } 
  
  else if (user.role === "ASSISTANT" ) {
    navigationLinks = (
      <>
        <a href="#">{t('nav.dashboard')}</a>
        {/* Assistants/Doctors might not need 'Add an Account' directly, adjust if needed */}
         <a href="/add">{t('nav.addAccountAssistant')}</a>
        <a href="/Tovalidate">{t('nav.confirmation')}</a>
        <a href="/users">{t('nav.userManagement')}</a> {/* Consider filtering users by their cabinet */}
        {/*<a href="/bloque">{t('nav.deactivateAccounts')}</a> {/* Consider filtering users by their cabinet */}
        <a href="/UserManagement">{t('nav.changeRole')}</a> {/* Consider filtering users by their cabinet */}
        <a href="/consultation/all">{t('nav.consultationDashboard', 'Tableau de Bord Consultations')}</a> {/* Added Consultation Dashboard Link */}
        {/* Assistant does not manage prescriptions directly */}
        <a href="/manage-appointments">{t('nav.manageAppointments', 'Manage Appointments')}</a> {/* Added Manage Appointments Link */}
        <a href={`/edit-user/${id}`}>{t('nav.editMyAccount')}</a>
        <a href="/change-password">{t('nav.changePassword')}</a>
        <a href="/Logout">{t('nav.logout')}</a>
      </>
    );
  } 
  
  
  
  
  
  else if (user.role === "PATIENT") {
    navigationLinks = (
      <>
        <a href="#">{t('nav.dashboard')}</a>
        {/* Add patient-specific links here based on scenario */}
        <a href="/my-consultations">{t('nav.myConsultations', 'Mes Consultations')}</a>
        <a href="/my-examinations">{t('nav.myExaminations', 'Mes Examens')}</a>
        <a href="/my-appointments">{t('nav.myAppointments', 'Mes Rendez-vous')}</a>
        <a href="/add-appointment">{t('nav.addAppointment', 'Prendre Rendez-vous')}</a>
        <a href={`/edit-user/${id}`}>{t('nav.editMyAccount')}</a>
        <a href="/change-password">{t('nav.changePassword')}</a>
        <a href="/Logout">{t('nav.logout')}</a>
       </>
    );
  }






 
  else if (user.role === "DOCTOR_CENTRE_EXAMEN") {
    navigationLinks = (
      <>
        <a href="#">{t('nav.dashboard')}</a>
        <a href={`/edit-doctor-centre/${id}`}>{t('nav.editMyAccount')}</a> {/* Reverted to correct route path */}
        <a href="/change-password">{t('nav.changePassword')}</a>
        <a href="/Logout">{t('nav.logout')}</a>
       </>
    );
  }







  return (
    <div className="app">
      <header className="app-header">
      <div className="app-header-logo">
         {/* <div className="logo">
            <span className="logo-icon">
              <img src="..\..\..\\images\logo.png" width="50px" alt="Logo"/>
            </span>
            <h1 className="logo-title">
              <span>Tunicare</span>
            </h1>
          </div>*/}
        </div>
  
        <div className="app-header-actions">
          <div className="app-header-actions-buttons">
            <button className="icon-button large"><i className="ph-magnifying-glass"></i></button>
            <button className="icon-button large"><i className="ph-bell"></i></button>
            {/* Add sidebar toggle button */}
            <button className="icon-button large" onClick={toggleSidebar}>
              <i className={isSidebarOpen ? "ph-arrow-circle-right" : "ph-arrow-circle-left"}></i> {/* Icon changes based on state */}
            </button>
          </div>
        </div>
      </header>
  
      <div className="app-body">
        <div className="app-body-navigation">
          <nav className="navigation">
            {navigationLinks}
          </nav>
          <footer className="footer">
            <h1>Zimys<small>©</small></h1>
            <div>{t('footer.copyright', { year: 2025 })}</div>
          </footer>
        </div>
  
        <div className="app-body-main-content">
          <section className="service-section">
            <h2>{t('dashboard.title', { firstName: user.first_name, lastName: user.last_name })}</h2>
            <div className="tiles">
              <article className="tile">
                <div className="tile-header">
                  <i className="ph-lightning-light"></i>
                  <h3>
                    <span>{t('dashboard.tiles.performance.title')}</span>
                    <span>{t('dashboard.tiles.performance.subtitle')}</span>
                  </h3>
                </div>
                <a href="#">{t('dashboard.tiles.viewDetails')}</a>
              </article>
  
              <article className="tile">
                <div className="tile-header">
                  <i className="ph-fire-simple-light"></i>
                  <h3>
                    <span>{t('dashboard.tiles.sales.title')}</span>
                    <span>{t('dashboard.tiles.sales.subtitle', { percentage: 75 })}</span>
                  </h3>
                </div>
                <a href="#">{t('dashboard.tiles.viewDetails')}</a>
              </article>
  
              <article className="tile">
                <div className="tile-header">
                  <i className="ph-file-light"></i>
                  <h3>
                    <span>{t('dashboard.tiles.teamPerformance.title')}</span>
                    <span>{t('dashboard.tiles.teamPerformance.subtitle', { team: 'A', percentage: 85 })}</span>
                  </h3>
                </div>
                <a href="#">{t('dashboard.tiles.viewDetails')}</a>
              </article>
            </div>
          </section>
  
          <section className="service-section">
            <h2>{t('dashboard.performanceSectionTitle')}</h2>
            <div className="tiles">
              <article className="tile">
                <div className="tile-header">
                  <i className="ph-folder-light"></i>
                  <h3>
                    <span>{t('dashboard.tiles.projectTracking.title')}</span>
                    <span>{t('dashboard.tiles.projectTracking.subtitle', { count: 5 })}</span>
                  </h3>
                </div>
                <a href="#">{t('dashboard.tiles.viewDetails')}</a>
              </article>
  
              <article className="tile">
                <div className="tile-header">
                  <i className="ph-users-light"></i>
                  <h3>
                    <span>{t('dashboard.tiles.teamObjectives.title')}</span>
                    <span>{t('dashboard.tiles.teamObjectives.subtitle', { percentage: 80 })}</span>
                  </h3>
                </div>
                <a href="#">{t('dashboard.tiles.analyzeProgress')}</a>
              </article>
  
              <article className="tile">
                <div className="tile-header">
                  <i className="ph-bell-light"></i>
                  <h3>
                    <span>{t('dashboard.tiles.notifications.title')}</span>
                    <span>{t('dashboard.tiles.notifications.subtitle', { count: 2 })}</span>
                  </h3>
                </div>
                <a href="#">{t('dashboard.tiles.viewNotifications')}</a>
              </article>
            </div>
          </section>
  
          {/* Only display charts for EMPLOYEE */}
          {user.role === 'EMPLOYEE' && (
            <>
              <section className="charts-section">
                <h3>{t('dashboard.charts.performanceTitle', { firstName: user.first_name, lastName: user.last_name })}</h3>
                <div className="chart-container">
                  <h4>{t('dashboard.charts.payments.label')}</h4> {/* Reuse label */}
                  <Bar data={paymentData} options={paymentOptions} />
                </div>
  
                <div className="chart-container">
                  <h4>{t('dashboard.charts.phoneCalls.title')}</h4> {/* Reuse title */}
                  <Bar data={phoneCallsData} options={phoneCallsOptions} />
                </div>
              </section>
            </>
          )}
          {/* New Sidebar Toggle Button within Main Content */}
          <button
            className="sidebar-toggle-button-main"
            onClick={toggleSidebar}
            title={isSidebarOpen ? t('dashboard.tooltips.hideSidebar') : t('dashboard.tooltips.showSidebar')}
          >
            <i className={isSidebarOpen ? "ph-arrow-circle-right" : "ph-arrow-circle-left"}></i>
          </button>
        </div>
  
        {/* Conditionally apply class based on isSidebarOpen state */}
        <div className={`sidebar ${isSidebarOpen ? '' : 'sidebar-closed'}`}>
          <div className="sidebar-header">
            {user.photoProfil && (
              <div className="user-info-item">
                <img 
                  src={`data:image/jpeg;base64,${user.photoProfil}`} 
                  alt="Profile" 
                  style={{ width: '100px', height: '100px', borderRadius: '50%' }}
                />
              </div>
            )}
  
            <h3>{user.firstName} {user.lastName}</h3>
  
            <div className="user-info-item">
              <p><strong>{t('dashboard.sidebar.emailLabel')}:</strong> <span>{user.email}</span></p>
            </div>
          </div>
  
          <div className="sidebar-content">
            <div className="user-info-item">
              <p><strong>{t('dashboard.sidebar.birthDateLabel')}:</strong> <span>{user.birthDate ? user.birthDate : t('dashboard.sidebar.notProvided')}</span></p>
            </div>
            
            <div className="user-info-item">
              <p><strong>{t('dashboard.sidebar.roleLabel')}:</strong> <span>{user.role}</span></p> {/* Role might need translation itself if it's displayed */}
            </div>
            
           
            
            <div className="user-info-item">
              <p><strong>{t('dashboard.sidebar.genderLabel')}:</strong> <span>{user.gender}</span></p> {/* Gender might need translation */}
            </div>
            
            <div className="user-info-item">
              <p><strong>{t('dashboard.sidebar.addressLabel')}:</strong> <span>{user.address}</span></p>
            </div>
            
            <div className="user-info-item">
              <p><strong>{t('dashboard.sidebar.phoneLabel')}:</strong> <span>{user.tel}</span></p>
            </div>
          <div className="user-info-item">
              <p><strong>{t('dashboard.sidebar.ageLabel')}:</strong> <span>{user.age ? user.age : t('dashboard.sidebar.notAvailable')}</span></p> {/* Added check for null age */}
          </div>

          {/* Display specialty only for DOCTOR_CENTRE_EXAMEN */}
          {user.role === "DOCTOR_CENTRE_EXAMEN" && (
            <div className="user-info-item">
              <p><strong>{t('dashboard.sidebar.specialtyLabel', 'Specialty')}:</strong> <span>{user.speciality ? user.speciality : t('dashboard.sidebar.notProvided')}</span></p> {/* Corrected field name */}
            </div>
          )}
             
          </div>
        </div>
      </div>
    </div>
  );}
export default Dashboard;
