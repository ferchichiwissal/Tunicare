import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext';
import './Statistics.css';

const CenterStatistics = () => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(''); // Empty means all months

    const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
    const months = [
        { value: '', label: 'All Months' },
        { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
        { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
        { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
        { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
    ];

    useEffect(() => {
        const fetchStats = async () => {
            if (user && user.role === 'DOCTOR_CENTRE_EXAMEN') {
                try {
                    setLoading(true);
                    let url = `/api/statistics/center/exams-by-doctor?year=${selectedYear}`;
                    if (selectedMonth) {
                        url += `&month=${selectedMonth}`;
                    }
                    const response = await apiClient.get(url);
                    setStats(response.data);
                    setError('');
                } catch (err) {
                    console.error("Error fetching center statistics:", err);
                    setError('Failed to load statistics. ' + (err.response?.data?.message || err.message));
                    setStats([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setError('Access denied. You must be a DOCTOR_CENTRE_EXAMEN to view these statistics.');
                setLoading(false);
                setStats([]);
            }
        };

        fetchStats();
    }, [user, selectedYear, selectedMonth]);

    if (loading) {
        return <div className="statistics-container"><p>Loading statistics...</p></div>;
    }

    if (error) {
        return <div className="statistics-container error-message"><p>{error}</p></div>;
    }

    return (
        <div className="statistics-container">
            <h2>Completed Examinations by Referring Doctor</h2>
            <div className="filters-container">
                <label htmlFor="year-select-center">Year: </label>
                <select id="year-select-center" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                    {years.map(year => <option key={year} value={year}>{year}</option>)}
                </select>

                <label htmlFor="month-select-center">Month: </label>
                <select id="month-select-center" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : '')}>
                    {months.map(month => <option key={month.value} value={month.value}>{month.label}</option>)}
                </select>
            </div>

            {stats.length === 0 ? (
                <p>No completed examinations found for the selected period.</p>
            ) : (
                <table className="statistics-table">
                    <thead>
                        <tr>
                            <th>Prescribing Doctor</th>
                            <th>Cabinet Name</th>
                            <th>Number of Examinations</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((stat, index) => (
                            <tr key={index}>
                                <td>{stat.prescribingDoctorName}</td>
                                <td>{stat.prescribingDoctorCabinetName || 'N/A'}</td>
                                <td>{stat.examCount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default CenterStatistics;