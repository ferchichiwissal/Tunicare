import React, { useState, useEffect, useMemo, useCallback } from 'react'; // Added useMemo, useCallback
import apiClient from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { clearUserData, getToken, isTokenExpired } from '../../utils/auth'; // Import auth utils
import './Statistics.css';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const CenterStatistics = () => {
    const { t } = useTranslation(); // Initialize useTranslation
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // getMonth() is 0-indexed
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert(t('centerStatistics.alerts.sessionExpired', 'Session expired. Please log in again.')); // Add translation key
        // Assuming the login route is /sign-in
        window.location.href = "/sign-in"; // Use window.location.href for full page reload
    }, [t]); // Add t dependency

    // --- Token Expiry & Inactivity Checks ---
    useEffect(() => {
        const token = getToken();
        if (!token || isTokenExpired(token)) {
            performLogout();
            return;
        }
        let expiryTimer;
        try {
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            const expiryTime = decodedToken.exp * 1000;
            const currentTime = Date.now();
            const timeToExpire = expiryTime - currentTime;
            if (timeToExpire > 0) {
                expiryTimer = setTimeout(performLogout, timeToExpire);
            } else {
                performLogout();
                return;
            }
        } catch (err) {
            console.error("Error decoding token for expiry check:", err);
            performLogout();
            return;
        }
        let inactivityTimer;
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(performLogout, INACTIVITY_TIMEOUT);
        };
        const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
        activityEvents.forEach(event => window.addEventListener(event, resetTimer));
        resetTimer();

        return () => {
            clearTimeout(expiryTimer);
            clearTimeout(inactivityTimer);
            activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [performLogout]); // Dependency array includes performLogout

    // Month options using t() for labels
    const monthOptions = useMemo(() => {
        const months = [];
        for (let i = 1; i <= 12; i++) {
            months.push({ value: i, label: t(`centerStatistics.months.${i}`) });
        }
        return [
            { value: '', label: t('centerStatistics.allMonths') },
            ...months
        ];
    }, [t]); // Recreate monthOptions when t changes (language changes)


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
                    setError(t('centerStatistics.errors.failedToLoadPrefix') + (err.response?.data?.message || err.message));
                    setStats([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setError(t('centerStatistics.errors.accessDenied'));
                setLoading(false);
                setStats([]);
            }
        };

        fetchStats();
    }, [user, selectedYear, selectedMonth, t]); // Added t to dependency array

    const handlePrint = () => {
        const selectedMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || t('centerStatistics.allMonths');
        
        const printContentHtml = `
            <html>
            <head>
                <title>${t('centerStatistics.printReportTitle')}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { text-align: center; color: #333; }
                    .print-header { margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                    .print-header p { margin: 5px 0; font-size: 0.9em; }
                    .print-header strong { font-size: 1.1em; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.9em; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    @media print {
                        body { margin: 1cm; } /* Add some margin for printing */
                        .no-print { display: none; }
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        thead { display: table-header-group; }
                        tfoot { display: table-footer-group; }
                        h1 { font-size: 1.5em; }
                    }
                </style>
            </head>
            <body>
                <h1>${t('centerStatistics.printReportTitle')}</h1>
                <div class="print-header">
                    <p><strong>${t('centerStatistics.printSelectedPeriod')}:</strong></p>
                    <p>${t('centerStatistics.printYear')}: ${selectedYear}</p>
                    <p>${t('centerStatistics.printMonth')}: ${selectedMonthLabel}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>${t('centerStatistics.tableHeaders.prescribingDoctor')}</th>
                            <th>${t('centerStatistics.tableHeaders.cabinetName')}</th>
                            <th>${t('centerStatistics.tableHeaders.numberOfExaminations')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.map(stat => `
                            <tr>
                                <td>${stat.prescribingDoctorName || t('common.notAvailable')}</td>
                                <td>${stat.prescribingDoctorCabinetName || t('common.notAvailable')}</td>
                                <td>${stat.examCount}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </table>
            <div style="margin-top: 40px; text-align: right;">
                <p>${t('centerStatistics.doctorSignature')}: _________________________</p>
                <p>${user?.name || ''}</p>
            </div>
            </body>
            </html>
        `;

        const iframeId = 'print-iframe-stats';
        let iframe = document.getElementById(iframeId);

        if (iframe) {
            try {
                iframe.parentNode.removeChild(iframe);
            } catch (e) {
                console.warn("Could not remove existing print iframe for stats:", e);
            }
        }

        iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        iframe.style.left = '-9999px';

        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow.document;
        const iframeWin = iframe.contentWindow;

        iframeDoc.open();
        iframeDoc.write(printContentHtml);
        iframeDoc.close();

        const cleanupIframe = () => {
            const iframeToRemove = document.getElementById(iframeId);
            if (iframeToRemove) {
                try {
                    iframeToRemove.parentNode.removeChild(iframeToRemove);
                } catch (e) {
                    console.warn("Could not remove print iframe for stats after print:", e);
                }
            }
        };

        try {
            setTimeout(() => {
                try {
                    iframeWin.focus();
                    iframeWin.print();
                    setTimeout(cleanupIframe, 2000); // Fallback cleanup
                } catch (printError) {
                    console.error("Error during stats iframe print execution:", printError);
                    // Consider alerting the user or logging more visibly
                    cleanupIframe();
                }
            }, 100);
        } catch (e) {
            console.error("Error setting up print via stats iframe:", e);
            // Consider alerting the user
            cleanupIframe();
        }
    };

    if (loading) {
        return <div className="statistics-container"><p>{t('centerStatistics.loading')}</p></div>;
    }

    if (error) {
        return <div className="statistics-container error-message"><p>{error}</p></div>;
    }

    return (
        <div className="statistics-container">
            <h2>{t('centerStatistics.title')}</h2>
            <div className="filters-container">
                <label htmlFor="year-select-center">{t('centerStatistics.yearLabel')}</label>
                <select id="year-select-center" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                    {years.map(year => <option key={year} value={year}>{year}</option>)}
                </select>

                <label htmlFor="month-select-center">{t('centerStatistics.monthLabel')}</label>
                <select id="month-select-center" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : '')}>
                    {/* Use the memoized monthOptions */}
                    {monthOptions.map(month => <option key={month.value} value={month.value}>{month.label}</option>)}
                </select>

                <button onClick={handlePrint} className="print-button" style={{ marginLeft: '10px' }}>
                    {t('centerStatistics.printButton')}
                </button>
            </div>

            {stats.length === 0 ? (
                <p>{t('centerStatistics.noStats')}</p>
            ) : (
                <table className="statistics-table">
                    <thead>
                        <tr>
                            <th>{t('centerStatistics.tableHeaders.prescribingDoctor')}</th>
                            <th>{t('centerStatistics.tableHeaders.cabinetName')}</th>
                            <th>{t('centerStatistics.tableHeaders.numberOfExaminations')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((stat, index) => (
                            <tr key={index}>
                                <td>{stat.prescribingDoctorName}</td>
                                <td>{stat.prescribingDoctorCabinetName || t('common.notAvailable')}</td>
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
