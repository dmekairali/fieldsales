import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const VisitQualityMonitor = ({ mrName }) => {
    const [qualityAlerts, setQualityAlerts] = useState([]);
    const [mrPerformance, setMrPerformance] = useState([]);
    const [suspiciousVisits, setSuspiciousVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [dateRange, setDateRange] = useState('today');

    useEffect(() => {
        fetchQualityData();
        
        // Auto-refresh every 30 minutes
        const interval = setInterval(fetchQualityData, 1800000);
        return () => clearInterval(interval);
    }, [mrName, dateRange]);

    const fetchQualityData = async () => {
        try {
            setError(null);
            setLoading(true);
            
            await Promise.all([
                fetchQualityAlerts(),
                fetchPerformanceData(),
                fetchSuspiciousVisits()
            ]);
            
            setLoading(false);
        } catch (error) {
            console.error('Error fetching quality data:', error);
            setError('Failed to load quality data. Please check your connection.');
            setLoading(false);
        }
    };

    const fetchQualityAlerts = async () => {
        try {
            // Try to fetch from real_time_visit_quality view first
            const { data: alerts, error: alertsError } = await supabase
                .from('real_time_visit_quality')
                .select('*')
                .eq('dcrDate', new Date().toISOString().split('T')[0])
                .lt('quality_score', 30)
                .ilike('empName', mrName ? `%${mrName}%` : '%')
                .order('quality_score', { ascending: true });

            if (!alertsError && alerts) {
                setQualityAlerts(alerts);
            } else {
                console.error('Quality alerts error:', alertsError);
                // Fallback to direct query
                await fetchQualityDataDirect();
            }
        } catch (error) {
            console.error('Error fetching quality alerts:', error);
            await fetchQualityDataDirect();
        }
    };

    const fetchQualityDataDirect = async () => {
        try {
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
                .ilike('empName', mrName ? `%${mrName}%` : '%')
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
        } catch (error) {
            console.error('Error in direct quality data fetch:', error);
        }
    };

    const fetchPerformanceData = async () => {
        try {
            // Try view first, then fallback
            const { data: performance, error: perfError } = await supabase
                .from('real_time_visit_quality')
                .select(`
                    "empName",
                    quality_score,
                    quality_grade,
                    "amountOfSale"
                `)
                .eq('dcrDate', new Date().toISOString().split('T')[0])
                .ilike('empName', mrName ? `%${mrName}%` : '%');

            if (!perfError && performance) {
                processPerformanceData(performance);
            } else {
                console.error('Performance data error:', perfError);
                // Fallback - get all visits for today and calculate
                await fetchPerformanceDataDirect();
            }
        } catch (error) {
            console.error('Error fetching performance data:', error);
            await fetchPerformanceDataDirect();
        }
    };

    const fetchPerformanceDataDirect = async () => {
        try {
            const { data, error } = await supabase
                .from('mr_visits')
                .select(`
                    "empName",
                    "visitTime",
                    "amountOfSale",
                    "sampleValue"
                `)
                .eq('dcrDate', new Date().toISOString().split('T')[0])
                .ilike('empName', mrName ? `%${mrName}%` : '%')
                .not('visitTime', 'is', null);

            if (!error && data) {
                const performanceWithScores = data.map(visit => {
                    const visitSeconds = timeToSeconds(visit.visitTime);
                    const qualityScore = calculateSimpleQualityScore(visitSeconds, visit.amountOfSale, visit.sampleValue);
                    
                    return {
                        ...visit,
                        quality_score: qualityScore,
                        quality_grade: qualityScore < 20 ? 'VERY_POOR' : qualityScore < 30 ? 'POOR' : qualityScore < 60 ? 'AVERAGE' : 'GOOD'
                    };
                });
                
                processPerformanceData(performanceWithScores);
            }
        } catch (error) {
            console.error('Error in direct performance data fetch:', error);
        }
    };

    const fetchSuspiciousVisits = async () => {
        try {
            // Try view first
            const { data: visits, error: visitsError } = await supabase
                .from('suspicious_visits')
                .select('*')
                .gte('dcrDate', new Date().toISOString().split('T')[0])
                .neq('quality_flag', 'NORMAL')
                .ilike('empName', mrName ? `%${mrName}%` : '%')
                .order('visit_seconds');

            if (!visitsError && visits) {
                setSuspiciousVisits(visits);
            } else {
                console.error('Visits data error:', visitsError);
                await fetchSuspiciousVisitsDirect();
            }
        } catch (error) {
            console.error('Error fetching suspicious visits:', error);
            await fetchSuspiciousVisitsDirect();
        }
    };

    const fetchSuspiciousVisitsDirect = async () => {
        try {
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
                .ilike('empName', mrName ? `%${mrName}%` : '%')
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
        } catch (error) {
            console.error('Error in direct suspicious visits fetch:', error);
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

    const getFilteredAlerts = () => {
        if (selectedFilter === 'all') return qualityAlerts;
        if (selectedFilter === 'critical') return qualityAlerts.filter(a => a.quality_score < 20);
        if (selectedFilter === 'poor') return qualityAlerts.filter(a => a.quality_score >= 20 && a.quality_score < 30);
        return qualityAlerts;
    };

    const getQualityStats = () => {
        const total = qualityAlerts.length;
        const critical = qualityAlerts.filter(a => a.quality_score < 20).length;
        const poor = qualityAlerts.filter(a => a.quality_score >= 20 && a.quality_score < 30).length;
        const avgScore = total > 0 ? qualityAlerts.reduce((sum, a) => sum + a.quality_score, 0) / total : 0;
        
        return { total, critical, poor, avgScore };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg font-medium">Loading visit quality data...</p>
                    <p className="text-gray-500 text-sm mt-2">
                        {mrName ? `Analyzing visit patterns for ${mrName}` : 'Analyzing visit patterns across all MRs'}
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md border border-gray-200">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Quality Data Error</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                        onClick={fetchQualityData}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                    >
                        Retry Loading
                    </button>
                </div>
            </div>
        );
    }

    const stats = getQualityStats();
    const filteredAlerts = getFilteredAlerts();

    return (
        <div className="min-h-screen bg-slate-50 p-2 sm:p-4">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex-grow">
                            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span>📊 Visit Quality Monitor</span>
                                {mrName && (
                                    <span className="text-base sm:text-lg font-normal text-purple-600">- {mrName}</span>
                                )}
                                {!mrName && (
                                    <span className="text-base sm:text-lg font-normal text-blue-600">- All MRs</span>
                                )}
                            </h1>
                            <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm">
                                Real-time visit quality analysis and performance tracking
                                {mrName ? <span className="font-medium"> for {mrName}</span> : <span className="font-medium hidden sm:inline"> across all MRs</span>}.
                            </p>
                            <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-2 sm:gap-4">
                                <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                                    Live Quality • Updated: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                                <div className="hidden md:inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full text-xs">
                                    <span>📊</span>
                                    Quality Analytics
                                </div>
                                <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full text-xs">
                                    <span>📅</span>
                                    {dateRange === 'today' ? 'Today' : dateRange === 'yesterday' ? 'Yesterday' : 'This Week'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
                            <select 
                                value={dateRange} 
                                onChange={(e) => setDateRange(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs sm:text-sm"
                            >
                                <option value="today">Today</option>
                                <option value="yesterday">Yesterday</option>
                                <option value="week">This Week</option>
                            </select>
                            <button
                                onClick={fetchQualityData}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <span className={loading ? 'animate-spin' : ''}>🔄</span>
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quality Statistics */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-sm p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-purple-100 text-xs sm:text-sm font-medium uppercase tracking-wide">Total Alerts</div>
                                <div className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.total}</div>
                                <div className="text-purple-100 text-xs sm:text-sm mt-1">Quality issues</div>
                            </div>
                            <div className="text-3xl sm:text-4xl opacity-80">⚡</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl shadow-sm p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-red-100 text-xs sm:text-sm font-medium uppercase tracking-wide">Critical Issues</div>
                                <div className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.critical}</div>
                                <div className="text-red-100 text-xs sm:text-sm mt-1">Score &lt; 20</div>
                            </div>
                            <div className="text-3xl sm:text-4xl opacity-80">🚨</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-sm p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-orange-100 text-xs sm:text-sm font-medium uppercase tracking-wide">Poor Quality</div>
                                <div className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.poor}</div>
                                <div className="text-orange-100 text-xs sm:text-sm mt-1">Score 20-30</div>
                            </div>
                            <div className="text-3xl sm:text-4xl opacity-80">⚠️</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-sm p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-blue-100 text-xs sm:text-sm font-medium uppercase tracking-wide">Avg Quality</div>
                                <div className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.avgScore.toFixed(1)}</div>
                                <div className="text-blue-100 text-xs sm:text-sm mt-1">Overall score</div>
                            </div>
                            <div className="text-3xl sm:text-4xl opacity-80">📈</div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900">Quality Alert Filters</h2>
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <button
                                onClick={() => setSelectedFilter('all')}
                                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                                    selectedFilter === 'all' 
                                        ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                All ({qualityAlerts.length})
                            </button>
                            <button
                                onClick={() => setSelectedFilter('critical')}
                                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                                    selectedFilter === 'critical' 
                                        ? 'bg-red-100 text-red-700 border border-red-200' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Critical ({stats.critical})
                            </button>
                            <button
                                onClick={() => setSelectedFilter('poor')}
                                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                                    selectedFilter === 'poor' 
                                        ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Poor ({stats.poor})
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quality Alerts */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 sm:p-6 rounded-t-xl">
                        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3">
                            ⚡ Quality Alerts ({filteredAlerts.length})
                        </h2>
                        <p className="text-purple-100 mt-1 sm:mt-2 text-xs sm:text-sm">
                            Visits with quality scores below acceptable thresholds
                            {mrName && <span> for {mrName}</span>}
                        </p>
                    </div>
                    <div className="p-4 sm:p-6">
                        {filteredAlerts.length === 0 ? (
                            <div className="text-center py-8 sm:py-12 text-gray-500">
                                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">✨</div>
                                <p className="text-base sm:text-lg">No quality alerts found!</p>
                                <p className="text-xs sm:text-sm mt-1 sm:mt-2">
                                    {mrName ? `${mrName} meets quality standards` : 'All visits meet quality standards for the selected filter.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-3 sm:gap-4 max-h-96 overflow-y-auto">
                                {filteredAlerts.map((alert, index) => (
                                    <div 
                                        key={index} 
                                        className={`border-l-4 rounded-lg p-3 sm:p-4 cursor-pointer hover:shadow-md transition-all ${
                                            alert.quality_score < 20 ? 'border-red-500 bg-red-50 hover:bg-red-100' :
                                            'border-orange-500 bg-orange-50 hover:bg-orange-100'
                                        }`} 
                                        onClick={() => investigateQualityAlert(alert)}
                                    >
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-1 mb-1 sm:mb-2">
                                                    <span className="font-bold text-gray-900 text-sm sm:text-base">{alert.empName}</span>
                                                    <span className="text-gray-400 hidden sm:inline">→</span>
                                                    <span className="text-gray-700 text-xs sm:text-sm">{alert.clientName}</span>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 sm:gap-x-4 gap-y-1 text-xs sm:text-sm">
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <span className="text-gray-500">📍</span>
                                                        <span className="text-gray-600 truncate">{alert.areaName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <span className="text-gray-500">⏱️</span>
                                                        <span className="text-gray-600">{alert.visitTime}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <span className="text-gray-500">💰</span>
                                                        <span className="text-gray-600">₹{alert.amountOfSale || 0}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <span className="text-gray-500">📊</span>
                                                        <span className={`font-semibold ${alert.quality_score < 20 ? 'text-red-600' : 'text-orange-600'}`}>
                                                            {Math.round(alert.quality_score || 0)}/100
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-0 self-start sm:self-center">
                                                <span className={`px-2 sm:px-3 py-1 text-xs font-bold rounded-lg ${
                                                    alert.quality_score < 20 ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'
                                                }`}>
                                                    {alert.quality_grade}
                                                </span>
                                                <button className="text-gray-400 hover:text-gray-600 text-lg sm:text-xl">
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

                {/* MR Performance Ranking */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 sm:p-6 rounded-t-xl">
                        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3">
                            🏆 MR Quality Performance Today
                        </h2>
                        <p className="text-green-100 mt-1 sm:mt-2 text-xs sm:text-sm">
                            Daily quality rankings and performance metrics
                            {mrName && <span> - Showing data for {mrName}</span>}
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MR Name</th>
                                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Visits</th>
                                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Quality</th>
                                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Total Sales</th>
                                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Sales/Visit</th>
                                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 text-xs sm:text-sm">
                                {mrPerformance.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                            <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">📊</div>
                                            <p className="text-sm sm:text-base">No performance data available for today.</p>
                                            {mrName && <p className="text-xs sm:text-sm mt-1 sm:mt-2">No visits found for {mrName} today.</p>}
                                        </td>
                                    </tr>
                                ) : (
                                    mrPerformance.slice(0, 15).map((mr, index) => (
                                        <tr key={index} className={`${
                                            index < 3 ? 'bg-green-50' : 
                                            mr.qualityRating === 'POOR' ? 'bg-red-50' : 'bg-white'
                                        } hover:bg-gray-50 transition-colors`}>
                                            <td className="px-3 sm:px-6 py-3 text-center">
                                                <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-bold ${
                                                    index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                                    index === 1 ? 'bg-gray-300 text-gray-800' :
                                                    index === 2 ? 'bg-orange-400 text-orange-900' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {index + 1}
                                                </span>
                                            </td>
                                            <td className="px-3 sm:px-6 py-3 font-semibold text-gray-900 whitespace-nowrap">{mr.name}</td>
                                            <td className="px-3 sm:px-6 py-3 text-center hidden sm:table-cell">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800">
                                                    {mr.totalVisits}
                                                </span>
                                            </td>
                                            <td className="px-3 sm:px-6 py-3 text-center font-bold text-sm sm:text-lg">
                                                {mr.avgQualityScore.toFixed(1)}
                                            </td>
                                            <td className="px-3 sm:px-6 py-3 text-center font-semibold hidden md:table-cell">
                                                ₹{mr.totalSales.toLocaleString()}
                                            </td>
                                            <td className="px-3 sm:px-6 py-3 text-center hidden md:table-cell">
                                                ₹{mr.avgSalesPerVisit.toFixed(0)}
                                            </td>
                                            <td className="px-3 sm:px-6 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
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

                {/* Suspicious Visits */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-4 sm:p-6 rounded-t-xl">
                        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3">
                            🔍 Suspicious Visits Today ({suspiciousVisits.length})
                        </h2>
                        <p className="text-orange-100 mt-1 sm:mt-2 text-xs sm:text-sm">
                            Visits flagged for unusual patterns or timing issues
                            {mrName && <span> for {mrName}</span>}
                        </p>
                    </div>
                    <div className="p-4 sm:p-6">
                        {suspiciousVisits.length === 0 ? (
                            <div className="text-center py-8 sm:py-12 text-gray-500">
                                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">✅</div>
                                <p className="text-base sm:text-lg">No suspicious visits detected today!</p>
                                <p className="text-xs sm:text-sm mt-1 sm:mt-2">
                                    {mrName ? `${mrName}'s visits appear normal.` : 'All visits appear normal.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-3 sm:gap-4 max-h-96 overflow-y-auto">
                                {suspiciousVisits.map((visit, index) => (
                                    <div 
                                        key={index} 
                                        className={`border-l-4 rounded-lg p-3 sm:p-4 cursor-pointer hover:shadow-md transition-all ${
                                            visit.quality_flag === 'FAKE_VISIT' ? 'border-red-500 bg-red-50 hover:bg-red-100' :
                                            visit.quality_flag === 'SUSPICIOUS_SHORT' ? 'border-orange-500 bg-orange-50 hover:bg-orange-100' :
                                            visit.quality_flag === 'SUSPICIOUS_LONG' ? 'border-purple-500 bg-purple-50 hover:bg-purple-100' :
                                            'border-yellow-500 bg-yellow-50 hover:bg-yellow-100'
                                        }`} 
                                        onClick={() => investigateVisit(visit)}
                                    >
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-1 mb-1 sm:mb-2">
                                                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${
                                                        visit.quality_flag === 'FAKE_VISIT' ? 'bg-red-500' :
                                                        visit.quality_flag === 'SUSPICIOUS_SHORT' ? 'bg-orange-500' :
                                                        visit.quality_flag === 'SUSPICIOUS_LONG' ? 'bg-purple-500' :
                                                        'bg-yellow-500'
                                                    }`}></div>
                                                    <span className="font-bold text-gray-900 text-sm sm:text-base">{visit.empName || 'N/A'}</span>
                                                    <span className="text-gray-400 hidden sm:inline">→</span>
                                                    <span className="text-gray-700 text-xs sm:text-sm truncate">{visit.clientName || 'N/A'}</span>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 sm:gap-x-4 gap-y-1 text-xs sm:text-sm">
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <span className="text-gray-500">📍</span>
                                                        <span className="text-gray-600 truncate">{visit.areaName || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <span className="text-gray-500">⏱️</span>
                                                        <span className={`font-semibold ${
                                                            visit.quality_flag === 'FAKE_VISIT' || visit.quality_flag === 'SUSPICIOUS_SHORT' 
                                                                ? 'text-red-600' : 'text-purple-600'
                                                        }`}>{visit.visitTime || '00:00:00'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <span className="text-gray-500">💰</span>
                                                        <span className={`font-bold ${(visit.amountOfSale || 0) === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                            ₹{(visit.amountOfSale || 0).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <span className="text-gray-500">🚩</span>
                                                        <span className="text-gray-600 whitespace-nowrap">{visit.quality_flag.replace('_', ' ')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-0 self-start sm:self-center">
                                                <span className={`px-2 sm:px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                                                    visit.quality_flag === 'FAKE_VISIT' ? 'bg-red-200 text-red-800' :
                                                    visit.quality_flag === 'SUSPICIOUS_SHORT' ? 'bg-orange-200 text-orange-800' :
                                                    visit.quality_flag === 'SUSPICIOUS_LONG' ? 'bg-purple-200 text-purple-800' :
                                                    'bg-yellow-200 text-yellow-800'
                                                }`}>
                                                    {visit.quality_flag.replace('_', ' ')}
                                                </span>
                                                <button className="text-gray-400 hover:text-gray-600 text-lg sm:text-xl">
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
        </div>
    );
};

export default VisitQualityMonitor;
