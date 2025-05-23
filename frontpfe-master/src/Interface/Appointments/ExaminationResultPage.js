import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext'; // Importer useAuth
import { useTranslation } from 'react-i18next';
import { clearUserData, getToken, isTokenExpired } from '../../utils/auth'; // Import auth utils
import { jwtDecode } from 'jwt-decode'; // Import jwt-decode
import './ExaminationResultPage.css';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ExaminationResultPage = () => {
    const { t, i18n } = useTranslation(); // Initialize useTranslation and get i18n instance
    const { examinationId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth(); // Utiliser useAuth

    const [examinationDetails, setExaminationDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
// --- Logout Function ---
const performLogout = useCallback(() => { // Wrap in useCallback
    clearUserData();
    alert(t('tovalidate.alerts.sessionExpired'));
    navigate("/sign-in");
}, [navigate, t]); // Add navigate and t dependency

// --- Token Expiry Check ---
useEffect(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
        performLogout();
    } else {
        try {
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            const expiryTime = decodedToken.exp * 1000;
            const currentTime = Date.now();
            const timeToExpire = expiryTime - currentTime;
            if (timeToExpire > 0) {
                const expiryTimer = setTimeout(performLogout, timeToExpire);
                return () => clearTimeout(expiryTimer);
            } else {
                performLogout();
            }
        } catch (error) {
            console.error("Error decoding token for expiry check:", error);
            performLogout();
        }
    }
}, [performLogout]); // Use performLogout dependency

// --- Inactivity Logout Logic ---
useEffect(() => {
    let inactivityTimer;
    const resetTimer = () => {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            console.log("Inactivity timeout reached.");
            // setSessionExpired(true); // This state is not used in this component
            performLogout();
        }, INACTIVITY_TIMEOUT);
    };
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    activityEvents.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
        clearTimeout(inactivityTimer);
        activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
    };
}, [performLogout]); // Use performLogout dependency

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
                console.error(t('examinationResultPage.consoleErrors.fetchFailed'), err);
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
        // Use i18n.language directly for locale
        return new Date(dateString).toLocaleDateString(i18n.language, {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    const printExaminationReportHtml = (htmlContent) => {
        const iframeId = 'print-examination-iframe';
        let iframe = document.getElementById(iframeId);

        if (iframe) {
            try {
                iframe.parentNode.removeChild(iframe);
            } catch (e) {
                console.warn(t('examinationResultPage.consoleWarnings.removeIframe'), e);
            }
        }

        iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        iframe.style.left = '-9999px';

        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow.document;
        const iframeWin = iframe.contentWindow;

        iframeDoc.open();
        iframeDoc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + t('examinationResultPage.reportTitle') + '</title>');
        iframeDoc.write(`
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
                .header-print { text-align: left; margin-bottom: 20px; }
                .header-print .centre-name { font-size: 1.2em; font-weight: bold; }
                .title-print { text-align: center; font-size: 1.5em; font-weight: bold; margin-bottom: 30px; }
                .patient-info-print p { margin: 5px 0; }
                .result-text-print { margin-top: 20px; }
                .footer-print { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
                .footer-print .date-print { text-align: left; }
                .footer-print .signature-print { text-align: right; }
                .signature-print img { max-width: 150px; max-height: 60px; display: block; margin-left: auto; }
                @media print {
                    @page { size: A4; margin: 20mm; }
                    body { margin: 0; -webkit-print-color-adjust: exact; color-adjust: exact; }
                }
            </style>
        `);
        iframeDoc.write('</head><body>');
        iframeDoc.write(htmlContent);
        iframeDoc.write('</body></html>');
        iframeDoc.close();

        const cleanupIframe = () => {
            const iframeToRemove = document.getElementById(iframeId);
            if (iframeToRemove) {
                try {
                    iframeToRemove.parentNode.removeChild(iframeToRemove);
                } catch (e) {
                    console.warn(t('examinationResultPage.consoleWarnings.removeIframeAfterPrint'), e);
                }
            }
        };

        try {
            setTimeout(() => {
                try {
                    iframeWin.focus();
                    iframeWin.print();
                    setTimeout(cleanupIframe, 2000);
                } catch (printError) {
                    console.error(t('examinationResultPage.consoleErrors.printExecution'), printError);
                    alert(t('examinationResultPage.errors.printExecutionError'));
                    cleanupIframe();
                }
            }, 100);
        } catch (e) {
            console.error(t('examinationResultPage.consoleErrors.printSetup'), e);
            alert(t('examinationResultPage.errors.printSetupError'));
            cleanupIframe();
        }
    };

    const handlePrint = () => {
        if (!examinationDetails) {
            setError(t('examinationResultPage.errors.noDetailsToPrint'));
            return;
        }

        const {
            centreName = t('examinationResultPage.unknownCentre'),
            centreAddress = '',
            centrePhone = '',
            patientName = '',
            examinationDate,
            examinationType = '',
            examinationResultText = '',
            reportingDoctorFirstName = '',
            reportingDoctorLastName = '',
            // Assuming signature path might be available in user context or fetched separately if needed for the image
        } = examinationDetails;
        
        // Récupérer le chemin de la signature du médecin rapporteur (DOCTOR_CENTRE_EXAMEN)
        // Cela suppose que `user` (le DOCTOR_CENTRE_EXAMEN connecté) a `signatureImagePath`
        // et que `reportingDoctorFirstName` et `reportingDoctorLastName` correspondent à `user`.
        // Une approche plus robuste serait de stocker/récupérer la signature avec l'examen ou le médecin rapporteur.
        let signatureImageHtml = '';
        if (user && user.role === 'DOCTOR_CENTRE_EXAMEN' && user.signatureImagePath) {
             // Construire l'URL complète pour l'image de signature
             // Assurez-vous que apiClient.defaults.baseURL est défini et correct
            const signatureUrl = `${apiClient.defaults.baseURL}/uploads/doctor_signatures/${user.signatureImagePath.split('/').pop()}`;
            signatureImageHtml = `<img src="${signatureUrl}" alt="${t('examinationResultPage.signatureAlt')}" />`;
        }


        const reportHtml = `
            <div class="header-print">
                <div class="centre-name">${centreName}</div>
                <div>${centreAddress}</div>
                <div>${centrePhone}</div>
            </div>
            <div class="title-print">${t('examinationResultPage.reportTitle')}</div>
            <div class="patient-info-print">
                <p><strong>${t('examinationResultPage.patientLabel')}:</strong> ${patientName}</p>
                <p><strong>${t('examinationResultPage.dateLabel')}:</strong> ${formatDate(examinationDate)}</p>
                <p><strong>${t('examinationResultPage.examinationLabel')}:</strong> ${examinationType}</p>
            </div>
            <div class="result-text-print">
                ${examinationResultText}
            </div>
            <div class="footer-print">
                <div class="date-print">
                </div>
                <div class="signature-print">
                    ${t('examinationResultPage.doctorPrefix')} ${reportingDoctorFirstName} ${reportingDoctorLastName}<br/>
                    ${signatureImageHtml}
                    (${t('examinationResultPage.signatureLabel')})
                </div>
            </div>
        `;
        printExaminationReportHtml(reportHtml);
    };

    if (isLoading) {
        return <div className="container mt-5"><p>{t('examinationResultPage.loading')}</p></div>;
    }
    // L'accolade fermante à la ligne précédente (anciennement 201) a été supprimée par le diff précédent.
    // Le bloc if (isLoading) suivant (anciennement lignes 203-205) est également supprimé par le diff précédent.
    // La structure devrait maintenant être correcte.

    if (error) {
        return <div className="container mt-5 alert alert-danger">{error} <button onClick={() => navigate(-1)} className="btn btn-link">{t('common.BACK')}</button></div>;
    }

    if (!examinationDetails) {
        return <div className="container mt-5"><p>{t('examinationResultPage.noDetails')}</p> <button onClick={() => navigate(-1)} className="btn btn-link">{t('common.BACK')}</button></div>;
    }

    const {
        centreName = t('examinationResultPage.unknownCentre'),
        centreAddress = '',
        centrePhone = '',
        patientName = '',
        examinationDate,
        examinationType = '',
        examinationResultText = '',
        reportingDoctorFirstName = '', // Nom du médecin rapporteur (DOCTOR_CENTRE_EXAMEN)
        reportingDoctorLastName = '',
        prescribingDoctorFirstName = '', // Nom du médecin prescripteur (DOCTOR)
        prescribingDoctorLastName = ''
    } = examinationDetails;

    const displayDoctorName = user?.role === 'DOCTOR_CENTRE_EXAMEN'
        ? `${reportingDoctorFirstName} ${reportingDoctorLastName}`.trim()
        : `${prescribingDoctorFirstName} ${prescribingDoctorLastName}`.trim();

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
                        <div dangerouslySetInnerHTML={{ __html: examinationResultText }} />
                    </div>
                    <hr />
                    {/* Afficher le nom du médecin prescripteur si l'utilisateur connecté N'EST PAS le médecin prescripteur */}
                    {prescribingDoctorFirstName && (user?.firstName !== prescribingDoctorFirstName || user?.lastName !== prescribingDoctorLastName) && (
                        <div className="doctor-info mt-3 text-muted">
                            <p>
                                {t('examinationResultPage.prescribingDoctorLabel')}: {prescribingDoctorFirstName} {prescribingDoctorLastName}
                            </p>
                        </div>
                    )}

                    {/* Afficher le nom du médecin rapporteur si l'utilisateur connecté N'EST PAS le médecin rapporteur */}
                    {reportingDoctorFirstName && (user?.firstName !== reportingDoctorFirstName || user?.lastName !== reportingDoctorLastName) && (
                        <div className="doctor-centre-info mt-3 text-muted">
                            <p>
                                {t('examinationResultPage.reportingDoctorLabel')}: {reportingDoctorFirstName} {reportingDoctorLastName}
                            </p>
                        </div>
                    )}
                </div>
                <div className="card-footer text-center">
                    <button onClick={() => navigate(-1)} className="btn btn-secondary mr-2">{t('common.back')}</button>
                    {user?.role === 'DOCTOR_CENTRE_EXAMEN' && (
                        <button onClick={handlePrint} className="btn btn-primary">
                            {t('examinationResultPage.printButton')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExaminationResultPage;
