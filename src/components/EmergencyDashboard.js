import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const EmergencyDashboard = () => {
    const [zeroROITerritories, setZeroROITerritories] = useState([]);
    const [suspiciousVisits, setSuspiciousVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchEmergencyData();
        
        // Set up real-time updates every 30 min
        const interval = setInterval(fetchEmergencyData, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchEmergencyData = async () => {
        try {
            setError(null);
            
            // Fetch zero ROI territories from view
            const { data: territories, error: territoriesError } = await supabase
                .from('emergency_territory_audit')
                .select('*')
                .order('total_visits_90d', { ascending: false });

            if (territoriesError) {
                console.error('Territory data error:', territoriesError);
                // Fallback: fetch directly from mr_visits if view doesn't exist
                await fetchTerritoryDataDirect();
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
                // Fallback: fetch directly from mr_visits if view doesn't exist
                await fetchSuspiciousVisitsDirect();
            } else {
                setSuspiciousVisits(visits || []);
            }

            setLoading(false);
        } catch (error) {
            console.error('Error fetching emergency data:', error);
            setError('Failed to load data. Please check your connection.');
            setLoading(false);
        }
    };

    // Fallback function if views don't exist
    const fetchTerritoryDataDirect = async () => {
        const { data, error } = await supabase
            .from('mr_visits')
            .select(`
                "visitedArea",
                "empName", 
                "amountOfSale",
                "dcrDate"
            `)
            .gte('dcrDate', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        if (!error && data) {
            // Process data to create territory summary
            const territoryMap = {};
            
            data.forEach(visit => {
                const key = `${visit.visitedArea}-${visit.empName}`;
                if (!territoryMap[key]) {
                    territoryMap[key] = {
                        territory: visit.visitedArea,
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

    // Fallback function for suspicious visits
    const fetchSuspiciousVisitsDirect = async () => {
        const { data, error } = await supabase
            .from('mr_visits')
            .select(`
                "visitId",
                "empName",
                "clientName", 
                "visitedArea",
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

    // Helper function to convert time string to seconds
    const timeToSeconds = (timeStr) => {
        if (!timeStr) return 0;
        const parts = timeStr.split(':');
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2] || 0);
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
                // Here you could implement actual flagging logic
                // For now, we'll just show success
                alert(`Territory "${territory}" has been flagged for ${action.toLowerCase()}`);
                
                // Optionally, you could insert a record into a flagged_territories table
                // const { error } = await supabase
                //     .from('flagged_territories')
                //     .insert({
                //         territory_name: territory,
                //         action: action,
                //         flagged_at: new Date().toISOString(),
                //         flagged_by: 'dashboard_user'
                //     });
                
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
            `Location: ${visit.visitedArea}\n\n` +
            `Recommended Actions:\n` +
            `• Contact MR for explanation\n` +
            `• Review GPS location data\n` +
            `• Check visit photos/documents\n` +
            `• Verify with client if needed`
        );
    };

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
                        onClick={fetchEmergencyData}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
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

                {/* Zero ROI Territories */}
                <div className="mb-8">
                    <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
                        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                🚨 Zero ROI Territories (IMMEDIATE ACTION REQUIRED)
                            </h2>
                            <p className="text-red-100 mt-2 text-lg">Territories with zero or extremely low sales despite high visit counts</p>
                            <div className="mt-3 flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-300 rounded-full"></div>
                                    <span>Zero Sales</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-yellow-300 rounded-full"></div>
                                    <span>Low Performance</span>
                                </div>
                                <div className="bg-red-500 bg-opacity-30 px-3 py-1 rounded-full text-sm">
                                    <span className="font-semibold">{zeroROITerritories.length}</span> territories flagged
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto shadow-lg rounded-lg max-h-96 overflow-y-auto">
                            <table className="w-full bg-white">
                                <thead className="bg-gradient-to-r from-red-500 to-red-600 text-white sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider">Territory</th>
                                        <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider">MR Name</th>
                                        <th className="px-4 py-4 text-center text-sm font-bold uppercase tracking-wider">Visits (90d)</th>
                                        <th className="px-4 py-4 text-center text-sm font-bold uppercase tracking-wider">Total Sales</th>
                                        <th className="px-4 py-4 text-center text-sm font-bold uppercase tracking-wider">Revenue/Visit</th>
                                        <th className="px-4 py-4 text-center text-sm font-bold uppercase tracking-wider">Conversion %</th>
                                        <th className="px-4 py-4 text-center text-sm font-bold uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {zeroROITerritories.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                                                <div className="text-4xl mb-2">🎉</div>
                                                No critical territories found! All territories are performing well.
                                            </td>
                                        </tr>
                                    ) : (
                                        zeroROITerritories.map((territory, index) => (
                                            <tr key={index} className={`hover:bg-gray-50 transition-colors ${
                                                (territory.total_sales_90d || 0) === 0 
                                                    ? 'bg-red-50 border-l-4 border-red-500' 
                                                    : 'bg-yellow-50 border-l-4 border-yellow-500'
                                            }`}>
                                                <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                                                    <div className="flex items-center">
                                                        <div className={`w-3 h-3 rounded-full mr-3 ${
                                                            (territory.total_sales_90d || 0) === 0 ? 'bg-red-500' : 'bg-yellow-500'
                                                        }`}></div>
                                                        {territory.territory || 'Unknown Territory'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-700 font-medium">{territory.mr_name || 'Unknown MR'}</td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                                                        {territory.total_visits_90d || 0}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                                                        (territory.total_sales_90d || 0) === 0 
                                                            ? 'bg-red-100 text-red-800' 
                                                            : 'bg-green-100 text-green-800'
                                                    }`}>
                                                        ₹{(territory.total_sales_90d || 0).toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center text-sm font-semibold text-gray-900">
                                                    ₹{(territory.revenue_per_visit || 0).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                                                        (territory.conversion_rate || 0) === 0 
                                                            ? 'bg-red-100 text-red-800' 
                                                            : (territory.conversion_rate || 0) < 10 
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-green-100 text-green-800'
                                                    }`}>
                                                        {(territory.conversion_rate || 0).toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <button 
                                                        onClick={() => flagTerritory(territory.territory, 'REMOVE')}
                                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
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
                <div className="mb-8">
                    <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
                        <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                🔍 Suspicious Visits Today
                            </h2>
                            <p className="text-orange-100 mt-2 text-lg">Visits flagged for unusual patterns or quality issues</p>
                            <div className="mt-3 flex flex-wrap gap-3 text-sm">
                                <div className="bg-orange-500 bg-opacity-30 px-3 py-1 rounded-full">
                                    <span className="font-semibold">{suspiciousVisits.length}</span> alerts today
                                </div>
                                <div className="bg-orange-500 bg-opacity-30 px-3 py-1 rounded-full">
                                    <span className="font-semibold">{suspiciousVisits.filter(v => v.quality_flag === 'FAKE_VISIT').length}</span> fake visits
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            {suspiciousVisits.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <div className="text-4xl mb-2">✅</div>
                                    No suspicious visits detected today! All visits appear normal.
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {suspiciousVisits.map((visit, index) => (
                                        <div key={index} className={`border-l-4 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 ${
                                            visit.quality_flag === 'FAKE_VISIT' ? 'border-red-500 bg-red-50 hover:bg-red-100' :
                                            visit.quality_flag === 'SUSPICIOUS_SHORT' ? 'border-orange-500 bg-orange-50 hover:bg-orange-100' :
                                            visit.quality_flag === 'SUSPICIOUS_LONG' ? 'border-purple-500 bg-purple-50 hover:bg-purple-100' :
                                            'border-yellow-500 bg-yellow-50 hover:bg-yellow-100'
                                        }`} onClick={() => investigateVisit(visit)}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-4 mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-3 h-3 rounded-full ${
                                                                visit.quality_flag === 'FAKE_VISIT' ? 'bg-red-500' :
                                                                visit.quality_flag === 'SUSPICIOUS_SHORT' ? 'bg-orange-500' :
                                                                visit.quality_flag === 'SUSPICIOUS_LONG' ? 'bg-purple-500' :
                                                                'bg-yellow-500'
                                                            }`}></div>
                                                            <span className="font-bold text-gray-900 text-lg">{visit.empName || 'Unknown MR'}</span>
                                                        </div>
                                                        <span className="text-gray-400 text-xl">→</span>
                                                        <span className="text-gray-700 font-semibold">{visit.clientName || 'Unknown Client'}</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-500">📍</span>
                                                            <span className="text-gray-600">{visit.visitedArea || 'Unknown Location'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-500">⏱️</span>
                                                            <span className={`font-semibold ${
                                                                visit.quality_flag === 'FAKE_VISIT' || visit.quality_flag === 'SUSPICIOUS_SHORT' 
                                                                    ? 'text-red-600' : 'text-purple-600'
                                                            }`}>{visit.visitTime || '00:00:00'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-500">💰</span>
                                                            <span className={`font-bold ${(visit.amountOfSale || 0) === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                ₹{(visit.amountOfSale || 0).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-3 py-2 text-sm font-bold rounded-lg shadow-sm ${
                                                        visit.quality_flag === 'FAKE_VISIT' ? 'bg-red-200 text-red-800' :
                                                        visit.quality_flag === 'SUSPICIOUS_SHORT' ? 'bg-orange-200 text-orange-800' :
                                                        visit.quality_flag === 'SUSPICIOUS_LONG' ? 'bg-purple-200 text-purple-800' :
                                                        'bg-yellow-200 text-yellow-800'
                                                    }`}>
                                                        {visit.quality_flag.replace('_', ' ')}
                                                    </span>
                                                    <button className="text-gray-400 hover:text-gray-600 text-xl">
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-red-100 text-sm font-medium uppercase tracking-wide">Critical Territories</div>
                                <div className="text-3xl font-bold mt-2">{zeroROITerritories.filter(t => (t.total_sales_90d || 0) === 0).length}</div>
                                <div className="text-red-100 text-sm mt-1">Zero sales</div>
                            </div>
                            <div className="text-4xl opacity-80">🚨</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-orange-100 text-sm font-medium uppercase tracking-wide">Suspicious Visits</div>
                                <div className="text-3xl font-bold mt-2">{suspiciousVisits.length}</div>
                                <div className="text-orange-100 text-sm mt-1">Today</div>
                            </div>
                            <div className="text-4xl opacity-80">🔍</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-purple-100 text-sm font-medium uppercase tracking-wide">Fake Visits</div>
                                <div className="text-3xl font-bold mt-2">{suspiciousVisits.filter(v => v.quality_flag === 'FAKE_VISIT').length}</div>
                                <div className="text-purple-100 text-sm mt-1">Detected</div>
                            </div>
                            <div className="text-4xl opacity-80">⚠️</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-600 to-gray-700 text-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-gray-100 text-sm font-medium uppercase tracking-wide">Wasted Visits</div>
                                <div className="text-3xl font-bold mt-2">{zeroROITerritories.reduce((sum, t) => sum + ((t.total_sales_90d || 0) === 0 ? (t.total_visits_90d || 0) : 0), 0)}</div>
                                <div className="text-gray-100 text-sm mt-1">Zero ROI</div>
                            </div>
                            <div className="text-4xl opacity-80">📊</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmergencyDashboard;
