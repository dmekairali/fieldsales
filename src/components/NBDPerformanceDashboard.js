import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const NBDPerformanceDashboard = () => {
    const [nbdData, setNbdData] = useState([]);
    const [allMRs, setAllMRs] = useState([]);
    const [mrFilter, setMrFilter] = useState('');
    const [dateRange, setDateRange] = useState(30);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchNBDPerformance();
        
        // Auto-refresh every 30 minutes (same as Emergency Dashboard)
        const interval = setInterval(fetchNBDPerformance, 1800000);
        return () => clearInterval(interval);
    }, [mrFilter, dateRange]);

    const fetchNBDPerformance = async () => {
        try {
            setError(null);
            setLoading(true);
            
            const { data, error: nbdError } = await supabase
                .from('nbd_performance_analytics')
                .select('*')
                .ilike('mr_name', mrFilter ? `%${mrFilter}%` : '%')
                .order('nbd_conversion_rate', { ascending: false });

            if (nbdError) {
                console.error('NBD data error:', nbdError);
                setError('Failed to load NBD performance data');
            } else {
                setNbdData(data || []);
                
                // Extract unique MR names for dropdown
                const uniqueMRs = [...new Set((data || []).map(item => item.mr_name))]
                    .filter(name => name && name.trim())
                    .sort();
                setAllMRs(uniqueMRs);
            }
            
            setLoading(false);
        } catch (error) {
            console.error('Error fetching NBD data:', error);
            setError('Failed to connect to database');
            setLoading(false);
        }
    };

    const generateNBDAlerts = (data) => {
        return data.filter(item => 
            item.nbd_visit_percentage < 40 || 
            item.nbd_conversion_rate < 15 ||
            item.performance_flag !== 'GOOD_PERFORMANCE'
        );
    };

    const getPerformanceStats = (data) => {
        return {
            totalMRs: data.length,
            goodPerformers: data.filter(item => item.performance_flag === 'GOOD_PERFORMANCE').length,
            totalNBDVisits: data.reduce((sum, item) => sum + (item.nbd_visits || 0), 0),
            totalNBDRevenue: data.reduce((sum, item) => sum + (item.nbd_revenue || 0), 0),
            avgNBDConversion: data.length > 0 ? 
                data.reduce((sum, item) => sum + (item.nbd_conversion_rate || 0), 0) / data.length : 0
        };
    };

    const alerts = generateNBDAlerts(nbdData);
    const stats = getPerformanceStats(nbdData);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Loading NBD performance data...</p>
                    <p className="text-gray-500 text-sm mt-2">Analyzing new business development metrics</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">NBD Data Error</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                        onClick={fetchNBDPerformance}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
                    >
                        Retry Loading
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 md:mb-8 text-center">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent flex items-center justify-center gap-2 md:gap-3">
                        📈 <span className="truncate">NBD Performance Analytics</span>
                    </h1>
                    <p className="text-gray-600 mt-2 md:mt-3 text-base md:text-xl">New Business Development tracking and conversion metrics</p>
                    <div className="mt-3 md:mt-4 inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Live NBD Tracking • Last Updated: {new Date().toLocaleTimeString()}
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-6 md:mb-8 bg-white rounded-xl shadow-lg p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4">Filters & Controls</h3>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4">
                        <div className="flex-1 min-w-full sm:min-w-[200px]">
                            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Filter by MR Name</label>
                            <select 
                                value={mrFilter}
                                onChange={(e) => setMrFilter(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 md:px-4 md:py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-sm md:text-base"
                            >
                                <option value="">All MRs ({allMRs.length})</option>
                                {allMRs.map((mrName, index) => (
                                    <option key={index} value={mrName}>
                                        {mrName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="min-w-full sm:min-w-[150px]">
                            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Date Range</label>
                            <select 
                                value={dateRange} 
                                onChange={(e) => setDateRange(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 md:px-4 md:py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-sm md:text-base"
                            >
                                <option value={7}>Last 7 days</option>
                                <option value={30}>Last 30 days</option>
                                <option value={90}>Last 90 days</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Summary Statistics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg p-4 md:p-6 transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-green-100 text-xs md:text-sm font-medium uppercase tracking-wide">Total Areas</div>
                                <div className="text-2xl md:text-3xl font-bold mt-1 md:mt-2">{stats.totalMRs}</div>
                                <div className="text-green-100 text-xs md:text-sm mt-0.5 md:mt-1">Active</div>
                            </div>
                            <div className="text-3xl md:text-4xl opacity-80">🏢</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-4 md:p-6 transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-blue-100 text-xs md:text-sm font-medium uppercase tracking-wide">Good Performers</div>
                                <div className="text-2xl md:text-3xl font-bold mt-1 md:mt-2">{stats.goodPerformers}</div>
                                <div className="text-blue-100 text-xs md:text-sm mt-0.5 md:mt-1">Meeting targets</div>
                            </div>
                            <div className="text-3xl md:text-4xl opacity-80">🏆</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg p-4 md:p-6 transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-purple-100 text-xs md:text-sm font-medium uppercase tracking-wide">NBD Visits</div>
                                <div className="text-2xl md:text-3xl font-bold mt-1 md:mt-2">{stats.totalNBDVisits}</div>
                                <div className="text-purple-100 text-xs md:text-sm mt-0.5 md:mt-1">Total</div>
                            </div>
                            <div className="text-3xl md:text-4xl opacity-80">🎯</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-lg p-4 md:p-6 transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-orange-100 text-xs md:text-sm font-medium uppercase tracking-wide">NBD Revenue</div>
                                <div className="text-2xl md:text-3xl font-bold mt-1 md:mt-2">₹{(stats.totalNBDRevenue / 100000).toFixed(1)}L</div>
                                <div className="text-orange-100 text-xs md:text-sm mt-0.5 md:mt-1">Generated</div>
                            </div>
                            <div className="text-3xl md:text-4xl opacity-80">💰</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-xl shadow-lg p-4 md:p-6 transform hover:scale-105 transition-transform sm:col-span-2 lg:col-span-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-teal-100 text-xs md:text-sm font-medium uppercase tracking-wide">Avg Conversion</div>
                                <div className="text-2xl md:text-3xl font-bold mt-1 md:mt-2">{stats.avgNBDConversion.toFixed(1)}%</div>
                                <div className="text-teal-100 text-xs md:text-sm mt-0.5 md:mt-1">NBD Rate</div>
                            </div>
                            <div className="text-3xl md:text-4xl opacity-80">📊</div>
                        </div>
                    </div>
                </div>

                {/* NBD Alerts */}
                <div className="mb-6 md:mb-8">
                    <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
                        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 md:p-6">
                            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 md:gap-3">
                                🚨 <span className="truncate">NBD Performance Alerts ({alerts.length})</span>
                            </h2>
                            <p className="text-red-100 mt-1 md:mt-2 text-sm md:text-lg">MRs not meeting NBD targets or showing poor conversion rates</p>
                            <div className="mt-2 md:mt-3 flex flex-wrap gap-2 md:gap-3 text-xs md:text-sm">
                                <div className="bg-red-500 bg-opacity-30 px-2 py-1 md:px-3 rounded-full">
                                    <span className="font-semibold">{alerts.filter(a => a.nbd_visit_percentage < 40).length}</span> insufficient focus
                                </div>
                                <div className="bg-red-500 bg-opacity-30 px-2 py-1 md:px-3 rounded-full">
                                    <span className="font-semibold">{alerts.filter(a => a.nbd_conversion_rate < 15).length}</span> poor conversion
                                </div>
                            </div>
                        </div>
                        <div className="p-4 md:p-6">
                            {alerts.length === 0 ? (
                                <div className="text-center py-6 md:py-8 text-gray-500">
                                    <div className="text-3xl md:text-4xl mb-1 md:mb-2">🎉</div>
                                    All MRs are meeting NBD targets! Excellent performance across the board.
                                </div>
                            ) : (
                                <div className="grid gap-3 md:gap-4 max-h-80 md:max-h-96 overflow-y-auto">
                                    {alerts.map((alert, index) => (
                                        <div key={index} className={`border-l-2 rounded-lg p-2.5 md:p-3 ${
                                            alert.performance_flag === 'INSUFFICIENT_NBD_FOCUS' ? 'border-orange-500 bg-orange-50' :
                                            alert.performance_flag === 'POOR_NBD_CONVERSION' ? 'border-red-500 bg-red-50' :
                                            'border-yellow-500 bg-yellow-50'
                                        }`}>
                                            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                                <div className="flex-1">
                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-x-2 gap-y-0.5 mb-1">
                                                        <span className="font-bold text-gray-900 text-xs sm:text-sm md:text-base">{alert.mr_name}</span>
                                                        <span className="text-gray-400 hidden sm:inline text-xs sm:text-sm">→</span>
                                                        <span className="text-gray-700 font-semibold text-xs sm:text-sm md:text-base">{alert.territory}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 text-xxs sm:text-xs md:text-sm">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-gray-500">📊</span>
                                                            <span className="text-gray-600 truncate">{alert.total_visits} total visits</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-gray-500">🎯</span>
                                                            <span className={`font-semibold truncate ${alert.nbd_visit_percentage < 40 ? 'text-red-600' : 'text-green-600'}`}>
                                                                {alert.nbd_visit_percentage?.toFixed(1)}% NBD
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-gray-500">📈</span>
                                                            <span className={`font-semibold truncate ${alert.nbd_conversion_rate < 15 ? 'text-red-600' : 'text-green-600'}`}>
                                                                {alert.nbd_conversion_rate?.toFixed(1)}% Conv.
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-gray-500">💰</span>
                                                            <span className="text-gray-600 truncate">₹{alert.nbd_revenue?.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center mt-1 sm:mt-0">
                                                    <span className={`px-1.5 py-0.5 md:px-2 text-xxs sm:text-xs font-bold rounded-md shadow-sm ${
                                                        alert.performance_flag === 'INSUFFICIENT_NBD_FOCUS' ? 'bg-orange-200 text-orange-800' :
                                                        alert.performance_flag === 'POOR_NBD_CONVERSION' ? 'bg-red-200 text-red-800' :
                                                        'bg-yellow-200 text-yellow-800'
                                                    }`}>
                                                        {alert.performance_flag.replace(/_/g, ' ').replace('NBD', '').trim()}
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

                {/* Performance Summary Table */}
                <div className="mb-6 md:mb-8">
                    <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 md:p-6">
                            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 md:gap-3">
                                📋 <span className="truncate">Detailed NBD Performance</span>
                            </h2>
                            <p className="text-blue-100 mt-1 md:mt-2 text-sm md:text-lg">Complete performance breakdown by MR and territory</p>
                            <div className="mt-2 md:mt-3 bg-blue-500 bg-opacity-30 px-2 py-1 md:px-3 rounded-full text-xs md:text-sm inline-block">
                                <span className="font-semibold">{nbdData.length}</span> MR records
                            </div>
                        </div>
                        <div className="overflow-x-auto max-h-80 md:max-h-96 overflow-y-auto">
                            <table className="w-full min-w-[900px]">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-bold text-gray-700">MR Name</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-bold text-gray-700">Territory</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">Total Visits</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">NBD Visits</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">NBD %</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">NBD Conversions</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">Conv. Rate</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">NBD Revenue</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {nbdData.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" className="px-3 py-6 md:px-4 md:py-8 text-center text-gray-500">
                                                <div className="text-3xl md:text-4xl mb-1 md:mb-2">📊</div>
                                                No NBD performance data available for the selected filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        nbdData.map((item, index) => (
                                            <tr key={index} className={`hover:bg-gray-50 ${
                                                item.performance_flag === 'GOOD_PERFORMANCE' ? 'bg-green-50' : 'bg-red-50'
                                            }`}>
                                                <td className="px-3 py-2 md:px-4 md:py-3 font-semibold text-gray-900 text-sm md:text-base">{item.mr_name}</td>
                                                <td className="px-3 py-2 md:px-4 md:py-3 text-gray-700 text-sm md:text-base">{item.territory}</td>
                                                <td className="px-3 py-2 md:px-4 md:py-3 text-center">
                                                    <span className="inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xs md:text-sm bg-blue-100 text-blue-800">
                                                        {item.total_visits}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 md:px-4 md:py-3 text-center">
                                                    <span className="inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xs md:text-sm bg-purple-100 text-purple-800">
                                                        {item.nbd_visits}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 md:px-4 md:py-3 text-center font-semibold text-sm md:text-base">
                                                    <span className={item.nbd_visit_percentage < 40 ? 'text-red-600' : 'text-green-600'}>
                                                        {item.nbd_visit_percentage?.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 md:px-4 md:py-3 text-center">
                                                    <span className="inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xs md:text-sm bg-green-100 text-green-800">
                                                        {item.nbd_conversions}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 md:px-4 md:py-3 text-center font-bold text-sm md:text-base">
                                                    <span className={item.nbd_conversion_rate < 15 ? 'text-red-600' : 'text-green-600'}>
                                                        {item.nbd_conversion_rate?.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 md:px-4 md:py-3 text-center font-semibold text-sm md:text-base">
                                                    ₹{item.nbd_revenue?.toLocaleString()}
                                                </td>
                                                <td className="px-3 py-2 md:px-4 md:py-3 text-center">
                                                    <span className={`px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xxs md:text-xs font-bold ${
                                                        item.performance_flag === 'GOOD_PERFORMANCE' ? 'bg-green-100 text-green-800' :
                                                        item.performance_flag === 'INSUFFICIENT_NBD_FOCUS' ? 'bg-orange-100 text-orange-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        {item.performance_flag === 'GOOD_PERFORMANCE' ? 'GOOD' :
                                                         item.performance_flag === 'INSUFFICIENT_NBD_FOCUS' ? 'LOW FOCUS' :
                                                         'POOR CONV.'}
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
            </div>
        </div>
    );
};

export default NBDPerformanceDashboard;
