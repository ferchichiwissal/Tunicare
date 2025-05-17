import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import AuthContext from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
// import './DoctorExaminationsDashboard.css'; // Optional: Create and import CSS

const DoctorExaminationsDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [examinations, setExaminations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('en attente'); // 'tous', 'en attente', 'terminé'
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch examinations for the logged-in doctor
    useEffect(() => {
        const fetchExaminations = async () => {
            if (!user || user.role !== 'DOCTOR' || !user.id) {
                setError(t('doctorExaminationsDashboard.errors.unauthorizedOrMissingInfo'));
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError(''); // Clear previous errors
            try {
                // Use the new specific endpoint for the logged-in doctor
                const response = await apiClient.get('/api/medical-examinations/doctor/me');
                setExaminations(response.data || []);

            } catch (err) {
                console.error(t('doctorExaminationsDashboard.errors.fetchFailed'), err);
                setError(err.response?.data?.message || t('doctorExaminationsDashboard.errors.fetchFailedFallback'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchExaminations();
    }, [user, t]);

    const handleModifier = (exam) => {
        // Use direct IDs from DTO
        if (exam.etat === 'en attente') {
            navigate(`/consultation/exam/new?patientId=${exam.patientId}&appointmentId=${exam.rendezVousId}&consultationId=${exam.consultationId}&examId=${exam.idExam}`);
        } else {
            alert(t('doctorExaminationsDashboard.alerts.cannotModify'));
        }
    };

    const handleVoirResultat = (exam) => {
        // Navigate to the new examination result page
        // The button's disabled state already ensures that we only navigate if a result might be available.
        // (exam.resultat is present OR exam.etat === 'terminé')
        if (exam.idExam) {
            navigate(`/examination-result/${exam.idExam}`);
        } else {
            console.error(t('doctorExaminationsDashboard.errors.missingExamId'));
            alert(t('doctorExaminationsDashboard.errors.cannotViewReportError'));
        }
    };

    const handleSupprimer = async (examId) => {
        const examToDelete = examinations.find(ex => ex.idExam === examId);
        if (!examToDelete || examToDelete.etat !== 'en attente') {
            alert(t('doctorExaminationsDashboard.alerts.cannotDelete'));
            return;
        }

        if (window.confirm(t('doctorExaminationsDashboard.alerts.confirmDelete'))) {
            try {
                await apiClient.delete(`/api/medical-examinations/${examId}`); // Assuming a DELETE endpoint exists
                setExaminations(prevExams => prevExams.filter(exam => exam.idExam !== examId));
                alert(t('doctorExaminationsDashboard.alerts.deleteSuccess'));
            } catch (err) {
                console.error(t('doctorExaminationsDashboard.errors.deleteFailed'), err);
                alert(err.response?.data?.message || t('doctorExaminationsDashboard.errors.deleteFailedFallback'));
            }
        }
    };

    const handleHideExam = async (examIdToHide) => {
        try {
            await apiClient.put(`/api/medical-examinations/${examIdToHide}/hide-for-doctor`);
            setExaminations(prevExams => prevExams.filter(exam => exam.idExam !== examIdToHide));
            // Optionnel: afficher une notification de succès
        } catch (err) {
            console.error("Erreur lors du masquage de l'examen pour le docteur:", err);
            setError(err.response?.data?.message || "Erreur lors de la tentative de masquage de l'examen.");
            // Optionnel: afficher une notification d'erreur à l'utilisateur
        }
    };

    // Filter examinations based on search term and status filter
    const filteredExaminations = examinations.filter(exam => {
        const patientNameMatch = `${exam.patientFirstName || ''} ${exam.patientLastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
        // Le filtre 'tous' est retiré, donc on filtre directement sur le statut sélectionné
        const statusMatch = exam.etat === statusFilter;
        return patientNameMatch && statusMatch;
    });

    const formatDate = (dateString) => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Les mois sont de 0 à 11
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');

            return `${day}/${month}/${year} ${hours}:${minutes}`;
        } catch (e) {
            console.error("Erreur de formatage de date:", e, "Chaîne de date:", dateString);
            return "Date invalide";
        }
    };


    if (isLoading) {
        return <div className="container mt-5"><p>{t('doctorExaminationsDashboard.loading')}</p></div>;
    }

    if (error) {
        return <div className="container mt-5 alert alert-danger">{error}</div>;
    }

    return (
        <div className="user-table-container"> {/* Use the container class */}
            <h2>{t('doctorExaminationsDashboard.title')}</h2>

            {/* Filter Section (Radio Buttons) */}
            <div className="mb-3"> {/* Add margin bottom */}
                <div className="form-check form-check-inline"> {/* Use form-check and form-check-inline */}
                    <input
                        className="form-check-input"
                        type="radio"
                        name="statusFilter"
                        id="statusEnAttente"
                        value="en attente"
                        checked={statusFilter === 'en attente'}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    />
                    <label className="form-check-label" htmlFor="statusEnAttente">
                        {t('doctorExaminationsDashboard.statusFilters.pending', 'En attente')}
                    </label>
                </div>
                <div className="form-check form-check-inline">
                    <input
                        className="form-check-input"
                        type="radio"
                        name="statusFilter"
                        id="statusTermine"
                        value="terminé"
                        checked={statusFilter === 'terminé'}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    />
                    <label className="form-check-label" htmlFor="statusTermine">
                        {t('doctorExaminationsDashboard.statusFilters.completed', 'Terminé')}
                    </label>
                </div>
            </div>

            {/* Search Section */}
            <div className="mb-4"> {/* Add margin bottom */}
                <input
                    type="text"
                    className="form-control"
                    placeholder={t('doctorExaminationsDashboard.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {isLoading && <p>{t('doctorExaminationsDashboard.loading')}</p>} {/* Loading indicator */}
            {error && <div className="alert alert-danger">{error}</div>} {/* Error message */}

            {/* Add Bootstrap responsive table wrapper */}
            <div className="table-responsive">
                {filteredExaminations.length === 0 && !isLoading && !error ? (
                    <p>{t('doctorExaminationsDashboard.noExaminationsFound')}</p>
                ) : (
                    <table className="table table-striped table-hover custom-table"> {/* Add Bootstrap table classes */}
                        <thead>
                            <tr>
                                <th>{t('doctorExaminationsDashboard.tableHeaders.dateRequest')}</th>
                                <th>{t('doctorExaminationsDashboard.tableHeaders.patientName')}</th>
                                <th>{t('doctorExaminationsDashboard.tableHeaders.act')}</th>
                                <th>{t('doctorExaminationsDashboard.tableHeaders.recommendation')}</th>
                                <th>{t('doctorExaminationsDashboard.tableHeaders.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExaminations.map(exam => (
                                <tr key={exam.idExam}>
                                    <td>{formatDate(exam.createdAt)}</td>
                                    <td>{exam.patientFirstName} {exam.patientLastName}</td>
                                    <td>{exam.act}</td>
                                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                        dangerouslySetInnerHTML={{ __html: exam.recommandation || '' }}>
                                    </td>
                                    {/* Removed Status column */}
                                    <td>
                                        {statusFilter === 'en attente' && exam.etat === 'en attente' && (
                                            <>
                                                <button
                                                    className="btn btn-sm btn-info me-1 edit-button"
                                                    onClick={() => handleModifier(exam)}
                                                >
                                                    {t('doctorExaminationsDashboard.buttons.modify')} ✏️
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-info delete-button"
                                                    style={{ backgroundColor: '#00c6a9', borderColor: '#00c6a9' }}
                                                    onClick={() => handleSupprimer(exam.idExam)}
                                                >
                                                    {t('doctorExaminationsDashboard.buttons.delete')} 🗑️
                                                </button>
                                            </>
                                        )}
                                        {statusFilter === 'terminé' && exam.etat === 'terminé' && (
                                            <>
                                                <button
                                                    className="btn btn-sm btn-info me-1"
                                                    onClick={() => handleVoirResultat(exam)}
                                                >
                                                    {t('doctorExaminationsDashboard.buttons.viewResult')} 📄
                                                </button>
                                                <button
                                                    onClick={() => handleHideExam(exam.idExam)}
                                                    className="btn btn-outline-secondary btn-sm"
                                                    title={t('doctorExaminationsDashboard.tooltips.hideExam')}
                                                >
                                                    {t('doctorExaminationsDashboard.buttons.hideExam')} 👁️‍🗨️
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default DoctorExaminationsDashboard;
