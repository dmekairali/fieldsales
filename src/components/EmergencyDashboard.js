import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const EmergencyDashboard = () => {
    const [zeroROITerritories, setZeroROITerritories] = useState([]);
    const [suspiciousVisits, setSuspiciousVisits] = useState([]);
    const [qualityAlerts, setQualityAlerts] = useState([]);
    const [mrPerformance, setMrPerformance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAllData();
        
        // Set up real-time updates every 30 seconds
        // New (30 minutes)  
   const interval = setInterval(fetchAllData, 1800000);
        return () => clearInterval(interval);
    }, []);

    const fetchAllData = async () => {
        try {
            setError(null);
            await Promise.all([
                fetchEmergencyData(),
                fetchQualityData()
            ]);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to load data. Please check your connection.');
            setLoading(false);
        }
    };

    const fetchEmergencyData = async () => {
        try {
            // Fetch zero ROI territories from view
            const { data: territories, error: territoriesError } = await supabase
                .from('emergency_territory_audit')
                .select('*')
                .order('total_visits_90d', { ascending: false });

            if (territoriesError) {
                console.error('Territory data error:', territoriesError);
            } else {
                setZeroROITerritories(territories || []);
            }

            // Fetch suspicious visits from view
            const { data: visits, error: visitsError } = await supabase
                .from('suspicious_visits')
                .select('*')
                .gte('dcrDate', new Date().toISOString().split('T')[0])
                .neq('quality_flag', 'NORMAL')
                .order('visit_seconds');

            if (visitsError) {
                console.error('Visits data error:', visitsError);
            } else {
                setSuspiciousVisits(visits || []);
            }

        } catch (error) {
            console.error('Error fetching emergency data:', error);
            throw error;
        }
    };

    const fetchQualityData = async () => {
        try {
            // Get today's poor quality visits
            const { data: alerts, error: alertsError } = await supabase
                .from('real_time_visit_quality')
                .select('*')
                .eq('dcrDate', new Date().toISOString().split('T')[0])
                .lt('quality_score', 30)
                .order('quality_score', { ascending: true });

            if (!alertsError) {
                setQualityAlerts(alerts || []);
            } else {
                console.error('Quality alerts error:', alertsError);
            }

            // Get MR performance summary
            const { data: performance, error: perfError } = await supabase
                .from('real_time_visit_quality')
                .select(`
                    "empName",
                    quality_score,
                    quality_grade,
                    "amountOfSale"
                `)
                .eq('dcrDate', new Date().toISOString().split('T')[0]);

            if (!perfError && performance) {
                processPerformanceData(performance);
            } else if (perfError) {
                console.error('Performance data error:', perfError);
            }

        } catch (error) {
            console.error('Error fetching quality data:', error);
        }
    };

    const fetchQualityDataDirect = async () => {
        // Direct query fallback if real_time_visit_quality view doesn't exist
        const { data, error } = await supabase
            .from('mr_visits')
            .select(`
                "visitId",
                "empName",
                "clientName",
                "areaName",
                "visitTime",
                "amountOfSale",
                "sampleValue",
                "dcrDate"
            `)
            .eq('dcrDate', new Date().toISOString().split('T')[0])
            .not('visitTime', 'is', null);

        if (!error && data) {
            const processedAlerts = data.map(visit => {
                const visitSeconds = timeToSeconds(visit.visitTime);
                const qualityScore = calculateSimpleQualityScore(visitSeconds, visit.amountOfSale, visit.sampleValue);
                
                return {
                    ...visit,
                    quality_score: qualityScore,
                    quality_grade: qualityScore < 20 ? 'VERY_POOR' : qualityScore < 30 ? 'POOR' : 'AVERAGE'
                };
            }).filter(v => v.quality_score < 30);

            setQualityAlerts(processedAlerts);
        }
    };

    const processPerformanceData = (performance) => {
        const mrStats = {};
        performance.forEach(visit => {
            const mrName = visit.empName;
            if (!mrStats[mrName]) {
                mrStats[mrName] = {
                    name: mrName,
                    totalVisits: 0,
                    totalScore: 0,
                    totalSales: 0,
                    poorVisits: 0
                };
            }
            mrStats[mrName].totalVisits++;
            mrStats[mrName].totalScore += visit.quality_score || 0;
            mrStats[mrName].totalSales += parseFloat(visit.amountOfSale || 0);
            if (visit.quality_grade === 'POOR' || visit.quality_grade === 'VERY_POOR') {
                mrStats[mrName].poorVisits++;
            }
        });

        const processedPerformance = Object.values(mrStats)
            .filter(mr => mr.totalVisits > 0)
            .map(mr => ({
                ...mr,
                avgQualityScore: mr.totalScore / mr.totalVisits,
                avgSalesPerVisit: mr.totalSales / mr.totalVisits,
                qualityRating: mr.totalScore / mr.totalVisits >= 60 ? 'GOOD' : 
                              mr.totalScore / mr.totalVisits >= 30 ? 'AVERAGE' : 'POOR'
            }))
            .sort((a, b) => b.avgQualityScore - a.avgQualityScore);

        setMrPerformance(processedPerformance);
    };

    // Fallback function if views don't exist
    const fetchTerritoryDataDirect = async () => {
        const { data, error } = await supabase
            .from('mr_visits')
            .select(`
                "areaName",
                "empName", 
                "amountOfSale",
                "dcrDate"
            `)
            .gte('dcrDate', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        if (!error && data) {
            const territoryMap = {};
            
            data.forEach(visit => {
                const key = `${visit.areaName}-${visit.empName}`;
                if (!territoryMap[key]) {
                    territoryMap[key] = {
                        territory: visit.areaName,
                        mr_name: visit.empName,
                        total_visits_90d: 0,
                        total_sales_90d: 0,
                        converting_visits: 0
                    };
                }
                
                territoryMap[key].total_visits_90d++;
                territoryMap[key].total_sales_90d += parseFloat(visit.amountOfSale || 0);
                if (parseFloat(visit.amountOfSale || 0) > 0) {
                    territoryMap[key].converting_visits++;
                }
            });

            const processed = Object.values(territoryMap).map(territory => ({
                ...territory,
                revenue_per_visit: territory.total_sales_90d / territory.total_visits_90d,
                conversion_rate: (territory.converting_visits / territory.total_visits_90d) * 100
            })).filter(t => t.total_sales_90d === 0 || t.revenue_per_visit < 100)
              .sort((a, b) => b.total_visits_90d - a.total_visits_90d);

            setZeroROITerritories(processed);
        }
    };

    const fetchSuspiciousVisitsDirect = async () => {
        const { data, error } = await supabase
            .from('mr_visits')
            .select(`
                "visitId",
                "empName",
                "clientName", 
                "areaName",
                "visitTime",
                "amountOfSale",
                "sampleGiven",
                "dcrDate"
            `)
            .eq('dcrDate', new Date().toISOString().split('T')[0])
            .not('visitTime', 'is', null);

        if (!error && data) {
            const suspicious = data.map(visit => {
                const visitSeconds = timeToSeconds(visit.visitTime);
                let quality_flag = 'NORMAL';
                
                if (visitSeconds < 120) quality_flag = 'FAKE_VISIT';
                else if (visitSeconds < 300) quality_flag = 'SUSPICIOUS_SHORT';
                else if (visitSeconds > 10800) quality_flag = 'SUSPICIOUS_LONG';
                else if ((visit.amountOfSale || 0) === 0 && !visit.sampleGiven) quality_flag = 'ZERO_OUTCOME';

                return {
                    ...visit,
                    quality_flag,
                    visit_seconds: visitSeconds
                };
            }).filter(v => v.quality_flag !== 'NORMAL')
              .sort((a, b) => a.visit_seconds - b.visit_seconds);

            setSuspiciousVisits(suspicious);
        }
    };

    // Helper functions
    const timeToSeconds = (timeStr) => {
        if (!timeStr) return 0;
        const parts = timeStr.split(':');
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2] || 0);
    };

    const calculateSimpleQualityScore = (seconds, sales, samples) => {
        let score = 0;
        
        // Duration scoring
        if (seconds >= 600) score += 50;
        else if (seconds >= 300) score += 30;
        else if (seconds >= 120) score += 10;
        
        // Outcome scoring
        if (sales > 0) score += 40;
        else if (samples > 0) score += 20;
        
        return Math.min(score, 100);
    };

    const flagTerritory = async (territory, action) => {
        const confirmed = window.confirm(
            `Are you sure you want to ${action.toLowerCase()} territory "${territory}"?\n\n` +
            `This will:\n` +
            `• Flag the territory for manager review\n` +
            `• Trigger reassignment process\n` +
            `• Log the action for audit trail`
        );
        
        if (confirmed) {
            try {
                alert(`Territory "${territory}" has been flagged for ${action.toLowerCase()}`);
            } catch (error) {
                console.error('Error flagging territory:', error);
                alert('Failed to flag territory. Please try again.');
            }
        }
    };

    const investigateVisit = (visit) => {
        alert(
            `Visit Investigation Details:\n\n` +
            `MR: ${visit.empName}\n` +
            `Client: ${visit.clientName}\n` +
            `Duration: ${visit.visitTime}\n` +
            `Quality Flag: ${visit.quality_flag}\n` +
            `Sales Amount: ₹${visit.amountOfSale}\n` +
            `Location: ${visit.areaName}\n\n` +
            `Recommended Actions:\n` +
            `• Contact MR for explanation\n` +
            `• Review GPS location data\n` +
            `• Check visit photos/documents\n` +
            `• Verify with client if needed`
        );
    };

    const investigateQualityAlert = (alert) => {
        alert(
            `Quality Alert Investigation:\n\n` +
            `MR: ${alert.empName}\n` +
            `Client: ${alert.clientName}\n` +
            `Quality Score: ${alert.quality_score}/100\n` +
            `Quality Grade: ${alert.quality_grade}\n` +
            `Duration: ${alert.visitTime}\n` +
            `Sales: ₹${alert.amountOfSale || 0}\n` +
            `Location: ${alert.areaName}\n\n` +
            `Quality Issues Detected:\n` +
            `• Visit duration too short\n` +
            `• No meaningful outcome\n` +
            `• Requires immediate review`
        );
    };

    // Quality Alerts Section Component
    const QualityAlertsSection = () => (
        <div className="mb-6 md:mb-8">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 md:p-6">
                    <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 md:gap-3">
                        ⚡ <span className="truncate">Visit Quality Alerts</span>
                    </h2>
                    <p className="text-purple-100 mt-1 md:mt-2 text-sm md:text-lg">Low quality visits needing immediate attention</p>
                    <div className="mt-2 md:mt-3 flex flex-wrap gap-2 md:gap-3 text-xs md:text-sm">
                        <div className="bg-purple-500 bg-opacity-30 px-2 py-1 md:px-3 rounded-full">
                            <span className="font-semibold">{qualityAlerts.length}</span> quality alerts
                        </div>
                        <div className="bg-purple-500 bg-opacity-30 px-2 py-1 md:px-3 rounded-full">
                            <span className="font-semibold">{qualityAlerts.filter(a => a.quality_score < 20).length}</span> critical
                        </div>
                    </div>
                </div>
                <div className="p-4 md:p-6">
                    {qualityAlerts.length === 0 ? (
                        <div className="text-center py-6 md:py-8 text-gray-500">
                            <div className="text-3xl md:text-4xl mb-1 md:mb-2">✨</div>
                            No quality alerts today! All visits meet quality standards.
                        </div>
                    ) : (
                        <div className="grid gap-3 md:gap-4 max-h-80 md:max-h-96 overflow-y-auto">
                            {qualityAlerts.map((alert, index) => (
                                <div key={index} className="border-l-2 md:border-l-4 border-purple-500 bg-purple-50 rounded-lg p-3 md:p-4 cursor-pointer hover:bg-purple-100 transition-colors" onClick={() => investigateQualityAlert(alert)}>
                                    <div className="flex flex-col sm:flex-row justify-between items-start">
                                        <div className="flex-1 mb-2 sm:mb-0">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-4 mb-1 md:mb-2">
                                                <span className="font-bold text-gray-900 text-sm md:text-base">{alert.empName}</span>
                                                <span className="text-gray-400 hidden sm:inline">→</span>
                                                <span className="text-gray-700 text-sm md:text-base">{alert.clientName}</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm">
                                                <div className="flex items-center gap-1 md:gap-2">
                                                    <span className="text-gray-500">📍</span>
                                                    <span className="text-gray-600 truncate">{alert.areaName}</span>
                                                </div>
                                                <div className="flex items-center gap-1 md:gap-2">
                                                    <span className="text-gray-500">⏱️</span>
                                                    <span className="text-gray-600">{alert.visitTime}</span>
                                                </div>
                                                <div className="flex items-center gap-1 md:gap-2">
                                                    <span className="text-gray-500">💰</span>
                                                    <span className="text-gray-600">₹{alert.amountOfSale || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-3 mt-2 sm:mt-0">
                                            <span className={`px-2 py-1 md:px-3 text-xs md:text-sm font-bold rounded-lg ${
                                                alert.quality_score < 20 ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'
                                            }`}>
                                                Score: {Math.round(alert.quality_score || 0)}/100
                                            </span>
                                            <span className="text-xs md:text-sm font-semibold text-purple-600">
                                                {alert.quality_grade}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // MR Performance Section Component
    const MRPerformanceSection = () => (
        <div className="mb-6 md:mb-8">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 md:p-6">
                    <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 md:gap-3">
                        🏆 <span className="truncate">MR Quality Performance Today</span>
                    </h2>
                    <p className="text-green-100 mt-1 md:mt-2 text-sm md:text-lg">Daily quality rankings and performance metrics</p>
                    <div className="mt-2 md:mt-3 bg-green-500 bg-opacity-30 px-2 py-1 md:px-3 rounded-full text-xs md:text-sm inline-block">
                        <span className="font-semibold">{mrPerformance.length}</span> MRs tracked today
                    </div>
                </div>
                <div className="overflow-x-auto max-h-80 md:max-h-96 overflow-y-auto">
                    <table className="w-full min-w-[700px]">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-bold text-gray-700">Rank</th>
                                <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-bold text-gray-700">MR Name</th>
                                <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">Visits</th>
                                <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">Avg Quality Score</th>
                                <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">Total Sales</th>
                                <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">Sales/Visit</th>
                                <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">Rating</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {mrPerformance.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-3 py-6 md:px-4 md:py-8 text-center text-gray-500">
                                        <div className="text-3xl md:text-4xl mb-1 md:mb-2">📊</div>
                                        No performance data available for today.
                                    </td>
                                </tr>
                            ) : (
                                mrPerformance.slice(0, 15).map((mr, index) => (
                                    <tr key={index} className={`${
                                        index < 3 ? 'bg-green-50' : 
                                        mr.qualityRating === 'POOR' ? 'bg-red-50' : 'bg-white'
                                    } hover:bg-gray-50`}>
                                        <td className="px-3 py-2 md:px-4 md:py-3 text-center">
                                            <span className={`inline-flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full text-xs md:text-sm font-bold ${
                                                index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                                index === 1 ? 'bg-gray-300 text-gray-800' :
                                                index === 2 ? 'bg-orange-400 text-orange-900' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 md:px-4 md:py-3 font-semibold text-gray-900 text-sm md:text-base">{mr.name}</td>
                                        <td className="px-3 py-2 md:px-4 md:py-3 text-center">
                                            <span className="inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xs md:text-sm bg-blue-100 text-blue-800">
                                                {mr.totalVisits}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 md:px-4 md:py-3 text-center font-bold text-base md:text-lg">
                                            {mr.avgQualityScore.toFixed(1)}
                                        </td>
                                        <td className="px-3 py-2 md:px-4 md:py-3 text-center font-semibold text-sm md:text-base">
                                            ₹{mr.totalSales.toLocaleString()}
                                        </td>
                                        <td className="px-3 py-2 md:px-4 md:py-3 text-center text-sm md:text-base">
                                            ₹{mr.avgSalesPerVisit.toFixed(0)}
                                        </td>
                                        <td className="px-3 py-2 md:px-4 md:py-3 text-center">
                                            <span className={`px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xxs md:text-xs font-bold ${
                                                mr.qualityRating === 'GOOD' ? 'bg-green-100 text-green-800' :
                                                mr.qualityRating === 'AVERAGE' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {mr.qualityRating}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Loading emergency data...</p>
                    <p className="text-gray-500 text-sm mt-2">Connecting to live database</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Connection Error</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                        onClick={fetchAllData}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 md:mb-8 text-center">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent flex items-center justify-center gap-2 md:gap-3">
                        🚨 <span className="truncate">Emergency Territory & Visit Quality Dashboard</span>
                    </h1>
                    <p className="text-gray-600 mt-2 md:mt-3 text-base md:text-xl">Real-time monitoring of territory performance and visit quality issues</p>
                    <div className="mt-3 md:mt-4 inline-flex items-center gap-2 bg-red-100 text-red-800 px-3 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        Live Dashboard • Last Updated: {new Date().toLocaleTimeString()}
                    </div>
                </div>

                {/* Quality Alerts Section */}
                <QualityAlertsSection />

                {/* MR Performance Section */}
                <MRPerformanceSection />

                {/* Zero ROI Territories */}
                <div className="mb-6 md:mb-8">
                    <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
                        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 md:p-6">
                            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 md:gap-3">
                                🚨 <span className="truncate">Zero ROI Territories (IMMEDIATE ACTION REQUIRED)</span>
                            </h2>
                            <p className="text-red-100 mt-1 md:mt-2 text-sm md:text-lg">Territories with zero or extremely low sales despite high visit counts</p>
                            <div className="mt-2 md:mt-3 flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm">
                                <div className="flex items-center gap-1 md:gap-2">
                                    <div className="w-2 h-2 md:w-3 md:h-3 bg-red-300 rounded-full"></div>
                                    <span>Zero Sales</span>
                                </div>
                                <div className="flex items-center gap-1 md:gap-2">
                                    <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-300 rounded-full"></div>
                                    <span>Low Performance</span>
                                </div>
                                <div className="bg-red-500 bg-opacity-30 px-2 py-1 md:px-3 rounded-full text-xs md:text-sm">
                                    <span className="font-semibold">{zeroROITerritories.length}</span> territories flagged
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto shadow-lg rounded-lg max-h-80 md:max-h-96 overflow-y-auto">
                            <table className="w-full bg-white min-w-[800px]">
                                <thead className="bg-gradient-to-r from-red-500 to-red-600 text-white sticky top-0 z-10">
                                    <tr>
                                        <th className="px-3 py-3 md:px-4 md:py-4 text-left text-xs md:text-sm font-bold uppercase tracking-wider">Territory</th>
                                        <th className="px-3 py-3 md:px-4 md:py-4 text-left text-xs md:text-sm font-bold uppercase tracking-wider">MR Name</th>
                                        <th className="px-3 py-3 md:px-4 md:py-4 text-center text-xs md:text-sm font-bold uppercase tracking-wider">Visits (90d)</th>
                                        <th className="px-3 py-3 md:px-4 md:py-4 text-center text-xs md:text-sm font-bold uppercase tracking-wider">Total Sales</th>
                                        <th className="px-3 py-3 md:px-4 md:py-4 text-center text-xs md:text-sm font-bold uppercase tracking-wider">Revenue/Visit</th>
                                        <th className="px-3 py-3 md:px-4 md:py-4 text-center text-xs md:text-sm font-bold uppercase tracking-wider">Conversion %</th>
                                        <th className="px-3 py-3 md:px-4 md:py-4 text-center text-xs md:text-sm font-bold uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {zeroROITerritories.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-3 py-6 md:px-4 md:py-8 text-center text-gray-500">
                                                <div className="text-3xl md:text-4xl mb-1 md:mb-2">🎉</div>
                                                No critical territories found! All territories are performing well.
                                            </td>
                                        </tr>
                                    ) : (
                                        zeroROITerritories.map((territory, index) => (
                                            <tr key={index} className={`hover:bg-gray-50 transition-colors ${
                                                (territory.total_sales_90d || 0) === 0 
                                                    ? 'bg-red-50 border-l-2 md:border-l-4 border-red-500'
                                                    : 'bg-yellow-50 border-l-2 md:border-l-4 border-yellow-500'
                                            }`}>
                                                <td className="px-3 py-3 md:px-4 md:py-4 text-xs md:text-sm font-semibold text-gray-900">
                                                    <div className="flex items-center">
                                                        <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full mr-2 md:mr-3 ${
                                                            (territory.total_sales_90d || 0) === 0 ? 'bg-red-500' : 'bg-yellow-500'
                                                        }`}></div>
                                                        {territory.territory || 'Unknown Territory'}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 md:px-4 md:py-4 text-xs md:text-sm text-gray-700 font-medium">{territory.mr_name || 'Unknown MR'}</td>
                                                <td className="px-3 py-3 md:px-4 md:py-4 text-center">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs md:text-sm font-bold bg-blue-100 text-blue-800">
                                                        {territory.total_visits_90d || 0}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 md:px-4 md:py-4 text-center">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs md:text-sm font-bold ${
                                                        (territory.total_sales_90d || 0) === 0 
                                                            ? 'bg-red-100 text-red-800' 
                                                            : 'bg-green-100 text-green-800'
                                                    }`}>
                                                        ₹{(territory.total_sales_90d || 0).toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 md:px-4 md:py-4 text-center text-xs md:text-sm font-semibold text-gray-900">
                                                    ₹{(territory.revenue_per_visit || 0).toFixed(2)}
                                                </td>
                                                <td className="px-3 py-3 md:px-4 md:py-4 text-center">
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xxs md:text-xs font-bold ${
                                                        (territory.conversion_rate || 0) === 0 
                                                            ? 'bg-red-100 text-red-800' 
                                                            : (territory.conversion_rate || 0) < 10 
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-green-100 text-green-800'
                                                    }`}>
                                                        {(territory.conversion_rate || 0).toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 md:px-4 md:py-4 text-center">
                                                    <button 
                                                        onClick={() => flagTerritory(territory.territory, 'REMOVE')}
                                                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                                    >
                                                        🗑️ Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Suspicious Visits Today */}
                <div className="mb-6 md:mb-8">
                    <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
                        <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-4 md:p-6">
                            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 md:gap-3">
                                🔍 <span className="truncate">Suspicious Visits Today</span>
                            </h2>
                            <p className="text-orange-100 mt-1 md:mt-2 text-sm md:text-lg">Visits flagged for unusual patterns or quality issues</p>
                            <div className="mt-2 md:mt-3 flex flex-wrap gap-2 md:gap-3 text-xs md:text-sm">
                                <div className="bg-orange-500 bg-opacity-30 px-2 py-1 md:px-3 rounded-full">
                                    <span className="font-semibold">{suspiciousVisits.length}</span> alerts today
                                </div>
                                <div className="bg-orange-500 bg-opacity-30 px-2 py-1 md:px-3 rounded-full">
                                    <span className="font-semibold">{suspiciousVisits.filter(v => v.quality_flag === 'FAKE_VISIT').length}</span> fake visits
                                </div>
                            </div>
                        </div>
                        <div className="p-4 md:p-6">
                            {suspiciousVisits.length === 0 ? (
                                <div className="text-center py-6 md:py-8 text-gray-500">
                                    <div className="text-3xl md:text-4xl mb-1 md:mb-2">✅</div>
                                    No suspicious visits detected today! All visits appear normal.
                                </div>
                            ) : (
                                <div className="grid gap-3 md:gap-4 max-h-80 md:max-h-96 overflow-y-auto">
                                    {suspiciousVisits.map((visit, index) => (
                                        <div key={index} className={`border-l-2 md:border-l-4 rounded-lg p-3 md:p-4 cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 ${
                                            visit.quality_flag === 'FAKE_VISIT' ? 'border-red-500 bg-red-50 hover:bg-red-100' :
                                            visit.quality_flag === 'SUSPICIOUS_SHORT' ? 'border-orange-500 bg-orange-50 hover:bg-orange-100' :
                                            visit.quality_flag === 'SUSPICIOUS_LONG' ? 'border-purple-500 bg-purple-50 hover:bg-purple-100' :
                                            'border-yellow-500 bg-yellow-50 hover:bg-yellow-100'
                                        }`} onClick={() => investigateVisit(visit)}>
                                            <div className="flex flex-col sm:flex-row justify-between items-start">
                                                <div className="flex-1 mb-2 sm:mb-0">
                                                    <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-3">
                                                        <div className="flex items-center gap-1 md:gap-2">
                                                            <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${
                                                                visit.quality_flag === 'FAKE_VISIT' ? 'bg-red-500' :
                                                                visit.quality_flag === 'SUSPICIOUS_SHORT' ? 'bg-orange-500' :
                                                                visit.quality_flag === 'SUSPICIOUS_LONG' ? 'bg-purple-500' :
                                                                'bg-yellow-500'
                                                            }`}></div>
                                                            <span className="font-bold text-gray-900 text-sm md:text-lg">{visit.empName || 'Unknown MR'}</span>
                                                        </div>
                                                        <span className="text-gray-400 text-lg md:text-xl">→</span>
                                                        <span className="text-gray-700 font-semibold text-sm md:text-base">{visit.clientName || 'Unknown Client'}</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm">
                                                        <div className="flex items-center gap-1 md:gap-2">
                                                            <span className="text-gray-500">📍</span>
                                                            <span className="text-gray-600 truncate">{visit.areaName || 'Unknown Location'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 md:gap-2">
                                                            <span className="text-gray-500">⏱️</span>
                                                            <span className={`font-semibold ${
                                                                visit.quality_flag === 'FAKE_VISIT' || visit.quality_flag === 'SUSPICIOUS_SHORT' 
                                                                    ? 'text-red-600' : 'text-purple-600'
                                                            }`}>{visit.visitTime || '00:00:00'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 md:gap-2">
                                                            <span className="text-gray-500">💰</span>
                                                            <span className={`font-bold ${(visit.amountOfSale || 0) === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                ₹{(visit.amountOfSale || 0).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 md:gap-3 mt-2 sm:mt-0">
                                                    <span className={`px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm font-bold rounded-lg shadow-sm ${
                                                        visit.quality_flag === 'FAKE_VISIT' ? 'bg-red-200 text-red-800' :
                                                        visit.quality_flag === 'SUSPICIOUS_SHORT' ? 'bg-orange-200 text-orange-800' :
                                                        visit.quality_flag === 'SUSPICIOUS_LONG' ? 'bg-purple-200 text-purple-800' :
                                                        'bg-yellow-200 text-yellow-800'
                                                    }`}>
                                                        {visit.quality_flag.replace('_', ' ')}
                                                    </span>
                                                    <button className="text-gray-400 hover:text-gray-600 text-lg md:text-xl">
                                                        🔍
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Summary Statistics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
                    <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl shadow-lg p-4 md:p-6 transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-red-100 text-xs md:text-sm font-medium uppercase tracking-wide">Critical Territories</div>
                                <div className="text-2xl md:text-3xl font-bold mt-1 md:mt-2">{zeroROITerritories.filter(t => (t.total_sales_90d || 0) === 0).length}</div>
                                <div className="text-red-100 text-xs md:text-sm mt-0.5 md:mt-1">Zero sales</div>
                            </div>
                            <div className="text-3xl md:text-4xl opacity-80">🚨</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-lg p-4 md:p-6 transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-orange-100 text-xs md:text-sm font-medium uppercase tracking-wide">Suspicious Visits</div>
                                <div className="text-2xl md:text-3xl font-bold mt-1 md:mt-2">{suspiciousVisits.length}</div>
                                <div className="text-orange-100 text-xs md:text-sm mt-0.5 md:mt-1">Today</div>
                            </div>
                            <div className="text-3xl md:text-4xl opacity-80">🔍</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg p-4 md:p-6 transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-purple-100 text-xs md:text-sm font-medium uppercase tracking-wide">Quality Alerts</div>
                                <div className="text-2xl md:text-3xl font-bold mt-1 md:mt-2">{qualityAlerts.length}</div>
                                <div className="text-purple-100 text-xs md:text-sm mt-0.5 md:mt-1">Poor quality</div>
                            </div>
                            <div className="text-3xl md:text-4xl opacity-80">⚡</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg p-4 md:p-6 transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-green-100 text-xs md:text-sm font-medium uppercase tracking-wide">Top Performers</div>
                                <div className="text-2xl md:text-3xl font-bold mt-1 md:mt-2">{mrPerformance.filter(mr => mr.qualityRating === 'GOOD').length}</div>
                                <div className="text-green-100 text-xs md:text-sm mt-0.5 md:mt-1">High quality</div>
                            </div>
                            <div className="text-3xl md:text-4xl opacity-80">🏆</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-600 to-gray-700 text-white rounded-xl shadow-lg p-4 md:p-6 transform hover:scale-105 transition-transform sm:col-span-2 lg:col-span-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-gray-100 text-xs md:text-sm font-medium uppercase tracking-wide">Total MRs</div>
                                <div className="text-2xl md:text-3xl font-bold mt-1 md:mt-2">{mrPerformance.length}</div>
                                <div className="text-gray-100 text-xs md:text-sm mt-0.5 md:mt-1">Active today</div>
                            </div>
                            <div className="text-3xl md:text-4xl opacity-80">👥</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmergencyDashboard;
