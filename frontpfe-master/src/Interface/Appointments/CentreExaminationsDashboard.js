import React, { useState, useEffect, useContext, useCallback } from 'react'; // Added useCallback
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import AuthContext from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { clearUserData, getToken, isTokenExpired } from '../../utils/auth'; // Import auth utils
import './CentreExaminationsDashboard.css'; // Optional: Create and import CSS

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const CentreExaminationsDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [examinations, setExaminations] = useState([]);
    const [filteredExaminations, setFilteredExaminations] = useState([]);
    const [searchTerm, setSearchTerm] = useState(''); // For patient name search
    const [selectedAct, setSelectedAct] = useState(''); // For act filter
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); // Added state for status update loading
    const [error, setError] = useState('');

    const acts = ["IRM", "Radio", "Analyse sanguine", "Scanner", "Echographie", "Autre"]; // Define available acts

    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert(t('centreExaminationsDashboard.alerts.sessionExpired')); // Add translation key
        navigate("/sign-in");
    }, [navigate, t]);

    // --- Token Expiry & Inactivity Checks ---
    useEffect(() => {
        const token = getToken();
        if (!token || isTokenExpired(token)) {
            performLogout();
            return;
        }
        let expiryTimer;
        try {
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            const expiryTime = decodedToken.exp * 1000;
            const currentTime = Date.now();
            const timeToExpire = expiryTime - currentTime;
            if (timeToExpire > 0) {
                expiryTimer = setTimeout(performLogout, timeToExpire);
            } else {
                performLogout();
                return;
            }
        } catch (err) {
            console.error("Error decoding token for expiry check:", err);
            performLogout();
            return;
        }
        let inactivityTimer;
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(performLogout, INACTIVITY_TIMEOUT);
        };
        const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
        activityEvents.forEach(event => window.addEventListener(event, resetTimer));
        resetTimer();

        return () => {
            clearTimeout(expiryTimer);
            clearTimeout(inactivityTimer);
            activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [performLogout]);


    // Fetch examinations for the logged-in DOCTOR_CENTRE_EXAMEN
    useEffect(() => {
        const fetchExaminationsForCentre = async () => {
            if (!user || user.role !== 'DOCTOR_CENTRE_EXAMEN' || !user.id) {
                setError(t('centreExaminationsDashboard.errors.unauthorizedOrMissingInfo'));
                setIsLoading(false);
                return;
            }
            // Assuming the user object for DOCTOR_CENTRE_EXAMEN has a 'centreName' or similar field
            // For now, let's assume we fetch all 'en attente' exams and filter client-side,
            // or the backend provides an endpoint based on the logged-in centre doctor.
            // Let's aim for a backend endpoint: /api/medical-examinations/centre/me
            // This endpoint should return exams assigned to this doctor's centre and are 'en attente'.

            setIsLoading(true);
            setError('');
            try {
                const response = await apiClient.get('/api/medical-examinations/centre/pending');
                setExaminations(response.data || []);
                setFilteredExaminations(response.data || []); // Initialize filtered list
            } catch (err) {
                console.error(t('centreExaminationsDashboard.errors.fetchFailed'), err);
                setError(err.response?.data?.message || t('centreExaminationsDashboard.errors.fetchFailedFallback'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchExaminationsForCentre();
    }, [user, t]);

    // Filter logic
    useEffect(() => {
        let currentExaminations = examinations;

        // Filter by selected act
        if (selectedAct) {
            currentExaminations = currentExaminations.filter(exam => exam.act === selectedAct);
        }

        // Filter by search term (patient name)
        if (searchTerm) {
            currentExaminations = currentExaminations.filter(exam => {
                // Utiliser directement les champs patientFirstName et patientLastName du DTO
                const patientName = `${exam.patientFirstName || ''} ${exam.patientLastName || ''}`.toLowerCase();
                return patientName.includes(searchTerm.toLowerCase());
            });
        }
        setFilteredExaminations(currentExaminations);
    }, [searchTerm, selectedAct, examinations]);


    const handlePrescribeReport = (exam) => { // Made synchronous, no async/await needed now
        // Navigate to the report prescription page, passing the examination ID
        navigate(`/centre/examination/${exam.idExam}/prescribe-report`);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            // Handle invalid date string, perhaps return original string or an error message
            return dateString; // Or return "Invalid Date" or similar
        }
        const locale = t('common.locale') || 'en-US'; // Use fallback locale if translation is missing
        try {
            return date.toLocaleDateString(locale, {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            console.error("Error formatting date with locale:", locale, dateString, e);
            return date.toLocaleDateString('en-US', { // Fallback to a known good locale
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        }
    };

    if (isLoading) {
        return <div className="container mt-5"><p>{t('centreExaminationsDashboard.loading')}</p></div>;
    }

    if (error) {
        return <div className="container mt-5 alert alert-danger">{error}</div>;
    }

    return (
        <div className="user-table-container">
            <h2>{t('centreExaminationsDashboard.title')}</h2>

            {/* Act Filter */}
            <div className="mb-3">
                <h5>{t('centreExaminationsDashboard.filterByAct')}</h5>
                {acts.map(act => (
                    <div key={act} className="form-check form-check-inline">
                        <input
                            className="form-check-input"
                            type="radio"
                            name="actFilter"
                            id={`act-${act}`}
                            value={act}
                            checked={selectedAct === act}
                            onChange={(e) => setSelectedAct(e.target.value)}
                        />
                        <label className="form-check-label" htmlFor={`act-${act}`}>
                            {t(`medicalExaminationForm.examTypes.${act.toLowerCase().replace(' ', '')}`, act)}
                        </label>
                    </div>
                ))}
            </div>
            
            {/* Search Bar by Patient Name */}
            <div className="mb-3">
                <input
                    type="text"
                    className="form-control"
                    placeholder={t('centreExaminationsDashboard.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filteredExaminations.length === 0 ? (
                <p>{t('centreExaminationsDashboard.noExaminationsFound')}</p>
            ) : (
                <table className="table table-striped table-hover custom-table">
                    <thead>
                        <tr>
                            <th>{t('centreExaminationsDashboard.tableHeaders.dateRequest')}</th>
                            <th>{t('centreExaminationsDashboard.tableHeaders.patientName')}</th>
                            <th>{t('centreExaminationsDashboard.tableHeaders.act')}</th>
                            <th>{t('centreExaminationsDashboard.tableHeaders.recommendation')}</th>
                            <th>{t('centreExaminationsDashboard.tableHeaders.prescribingDoctor')}</th>
                            <th>{t('centreExaminationsDashboard.tableHeaders.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredExaminations.map(exam => (
                            <tr key={exam.idExam}>
                                <td>{formatDate(exam.createdAt)}</td>
                                {/* Use direct DTO fields */}
                                <td>{exam.patientFirstName} {exam.patientLastName}</td>
                                <td>{exam.act}</td>
                                <td style={{maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}
                                    dangerouslySetInnerHTML={{ __html: exam.recommandation || '' }}>
                                </td>
                                {/* Use direct DTO fields */}
                                <td>{exam.doctorFirstName} {exam.doctorLastName}</td>
                                <td>
                                    {exam.etat === 'en attente' && (
                                        <button
                                            className="btn btn-sm btn-success"
                                            onClick={() => handlePrescribeReport(exam)}
                                            disabled={isUpdatingStatus} // Disable button during update
                                        >
                                            {isUpdatingStatus ? t('common.loading') : t('centreExaminationsDashboard.buttons.prescribeReport')}
                                        </button>
                                    )}
                                    {/* Keep the View Report button logic */}
                                    {exam.etat === 'terminé' && exam.resultat && (
                                         <button
                                            className="btn btn-sm btn-info"
                                            onClick={() => { /* Logic to view/print already generated report */
                                                const reportWindow = window.open('', '_blank', 'width=800,height=600');
                                                if (reportWindow) {
                                                    reportWindow.document.write('<html><head><title>' + t('doctorExaminationsDashboard.reportWindowTitle') + '</title>');
                                                    reportWindow.document.write('<style>body { font-family: sans-serif; padding: 15px; }</style>');
                                                    reportWindow.document.write('</head><body>');
                                                    reportWindow.document.write('<h3>' + t('doctorExaminationsDashboard.reportContent') + '</h3><hr/>');
                                                    reportWindow.document.write(exam.resultat);
                                                    reportWindow.document.write('</body></html>');
                                                    reportWindow.document.close();
                                                } else {
                                                    alert(t('centreExaminationsDashboard.errors.popupBlocked'));
                                                }
                                            }}
                                        >
                                            {t('centreExaminationsDashboard.buttons.viewReport')}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default CentreExaminationsDashboard;
