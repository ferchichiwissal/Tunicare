import React, { useState } from 'react';
import apiClient from '../../utils/apiClient'; // Import the shared apiClient
import { useNavigate } from 'react-router-dom';
import './AddCentreDexamenForm.css'; // Import the CSS file
import { useTranslation } from 'react-i18next';

const AddCentreDexamenForm = () => {
    const { t } = useTranslation();
    const [centreData, setCentreData] = useState({
        name: '',
        adress: '', // Matches backend entity field
        tel: ''
        // Add other fields if CentreDexamen has more required fields
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    // Removed local apiClient instance creation

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

        // Basic validation
        if (!centreData.name || !centreData.adress || !centreData.tel) {
            setError(t('error_all_fields_required'));
            return;
        }

        try {
            const response = await apiClient.post('/api/centres-examen', centreData);
            setSuccess(t('success_centre_added', { name: response.data.name })); // Use translation
            // Optionally clear form or redirect
            setCentreData({ name: '', adress: '', tel: '' });
            // Redirect back to the list after a short delay
            setTimeout(() => {
                navigate('/manage-centres'); // Adjust route name later
            }, 2000);
        } catch (err) {
            console.error("Error adding centre:", err);
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError(t('error_adding_centre')); // Use translation
            }
        }
    };

    return (
        // Use the class name from the CSS file
        <div className="add-cabinet-container">
            <h2>{t('add_new_exam_centre')}</h2>
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
                {/* Add other form fields for CentreDexamen if needed */}
                <button type="submit" className="btn btn-primary">{t('add_centre')}</button>
                <button type="button" className="btn btn-secondary ms-2" onClick={() => navigate('/manage-centres')}>{t('cancel')}</button>
            </form>
        </div>
    );
};

export default AddCentreDexamenForm;
