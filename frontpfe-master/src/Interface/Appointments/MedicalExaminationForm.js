import React, { useState, useEffect, useContext } from 'react'; // Import useContext
import { useLocation, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill'; // Import ReactQuill
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
import apiClient from '../../utils/apiClient'; // Import apiClient instead of axios
import AuthContext from '../../context/AuthContext'; // Import AuthContext
import { useTranslation } from 'react-i18next'; // Import useTranslation
import './MedicalExaminationForm.css'; // Optional CSS

const MedicalExaminationForm = () => {
    const { t } = useTranslation(); // Initialize translation function
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const patientId = queryParams.get('patientId');
    const appointmentId = queryParams.get('appointmentId'); // Renamed for clarity
    const consultationId = queryParams.get('consultationId'); // Retrieve consultationId
    const examIdToEdit = queryParams.get('examId'); // Get examId for editing

    const { user } = useContext(AuthContext); // Get user details from context

    const [patient, setPatient] = useState(null);
    const [centres, setCentres] = useState([]);
    const [selectedCentre, setSelectedCentre] = useState('');
    const [autreCentreName, setAutreCentreName] = useState('');
    const [examenType, setExamenType] = useState('');
    const [recommandation, setRecommandation] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitStatus, setSubmitStatus] = useState('');
    const [currentExamIdInForm, setCurrentExamIdInForm] = useState(examIdToEdit ? examIdToEdit : null); // Renamed and initialized
    const [currentExamStatus, setCurrentExamStatus] = useState(''); // To store the status of the exam being edited

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6952';

    // Fetch Patient Details, Centres, and existing Exam Data if in edit mode
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError('');
            try {
                // Fetch Patient
                if (patientId) {
                    const patientRes = await apiClient.get(`/Users/allid/${patientId}`);
                    setPatient(patientRes.data);
                } else {
                    throw new Error(t('medicalExaminationForm.errors.missingPatientId'));
                }

                // Fetch Centres d'examen
                const centresRes = await apiClient.get(`/api/centres-examen`);
                const fetchedCentres = centresRes.data || [];
                setCentres(fetchedCentres);

                // If in edit mode, fetch the existing examination data
                if (examIdToEdit) {
                    const examRes = await apiClient.get(`/api/medical-examinations/${examIdToEdit}`);
                    const examData = examRes.data;
                    setExamenType(examData.act || '');
                    setRecommandation(examData.recommandation || '');
                    setCurrentExamStatus(examData.etat || '');
                    setCurrentExamIdInForm(examData.idExam.toString()); // Ensure it's set for the submit logic

                    // Pre-select centre
                    if (examData.centreName === 'Autre') {
                        setSelectedCentre('AUTRE');
                    } else if (examData.centreName && fetchedCentres.length > 0) {
                        const matchedCentre = fetchedCentres.find(c => c.name === examData.centreName);
                        if (matchedCentre) {
                            setSelectedCentre(matchedCentre.idCentre.toString());
                        } else {
                            // If centreName from examData doesn't match any known centre,
                            // and it's not 'Autre', it's a bit of an edge case.
                            // Default to 'AUTRE' or leave blank? For now, 'AUTRE'.
                            setSelectedCentre('AUTRE');
                             console.warn(`Centre name "${examData.centreName}" not found in fetched centres. Defaulting to 'AUTRE'.`);
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching initial data:", err);
                setError(err.response?.data?.message || err.message || t('medicalExaminationForm.errors.loadFailedFallback'));
                setPatient(null);
                setCentres([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [patientId, examIdToEdit, API_URL, t]); // Added examIdToEdit and t to dependencies

    // Mapping for API status values to translation keys
    const statusTranslationKeys = {
        'en attente': 'pending',
        'terminé': 'completed', // Assuming 'terminé' is another possible status
        // Add other status mappings here if needed
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitStatus(t('medicalExaminationForm.status.saving')); // Use translation key
        setError('');

        if (!examenType) {
            setError(t('medicalExaminationForm.errors.selectExamType')); // Use translation key
            setSubmitStatus('');
            return;
        }
        // Removed validation check for 'autreCentreName' as the input field was removed.

        if (!consultationId) { // Add check for consultationId
            setError(t('medicalExaminationForm.errors.missingConsultationId')); // Use translation key
            setSubmitStatus('');
            return;
        }

        const payload = {
            appointmentId: appointmentId, // Send appointmentId (might not be needed for update, but good to have)
            consultationId: consultationId, // Send consultationId retrieved from URL (might not be needed for update)
            typeExamen: examenType,
            centreId: selectedCentre !== 'AUTRE' ? selectedCentre : null,
            // centreAutre is no longer sent as input field is removed
            recommandation: recommandation,
        };

        try {
            let response;
            // Determine if it's an update (edit mode) or create
            const isUpdateMode = !!currentExamIdInForm;

            if (isUpdateMode) {
                // --- Update existing examination ---
                // Ensure doctor can only update if status is 'en attente'
                // This check should ideally happen before navigating here or handled by backend authorization
                // For now, we assume if they are on this page in edit mode, they are allowed to try.
                setSubmitStatus(t('medicalExaminationForm.status.updating'));
                response = await apiClient.put(`/api/medical-examinations/${currentExamIdInForm}`, payload);
                console.log("Exam request updated:", response.data);
                setSubmitStatus(t('medicalExaminationForm.status.updateSuccess'));
            } else {
                // --- Create new examination ---
                // Ensure 'etat' is not in payload for creation, backend will default it
                const createPayload = { ...payload };
                delete createPayload.etat; // Ensure etat is not sent for creation

                setSubmitStatus(t('medicalExaminationForm.status.saving'));
                response = await apiClient.post(`/api/medical-examinations`, createPayload);
                console.log("Exam request saved:", response.data);
                if (response.data && response.data.idExam) {
                    setCurrentExamIdInForm(response.data.idExam.toString()); // Store the ID
                    setSubmitStatus(t('medicalExaminationForm.status.saveSuccess'));
                } else {
                     console.error("Exam created but ID (idExam) not found in response:", response.data);
                     setSubmitStatus(t('medicalExaminationForm.errors.saveSuccessIdMissing'));
                }
            }

            // Clear status message after a delay
            setTimeout(() => {
                setSubmitStatus('');
            }, 3000);

        } catch (err) {
            const actionType = currentExamIdInForm ? 'updating' : 'saving';
            console.error(`Error ${actionType} examination request:`, err);
            const fallbackKey = currentExamIdInForm ? 'medicalExaminationForm.errors.updateFailedFallback' : 'medicalExaminationForm.errors.saveFailedFallback';
            setError(err.response?.data?.message || t(fallbackKey));
            setSubmitStatus('');
        }
    };

    // --- Helper Functions ---
    const formatDate = (dateString) => {
        if (!dateString) return t('common.notAvailable'); // Use translation key
        try {
            // Consider using i18n locale for formatting if available/needed
            return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        } catch (e) { return t('common.invalidDate'); } // Use translation key
    };

    const calculateAge = (dobString) => {
        if (!dobString) return t('common.notAvailable'); // Use translation key
        try {
            const dob = new Date(dobString);
            const ageDiffMs = Date.now() - dob.getTime();
            const ageDate = new Date(ageDiffMs);
            return Math.abs(ageDate.getUTCFullYear() - 1970);
        } catch (e) { return t('common.notAvailable'); } // Use translation key
    };

    // --- Print Function (using refined iframe method) ---
    const handlePrint = () => {
        if (!patient) {
            alert(t('medicalExaminationForm.errors.printPatientDataMissing')); // Use translation key
            return;
        }

        // Find selected centre name
        let centreName = t('medicalExaminationForm.print.otherCentre'); // Use translation key
        if (selectedCentre && selectedCentre !== 'AUTRE') {
            const centre = centres.find(c => c.idCentre.toString() === selectedCentre);
            if (centre) {
                centreName = `${centre.name} (${centre.adress})`;
            } else {
                centreName = t('medicalExaminationForm.print.centreNotFound', { id: selectedCentre }); // Use translation key
            }
        }

        // --- Generate HTML Content ---
        let printHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${t('medicalExaminationForm.print.title')}</title>`; // Use translation key
        printHtml += `
            <style>
                @page { size: A4; margin: 20mm; } /* Define page size and margins */
                body { font-family: Arial, sans-serif; font-size: 12px; }
                .header, .footer { text-align: center; margin-bottom: 20px; font-size: 10px; color: #555; }
                .content { border: 1px solid #ccc; padding: 15px; }
                h2 { text-align: center; margin-bottom: 25px; }
                .section { margin-bottom: 15px; }
                .section h4 { margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 3px; }
                .section p { margin: 3px 0; }
                strong { display: inline-block; width: 150px; font-weight: bold; } /* Ensure strong is bold */
                .recommendation-content { margin-left: 20px; border: 1px dashed #eee; padding: 5px; margin-top: 5px; } /* Style for recommendation */
                .footer { margin-top: 50px; }
                @media print {
                    body { font-size: 10pt; color: #000; background-color: #fff; -webkit-print-color-adjust: exact; color-adjust: exact; }
                    .header, .footer { color: #000; }
                    .content { border: 1px solid #000; }
                    .recommendation-content { border-color: #ccc; }
                }
            </style>
        `;
        printHtml += '</head><body>';

        // Header
        printHtml += `<div class="header">`;
        if (user) {
            // Use translation keys for fallbacks
            printHtml += `${t('medicalExaminationForm.print.doctorPrefix')}${user.name || t('medicalExaminationForm.print.fallbackDoctorName')}<br>`;
            printHtml += `${user.activeCabinet?.address || t('medicalExaminationForm.print.fallbackCabinetAddress')} - Tel: ${user.activeCabinet?.tel || t('medicalExaminationForm.print.fallbackCabinetPhone')}<br>`;
        }
        printHtml += `${t('medicalExaminationForm.print.dateLabel')} ${formatDate(new Date())}`; // Use translation key
        printHtml += `</div>`;

        printHtml += `<h2>${t('medicalExaminationForm.print.title')}</h2>`; // Use translation key
        printHtml += '<div class="content">';

        // Patient Section
        printHtml += `<div class="section"><h4>${t('medicalExaminationForm.print.patientSectionTitle')}</h4>`; // Use translation key
        printHtml += `<p><strong>${t('medicalExaminationForm.print.lastNameLabel')}</strong> ${patient.lastName || t('common.notAvailable')}</p>`; // Use translation keys
        printHtml += `<p><strong>${t('medicalExaminationForm.print.firstNameLabel')}</strong> ${patient.firstName || t('common.notAvailable')}</p>`; // Use translation keys
        printHtml += `<p><strong>${t('medicalExaminationForm.print.dobLabel')}</strong> ${formatDate(patient.birthDate)}</p>`; // Use translation key
        printHtml += `<p><strong>${t('medicalExaminationForm.print.ageLabel')}</strong> ${calculateAge(patient.birthDate)} ${t('medicalExaminationForm.print.ageSuffix')}</p>`; // Use translation keys
        printHtml += '</div>';

        // Examination Section
        printHtml += `<div class="section"><h4>${t('medicalExaminationForm.print.examSectionTitle')}</h4>`; // Use translation key
        printHtml += `<p><strong>${t('medicalExaminationForm.print.examTypeLabel')}</strong> ${examenType || t('medicalExaminationForm.print.fallbackExamType')}</p>`; // Use translation keys
        printHtml += `<p><strong>${t('medicalExaminationForm.print.centreLabel')}</strong> ${centreName}</p>`; // Use translation key
        // Handle Quill content for recommendation
        if (recommandation && recommandation !== '<p><br></p>') { // Check if not empty Quill content
             printHtml += `<p><strong>${t('medicalExaminationForm.print.recommendationLabel')}</strong></p><div class="recommendation-content">${recommandation}</div>`; // Use translation key
        } else {
             printHtml += `<p><strong>${t('medicalExaminationForm.print.recommendationLabel')}</strong> <i>${t('medicalExaminationForm.print.fallbackRecommendation')}</i></p>`; // Use translation keys
        }
        printHtml += '</div>';

        printHtml += '</div>'; // Close content

        // Footer
        printHtml += `<div class="footer">`;
        printHtml += `${t('medicalExaminationForm.print.signatureLabel')} _________________________`; // Use translation key
        printHtml += `</div>`;

        printHtml += '</body></html>';

        // --- Use refined iframe method to print ---
        const iframeId = 'print-iframe-exam';
        let iframe = document.getElementById(iframeId);

        // Remove existing iframe if it exists
        if (iframe) {
            try {
                iframe.parentNode.removeChild(iframe);
            } catch (e) {
                console.warn("Could not remove existing exam print iframe:", e);
            }
        }

        // Create the iframe
        iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        iframe.style.left = '-9999px'; // Move off-screen

        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow.document;
        const iframeWin = iframe.contentWindow;

        iframeDoc.open();
        iframeDoc.write(printHtml);
        iframeDoc.close();

        // Function to handle cleanup
        const cleanupIframe = () => {
            const iframeToRemove = document.getElementById(iframeId);
            if (iframeToRemove) {
                try {
                    iframeToRemove.parentNode.removeChild(iframeToRemove);
                    console.log("Exam print iframe removed.");
                } catch (e) {
                    console.warn("Could not remove exam print iframe after print:", e);
                }
            }
        };

        // Trigger print after a short delay
        try {
            setTimeout(() => {
                try {
                    iframeWin.focus();
                    iframeWin.print();
                    // Fallback cleanup using setTimeout
                    setTimeout(cleanupIframe, 2000); // Cleanup after 2 seconds
                } catch (printError) {
                    console.error("Error during exam iframe print execution:", printError);
                    alert(t('medicalExaminationForm.errors.printExecutionFailed')); // Use translation key
                    cleanupIframe(); // Clean up immediately on error
                }
            }, 100); // 100ms delay
        } catch (e) {
            console.error("Error setting up exam print via iframe:", e);
            alert(t('medicalExaminationForm.errors.printSetupFailed')); // Use translation key
            cleanupIframe(); // Clean up immediately if setup fails
        }
    };

    if (isLoading) {
        return <div style={{ padding: '20px' }}>{t('medicalExaminationForm.loading')}</div>;
    }

    // If in edit mode and the status is not 'en attente', perhaps show a message or disable form
    // This logic might be better placed on the page that links here.
    // For now, the form will load.
    // if (examIdToEdit && currentExamStatus && currentExamStatus !== 'en attente') {
    //     return (
    //         <div style={{ padding: '20px' }}>
    //             <p>{t('medicalExaminationForm.errors.cannotEditNotPending', { status: currentExamStatus })}</p>
    //             <button onClick={() => navigate(-1)} className="btn btn-secondary">
    //                 {t('common.back')}
    //             </button>
    //         </div>
    //     );
    // }


    if (error && !patient && !examIdToEdit) { // Show main error only if patient couldn't load in create mode
        return <div className="error-message" style={{ padding: '20px', color: 'red' }}>{t('medicalExaminationForm.errorPrefix')}{error}</div>;
    }


    return (
        <div className="medical-exam-form-container" style={{ padding: '20px' }}>
            <h2>{examIdToEdit ? t('medicalExaminationForm.titleEdit') : t('medicalExaminationForm.titleCreate')}</h2>

            {patient && (
                 <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #eee' }}>
                    <h4>{t('medicalExaminationForm.patientSectionTitle')}</h4>
                    <p>{patient.firstName} {patient.lastName} </p>
                    {/* Add more patient details if needed */}
                </div>
            )}

            {error && <p style={{ color: 'red', marginBottom: '10px' }}>{t('medicalExaminationForm.errorPrefix')}{error}</p>}

            <form onSubmit={handleSubmit}>
                {/* Removed the status display as requested */}
                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label htmlFor="examenType">{t('medicalExaminationForm.labels.examType')}</label> {/* Use translation key */}
                    <select
                        id="examenType"
                        className="form-control"
                        value={examenType}
                        onChange={(e) => setExamenType(e.target.value)}
                        required
                    >
                        <option value="">{t('medicalExaminationForm.placeholders.select')}</option> {/* Use translation key */}
                        <option value="IRM">{t('medicalExaminationForm.examTypes.irm')}</option> {/* Use translation key */}
                        <option value="Radio">{t('medicalExaminationForm.examTypes.radio')}</option> {/* Use translation key */}
                        <option value="Analyse sanguine">{t('medicalExaminationForm.examTypes.bloodTest')}</option> {/* Use translation key */}
                        <option value="Scanner">{t('medicalExaminationForm.examTypes.scanner')}</option> {/* Use translation key */}
                        <option value="Echographie">{t('medicalExaminationForm.examTypes.ultrasound')}</option> {/* Use translation key */}
                        {/* Add other common exam types */}
                        <option value="Autre">{t('medicalExaminationForm.examTypes.other')}</option> {/* Use translation key */}
                    </select>
                     {examenType === 'Autre' && (
                        <input
                            type="text"
                            className="form-control"
                            placeholder={t('medicalExaminationForm.placeholders.specifyExamType')} // Use translation key
                            value={recommandation} // Or a dedicated state? Let's reuse recommandation for now
                            onChange={(e) => setRecommandation(e.target.value)} // Adjust if needed
                            style={{ marginTop: '5px' }}
                        />
                    )}
                </div>

                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label htmlFor="centreExamen">{t('medicalExaminationForm.labels.centre')}</label> {/* Use translation key */}
                    <select
                        id="centreExamen"
                        className="form-control"
                        value={selectedCentre}
                        onChange={(e) => setSelectedCentre(e.target.value)}
                        required
                    >
                        <option value="">{t('medicalExaminationForm.placeholders.selectCentre')}</option> {/* Use translation key */}
                        {centres.map(centre => (
                            <option key={centre.idCentre} value={centre.idCentre}>
                                {centre.name} ({centre.adress})
                            </option>
                        ))}
                        <option value="AUTRE">{t('medicalExaminationForm.examTypes.other')}</option> {/* Reuse translation key */}
                    </select>
                    {/* Removed the input field for 'Autre' centre name */}
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label htmlFor="recommandation">{t('medicalExaminationForm.labels.recommendation')}</label> {/* Use translation key */}
                    <ReactQuill
                        id="recommandation"
                        theme="snow"
                        value={recommandation}
                        onChange={setRecommandation} // Pass the setter function directly
                        style={{ backgroundColor: 'white', minHeight: '100px' }} // Adjust height as needed
                    />
                </div>

                {submitStatus && <p style={{ marginBottom: '10px' }}>{submitStatus}</p>}

                <div className="form-actions">
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ marginRight: '10px' }}
                        disabled={examIdToEdit && currentExamStatus && currentExamStatus !== 'en attente'} // Disable if editing and not 'en attente'
                    >
                        {currentExamIdInForm || examIdToEdit
                            ? t('medicalExaminationForm.buttons.update')
                            : t('medicalExaminationForm.buttons.save')
                        }
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="btn btn-info"
                        disabled={!currentExamIdInForm && !examIdToEdit} // Disable print if no exam ID
                    >
                        {t('medicalExaminationForm.buttons.print')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default MedicalExaminationForm;
