import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const NBDPerformanceDashboard = ({ mrName, dateRange: propDateRange, performanceFilter: propPerformanceFilter }) => {
    const [nbdData, setNbdData] = useState([]);
    const [allMRs, setAllMRs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isRetrying, setIsRetrying] = useState(false);

    // Use props or defaults
    const dateRange = propDateRange || 30;
    const selectedFilter = propPerformanceFilter || 'all';

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds
    const REQUEST_TIMEOUT = 10000; // 10 seconds

    useEffect(() => {
        fetchNBDPerformance();
        
        // Auto-refresh every 30 minutes
        const interval = setInterval(fetchNBDPerformance, 1800000);
        return () => clearInterval(interval);
    }, [mrName, dateRange, selectedFilter]);

    const fetchNBDPerformance = async () => {
        setRetryCount(0);
        await fetchNBDDataWithRetry();
    };

    const fetchNBDDataWithRetry = async (attempt = 1) => {
        try {
            setError(null);
            setLoading(true);
            setIsRetrying(attempt > 1);
            
            console.log(`📊 NBD Data fetch attempt ${attempt}/${MAX_RETRIES}`);
            
            // Add timeout to the query
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
            
            const { data, error: nbdError } = await supabase
                .from('nbd_performance_analytics')
                .select('*')
                .ilike('mr_name', mrName ? `%${mrName}%` : '%')
                .order('nbd_conversion_rate', { ascending: false })
                .abortSignal(controller.signal);

            clearTimeout(timeoutId);

            if (nbdError) {
                console.error(`❌ NBD data error (attempt ${attempt}):`, nbdError);
                throw nbdError;
            }

            if (!data || data.length === 0) {
                console.warn(`⚠️ No NBD data returned (attempt ${attempt})`);
                if (attempt < MAX_RETRIES) {
                    console.log(`🔄 Retrying in ${RETRY_DELAY/1000} seconds...`);
                    setTimeout(() => {
                        setRetryCount(attempt);
                        fetchNBDDataWithRetry(attempt + 1);
                    }, RETRY_DELAY * attempt); // Exponential backoff
                    return;
                } else {
                    throw new Error('No NBD performance data available after multiple attempts');
                }
            }

            console.log(`✅ NBD data loaded successfully: ${data.length} records`);
            setNbdData(data);
            
            // Extract unique MR names for dropdown
            const uniqueMRs = [...new Set(data.map(item => item.mr_name))]
                .filter(name => name && name.trim())
                .sort();
            setAllMRs(uniqueMRs);
            
            setLoading(false);
            setIsRetrying(false);
            setRetryCount(0);
            
        } catch (error) {
            console.error(`❌ Error fetching NBD data (attempt ${attempt}):`, error);
            
            if (error.name === 'AbortError') {
                console.log('⏱️ Request timed out');
            }
            
            if (attempt < MAX_RETRIES) {
                console.log(`🔄 Retrying in ${RETRY_DELAY * attempt / 1000} seconds... (${attempt}/${MAX_RETRIES})`);
                setRetryCount(attempt);
                setTimeout(() => {
                    fetchNBDDataWithRetry(attempt + 1);
                }, RETRY_DELAY * attempt); // Exponential backoff: 2s, 4s, 6s
            } else {
                console.error('❌ All retry attempts failed');
                setError(`Failed to load NBD performance data after ${MAX_RETRIES} attempts. Please check your connection and try again.`);
                setLoading(false);
                setIsRetrying(false);
                setRetryCount(0);
            }
        }
    };

    const manualRetry = () => {
        setError(null);
        setRetryCount(0);
        fetchNBDDataWithRetry();
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

    const getFilteredData = () => {
        if (selectedFilter === 'all') return nbdData;
        if (selectedFilter === 'good') return nbdData.filter(item => item.performance_flag === 'GOOD_PERFORMANCE');
        if (selectedFilter === 'insufficient') return nbdData.filter(item => item.performance_flag === 'INSUFFICIENT_NBD_FOCUS');
        if (selectedFilter === 'poor') return nbdData.filter(item => item.performance_flag === 'POOR_NBD_CONVERSION');
        return nbdData;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg font-medium">
                        {isRetrying ? `Retrying NBD data fetch (${retryCount}/${MAX_RETRIES})...` : 'Loading NBD performance data...'}
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                        {isRetrying ? 'Connection issues detected, retrying automatically...' : 'Analyzing new business development metrics'}
                    </p>
                    {isRetrying && (
                        <div className="mt-4 bg-yellow-100 border border-yellow-300 rounded-lg p-3 max-w-md mx-auto">
                            <p className="text-yellow-800 text-sm">
                                🔄 Automatic retry in progress... Please wait.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md border border-gray-200">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">NBD Data Connection Error</h2>
                    <p className="text-gray-600 mb-4 text-sm leading-relaxed">{error}</p>
                    <div className="space-y-3">
                        <button 
                            onClick={manualRetry}
                            className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                        >
                            🔄 Retry Now
                        </button>
                        <p className="text-xs text-gray-500">
                            Tip: The NBD analytics view may take a moment to respond. Try refreshing after a few seconds.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const alerts = generateNBDAlerts(nbdData);
    const stats = getPerformanceStats(nbdData);
    const filteredData = getFilteredData();

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                📈 NBD Performance Analytics
                                {mrName && (
                                    <span className="text-lg font-normal text-green-600">- {mrName}</span>
                                )}
                                {!mrName && (
                                    <span className="text-lg font-normal text-blue-600">- All MRs</span>
                                )}
                            </h1>
                            <p className="text-gray-600 mt-2">
                                New Business Development tracking and conversion metrics
                                {mrName ? <span className="font-medium"> for {mrName}</span> : <span className="font-medium"> across all MRs</span>}
                            </p>
                            <div className="mt-3 flex items-center gap-4">
                                <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    Live NBD Tracking • Last Updated: {new Date().toLocaleTimeString()}
                                </div>
                                <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                    <span>📊</span>
                                    Using NBD Analytics View
                                </div>
                                <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                                    <span>📅</span>
                                    Last {dateRange} days
                                </div>
                                <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                                    <span>🎯</span>
                                    {selectedFilter === 'all' ? 'All Performance' : 
                                     selectedFilter === 'good' ? 'Good Performers' :
                                     selectedFilter === 'insufficient' ? 'Insufficient Focus' : 'Poor Conversion'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={manualRetry}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <span className={loading ? 'animate-spin' : ''}>🔄</span>
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Connection Status */}
                {retryCount > 0 && !loading && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 text-green-500">✅</div>
                            <div>
                                <h3 className="text-sm font-medium text-green-800">Connection Restored</h3>
                                <p className="text-sm text-green-700 mt-1">
                                    NBD data loaded successfully after {retryCount} retry attempts.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Filters & Controls</h3>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-64">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by MR Name</label>
                            <select 
                                value={mrFilter}
                                onChange={(e) => setMrFilter(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-sm"
                                disabled={!!mrName} // Disable when MR is selected from header
                            >
                                <option value="">All MRs ({allMRs.length})</option>
                                {allMRs.map((mrNameOption, index) => (
                                    <option key={index} value={mrNameOption}>
                                        {mrNameOption} {mrNameOption === mrName ? '(Selected)' : ''}
                                    </option>
                                ))}
                            </select>
                            {mrName && (
                                <p className="text-xs text-blue-600 mt-1">
                                    🔒 Filtered by selected MR from header
                                </p>
                            )}
                        </div>
                        <div className="min-w-48">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                            <select 
                                value={dateRange} 
                                onChange={(e) => setDateRange(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-sm"
                            >
                                <option value={7}>Last 7 days</option>
                                <option value={30}>Last 30 days</option>
                                <option value={90}>Last 90 days</option>
                            </select>
                        </div>
                        <div className="min-w-48">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Performance Filter</label>
                            <select 
                                value={selectedFilter} 
                                onChange={(e) => setSelectedFilter(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-sm"
                            >
                                <option value="all">All Performance</option>
                                <option value="good">Good Performers</option>
                                <option value="insufficient">Insufficient Focus</option>
                                <option value="poor">Poor Conversion</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Summary Statistics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-green-100 text-sm font-medium uppercase tracking-wide">Total Areas</div>
                                <div className="text-3xl font-bold mt-2">{stats.totalMRs}</div>
                                <div className="text-green-100 text-sm mt-1">Active</div>
                            </div>
                            <div className="text-4xl opacity-80">🏢</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-blue-100 text-sm font-medium uppercase tracking-wide">Good Performers</div>
                                <div className="text-3xl font-bold mt-2">{stats.goodPerformers}</div>
                                <div className="text-blue-100 text-sm mt-1">Meeting targets</div>
                            </div>
                            <div className="text-4xl opacity-80">🏆</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-purple-100 text-sm font-medium uppercase tracking-wide">NBD Visits</div>
                                <div className="text-3xl font-bold mt-2">{stats.totalNBDVisits}</div>
                                <div className="text-purple-100 text-sm mt-1">Total</div>
                            </div>
                            <div className="text-4xl opacity-80">🎯</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-orange-100 text-sm font-medium uppercase tracking-wide">NBD Revenue</div>
                                <div className="text-3xl font-bold mt-2">₹{(stats.totalNBDRevenue / 100000).toFixed(1)}L</div>
                                <div className="text-orange-100 text-sm mt-1">Generated</div>
                            </div>
                            <div className="text-4xl opacity-80">💰</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-teal-100 text-sm font-medium uppercase tracking-wide">Avg Conversion</div>
                                <div className="text-3xl font-bold mt-2">{stats.avgNBDConversion.toFixed(1)}%</div>
                                <div className="text-teal-100 text-sm mt-1">NBD Rate</div>
                            </div>
                            <div className="text-4xl opacity-80">📊</div>
                        </div>
                    </div>
                </div>

                {/* NBD Alerts */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-xl">
                        <h2 className="text-xl font-bold flex items-center gap-3">
                            🚨 NBD Performance Alerts ({alerts.length})
                        </h2>
                        <p className="text-red-100 mt-2">MRs not meeting NBD targets or showing poor conversion rates</p>
                        <div className="mt-3 flex flex-wrap gap-3 text-sm">
                            <div className="bg-red-500 bg-opacity-30 px-3 py-1 rounded-full">
                                <span className="font-semibold">{alerts.filter(a => a.nbd_visit_percentage < 40).length}</span> insufficient focus
                            </div>
                            <div className="bg-red-500 bg-opacity-30 px-3 py-1 rounded-full">
                                <span className="font-semibold">{alerts.filter(a => a.nbd_conversion_rate < 15).length}</span> poor conversion
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        {alerts.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <div className="text-4xl mb-4">🎉</div>
                                <p className="text-lg">All MRs are meeting NBD targets!</p>
                                <p className="text-sm mt-2">Excellent performance across the board.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 max-h-96 overflow-y-auto">
                                {alerts.map((alert, index) => (
                                    <div key={index} className={`border-l-4 rounded-lg p-4 ${
                                        alert.performance_flag === 'INSUFFICIENT_NBD_FOCUS' ? 'border-orange-500 bg-orange-50' :
                                        alert.performance_flag === 'POOR_NBD_CONVERSION' ? 'border-red-500 bg-red-50' :
                                        'border-yellow-500 bg-yellow-50'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-4 mb-2">
                                                    <span className="font-bold text-gray-900">{alert.mr_name}</span>
                                                    <span className="text-gray-400">→</span>
                                                    <span className="text-gray-700 font-semibold">{alert.territory}</span>
                                                </div>
                                                <div className="grid grid-cols-4 gap-4 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-500">📊</span>
                                                        <span className="text-gray-600">{alert.total_visits} total visits</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-500">🎯</span>
                                                        <span className={`font-semibold ${alert.nbd_visit_percentage < 40 ? 'text-red-600' : 'text-green-600'}`}>
                                                            {alert.nbd_visit_percentage?.toFixed(1)}% NBD
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-500">📈</span>
                                                        <span className={`font-semibold ${alert.nbd_conversion_rate < 15 ? 'text-red-600' : 'text-green-600'}`}>
                                                            {alert.nbd_conversion_rate?.toFixed(1)}% Conv.
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-500">💰</span>
                                                        <span className="text-gray-600">₹{alert.nbd_revenue?.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-lg ${
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

                {/* Performance Summary Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
                        <h2 className="text-xl font-bold flex items-center gap-3">
                            📋 Detailed NBD Performance ({filteredData.length})
                        </h2>
                        <p className="text-blue-100 mt-2">Complete performance breakdown by MR and territory</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MR Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Territory</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Visits</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">NBD Visits</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">NBD %</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">NBD Conversions</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Conv. Rate</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">NBD Revenue</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                                            <div className="text-4xl mb-4">📊</div>
                                            <p>No NBD performance data available for the selected filters.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((item, index) => (
                                        <tr key={index} className={`hover:bg-gray-50 transition-colors ${
                                            item.performance_flag === 'GOOD_PERFORMANCE' ? 'bg-green-50' : 'bg-red-50'
                                        }`}>
                                            <td className="px-6 py-3 font-semibold text-gray-900">{item.mr_name}</td>
                                            <td className="px-6 py-3 text-gray-700">{item.territory}</td>
                                            <td className="px-6 py-3 text-center">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                                                    {item.total_visits}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                                                    {item.nbd_visits}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-center font-semibold">
                                                <span className={item.nbd_visit_percentage < 40 ? 'text-red-600' : 'text-green-600'}>
                                                    {item.nbd_visit_percentage?.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-green-100 text-green-800">
                                                    {item.nbd_conversions}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-center font-bold">
                                                <span className={item.nbd_conversion_rate < 15 ? 'text-red-600' : 'text-green-600'}>
                                                    {item.nbd_conversion_rate?.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-center font-semibold">
                                                ₹{item.nbd_revenue?.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
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
    );
};

export default NBDPerformanceDashboard;
