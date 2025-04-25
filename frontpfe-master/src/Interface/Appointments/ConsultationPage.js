import React, { useState, useEffect, useContext, useRef } from 'react'; // Import useContext AND useRef
import { useParams, useNavigate } from 'react-router-dom'; // Import useNavigate
import apiClient from '../../utils/apiClient'; // Import apiClient instead of axios
import ReactQuill from 'react-quill'; // Import ReactQuill
// Assuming AuthContext exists and provides user details
import AuthContext from '../../context/AuthContext'; // Corrected: Default import
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
// Optional: Add CSS for styling
// import './ConsultationPage.css';

const ConsultationPage = () => {
    // Get EITHER appointmentId OR consultationId from URL params
    const { appointmentId, consultationId } = useParams();
    const navigate = useNavigate(); // Hook for navigation

    // Mode state
    const [isEditMode, setIsEditMode] = useState(!!consultationId); // True if consultationId exists

    // State for appointment/consultation data
    const [appointment, setAppointment] = useState(null); // Store fetched appointment
    const [patient, setPatient] = useState(null);
    const [consultationText, setConsultationText] = useState(''); // Initialize as empty for new consultation
    const [prescriptionText, setPrescriptionText] = useState(''); // Initialize as empty for new consultation
    const [savedConsultationId, setSavedConsultationId] = useState(consultationId ? Number(consultationId) : null); // Initialize if editing

    // State for history
    const [showHistory, setShowHistory] = useState(false);
    const [consultationHistory, setConsultationHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState('');

    // General loading and error state
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [saveStatus, setSaveStatus] = useState(''); // To show save success/error messages
    const isSavingRef = useRef(false); // Ref to track saving state synchronously

    // Get user details from AuthContext
    // Ensure AuthContext provides user object with name, languagePreference, activeCabinet { address, tel }
    const { user } = useContext(AuthContext); // Corrected: use 'user' instead of 'userDetails'

    // Log the user object received from context for debugging
    useEffect(() => {
        console.log("ConsultationPage - User from context:", JSON.stringify(user, null, 2)); // Log user object from context
    }, [user]);

    // Combined useEffect for fetching data based on mode (New vs Edit)
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError('');
            setSaveStatus('');
            setConsultationText('');
            setPrescriptionText('');
            setPatient(null);
            setAppointment(null); // Reset appointment too

            if (consultationId) {
                // --- EDIT/VIEW MODE ---
                setIsEditMode(true);
                setSavedConsultationId(Number(consultationId)); // Ensure ID is set for saving updates
                console.log(`EDIT MODE: Fetching consultation details for ID: ${consultationId}`);
                try {
                    // Fetch the specific CONSULTATION details using apiClient
                    const response = await apiClient.get(`/api/consultations/${consultationId}`);
                    const consultData = response.data;
                    console.log("Fetched consultation details:", consultData);

                    // Populate state from fetched consultation DTO
                    setConsultationText(consultData.text || '');
                    setPrescriptionText(consultData.prescriptionText || ''); // Use the new field from DTO

                   // Fetch full patient details using the patientId from the consultation
                   if (consultData.patientId) {
                       try {
                           console.log(`Fetching full patient details for ID: ${consultData.patientId}`);
                           // Corrected endpoint based on UserController.java
                           const patientResponse = await apiClient.get(`/Users/allid/${consultData.patientId}`);
                           console.log("Fetched full patient details:", patientResponse.data);
                           setPatient(patientResponse.data || null); // Set patient state with full details
                           if (!patientResponse.data) {
                               setError('Détails complets du patient non trouvés.');
                           }
                       } catch (patientErr) {
                           console.error("Error fetching full patient details:", patientErr);
                           // Check specifically for 404 on the new endpoint
                           if (patientErr.response && patientErr.response.status === 404) {
                               setError(`Patient avec ID ${consultData.patientId} non trouvé via /Users/allid/.`);
                           } else {
                               setError(patientErr.response?.data?.message || `Échec de la récupération des détails pour le patient ${consultData.patientId}.`);
                           }
                           setPatient(null); // Clear patient on error
                       }
                   } else {
                       setError('ID du patient manquant dans les données de consultation.');
                       setPatient(null);
                   }

                } catch (err) {
                    console.error("Error fetching consultation details:", err);
                    if (err.response && err.response.status === 404) {
                        setError(`Consultation avec ID ${consultationId} non trouvée.`);
                    } else {
                        setError(err.response?.data?.message || `Échec de la récupération des détails pour la consultation ${consultationId}.`);
                    }
                    setPatient(null); // Clear patient on error
                } finally {
                    setIsLoading(false);
                }

            } else if (appointmentId) {
                // --- NEW CONSULTATION MODE (Existing Logic) ---
                setIsEditMode(false);
                setSavedConsultationId(null); // Ensure no ID for new consultation save
                console.log(`NEW MODE: Fetching appointment details for ID: ${appointmentId}`);
                try {
                    const response = await apiClient.get(`/api/rendezvous/${appointmentId}`);
                    console.log("Fetched appointment details:", response.data);
                    const apptData = response.data;
                    setAppointment(apptData);
                    setPatient(apptData.patient || null);

                    if (!apptData.patient) {
                        setError('Détails du patient non trouvés dans les données du rendez-vous.');
                    }
                    // Draft creation logic removed from here to prevent auto-creation on load.
                    // Consultation will now only be created/saved when the 'handleSave' button is clicked.
                } catch (err) {
                    console.error("Error fetching appointment details:", err);
                    if (err.response && err.response.status === 404) {
                        setError(`Rendez-vous avec ID ${appointmentId} non trouvé.`);
                    } else {
                        setError(err.response?.data?.message || `Échec de la récupération des détails pour le rendez-vous ${appointmentId}.`);
                    }
                    setPatient(null);
                    // Draft creation logic was moved up into the try block
                } finally {
                    setIsLoading(false);
                }
            } else {
                // --- INVALID STATE ---
                setError("ID de rendez-vous ou de consultation manquant dans l'URL.");
                setIsLoading(false);
            }
        };

        fetchData();
    }, [appointmentId, consultationId]); // Depend on both IDs

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
                const response = await apiClient.get(`/api/consultations/patient/${patient.id}/history`);
                let historyData = response.data || [];

                // Filter out the current consultation if in edit mode
                if (isEditMode && consultationId) {
                    historyData = historyData.filter(hist => hist.idConsultation !== Number(consultationId));
                }

                setConsultationHistory(historyData);
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
        // Prevent duplicate clicks using the ref
        if (isSavingRef.current) {
            console.log(`[handleSave ENTRY BLOCKED] isSavingRef=${isSavingRef.current}`);
            return;
        }
        console.log(`[handleSave ENTRY] isSavingRef=${isSavingRef.current}, isEditMode=${isEditMode}, savedConsultationId=${savedConsultationId}`);

        isSavingRef.current = true; // Set saving flag
        console.log(`[handleSave SET isSavingRef=true]`);

        setSaveStatus('Sauvegarde en cours...'); // Still use state for UI feedback
        setError('');

        // Add check for user, user.id, user.activeCabinet, and user.activeCabinet.id
        if (!user || !user.id || !user.activeCabinet || !user.activeCabinet.id) {
             setError("Impossible de récupérer l'ID du médecin ou du cabinet actif. Veuillez vérifier votre session.");
             setSaveStatus('Erreur');
             console.log("[handleSave EXIT] Error: Logged-in user ID or active cabinet ID missing.");
             isSavingRef.current = false; // Reset flag on early exit
             return;
        }

        if (!patient) {
            setError("ID Patient manquant pour la sauvegarde.");
            console.log("[handleSave EXIT] Error: Patient missing."); // Log error
            setSaveStatus('Erreur'); // Indicate error state
            isSavingRef.current = false; // Reset flag on early exit
            return;
        }


        try {
            const payload = {
                patientId: patient.id,
                doctorId: user.id, // Add the logged-in doctor's ID
                cabinetId: user.activeCabinet.id, // Add the active cabinet's ID
                rendezVousId: appointmentId, // Keep sending appointmentId for context if needed by backend
                consultationText: consultationText,
                prescriptionText: prescriptionText,
            };

            // If we have a savedConsultationId (FROM STATE), include it in the payload for update
            if (savedConsultationId) { // <--- Check state variable
                payload.idConsultation = savedConsultationId;
                console.log(`[handleSave PAYLOAD] Included existing savedConsultationId: ${savedConsultationId}`);
            }

            console.log(`[handleSave REQUEST] Sending payload: ${JSON.stringify(payload)}`);
            console.time("apiClient.post"); // Start timer
            // Use the same POST endpoint; backend service differentiates create/update based on idConsultation presence
            const response = await apiClient.post(`/api/consultations`, payload); // <--- Send payload
            console.log("[handleSave RESPONSE] Received response:", response.data); // Log full response

            const returnedConsultationId = response.data.idConsultation; // Use the ID returned by backend
            console.log(`[handleSave RESPONSE] Received consultationId: ${returnedConsultationId}`); // Log received ID
            // Update success message and state based on whether it was a create or update

            // If it was a new consultation, update the mode FIRST.
            if (!isEditMode && returnedConsultationId) { // Check we got an ID back
                 setIsEditMode(true); // Set edit mode first
                 setSavedConsultationId(returnedConsultationId); // Then set the ID
                 setSaveStatus('Consultation créée avec succès !'); // Then set status
                 // Optionally update URL without full reload if needed, but might be complex
                 // navigate(`/consultation/details/${returnedConsultationId}`, { replace: true });
            } else {
                // If it was an update or no ID returned, just set status and potentially the ID again
                setSavedConsultationId(returnedConsultationId); // Ensure ID state is updated even on update
                setSaveStatus('Consultation mise à jour avec succès !');
            }

        } catch (err) {
            console.error("[handleSave ERROR] Error saving consultation:", err); // Log error details
            console.timeEnd("apiClient.post"); // End timer on error
            const errorMsg = err.response?.data?.message || (isEditMode ? 'Échec de la mise à jour de la consultation.' : 'Échec de la création de la consultation.');
            setError(errorMsg);
            setSaveStatus('Erreur'); // Indicate error state
        } finally {
            console.timeEnd("apiClient.post"); // End timer in finally
            isSavingRef.current = false; // Reset saving flag in finally block
            console.log(`[handleSave EXIT] isSavingRef reset to false.`);
        }
    };

    // Print function using a hidden iframe - Refined for stability and cleanup
    const printContent = (content) => {
        const iframeId = 'print-iframe';
        let iframe = document.getElementById(iframeId);

        // Remove existing iframe if it exists (clean slate)
        if (iframe) {
            try {
                iframe.parentNode.removeChild(iframe);
            } catch (e) {
                console.warn("Could not remove existing print iframe:", e);
            }
        }

        // Create the iframe
        iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden'; // Hide the iframe
        iframe.style.left = '-9999px'; // Move off-screen

        document.body.appendChild(iframe);

        // Get the iframe's document context and window
        const iframeDoc = iframe.contentWindow.document;
        const iframeWin = iframe.contentWindow;

        // Write the HTML content to the iframe
        iframeDoc.open();
        iframeDoc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ordonnance Médicale</title>'); // Added Doctype and charset
        // Add styles directly here (same styles as before)
        iframeDoc.write(`
            <style>
                /* Ensure styles are applied correctly */
                @page { size: A4; margin: 0; } /* Optional: Define page size */
                html, body { height: 100%; margin: 0; padding: 0; }
                body { font-family: Arial, sans-serif; font-size: 12px; color: #333; background-color: #fff; }
                .page-container { width: 100%; max-width: 800px; margin: 0 auto; padding: 0; background-color: white; position: relative; min-height: 100%; display: flex; flex-direction: column; }
                .content-wrapper { flex: 1 0 auto; padding: 20px 40px; z-index: 1; }
                .header { background: linear-gradient(to right, #008080, #20B2AA, #48D1CC); color: white; padding: 10px 40px; display: flex; justify-content: space-between; align-items: center; min-height: 60px; }
                .header .doctor-info { text-align: left; }
                .header .doctor-name { font-size: 1.3em; font-weight: bold; margin: 0 0 2px 0; }
                .header .doctor-qualification { font-size: 0.9em; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; }
                .header .header-icon-container { background-color: #48D1CC; border-radius: 50%; width: 50px; height: 50px; display: flex; justify-content: center; align-items: center; }
                .header .header-icon { font-size: 1.8em; color: white; }
                .prescription-title-container { text-align: center; margin: 20px 0 15px 0; font-size: 1.4em; font-weight: bold; color: #333; }
                .body-content { display: flex; margin-top: 10px; padding-bottom: 20px; }
                .body-left { width: 50%; padding-right: 20px; box-sizing: border-box; } /* Added box-sizing */
                .body-right { width: 50%; padding-left: 20px; box-sizing: border-box; } /* Added box-sizing */
                .patient-details label, .insurance-diagnosis label { display: block; font-weight: bold; margin-bottom: 2px; font-size: 0.9em; }
                .patient-details span, .insurance-diagnosis span { display: block; border-bottom: 1px dotted #aaa; margin-bottom: 10px; padding: 2px 0; min-height: 1.2em; font-size: 1em; }
                .insurance-diagnosis { margin-top: 0; }
                .signature-area { text-align: right; margin-top: 60px; margin-right: 0; padding-bottom: 20px; }
                .signature-line { border-bottom: 1px solid #555; width: 200px; display: block; margin-bottom: 5px; margin-left: auto; }
                .signature-label { font-size: 0.9em; color: #555; }
                .footer { background: linear-gradient(to right, #008080, #20B2AA, #48D1CC); padding: 10px 40px; font-size: 0.85em; color: white; display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; margin-top: auto; flex-shrink: 0; }
                .footer span { margin: 3px 10px; white-space: nowrap; }
                .footer i { margin-right: 5px; color: white; }
                @media print {
                    html, body { height: auto; } /* Allow content height */
                    body { font-size: 10pt; color: #000; background-color: #fff; -webkit-print-color-adjust: exact; color-adjust: exact; }
                    .page-container { border: none; box-shadow: none; margin: 0; width: 100%; max-width: none; min-height: initial; height: auto; } /* Adjust height for print */
                    .header { background: linear-gradient(to right, #008080, #20B2AA, #48D1CC) !important; color: white !important; }
                    .header .header-icon-container { background-color: #48D1CC !important; }
                    .patient-details span, .insurance-diagnosis span { border-bottom: 1px solid #777; }
                    .footer { background: linear-gradient(to right, #008080, #20B2AA, #48D1CC) !important; color: white !important; padding: 10px 40px; page-break-inside: avoid; position: fixed; bottom: 0; left: 0; right: 0; width: 100%; box-sizing: border-box; } /* Fixed footer for print */
                    .content-wrapper { padding-bottom: 60px; } /* Add padding to avoid overlap with fixed footer */
                }
            </style>
        `);
        iframeDoc.write('</head><body>');
        iframeDoc.write('<div class="page-container">'); // Wrap content
        iframeDoc.write(content); // The actual prescription HTML
        iframeDoc.write('</div>'); // Close wrapper
        iframeDoc.write('</body></html>');
        iframeDoc.close();

        // Function to handle cleanup
        const cleanupIframe = () => {
            const iframeToRemove = document.getElementById(iframeId);
            if (iframeToRemove) {
                try {
                    iframeToRemove.parentNode.removeChild(iframeToRemove);
                    console.log("Print iframe removed.");
                } catch (e) {
                    console.warn("Could not remove print iframe after print:", e);
                }
            }
        };

        // Trigger print on the iframe's window after a short delay
        try {
            setTimeout(() => {
                try {
                    iframeWin.focus(); // Focus iframe window before print
                    const printResult = iframeWin.print(); // Call print

                    // Fallback cleanup using setTimeout, as onafterprint is unreliable
                    // Give it a bit longer to ensure the print dialog interaction is complete
                    setTimeout(cleanupIframe, 2000); // Cleanup after 2 seconds

                } catch (printError) {
                    console.error("Error during iframe print execution:", printError);
                    alert("Erreur lors de l'exécution de l'impression.");
                    cleanupIframe(); // Clean up immediately on error during print call
                }
            }, 100); // Increased delay slightly to 100ms
        } catch (e) {
            console.error("Error setting up print via iframe:", e);
            alert("Erreur lors de la préparation de l'impression.");
            cleanupIframe(); // Clean up immediately if setup fails
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
        // Removed the check for savedConsultationId. It should be populated by the draft creation logic on load.
        // If it's somehow still null, the exam form itself will show an error.
        // Pass patientId, appointmentId, AND the (potentially draft) consultationId
        // Corrected: Use patient?.id instead of patient?.idPatient
        navigate(`/consultation/exam/new?patientId=${patient?.id}&appointmentId=${appointmentId}&consultationId=${savedConsultationId}`);
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
            {/* Dynamic Title */}
            <h2>{isEditMode ? 'Détails Consultation / Modification' : 'Nouvelle Consultation'}</h2>

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
                    disabled={isSavingRef.current} // Disable button based on the ref
                >
                    {/* Dynamic Button Text - still use state for text */}
                    {saveStatus === 'Sauvegarde en cours...' ? 'Sauvegarde...' : (isEditMode ? '🔵 METTRE À JOUR' : '🔵 ENREGISTRER')}
                </button>
                {/* Print button is now always visible */}
                <button onClick={handlePrint} className="btn btn-info" style={{ marginRight: '10px' }}>
                    🖨️ IMPRIMER
                </button>
                {/* Exam button is now always visible */}
                <button onClick={handleExamRedirect} className="btn btn-warning">
                    🔬 EXAM
                </button>
                {/* Removed duplicated button and closing tag */}
            </div>
        </div>
    );
};

export default ConsultationPage;
