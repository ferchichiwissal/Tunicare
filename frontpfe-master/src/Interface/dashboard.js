import React, { useEffect, useState, useContext } from "react"; // Added useContext
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Line, Bar, Pie } from 'react-chartjs-2';
import { jwtDecode } from "jwt-decode";
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, LineElement, PointElement, ArcElement } from 'chart.js';
import './dashboard.css';
import Chatbot from './Chatbot';
import './Chatbot.css';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import apiClient from '../utils/apiClient'; // Import apiClient

// Register chart elements
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, LineElement, PointElement, ArcElement); // Added ArcElement
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const Dashboard = ({ onLogout }) => {
  // const [user, setUser] = useState(null); // Will be replaced by useAuth()
  const { user: authUser, token } = useAuth(); // Use user from AuthContext
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [dashboardStats, setDashboardStats] = useState(null); // State for statistics
  const [statsLoading, setStatsLoading] = useState(true); // Loading state for statistics
  const [doctorMonthlyConsultations, setDoctorMonthlyConsultations] = useState([]); // State for doctor's monthly consultations
  const [doctorMonthlyPatients, setDoctorMonthlyPatients] = useState([]); // State for doctor's monthly patients
  const [monthlyStatsLoading, setMonthlyStatsLoading] = useState(true); // Loading state for monthly statistics
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // State for selected month (1-indexed)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // State for selected year
  const [monthlyAppointmentDistribution, setMonthlyAppointmentDistribution] = useState(null); // State for monthly appointment distribution
  const [monthlyAppointmentDistributionLoading, setMonthlyAppointmentDistributionLoading] = useState(true); // Loading state for monthly appointment distribution

  // New states for Admin monthly statistics
  const [adminMonthlyConsultations, setAdminMonthlyConsultations] = useState([]);
  const [adminMonthlyExams, setAdminMonthlyExams] = useState([]);
  const [adminMonthlyPatients, setAdminMonthlyPatients] = useState([]);
  const [adminMonthlyStatsLoading, setAdminMonthlyStatsLoading] = useState(true);

  // New states for Doctor Centre monthly report statistics
  const [doctorCentreMonthlyReports, setDoctorCentreMonthlyReports] = useState([]);
  const [doctorCentreReportTypes, setDoctorCentreReportTypes] = useState([]);
  const [doctorCentreReportStatsLoading, setDoctorCentreReportStatsLoading] = useState(true); // Loading state for doctor centre report statistics

  const navigate = useNavigate();
  const { t } = useTranslation();

  // Helper function to get the translation key for exam types
  const getExamTypeTranslationKey = (reportType) => {
    switch (reportType) {
      case "IRM":
        return "medicalExaminationForm.examTypes.irm";
      case "Radio":
        return "medicalExaminationForm.examTypes.radio";
      case "Blood Test":
        return "medicalExaminationForm.examTypes.analysesanguine";
      case "Scanner":
        return "medicalExaminationForm.examTypes.scanner";
      case "Ultrasound":
        return "medicalExaminationForm.examTypes.echographie";
      default:
        return ""; // No translation for unknown types as per requirement
    }
  };

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

  // Fetch dashboard statistics and monthly stats based on user role
  useEffect(() => {
    if (authUser && authUser.role) {
      setStatsLoading(true);
      setAdminMonthlyStatsLoading(true); // Start loading for admin monthly stats
      setDoctorCentreReportStatsLoading(true); // Start loading for doctor centre report stats

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

      // Fetch main dashboard stats
      if (statsEndpoint) {
        apiClient.get(statsEndpoint)
          .then(response => {
            setDashboardStats(response.data);
            setStatsLoading(false);
          })
          .catch(error => {
            console.error("Error fetching dashboard statistics:", error);
            setDashboardStats(null); // Clear previous data on error
            setStatsLoading(false);
            // Handle the error, maybe display a message
          });
      } else {
        setStatsLoading(false); // No endpoint for this role
      }

      // Fetch monthly statistics specifically for ADMIN
      if (authUser.role === "ADMIN") {
        const fetchAdminMonthlyStats = async () => {
          try {
            const consultationsResponse = await apiClient.get("/api/statistics/admin/global-consultations-per-month");
            const sortedConsultations = consultationsResponse.data.sort((a, b) => {
              if (a.year !== b.year) return a.year - b.year;
              return a.month - b.month;
            });
            setAdminMonthlyConsultations(sortedConsultations);

            const examsResponse = await apiClient.get("/api/statistics/admin/global-exams-per-month");
            const sortedExams = examsResponse.data.sort((a, b) => {
              if (a.year !== b.year) return a.year - b.year;
              return a.month - b.month;
            });
            setAdminMonthlyExams(sortedExams);

            const patientsResponse = await apiClient.get("/api/statistics/admin/global-patients-per-month");
            const sortedPatients = patientsResponse.data.sort((a, b) => {
              if (a.year !== b.year) return a.year - b.year;
              return a.month - b.month;
            });
            setAdminMonthlyPatients(sortedPatients);

            setAdminMonthlyStatsLoading(false);
          } catch (error) {
            console.error("Error fetching admin monthly statistics:", error);
            setAdminMonthlyConsultations([]);
            setAdminMonthlyExams([]);
            setAdminMonthlyPatients([]);
            setAdminMonthlyStatsLoading(false);
            // Handle error
          }
        };
        fetchAdminMonthlyStats();
      } else {
        setAdminMonthlyStatsLoading(false); // Not an admin, no monthly stats to fetch
      }

      // Fetch report statistics specifically for DOCTOR_CENTRE_EXAMEN
      if (authUser.role === "DOCTOR_CENTRE_EXAMEN" && authUser.id && authUser.centreId) { // Ensure doctorCentreId and centreId are available
        const fetchDoctorCentreReportStats = async () => {
          try {
            const monthlyReportsResponse = await apiClient.get("/api/statistics/doctor-centre/reports-per-month");
             // Sort data chronologically before setting state
            const sortedMonthlyReports = monthlyReportsResponse.data.sort((a, b) => {
                // Assuming month is in "YYYY-MM" format
                return a.month.localeCompare(b.month);
            });
            setDoctorCentreMonthlyReports(sortedMonthlyReports);

            const reportTypesResponse = await apiClient.get("/api/statistics/doctor-centre/reports-by-type");
            setDoctorCentreReportTypes(reportTypesResponse.data);

            setDoctorCentreReportStatsLoading(false);
          } catch (error) {
            console.error("Error fetching doctor centre report statistics:", error);
            setDoctorCentreMonthlyReports([]);
            setDoctorCentreReportTypes([]);
            setDoctorCentreReportStatsLoading(false);
            // Handle error
          }
        };
        fetchDoctorCentreReportStats();
      } else {
         setDoctorCentreReportStatsLoading(false); // Not a doctor centre or IDs not available
      }

    }
  }, [authUser, t]); // Depends on authUser and t to execute when the user is loaded and for translations

  // Fetch monthly statistics for Doctor charts
  useEffect(() => {
    if (authUser && authUser.role === "DOCTOR") {
      setMonthlyStatsLoading(true);
      const fetchMonthlyStats = async () => {
        try {
          const consultationsResponse = await apiClient.get("/api/statistics/doctor/consultations-per-month");
          // Sort data chronologically before setting state
          const sortedConsultations = consultationsResponse.data.sort((a, b) => {
            if (a.year !== b.year) {
              return a.year - b.year;
            }
            return a.month - b.month;
          });
          setDoctorMonthlyConsultations(sortedConsultations);

          const patientsResponse = await apiClient.get("/api/statistics/doctor/patients-per-month");
          // Sort data chronologically before setting state
          const sortedPatients = patientsResponse.data.sort((a, b) => {
            if (a.year !== b.year) {
              return a.year - b.year;
            }
            return a.month - b.month;
          });
          setDoctorMonthlyPatients(sortedPatients);

          setMonthlyStatsLoading(false);
        } catch (error) {
          console.error("Error fetching monthly statistics:", error);
          setMonthlyStatsLoading(false);
          // Handle error
        }
      };
      fetchMonthlyStats();
    } else {
      setMonthlyStatsLoading(false); // Not a doctor, no monthly stats to fetch
    }
  }, [authUser, t]); // Depends on authUser and t to execute when the user is loaded and for translations

  // Helper function to generate month options for the selector
  const getMonthOptions = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(2000, i, 1); // Use a fixed year, only month matters
      months.push({
        value: i + 1, // Month is 1-indexed for backend
        label: date.toLocaleString(t('locale'), { month: 'long' }), // Use current locale for month name
      });
    }
    return months;
  };

  // Helper function to generate year options for the selector
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    // Generate options for the last 5 years and the next 5 years
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push({ value: i, label: i.toString() });
    }
    return years;
  };

  // Fetch monthly appointment distribution for Doctor chart
  useEffect(() => {
    if (authUser && authUser.role === "DOCTOR" && selectedMonth && selectedYear) {
      setMonthlyAppointmentDistributionLoading(true);
      const fetchMonthlyAppointmentDistribution = async () => {
        try {
          const response = await apiClient.get("/api/statistics/doctor/appointment-distribution-by-month", {
            params: {
              year: selectedYear,
              month: selectedMonth
            }
          });
          // Assuming the backend returns an object like { acceptedCount: count, realizedCount: count, refusedCount: count }
          const distributionData = {
            labels: [t('dashboard.charts.appointmentsDistribution.accepted'), t('dashboard.charts.appointmentsDistribution.realized'), t('dashboard.charts.appointmentsDistribution.refused')],
            datasets: [
              {
                data: [response.data.acceptedCount, response.data.realizedCount, response.data.refusedCount],
                backgroundColor: [
                  'rgba(75, 192, 192, 0.8)', // Couleur pour "Accepté"
                  'rgba(54, 162, 235, 0.8)', // Nouvelle couleur pour "Réalisé"
                  'rgba(255, 99, 132, 0.8)', // Couleur pour "Refusé"
                ],
              },
            ],
          };
          setMonthlyAppointmentDistribution(distributionData);
          setMonthlyAppointmentDistributionLoading(false);
        } catch (error) {
          console.error("Error fetching monthly appointment distribution:", error);
          setMonthlyAppointmentDistribution(null); // Clear previous data on error
          setMonthlyAppointmentDistributionLoading(false);
          // Handle error
        }
      };
      fetchMonthlyAppointmentDistribution();
    } else if (authUser?.role !== "DOCTOR") {
      setMonthlyAppointmentDistribution(null); // Clear data if not a doctor
      setMonthlyAppointmentDistributionLoading(false);
    }
  }, [authUser, selectedMonth, selectedYear, t]); // Depends on authUser, selectedMonth, selectedYear, and t

  // Data and Options for Doctor Appointments Distribution Chart (Pie Chart)
  const doctorAppointmentsDistributionData = monthlyAppointmentDistribution; // Use the fetched data directly

  const doctorAppointmentsDistributionOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: t('dashboard.charts.appointmentsDistribution.title'),
      }
    }
  };

  // Data for Doctor Consultations Evolution Chart
  const doctorConsultationsEvolutionData = {
    labels: doctorMonthlyConsultations.map(stat => `${stat.month}/${stat.year}`),
    datasets: [
      {
        label: t('dashboard.charts.consultationsEvolution.label'),
        data: doctorMonthlyConsultations.map(stat => stat.count),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const doctorConsultationsEvolutionOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: t('dashboard.charts.consultationsEvolution.title'),
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: t('dashboard.charts.monthAxisLabel'),
        },
        grid: {
          display: true, // Enable grid lines
        },
      },
      y: {
        title: {
          display: true,
          text: t('dashboard.charts.countAxisLabel'), // Assuming a generic count label
        },
        beginAtZero: true,
        grid: {
          display: true, // Enable grid lines
        },
      },
    },
  };

  const doctorExamsEvolutionData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: t('dashboard.charts.examsEvolution.label'),
        data: [10, 15, 12, 18, 20, 25, 22, 28, 30, 35, 32, 40], // Dummy data
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
    ],
  };

  const doctorExamsEvolutionOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: t('dashboard.charts.examsEvolution.title'),
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: t('dashboard.charts.monthAxisLabel'),
        },
        grid: {
          display: false, // Keep grid lines disabled for this dummy data chart
        },
      },
      y: {
        title: {
          display: true,
          text: t('dashboard.charts.countAxisLabel'),
        },
        beginAtZero: true,
        grid: {
          display: false, // Keep grid lines disabled for this dummy data chart
        },
      },
    },
  };

  // Data for Doctor Patients Evolution Chart
  const doctorPatientsEvolutionData = {
    labels: doctorMonthlyPatients.map(stat => `${stat.month}/${stat.year}`),
    datasets: [
      {
        label: t('dashboard.charts.patientsEvolution.label'),
        data: doctorMonthlyPatients.map(stat => stat.count),
        borderColor: 'rgba(255, 159, 64, 1)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const doctorPatientsEvolutionOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: t('dashboard.charts.patientsEvolution.title'),
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: t('dashboard.charts.monthAxisLabel'),
        },
        grid: {
          display: true, // Enable grid lines
        },
      },
      y: {
        title: {
          display: true,
          text: t('dashboard.charts.countAxisLabel'),
        },
        beginAtZero: true,
        grid: {
          display: true,
        },
      },
    },
  };

  // Data for Doctor Centre Monthly Reports Chart (Curve/Histogram)
  const doctorCentreMonthlyReportsData = {
    labels: doctorCentreMonthlyReports.map(stat => stat.month),
    datasets: [
      {
        label: t('dashboard.doctorCentre.charts.monthlyReports.label'),
        data: doctorCentreMonthlyReports.map(stat => stat.reportCount),
        borderColor: 'rgba(255, 99, 132, 1)', // Red
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
        type: 'line', // Default to line, can be changed to 'bar' for histogram
      },
    ],
  };

  const doctorCentreMonthlyReportsOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: t('dashboard.doctorCentre.charts.monthlyReports.title'),
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: t('dashboard.charts.monthAxisLabel'),
        },
        grid: {
          display: true,
        },
      },
      y: {
        title: {
          display: true,
          text: t('dashboard.charts.countAxisLabel'),
        },
        beginAtZero: true,
        grid: {
          display: true,
        },
      },
    },
  };

  // Data for Doctor Centre Report Types Chart (Pie Chart)
  const doctorCentreReportTypesData = {
    labels: doctorCentreReportTypes.map(stat => t(getExamTypeTranslationKey(stat.reportType)) || stat.reportType || t('dashboard.charts.reportTypeUnknown')), // Use the translation function
    datasets: [
      {
        data: doctorCentreReportTypes.map(stat => stat.reportCount),
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)', // Blue
          'rgba(255, 205, 86, 0.8)', // Yellow
          'rgba(75, 192, 192, 0.8)', // Green
          'rgba(153, 102, 255, 0.8)', // Purple
          'rgba(255, 159, 64, 0.8)', // Orange
          'rgba(201, 203, 207, 0.8)', // Grey
        ],
      },
    ],
  };

  const doctorCentreReportTypesOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: t('dashboard.doctorCentre.charts.reportTypes.title'),
      }
    }
  };


  // ---------------------------------------------------- //

  // Redirect if session has expired
  if (sessionExpired) return null;

  // Display loading if the context user or statistics are loading
  if (loading || (authUser && statsLoading) || (authUser?.role === "DOCTOR" && monthlyStatsLoading) || (authUser?.role === "DOCTOR" && monthlyAppointmentDistributionLoading) || (authUser?.role === "ADMIN" && adminMonthlyStatsLoading) || (authUser?.role === "DOCTOR_CENTRE_EXAMEN" && doctorCentreReportStatsLoading)) {
    return <div>{t('loading')}</div>;
  }

  // If no authenticated user after loading, render nothing or redirect (already handled by useEffect)
  if (!authUser) {
    return null;
  }

  // Rename authUser to user for the rest of the component to minimize changes
  const user = authUser;

  // Data for users distribution pie chart (ADMIN only)
  const usersDistributionData = user.role === "ADMIN" && dashboardStats ? {
    labels: [t('dashboard.admin.patients'), t('dashboard.admin.doctors'), t('dashboard.admin.assistants'), t('dashboard.admin.doctorCentres')], // Added Doctor Centres
    datasets: [
      {
        data: [
          dashboardStats.totalPatients,
          dashboardStats.totalDoctors,
          dashboardStats.totalAssistants,
          dashboardStats.totalDoctorCentres // Added data for Doctor Centres
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)', // Patients (Blue)
          'rgba(255, 99, 132, 0.8)', // Doctors (Red)
          'rgba(75, 192, 192, 0.8)', // Assistants (Green)
          'rgba(255, 205, 86, 0.8)' // Doctor Centres (Yellow) - New color
        ]
      }
    ]
  } : null;

  // Options for users distribution pie chart
  const usersDistributionOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: t('dashboard.admin.usersChartTitle'),
      }
    }
  };

  // Data for Admin Consultations Evolution Chart
  const adminConsultationsEvolutionData = {
    labels: adminMonthlyConsultations.map(stat => `${stat.month}/${stat.year}`),
    datasets: [
      {
        label: t('dashboard.admin.charts.consultationsEvolution.label'),
        data: adminMonthlyConsultations.map(stat => stat.count),
        borderColor: 'rgba(75, 192, 192, 1)', // Green
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const adminConsultationsEvolutionOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: t('dashboard.admin.charts.consultationsEvolution.title'),
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: t('dashboard.charts.monthAxisLabel'),
        },
        grid: {
          display: true,
        },
      },
      y: {
        title: {
          display: true,
          text: t('dashboard.charts.countAxisLabel'),
        },
        beginAtZero: true,
        grid: {
          display: true,
        },
      },
    },
  };

  // Data for Admin Exams Evolution Chart
  const adminExamsEvolutionData = {
    labels: adminMonthlyExams.map(stat => `${stat.month}/${stat.year}`),
    datasets: [
      {
        label: t('dashboard.admin.charts.examsEvolution.label'),
        data: adminMonthlyExams.map(stat => stat.count),
        backgroundColor: 'rgba(153, 102, 255, 0.6)', // Purple
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
    ],
  };

  const adminExamsEvolutionOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: t('dashboard.admin.charts.examsEvolution.title'),
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: t('dashboard.charts.monthAxisLabel'),
        },
        grid: {
          display: true,
        },
      },
      y: {
        title: {
          display: true,
          text: t('dashboard.charts.countAxisLabel'),
        },
        beginAtZero: true,
        grid: {
          display: true,
        },
      },
    },
  };

  // Data for Admin Patients Evolution Chart
  const adminPatientsEvolutionData = {
    labels: adminMonthlyPatients.map(stat => `${stat.month}/${stat.year}`),
    datasets: [
      {
        label: t('dashboard.admin.charts.patientsEvolution.label'),
        data: adminMonthlyPatients.map(stat => stat.count),
        borderColor: 'rgba(255, 159, 64, 1)', // Orange
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const adminPatientsEvolutionOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: t('dashboard.admin.charts.patientsEvolution.title'),
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: t('dashboard.charts.monthAxisLabel'),
        },
        grid: {
          display: true,
        },
      },
      y: {
        title: {
          display: true,
          text: t('dashboard.charts.countAxisLabel'),
        },
        beginAtZero: true,
        grid: {
          display: true,
        },
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


else if (user.role === "ADMIN_CENTRE_EXAMEN") {
    navigationLinks = (
      <>
        <a href="#">{t('nav.dashboard')}</a>




        <a href={`/edit-user/${id}`}>{t('nav.editMyAccount')}</a>
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
                        {dashboardStats.upcomingAppointmentsToday.map(exam => (
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

          {/* Display charts based on role */}
          {user.role === "ADMIN" && dashboardStats && (adminMonthlyConsultations.length > 0 || adminMonthlyExams.length > 0 || adminMonthlyPatients.length > 0 || (usersDistributionData && usersDistributionData.datasets && usersDistributionData.datasets[0] && usersDistributionData.datasets[0].data.some(count => count > 0))) && (
            <section className="charts-section">
              <h2>{t('dashboard.admin.statisticsTitle')}</h2>
              <div className="admin-charts-grid"> {/* Added a parent div for grid layout */}

                {/* Admin Consultations Evolution Chart */}
                {/* Admin Consultations Evolution Chart */}
                <div className="chart-container">
                  <h4>{t('dashboard.admin.charts.consultationsEvolution.title')}</h4>
                  {adminMonthlyStatsLoading ? (
                    <div>{t('loading')}</div>
                  ) : adminMonthlyConsultations && adminMonthlyConsultations.length > 0 ? (
                    <Line data={adminConsultationsEvolutionData} options={adminConsultationsEvolutionOptions} />
                  ) : (
                    <div>{t('dashboard.charts.noDataAvailable')}</div>
                  )}
                  <p className="chart-description">{t('dashboard.admin.charts.consultationsEvolution.description')}</p>
                </div>

                {/* Admin Exams Evolution Chart */}
                 <div className="chart-container">
                  <h4>{t('dashboard.admin.charts.examsEvolution.title')}</h4>
                  {adminMonthlyStatsLoading ? (
                    <div>{t('loading')}</div>
                  ) : adminMonthlyExams && adminMonthlyExams.length > 0 ? (
                    <Bar data={adminExamsEvolutionData} options={adminExamsEvolutionOptions} />
                  ) : (
                    <div>{t('dashboard.charts.noDataAvailable')}</div>
                  )}
                  <p className="chart-description">{t('dashboard.admin.charts.examsEvolution.description')}</p>
                </div>

                {/* Admin Patients Evolution Chart */}
                <div className="chart-container">
                  <h4>{t('dashboard.admin.charts.patientsEvolution.title')}</h4>
                   {adminMonthlyStatsLoading ? (
                    <div>{t('loading')}</div>
                  ) : adminMonthlyPatients && adminMonthlyPatients.length > 0 ? (
                    <Line data={adminPatientsEvolutionData} options={adminPatientsEvolutionOptions} />
                  ) : (
                    <div>{t('dashboard.charts.noDataAvailable')}</div>
                  )}
                  <p className="chart-description">{t('dashboard.admin.charts.patientsEvolution.description')}</p>
                </div>
                {/* Users Distribution Pie Chart */}
                {usersDistributionData && usersDistributionData.datasets && usersDistributionData.datasets[0] && usersDistributionData.datasets[0].data.some(count => count > 0) && (
                  <div className="chart-container">
                    <Pie data={usersDistributionData} options={usersDistributionOptions} />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Add Charts Section for DOCTOR role */}
          {user.role === "DOCTOR" && (doctorMonthlyConsultations.length > 0 || (monthlyAppointmentDistribution && monthlyAppointmentDistribution.datasets && monthlyAppointmentDistribution.datasets[0] && monthlyAppointmentDistribution.datasets[0].data.some(count => count > 0)) || doctorMonthlyPatients.length > 0) && (
            <section className="charts-section">
              <h2>{t('dashboard.charts.visualStatisticsTitle')}</h2> {/* Added a title for the charts section */}
              <div className="doctor-charts-grid"> {/* Added a parent div with class for grid layout */}
                {/* Doctor Consultations Evolution Chart */}
                {doctorMonthlyConsultations.length > 0 && (
                  <div className="chart-container">
                    <h4>{t('dashboard.charts.consultationsEvolution.title')}</h4>
                    <Line data={doctorConsultationsEvolutionData} options={doctorConsultationsEvolutionOptions} />
                    <p className="chart-description">{t('dashboard.charts.consultationsEvolution.description')}</p>
                  </div>
                )}

                {/* Doctor Exams Evolution Chart (using dummy data for now) */}
                {/* This chart still uses dummy data as the backend method for doctor exams evolution was not implemented in the previous step */}
                 {/* Removed dummy data chart from conditional rendering check */}
                 {/* <div className="chart-container">
                    <h4>{t('dashboard.charts.examsEvolution.title')}</h4>
                    <Bar data={doctorExamsEvolutionData} options={doctorExamsEvolutionOptions} />
                    <p className="chart-description">{t('dashboard.charts.examsEvolution.description')}</p>
                  </div> */}


                {/* Month and Year Selectors for Appointment Distribution */}
                {(monthlyAppointmentDistribution && monthlyAppointmentDistribution.datasets && monthlyAppointmentDistribution.datasets[0] && monthlyAppointmentDistribution.datasets[0].data.some(count => count > 0)) && (
                <div className="chart-container"> {/* Wrap the pie chart and selectors in a container */}
                  <h4>{t('dashboard.charts.appointmentsDistribution.title')}</h4>
                  <div className="month-year-selector">
                    <label htmlFor="month-select">{t('dashboard.selectMonth')}:</label>
                    <select
                      id="month-select"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    >
                      {getMonthOptions().map(month => (
                        <option key={month.value} value={month.value}>{month.label}</option>
                      ))}
                    </select>

                    <label htmlFor="year-select" style={{ marginLeft: '10px' }}>{t('dashboard.selectYear')}:</label>
                    <select
                      id="year-select"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                      {getYearOptions().map(year => (
                        <option key={year.value} value={year.value}>{year.label}</option>
                      ))}
                    </select>
                  </div>
                  {monthlyAppointmentDistributionLoading ? (
                    <div>{t('loading')}</div>
                  ) : monthlyAppointmentDistribution ? (
                    <Pie data={doctorAppointmentsDistributionData} options={doctorAppointmentsDistributionOptions} />
                  ) : (
                    <div>{t('dashboard.charts.appointmentsDistribution.noData')}</div>
                  )}
                </div>
                )}

                {/* Doctor Patients Evolution Chart */}
                {doctorMonthlyPatients.length > 0 && (
                  <div className="chart-container">
                    <h4>{t('dashboard.charts.patientsEvolution.title')}</h4>
                    <Line data={doctorPatientsEvolutionData} options={doctorPatientsEvolutionOptions} />
                    <p className="chart-description">{t('dashboard.charts.patientsEvolution.description')}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Add Charts Section for DOCTOR_CENTRE_EXAMEN role */}
          {user.role === "DOCTOR_CENTRE_EXAMEN" && (doctorCentreMonthlyReports.length > 0 || doctorCentreReportTypes.length > 0) && (
            <section className="charts-section">
              <h2>{t('dashboard.charts.visualReportsTitle')}</h2> {/* Title for Doctor Centre charts */}
              <div className="doctor-centre-charts-grid"> {/* Added a parent div with class for grid layout */}
                {/* Doctor Centre Monthly Reports Chart (Curve/Histogram) */}
                {doctorCentreMonthlyReports.length > 0 && (
                <div className="chart-container">
                  <h4>{t('dashboard.doctorCentre.charts.monthlyReports.title')}</h4>
                  {doctorCentreReportStatsLoading ? (
                    <div>{t('loading')}</div>
                  ) : doctorCentreMonthlyReports && doctorCentreMonthlyReports.length > 0 ? (
                    <>
                      {/* Render as Line chart */}
                      <Line data={doctorCentreMonthlyReportsData} options={doctorCentreMonthlyReportsOptions} />
                      {/* Render as Bar chart (Histogram) - can choose one or offer a toggle */}
                      {/* <Bar data={doctorCentreMonthlyReportsData} options={doctorCentreMonthlyReportsOptions} /> */}
                    </>
                  ) : (
                    <div>{t('dashboard.charts.noDataAvailable')}</div>
                  )}
                  <p className="chart-description">{t('dashboard.doctorCentre.charts.monthlyReports.description')}</p>
                </div>
                )}

                {/* Doctor Centre Report Types Chart (Pie Chart) */}
                {doctorCentreReportTypes.length > 0 && (
                <div className="chart-container">
                  <h4>{t('dashboard.doctorCentre.charts.reportTypes.title')}</h4>
                  {doctorCentreReportStatsLoading ? (
                    <div>{t('loading')}</div>
                  ) : doctorCentreReportTypes && doctorCentreReportTypes.length > 0 ? (
                    <Pie data={doctorCentreReportTypesData} options={doctorCentreReportTypesOptions} />
                  ) : (
                    <div>{t('dashboard.charts.noDataAvailable')}</div>
                  )}
                  <p className="chart-description">{t('dashboard.doctorCentre.charts.reportTypes.description')}</p>
                </div>
                )}
              </div>
            </section>
          )}

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
                  {/* Removed dummy payment chart */}
                </div>

                <div className="chart-container">
                  <h4>{t('dashboard.charts.phoneCalls.title')}</h4> {/* Reuse title */}
                  {/* Removed dummy phone calls chart */}
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

            <div className="user_info-item">
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
  );
}
export default Dashboard;
