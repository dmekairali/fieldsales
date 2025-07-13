import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Users,
  MapPin,
  DollarSign,
  RefreshCw,
  Filter,
  Search,
  Eye,
  Calendar,
  BarChart3,
  Award,
  AlertCircle,
  Info,
  ChevronUp,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';

const VisitQualityMonitor = ({ mrName }) => {
    const [qualityAlerts, setQualityAlerts] = useState([]);
    const [mrPerformance, setMrPerformance] = useState([]);
    const [suspiciousVisits, setSuspiciousVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [dateRange, setDateRange] = useState('today');
    const [searchTerm, setSearchTerm] = useState('');

    // Sorting states for each table
    const [alertsSortConfig, setAlertsSortConfig] = useState({ key: null, direction: 'asc' });
    const [performanceSortConfig, setPerformanceSortConfig] = useState({ key: null, direction: 'asc' });
    const [suspiciousSortConfig, setSuspiciousSortConfig] = useState({ key: null, direction: 'asc' });

    useEffect(() => {
        fetchQualityData();
        
        // Auto-refresh every 30 minutes
        const interval = setInterval(fetchQualityData, 1800000);
        return () => clearInterval(interval);
    }, [mrName, dateRange]);

    // Date filter functions
    const getDateFilter = () => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        switch (dateRange) {
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                return {
                    type: 'single',
                    date: yesterday.toISOString().split('T')[0]
                };
                
            case 'week':
                // Calculate Monday to Sunday week (Indian standard)
                const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
                const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
                
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - daysSinceMonday);
                const weekEnd = new Date(today);
                
                return {
                    type: 'range',
                    startDate: weekStart.toISOString().split('T')[0],
                    endDate: weekEnd.toISOString().split('T')[0]
                };
                
            case 'today':
            default:
                return {
                    type: 'single',
                    date: todayStr
                };
        }
    };

    const getDateRangeDisplay = () => {
        const dateFilter = getDateFilter();
        
        if (dateFilter.type === 'single') {
            const date = new Date(dateFilter.date);
            
            if (dateRange === 'today') {
                return `Today (${date.toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'short' 
                })})`;
            } else if (dateRange === 'yesterday') {
                return `Yesterday (${date.toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'short' 
                })})`;
            }
            
            return date.toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        } else {
            const startDate = new Date(dateFilter.startDate);
            const endDate = new Date(dateFilter.endDate);
            
            if (dateRange === 'week') {
                const startDay = startDate.toLocaleDateString('en-IN', { 
                    weekday: 'short', 
                    day: 'numeric', 
                    month: 'short' 
                });
                
                const today = new Date();
                const isToday = endDate.toDateString() === today.toDateString();
                
                if (isToday) {
                    return `This Week: ${startDay} - Today`;
                } else {
                    const endDay = endDate.toLocaleDateString('en-IN', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short' 
                    });
                    return `This Week: ${startDay} - ${endDay}`;
                }
            }
            
            return `${startDate.toLocaleDateString('en-IN')} - ${endDate.toLocaleDateString('en-IN')}`;
        }
    };

    const getDateRangeLabel = () => {
        switch (dateRange) {
            case 'today':
                return 'Today';
            case 'yesterday':
                return 'Yesterday';
            case 'week':
                return 'This Week';
            default:
                return 'Today';
        }
    };

    // Sorting functions
    const handleSort = (key, sortConfig, setSortConfig) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortData = (data, sortConfig) => {
        if (!sortConfig.key) return data;

        return [...data].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Handle different data types
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (typeof aValue === 'number' || !isNaN(aValue)) {
                aValue = parseFloat(aValue) || 0;
                bValue = parseFloat(bValue) || 0;
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    };

    const SortIcon = ({ sortKey, currentSort }) => {
        if (currentSort.key !== sortKey) {
            return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
        }
        return currentSort.direction === 'asc' 
            ? <ChevronUp className="h-4 w-4 text-blue-600" />
            : <ChevronDown className="h-4 w-4 text-blue-600" />;
    };

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
            const dateFilter = getDateFilter();
            
            let query = supabase
                .from('real_time_visit_quality')
                .select('*')
                .lt('quality_score', 30)
                .ilike('empName', mrName ? `%${mrName}%` : '%');
            
            if (dateFilter.type === 'single') {
                query = query.eq('dcrDate', dateFilter.date);
            } else if (dateFilter.type === 'range') {
                query = query
                    .gte('dcrDate', dateFilter.startDate)
                    .lte('dcrDate', dateFilter.endDate);
            }
            
            const { data: alerts, error: alertsError } = await query
                .order('quality_score', { ascending: true });

            if (!alertsError && alerts) {
                setQualityAlerts(alerts);
            } else {
                console.error('Quality alerts error:', alertsError);
                await fetchQualityDataDirect();
            }
        } catch (error) {
            console.error('Error fetching quality alerts:', error);
            await fetchQualityDataDirect();
        }
    };

    const fetchQualityDataDirect = async () => {
        try {
            const dateFilter = getDateFilter();
            
            let query = supabase
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
                .ilike('empName', mrName ? `%${mrName}%` : '%')
                .not('visitTime', 'is', null);
            
            if (dateFilter.type === 'single') {
                query = query.eq('dcrDate', dateFilter.date);
            } else if (dateFilter.type === 'range') {
                query = query
                    .gte('dcrDate', dateFilter.startDate)
                    .lte('dcrDate', dateFilter.endDate);
            }

            const { data, error } = await query;

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
            const dateFilter = getDateFilter();
            
            let query = supabase
                .from('real_time_visit_quality')
                .select(`
                    "empName",
                    quality_score,
                    quality_grade,
                    "amountOfSale"
                `)
                .ilike('empName', mrName ? `%${mrName}%` : '%');
            
            if (dateFilter.type === 'single') {
                query = query.eq('dcrDate', dateFilter.date);
            } else if (dateFilter.type === 'range') {
                query = query
                    .gte('dcrDate', dateFilter.startDate)
                    .lte('dcrDate', dateFilter.endDate);
            }

            const { data: performance, error: perfError } = await query;

            if (!perfError && performance) {
                processPerformanceData(performance);
            } else {
                console.error('Performance data error:', perfError);
                await fetchPerformanceDataDirect();
            }
        } catch (error) {
            console.error('Error fetching performance data:', error);
            await fetchPerformanceDataDirect();
        }
    };

    const fetchPerformanceDataDirect = async () => {
        try {
            const dateFilter = getDateFilter();
            
            let query = supabase
                .from('mr_visits')
                .select(`
                    "empName",
                    "visitTime",
                    "amountOfSale",
                    "sampleValue"
                `)
                .ilike('empName', mrName ? `%${mrName}%` : '%')
                .not('visitTime', 'is', null);
            
            if (dateFilter.type === 'single') {
                query = query.eq('dcrDate', dateFilter.date);
            } else if (dateFilter.type === 'range') {
                query = query
                    .gte('dcrDate', dateFilter.startDate)
                    .lte('dcrDate', dateFilter.endDate);
            }

            const { data, error } = await query;

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
            const dateFilter = getDateFilter();
            
            let query = supabase
                .from('suspicious_visits')
                .select('*')
                .neq('quality_flag', 'NORMAL')
                .ilike('empName', mrName ? `%${mrName}%` : '%');
            
            if (dateFilter.type === 'single') {
                query = query.eq('dcrDate', dateFilter.date);
            } else if (dateFilter.type === 'range') {
                query = query
                    .gte('dcrDate', dateFilter.startDate)
                    .lte('dcrDate', dateFilter.endDate);
            }

            const { data: visits, error: visitsError } = await query
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
            const dateFilter = getDateFilter();
            
            let query = supabase
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
                .ilike('empName', mrName ? `%${mrName}%` : '%')
                .not('visitTime', 'is', null);
            
            if (dateFilter.type === 'single') {
                query = query.eq('dcrDate', dateFilter.date);
            } else if (dateFilter.type === 'range') {
                query = query
                    .gte('dcrDate', dateFilter.startDate)
                    .lte('dcrDate', dateFilter.endDate);
            }

            const { data, error } = await query;

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
                qualityRating: mr.totalScore / mr.totalVisits >= 60 ? 'EXCELLENT' : 
                              mr.totalScore / mr.totalVisits >= 40 ? 'GOOD' :
                              mr.totalScore / mr.totalVisits >= 25 ? 'AVERAGE' : 'POOR'
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
        const message = `Quality Alert Investigation:\n\n` +
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
            `• Requires immediate review`;
        
        if (typeof window !== 'undefined') {
            window.alert(message);
        } else {
            console.log(message);
        }
    };

    const investigateVisit = (visit) => {
        const message = `Visit Investigation Details:\n\n` +
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
            `• Verify with client if needed`;
        
        if (typeof window !== 'undefined') {
            window.alert(message);
        } else {
            console.log(message);
        }
    };

    const getFilteredAlerts = () => {
        let filtered = [...qualityAlerts];
        
        if (selectedFilter === 'critical') filtered = filtered.filter(a => a.quality_score < 20);
        if (selectedFilter === 'poor') filtered = filtered.filter(a => a.quality_score >= 20 && a.quality_score < 30);
        
        if (searchTerm) {
            filtered = filtered.filter(alert => 
                alert.empName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                alert.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                alert.areaName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        return sortData(filtered, alertsSortConfig);
    };

    const getQualityStats = () => {
        const total = qualityAlerts.length;
        const critical = qualityAlerts.filter(a => a.quality_score < 20).length;
        const poor = qualityAlerts.filter(a => a.quality_score >= 20 && a.quality_score < 30).length;
        const avgScore = total > 0 ? qualityAlerts.reduce((sum, a) => sum + a.quality_score, 0) / total : 0;
        
        return { total, critical, poor, avgScore };
    };

    const getQualityGradeColor = (grade) => {
        switch (grade) {
            case 'EXCELLENT': return 'bg-green-50 text-green-700 border-green-200';
            case 'GOOD': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'AVERAGE': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'POOR': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'VERY_POOR': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const getFlagColor = (flag) => {
        switch (flag) {
            case 'FAKE_VISIT': return 'bg-red-50 text-red-700 border-red-200';
            case 'SUSPICIOUS_SHORT': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'SUSPICIOUS_LONG': return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'ZERO_OUTCOME': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const formatDuration = (timeStr) => {
        if (!timeStr) return '0m';
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Visit Quality Data</h2>
                    <p className="text-gray-600">
                        {mrName ? `Analyzing visit patterns for ${mrName}` : 'Analyzing visit patterns across all MRs'}
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md border border-gray-200">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Quality Data Error</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                        onClick={fetchQualityData}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                    >
                        Retry Loading
                    </button>
                </div>
            </div>
        );
    }

    const stats = getQualityStats();
    const filteredAlerts = getFilteredAlerts();
    const sortedPerformance = sortData(mrPerformance, performanceSortConfig);
    const sortedSuspicious = sortData(suspiciousVisits, suspiciousSortConfig);

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <Target className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Visit Quality Analysis</h1>
                                <p className="text-gray-600">
                                    {mrName ? `Quality monitoring for ${mrName}` : 'System-wide quality monitoring'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4 mt-3">
                            <div className="flex items-center space-x-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                                <span>Live Quality Monitoring</span>
                            </div>
                            <div className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                <Calendar className="h-4 w-4" />
                                <span>{getDateRangeDisplay()}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                        <select 
                            value={dateRange} 
                            onChange={(e) => setDateRange(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white"
                        >
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="week">This Week</option>
                        </select>
                        <button
                            onClick={fetchQualityData}
                            disabled={loading}
                            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quality Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-purple-100 text-sm font-medium uppercase tracking-wide">Total Alerts</div>
                            <div className="text-3xl font-bold mt-2">{stats.total}</div>
                            <div className="text-purple-100 text-sm mt-1">Quality issues</div>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-purple-200" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-red-100 text-sm font-medium uppercase tracking-wide">Critical Issues</div>
                            <div className="text-3xl font-bold mt-2">{stats.critical}</div>
                            <div className="text-red-100 text-sm mt-1">Score &lt; 20</div>
                        </div>
                        
                        <AlertCircle className="h-8 w-8 text-red-200" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-orange-100 text-sm font-medium uppercase tracking-wide">Poor Quality</div>
                            <div className="text-3xl font-bold mt-2">{stats.poor}</div>
                            <div className="text-orange-100 text-sm mt-1">Score 20-30</div>
                        </div>
                        <TrendingDown className="h-8 w-8 text-orange-200" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-blue-100 text-sm font-medium uppercase tracking-wide">Avg Quality</div>
                            <div className="text-3xl font-bold mt-2">{stats.avgScore.toFixed(1)}</div>
                            <div className="text-blue-100 text-sm mt-1">Overall score</div>
                        </div>
                        <BarChart3 className="h-8 w-8 text-blue-200" />
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">Filter:</span>
                        <button
                            onClick={() => setSelectedFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selectedFilter === 'all' 
                                    ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            All ({qualityAlerts.length})
                        </button>
                        <button
                            onClick={() => setSelectedFilter('critical')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selectedFilter === 'critical' 
                                    ? 'bg-red-100 text-red-700 border border-red-200' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Critical ({stats.critical})
                        </button>
                        <button
                            onClick={() => setSelectedFilter('poor')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selectedFilter === 'poor' 
                                    ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Poor ({stats.poor})
                        </button>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search MR, client, or area..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm w-64"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quality Alerts Table - FIXED VERSION */}
<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
        <h2 className="text-xl font-bold flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            Quality Alerts {getDateRangeLabel()} ({filteredAlerts.length})
        </h2>
        <p className="text-purple-100 mt-2">
            Visits requiring immediate attention and quality review
        </p>
    </div>
    
    {/* FIXED: Proper scrolling container */}
    <div className="relative">
        <div 
            className="overflow-x-auto overflow-y-auto"
            style={{ maxHeight: '600px' }}
        >
            {filteredAlerts.length === 0 ? (
                <div className="text-center py-12 px-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {searchTerm ? 'No matching alerts found' : 'No quality alerts found!'}
                    </h3>
                    <p className="text-gray-600">
                        {searchTerm 
                            ? `No alerts match "${searchTerm}" for the selected filter.`
                            : mrName 
                                ? `${mrName} meets quality standards for ${getDateRangeLabel().toLowerCase()}.`
                                : `All visits meet quality standards for ${getDateRangeLabel().toLowerCase()}.`
                        }
                    </p>
                </div>
            ) : (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                                onClick={() => handleSort('empName', alertsSortConfig, setAlertsSortConfig)}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>MR & Client</span>
                                    <SortIcon sortKey="empName" currentSort={alertsSortConfig} />
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                                onClick={() => handleSort('visitTime', alertsSortConfig, setAlertsSortConfig)}
                            >
                                <div className="flex items-center justify-center space-x-1">
                                    <span>Duration</span>
                                    <SortIcon sortKey="visitTime" currentSort={alertsSortConfig} />
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                                onClick={() => handleSort('amountOfSale', alertsSortConfig, setAlertsSortConfig)}
                            >
                                <div className="flex items-center justify-center space-x-1">
                                    <span>Sales</span>
                                    <SortIcon sortKey="amountOfSale" currentSort={alertsSortConfig} />
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                                onClick={() => handleSort('quality_score', alertsSortConfig, setAlertsSortConfig)}
                            >
                                <div className="flex items-center justify-center space-x-1">
                                    <span>Quality Score</span>
                                    <SortIcon sortKey="quality_score" currentSort={alertsSortConfig} />
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                                onClick={() => handleSort('quality_grade', alertsSortConfig, setAlertsSortConfig)}
                            >
                                <div className="flex items-center justify-center space-x-1">
                                    <span>Grade</span>
                                    <SortIcon sortKey="quality_grade" currentSort={alertsSortConfig} />
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                                onClick={() => handleSort('areaName', alertsSortConfig, setAlertsSortConfig)}
                            >
                                <div className="flex items-center justify-center space-x-1">
                                    <span>Location</span>
                                    <SortIcon sortKey="areaName" currentSort={alertsSortConfig} />
                                </div>
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAlerts.map((alert, index) => (
                            <tr 
                                key={index} 
                                className={`hover:bg-gray-50 transition-colors ${
                                    alert.quality_score < 20 ? 'bg-red-25' : 'bg-orange-25'
                                }`}
                            >
                                {/* Table rows remain the same */}
                                <td className="px-6 py-4">
                                    <div className="space-y-1">
                                        <div className="font-semibold text-gray-900">{alert.empName}</div>
                                        <div className="text-sm text-gray-600">{alert.clientName}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center space-x-1">
                                        <Clock className="h-4 w-4 text-gray-400" />
                                        <span className="font-medium">{formatDuration(alert.visitTime)}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                                        (alert.amountOfSale || 0) > 0 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        ₹{(alert.amountOfSale || 0).toLocaleString()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                                            alert.quality_score >= 60 ? 'bg-green-100 text-green-700' :
                                            alert.quality_score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                                            alert.quality_score >= 20 ? 'bg-orange-100 text-orange-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {Math.round(alert.quality_score || 0)}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getQualityGradeColor(alert.quality_grade)}`}>
                                        {alert.quality_grade}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center space-x-1">
                                        <MapPin className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm text-gray-600">{alert.areaName}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => investigateQualityAlert(alert)}
                                        className="flex items-center space-x-1 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                    >
                                        <Eye className="h-4 w-4" />
                                        <span>Investigate</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </div>
</div>
        {/* MR Performance Table - FIXED VERSION */}
<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
        <h2 className="text-xl font-bold flex items-center gap-3">
            <Award className="h-6 w-6" />
            MR Quality Performance {getDateRangeLabel()}
        </h2>
        <p className="text-green-100 mt-2">
            {dateRange === 'week' 
                ? 'Weekly quality rankings and performance metrics'
                : dateRange === 'yesterday'
                ? 'Previous day quality rankings and performance metrics'
                : 'Daily quality rankings and performance metrics'
            }
        </p>
    </div>
    
    {/* FIXED: Proper scrolling container */}
    <div className="relative">
        <div 
            className="overflow-x-auto overflow-y-auto"
            style={{ maxHeight: '500px' }}
        >
            {sortedPerformance.length === 0 ? (
                <div className="text-center py-12 px-6">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No performance data available</h3>
                    <p className="text-gray-600">
                        {mrName 
                            ? `No visits found for ${mrName} ${dateRange === 'today' ? 'today' : dateRange === 'yesterday' ? 'yesterday' : 'this week'}.`
                            : `No visits recorded ${dateRange === 'today' ? 'for today' : dateRange === 'yesterday' ? 'for yesterday' : 'for this week'}.`
                        }
                    </p>
                </div>
            ) : (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Rank</th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                                onClick={() => handleSort('name', performanceSortConfig, setPerformanceSortConfig)}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>MR Name</span>
                                    <SortIcon sortKey="name" currentSort={performanceSortConfig} />
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                                onClick={() => handleSort('totalVisits', performanceSortConfig, setPerformanceSortConfig)}
                            >
                                <div className="flex items-center justify-center space-x-1">
                                    <span>Visits</span>
                                    <SortIcon sortKey="totalVisits" currentSort={performanceSortConfig} />
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                                onClick={() => handleSort('avgQualityScore', performanceSortConfig, setPerformanceSortConfig)}
                            >
                                <div className="flex items-center justify-center space-x-1">
                                    <span>Avg Quality</span>
                                    <SortIcon sortKey="avgQualityScore" currentSort={performanceSortConfig} />
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                                onClick={() => handleSort('totalSales', performanceSortConfig, setPerformanceSortConfig)}
                            >
                                <div className="flex items-center justify-center space-x-1">
                                    <span>Total Sales</span>
                                    <SortIcon sortKey="totalSales" currentSort={performanceSortConfig} />
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                                onClick={() => handleSort('avgSalesPerVisit', performanceSortConfig, setPerformanceSortConfig)}
                            >
                                <div className="flex items-center justify-center space-x-1">
                                    <span>Sales/Visit</span>
                                    <SortIcon sortKey="avgSalesPerVisit" currentSort={performanceSortConfig} />
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                                onClick={() => handleSort('qualityRating', performanceSortConfig, setPerformanceSortConfig)}
                            >
                                <div className="flex items-center justify-center space-x-1">
                                    <span>Rating</span>
                                    <SortIcon sortKey="qualityRating" currentSort={performanceSortConfig} />
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                                onClick={() => handleSort('poorVisits', performanceSortConfig, setPerformanceSortConfig)}
                            >
                                <div className="flex items-center justify-center space-x-1">
                                    <span>Poor Visits</span>
                                    <SortIcon sortKey="poorVisits" currentSort={performanceSortConfig} />
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* Performance table rows remain the same */}
                        {sortedPerformance.map((mr, index) => (
                            <tr key={index} className={`${
                                index < 3 ? 'bg-gradient-to-r from-green-50 to-emerald-50' : 
                                mr.qualityRating === 'POOR' ? 'bg-red-50' : 'bg-white'
                            } hover:bg-gray-50 transition-colors`}>
                                {/* All existing table cells remain the same */}
                                <td className="px-6 py-4 text-center">
                                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                        index === 1 ? 'bg-gray-300 text-gray-800' :
                                        index === 2 ? 'bg-orange-400 text-orange-900' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {index + 1}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-semibold text-gray-900">{mr.name}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800 font-medium">
                                        {mr.totalVisits}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                            mr.avgQualityScore >= 60 ? 'bg-green-100 text-green-700' :
                                            mr.avgQualityScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
                                            mr.avgQualityScore >= 25 ? 'bg-orange-100 text-orange-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {mr.avgQualityScore.toFixed(0)}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center space-x-1">
                                        <DollarSign className="h-4 w-4 text-gray-400" />
                                        <span className="font-semibold">₹{mr.totalSales.toLocaleString()}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="font-medium">₹{mr.avgSalesPerVisit.toFixed(0)}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getQualityGradeColor(mr.qualityRating)}`}>
                                        {mr.qualityRating}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                                        mr.poorVisits === 0 ? 'bg-green-100 text-green-800' : 
                                        mr.poorVisits <= 2 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                        {mr.poorVisits}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </div>
</div>
           {/* Suspicious Visits - FIXED VERSION */}
<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6">
        <h2 className="text-xl font-bold flex items-center gap-3">
            <AlertCircle className="h-6 w-6" />
            Suspicious Visits {getDateRangeLabel()} ({sortedSuspicious.length})
        </h2>
        <p className="text-orange-100 mt-2">
            Visits flagged for unusual patterns or timing issues
            {dateRange === 'week' && ' during this week'}
            {dateRange === 'yesterday' && ' from yesterday'}
            {mrName && ` for ${mrName}`}
        </p>
    </div>
    
    <div className="p-6">
        {sortedSuspicious.length === 0 ? (
            <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No suspicious visits detected!</h3>
                <p className="text-gray-600">
                    {mrName 
                        ? `${mrName}'s visits appear normal and follow expected patterns ${
                            dateRange === 'today' ? 'today' : 
                            dateRange === 'yesterday' ? 'yesterday' : 
                            'this week'
                          }.`
                        : `All visits appear normal and follow expected patterns ${
                            dateRange === 'today' ? 'today' : 
                            dateRange === 'yesterday' ? 'yesterday' : 
                            'this week'
                          }.`
                    }
                </p>
            </div>
        ) : (
            <>
                {/* Sort Controls */}
                <div className="mb-4 bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">Sort by:</span>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => handleSort('empName', suspiciousSortConfig, setSuspiciousSortConfig)}
                                className="px-3 py-1 bg-white rounded-lg border hover:bg-gray-50 flex items-center space-x-1"
                            >
                                <span>MR</span>
                                <SortIcon sortKey="empName" currentSort={suspiciousSortConfig} />
                            </button>
                            <button
                                onClick={() => handleSort('visit_seconds', suspiciousSortConfig, setSuspiciousSortConfig)}
                                className="px-3 py-1 bg-white rounded-lg border hover:bg-gray-50 flex items-center space-x-1"
                            >
                                <span>Duration</span>
                                <SortIcon sortKey="visit_seconds" currentSort={suspiciousSortConfig} />
                            </button>
                            <button
                                onClick={() => handleSort('amountOfSale', suspiciousSortConfig, setSuspiciousSortConfig)}
                                className="px-3 py-1 bg-white rounded-lg border hover:bg-gray-50 flex items-center space-x-1"
                            >
                                <span>Sales</span>
                                <SortIcon sortKey="amountOfSale" currentSort={suspiciousSortConfig} />
                            </button>
                            <button
                                onClick={() => handleSort('quality_flag', suspiciousSortConfig, setSuspiciousSortConfig)}
                                className="px-3 py-1 bg-white rounded-lg border hover:bg-gray-50 flex items-center space-x-1"
                            >
                                <span>Flag</span>
                                <SortIcon sortKey="quality_flag" currentSort={suspiciousSortConfig} />
                            </button>
                        </div>
                    </div>
                </div>
                
                  {/* FIXED: Scrollable container */}
                <div 
                    className="overflow-y-auto"
                    style={{ maxHeight: '400px' }}
                >
                    <div className="grid gap-4">
                        {sortedSuspicious.map((visit, index) => (
                            <div 
                                key={index} 
                                className={`border-l-4 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all ${
                                    visit.quality_flag === 'FAKE_VISIT' ? 'border-red-500 bg-red-50 hover:bg-red-100' :
                                    visit.quality_flag === 'SUSPICIOUS_SHORT' ? 'border-orange-500 bg-orange-50 hover:bg-orange-100' :
                                    visit.quality_flag === 'SUSPICIOUS_LONG' ? 'border-purple-500 bg-purple-50 hover:bg-purple-100' :
                                    'border-yellow-500 bg-yellow-50 hover:bg-yellow-100'
                                }`} 
                                onClick={() => investigateVisit(visit)}
                            >
                                {/* Visit card content remains the same */}
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4 mb-3">
                                            <div className={`w-3 h-3 rounded-full ${
                                                visit.quality_flag === 'FAKE_VISIT' ? 'bg-red-500' :
                                                visit.quality_flag === 'SUSPICIOUS_SHORT' ? 'bg-orange-500' :
                                                visit.quality_flag === 'SUSPICIOUS_LONG' ? 'bg-purple-500' :
                                                'bg-yellow-500'
                                            }`}></div>
                                            <span className="font-bold text-gray-900">{visit.empName || 'Unknown MR'}</span>
                                            <span className="text-gray-400">→</span>
                                            <span className="text-gray-700 font-medium">{visit.clientName || 'Unknown Client'}</span>
                                        </div>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-gray-500" />
                                                <span className="text-gray-600">{visit.areaName || 'Unknown Location'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-gray-500" />
                                                <span className={`font-semibold ${
                                                    visit.quality_flag === 'FAKE_VISIT' || visit.quality_flag === 'SUSPICIOUS_SHORT' 
                                                        ? 'text-red-600' : 'text-purple-600'
                                                }`}>{formatDuration(visit.visitTime) || '0m'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-4 w-4 text-gray-500" />
                                                <span className={`font-bold ${(visit.amountOfSale || 0) === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    ₹{(visit.amountOfSale || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4 text-gray-500" />
                                                <span className="text-gray-600 font-medium">{visit.quality_flag.replace('_', ' ')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 ml-4">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${getFlagColor(visit.quality_flag)}`}>
                                            {visit.quality_flag.replace('_', ' ')}
                                        </span>
                                        <button className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                                            <Eye className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </>
        )}
    </div>
</div>
                
                
            {/* Quality Insights Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    Quality Insights Summary
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                        <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Immediate Action Required
                        </h4>
                        <p className="text-sm text-red-700 mb-3">
                            {stats.critical} visits with critical quality scores need immediate intervention
                            {dateRange === 'week' && ' from this week'}
                            {dateRange === 'yesterday' && ' from yesterday'}
                        </p>
                        <ul className="text-xs text-red-600 space-y-1">
                            <li>• Contact MRs for explanation</li>
                            <li>• Review visit documentation</li>
                            <li>• Verify with customers if needed</li>
                        </ul>
                    </div>
                    
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                        <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Performance Review
                        </h4>
                        <p className="text-sm text-orange-700 mb-3">
                            {stats.poor} visits showing poor quality but some activity detected
                            {dateRange === 'week' && ' this week'}
                            {dateRange === 'yesterday' && ' yesterday'}
                        </p>
                        <ul className="text-xs text-orange-600 space-y-1">
                            <li>• Analyze visit patterns</li>
                            <li>• Provide additional training</li>
                            <li>• Optimize visit duration</li>
                        </ul>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                        <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Quality Optimization
                        </h4>
                        <p className="text-sm text-blue-700 mb-3">
                            {sortedSuspicious.length} visits flagged for pattern analysis and improvement
                            {dateRange === 'week' && ' during this week'}
                            {dateRange === 'yesterday' && ' from yesterday'}
                        </p>
                        <ul className="text-xs text-blue-600 space-y-1">
                            <li>• Monitor visit timing patterns</li>
                            <li>• Focus on outcome improvement</li>
                            <li>• Implement quality benchmarks</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisitQualityMonitor;
