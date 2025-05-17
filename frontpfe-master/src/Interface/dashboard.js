 import React, { useEffect, useState, useContext } from "react"; // Added useContext
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Line, Bar } from 'react-chartjs-2';
import { jwtDecode } from "jwt-decode";
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, LineElement, PointElement } from 'chart.js'; // Added LineElement, PointElement
import './dashboard.css';
import Chatbot from './Chatbot';
import './Chatbot.css';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import apiClient from '../utils/apiClient'; // Import apiClient

// Register chart elements
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, LineElement, PointElement); // Added LineElement, PointElement
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const Dashboard = ({ onLogout }) => { 
  // const [user, setUser] = useState(null); // Will be replaced by useAuth()
  const { user: authUser, token } = useAuth(); // Use user from AuthContext
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [dashboardStats, setDashboardStats] = useState(null); // State for statistics
  const [statsLoading, setStatsLoading] = useState(true); // Loading state for statistics
  // const [patientConsultationsChartData, setPatientConsultationsChartData] = useState(null); // Supprimé
  // const [patientExamsChartData, setPatientExamsChartData] = useState(null); // Supprimé
  const navigate = useNavigate();
  const { t } = useTranslation();

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
        setSessionExpired(true); // Mark the session as expired
        if (onLogout && typeof onLogout === 'function') {
            onLogout(); // Call the onLogout function passed as a prop
        } else {
            performLogout(); // Fallback if onLogout is not a valid function
        }
        alert(t('sessionExpiredAlert')); 
        navigate("/sign-in"); // Redirect to the login page
      }, INACTIVITY_TIMEOUT);
    };

    const events = ["mousemove", "keydown", "scroll", "click"];
    events.forEach((event) => window.addEventListener(event, resetInactivityTimer));
    resetInactivityTimer();

    return () => { // Cleanup on component unmount
      clearTimeout(inactivityTimer);
      events.forEach((event) => window.removeEventListener(event, resetInactivityTimer));
    };
  }, [onLogout, navigate, t, INACTIVITY_TIMEOUT]); // Added t and INACTIVITY_TIMEOUT to dependencies

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUser = () => {
      // Use authUser from context instead of reading directly from localStorage
      if (authUser) {
        // setUser(authUser); // No longer needed if using authUser directly
        setLoading(false);
      } else if (!token && !loading) { // If no token and initial context loading is finished
        navigate("/sign-in");
      }
    };
    fetchUser();
  }, [authUser, token, loading, navigate]);

  // Fetch dashboard statistics based on user role
  useEffect(() => {
    if (authUser && authUser.role) {
      setStatsLoading(true);
      let statsEndpoint = "";
      if (authUser.role === "DOCTOR") {
        statsEndpoint = "/api/statistics/dashboard/doctor";
      } else if (authUser.role === "PATIENT") {
        statsEndpoint = "/api/statistics/dashboard/patient";
      } else if (authUser.role === "DOCTOR_CENTRE_EXAMEN") {
        statsEndpoint = "/api/statistics/dashboard/doctor-centre";
      } else if (authUser.role === "ADMIN") {
        statsEndpoint = "/api/statistics/dashboard/admin";
      } else if (authUser.role === "ASSISTANT") {
        statsEndpoint = "/api/statistics/dashboard/assistant";
      }
      // Could add other roles if necessary

      if (statsEndpoint) {
        apiClient.get(statsEndpoint)
          .then(response => {
            setDashboardStats(response.data);
            setStatsLoading(false);
          })
          .catch(error => {
            console.error("Error fetching dashboard statistics:", error);
            setStatsLoading(false);
            // Handle the error, maybe display a message
          });
      } else {
        setStatsLoading(false); // No endpoint for this role
      }
    }

    // La logique de fetch pour les graphiques patient a été supprimée ici.
    // Les données pour la tuile nextAcceptedAppointment sont déjà dans dashboardStats.
  }, [authUser, t]); // Depends on authUser and t to execute when the user is loaded and for translations
  
  // ---------------------------------------------------- //
 
  // Redirect if session has expired
  if (sessionExpired) return null;

  // Display loading if the context user or statistics are loading
  if (loading || (authUser && statsLoading)) {
    return <div>{t('loading')}</div>;
  }
  
  // If no authenticated user after loading, render nothing or redirect (already handled by useEffect)
  if (!authUser) {
    return null; 
  }
  
  // Rename authUser to user for the rest of the component to minimize changes
  const user = authUser;

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
        <a href="/add-cabinet">{t('nav.addCabinet')}</a>
        <a href="/manage-cabinets">{t('nav.manageCabinets')}</a> {/* Link for Admin Cabinets */}
        <a href="/add-centre">{t('nav.addExamCentre')}</a> {/* Link for Admin Centres */}
        <a href="/manage-centres">{t('nav.manageExamCentres')}</a> {/* Link for Admin Centres */}
        <a href="/admin/manage-report-templates">{t('nav.manageReportTemplates')}</a> {/* Added Manage Report Templates Link */}
        <a href="/UserManagement">{t('nav.changeRole')}</a>

        <a href="/users">{t('nav.doctorsManagement')}</a>
         {/*<a href="/bloque">{t('nav.deactivateAccounts')}</a>*/}
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
        <a href="/UserManagement">{t('nav.changeRole')}</a> {/* Consider filtering users by their cabinet */}

        <a href="/users">{t('nav.userManagement')}</a> {/* Consider filtering users by their cabinet */}
        <a href="/manage-appointments">{t('nav.manageAppointments')}</a> {/* Added Manage Appointments Link */}
                <a href="/consultation/all">{t('nav.consultationDashboard')}</a> {/* Added Consultation Dashboard Link */}

        <a href="/doctor-examinations">{t('nav.doctorExaminationsDashboard')}</a> {/* Added Doctor Examinations Dashboard Link */}
        {/*<a href="/bloque">{t('nav.deactivateAccounts')}</a> {/* Consider filtering users by their cabinet */}
        <a href="/doctor-statistics">{t('nav.statistics')}</a> {/* Added Doctor Statistics Link */}

        <a href="/parametres-cabinet">{t('nav.cabinetSettings')}</a> {/* Added Cabinet Settings Link */}
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
        <a href="/UserManagement">{t('nav.changeRole')}</a> {/* Consider filtering users by their cabinet */}

        <a href="/users">{t('nav.userManagement')}</a> {/* Consider filtering users by their cabinet */}
        {/*<a href="/bloque">{t('nav.deactivateAccounts')}</a> {/* Consider filtering users by their cabinet */}
        {/* Assistant does not manage prescriptions directly */}
        <a href="/manage-appointments">{t('nav.manageAppointments')}</a> {/* Added Manage Appointments Link */}
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
        <a href="/add-appointment">{t('nav.addAppointment')}</a>
        <a href="/my-appointments">{t('nav.myAppointments')}</a>

        <a href="/my-consultations">{t('nav.myConsultations')}</a>
        <a href="/my-examinations">{t('nav.myExaminations')}</a>
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
        <a href="/centre-examinations">{t('nav.centreExaminationsDashboard')}</a> {/* Added Centre Examinations Dashboard Link */}
                <a href="/center-statistics">{t('nav.statistics')}</a> {/* Added Center Statistics Link */}

        <a href="/archived-examinations">{t('nav.archivedExaminations')}</a> {/* Added Archived Examinations Link */}
        <a href="/upload-doctor-centre-signature">{t('nav.manageMySignature')}</a> {/* Added Manage Signature Link */}
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
            <h2>{t('dashboard.numericalStatisticsTitle')}</h2>
            <div className="tiles">
              {/* Dynamic tiles based on role and dashboardStats */}
              {user.role === "DOCTOR" && dashboardStats && (
                <>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-calendar-check-light"></i>
                      <h3>
                        <span>{t('dashboard.doctor.appointmentsToday')}</span>
                        <span>{dashboardStats.todaysAcceptedAppointments}</span>
                      </h3>
                    </div>
                    {/* <a href="#">{t('dashboard.tiles.viewDetails')}</a> */}
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-first-aid-kit-light"></i>
                      <h3>
                        <span>{t('dashboard.doctor.consultationsToday')}</span>
                        <span>{dashboardStats.todaysConsultationsRealized}</span>
                      </h3>
                    </div>
                    {/* <a href="#">{t('dashboard.tiles.viewDetails')}</a> */}
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-users-three-light"></i>
                      <h3>
                        <span>{t('dashboard.doctor.totalPatients')}</span>
                        <span>{dashboardStats.totalPatientsInCabinet}</span>
                      </h3>
                    </div>
                    {/* <a href="#">{t('dashboard.tiles.viewDetails')}</a> */}
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-clock-countdown-light"></i>
                      <h3>
                        <span>{t('dashboard.doctor.pendingConfirmationAppointments')}</span>
                        <span>{dashboardStats.pendingConfirmationAppointmentsCount}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-file-search-light"></i>
                      <h3>
                        <span>{t('dashboard.doctor.pendingExaminationRequests')}</span>
                        <span>{dashboardStats.pendingExaminationRequestsCount}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-envelope-open-light"></i>
                      <h3>
                        <span>{t('dashboard.doctor.unreadExaminationResults')}</span>
                        <span>{dashboardStats.unreadExaminationResultsCount}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-calendar-dots-light"></i> {}
                      <h3>
                        <span>{t('dashboard.doctor.totalAppointmentsThisMonth', 'Nombre de RDV (Mois)')}</span>
                        <span>{dashboardStats.totalAppointmentsThisMonthInCabinet}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-user-list-light"></i> {}
                      <h3>
                        <span>{t('dashboard.doctor.newPatientsThisMonth', 'Nouveaux Patients (Mois)')}</span>
                        <span>{dashboardStats.newPatientsThisMonthInCabinet}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-user-plus-light"></i> {}
                      <h3>
                        <span>{t('dashboard.doctor.pendingPatientRegistrations')}</span>
                        <span>{typeof dashboardStats.pendingPatientRegistrationsCount === 'number' ? dashboardStats.pendingPatientRegistrationsCount : 'N/A'}</span>
                      </h3>
                    </div>
                  </article>
                  {dashboardStats.upcomingAppointmentsToday && dashboardStats.upcomingAppointmentsToday.length > 0 && (
                    <article className="tile tile-upcoming-appointments">
                      <div className="tile-header">
                        <i className="ph-list-checks-light"></i>
                        <h3>
                          <span>{t('dashboard.doctor.upcomingAppointmentsTitle')}</span>
                        </h3>
                      </div>
                      <ul className="upcoming-appointments-list">
                        {dashboardStats.upcomingAppointmentsToday.map(appt => (
                          <li key={appt.id}>
                            {appt.time} - {appt.patientName}
                          </li>
                        ))}
                      </ul>
                    </article>
                  )}
                </>
              )}
              {user.role === "PATIENT" && dashboardStats && (
                <>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-stethoscope-light"></i>
                      <h3>
                        <span>{t('dashboard.patient.totalConsultations')}</span>
                        <span>{dashboardStats.totalConsultations}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-test-tube-light"></i>
                      <h3>
                        <span>{t('dashboard.patient.totalExams')}</span>
                        <span>{dashboardStats.totalExams}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-clock-light"></i>
                      <h3>
                        <span>{t('dashboard.patient.pendingAppointments')}</span>
                        <span>{dashboardStats.pendingAppointmentsCount}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-file-text-light"></i>
                      <h3>
                        <span>{t('dashboard.patient.availableCertificates')}</span>
                        <span>{dashboardStats.availableCertificatesCount}</span>
                      </h3>
                    </div>
                  </article>
                  {dashboardStats.nextAcceptedAppointment ? (
                    <article className="tile tile-reminder">
                      <div className="tile-header">
                        <i className="ph-calendar-plus-light"></i>
                        <h3>
                          <span>{t('dashboard.patient.nextAppointmentReminder')}</span>
                          <span>
                            {`Le ${new Date(dashboardStats.nextAcceptedAppointment.appointmentDate).toLocaleDateString()} à ${dashboardStats.nextAcceptedAppointment.appointmentTime} avec Dr. ${dashboardStats.nextAcceptedAppointment.doctorName}`}
                          </span>
                        </h3>
                      </div>
                    </article>
                  ) : (
                    <article className="tile">
                      <div className="tile-header">
                        <i className="ph-calendar-x-light"></i> {}
                        <h3>
                          <span>Aucun RDV n'est trouvé</span>
                        </h3>
                      </div>
                    </article>
                  )}
                  {dashboardStats.nextRefusedAppointmentWithProposal ? (
                    <article className="tile tile-warning"> {}
                      <div className="tile-header">
                        <i className="ph-calendar-x-light"></i> {}
                        <h3>
                          <span>{t('dashboard.patient.refusedAppointmentWithProposal')}</span>
                          <span>
                            {t('dashboard.patient.proposedDate', { date: new Date(dashboardStats.nextRefusedAppointmentWithProposal.appointmentDate).toLocaleDateString(), time: dashboardStats.nextRefusedAppointmentWithProposal.appointmentTime })}
                          </span>
                        </h3>
                      </div>
                      {}
                    </article>
                  ) : (
                    <article className="tile">
                      <div className="tile-header">
                        <i className="ph-smiley-sad-light"></i> {}
                        <h3>
                          <span>{t('dashboard.patient.noRefusedAppointmentWithProposal')}</span>
                        </h3>
                      </div>
                    </article>
                  )}
                </>
              )}
              {user.role === "ASSISTANT" && dashboardStats && (
                <>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-calendar-check-light"></i>
                      <h3>
                        <span>{t('dashboard.assistant.appointmentsToday')}</span>
                        <span>{dashboardStats.todaysAcceptedAppointments}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-clock-countdown-light"></i>
                      <h3>
                        <span>{t('dashboard.assistant.pendingConfirmationAppointments')}</span>
                        <span>{dashboardStats.pendingConfirmationAppointmentsCount}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-user-plus-light"></i>
                      <h3>
                        <span>{t('dashboard.assistant.pendingPatientRegistrations')}</span>
                        <span>{dashboardStats.pendingPatientRegistrationsCount}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-users-three-light"></i>
                      <h3>
                        <span>{t('dashboard.assistant.totalPatientsInCabinet')}</span>
                        <span>{dashboardStats.totalPatientsInCabinet}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-user-check-light"></i>
                      <h3>
                        <span>{t('dashboard.assistant.patientsActivatedToday')}</span>
                        <span>{dashboardStats.patientsActivatedTodayInCabinet}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-users-light"></i>
                      <h3>
                        <span>{t('dashboard.assistant.newUsersToday')}</span>
                        <span>{dashboardStats.newUsersTodayInCabinet}</span>
                      </h3>
                    </div>
                  </article>
                </>
              )}
              {/* Les sections pour les graphiques patient ont été supprimées */}
              {user.role === "DOCTOR_CENTRE_EXAMEN" && dashboardStats && (
                <>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-clipboard-text-light"></i>
                      <h3>
                        <span>{t('dashboard.doctorCentre.examsPerformedToday')}</span>
                        <span>{dashboardStats.examsPerformedTodayCount}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-hourglass-medium-light"></i>
                      <h3>
                        <span>{t('dashboard.doctorCentre.pendingExams')}</span>
                        <span>{dashboardStats.pendingExamsCount}</span>
                      </h3>
                    </div>
                  </article>
                  {/* Upcoming Exams Tile Removed based on user request */}
                  {/* {dashboardStats.upcomingExamsToday && dashboardStats.upcomingExamsToday.length > 0 && (
                    <article className="tile tile-upcoming-appointments">
                      <div className="tile-header">
                        <i className="ph-list-checks-light"></i>
                        <h3>
                          <span>{t('dashboard.doctorCentre.upcomingExamsTitle')}</span>
                        </h3>
                      </div>
                      <ul className="upcoming-appointments-list">
                        {dashboardStats.upcomingExamsToday.map(exam => (
                          <li key={exam.id}>
                            {exam.time} - {exam.patientName}
                          </li>
                        ))}
                      </ul>
                    </article>
                  )} */}
                </>
              )}
              {user.role === "ADMIN" && dashboardStats && (
                <>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-users-four-light"></i>
                      <h3>
                        <span>{t('dashboard.admin.totalUsers')}</span>
                        <span>{dashboardStats.totalUsers}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-user-list-light"></i>
                      <h3>
                        <span>{t('dashboard.admin.totalPatients')}</span>
                        <span>{dashboardStats.totalPatients}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-first-aid-light"></i> {/* Icon for doctors */}
                      <h3>
                        <span>{t('dashboard.admin.totalDoctors')}</span>
                        <span>{dashboardStats.totalDoctors}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-user-gear-light"></i> {/* Icon for assistants */}
                      <h3>
                        <span>{t('dashboard.admin.totalAssistants')}</span>
                        <span>{dashboardStats.totalAssistants}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-hospital-light"></i> {/* Icon for doctor centres */}
                      <h3>
                        <span>{t('dashboard.admin.totalDoctorCentres')}</span>
                        <span>{dashboardStats.totalDoctorCentres}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-buildings-light"></i>
                      <h3>
                        <span>{t('dashboard.admin.totalCabinets')}</span>
                        <span>{dashboardStats.totalCabinets}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-flask-light"></i>
                      <h3>
                        <span>{t('dashboard.admin.totalExamCentres')}</span>
                        <span>{dashboardStats.totalExamCentres}</span>
                      </h3>
                    </div>
                  </article>
                  {/* <article className="tile">
                    <div className="tile-header">
                      <i className="ph-user-plus-light"></i>
                      <h3>
                        <span>{t('dashboard.admin.newUsersThisWeek')}</span>
                        <span>{dashboardStats.newUsersThisWeek}</span>
                      </h3>
                    </div>
                  </article> */}
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-calendar-plus-light"></i>
                      <h3>
                        <span>{t('dashboard.admin.newUsersThisMonth')}</span>
                        <span>{dashboardStats.newUsersThisMonth}</span>
                      </h3>
                    </div>
                  </article>
                  {/* <article className="tile">
                    <div className="tile-header">
                      <i className="ph-calendar-check-light"></i>
                      <h3>
                        <span>{t('dashboard.admin.appointmentsToday')}</span>
                        <span>{dashboardStats.appointmentsToday}</span>
                      </h3>
                    </div>
                  </article> */}
                  {/* <article className="tile">
                    <div className="tile-header">
                      <i className="ph-calendar-dots-light"></i>
                      <h3>
                        <span>{t('dashboard.admin.appointmentsThisWeek')}</span>
                        <span>{dashboardStats.appointmentsThisWeek}</span>
                      </h3>
                    </div>
                  </article> */}
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-calendar-blank-light"></i>
                      <h3>
                        <span>{t('dashboard.admin.appointmentsThisMonth')}</span>
                        <span>{dashboardStats.appointmentsThisMonth}</span>
                      </h3>
                    </div>
                  </article>
                  {/* <article className="tile">
                    <div className="tile-header">
                      <i className="ph-stethoscope-light"></i>
                      <h3>
                        <span>{t('dashboard.admin.consultationsToday')}</span>
                        <span>{dashboardStats.consultationsToday}</span>
                      </h3>
                    </div>
                  </article> */}
                  {/* <article className="tile">
                    <div className="tile-header">
                      <i className="ph-heartbeat-light"></i>
                      <h3>
                        <span>{t('dashboard.admin.consultationsThisWeek')}</span>
                        <span>{dashboardStats.consultationsThisWeek}</span>
                      </h3>
                    </div>
                  </article> */}
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-activity-light"></i>
                      <h3>
                        <span>{t('dashboard.admin.consultationsThisMonth')}</span>
                        <span>{dashboardStats.consultationsThisMonth}</span>
                      </h3>
                    </div>
                  </article>
                  {/* <article className="tile">
                    <div className="tile-header">
                      <i className="ph-test-tube-light"></i>
                      <h3>
                        <span>{t('dashboard.admin.examsToday')}</span>
                        <span>{dashboardStats.examsToday}</span>
                      </h3>
                    </div>
                  </article> */}
                  {/* <article className="tile">
                    <div className="tile-header">
                      <i className="ph-thermometer-cold-light"></i>
                      <h3>
                        <span>{t('dashboard.admin.examsThisWeek')}</span>
                        <span>{dashboardStats.examsThisWeek}</span>
                      </h3>
                    </div>
                  </article> */}
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-microscope-light"></i>
                      <h3>
                        <span>{t('dashboard.admin.examsThisMonth')}</span>
                        <span>{dashboardStats.examsThisMonth}</span>
                      </h3>
                    </div>
                  </article>
                  <article className="tile">
                    <div className="tile-header">
                      <i className="ph-file-text-light"></i> {}
                      <h3>
                        <span>{t('dashboard.admin.generatedMedicalReportsMonth')}</span>
                        <span>{dashboardStats.medicalReportsGeneratedThisMonth}</span>
                      </h3>
                    </div>
                  </article>
                </>
              )}
              {/* Keep static tiles if no custom stats are loaded or for other roles */}
              {(!dashboardStats && !statsLoading) && (
                <>
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
                  {/* ... other static tiles ... */}
                </>
              )}
            </div>
          </section>
  
          {/* The "Performance" section can also be conditional or customized */}
          {/* 
          <section className="service-section">
            <h2>{t('dashboard.performanceSectionTitle')}</h2>
            <div className="tiles">
              ...
            </div>
          </section> 
          */}
  
          {/* Only display charts for specific roles if needed, or remove if not used */}
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
          {/* Conditionally render the Chatbot for DOCTOR role */}
          {user.role === 'DOCTOR' && <Chatbot />}

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
            <div className="user-info-item">
              <img
                src={
                  user.photoProfil
                    ? `data:image/jpeg;base64,${user.photoProfil}`
                    : user.gender // Check if gender exists first
                      ? (user.gender.toLowerCase() === 'male' || user.gender.toLowerCase() === 'homme')
                        ? '/images/avatar%20%20homme.jpg' // Correct path with double space encoded
                        : (user.gender.toLowerCase() === 'female' || user.gender.toLowerCase() === 'femme')
                          ? '/images/avatar%20%20femme.jpg' // Correct path with double space encoded
                          : '/images/avatar%20%20femme.jpg' // Default to female if gender exists but isn't recognized male/female
                      : '/images/avatar%20%20femme.jpg' // Default to female if gender doesn't exist
                }
                alt={t('dashboard.sidebar.profileAlt')} // Added translation for alt text
                style={{ width: '100px', height: '100px', borderRadius: '50%' }}
              />
            </div>

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
              <p><strong>{t('dashboard.sidebar.specialtyLabel')}:</strong> <span>{user.speciality ? user.speciality : t('dashboard.sidebar.notProvided')}</span></p> {/* Corrected field name */}
            </div>
          )}
             
          </div>
        </div>
      </div>
    </div>
  );}
export default Dashboard;
