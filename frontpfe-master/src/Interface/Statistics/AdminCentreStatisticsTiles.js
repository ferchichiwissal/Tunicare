import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext'; // Assuming AuthContext provides user info
import './Statistics.css'; // Assuming a shared CSS file for statistics

const AdminCentreStatisticsTiles = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth(); // Get authenticated user from context

    useEffect(() => {
        const fetchStats = async () => {
            if (!user || !user.id || !user.centreId) { // Assuming user object has id and centreId
                setError("User or Centre ID not available.");
                setLoading(false);
                return;
            }

            try {
                // Assuming a new endpoint for tile stats, e.g., /api/statistics/admincentre/tiles/{centreId}
                const response = await axios.get(`/api/statistics/admincentre/tiles/${user.centreId}`);
                setStats(response.data);
            } catch (err) {
                setError("Failed to fetch statistics.");
                console.error("Error fetching admin centre tile stats:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user]); // Refetch when user changes

    if (loading) {
        return <div>Loading statistics...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    if (!stats) {
        return <div>No statistics available.</div>;
    }

    return (
        <div className="statistics-tiles-container">
            <div className="tile">
                <h3>Examens réalisés aujourd'hui</h3>
                <p>{stats.dailyExaminationsCount}</p>
            </div>
            <div className="tile">
                <h3>Examens en attente</h3>
                <p>{stats.pendingExaminationsCount}</p>
            </div>
            <div className="tile">
                <h3>Rapports générés ce mois-ci</h3>
                <p>{stats.monthlyReportsCount}</p>
            </div>
            <div className="tile">
                <h3>Total Docteurs du Centre</h3>
                <p>{stats.totalDoctorsCount}</p>
            </div>
        </div>
    );
};

export default AdminCentreStatisticsTiles;
