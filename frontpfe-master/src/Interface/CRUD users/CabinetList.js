import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// Optional: Add CSS for styling
import './CabinetList.css'; // Import the CSS file

const CabinetList = () => {
    const [cabinets, setCabinets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedCabinetQr, setSelectedCabinetQr] = useState(null); // To store QR code data URL
    const [selectedCabinetDetails, setSelectedCabinetDetails] = useState(null); // To store details for printing
    // Removed state for inline editing: editingCabinetId, editFormData
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCabinets = async () => {
            setLoading(true);
            setError('');
            const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
            if (!token) {
                setError("Authentification requise.");
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
                    setError('Format de données inattendu reçu du serveur.');
                }
            } catch (err) {
                console.error("Error fetching cabinets:", err);
                setCabinets([]); // Ensure cabinets is an empty array on error
                 if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                     setError("Permission refusée. Seuls les administrateurs peuvent voir cette page.");
                 } else {
                    // Attempt to get a more specific error message if available
                    const errorMsg = err.response?.data?.message || err.message || 'Erreur lors de la récupération des cabinets.';
                    setError(errorMsg);
                 }
            } finally {
                setLoading(false);
            }
        };

        fetchCabinets();
    }, [navigate]);

    const handleShowQrCode = async (cabinet) => { // Pass the whole cabinet object
        setError('');
        setSelectedCabinetQr(null); // Clear previous QR code
        setSelectedCabinetDetails(null); // Clear previous details
         const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
         if (!token) {
             setError("Authentification requise.");
             return;
         }

        try {
             // Assuming the backend URL is http://localhost:8081
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
                  setError("Permission refusée pour générer ce QR code.");
              } else if (err.response && err.response.status === 404) {
                   setError("Cabinet non trouvé pour générer le QR code.");
              }
              else {
                 setError('Erreur lors de la génération du QR code.');
              }
        }
    };

    // --- Print Function ---
    const handlePrint = () => {
        if (!selectedCabinetQr || !selectedCabinetDetails) return;

        const printWindow = window.open('', '_blank', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Imprimer QR Code</title>');
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
            printWindow.document.write(`<h3>Cabinet: ${selectedCabinetDetails.name}</h3>`);
            printWindow.document.write(`<p><strong>Adresse:</strong> ${selectedCabinetDetails.address}</p>`);
            printWindow.document.write(`<p><strong>Téléphone:</strong> ${selectedCabinetDetails.tel || 'N/A'}</p>`);
            printWindow.document.write('<p><strong>QR Code Inscription:</strong></p>');
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
            alert("Impossible d'ouvrir la fenêtre d'impression. Vérifiez les paramètres de votre navigateur (bloqueur de pop-up).");
        }
    };

    // --- Edit Function (Will navigate to separate form) ---
    const handleEdit = (cabinetId) => {
        navigate(`/edit-cabinet/${cabinetId}`); // Navigate to the edit route
    };

    // --- Delete Function ---
    const handleDelete = async (cabinetId) => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le cabinet ID ${cabinetId} et tous ses utilisateurs associés ? Cette action est irréversible.`)) {
            return; // Stop if user cancels
        }

        setError(''); // Clear previous errors
        const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
        if (!token) {
            setError("Authentification requise pour supprimer.");
            // Optionally redirect to login
            return;
        }

        try {
            const response = await axios.delete(`http://localhost:6952/cabinets/${cabinetId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 204) { // 204 No Content is typical for successful DELETE
                alert("Cabinet et utilisateurs associés supprimés avec succès.");
                // Remove the cabinet from the local state to update the UI
                setCabinets(prevCabinets => prevCabinets.filter(cabinet => cabinet.idSite !== cabinetId));
            } else {
                 // Should not happen with 204, but handle defensively
                setError(`Réponse inattendue du serveur: ${response.status}`);
            }

        } catch (err) {
            console.error("Error deleting cabinet:", err);
            if (err.response) {
                 if (err.response.status === 401 || err.response.status === 403) {
                     setError("Permission refusée pour supprimer ce cabinet.");
                     // Optionally redirect or logout
                 } else if (err.response.status === 404) {
                     setError("Cabinet non trouvé pour la suppression.");
                 } else {
                    setError(`Erreur lors de la suppression: ${err.response.data?.message || err.response.statusText || 'Erreur inconnue'}`);
                 }
            } else {
                 setError('Erreur réseau ou serveur inaccessible lors de la suppression.');
            }
             // Display error in an alert as well for immediate feedback
             alert(`Erreur lors de la suppression: ${error || 'Veuillez vérifier la console pour plus de détails.'}`);
        }
    };


    if (loading) {
        return <div>Chargement des cabinets...</div>;
    }

    return (
        <div className="cabinet-list-container"> {/* Add container class */}
            <h2>Liste des Cabinets</h2>
            {error && <p className="error-message">{error}</p>}

            {cabinets.length === 0 && !error && <p>Aucun cabinet trouvé.</p>}

            {cabinets.length > 0 && (
              <div className="table-responsive"> {/* Add Bootstrap responsive wrapper */}
                <table className="table table-striped table-hover custom-table"> {/* Add Bootstrap table classes */}
                    <thead>
                        <tr>
                            
                            <th>Nom</th>
                            <th>Adresse</th>
                            <th>Téléphone</th>
                            <th>Actions</th>
                            <th>QR Code</th> {/* Separate column for QR code button */}
                        </tr>
                    </thead>
                    <tbody>
                        {cabinets.map(cabinet => (
                            <tr key={cabinet.idSite}>
                                 
                                {/* Display Mode Cells */}
                                <td>{cabinet.name}</td>
                                <td>{cabinet.address}</td>
                                <td>{cabinet.tel || 'N/A'}</td>
                                <td> {/* Removed inline style */}
                                    {/* Use Bootstrap button classes */}
                                    <button onClick={() => handleEdit(cabinet.idSite)} className="btn btn-sm btn-outline-primary me-1">Modifier</button> {/* Added me-1 for margin */}
                                    <button onClick={() => handleDelete(cabinet.idSite)} className="btn btn-sm btn-danger">Supprimer</button>
                                </td>
                                <td>
                                    <button onClick={() => handleShowQrCode(cabinet)} className="btn btn-sm btn-info">Afficher QR</button> {/* Use btn-info for QR */}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div> // Close table-responsive wrapper
            )}

            {selectedCabinetQr && (
                <div className="qr-code-display mt-4 p-3 border rounded bg-light"> {/* Added Bootstrap classes */}
                    <h3 className="mb-3">QR Code pour l'inscription :</h3>
                    <img src={selectedCabinetQr} alt="QR Code Inscription Cabinet" className="img-fluid mb-3" style={{maxWidth: '200px', border: '1px solid #ccc'}} /> {/* Added Bootstrap class */}
                    <div> {/* Wrapper for buttons */}
                        <button onClick={() => { setSelectedCabinetQr(null); setSelectedCabinetDetails(null); }} className="btn btn-secondary me-2">Fermer</button>
                        <button onClick={handlePrint} className="btn btn-success">Imprimer</button> {/* Use btn-success for print */}
                    </div>
                    <p className="mt-2"><small>Scannez ce code pour vous inscrire dans ce cabinet.</small></p>
                </div>
            )}
        </div>
    );
}; // End of CabinetList component function

export default CabinetList;
