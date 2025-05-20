import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import apiClient from '../../utils/apiClient';
import AuthContext from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import './PrescribeReportPage.css'; // Keep for non-print styles if any

const PrescribeReportPage = () => {
    const { t, i18n } = useTranslation();
    const { examId } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [examination, setExamination] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [editorContent, setEditorContent] = useState('');
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState(''); // State for success messages
    const [showEditor, setShowEditor] = useState(false);
    const [reportExists, setReportExists] = useState(false);

    // Fetch examination details
    useEffect(() => {
        const fetchExaminationDetails = async () => {
            if (!examId) return;
            try {
                const examDetailsResponse = await apiClient.get(`/api/medical-examinations/${examId}`);
                const examData = examDetailsResponse.data;
                setExamination(examData);
                console.log("Fetched Examination Data:", examData);
                if (examData?.resultat) {
                    setReportExists(true);
                    if (!editorContent && !showEditor) {
                       setEditorContent(examData.resultat);
                    }
                } else {
                    setReportExists(false);
                }
            } catch (err) {
                console.warn(t('prescribeReportPage.errors.fetchExamFailed'), err);
                setError(t('prescribeReportPage.errors.fetchExamFailed'));
            }
        };
        fetchExaminationDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [examId, t]);

    // Effect to clear success/error messages after a delay
    useEffect(() => {
        let successTimer;
        if (successMessage) {
            successTimer = setTimeout(() => {
                setSuccessMessage('');
            }, 10000); // 10 seconds
        }
        return () => clearTimeout(successTimer);
    }, [successMessage]);

    // Effect to handle redirection after success message
    useEffect(() => {
        let redirectTimer;
        if (successMessage) {
            redirectTimer = setTimeout(() => {
                navigate('/centre-examinations');
            }, 2000); // Redirect after 2 seconds
        }
        return () => clearTimeout(redirectTimer);
    }, [successMessage, navigate]); // Add navigate to dependencies

    useEffect(() => {
        let errorTimer;
        if (error) {
            errorTimer = setTimeout(() => {
                setError('');
            }, 10000); // 10 seconds
        }
        return () => clearTimeout(errorTimer);
    }, [error]);

    // Fetch report templates
    useEffect(() => {
        const fetchTemplates = async () => {
            setIsLoadingTemplates(true);
            // setError(''); // Don't clear error here, let the timeout handle it
            try {
                const response = await apiClient.get('/api/modeles-compte-rendu');
                setTemplates(response.data || []);
            } catch (err) {
                console.error(t('prescribeReportPage.errors.fetchTemplatesFailed'), err);
                setError(err.response?.data?.message || t('prescribeReportPage.errors.fetchTemplatesFailedFallback'));
            } finally {
                setIsLoadingTemplates(false);
            }
        };
        fetchTemplates();
    }, [t]);

    // Handle template selection
    const handleSelectTemplate = useCallback((template) => {
        setSelectedTemplate(template);
        setEditorContent(template ? template.contenuModele : '');
        setShowEditor(true);
    }, []);

    // Handle saving or updating the report
    const handleSaveReport = async () => {
        if (!examId) {
            setError(t('prescribeReportPage.errors.missingExamId'));
            return;
        }
        const wasUpdating = reportExists;
        setIsSaving(true);
        setError(''); // Clear previous errors
        setSuccessMessage(''); // Clear previous success messages
        const formData = new FormData();
        formData.append('reportContent', editorContent);

        try {
            await apiClient.post(`/api/medical-examinations/${examId}/save-report`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setReportExists(true);
            const updatedExamDetails = await apiClient.get(`/api/medical-examinations/${examId}`);
            setExamination(updatedExamDetails.data);
            // Set success message instead of alert
            setSuccessMessage(wasUpdating ? t('prescribeReportPage.success.reportUpdated') : t('prescribeReportPage.success.reportSaved'));
            console.log(wasUpdating ? "Rapport mis à jour." : "Rapport enregistré.");
        } catch (err) {
            console.error(t('prescribeReportPage.errors.saveReportFailed'), err);
            setError(err.response?.data?.message || t('prescribeReportPage.errors.saveReportFailedFallback'));
        } finally {
            setIsSaving(false);
        }
    };

    // --- Print Functionality (Adapted from ConsultationPage) ---
    const printContent = (content) => {
        const iframeId = 'print-iframe-report';
        let iframe = document.getElementById(iframeId);
        if (iframe) {
            try { iframe.parentNode.removeChild(iframe); } catch (e) {}
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
        iframeDoc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Compte Rendu</title>');
        iframeDoc.write(`
            <style>
                @page { size: A4; margin: 1cm; }
                body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; }
                .print-header { text-align: center; margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                .print-header h1 { margin: 0 0 5px 0; font-size: 1.4em; }
                .print-header p { margin: 2px 0; font-size: 0.9em; }
                .patient-info { margin-bottom: 20px; }
                .patient-info p { margin: 4px 0; }
                .report-content { margin-top: 20px; }
                .report-content pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: inherit; margin: 0; } /* Style for pre tag */
                .signature-section { text-align: right; margin-top: 50px; page-break-inside: avoid; }
                .signature-section p { margin: 5px 0; }
                .signature-section img { max-height: 50px; display: block; margin-top: 10px; margin-left: auto; }
            </style>
        `);
        iframeDoc.write('</head><body>');
        iframeDoc.write(content);
        iframeDoc.write('</body></html>');
        iframeDoc.close();

        const cleanupIframe = () => {
            const iframeToRemove = document.getElementById(iframeId);
            if (iframeToRemove) {
                try { iframeToRemove.parentNode.removeChild(iframeToRemove); } catch (e) {}
            }
        };

        try {
            setTimeout(() => {
                try {
                    iframeWin.focus();
                    iframeWin.print();
                    setTimeout(cleanupIframe, 1500);
                } catch (printError) {
                    console.error("Error calling iframe print:", printError);
                    // alert("Erreur lors du lancement de l'impression."); // Alert removed
                    cleanupIframe();
                }
            }, 500);
        } catch (e) {
            console.error("Error setting up print iframe:", e);
            // alert("Erreur lors de la préparation de l'impression."); // Alert removed
            cleanupIframe();
        }
    };

    const handlePrint = () => {
        if (!examination || !user) {
            setError(t('prescribeReportPage.errors.printDataMissing')); // Use setError for feedback
            return;
        }
        console.log("Attempting print with Examination Data:", examination);
        console.log("Attempting print with User Data:", user);

        const printData = {
            doctorName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            patientName: `${examination?.patientFirstName || t('common.notFound')} ${examination?.patientLastName || ''}`.trim(),
            centreName: examination?.centreName || t('common.unspecified'),
            centreAddress: examination?.centreAddress || '',
            centrePhone: examination?.centrePhone || '',
            reportDate: new Date().toLocaleDateString(t('common.locale', { ns: 'common', defaultValue: 'fr-FR' })),
            examAct: examination?.act || t('common.unspecified'),
            signatureUrl: null
        };

        // Extract plain text and wrap in <pre>
        const plainTextContent = editorContent.replace(/<[^>]*>/g, '');
        const printHtml = `
            <div class="print-header">
                <h1>${printData.centreName}</h1>
                ${printData.centreAddress ? `<p>${printData.centreAddress}</p>` : ''}
                ${printData.centrePhone ? `<p>${printData.centrePhone}</p>` : ''}
                <hr/>
                <h2>Compte Rendu d'Examen</h2>
            </div>
            <div class="patient-info">
                 <p><strong>Patient:</strong> ${printData.patientName}</p>
                 <p><strong>Date:</strong> ${printData.reportDate}</p>
                 <p><strong>Examen:</strong> ${printData.examAct}</p>
            </div>
            <div class="report-content">
                <pre>${plainTextContent}</pre>
            </div>
            <div class="signature-section">
                <p>Fait le: ${printData.reportDate}</p>
                <p>Dr. ${printData.doctorName}</p>
                ${printData.signatureUrl ? `<img src="${printData.signatureUrl}" alt="Signature"/>` : '<p>(Signature)</p>'}
            </div>
        `;
        printContent(printHtml);
    };

    const quillModules = {
        toolbar: [
            [{ 'header': '1'}, {'header': '2'}, { 'font': [] }],
            [{size: []}],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
            ['link'],
            ['clean'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
        ],
    };

    if (isLoadingTemplates) {
        return <div className="container mt-5"><p>{t('prescribeReportPage.loadingTemplates')}</p></div>;
    }

    return (
        <div className="container mt-5 prescribe-report-page">
            <h2>{t('prescribeReportPage.title')}</h2>

            {examination && (
                <div className="mb-3 patient-info-section">
                    <p><strong>{t('prescribeReportPage.patient')}:</strong> {`${examination?.patientFirstName || ''} ${examination?.patientLastName || ''}`}</p>
                    <p><strong>{t('prescribeReportPage.act')}:</strong> {examination?.act || t('common.unspecified')}</p>
                </div>
            )}

            {/* Error display is now handled by the state below */}
            {/* {error && <div className="alert alert-danger">{error}</div>} */}

            {!showEditor ? (
                <div className="template-selection">
                    <h3 className="template-selection-header">{t('prescribeReportPage.selectTemplateTitle')}</h3>
                    <div className="template-cards-container">
                        <div className={`template-card blank-document-card ${!selectedTemplate ? 'active' : ''}`}
                            onClick={() => handleSelectTemplate(null)} role="button" tabIndex={0} >
                            <div className="template-card-image-placeholder">{"📄"}</div>
                            <div className="template-card-name">{t('prescribeReportPage.blankDocument')}</div>
                        </div>
                        {templates.map(template => {
                            const imageUrl = `${apiClient.defaults.baseURL || ''}/api/modeles-compte-rendu/${template.id}/preview-image?_=${Date.now()}`;
                            return (
                            <div key={template.id} className={`template-card ${selectedTemplate?.id === template.id ? 'active' : ''}`}
                                onClick={() => handleSelectTemplate(template)} role="button" tabIndex={0} >
                                <img src={imageUrl} alt={template.nomModele} className="template-card-image"
                                    onError={(e) => { e.target.style.display='none'; }} />
                                <div className="template-card-name">{template.nomModele}</div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="report-editor-section mt-4">
                    <button className="btn btn-secondary mb-3" onClick={() => setShowEditor(false)}>
                        {t('prescribeReportPage.backToTemplates')}
                    </button>
                    <h3>{selectedTemplate ? selectedTemplate.nomModele : t('prescribeReportPage.blankDocument')}</h3>
                    <ReactQuill
                        theme="snow"
                        value={editorContent}
                        onChange={setEditorContent}
                        modules={quillModules}
                        className="quill-editor-custom"
                    />
                    {/* Success/Error Messages */}
                    {successMessage && <div className="alert alert-success mt-3">{successMessage}</div>}
                    {error && <div className="alert alert-danger mt-3">{error}</div>}

                    <div className="mt-3">
                        <button
                            className="btn btn-primary"
                            onClick={handleSaveReport}
                            disabled={isSaving} // Only disable while saving
                        >
                            {isSaving ? t('common.saving') : (reportExists ? t('prescribeReportPage.updateReportButton') : t('prescribeReportPage.saveReportButton'))}
                        </button>
                        <button
                            className="btn btn-info ms-2"
                            onClick={handlePrint}
                            disabled={isSaving || !editorContent}
                        >
                            {t('common.print')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrescribeReportPage;
