import React, { useState, useRef, useEffect } from 'react'; // Added useEffect
import { useLocation, useNavigate, useParams } from 'react-router-dom'; // Import useLocation, useNavigate, useParams
import './CertificatePage.css';
import apiClient from '../../utils/apiClient'; // Import apiClient
import { useAuth } from '../../context/AuthContext'; // Import useAuth to get token
import { useTranslation } from 'react-i18next'; // Assuming i18n setup

// Placeholder for translation function - REMOVED
// const t = (key, fallback) => fallback || key;

// --- Helper function to calculate age --- MOVED INSIDE COMPONENT
// const calculateAge = (dobString) => { ... };

const CertificatePage = () => {
    const { t } = useTranslation(); // Enable if using i18n hook
    const location = useLocation();
    const navigate = useNavigate(); // Hook for navigation
    const { consultationId: consultationIdFromParams } = useParams(); // Get consultationId from URL params if available

    // --- Helper function to calculate age (Moved inside AND after t is defined) ---
    const calculateAge = (dobString) => {
        if (!dobString) return t('common.notAvailable', 'N/A');
        try {
            const dob = new Date(dobString);
            const ageDiffMs = Date.now() - dob.getTime();
            const ageDate = new Date(ageDiffMs);
            return Math.abs(ageDate.getUTCFullYear() - 1970);
        } catch (e) { return t('common.notAvailable', 'N/A'); }
    };

    const { user } = useAuth(); // Get user info, including token

    // --- Get patient, doctor, and consultationId data from route state or params ---
    // Provide default empty objects to prevent errors if state is missing
    // IMPORTANT: Ensure consultationId is passed via route state when navigating to this page
    const { patient = null, doctor = null, consultationId: consultationIdFromState = null } = location.state || {};
    const consultationId = consultationIdFromState || consultationIdFromParams; // Prioritize state, fallback to params

    // --- State ---
    const [certificateType, setCertificateType] = useState('presence'); // 'presence', 'repos', 'prolongation'
    const [days, setDays] = useState(''); // For repos and prolongation
    const certificatePreviewRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(null);
    const [uploadError, setUploadError] = useState(null);

    // Clear upload status on component changes (Move hook before early return)
    useEffect(() => {
        setUploadError(null);
        setUploadSuccess(null);
    }, [certificateType, days]);

    // --- Handle missing data ---
    // Add check for consultationId
    if (!patient || !doctor || !consultationId) {
        // Optionally navigate back or show a more specific error
        console.error("CertificatePage: Patient, Doctor, or Consultation ID data missing.", { patient, doctor, consultationId });
        return (
            <div className="certificate-page-container error-message">
                {t('certificate.page.error.missingData', 'Données patient ou médecin manquantes. Impossible de générer le certificat.')}
                 <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{marginTop: '10px'}}>
                     {t('common.back', 'Retour')}
                 </button>
            </div>
        );
    }

    // --- Data Extraction ---
    const doctorName = doctor?.name || t('certificate.modal.unknownDoctor', 'Dr Inconnu');
    const patientFullName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : t('certificate.modal.unknownPatient', 'Patient Inconnu');
    const currentDate = new Date().toLocaleDateString(t('common.locale', 'fr-FR'), { year: 'numeric', month: '2-digit', day: '2-digit' });


    // --- Certificate Content Generation ---
    const generateCertificateContent = (isForPrint = false) => {
        // Data check already happened above
        const certificateTitle = t(`certificate.type.${certificateType}`, `Certificat Médical - ${certificateType}`);
        let certificateBodyText = '';

        switch (certificateType) {
            case 'presence':
                certificateBodyText = t('certificate.presence.text', {
                    // Provide French text as defaultValue with i18next placeholders
                    defaultValue: 'Je soussigné, Dr. {{doctorName}}, certifie que {{patientFullName}} s\'est présenté(e) à mon cabinet médical ce jour.',
                    // Pass variables for interpolation
                    doctorName,
                    patientFullName
                });
                break;
            case 'repos':
                // Get translated parts, passing variables and fallbacks
                const reposText1 = t('certificate.repos.text1', {
                    defaultValue: 'Je soussigné, Dr. {{doctorName}}, certifie que l\'état de santé de {{patientFullName}} nécessite un arrêt de travail de',
                    doctorName,
                    patientFullName
                });
                const reposText2 = t('certificate.repos.text2', {
                    defaultValue: 'sauf complication, à compter de ce jour.'
                });
                const daysLabel = t('certificate.common.daysLabel', { defaultValue: 'jours' });
                // Combine the parts
                certificateBodyText = `${reposText1} <strong>${days || '_____'} ${daysLabel}</strong>, ${reposText2}`;
                break;
            case 'prolongation':
                 // Get translated parts, passing variables and fallbacks
                 const prolongationText1 = t('certificate.prolongation.text1', {
                    defaultValue: 'Je soussigné, Dr. {{doctorName}}, certifie que l\'état de santé de {{patientFullName}} nécessite une prolongation de son arrêt de travail de',
                    doctorName,
                    patientFullName
                 });
                 const prolongationText2 = t('certificate.prolongation.text2', {
                    defaultValue: 'à compter de ce jour.'
                 });
                 const daysLabelProlongation = t('certificate.common.daysLabel', { defaultValue: 'jours' }); // Re-use daysLabel key
                 // Combine the parts
                 certificateBodyText = `${prolongationText1} <strong>${days || '_____'} ${daysLabelProlongation}</strong>, ${prolongationText2}`;
                break;
            default:
                certificateBodyText = '';
        }

        const simpleHeader = `
            <div class="cert-header">
                 <h2>${certificateTitle}</h2>
                 <p><strong>${t('certificate.common.doctorLabel', 'Médecin Soussigné')}:</strong> Dr. ${doctorName}</p>
                 <p><strong>${t('certificate.common.patientLabel', 'Patient')}:</strong> ${patientFullName}</p>
                 <p><strong>${t('certificate.common.dateLabel', 'Fait le')}:</strong> ${currentDate}</p>
            </div>
            <hr />
        `;

        const simpleBody = `
            <div class="cert-body-text">
                 <p>${certificateBodyText}</p>
            </div>
        `;

        // Footer includes signature label only for print (line completely removed)
        const simpleFooter = `
             <div class="signature-block">
                 ${isForPrint ? `<p><strong>${t('certificate.common.signatureLabel', 'Signature du Médecin')}:</strong></p>` : ''}
              </div>
        `;


        return `
            <div class="cert-page-container-print"> ${/* Use a different class for print styles */''}
                ${simpleHeader}
                ${simpleBody}
                ${simpleFooter}
            </div>
        `;
    };

     // --- Print Handler (remains the same) ---
    const handlePrint = () => {
        let contentToPrint = generateCertificateContent(true);
        if (!contentToPrint) {
            alert(t('certificate.print.error.noContent', 'Erreur: Impossible de générer le contenu à imprimer.'));
            return;
        }

        const printFrameId = 'print-certificate-frame';
        let iframe = document.getElementById(printFrameId);
        if (iframe) {
            iframe.parentNode.removeChild(iframe);
        }

        iframe = document.createElement('iframe');
        iframe.id = printFrameId;
        // Style iframe for hiding
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        iframe.style.left = '-9999px';

        document.body.appendChild(iframe);
        const iframeDoc = iframe.contentWindow.document;

        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${t('certificate.print.title', 'Certificat Médical')}</title>
                <style>
                    /* Basic Print Styles - Copied from previous version */
                    @page { size: A4; margin: 2cm; }
                    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; color: #000; }
                    .cert-page-container-print { /* Styles for the printed page */ }
                    .cert-header h2 { text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 1.5cm; text-transform: uppercase; letter-spacing: 1px; }
                    .cert-header p { margin-bottom: 0.5cm; }
                    .cert-body-text { margin-top: 1cm; margin-bottom: 1cm; }
                    .cert-body-text p { margin-bottom: 0.5cm; }
                    .signature-block { margin-top: 2cm; text-align: right; }
                    .signature-block p { margin-bottom: 0.3cm; }
                    .signature-line { /* Style the line if needed */ }
                    strong { font-weight: bold; }
                    hr { border: none; border-top: 1px solid #aaa; margin: 1cm 0; }
                    @media print {
                        body { margin: 0; color: #000 !important; background-color: #fff !important; -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
                        .signature-line { border-bottom: 1px solid #000 !important; }
                    }
                </style>
            </head>
            <body>
                ${contentToPrint}
            </body>
            </html>
        `);
        iframeDoc.close();

        const cleanup = () => {
            const frameToRemove = document.getElementById(printFrameId);
            if (frameToRemove) {
                try { frameToRemove.parentNode.removeChild(frameToRemove); } catch (e) { console.warn("Could not remove print iframe:", e); }
            }
        };

        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                setTimeout(cleanup, 2000);
            } catch (error) {
                console.error("Printing error:", error);
                alert(t('certificate.print.error.generic', "Erreur lors de l'impression."));
                cleanup();
            }
        }, 100);
    };

    // --- Save Certificate Handler ---
    const handleSaveCertificate = async () => {
        if (!consultationId) {
            setUploadError(t('certificate.save.error.noConsultationId', 'ID de consultation manquant.'));
            return;
        }
        if (isUploading) return; // Prevent double clicks

        setIsUploading(true);
        setUploadError(null);
        setUploadSuccess(null);

        try {
            // 1. Generate HTML content (using the print version for completeness)
            const certificateHtml = generateCertificateContent(true);
            const fileName = `certificat_${patientFullName.replace(/\s+/g, '_')}_${currentDate.replace(/\//g, '-')}.html`;

            // 2. Create a Blob and File object from the HTML
            const blob = new Blob([certificateHtml], { type: 'text/html;charset=UTF-8' }); // Specify charset
            const file = new File([blob], fileName, { type: 'text/html;charset=UTF-8' });

            // 3. Create FormData
            const formData = new FormData();
            formData.append('file', file); // 'file' must match @RequestParam("file") in backend

            // 4. Make API call using apiClient (assumes it handles auth token)
            // Added /api prefix to the URL
            const response = await apiClient.post(`/api/certificates/upload/${consultationId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    // Authorization header is usually handled by apiClient interceptor
                }
            });

            // 5. Handle success
            setUploadSuccess(t('certificate.save.success', 'Certificat enregistré avec succès!'));
            console.log("Upload successful:", response.data);
             // Optionally navigate back or disable save button after success
             // setTimeout(() => navigate(-1), 2000); // Example: Go back after 2 seconds

         } catch (error) {
             // 6. Handle error
             console.error("Certificate upload error:", error);
             let errorMessage;
             // Final error handling refinement v3
             console.error("Raw certificate save error:", error); // Log raw error
             let displayErrorMessage = t('certificate.save.error.generic', 'Erreur lors de l\'enregistrement du certificat.'); // Default message

             try {
                 const responseStatus = error.response?.status;
                 const responseData = error.response?.data;
                 // Log the actual response data to help debugging
                 console.error("Certificate save error response data:", JSON.stringify(responseData));

                 // Try to get message, could be in data.message or data itself if data is a string
                 const backendMessage = responseData?.message || (typeof responseData === 'string' ? responseData : null);
                 const errorContentString = String(backendMessage || responseData || '').toLowerCase();

                 // 1. Check for specific conflict condition (highest priority)
                 // Added 'duplicate' and 'existe' as keywords
                 if (responseStatus === 409 || errorContentString.includes('already exist') || errorContentString.includes('existe déjà') || errorContentString.includes('duplicate') || errorContentString.includes('existe')) {
                     displayErrorMessage = t('certificate.save.error.alreadyExists', 'Certificat déjà enregistré!');
                 } else {
                     // 2. If not conflict, use specific backend message if available
                     if (backendMessage) {
                         displayErrorMessage = backendMessage;
                     } else if (error.message) { // 3. Fallback to generic JS error message
                         displayErrorMessage = error.message;
                     }
                     // 4. If none of the above, the default generic save error remains.
                 }
             } catch (parseError) {
                 // If error parsing itself fails, log it and keep the generic save error
                 console.error("Error parsing the error response details:", parseError);
                 // Use the original error.message if available, otherwise the generic save error
                 displayErrorMessage = error.message || t('certificate.save.error.generic', 'Erreur lors de l\'enregistrement du certificat.');
             }

             // Ensure the state is always set with a non-empty string
             setUploadError(displayErrorMessage || t('common.unknownError', 'Une erreur inconnue est survenue.'));

         } finally {
             setIsUploading(false);
        }
    };


    // --- Render Logic ---
    return (
        <div className="certificate-page-container">
            <h1>{t('certificate.page.title', 'Générer un Certificat Médical')}</h1>

            {/* Patient/Doctor Info Display */}
            <div className="info-section">
                <p><strong>{t('certificate.common.patientLabel', 'Patient')}:</strong> {patientFullName}</p> {/* Removed age display */}
                <p><strong>{t('certificate.common.doctorLabel', 'Médecin')}:</strong> Dr. {doctorName}</p>
            </div>

            {/* Certificate Type Selection */}
            <div className="form-section">
                <h2>{t('certificate.modal.selectType', 'Type de Certificat:')}</h2>
                <div className="radio-group">
                    <label>
                        <input type="radio" name="certificateType" value="presence" checked={certificateType === 'presence'} onChange={(e) => setCertificateType(e.target.value)} />
                        {t('certificate.type.presence', 'Certificat de Présence')}
                    </label>
                    <label>
                        <input type="radio" name="certificateType" value="repos" checked={certificateType === 'repos'} onChange={(e) => setCertificateType(e.target.value)} />
                        {t('certificate.type.repos', 'Certificat de Repos')}
                    </label>
                    <label>
                        <input type="radio" name="certificateType" value="prolongation" checked={certificateType === 'prolongation'} onChange={(e) => setCertificateType(e.target.value)} />
                        {t('certificate.type.prolongation', 'Certificat de Prolongation')}
                    </label>
                </div>
            </div>

            {/* Number of Days Input (Conditional) */}
            {(certificateType === 'repos' || certificateType === 'prolongation') && (
                <div className="form-section">
                    <label htmlFor="daysInput">{t('certificate.modal.daysLabel', 'Nombre de Jours:')}</label>
                    <input
                        type="number"
                        id="daysInput"
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                        min="1"
                        placeholder={t('certificate.modal.daysPlaceholder', 'Entrez le nombre de jours')}
                        className="days-input"
                    />
                </div>
            )}

            {/* Certificate Preview */}
            <div className="preview-section">
                <h2>{t('certificate.modal.previewTitle', 'Aperçu du Certificat')}</h2>
                <div className="certificate-preview" ref={certificatePreviewRef} dangerouslySetInnerHTML={{ __html: generateCertificateContent(false) }}>
                    {/* Preview content generated without signature line/label */}
                </div>
            </div>

            {/* Upload Status Messages */}
            {isUploading && <div className="status-message loading">{t('certificate.save.loading', 'Enregistrement en cours...')}</div>}
            {uploadSuccess && <div className="status-message success">{uploadSuccess}</div>}
            {uploadError && <div className="status-message error">{typeof uploadError === 'string' ? uploadError : t('common.unknownError', 'Une erreur inconnue est survenue.')}</div>}


            {/* Action Buttons */}
            <div className="actions-section">
                 <button
                    onClick={handleSaveCertificate}
                    className="btn btn-success save-button" // Use success style for save
                    disabled={isUploading || !!uploadSuccess} // Disable while uploading or after success
                    style={{ marginRight: '10px' }}
                >
                    {isUploading ? t('common.saving', 'Enregistrement...') : (uploadSuccess ? t('common.saved', 'Enregistré') : t('certificate.save.button', 'Enregistrer Certificat'))} {/* Changed text */}
                </button>
                <button onClick={handlePrint} className="btn btn-primary print-button" style={{ marginRight: '10px' }} disabled={isUploading}>
                    🖨️ {t('certificate.modal.printButton', 'Imprimer')}
                </button>
                 <button onClick={() => navigate(-1)} className="btn btn-secondary" disabled={isUploading}> {/* Use navigate(-1) to go back */}
                     {t('common.back', 'Retour')}
                 </button>
            </div>
        </div>
    );
};

export default CertificatePage;
