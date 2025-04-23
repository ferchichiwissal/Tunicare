import React, { useState, useEffect, useContext } from 'react'; // Import useContext
import { useParams, useNavigate } from 'react-router-dom'; // Import useNavigate
import apiClient from '../../utils/apiClient'; // Import apiClient instead of axios
import ReactQuill from 'react-quill'; // Import ReactQuill
// Assuming AuthContext exists and provides user details
import AuthContext from '../../context/AuthContext'; // Corrected: Default import
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
// Optional: Add CSS for styling
// import './ConsultationPage.css';

const ConsultationPage = () => {
    const { appointmentId } = useParams(); // Get appointmentId from URL (renamed from consultationId)
    const navigate = useNavigate(); // Hook for navigation

    // State for appointment/consultation data
    const [appointment, setAppointment] = useState(null); // Store fetched appointment
    const [patient, setPatient] = useState(null);
    const [consultationText, setConsultationText] = useState(''); // Initialize as empty for new consultation
    const [prescriptionText, setPrescriptionText] = useState(''); // Initialize as empty for new consultation
    const [savedConsultationId, setSavedConsultationId] = useState(null); // Store ID after saving

    // State for history
    const [showHistory, setShowHistory] = useState(false);
    const [consultationHistory, setConsultationHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState('');

    // General loading and error state
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [saveStatus, setSaveStatus] = useState(''); // To show save success/error messages

    // Get user details from AuthContext
    // Ensure AuthContext provides user object with name, languagePreference, activeCabinet { address, tel }
    const { user } = useContext(AuthContext); // Corrected: use 'user' instead of 'userDetails'

    // Log the user object received from context for debugging
    useEffect(() => {
        console.log("ConsultationPage - User from context:", JSON.stringify(user, null, 2)); // Log user object from context
    }, [user]);

    // Fetch initial APPOINTMENT data to get patient info
    useEffect(() => {
        const fetchAppointmentDetails = async () => {
            setIsLoading(true);
            setError('');
            setSaveStatus('');
            setConsultationText(''); // Reset editors for new consultation
            setPrescriptionText('');
            setSavedConsultationId(null); // Reset saved ID when loading new appointment
            try {
                // Fetch the specific APPOINTMENT details using apiClient
                console.log(`Fetching appointment details for ID: ${appointmentId}`);
                const response = await apiClient.get(`/api/rendezvous/${appointmentId}`); // Fetch appointment by ID
                console.log("Fetched appointment details:", response.data);
                const data = response.data;
                setAppointment(data); // Store appointment data if needed later
                setPatient(data.patient || null); // Set patient from appointment data

                if (!data.patient) {
                    setError('Détails du patient non trouvés dans les données du rendez-vous.');
                }

            } catch (err) {
                console.error("Error fetching appointment details:", err);
                // Handle 404 specifically if needed, otherwise show generic error
                if (err.response && err.response.status === 404) {
                     setError(`Rendez-vous avec ID ${appointmentId} non trouvé.`);
                } else {
                    setError(err.response?.data?.message || `Échec de la récupération des détails pour le rendez-vous ${appointmentId}.`);
                }
                setAppointment(null);
                setPatient(null);
            } finally {
                setIsLoading(false);
            }
        };

        if (appointmentId) {
            fetchAppointmentDetails();
        } else {
            setError("ID de rendez-vous manquant dans l'URL.");
            setIsLoading(false);
        }
    }, [appointmentId]); // Depend on appointmentId

    // --- Helper Functions ---
    const formatDate = (dateString) => {
        // Simplified date formatting
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        } catch (e) {
            return 'Date invalide';
        }
    };

    const calculateAge = (dobString) => {
        if (!dobString) return 'N/A';
        try {
            const dob = new Date(dobString);
            const ageDiffMs = Date.now() - dob.getTime();
            const ageDate = new Date(ageDiffMs);
            const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
            return calculatedAge >= 0 ? calculatedAge : 'N/A';
        } catch (e) {
            console.error("Error calculating age:", e);
            return 'N/A';
        }
    };

    // --- Event Handlers ---
    const handleToggleHistory = async () => {
        const newState = !showHistory;
        setShowHistory(newState);
        if (newState && patient && consultationHistory.length === 0) { // Fetch only if showing and not already fetched
            setHistoryLoading(true);
            setHistoryError('');
            try {
                // Fetch history using apiClient
                const response = await apiClient.get(`/api/consultations/patient/${patient.id}/history`); // Corrected: Use patient.id
                setConsultationHistory(response.data || []);
            } catch (err) {
                console.error("Error fetching consultation history:", err);
                setHistoryError(err.response?.data?.message || 'Échec de la récupération de l\'historique.');
                setConsultationHistory([]); // Clear history on error
            } finally {
                setHistoryLoading(false);
            }
        }
    };

    const handleSave = async () => {
        // Prevent duplicate clicks while saving
        if (saveStatus === 'Sauvegarde en cours...') {
            console.log("Save already in progress...");
            return;
        }

        console.log("[handleSave] Starting save. Current savedConsultationId:", savedConsultationId); // Log ID at start
        setSaveStatus('Sauvegarde en cours...');
        setError('');

        if (!patient) {
            setError("ID Patient manquant pour la sauvegarde.");
            setSaveStatus('Erreur'); // Indicate error state
            console.log("[handleSave] Error: Patient missing."); // Log error
            return;
        }

        try {
            const payload = {
                patientId: patient.id,
                rendezVousId: appointmentId, // Keep sending appointmentId for context if needed by backend
                consultationText: consultationText,
                prescriptionText: prescriptionText,
            };

            // If we have a savedConsultationId, include it in the payload for update
            if (savedConsultationId) {
                payload.idConsultation = savedConsultationId;
                console.log("[handleSave] Included existing savedConsultationId in payload:", savedConsultationId); // Log if ID is included
            }

            console.log("[handleSave] Sending payload:", JSON.stringify(payload)); // Log final payload

            // Use the same POST endpoint; backend service differentiates create/update based on idConsultation presence
            const response = await apiClient.post(`/api/consultations`, payload);
            console.log("[handleSave] Received response:", response.data); // Log full response

            const newConsultationId = response.data.idConsultation;
            console.log("[handleSave] Received newConsultationId from backend:", newConsultationId); // Log received ID
            // Update success message based on whether it was a create or update
            const currentSavedIdBeforeUpdate = savedConsultationId; // Capture state before update for message logic
            setSaveStatus(currentSavedIdBeforeUpdate ? 'Consultation mise à jour avec succès !' : 'Consultation créée avec succès !');
            setSavedConsultationId(newConsultationId); // Store/update the ID state

        } catch (err) {
            console.error("[handleSave] Error saving consultation:", err); // Log error details
            const errorMsg = err.response?.data?.message || (savedConsultationId ? 'Échec de la mise à jour de la consultation.' : 'Échec de la création de la consultation.');
            setError(errorMsg);
            setSaveStatus('Erreur'); // Indicate error state
        } finally {
            // Reset status immediately unless it was an error.
            // Keep 'Erreur' status displayed until next action.
            // Keep success/update message displayed until next action or component reload.
            if (saveStatus === 'Sauvegarde en cours...') {
                 // If save finished (not an error), status would have been updated in try/catch.
                 // If it's still 'Sauvegarde en cours...', it means an unexpected issue occurred. Reset.
                 setSaveStatus('');
            }
            // We no longer automatically clear the success/update/error message here.
            // It will persist until the next save attempt or page navigation.
        }
    };

    // Basic print function - Opens a new window with content and tries to close it
    const printContent = (content) => {
        const printWindow = window.open('', '_blank', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Ordonnance Médicale</title>');
            // Add new styling for the teal template layout
            printWindow.document.write(`
                <style>
                    html, body {
                        height: 100%; /* Needed for flex layout to work correctly */
                        margin: 0;
                        padding: 0;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 12px;
                        color: #333;
                        background-color: #fff;
                    }
                    .page-container {
                        width: 100%;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 0;
                        background-color: white;
                        position: relative;
                        min-height: 100%; /* Use 100% height */
                        display: flex;
                        flex-direction: column;
                    }
                    .content-wrapper {
                        flex: 1 0 auto; /* Grow, don't shrink, basis auto */
                        padding: 20px 40px; /* Add padding */
                        z-index: 1;
                    }

                    /* Header Styles - Teal Gradient Bar */
                    .header {
                        background: linear-gradient(to right, #008080, #20B2AA, #48D1CC); /* Teal gradient */
                        color: white;
                        padding: 10px 40px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        min-height: 60px;
                    }
                    .header .doctor-info {
                        text-align: left;
                    }
                    .header .doctor-name {
                        font-size: 1.3em;
                        font-weight: bold;
                        margin: 0 0 2px 0;
                    }
                    .header .doctor-qualification {
                        font-size: 0.9em;
                        margin: 0;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        opacity: 0.9;
                    }
                    .header .header-icon-container {
                        background-color: #48D1CC; /* Match lighter end of gradient */
                        border-radius: 50%;
                        width: 50px;
                        height: 50px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    .header .header-icon { /* Placeholder for stethoscope */
                        font-size: 1.8em;
                        color: white;
                    }
                     /* Title moved below header */
                     .prescription-title-container {
                         text-align: center;
                         margin: 20px 0 15px 0;
                         font-size: 1.4em;
                         font-weight: bold;
                         color: #333;
                     }

                    /* Body Content */
                    .body-content {
                        display: flex;
                        margin-top: 10px; /* Reduced top margin */
                        padding-bottom: 20px;
                    }
                    .body-left {
                        width: 50%; /* Adjusted width */
                        padding-right: 20px;
                    }
                    .body-right {
                        width: 50%; /* Adjusted width */
                        padding-left: 20px;
                    }
                    /* Removed .caduceus-symbol */
                    .patient-details label, .insurance-diagnosis label {
                        display: block;
                        font-weight: bold;
                        margin-bottom: 2px;
                        font-size: 0.9em;
                    }
                    .patient-details span, .insurance-diagnosis span {
                        display: block;
                        border-bottom: 1px dotted #aaa;
                        margin-bottom: 10px;
                        padding: 2px 0;
                        min-height: 1.2em;
                        font-size: 1em;
                    }
                    .insurance-diagnosis {
                         margin-top: 0; /* Align with patient details */
                    }

                    /* Removed Watermark */

                    /* Signature */
                    .signature-area {
                        text-align: right;
                        margin-top: 60px; /* Fine-tuned margin */
                        margin-right: 0; /* Align to edge */
                        padding-bottom: 20px; /* Keep some padding below */
                    }
                    .signature-line {
                        border-bottom: 1px solid #555;
                        width: 200px;
                        display: block;
                        margin-bottom: 5px;
                        margin-left: auto;
                    }
                    .signature-label {
                        font-size: 0.9em;
                        color: #555;
                    }

                    /* Footer Styles - Teal Gradient Bar */
                    .footer {
                        background: linear-gradient(to right, #008080, #20B2AA, #48D1CC); /* Teal gradient */
                        padding: 10px 40px;
                        font-size: 0.85em;
                        color: white; /* White text on teal */
                        display: flex;
                        justify-content: space-around;
                        align-items: center;
                        flex-wrap: wrap;
                        margin-top: auto; /* Push footer to bottom in normal view */
                        flex-shrink: 0; /* Prevent footer from shrinking */
                    }
                    /* Removed .footer::before */
                    .footer span {
                        margin: 3px 10px;
                        white-space: nowrap;
                    }
                    .footer i { /* Using text emojis as placeholders */
                        margin-right: 5px;
                        color: white; /* White icons */
                    }

                    /* Print specific styles */
                    @media print {
                        body {
                            font-size: 10pt;
                            color: #000;
                            background-color: #fff;
                        }
                        .page-container {
                            border: none;
                            box-shadow: none;
                            margin: 0;
                            width: 100%;
                            max-width: none;
                            min-height: 100%; /* Re-add min-height for print */
                            height: 100%; /* Re-add height for print */
                            /* position: relative; /* Not needed for flex */
                            /* padding-bottom: 60px; /* Not needed if flex works */
                        }
                        .header {
                             background: linear-gradient(to right, #008080, #20B2AA, #48D1CC) !important; /* Ensure gradient prints */
                            -webkit-print-color-adjust: exact;
                            color-adjust: exact;
                            color: white !important;
                        }
                         .header .header-icon-container {
                             background-color: #48D1CC !important;
                             -webkit-print-color-adjust: exact;
                             color-adjust: exact;
                         }
                        .patient-details span, .insurance-diagnosis span {
                             border-bottom: 1px solid #777;
                         }
                        .footer {
                            background: linear-gradient(to right, #008080, #20B2AA, #48D1CC) !important; /* Teal gradient */
                            color: white !important;
                            -webkit-print-color-adjust: exact;
                            color-adjust: exact;
                            /* position: fixed; /* Revert to flex for print */
                            /* bottom: 0; */
                            /* left: 0; */
                            /* right: 0; */
                            /* width: 100%; */
                            padding: 10px 40px; /* Re-apply padding */
                            /* box-sizing: border-box; */
                            /* z-index: 10; */
                            page-break-inside: avoid; /* Keep avoid for flex */
                        }
                        /* Removed watermark print styles */
                        /* Removed caduceus print styles */
                    }
                </style>
            `);
            printWindow.document.write('</head><body>');
            printWindow.document.write('<div class="page-container">'); // Wrap content
            printWindow.document.write(content);
            printWindow.document.write('</div>'); // Close wrapper
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus(); // Focus the new window
            try {
                 // Call print directly, without setTimeout
                 printWindow.print();
            } catch (e) {
                 console.error("Error initiating print:", e);
            }
        } else {
            // Use doctor's preferred language from context for the alert
            const userLang = user?.languagePreference || 'fr'; // Corrected: use 'user'
            const alertMsg = userLang === 'en'
                ? "Could not open print window. Please check your browser settings (pop-up blocker)."
                : "Impossible d'ouvrir la fenêtre d'impression. Vérifiez les paramètres de votre navigateur (bloqueur de pop-up).";
            alert(alertMsg);
        }
    };


    const handlePrint = async () => {
        console.log("Attempting to print. Saved Consultation ID:", savedConsultationId);

        let printData = {
            patientName: `${patient?.firstName || ''} ${patient?.lastName || ''}`,
            patientDOB: formatDate(patient?.birthDate),
            patientAge: calculateAge(patient?.birthDate),
            consultationDate: formatDate(new Date()), // Use current date for unsaved
            consultationText: consultationText, // Keep for date logic, but won't be displayed
            prescriptionText: prescriptionText,
            // Use doctor details from context
            doctorName: user?.name || "[Nom Docteur Manquant]", // Corrected: use 'user'
            doctorAddress: user?.activeCabinet?.address || "[Adresse Cabinet Manquante]", // Corrected: use 'user'
            doctorTel: user?.activeCabinet?.tel || "[Tel Cabinet Manquant]", // Corrected: use 'user'
        };

        // Determine language for labels from context
        const lang = user?.languagePreference === 'en' ? 'en' : 'fr'; // Corrected: use 'user'
        const labels = {
            title: lang === 'en' ? "Medical Prescription" : "Ordonnance Médicale",
            doctorInfo: lang === 'en' ? "Doctor Information" : "Informations Docteur",
            nameLabel: lang === 'en' ? "Patient Name" : "Nom Patient",
            // addressLabel removed
            ageLabel: lang === 'en' ? "Age" : "Age",
            telLabel: lang === 'en' ? "Tel" : "Tél",
            patientInfo: lang === 'en' ? "Patient Information" : "Informations Patient",
            dobLabel: lang === 'en' ? "Date of Birth" : "Date de Naissance",
            yearsLabel: lang === 'en' ? "years" : "ans",
            prescriptionLabel: lang === 'en' ? "Prescription" : "Prescription",
            noPrescription: lang === 'en' ? "<i>No prescription text.</i>" : "<i>Aucune prescription.</i>",
            dateLabel: lang === 'en' ? "Date" : "Date",
            signatureLabel: lang === 'en' ? "Signature" : "Signature", // Adjusted label
        };


        if (savedConsultationId) {
            // --- Option 1: Fetch definitive data from backend (Preferred if endpoint exists) ---
            try {
                setSaveStatus('Chargement des données d\'impression...'); // Use saveStatus for feedback
                // Assume an endpoint exists to get all necessary print data
                const response = await apiClient.get(`/api/ordonnances/consultation/${savedConsultationId}/print-data`);
                const fetchedData = response.data;
                // Overwrite local data with fetched data (assuming backend returns similar structure)
                printData = {
                    ...printData, // Keep placeholders if backend doesn't return everything
                    patientName: `${fetchedData.patient?.firstName || ''} ${fetchedData.patient?.lastName || ''}`,
                    patientDOB: formatDate(fetchedData.patient?.birthDate),
                    patientAge: calculateAge(fetchedData.patient?.birthDate),
                    consultationDate: formatDate(fetchedData.consultationDate), // Use saved date
                    // consultationText: fetchedData.consultationText || '', // Not needed for print
                    prescriptionText: fetchedData.prescriptionText || '', // Use saved prescription
                    // Doctor details likely don't change per consultation, use state version
                    // doctorName: fetchedData.doctorName || printData.doctorName,
                    // doctorAddress: fetchedData.doctorAddress || printData.doctorAddress,
                    // doctorTel: fetchedData.doctorTel || printData.doctorTel,
                };
                setSaveStatus(''); // Clear loading message
                console.log("Fetched print data (using saved consultation date and prescription):", printData);

             } catch (err) {
                 console.error("Error fetching print data:", err);
                 const errorLang = user?.languagePreference === 'en' ? 'en' : 'fr'; // Corrected: use 'user'
                 const errorMsg = errorLang === 'en'
                    ? `Error fetching print data (ID: ${savedConsultationId}). Printing with current data.`
                    : `Erreur lors de la récupération des données pour l'impression (ID: ${savedConsultationId}). Impression avec les données actuelles.`;
                 setError(errorMsg);
                 setSaveStatus(''); // Clear loading message
                 // Fallback: Use data currently in state if fetch fails
             }

            // --- Option 2: Use data from state even if saved (Simpler if no backend endpoint) ---
            // No fetch needed, printData already populated from state above.

        } else {
            // Printing before saving - printData is already populated with current state.
             console.log("Printing unsaved data from state.");
        }


        // --- Generate HTML Content for the new teal template ---
        // Define labels based on language (simplified for this example)
        const nameLabel = lang === 'en' ? "Patient Name" : "Nom Patient";
        const addressLabel = lang === 'en' ? "Address" : "Adresse";
        const dateLabel = lang === 'en' ? "Date" : "Date";
        const insuranceLabel = lang === 'en' ? "Insurance" : "Assurance";
        const diagnosisLabel = lang === 'en' ? "Diagnosis" : "Diagnostic";
        const signatureLabel = lang === 'en' ? "Signature" : "Signature";
        const prescriptionTitleLabel = "Ordonnance Médicale"; // Changed title

        const printHtml = `
            <div class="header">
                 <div class="doctor-info">
                    <div class="doctor-name">Dr. ${printData.doctorName === '[Nom Docteur Manquant]' ? 'N/A' : printData.doctorName}</div>
                    <div class="doctor-qualification">${user?.qualification || ''}</div>
                 </div>
                 <div class="header-icon-container">
                     <span class="header-icon">🩺</span>
                 </div>
            </div>

             <div class="prescription-title-container">${prescriptionTitleLabel}</div>

            <div class="content-wrapper">
                 <div class="body-content">
                     <div class="body-left">
                         <div class="patient-details">
                             <label>${nameLabel}:</label>
                             <span>${printData.patientName || ''}</span>
                             <label>${labels.ageLabel}:</label>
                             <span>${printData.patientAge !== 'N/A' ? `${printData.patientAge} ${labels.yearsLabel}` : ''}</span>
                             <label>${dateLabel}:</label>
                             <span>${printData.consultationDate || ''}</span>
                         </div>
                     </div>
                     <div class="body-right">

                     </div>
                 </div>

                 <div class="prescription-content" style="margin-top: 20px; padding-bottom: 40px;">
                     ${printData.prescriptionText || '<i>Aucune prescription.</i>'}
                 </div>

                 <div class="signature-area">
                     <div class="signature-line"></div>
                     <div class="signature-label">${signatureLabel}</div>
                 </div>
            </div>

            <div class="footer">
                 <span>📞 ${printData.doctorTel && printData.doctorTel !== '[Tel Cabinet Manquant]' ? printData.doctorTel : '50879558'}</span>
                 <span>✉️ ${user?.email || 'dr1wissalferchichi28@gmail.com'}</span>
                 <span>📍 ${printData.doctorAddress && printData.doctorAddress !== '[Adresse Cabinet Manquante]' ? printData.doctorAddress : 'france'}</span>
            </div>
        `;

        // --- Trigger Print ---
        printContent(printHtml);


        // Original commented out code:
        // alert("Fonctionnalité d'impression à implémenter.\nRécupération des données depuis /api/ordonnances/consultation/" + consultationId + "/print-data");
        // try {
        //     // Fetch print data using apiClient if implemented
        //     const response = await apiClient.get(`/api/ordonnances/consultation/${consultationId}/print-data`);
        //     const printData = response.data;
        //     // Call a function to generate PDF using printData (e.g., using jsPDF)
        //     // generatePrescriptionPDF(printData);
        // } catch (err) {
        //     console.error("Error fetching print data:", err);
        //     alert("Erreur lors de la récupération des données pour l'impression.");
        // }
    };

    const handleExamRedirect = () => {
        // Pass patientId or consultationId if needed by the exam form
        // Pass appointmentId instead of consultationId
        // Corrected: Use patient?.id instead of patient?.idPatient
        navigate(`/consultation/exam/new?patientId=${patient?.id}&appointmentId=${appointmentId}`);
    };


    // --- Render Logic ---
    if (isLoading) {
        return <div style={{ padding: '20px' }}>Chargement des détails du rendez-vous...</div>;
    }

    if (error && !patient) { // Show main error if patient couldn't be loaded
        return <div className="error-message" style={{ padding: '20px', color: 'red' }}>Erreur : {error}</div>;
    }

    // We don't have a consultation object initially, we rely on patient object
    if (!patient) {
         // This case might be covered by the error check above, but good as a fallback
        return <div style={{ padding: '20px' }}>Impossible de charger les informations du patient pour ce rendez-vous.</div>;
    }


    return (
        <div className="consultation-page-container" style={{ padding: '20px' }}>
            {/* Title reflects new consultation based on appointment */}
            <h2>Nouvelle Consultation </h2>

            {/* --- Patient Info --- */}
            <h3>Informations Patient</h3>
            {patient ? (
                <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #eee' }}>
                    <p><strong>Nom :</strong> {patient.lastName || 'N/A'} {patient.firstName || 'N/A'}</p>
                    <p><strong>Date de Naissance :</strong> {formatDate(patient.birthDate)} <br></br>
                    <p></p>
                    <p><strong>Age:</strong>  {calculateAge(patient.birthDate)} ans</p></p>
                    <p><strong>Email :</strong> {patient.email || 'N/A'}</p>
 
                 </div>
            ) : (
                <p>Chargement des informations du patient...</p>
            )}

            {/* --- History Section --- */}
            <div style={{ marginBottom: '30px' }}>
                <button onClick={handleToggleHistory} className="btn btn-secondary">
                    🕘 {showHistory ? 'Masquer' : 'Afficher'} l'Historique Consultations & Ordonnances
                </button>
                {showHistory && (
                    <div style={{ marginTop: '15px', padding: '15px', border: '1px solid #ddd', backgroundColor: '#f9f9f9' }}>
                        <h4>Historique</h4>
                        {historyLoading && <p>Chargement de l'historique...</p>}
                        {historyError && <p style={{ color: 'red' }}>Erreur historique : {historyError}</p>}
                        {!historyLoading && !historyError && consultationHistory.length === 0 && <p>Aucun historique trouvé.</p>}
                        {!historyLoading && !historyError && consultationHistory.map((histConsult) => (
                            <div key={histConsult.idConsultation} style={{ marginBottom: '15px', padding: '10px', borderBottom: '1px solid #eee' }}>
                                <p><strong>Date :</strong> {formatDate(histConsult.dateConsultation)}</p>
                                <p><strong>Consultation :</strong></p>
                                <div dangerouslySetInnerHTML={{ __html: histConsult.text || '<i>Aucun texte</i>' }} />
                                {histConsult.prescribedMedications && (
                                    <>
                                        <p style={{ marginTop: '10px' }}><strong>Ordonnance :</strong></p>
                                        <div dangerouslySetInnerHTML={{ __html: histConsult.prescribedMedications.prescribedMedications || '<i>Aucune ordonnance</i>' }} />
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- Consultation Editors --- */}
            <div style={{ marginBottom: '20px' }}>
                <h4>📝 Consultation</h4>
                <ReactQuill
                    theme="snow"
                    value={consultationText}
                    onChange={setConsultationText}
                    style={{ backgroundColor: 'white', minHeight: '150px' }}
                />
            </div>

            <div style={{ marginBottom: '30px' }}>
                <h4>💊 Ordonnance</h4>
                 <ReactQuill
                    theme="snow"
                    value={prescriptionText}
                    onChange={setPrescriptionText}
                    style={{ backgroundColor: 'white', minHeight: '150px' }}
                />
            </div>

             {/* --- Action Buttons --- */}
            <div className="consultation-actions">
                 {saveStatus && <p style={{ color: error ? 'red' : 'green', marginBottom: '10px' }}>{saveStatus}</p>}
                 {error && <p style={{ color: 'red', marginBottom: '10px' }}>Erreur: {error}</p>}
                <button
                    onClick={handleSave}
                    className="btn btn-primary"
                    style={{ marginRight: '10px' }}
                    disabled={saveStatus === 'Sauvegarde en cours...'} // Disable button while saving
                >
                    {saveStatus === 'Sauvegarde en cours...' ? 'Sauvegarde...' : (savedConsultationId ? '🔵 METTRE À JOUR' : '🔵 ENREGISTRER')}
                </button>
                <button onClick={handlePrint} className="btn btn-info" style={{ marginRight: '10px' }}>
                    🖨️ IMPRIMER
                </button>
                <button onClick={handleExamRedirect} className="btn btn-warning">
                    🔬 EXAM
                </button>
            </div>
        </div>
    );
};

export default ConsultationPage;
