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
        <div className="min-h-screen bg-slate-50 p-2 sm:p-4">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex-grow">
                            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span>📈 NBD Performance</span>
                                {mrName && (
                                    <span className="text-base sm:text-lg font-normal text-green-600">- {mrName}</span>
                                )}
                                {!mrName && (
                                    <span className="text-base sm:text-lg font-normal text-blue-600">- All MRs</span>
                                )}
                            </h1>
                            <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm">
                                New Business Development tracking and conversion metrics
                                {mrName ? <span className="font-medium"> for {mrName}</span> : <span className="font-medium hidden sm:inline"> across all MRs</span>}.
                            </p>
                            <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-2 sm:gap-4">
                                <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    Live NBD • Updated: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                                <div className="hidden md:inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full text-xs">
                                    <span>📊</span>
                                    NBD Analytics View
                                </div>
                                <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-2 sm:px-3 py-1 rounded-full text-xs">
                                    <span>📅</span>
                                    Last {dateRange} days
                                </div>
                                <div className="hidden sm:inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-2 sm:px-3 py-1 rounded-full text-xs">
                                    <span>🎯</span>
                                    {selectedFilter === 'all' ? 'All Perf.' :
                                     selectedFilter === 'good' ? 'Good Perf.' :
                                     selectedFilter === 'insufficient' ? 'Low Focus' : 'Poor Conv.'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
                            <button
                                onClick={manualRetry}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <span className={loading ? 'animate-spin' : ''}>🔄</span>
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Connection Status */}
                {retryCount > 0 && !loading && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 text-green-500">✅</div>
                            <div>
                                <h3 className="text-xs sm:text-sm font-medium text-green-800">Connection Restored</h3>
                                <p className="text-xs sm:text-sm text-green-700 mt-0.5 sm:mt-1">
                                    NBD data loaded successfully after {retryCount} retry attempts.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Summary Statistics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-sm p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-green-100 text-xs sm:text-sm font-medium uppercase tracking-wide">Total Areas</div>
                                <div className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.totalMRs}</div>
                                <div className="text-green-100 text-xs sm:text-sm mt-1">Active</div>
                            </div>
                            <div className="text-2xl sm:text-4xl opacity-80">🏢</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-sm p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-blue-100 text-xs sm:text-sm font-medium uppercase tracking-wide">Good Perf.</div>
                                <div className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.goodPerformers}</div>
                                <div className="text-blue-100 text-xs sm:text-sm mt-1">Meeting targets</div>
                            </div>
                            <div className="text-2xl sm:text-4xl opacity-80">🏆</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-sm p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-purple-100 text-xs sm:text-sm font-medium uppercase tracking-wide">NBD Visits</div>
                                <div className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.totalNBDVisits}</div>
                                <div className="text-purple-100 text-xs sm:text-sm mt-1">Total</div>
                            </div>
                            <div className="text-2xl sm:text-4xl opacity-80">🎯</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-sm p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-orange-100 text-xs sm:text-sm font-medium uppercase tracking-wide">NBD Revenue</div>
                                <div className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">₹{(stats.totalNBDRevenue / 100000).toFixed(1)}L</div>
                                <div className="text-orange-100 text-xs sm:text-sm mt-1">Generated</div>
                            </div>
                            <div className="text-2xl sm:text-4xl opacity-80">💰</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-xl shadow-sm p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-teal-100 text-xs sm:text-sm font-medium uppercase tracking-wide">Avg Conv.</div>
                                <div className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.avgNBDConversion.toFixed(1)}%</div>
                                <div className="text-teal-100 text-xs sm:text-sm mt-1">NBD Rate</div>
                            </div>
                            <div className="text-2xl sm:text-4xl opacity-80">📊</div>
                        </div>
                    </div>
                </div>

                {/* NBD Alerts */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 sm:p-6 rounded-t-xl">
                        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3">
                            🚨 NBD Performance Alerts ({alerts.length})
                        </h2>
                        <p className="text-red-100 mt-1 sm:mt-2 text-xs sm:text-sm">MRs not meeting NBD targets or showing poor conversion rates</p>
                        <div className="mt-2 sm:mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                            <div className="bg-red-500 bg-opacity-30 px-2 sm:px-3 py-1 rounded-full">
                                <span className="font-semibold">{alerts.filter(a => a.nbd_visit_percentage < 40).length}</span> low focus
                            </div>
                            <div className="bg-red-500 bg-opacity-30 px-2 sm:px-3 py-1 rounded-full">
                                <span className="font-semibold">{alerts.filter(a => a.nbd_conversion_rate < 15).length}</span> poor conv.
                            </div>
                        </div>
                    </div>
                    <div className="p-4 sm:p-6">
                        {alerts.length === 0 ? (
                            <div className="text-center py-6 sm:py-8 text-gray-500">
                                <div className="text-3xl sm:text-4xl mb-2 sm:mb-4">🎉</div>
                                <p className="text-base sm:text-lg">All MRs are meeting NBD targets!</p>
                                <p className="text-xs sm:text-sm mt-1 sm:mt-2">Excellent performance across the board.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3 sm:gap-4 max-h-96 overflow-y-auto">
                                {alerts.map((alert, index) => (
                                    <div key={index} className={`border-l-4 rounded-lg p-3 sm:p-4 ${
                                        alert.performance_flag === 'INSUFFICIENT_NBD_FOCUS' ? 'border-orange-500 bg-orange-50' :
                                        alert.performance_flag === 'POOR_NBD_CONVERSION' ? 'border-red-500 bg-red-50' :
                                        'border-yellow-500 bg-yellow-50'
                                    }`}>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 sm:gap-4 mb-1 sm:mb-2">
                                                    <span className="font-bold text-gray-900 text-sm sm:text-base">{alert.mr_name}</span>
                                                    <span className="text-gray-400 hidden sm:inline">→</span>
                                                    <span className="text-gray-700 font-semibold text-xs sm:text-sm">{alert.territory}</span>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <span className="text-gray-500">📊</span>
                                                        <span className="text-gray-600">{alert.total_visits} visits</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <span className="text-gray-500">🎯</span>
                                                        <span className={`font-semibold ${alert.nbd_visit_percentage < 40 ? 'text-red-600' : 'text-green-600'}`}>
                                                            {alert.nbd_visit_percentage?.toFixed(1)}% NBD
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <span className="text-gray-500">📈</span>
                                                        <span className={`font-semibold ${alert.nbd_conversion_rate < 15 ? 'text-red-600' : 'text-green-600'}`}>
                                                            {alert.nbd_conversion_rate?.toFixed(1)}% Conv.
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <span className="text-gray-500">💰</span>
                                                        <span className="text-gray-600">₹{alert.nbd_revenue?.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center mt-2 sm:mt-0">
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
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 rounded-t-xl">
                        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3">
                            📋 Detailed NBD Performance ({filteredData.length})
                        </h2>
                        <p className="text-blue-100 mt-1 sm:mt-2 text-xs sm:text-sm">Complete performance breakdown by MR and territory</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MR Name</th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Territory</th>
                                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Visits</th>
                                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">NBD Visits</th>
                                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">NBD %</th>
                                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">NBD Conv.</th>
                                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Conv. Rate</th>
                                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">NBD Revenue</th>
                                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                                            <div className="text-3xl sm:text-4xl mb-2 sm:mb-4">📊</div>
                                            <p className="text-sm sm:text-base">No NBD performance data available for the selected filters.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((item, index) => (
                                        <tr key={index} className={`hover:bg-gray-50 transition-colors text-xs sm:text-sm ${
                                            item.performance_flag === 'GOOD_PERFORMANCE' ? 'bg-green-50' : 'bg-red-50'
                                        }`}>
                                            <td className="px-3 sm:px-6 py-3 font-semibold text-gray-900 whitespace-nowrap">{item.mr_name}</td>
                                            <td className="px-3 sm:px-6 py-3 text-gray-700 hidden md:table-cell whitespace-nowrap">{item.territory}</td>
                                            <td className="px-3 sm:px-6 py-3 text-center">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800">
                                                    {item.total_visits}
                                                </span>
                                            </td>
                                            <td className="px-3 sm:px-6 py-3 text-center">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-800">
                                                    {item.nbd_visits}
                                                </span>
                                            </td>
                                            <td className="px-3 sm:px-6 py-3 text-center font-semibold hidden sm:table-cell">
                                                <span className={item.nbd_visit_percentage < 40 ? 'text-red-600' : 'text-green-600'}>
                                                    {item.nbd_visit_percentage?.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-3 sm:px-6 py-3 text-center hidden md:table-cell">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full font-medium bg-green-100 text-green-800">
                                                    {item.nbd_conversions}
                                                </span>
                                            </td>
                                            <td className="px-3 sm:px-6 py-3 text-center font-bold">
                                                <span className={item.nbd_conversion_rate < 15 ? 'text-red-600' : 'text-green-600'}>
                                                    {item.nbd_conversion_rate?.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-3 sm:px-6 py-3 text-center font-semibold hidden sm:table-cell">
                                                ₹{item.nbd_revenue?.toLocaleString()}
                                            </td>
                                            <td className="px-3 sm:px-6 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
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
