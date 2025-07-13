import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Users, 
  DollarSign, 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw,
  Award,
  Activity,
  Zap,
  MapPin,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown
} from 'lucide-react';

const NBDPerformanceDashboard = ({ mrName, dateRange: propDateRange, performanceFilter: propPerformanceFilter }) => {
    const [nbdData, setNbdData] = useState([]);
    const [allMRs, setAllMRs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterLoading, setFilterLoading] = useState(false); // New state for filter operations
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isRetrying, setIsRetrying] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState(propPerformanceFilter || 'all');
    const [sortBy, setSortBy] = useState('nbd_conversion_rate');
    const [sortOrder, setSortOrder] = useState('desc'); // New state for sort order
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

    // Use props or defaults
    const dateRange = propDateRange || 30;

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;
    const REQUEST_TIMEOUT = 10000;

    useEffect(() => {
        fetchNBDPerformance();
        
        // Auto-refresh every 30 minutes
        const interval = setInterval(fetchNBDPerformance, 1800000);
        return () => clearInterval(interval);
    }, [mrName, dateRange]);

    // Separate effect for filter changes (no full reload)
    useEffect(() => {
        if (nbdData.length > 0) {
            setFilterLoading(true);
            // Simulate processing time for smooth UX
            setTimeout(() => {
                setFilterLoading(false);
            }, 300);
        }
    }, [selectedFilter, sortBy, sortOrder]);

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
                    }, RETRY_DELAY * attempt);
                    return;
                } else {
                    throw new Error('No NBD performance data available after multiple attempts');
                }
            }

            console.log(`✅ NBD data loaded successfully: ${data.length} records`);
            setNbdData(data);
            
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
                }, RETRY_DELAY * attempt);
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

    // Enhanced sorting function
    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    // Get sort icon for table headers
    const getSortIcon = (field) => {
        if (sortBy !== field) {
            return <ChevronsUpDown className="h-4 w-4 text-gray-400" />;
        }
        return sortOrder === 'asc' ? 
            <ChevronUp className="h-4 w-4 text-blue-600" /> : 
            <ChevronDown className="h-4 w-4 text-blue-600" />;
    };

    const getFilteredData = () => {
        let filtered = [...nbdData];
        
        if (selectedFilter === 'good') {
            filtered = filtered.filter(item => item.performance_flag === 'GOOD_PERFORMANCE');
        } else if (selectedFilter === 'insufficient') {
            filtered = filtered.filter(item => item.performance_flag === 'INSUFFICIENT_NBD_FOCUS');
        } else if (selectedFilter === 'poor') {
            filtered = filtered.filter(item => item.performance_flag === 'POOR_NBD_CONVERSION');
        }

        // Enhanced sorting with proper order handling
        const getSortValue = (item, field) => {
            const value = item[field];
            return value === null || value === undefined ? (sortOrder === 'asc' ? Infinity : -Infinity) : value;
        };

        filtered.sort((a, b) => {
            const aValue = getSortValue(a, sortBy);
            const bValue = getSortValue(b, sortBy);
            
            if (sortOrder === 'asc') {
                return aValue - bValue;
            } else {
                return bValue - aValue;
            }
        });

        return filtered;
    };

    const getPerformanceColor = (flag) => {
        switch (flag) {
            case 'GOOD_PERFORMANCE':
                return 'bg-green-50 text-green-700 border-green-200';
            case 'INSUFFICIENT_NBD_FOCUS':
                return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'POOR_NBD_CONVERSION':
                return 'bg-red-50 text-red-700 border-red-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const getPerformanceIcon = (flag) => {
        switch (flag) {
            case 'GOOD_PERFORMANCE':
                return <Award className="h-4 w-4 text-green-600" />;
            case 'INSUFFICIENT_NBD_FOCUS':
                return <AlertTriangle className="h-4 w-4 text-orange-600" />;
            case 'POOR_NBD_CONVERSION':
                return <TrendingDown className="h-4 w-4 text-red-600" />;
            default:
                return <Activity className="h-4 w-4 text-gray-600" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="relative mx-auto">
                        <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                        <div className="w-16 h-16 border-4 border-blue-600 rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {isRetrying ? `Retrying NBD Data (${retryCount}/${MAX_RETRIES})` : 'Loading NBD Performance'}
                        </h3>
                        <p className="text-gray-600">
                            {isRetrying ? 'Connection issues detected, retrying automatically...' : 'Analyzing new business development metrics'}
                        </p>
                        {isRetrying && (
                            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-md mx-auto">
                                <p className="text-yellow-800 text-sm">
                                    🔄 Automatic retry in progress... Please wait.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md border border-gray-200">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">NBD Data Connection Error</h2>
                    <p className="text-gray-600 mb-4 text-sm leading-relaxed">{error}</p>
                    <div className="space-y-3">
                        <button 
                            onClick={manualRetry}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            <span>Retry Now</span>
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
                {/* Header Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                        <div>
                            <div className="flex items-center space-x-3 mb-2">
                                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                                    <TrendingUp className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">NBD Performance Analytics</h1>
                                    <p className="text-gray-600">
                                        New Business Development tracking and conversion metrics
                                        {mrName && <span className="font-medium"> for {mrName}</span>}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3 mt-4">
                                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    Live NBD Tracking
                                </div>
                                <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                    <BarChart3 className="h-3 w-3" />
                                    Analytics View
                                </div>
                                <div className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                                    <Calendar className="h-3 w-3" />
                                    Last {dateRange} days
                                </div>
                                <div className="flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                                    <Target className="h-3 w-3" />
                                    {selectedFilter === 'all' ? 'All Performance' : 
                                     selectedFilter === 'good' ? 'Good Performers' :
                                     selectedFilter === 'insufficient' ? 'Insufficient Focus' : 'Poor Conversion'}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={manualRetry}
                                disabled={loading}
                                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                <span>Refresh</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <Users className="h-6 w-6" />
                            </div>
                            <ArrowUpRight className="h-5 w-5 opacity-80" />
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold">{stats.totalMRs}</div>
                            <div className="text-green-100 text-sm font-medium">Total Areas</div>
                            <div className="text-green-200 text-xs">Active territories</div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <Award className="h-6 w-6" />
                            </div>
                            <TrendingUp className="h-5 w-5 opacity-80" />
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold">{stats.goodPerformers}</div>
                            <div className="text-blue-100 text-sm font-medium">Good Performers</div>
                            <div className="text-blue-200 text-xs">Meeting targets</div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <Target className="h-6 w-6" />
                            </div>
                            <Activity className="h-5 w-5 opacity-80" />
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold">{stats.totalNBDVisits.toLocaleString()}</div>
                            <div className="text-purple-100 text-sm font-medium">NBD Visits</div>
                            <div className="text-purple-200 text-xs">Total visits</div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <DollarSign className="h-6 w-6" />
                            </div>
                            <Zap className="h-5 w-5 opacity-80" />
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold">₹{(stats.totalNBDRevenue / 100000).toFixed(1)}L</div>
                            <div className="text-orange-100 text-sm font-medium">NBD Revenue</div>
                            <div className="text-orange-200 text-xs">Generated</div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <BarChart3 className="h-6 w-6" />
                            </div>
                            <TrendingUp className="h-5 w-5 opacity-80" />
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold">{stats.avgNBDConversion.toFixed(1)}%</div>
                            <div className="text-teal-100 text-sm font-medium">Avg Conversion</div>
                            <div className="text-teal-200 text-xs">NBD Rate</div>
                        </div>
                    </div>
                </div>

                {/* Alerts Section */}
                {alerts.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-3">
                                        <AlertTriangle className="h-6 w-6" />
                                        NBD Performance Alerts ({alerts.length})
                                    </h2>
                                    <p className="text-red-100 mt-2">MRs not meeting NBD targets or showing poor conversion rates</p>
                                </div>
                                <div className="flex gap-3 text-sm">
                                    <div className="bg-red-500 bg-opacity-30 px-3 py-1 rounded-full border border-red-400">
                                        <span className="font-semibold">{alerts.filter(a => a.nbd_visit_percentage < 40).length}</span> insufficient focus
                                    </div>
                                    <div className="bg-red-500 bg-opacity-30 px-3 py-1 rounded-full border border-red-400">
                                        <span className="font-semibold">{alerts.filter(a => a.nbd_conversion_rate < 15).length}</span> poor conversion
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid gap-4 max-h-96 overflow-y-auto">
                                {alerts.map((alert, index) => (
                                    <div key={index} className={`border-l-4 rounded-lg p-4 ${
                                        alert.performance_flag === 'INSUFFICIENT_NBD_FOCUS' ? 'border-orange-500 bg-orange-50' :
                                        alert.performance_flag === 'POOR_NBD_CONVERSION' ? 'border-red-500 bg-red-50' :
                                        'border-yellow-500 bg-yellow-50'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-4 mb-3">
                                                    <span className="font-bold text-gray-900">{alert.mr_name}</span>
                                                    <ArrowUpRight className="h-4 w-4 text-gray-400" />
                                                    <span className="text-gray-700 font-semibold flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {alert.territory}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <BarChart3 className="h-4 w-4 text-gray-500" />
                                                        <span className="text-gray-600">{alert.total_visits} total visits</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Target className="h-4 w-4 text-gray-500" />
                                                        <span className={`font-semibold ${alert.nbd_visit_percentage < 40 ? 'text-red-600' : 'text-green-600'}`}>
                                                            {alert.nbd_visit_percentage?.toFixed(1)}% NBD
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp className="h-4 w-4 text-gray-500" />
                                                        <span className={`font-semibold ${alert.nbd_conversion_rate < 15 ? 'text-red-600' : 'text-green-600'}`}>
                                                            {alert.nbd_conversion_rate?.toFixed(1)}% Conv.
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <DollarSign className="h-4 w-4 text-gray-500" />
                                                        <span className="text-gray-600">₹{alert.nbd_revenue?.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getPerformanceIcon(alert.performance_flag)}
                                                <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${getPerformanceColor(alert.performance_flag)}`}>
                                                    {alert.performance_flag === 'INSUFFICIENT_NBD_FOCUS' ? 'LOW FOCUS' :
                                                     alert.performance_flag === 'POOR_NBD_CONVERSION' ? 'POOR CONV.' : 'REVIEW'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Controls & Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Performance Analysis & Controls
                        </h2>
                        
                        <div className="flex flex-wrap items-center gap-3">
                            {/* View Mode Toggle */}
                            <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('cards')}
                                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                        viewMode === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                                    }`}
                                >
                                    Cards
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                        viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                                    }`}
                                >
                                    Table
                                </button>
                            </div>

                            {/* Performance Filter */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700">Filter:</label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { key: 'all', label: `All (${nbdData.length})`, color: 'gray' },
                                        { key: 'good', label: `Good (${stats.goodPerformers})`, color: 'green' },
                                        { key: 'insufficient', label: `Low Focus (${nbdData.filter(item => item.performance_flag === 'INSUFFICIENT_NBD_FOCUS').length})`, color: 'orange' },
                                        { key: 'poor', label: `Poor Conv. (${nbdData.filter(item => item.performance_flag === 'POOR_NBD_CONVERSION').length})`, color: 'red' }
                                    ].map(filter => (
                                        <button
                                            key={filter.key}
                                            onClick={() => setSelectedFilter(filter.key)}
                                            disabled={filterLoading}
                                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                                                selectedFilter === filter.key 
                                                    ? `bg-${filter.color}-100 text-${filter.color}-700 border border-${filter.color}-200` 
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Performance Data Display with Filter Loading */}
                <div className="relative">
                    {filterLoading && (
                        <div className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center rounded-xl">
                            <div className="flex items-center space-x-3">
                                <div className="relative">
                                    <div className="w-8 h-8 border-2 border-blue-200 rounded-full"></div>
                                    <div className="w-8 h-8 border-2 border-blue-600 rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
                                </div>
                                <span className="text-gray-600 font-medium">Filtering data...</span>
                            </div>
                        </div>
                    )}

                    {viewMode === 'cards' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredData.length === 0 ? (
                                <div className="col-span-full text-center py-12">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <BarChart3 className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Found</h3>
                                    <p className="text-gray-600">No NBD performance data available for the selected filters.</p>
                                </div>
                            ) : (
                                filteredData.map((item, index) => (
                                    <div key={index} className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${
                                        item.performance_flag === 'GOOD_PERFORMANCE' ? 'ring-1 ring-green-200' : 
                                        item.performance_flag === 'INSUFFICIENT_NBD_FOCUS' ? 'ring-1 ring-orange-200' : 
                                        'ring-1 ring-red-200'
                                    }`}>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 truncate">{item.mr_name}</h3>
                                                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {item.territory}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getPerformanceIcon(item.performance_flag)}
                                                <span className={`px-2 py-1 text-xs font-medium rounded-md border ${getPerformanceColor(item.performance_flag)}`}>
                                                    {item.performance_flag === 'GOOD_PERFORMANCE' ? 'GOOD' :
                                                     item.performance_flag === 'INSUFFICIENT_NBD_FOCUS' ? 'LOW FOCUS' : 'POOR CONV.'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Key Metrics */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <BarChart3 className="h-4 w-4 text-blue-600" />
                                                        <span className="text-xs font-medium text-blue-600">Total Visits</span>
                                                    </div>
                                                    <div className="text-lg font-bold text-blue-900">{item.total_visits}</div>
                                                </div>
                                                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Target className="h-4 w-4 text-purple-600" />
                                                        <span className="text-xs font-medium text-purple-600">NBD Visits</span>
                                                    </div>
                                                    <div className="text-lg font-bold text-purple-900">{item.nbd_visits}</div>
                                                </div>
                                            </div>

                                            {/* Performance Indicators */}
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium text-gray-700">NBD Focus</span>
                                                        <span className={`text-sm font-bold ${item.nbd_visit_percentage < 40 ? 'text-red-600' : 'text-green-600'}`}>
                                                            {item.nbd_visit_percentage?.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div 
                                                            className={`h-2 rounded-full transition-all ${item.nbd_visit_percentage < 40 ? 'bg-red-500' : 'bg-green-500'}`}
                                                            style={{ width: `${Math.min(item.nbd_visit_percentage || 0, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium text-gray-700">Conversion Rate</span>
                                                        <span className={`text-sm font-bold ${item.nbd_conversion_rate < 15 ? 'text-red-600' : 'text-green-600'}`}>
                                                            {item.nbd_conversion_rate?.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div 
                                                            className={`h-2 rounded-full transition-all ${item.nbd_conversion_rate < 15 ? 'bg-red-500' : 'bg-green-500'}`}
                                                            style={{ width: `${Math.min(item.nbd_conversion_rate || 0, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Revenue & Conversions */}
                                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                                                <div>
                                                    <div className="text-xs text-gray-500 mb-1">NBD Revenue</div>
                                                    <div className="font-semibold text-gray-900">₹{item.nbd_revenue?.toLocaleString()}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500 mb-1">Conversions</div>
                                                    <div className="font-semibold text-gray-900">{item.nbd_conversions}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        /* Enhanced Table View with Sortable Headers */
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
                                <h2 className="text-xl font-bold flex items-center gap-3">
                                    <BarChart3 className="h-6 w-6" />
                                    Detailed NBD Performance ({filteredData.length})
                                </h2>
                                <p className="text-blue-100 mt-2">Complete performance breakdown by MR and territory • Click headers to sort</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <button
                                                    onClick={() => handleSort('mr_name')}
                                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                                >
                                                    <span>MR Name</span>
                                                    {getSortIcon('mr_name')}
                                                </button>
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <button
                                                    onClick={() => handleSort('territory')}
                                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                                >
                                                    <span>Territory</span>
                                                    {getSortIcon('territory')}
                                                </button>
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <button
                                                    onClick={() => handleSort('total_visits')}
                                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors mx-auto"
                                                >
                                                    <span>Total Visits</span>
                                                    {getSortIcon('total_visits')}
                                                </button>
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <button
                                                    onClick={() => handleSort('nbd_visits')}
                                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors mx-auto"
                                                >
                                                    <span>NBD Visits</span>
                                                    {getSortIcon('nbd_visits')}
                                                </button>
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <button
                                                    onClick={() => handleSort('nbd_visit_percentage')}
                                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors mx-auto"
                                                >
                                                    <span>NBD %</span>
                                                    {getSortIcon('nbd_visit_percentage')}
                                                </button>
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <button
                                                    onClick={() => handleSort('nbd_conversions')}
                                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors mx-auto"
                                                >
                                                    <span>NBD Conversions</span>
                                                    {getSortIcon('nbd_conversions')}
                                                </button>
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <button
                                                    onClick={() => handleSort('nbd_conversion_rate')}
                                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors mx-auto"
                                                >
                                                    <span>Conv. Rate</span>
                                                    {getSortIcon('nbd_conversion_rate')}
                                                </button>
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <button
                                                    onClick={() => handleSort('nbd_revenue')}
                                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors mx-auto"
                                                >
                                                    <span>NBD Revenue</span>
                                                    {getSortIcon('nbd_revenue')}
                                                </button>
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <button
                                                    onClick={() => handleSort('performance_flag')}
                                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors mx-auto"
                                                >
                                                    <span>Status</span>
                                                    {getSortIcon('performance_flag')}
                                                </button>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredData.length === 0 ? (
                                            <tr>
                                                <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                                                    <div className="space-y-3">
                                                        <BarChart3 className="h-12 w-12 text-gray-300 mx-auto" />
                                                        <div>
                                                            <h3 className="text-lg font-medium text-gray-900 mb-1">No Data Available</h3>
                                                            <p>No NBD performance data available for the selected filters.</p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredData.map((item, index) => (
                                                <tr key={index} className={`hover:bg-gray-50 transition-colors ${
                                                    item.performance_flag === 'GOOD_PERFORMANCE' ? 'bg-green-50' : 
                                                    item.performance_flag === 'INSUFFICIENT_NBD_FOCUS' ? 'bg-orange-50' : 'bg-red-50'
                                                }`}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center">
                                                            <div className={`w-3 h-3 rounded-full mr-3 ${
                                                                item.performance_flag === 'GOOD_PERFORMANCE' ? 'bg-green-500' : 
                                                                item.performance_flag === 'INSUFFICIENT_NBD_FOCUS' ? 'bg-orange-500' : 'bg-red-500'
                                                            }`}></div>
                                                            <div>
                                                                <div className="font-semibold text-gray-900">{item.mr_name}</div>
                                                                <div className="text-sm text-gray-500">ID: {item.mr_name?.substring(0, 6) || 'N/A'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1">
                                                            <MapPin className="h-4 w-4 text-gray-400" />
                                                            <span className="text-gray-900 font-medium">{item.territory}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                                            {item.total_visits}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                                            {item.nbd_visits}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center">
                                                            <span className={`font-bold text-lg ${item.nbd_visit_percentage < 40 ? 'text-red-600' : 'text-green-600'}`}>
                                                                {item.nbd_visit_percentage?.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                                            {item.nbd_conversions}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center">
                                                            <span className={`font-bold text-lg ${item.nbd_conversion_rate < 15 ? 'text-red-600' : 'text-green-600'}`}>
                                                                {item.nbd_conversion_rate?.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="font-semibold text-gray-900">
                                                            ₹{item.nbd_revenue?.toLocaleString()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {getPerformanceIcon(item.performance_flag)}
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPerformanceColor(item.performance_flag)}`}>
                                                                {item.performance_flag === 'GOOD_PERFORMANCE' ? 'GOOD' :
                                                                 item.performance_flag === 'INSUFFICIENT_NBD_FOCUS' ? 'LOW FOCUS' :
                                                                 'POOR CONV.'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Summary Insights */}
                {filteredData.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Performance Insights */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                Performance Insights
                            </h3>
                            <div className="space-y-4">
                                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                    <h4 className="font-semibold text-green-800 mb-2">Top Performers</h4>
                                    <p className="text-sm text-green-700 mb-3">
                                        {stats.goodPerformers} territories meeting NBD targets
                                    </p>
                                    <ul className="text-xs text-green-600 space-y-1">
                                        <li>• Strong conversion rates above 15%</li>
                                        <li>• Consistent NBD focus above 40%</li>
                                        <li>• Regular new business generation</li>
                                    </ul>
                                </div>
                                
                                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                    <h4 className="font-semibold text-blue-800 mb-2">Overall Metrics</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-blue-700">Avg Conversion:</span>
                                            <span className="font-semibold text-blue-900">{stats.avgNBDConversion.toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-blue-700">Total Revenue:</span>
                                            <span className="font-semibold text-blue-900">₹{(stats.totalNBDRevenue / 100000).toFixed(1)}L</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-blue-700">Total Visits:</span>
                                            <span className="font-semibold text-blue-900">{stats.totalNBDVisits.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Improvement Areas */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-orange-600" />
                                Improvement Areas
                            </h3>
                            <div className="space-y-4">
                                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                                    <h4 className="font-semibold text-orange-800 mb-2">Focus Areas</h4>
                                    <p className="text-sm text-orange-700 mb-3">
                                        {nbdData.filter(item => item.performance_flag === 'INSUFFICIENT_NBD_FOCUS').length} territories need more NBD focus
                                    </p>
                                    <ul className="text-xs text-orange-600 space-y-1">
                                        <li>• Increase NBD visit frequency</li>
                                        <li>• Identify new prospect opportunities</li>
                                        <li>• Target untapped customer segments</li>
                                    </ul>
                                </div>
                                
                                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                                    <h4 className="font-semibold text-red-800 mb-2">Conversion Issues</h4>
                                    <p className="text-sm text-red-700 mb-3">
                                        {nbdData.filter(item => item.performance_flag === 'POOR_NBD_CONVERSION').length} territories struggling with conversion
                                    </p>
                                    <ul className="text-xs text-red-600 space-y-1">
                                        <li>• Review sales approach and techniques</li>
                                        <li>• Enhance product knowledge training</li>
                                        <li>• Improve customer relationship building</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Action Plan */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Target className="h-5 w-5 text-blue-600" />
                                Recommended Actions
                            </h3>
                            <div className="space-y-4">
                                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                    <h4 className="font-semibold text-blue-800 mb-2">Immediate Actions</h4>
                                    <ul className="text-sm text-blue-700 space-y-2">
                                        <li className="flex items-start gap-2">
                                            <Plus className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                            <span>Schedule coaching sessions for low performers</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Plus className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                            <span>Review territory mapping for NBD opportunities</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Plus className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                            <span>Implement weekly NBD tracking meetings</span>
                                        </li>
                                    </ul>
                                </div>
                                
                                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                                    <h4 className="font-semibold text-purple-800 mb-2">Long-term Strategy</h4>
                                    <ul className="text-sm text-purple-700 space-y-2">
                                        <li className="flex items-start gap-2">
                                            <Target className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                            <span>Develop NBD incentive programs</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Target className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                            <span>Create territory-specific NBD goals</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Target className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                            <span>Establish best practice sharing sessions</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NBDPerformanceDashboard;
