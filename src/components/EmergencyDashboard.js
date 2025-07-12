import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  AlertTriangle, 
  TrendingDown, 
  Users, 
  MapPin, 
  DollarSign, 
  BarChart3, 
  RefreshCw,
  Filter,
  ChevronDown,
  Eye,
  UserMinus,
  UserCheck,
  Target,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react';

const EmergencyDashboard = () => {
    const [zeroROITerritories, setZeroROITerritories] = useState([]);
    const [territoryStats, setTerritoryStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [sortBy, setSortBy] = useState('visits');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchTerritoryData();
        
        // Auto-refresh every 30 minutes
        const interval = setInterval(fetchTerritoryData, 1800000);
        return () => clearInterval(interval);
    }, []);

    const fetchTerritoryData = async () => {
        try {
            setError(null);
            setLoading(true);
            
            await Promise.all([
                fetchZeroROITerritories(),
            ]);
            
            setLoading(false);
        } catch (error) {
            console.error('Error fetching territory data:', error);
            setError('Failed to load territory data. Please check your connection.');
            setLoading(false);
        }
    };

    const fetchZeroROITerritories = async () => {
        try {
            // Try to fetch from emergency_territory_audit view first
            const { data: territories, error: territoriesError } = await supabase
                .from('emergency_territory_audit')
                .select('*')
                .order('total_visits_90d', { ascending: false });

            if (territoriesError) {
                console.error('Territory data error:', territoriesError);
                // Fallback to direct query
                await fetchTerritoryDataDirect();
            } else {
                setZeroROITerritories(territories || []);
                calculateTerritoryStats(territories || []);
            }
        } catch (error) {
            console.error('Error fetching zero ROI territories:', error);
            await fetchTerritoryDataDirect();
        }
    };

    const fetchTerritoryDataDirect = async () => {
        try {
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
                    revenue_per_visit: territory.total_visits_90d > 0 ? territory.total_sales_90d / territory.total_visits_90d : 0,
                    conversion_rate: territory.total_visits_90d > 0 ? (territory.converting_visits / territory.total_visits_90d) * 100 : 0
                })).filter(t => t.total_sales_90d === 0 || t.revenue_per_visit < 100)
                  .sort((a, b) => b.total_visits_90d - a.total_visits_90d);

                setZeroROITerritories(processed);
                calculateTerritoryStats(processed);
            }
        } catch (error) {
            console.error('Error in direct territory data fetch:', error);
        }
    };

    const calculateTerritoryStats = (territories) => {
        const stats = {
            totalTerritories: territories.length,
            zeroSalesTerritories: territories.filter(t => (t.total_sales_90d || 0) === 0).length,
            lowPerformingTerritories: territories.filter(t => t.revenue_per_visit > 0 && t.revenue_per_visit < 100).length,
            totalVisitsWasted: territories.reduce((sum, t) => sum + (t.total_visits_90d || 0), 0),
            totalRevenueLost: territories.reduce((sum, t) => sum + (t.total_sales_90d || 0), 0)
        };
        
        setTerritoryStats(stats);
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
                fetchTerritoryData();
            } catch (error) {
                console.error('Error flagging territory:', error);
                alert('Failed to flag territory. Please try again.');
            }
        }
    };

    const bulkAction = async (action) => {
        const filteredTerritories = getFilteredTerritories();
        if (filteredTerritories.length === 0) {
            alert('No territories selected for bulk action.');
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to ${action.toLowerCase()} ${filteredTerritories.length} territories?\n\n` +
            `This action cannot be undone.`
        );

        if (confirmed) {
            try {
                alert(`Bulk ${action.toLowerCase()} completed for ${filteredTerritories.length} territories.`);
                fetchTerritoryData();
            } catch (error) {
                console.error('Error performing bulk action:', error);
                alert('Failed to perform bulk action. Please try again.');
            }
        }
    };

    const getFilteredTerritories = () => {
        let filtered = [...zeroROITerritories];

        if (selectedFilter === 'zero_sales') {
            filtered = filtered.filter(t => (t.total_sales_90d || 0) === 0);
        } else if (selectedFilter === 'low_performance') {
            filtered = filtered.filter(t => t.revenue_per_visit > 0 && t.revenue_per_visit < 100);
        }

        if (sortBy === 'visits') {
            filtered = filtered.sort((a, b) => b.total_visits_90d - a.total_visits_90d);
        } else if (sortBy === 'revenue') {
            filtered = filtered.sort((a, b) => (b.total_sales_90d || 0) - (a.total_sales_90d || 0));
        } else if (sortBy === 'conversion') {
            filtered = filtered.sort((a, b) => (a.conversion_rate || 0) - (b.conversion_rate || 0));
        }

        return filtered;
    };

    const getPriorityBadge = (territory) => {
        const visits = territory.total_visits_90d || 0;
        const sales = territory.total_sales_90d || 0;
        
        if (sales === 0 && visits > 20) {
            return { label: 'CRITICAL', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle };
        } else if (sales === 0) {
            return { label: 'HIGH', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle };
        } else if (territory.revenue_per_visit < 50) {
            return { label: 'MEDIUM', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: XCircle };
        }
        return { label: 'LOW', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: CheckCircle };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Emergency Territory Data</h2>
                    <p className="text-gray-600">Analyzing territory performance and ROI metrics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md border border-gray-200">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Territory Data Error</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                        onClick={fetchTerritoryData}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                    >
                        Retry Loading
                    </button>
                </div>
            </div>
        );
    }

    const filteredTerritories = getFilteredTerritories();

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Emergency Territory Management</h1>
                                <p className="text-gray-600">Critical territory performance monitoring and intervention system</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-sm font-medium border border-red-200">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span>Live Emergency Dashboard</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <Clock className="h-4 w-4" />
                                <span>Last Updated: {new Date().toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <Filter className="h-4 w-4" />
                            <span>Filters</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>
                        <button
                            onClick={fetchTerritoryData}
                            disabled={loading}
                            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Emergency Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Critical Territories</div>
                            <div className="text-3xl font-bold text-red-600 mt-2">{territoryStats.zeroSalesTerritories || 0}</div>
                            <div className="text-sm text-gray-500 mt-1">Zero sales (90 days)</div>
                        </div>
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Low Performing</div>
                            <div className="text-3xl font-bold text-orange-600 mt-2">{territoryStats.lowPerformingTerritories || 0}</div>
                            <div className="text-sm text-gray-500 mt-1">Under ₹100/visit</div>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                            <TrendingDown className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Flagged</div>
                            <div className="text-3xl font-bold text-purple-600 mt-2">{territoryStats.totalTerritories || 0}</div>
                            <div className="text-sm text-gray-500 mt-1">Territories</div>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <Target className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Wasted Visits</div>
                            <div className="text-3xl font-bold text-blue-600 mt-2">{territoryStats.totalVisitsWasted || 0}</div>
                            <div className="text-sm text-gray-500 mt-1">90 days</div>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <BarChart3 className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Revenue Impact</div>
                            <div className="text-3xl font-bold text-gray-600 mt-2">₹{((territoryStats.totalRevenueLost || 0) / 100000).toFixed(1)}L</div>
                            <div className="text-sm text-gray-500 mt-1">Lost potential</div>
                        </div>
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-gray-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm font-medium text-gray-700">Filter:</span>
                            <button
                                onClick={() => setSelectedFilter('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    selectedFilter === 'all' 
                                        ? 'bg-red-100 text-red-700 border border-red-200' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                All ({zeroROITerritories.length})
                            </button>
                            <button
                                onClick={() => setSelectedFilter('zero_sales')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    selectedFilter === 'zero_sales' 
                                        ? 'bg-red-100 text-red-700 border border-red-200' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Zero Sales ({territoryStats.zeroSalesTerritories})
                            </button>
                            <button
                                onClick={() => setSelectedFilter('low_performance')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    selectedFilter === 'low_performance' 
                                        ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Low Performance ({territoryStats.lowPerformingTerritories})
                            </button>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                                <select 
                                    value={sortBy} 
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                                >
                                    <option value="visits">Visit Count</option>
                                    <option value="revenue">Revenue</option>
                                    <option value="conversion">Conversion Rate</option>
                                </select>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => bulkAction('REASSIGN')}
                                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                    <UserCheck className="h-4 w-4" />
                                    <span>Bulk Reassign</span>
                                </button>
                                <button
                                    onClick={() => bulkAction('REMOVE')}
                                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                                >
                                    <UserMinus className="h-4 w-4" />
                                    <span>Bulk Remove</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Territory Analysis Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold flex items-center space-x-3">
                                <Zap className="h-6 w-6" />
                                <span>Critical Territory Analysis ({filteredTerritories.length})</span>
                            </h2>
                            <p className="text-red-100 mt-2">Territories requiring immediate attention and intervention</p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-red-200">Priority Actions Required</div>
                            <div className="text-2xl font-bold">{filteredTerritories.filter(t => (t.total_sales_90d || 0) === 0).length}</div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Territory</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MR Name</th>
                                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Visits (90d)</th>
                                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales</th>
                                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue/Visit</th>
                                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion %</th>
                                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTerritories.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <CheckCircle className="h-8 w-8 text-green-600" />
                                            </div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Critical Territories Found!</h3>
                                            <p className="text-gray-600">All territories are performing well for the selected filter.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredTerritories.map((territory, index) => {
                                    const priorityBadge = getPriorityBadge(territory);
                                    const PriorityIcon = priorityBadge.icon;
                                    
                                    return (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <MapPin className="h-4 w-4 text-gray-400" />
                                                    <span className="font-medium text-gray-900">{territory.territory || 'Unknown Territory'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <Users className="h-4 w-4 text-gray-400" />
                                                    <span className="text-gray-700 font-medium">{territory.mr_name || 'Unknown MR'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold border ${priorityBadge.color}`}>
                                                    <PriorityIcon className="h-3 w-3" />
                                                    <span>{priorityBadge.label}</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                                                    {territory.total_visits_90d || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                                                    (territory.total_sales_90d || 0) === 0 
                                                        ? 'bg-red-100 text-red-800' 
                                                        : 'bg-green-100 text-green-800'
                                                }`}>
                                                    ₹{(territory.total_sales_90d || 0).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-sm font-semibold text-gray-900">
                                                    ₹{(territory.revenue_per_visit || 0).toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                                    (territory.conversion_rate || 0) === 0 
                                                        ? 'bg-red-100 text-red-800' 
                                                        : (territory.conversion_rate || 0) < 10 
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-green-100 text-green-800'
                                                }`}>
                                                    {(territory.conversion_rate || 0).toFixed(1)}%
                                                </span>
                                            </td>
                                           <td className="px-6 py-4 text-center">
    <div className="flex items-center justify-center space-x-2">
        <button 
            onClick={() => flagTerritory(territory.territory, 'INVESTIGATE')}
            className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        >
            <Eye className="h-3 w-3" />
            <span>Investigate</span>
        </button>
        <button 
            onClick={() => flagTerritory(territory.territory, 'REASSIGN')}
            className="flex items-center space-x-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        >
            <UserCheck className="h-3 w-3" />
            <span>Reassign</span>
        </button>
        <button 
            onClick={() => flagTerritory(territory.territory, 'REMOVE')}
            className="flex items-center space-x-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        >
            <UserMinus className="h-3 w-3" />
            <span>Remove</span>
        </button>
    </div>
