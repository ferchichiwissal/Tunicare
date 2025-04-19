import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/apiClient'; // Import the shared apiClient
import { useNavigate, useParams } from 'react-router-dom';
import './EditCentreDexamenForm.css'; // Import the CSS file
import { useTranslation } from 'react-i18next';

const EditCentreDexamenForm = () => {
    const { t } = useTranslation();
    const { id } = useParams(); // Get centre ID from URL
    const [centreData, setCentreData] = useState({
        name: '',
        adress: '',
        tel: ''
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    // Removed local apiClient instance creation

    useEffect(() => {
        const fetchCentreData = async () => {
            setLoading(true);
            try {
                const response = await apiClient.get(`/api/doctor-centre-examen/${id}`);
                setCentreData({
                    name: response.data.name,
                    adress: response.data.adress,
                    tel: response.data.tel
                    // Add other fields if necessary
                });
                setError('');
            } catch (err) {
                console.error("Error fetching centre data:", err);
                setError(t('error_fetching_centre_details'));
            } finally {
                setLoading(false);
            }
        };

        fetchCentreData();
    }, [id, t]); // Add t to dependency array

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCentreData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!centreData.name || !centreData.adress || !centreData.tel) {
            setError(t('error_all_fields_required'));
            return;
        }

        try {
            await apiClient.put(`/api/doctor-centre-examen/${id}`, centreData);
            setSuccess(t('success_centre_updated', { name: centreData.name }));
            // Redirect back to the list after a short delay
            setTimeout(() => {
                navigate('/users'); // Redirect back to the main user/centre list
            }, 2000);
        } catch (err) {
            console.error("Error updating centre:", err);
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError(t('error_updating_centre'));
            }
        }
    };

    // Use loading class from CSS
    if (loading) return <p className="loading-message">{t('loading')}...</p>;

    return (
        // Use the class name from the CSS file
        <div className="edit-cabinet-container">
            <h2>{t('edit_exam_centre')}</h2>
            {/* Use the specific error class from CSS */}
            {error && <div className="error-message">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    {/* Add 'required' class to label if needed by CSS */}
                    <label htmlFor="name" className="form-label required">{t('centre_name')}</label>
                    <input
                        type="text"
                        className="form-control"
                        id="name"
                        name="name"
                        value={centreData.name}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="mb-3">
                    {/* Add 'required' class to label if needed by CSS */}
                    <label htmlFor="adress" className="form-label required">{t('address')}</label>
                    <input
                        type="text"
                        className="form-control"
                        id="adress"
                        name="adress"
                        value={centreData.adress}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="mb-3">
                    {/* Add 'required' class to label if needed by CSS */}
                    <label htmlFor="tel" className="form-label required">{t('phone')}</label>
                    <input
                        type="text"
                        className="form-control"
                        id="tel"
                        name="tel"
                        value={centreData.tel}
                        onChange={handleChange}
                        required
                    />
                </div>
                {/* Add other form fields if needed */}
                <button type="submit" className="btn btn-primary">{t('update_centre')}</button>
                <button type="button" className="btn btn-secondary ms-2" onClick={() => navigate('/manage-centres')}>{t('cancel')}</button>
            </form>
        </div>
    );
};

export default EditCentreDexamenForm;
