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

    // Filter examinations based on search term using DTO fields
    const filteredExaminations = examinations.filter(exam => {
        const patientName = `${exam.patientFirstName || ''} ${exam.patientLastName || ''}`.toLowerCase();
        return patientName.includes(searchTerm.toLowerCase());
    });

    const formatDate = (dateString) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleDateString(t('common.locale'), {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };


    if (isLoading) {
        return <div className="container mt-5"><p>{t('doctorExaminationsDashboard.loading')}</p></div>;
    }

    if (error) {
        return <div className="container mt-5 alert alert-danger">{error}</div>;
    }

    return (
        <div className="container mt-5">
            <h2>{t('doctorExaminationsDashboard.title')}</h2>
            
            <div className="mb-3">
                <input
                    type="text"
                    className="form-control"
                    placeholder={t('doctorExaminationsDashboard.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filteredExaminations.length === 0 ? (
                <p>{t('doctorExaminationsDashboard.noExaminationsFound')}</p>
            ) : (
                <table className="table table-striped table-hover">
                    <thead className="thead-dark">
                        <tr>
                            <th>{t('doctorExaminationsDashboard.tableHeaders.dateRequest')}</th>
                            <th>{t('doctorExaminationsDashboard.tableHeaders.patientName')}</th>
                            <th>{t('doctorExaminationsDashboard.tableHeaders.act')}</th>
                            <th>{t('doctorExaminationsDashboard.tableHeaders.recommendation')}</th>
                            <th>{t('doctorExaminationsDashboard.tableHeaders.status')}</th>
                            <th>{t('doctorExaminationsDashboard.tableHeaders.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredExaminations.map(exam => (
                            <tr key={exam.idExam}>
                                <td>{formatDate(exam.createdAt)}</td>
                                {/* Use direct patient name fields from DTO */}
                                <td>{exam.patientFirstName} {exam.patientLastName}</td>
                                <td>{exam.act}</td>
                                <td style={{maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}
                                    dangerouslySetInnerHTML={{ __html: exam.recommandation || '' }}>
                                </td>
                                <td><span className={`badge bg-${exam.etat === 'en attente' ? 'warning' : 'success'}`}>{exam.etat}</span></td>
                                <td>
                                    <button 
                                        className="btn btn-sm btn-primary me-1"
                                        onClick={() => handleModifier(exam)}
                                        disabled={exam.etat !== 'en attente'}
                                    >
                                        {t('doctorExaminationsDashboard.buttons.modify')}
                                    </button>
                                    <button 
                                        className="btn btn-sm btn-info me-1"
                                        onClick={() => handleVoirResultat(exam)}
                                        disabled={!exam.resultat && exam.etat !== 'terminé'}
                                    >
                                        {t('doctorExaminationsDashboard.buttons.viewResult')}
                                    </button>
                                    <button 
                                        className="btn btn-sm btn-danger"
                                        onClick={() => handleSupprimer(exam.idExam)}
                                        disabled={exam.etat !== 'en attente'}
                                    >
                                        {t('doctorExaminationsDashboard.buttons.delete')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default DoctorExaminationsDashboard;
