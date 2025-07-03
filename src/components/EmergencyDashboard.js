// Add this to your EmergencyDashboard.js

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const EmergencyDashboard = () => {
    const [zeroROITerritories, setZeroROITerritories] = useState([]);
    const [suspiciousVisits, setSuspiciousVisits] = useState([]);
    const [qualityAlerts, setQualityAlerts] = useState([]); // NEW
    const [mrPerformance, setMrPerformance] = useState([]); // NEW
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEmergencyData();
        fetchQualityData(); // NEW
        
        // Set up real-time updates
        const interval = setInterval(() => {
            fetchEmergencyData();
            fetchQualityData(); // NEW
        }, 30000);
        
        return () => clearInterval(interval);
    }, []);

    // NEW: Fetch quality data from your database views
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
            }

            // Get MR performance summary (if you create the mr_quality_performance view)
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
                // Process MR performance data
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
                    mrStats[mrName].totalScore += visit.quality_score;
                    mrStats[mrName].totalSales += parseFloat(visit.amountOfSale || 0);
                    if (visit.quality_grade === 'POOR') {
                        mrStats[mrName].poorVisits++;
                    }
                });

                const processedPerformance = Object.values(mrStats).map(mr => ({
                    ...mr,
                    avgQualityScore: mr.totalScore / mr.totalVisits,
                    avgSalesPerVisit: mr.totalSales / mr.totalVisits,
                    qualityRating: mr.totalScore / mr.totalVisits >= 60 ? 'GOOD' : 
                                  mr.totalScore / mr.totalVisits >= 30 ? 'AVERAGE' : 'POOR'
                })).sort((a, b) => b.avgQualityScore - a.avgQualityScore);

                setMrPerformance(processedPerformance);
            }

        } catch (error) {
            console.error('Error fetching quality data:', error);
        }
    };

    // Your existing fetchEmergencyData function stays the same...
    const fetchEmergencyData = async () => {
        // ... existing code ...
    };

    // NEW: Quality Alerts Section Component
    const QualityAlertsSection = () => (
        <div className="mb-8">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        ⚡ Visit Quality Alerts
                    </h2>
                    <p className="text-purple-100 mt-2 text-lg">Low quality visits needing immediate attention</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                        <div className="bg-purple-500 bg-opacity-30 px-3 py-1 rounded-full">
                            <span className="font-semibold">{qualityAlerts.length}</span> quality alerts
                        </div>
                        <div className="bg-purple-500 bg-opacity-30 px-3 py-1 rounded-full">
                            <span className="font-semibold">{qualityAlerts.filter(a => a.quality_score < 20).length}</span> critical
                        </div>
                    </div>
                </div>
                <div className="p-6">
                    {qualityAlerts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <div className="text-4xl mb-2">✨</div>
                            No quality alerts today! All visits meet quality standards.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {qualityAlerts.map((alert, index) => (
                                <div key={index} className="border-l-4 border-purple-500 bg-purple-50 rounded-lg p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4 mb-2">
                                                <span className="font-bold text-gray-900">{alert.empName}</span>
                                                <span className="text-gray-400">→</span>
                                                <span className="text-gray-700">{alert.clientName}</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500">📍</span>
                                                    <span className="text-gray-600">{alert.areaName}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500">⏱️</span>
                                                    <span className="text-gray-600">{alert.visitTime}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500">💰</span>
                                                    <span className="text-gray-600">₹{alert.amountOfSale || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-2 text-sm font-bold rounded-lg ${
                                                alert.quality_score < 20 ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'
                                            }`}>
                                                Score: {alert.quality_score}/100
                                            </span>
                                            <span className="text-sm font-semibold text-purple-600">
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

    // NEW: MR Performance Section Component
    const MRPerformanceSection = () => (
        <div className="mb-8">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        🏆 MR Quality Performance Today
                    </h2>
                    <p className="text-green-100 mt-2 text-lg">Daily quality rankings and performance metrics</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Rank</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">MR Name</th>
                                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Visits</th>
                                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Avg Quality Score</th>
                                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Total Sales</th>
                                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Sales/Visit</th>
                                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Rating</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {mrPerformance.slice(0, 10).map((mr, index) => (
                                <tr key={index} className={`${
                                    index < 3 ? 'bg-green-50' : 
                                    mr.qualityRating === 'POOR' ? 'bg-red-50' : 'bg-white'
                                } hover:bg-gray-50`}>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                            index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                            index === 1 ? 'bg-gray-300 text-gray-800' :
                                            index === 2 ? 'bg-orange-400 text-orange-900' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                            {index + 1}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-gray-900">{mr.name}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                                            {mr.totalVisits}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center font-bold text-lg">
                                        {mr.avgQualityScore.toFixed(1)}
                                    </td>
                                    <td className="px-4 py-3 text-center font-semibold">
                                        ₹{mr.totalSales.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        ₹{mr.avgSalesPerVisit.toFixed(0)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                            mr.qualityRating === 'GOOD' ? 'bg-green-100 text-green-800' :
                                            mr.qualityRating === 'AVERAGE' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {mr.qualityRating}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    // Your existing loading and error handling...
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Loading emergency data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Your existing header */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent flex items-center justify-center gap-3">
                        🚨 Emergency Territory & Visit Quality Dashboard
                    </h1>
                    <p className="text-gray-600 mt-3 text-xl">Real-time monitoring of territory performance and visit quality issues</p>
                    <div className="mt-4 inline-flex items-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-semibold">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        Live Dashboard • Last Updated: {new Date().toLocaleTimeString()}
                    </div>
                </div>

                {/* NEW: Quality Alerts Section */}
                <QualityAlertsSection />

                {/* NEW: MR Performance Section */}
                <MRPerformanceSection />

                {/* Your existing Zero ROI Territories section */}
                {/* Your existing Suspicious Visits section */}
                {/* Your existing Summary Statistics */}
            </div>
        </div>
    );
};

export default EmergencyDashboard;
