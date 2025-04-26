import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { getToken, clearUserData, isTokenExpired } from '../../utils/auth'; // Added auth utils
// Optional: Add CSS for styling
import './CabinetList.css'; // Import the CSS file

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const CabinetList = () => {
    const { t } = useTranslation(); // Initialize translation function
    const [cabinets, setCabinets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedCabinetQr, setSelectedCabinetQr] = useState(null); // To store QR code data URL
    const [selectedCabinetDetails, setSelectedCabinetDetails] = useState(null); // To store details for printing
    const navigate = useNavigate();

    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert(t('manageCabinets.sessionExpired', 'Session expired due to inactivity or invalid token.')); // Add a translation key
        navigate("/sign-in");
    }, [navigate, t]); // Add dependencies

    // --- Token Expiry & Inactivity Checks ---
    useEffect(() => {
        const token = getToken();
        if (!token || isTokenExpired(token)) {
            performLogout();
            return; // Stop further execution in this effect
        }

        // Token expiry timer
        let expiryTimer;
        try {
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            const expiryTime = decodedToken.exp * 1000;
            const currentTime = Date.now();
            const timeToExpire = expiryTime - currentTime;

            if (timeToExpire > 0) {
                expiryTimer = setTimeout(performLogout, timeToExpire);
            } else {
                performLogout(); // Token already expired
                return; // Stop further execution
            }
        } catch (err) {
            console.error("Error decoding token for expiry check:", err);
            performLogout(); // Logout on error
            return; // Stop further execution
        }

        // Inactivity timer setup
        let inactivityTimer;
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(performLogout, INACTIVITY_TIMEOUT);
        };

        const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
        activityEvents.forEach(event => window.addEventListener(event, resetTimer));
        resetTimer(); // Initial setup

        // Cleanup function
        return () => {
            clearTimeout(expiryTimer); // Clear token expiry timer
            clearTimeout(inactivityTimer); // Clear inactivity timer
            activityEvents.forEach(event => window.removeEventListener(event, resetTimer)); // Remove listeners
        };
    }, [performLogout]); // Dependency array includes performLogout


    // --- Fetch Cabinets ---
    useEffect(() => {
        const fetchCabinets = async () => {
            setLoading(true);
            setError('');
            const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
            if (!token) {
                setError(t('manageCabinets.authRequired'));
                setLoading(false);
                // navigate('/sign-in'); // Optional redirect
                return;
            }

            try {
                 const response = await axios.get('http://localhost:6952/cabinets', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                // Ensure response.data is an array before setting state
                if (Array.isArray(response.data)) {
                    setCabinets(response.data);
                } else {
                    console.warn("Received non-array data for cabinets:", response.data);
                    setCabinets([]); // Set to empty array to prevent .map error
                    setError(t('manageCabinets.unexpectedData'));
                }
            } catch (err) {
                console.error("Error fetching cabinets:", err);
                setCabinets([]); // Ensure cabinets is an empty array on error
                 if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                     setError(t('manageCabinets.permissionDenied'));
                 } else {
                    // Attempt to get a more specific error message if available
                    const errorMsg = err.response?.data?.message || err.message || 'Erreur lors de la récupération des cabinets.';
                    setError(t('manageCabinets.fetchError') + `: ${errorMsg}`); // Add prefix
                 }
            } finally {
                setLoading(false);
            }
        };

        fetchCabinets();
    // Removed navigate from dependency array as it's covered by performLogout -> navigate
    }, [t, performLogout]); // Added t and performLogout as dependencies if needed by error messages/logout logic inside fetch

    const handleShowQrCode = async (cabinet) => { // Pass the whole cabinet object
        setError('');
        setSelectedCabinetQr(null); // Clear previous QR code
        setSelectedCabinetDetails(null); // Clear previous details
         const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
         if (!token) {
             setError(t('manageCabinets.authRequired'));
             // Maybe call performLogout() here instead of just returning?
             // performLogout();
             return;
         }

        try {
             // Assuming the backend URL is http://localhost:6952
            const response = await axios.get(`http://localhost:6952/cabinets/${cabinet.idSite}/qrcode`, { // Use cabinet.idSite
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'arraybuffer' // Important to get image data correctly
            });

            // Convert arraybuffer to base64 data URL
            const base64 = btoa(
              new Uint8Array(response.data).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                '',
              ),
            );
            setSelectedCabinetQr(`data:${response.headers['content-type']};base64,${base64}`);
            setSelectedCabinetDetails(cabinet); // Store the selected cabinet's details

        } catch (err) {
             console.error("Error fetching QR code:", err);
              if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                  setError(t('manageCabinets.qrPermissionDenied'));
              } else if (err.response && err.response.status === 404) {
                   setError(t('manageCabinets.qrNotFound'));
              }
              else {
                 setError(t('manageCabinets.qrError'));
              }
        }
    };

    // --- Print Function ---
    const handlePrint = () => {
        if (!selectedCabinetQr || !selectedCabinetDetails) return;

        const printWindow = window.open('', '_blank', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write(`<html><head><title>${t('manageCabinets.buttons.print')} QR Code</title>`); // Translate title
            // Basic styling for print
            printWindow.document.write('<style>');
            printWindow.document.write(`
                body { font-family: sans-serif; padding: 20px; }
                h3 { border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                img { max-width: 200px; display: block; margin: 15px 0; }
                p { margin: 5px 0; }
            `);
            printWindow.document.write('</style></head><body>');

            // Content to print
            // Translate print content
            printWindow.document.write(`<h3>${t('manageCabinets.tableHeaders.name')}: ${selectedCabinetDetails.name}</h3>`);
            printWindow.document.write(`<p><strong>${t('manageCabinets.tableHeaders.address')}:</strong> ${selectedCabinetDetails.address}</p>`);
            printWindow.document.write(`<p><strong>${t('manageCabinets.tableHeaders.phone')}:</strong> ${selectedCabinetDetails.tel || t('manageCabinets.notAvailable')}</p>`);
            printWindow.document.write(`<p><strong>${t('manageCabinets.tableHeaders.qrCode')} ${t('signUp')}:</strong></p>`); // Combine keys
            printWindow.document.write(`<img src="${selectedCabinetQr}" alt="QR Code Inscription ${selectedCabinetDetails.name}" />`);

            printWindow.document.write('</body></html>');
            printWindow.document.close(); // Necessary for IE >= 10
            printWindow.focus(); // Necessary for IE >= 10

            // Use timeout to ensure content is loaded before printing
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250); // Adjust timeout if needed

        } else {
            alert(t('manageCabinets.printPopupError'));
        }
    };

    // --- Edit Function (Will navigate to separate form) ---
    const handleEdit = (cabinetId) => {
        navigate(`/edit-cabinet/${cabinetId}`); // Navigate to the edit route
    };

    // --- Delete Function ---
    const handleDelete = async (cabinetId) => {
        if (!window.confirm(t('manageCabinets.deleteConfirm', { id: cabinetId }))) {
            return; // Stop if user cancels
        }

        setError(''); // Clear previous errors
        const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
        if (!token) {
            setError(t('manageCabinets.deleteAuthRequired'));
            // Optionally redirect to login
            return;
        }

        try {
            const response = await axios.delete(`http://localhost:6952/cabinets/${cabinetId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 204) { // 204 No Content is typical for successful DELETE
                alert(t('manageCabinets.deleteSuccess'));
                // Remove the cabinet from the local state to update the UI
                setCabinets(prevCabinets => prevCabinets.filter(cabinet => cabinet.idSite !== cabinetId));
            } else {
                 // Should not happen with 204, but handle defensively
                setError(t('manageCabinets.unexpectedResponse', { status: response.status }));
            }

        } catch (err) {
            console.error("Error deleting cabinet:", err);
            if (err.response) {
                 if (err.response.status === 401 || err.response.status === 403) {
                     setError(t('manageCabinets.deletePermissionDenied'));
                     // Optionally redirect or logout
                 } else if (err.response.status === 404) {
                     setError(t('manageCabinets.deleteNotFound'));
                 } else {
                    setError(t('manageCabinets.deleteError', { message: err.response.data?.message || err.response.statusText || 'Erreur inconnue' }));
                 }
            } else {
                 setError(t('manageCabinets.deleteNetworkError'));
            }
             // Display error in an alert as well for immediate feedback
             // Consider calling performLogout on auth errors here too
             // if (err.response && (err.response.status === 401 || err.response.status === 403)) { performLogout(); }
             alert(error); // Alert the already translated error message from setError
        }
    };


    if (loading) {
        return <div>{t('manageCabinets.loading')}</div>;
    }

    return (
        <div className="cabinet-list-container"> {/* Add container class */}
            <h2>{t('manageCabinets.title')}</h2>
            {error && <p className="error-message">{error}</p>}

            {cabinets.length === 0 && !error && <p>{t('manageCabinets.noCabinets')}</p>}

            {cabinets.length > 0 && (
              <div className="table-responsive"> {/* Add Bootstrap responsive wrapper */}
                <table className="table table-striped table-hover custom-table"> {/* Add Bootstrap table classes */}
                    <thead>
                        <tr>
                            
                            <th>{t('manageCabinets.tableHeaders.name')}</th>
                            <th>{t('manageCabinets.tableHeaders.address')}</th>
                            <th>{t('manageCabinets.tableHeaders.phone')}</th>
                            <th>{t('manageCabinets.tableHeaders.actions')}</th>
                            <th>{t('manageCabinets.tableHeaders.qrCode')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cabinets.map(cabinet => (
                            <tr key={cabinet.idSite}>
                                 
                                {/* Display Mode Cells */}
                                <td>{cabinet.name}</td>
                                <td>{cabinet.address}</td>
                                <td>{cabinet.tel || t('manageCabinets.notAvailable')}</td>
                                <td> {/* Removed inline style */}
                                    {/* Use Bootstrap button classes */}
                                    <button onClick={() => handleEdit(cabinet.idSite)} className="btn btn-sm btn-outline-primary me-1">{t('manageCabinets.buttons.edit')}</button>
                                    <button onClick={() => handleDelete(cabinet.idSite)} className="btn btn-sm btn-danger">{t('manageCabinets.buttons.delete')}</button>
                                </td>
                                <td>
                                    <button onClick={() => handleShowQrCode(cabinet)} className="btn btn-sm btn-info">{t('manageCabinets.buttons.showQr')}</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div> // Close table-responsive wrapper
            )}

            {selectedCabinetQr && (
                <div className="qr-code-display mt-4 p-3 border rounded bg-light"> {/* Added Bootstrap classes */}
                    <h3 className="mb-3">{t('manageCabinets.qrModal.title')}</h3>
                    <img src={selectedCabinetQr} alt="QR Code Inscription Cabinet" className="img-fluid mb-3" style={{maxWidth: '200px', border: '1px solid #ccc'}} /> {/* Added Bootstrap class */}
                    <div> {/* Wrapper for buttons */}
                        <button onClick={() => { setSelectedCabinetQr(null); setSelectedCabinetDetails(null); }} className="btn btn-secondary me-2">{t('manageCabinets.buttons.close')}</button>
                        <button onClick={handlePrint} className="btn btn-success">{t('manageCabinets.buttons.print')}</button>
                    </div>
                    <p className="mt-2"><small>{t('manageCabinets.qrModal.scanMessage')}</small></p>
                </div>
            )}
        </div>
    );
}; // End of CabinetList component function

export default CabinetList;
