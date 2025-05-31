import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getToken } from '../../utils/auth';
import './Users Management.css'; // Assuming shared styles

const EditAdminCentreForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [adminCentre, setAdminCentre] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        birthDate: '',
        tel: '',
        address: '',
        gender: '',
        // Assuming centreName is displayed but not editable via this form
        // Assuming photoProfil and signatureImagePath are handled separately if needed
    });
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAdminCentre = async () => {
            const token = getToken();
            if (!token) {
                // Handle unauthorized
                navigate('/sign-in');
                return;
            }
            try {
                const response = await axios.get(`http://localhost:6952/api/admin-centre-examen/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = response.data;
                setAdminCentre(data);
                setFormData({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    email: data.email || '',
                    birthDate: data.birthDate || '', // Assuming format is compatible with input type="date"
                    tel: data.tel || '',
                    address: data.address || '',
                    gender: data.gender || '',
                });
                setLoading(false);
            } catch (err) {
                console.error('Error fetching admin centre:', err);
                setError('Failed to load admin centre data.');
                setLoading(false);
                // Handle error (e.g., show error message, redirect)
            }
        };

        fetchAdminCentre();
    }, [id, navigate]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const token = getToken();
        if (!token) {
            navigate('/sign-in');
            return;
        }

        try {
            // The backend PUT endpoint expects form-data if handling files,
            // but our service method takes an AdminCentreExamen object.
            // Let's assume the backend PUT /api/admin-centre-examen/{id}
            // expects a JSON body for simplicity based on the service method signature.
            // If files were involved, we'd need FormData.
            const response = await axios.put(`http://localhost:6952/api/admin-centre-examen/${id}`, formData, {
                headers: {
                    'Content-Type': 'application/json', // Assuming JSON body
                    Authorization: `Bearer ${token}`
                }
            });
            console.log('Update successful:', response.data);
            alert('Admin Centre updated successfully!');
            navigate('/users-management'); // Redirect back to the user list
        } catch (err) {
            console.error('Error updating admin centre:', err);
            setError('Failed to update admin centre.');
            // Handle error
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!adminCentre) {
        return <div>Admin Centre not found.</div>;
    }

    return (
        <div className="container mt-4">
            <h2>Edit Admin Centre</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label htmlFor="firstName" className="form-label">First Name</label>
                    <input type="text" className="form-control" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
                </div>
                <div className="mb-3">
                    <label htmlFor="lastName" className="form-label">Last Name</label>
                    <input type="text" className="form-control" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
                </div>
                 <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email</label>
                    {/* Email is often not editable, or requires special handling */}
                    <input type="email" className="form-control" id="email" name="email" value={formData.email} onChange={handleChange} disabled />
                </div>
                 <div className="mb-3">
                    <label htmlFor="birthDate" className="form-label">Birth Date</label>
                    <input type="date" className="form-control" id="birthDate" name="birthDate" value={formData.birthDate} onChange={handleChange} />
                </div>
                 <div className="mb-3">
                    <label htmlFor="tel" className="form-label">Telephone</label>
                    <input type="text" className="form-control" id="tel" name="tel" value={formData.tel} onChange={handleChange} />
                </div>
                 <div className="mb-3">
                    <label htmlFor="address" className="form-label">Address</label>
                    <input type="text" className="form-control" id="address" name="address" value={formData.address} onChange={handleChange} />
                </div>
                 <div className="mb-3">
                    <label htmlFor="gender" className="form-label">Gender</label>
                     <select className="form-select" id="gender" name="gender" value={formData.gender} onChange={handleChange}>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                {/* Add other fields as needed, e.g., photo upload */}
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Admin Centre'}
                </button>
                 <button type="button" className="btn btn-secondary ms-2" onClick={() => navigate('/users-management')}>
                    Cancel
                </button>
            </form>
        </div>
    );
};

export default EditAdminCentreForm;
