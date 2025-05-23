import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { Link, useNavigate } from 'react-router-dom'; // Importer Link pour la navigation, Added useNavigate
import apiClient from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { clearUserData, getToken, isTokenExpired } from '../../utils/auth'; // Import auth utils
import './ConsultationDashboard.css'; // Import ConsultationDashboard CSS

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const ArchivedExaminationsPage = () => {
    const { t } = useTranslation(); // Initialize useTranslation
    const [archivedExams, setArchivedExams] = useState([]);
    const [searchTerm, setSearchTerm] = useState(''); // État pour le terme de recherche
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth(); // Utiliser le hook useAuth
    const navigate = useNavigate(); // Initialize useNavigate

    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert(t('archivedExaminationsPage.alerts.sessionExpired')); // Add translation key
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


    useEffect(() => {
        const fetchArchivedExams = async () => {
            if (user && user.role === 'DOCTOR_CENTRE_EXAMEN') {
                try {
                    setLoading(true);
                    const response = await apiClient.get('/api/medical-examinations/centre/archived');
                    setArchivedExams(response.data);
                    setError(null);
                } catch (err) {
                    console.error(t('archivedExaminationsPage.errors.fetchFailed'), err);
                    setError(err.response?.data?.message || err.message || t('archivedExaminationsPage.errors.fetchFailedFallback'));
                    setArchivedExams([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
                setError(t('archivedExaminationsPage.errors.unauthorizedOrIncorrectRole'));
            }
        };

        fetchArchivedExams();
    }, [user, t]); // Added t to dependency array

    if (loading) {
        return <div className="container mt-5"><p className="text-center">{t('archivedExaminationsPage.loading')}</p></div>;
    }

    if (error) {
        return <div className="container mt-5"><div className="alert alert-danger" role="alert">{error}</div></div>;
    }

    if (!user || user.role !== 'DOCTOR_CENTRE_EXAMEN') {
        return (
            <div className="container mt-5">
                <div className="alert alert-warning" role="alert">
                    {t('archivedExaminationsPage.errors.accessDenied')}
                </div>
            </div>
        );
    }

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleHideExam = async (examIdToHide) => {
        try {
            await apiClient.put(`/api/medical-examinations/${examIdToHide}/hide-for-centre-doctor`);
            setArchivedExams(prevExams => prevExams.filter(exam => exam.idExam !== examIdToHide));
            // Optionnel: afficher une notification de succès
        } catch (err) {
            console.error(t('archivedExaminationsPage.errors.hideFailedCentre'), err);
            setError(err.response?.data?.message || t('archivedExaminationsPage.errors.hideFailedCentreFallback'));
            // Optionnel: afficher une notification d'erreur à l'utilisateur
        }
    };

    const filteredExams = archivedExams.filter(exam => {
        const patientFullName = `${exam.patientFirstName || ''} ${exam.patientLastName || ''}`.toLowerCase();
        return patientFullName.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="consultation-dashboard-container container mt-5">
            <h2 className="text-center mb-4">{t('archivedExaminationsPage.title')}</h2>

            <div className="mb-3">
                <input
                    type="text"
                    className="form-control"
                    placeholder={t('archivedExaminationsPage.searchPlaceholder')}
                    value={searchTerm}
                    onChange={handleSearchChange}
                />
            </div>

            {filteredExams.length === 0 ? (
                <p className="text-center">
                    {searchTerm ? t('archivedExaminationsPage.noExamsFoundSearch') : t('archivedExaminationsPage.noArchivedExamsFound')}
                </p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-striped table-hover custom-table">
                        <thead>
                            <tr>
                                <th>{t('archivedExaminationsPage.tableHeaders.patient')}</th>
                                <th>{t('archivedExaminationsPage.tableHeaders.examType')}</th>
                                <th>{t('archivedExaminationsPage.tableHeaders.creationDate')}</th>
                                {/* Statut retiré car tous sont 'terminé' */}
                                <th>{t('archivedExaminationsPage.tableHeaders.action')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExams.map((exam) => (
                                <tr key={exam.idExam}>
                                    <td>{exam.patientFirstName} {exam.patientLastName}</td>
                                    <td>{exam.act}</td>
                                    <td>{new Date(exam.createdAt).toLocaleDateString()}</td>
                                    {/* Statut retiré */}
                                    <td>
                                        <Link to={`/examination-result/${exam.idExam}`} className="btn btn-primary btn-sm me-2">
                                            {t('archivedExaminationsPage.buttons.viewResult')}
                                        </Link>
                                        <button
                                            onClick={() => handleHideExam(exam.idExam)}
                                            className="btn btn-primary btn-sm"
                                            title={t('archivedExaminationsPage.tooltips.hideExam')}
                                        >
                                            {t('archivedExaminationsPage.buttons.hideExam')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ArchivedExaminationsPage;
