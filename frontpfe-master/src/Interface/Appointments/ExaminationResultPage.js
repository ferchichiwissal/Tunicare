import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import AuthContext from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import './ExaminationResultPage.css'; // We will create this CSS file

const ExaminationResultPage = () => {
    const { t } = useTranslation();
    const { examinationId } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [examinationDetails, setExaminationDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchExaminationDetails = async () => {
            if (!user) {
                setError(t('examinationResultPage.errors.unauthorized'));
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError('');
            try {
                // Assume an endpoint like this exists or will be created
                // It should return data similar to the image:
                // centreName, centreAddress, centrePhone, patientFirstName, patientLastName,
                // examinationDate, examinationType, examinationResultText (HTML),
                // doctorCentreExamenName
                const response = await apiClient.get(`/api/medical-examinations/${examinationId}/result`);
                setExaminationDetails(response.data);
            } catch (err) {
                console.error(t('examinationResultPage.errors.fetchFailed'), err);
                setError(err.response?.data?.message || t('examinationResultPage.errors.fetchFailedFallback'));
            } finally {
                setIsLoading(false);
            }
        };

        if (examinationId) {
            fetchExaminationDetails();
        }
    }, [examinationId, user, t]);

    const formatDate = (dateString) => {
        if (!dateString) return "";
        // Assuming dateString is a valid date format, adjust if needed
        return new Date(dateString).toLocaleDateString(t('common.locale'), {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    if (isLoading) {
        return <div className="container mt-5"><p>{t('examinationResultPage.loading')}</p></div>;
    }

    if (error) {
        return <div className="container mt-5 alert alert-danger">{error} <button onClick={() => navigate(-1)} className="btn btn-link">{t('common.back')}</button></div>;
    }

    if (!examinationDetails) {
        return <div className="container mt-5"><p>{t('examinationResultPage.noDetails')}</p> <button onClick={() => navigate(-1)} className="btn btn-link">{t('common.back')}</button></div>;
    }

    // Destructure with fallbacks for safety, assuming backend DTO structure
    const {
        centreName = t('examinationResultPage.unknownCentre'),
        centreAddress = '',
        centrePhone = '',
        patientName = '', // Combined name from DTO
        examinationDate, 
        examinationType = '', // from DTO, maps to examinationAct
        examinationResultText = '', // from DTO, maps to examinationResultat
        doctorCentreExamenName = '' // Combined name from DTO
    } = examinationDetails;

    return (
        <div className="examination-result-container container mt-4 mb-4">
            <div className="card">
                <div className="card-header text-center">
                    <h4>{centreName}</h4>
                    <p className="mb-0">{centreAddress}</p>
                    <p className="mb-0">{centrePhone}</p>
                </div>
                <div className="card-body">
                    <h3 className="text-center mb-4">{t('examinationResultPage.title')}</h3>
                    <hr />
                    <div className="patient-info mb-3">
                        <p><strong>{t('examinationResultPage.patientLabel')}:</strong> {patientName}</p>
                        <p><strong>{t('examinationResultPage.dateLabel')}:</strong> {formatDate(examinationDate)}</p>
                        <p><strong>{t('examinationResultPage.examinationLabel')}:</strong> {examinationType}</p>
                    </div>
                    <hr />
                    <div className="result-content mt-3">
                        {/* Render HTML content safely */}
                        <div dangerouslySetInnerHTML={{ __html: examinationResultText }} />
                    </div>
                    <hr />
                    {doctorCentreExamenName && doctorCentreExamenName !== "N/A" && (
                        <div className="doctor-centre-info mt-3 text-muted">
                            <p>
                                {t('examinationResultPage.doctorLabel', 'Docteur')}: {doctorCentreExamenName}
                            </p>
                        </div>
                    )}
                </div>
                <div className="card-footer text-center">
                    <button onClick={() => navigate(-1)} className="btn btn-secondary">{t('common.back')}</button>
                </div>
            </div>
        </div>
    );
};

export default ExaminationResultPage;