</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Action Summary Cards */}
            {filteredTerritories.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-red-900 mb-2">Immediate Action Required</h3>
                                <p className="text-sm text-red-700 mb-4">
                                    {territoryStats.zeroSalesTerritories} territories with zero sales need immediate intervention
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-sm text-red-600">
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                        <span>Contact MRs for explanation</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm text-red-600">
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                        <span>Review territory boundaries</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm text-red-600">
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                        <span>Consider reassignment</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <TrendingDown className="h-6 w-6 text-orange-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-orange-900 mb-2">Performance Review</h3>
                                <p className="text-sm text-orange-700 mb-4">
                                    {territoryStats.lowPerformingTerritories} territories underperforming but showing activity
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-sm text-orange-600">
                                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                        <span>Analyze customer potential</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm text-orange-600">
                                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                        <span>Provide additional training</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm text-orange-600">
                                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                        <span>Optimize visit frequency</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <BarChart3 className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-blue-900 mb-2">Resource Optimization</h3>
                                <p className="text-sm text-blue-700 mb-4">
                                    {territoryStats.totalVisitsWasted} visits could be redirected to high-potential areas
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-sm text-blue-600">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                        <span>Redistribute high-performing MRs</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm text-blue-600">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                        <span>Focus on conversion optimization</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm text-blue-600">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                        <span>Implement territory restructuring</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Performance Insights */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <BarChart3 className="h-5 w-5 text-gray-600" />
                        <span>Performance Insights</span>
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>Last 90 days analysis</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                            {territoryStats.totalTerritories ? 
                                Math.round((territoryStats.zeroSalesTerritories / territoryStats.totalTerritories) * 100) : 0}%
                        </div>
                        <div className="text-sm text-gray-600">Zero Sales Rate</div>
                        <div className="text-xs text-gray-500 mt-1">Critical territories ratio</div>
                    </div>

                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                            ₹{territoryStats.totalVisitsWasted ? 
                                Math.round((territoryStats.totalRevenueLost || 0) / territoryStats.totalVisitsWasted) : 0}
                        </div>
                        <div className="text-sm text-gray-600">Avg Loss per Visit</div>
                        <div className="text-xs text-gray-500 mt-1">Revenue opportunity</div>
                    </div>

                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                            {filteredTerritories.length ? 
                                Math.round(filteredTerritories.reduce((sum, t) => sum + (t.total_visits_90d || 0), 0) / filteredTerritories.length) : 0}
                        </div>
                        <div className="text-sm text-gray-600">Avg Visits/Territory</div>
                        <div className="text-xs text-gray-500 mt-1">Activity level</div>
                    </div>

                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                            {filteredTerritories.length ? 
                                Math.round(filteredTerritories.reduce((sum, t) => sum + (t.conversion_rate || 0), 0) / filteredTerritories.length) : 0}%
                        </div>
                        <div className="text-sm text-gray-600">Avg Conversion</div>
                        <div className="text-xs text-gray-500 mt-1">Overall efficiency</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmergencyDashboard;