import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/apiClient'; // Import the shared apiClient
import { Link, useNavigate } from 'react-router-dom'; // Import Link and useNavigate
import './CentreDexamenList.css'; // Import the CSS file
import { useTranslation } from 'react-i18next'; // For localization

const CentreDexamenList = () => {
    const { t } = useTranslation();
    const [centres, setCentres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // State to manage the displayed QR code and details (like in CabinetList)
    const [selectedCentreQr, setSelectedCentreQr] = useState(null);
    const [selectedCentreDetails, setSelectedCentreDetails] = useState(null);
    const navigate = useNavigate(); // Hook for navigation

    useEffect(() => {
        fetchCentres();
    }, []); // Empty dependency array means run once on mount

    const fetchCentres = async () => {
        setLoading(true);
        setError(''); // Clear previous errors
        setSelectedCentreQr(null); // Clear QR display on refresh
        setSelectedCentreDetails(null);
        const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
         if (!token) {
             setError(t('manageCabinets.authRequired')); // Reuse key
             setLoading(false);
             return;
         }

        try {
            const response = await apiClient.get('/api/centres-examen', {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            if (Array.isArray(response.data)) {
                 setCentres(response.data); // Corrected setter
            } else {
                 console.warn("Received non-array data for centres:", response.data);
                 setCentres([]); // Corrected setter
                 setError(t('manageCabinets.unexpectedData')); // Reuse key
            }
        } catch (err) {
            console.error("Error fetching centres:", err);
            setCentres([]); // Corrected setter
             if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                 setError(t('manageCabinets.permissionDenied')); // Reuse key
             } else {
                const errorMsg = err.response?.data?.message || err.message || 'Erreur';
                setError(t('manageCabinets.fetchError') + `: ${errorMsg}`); // Reuse key
             }
        } finally {
            setLoading(false);
        }
    };

    // Function to fetch and display QR code for a specific centre
    const handleShowQrCode = async (centre) => {
        setError('');
        setSelectedCentreQr(null); // Clear previous QR code
        setSelectedCentreDetails(null); // Clear previous details
        const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
        if (!token) {
            setError(t('manageCabinets.authRequired')); // Reuse key
            return;
        }

        try {
            // Fetch QR code from backend
            const qrResponse = await apiClient.get(`/api/centres-examen/${centre.idCentre}/qrcode`, {
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'arraybuffer'
            });
            // Convert arraybuffer to base64 data URL
            const base64 = btoa(
                new Uint8Array(qrResponse.data).reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    ''
                )
            );
            setSelectedCentreQr(`data:image/png;base64,${base64}`);
            setSelectedCentreDetails(centre); // Store the selected centre's details
        } catch (qrErr) {
            console.error(`Error fetching QR code for centre ${centre.idCentre}:`, qrErr);
             if (qrErr.response && (qrErr.response.status === 401 || qrErr.response.status === 403)) {
                 setError(t('manageCabinets.qrPermissionDenied')); // Reuse key
             } else if (qrErr.response && qrErr.response.status === 404) {
                  setError(t('manageCabinets.qrNotFound')); // Reuse key
             } else {
                setError(t('manageCabinets.qrError')); // Reuse key
             }
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm(t('confirm_delete_centre'))) { // Use specific key
            setError(''); // Clear previous errors
            const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
            if (!token) {
                setError(t('manageCabinets.deleteAuthRequired')); // Reuse key
                return;
            }
            try {
                await apiClient.delete(`/api/centres-examen/${id}`, {
                     headers: { 'Authorization': `Bearer ${token}` }
                });
                // Refetch centres after deletion
                fetchCentres();
                alert(t('success_centre_deleted')); // Use specific key
            } catch (err) {
                console.error("Error deleting centre:", err);
                 if (err.response) {
                     if (err.response.status === 401 || err.response.status === 403) {
                         setError(t('manageCabinets.deletePermissionDenied')); // Reuse key
                     } else if (err.response.status === 404) {
                         setError(t('manageCabinets.deleteNotFound')); // Reuse key
                     } else {
                        setError(t('error_deleting_centre') + `: ${err.response.data?.message || err.response.statusText}`); // Use specific key
                     }
                 } else {
                     setError(t('manageCabinets.deleteNetworkError')); // Reuse key
                 }
                 alert(error); // Show error in alert
            }
        }
    };

    // Print function for the displayed QR code section
    const handlePrint = () => {
        if (!selectedCentreQr || !selectedCentreDetails) return;

        const printWindow = window.open('', '_blank', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write(`<html><head><title>${t('print_qr_code')}</title></head>`); // Specific key
            printWindow.document.write('<style>body { font-family: sans-serif; padding: 20px; } h3 { border-bottom: 1px solid #ccc; padding-bottom: 5px; } img { max-width: 200px; display: block; margin: 15px 0; } p { margin: 5px 0; }</style></head><body>');
            printWindow.document.write(`<h3>${t('centre_name')}: ${selectedCentreDetails.name}</h3>`); // Specific key
            printWindow.document.write(`<p><strong>${t('address')}:</strong> ${selectedCentreDetails.adress}</p>`);
            printWindow.document.write(`<p><strong>${t('phone')}:</strong> ${selectedCentreDetails.tel || t('manageCabinets.notAvailable')}</p>`); // Reuse key
            printWindow.document.write(`<p><strong>${t('qr_code')} ${t('register_exam_centre_doctor')}:</strong></p>`); // Specific keys
            printWindow.document.write(`<img src="${selectedCentreQr}" alt="QR Code Inscription ${selectedCentreDetails.name}" />`);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        } else {
            alert(t('manageCabinets.printPopupError')); // Reuse key
        }
    };

    // Navigate to edit form
     const handleEdit = (centreId) => {
        navigate(`/edit-centre/${centreId}`);
    };

    if (loading) return <p>{t('loading')}...</p>;
    // Show general error only if QR code section isn't displayed
    if (error && !selectedCentreQr) return <p className="error-message">{error}</p>;

    return (
        // Use the class name from the CSS file to mimic CabinetList
        <div className="cabinet-list-container">
            <h2>{t('manage_exam_centres')}</h2>
            {/* No "Add" button here */}

            {centres.length === 0 && !error && <p>{t('no_centres_found')}</p>}

            {centres.length > 0 && (
                <div className="table-responsive-wrapper"> {/* Optional wrapper */}
                    <table className="table table-striped">
                        <thead>
                            <tr>
                                <th>{t('manageCabinets.tableHeaders.name')}</th> {/* Use consistent key */}
                                <th>{t('manageCabinets.tableHeaders.address')}</th> {/* Use consistent key */}
                                <th>{t('manageCabinets.tableHeaders.phone')}</th> {/* Use consistent key */}
                                <th>{t('manageCabinets.tableHeaders.actions')}</th> {/* Use consistent key */}
                                <th>{t('manageCabinets.tableHeaders.qrCode')}</th> {/* Add QR Code Header */}
                            </tr>
                        </thead>
                        <tbody>
                            {centres.map(centre => (
                                <tr key={centre.idCentre}>
                                    <td>{centre.name}</td>
                                    <td>{centre.adress}</td>
                                    {/* Use consistent null check and translation key */}
                                    <td>{centre.tel || t('manageCabinets.notAvailable')}</td>
                                    <td>
                                        {/* Reorder buttons and apply Bootstrap styles */}
                                        <button onClick={() => handleEdit(centre.idCentre)} className="btn btn-sm btn-outline-primary me-1"> {/* Style Edit */}
                                            {t('manageCabinets.buttons.edit')} {/* Use consistent key */}
                                        </button>
                                        <button onClick={() => handleDelete(centre.idCentre)} className="btn btn-sm btn-danger"> {/* Style Delete */}
                                            {t('manageCabinets.buttons.delete')} {/* Use consistent key */}
                                        </button>
                                    </td>
                                    <td> {/* Add new cell for QR button */}
                                        <button onClick={() => handleShowQrCode(centre)} className="btn btn-sm btn-info"> {/* Style Show QR */}
                                            {t('manageCabinets.buttons.showQr')} {/* Reuse key */}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

             {/* Section to display selected QR code - exactly like CabinetList */}
             {selectedCentreQr && selectedCentreDetails && (
                <div className="qr-code-display mt-4 p-3 border rounded bg-light">
                    <h3 className="mb-3">{t('manageCabinets.qrModal.title')}</h3> {/* Reuse key */}
                    {/* Show QR specific error here */}
                    {error && <p className="error-message">{error}</p>}
                    <img src={selectedCentreQr} alt={`QR Code for ${selectedCentreDetails.name}`} className="img-fluid mb-3" style={{maxWidth: '200px', border: '1px solid #ccc'}} />
                    <div>
                        <button onClick={() => { setSelectedCentreQr(null); setSelectedCentreDetails(null); setError(''); }} className="btn btn-secondary me-2">{t('manageCabinets.buttons.close')}</button> {/* Reuse key */}
                        <button onClick={handlePrint} className="btn btn-success">{t('manageCabinets.buttons.print')}</button> {/* Reuse key */}
                    </div>
                    <p className="mt-2"><small>{t('manageCabinets.qrModal.scanMessage')}</small></p> {/* Reuse key */}
                </div>
            )}
        </div>
    );
};

export default CentreDexamenList;
