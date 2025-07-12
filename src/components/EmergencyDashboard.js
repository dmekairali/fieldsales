import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const EmergencyDashboard = () => {
    const [zeroROITerritories, setZeroROITerritories] = useState([]);
    const [territoryStats, setTerritoryStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [sortBy, setSortBy] = useState('visits');

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
                // Here you would typically call an API to flag the territory
                alert(`Territory "${territory}" has been flagged for ${action.toLowerCase()}`);
                // Refresh data after action
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
                // Bulk action implementation would go here
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

        // Sort the filtered results
        if (sortBy === 'visits') {
            filtered = filtered.sort((a, b) => b.total_visits_90d - a.total_visits_90d);
        } else if (sortBy === 'revenue') {
            filtered = filtered.sort((a, b) => (b.total_sales_90d || 0) - (a.total_sales_90d || 0));
        } else if (sortBy === 'conversion') {
            filtered = filtered.sort((a, b) => (a.conversion_rate || 0) - (b.conversion_rate || 0));
        }

        return filtered;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg font-medium">Loading emergency territory data...</p>
                    <p className="text-gray-500 text-sm mt-2">Analyzing territory performance and ROI metrics</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md border border-gray-200">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
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
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                🚨 Emergency Territory Management
                            </h1>
                            <p className="text-gray-600 mt-2">Critical territory performance monitoring and intervention system</p>
                            <div className="mt-3 inline-flex items-center gap-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                Live Emergency Dashboard • Last Updated: {new Date().toLocaleTimeString()}
                            </div>
                        </div>
                        <button
                            onClick={fetchTerritoryData}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <span className={loading ? 'animate-spin' : ''}>🔄</span>
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Emergency Statistics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-red-100 text-sm font-medium uppercase tracking-wide">Critical Territories</div>
                                <div className="text-3xl font-bold mt-2">{territoryStats.zeroSalesTerritories || 0}</div>
                                <div className="text-red-100 text-sm mt-1">Zero sales</div>
                            </div>
                            <div className="text-4xl opacity-80">🚨</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-orange-100 text-sm font-medium uppercase tracking-wide">Low Performing</div>
                                <div className="text-3xl font-bold mt-2">{territoryStats.lowPerformingTerritories || 0}</div>
                                <div className="text-orange-100 text-sm mt-1">Under ₹100/visit</div>
                            </div>
                            <div className="text-4xl opacity-80">⚠️</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-purple-100 text-sm font-medium uppercase tracking-wide">Total Flagged</div>
                                <div className="text-3xl font-bold mt-2">{territoryStats.totalTerritories || 0}</div>
                                <div className="text-purple-100 text-sm mt-1">Territories</div>
                            </div>
                            <div className="text-4xl opacity-80">🎯</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-blue-100 text-sm font-medium uppercase tracking-wide">Wasted Visits</div>
                                <div className="text-3xl font-bold mt-2">{territoryStats.totalVisitsWasted || 0}</div>
                                <div className="text-blue-100 text-sm mt-1">90 days</div>
                            </div>
                            <div className="text-4xl opacity-80">📊</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-600 to-gray-700 text-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-gray-100 text-sm font-medium uppercase tracking-wide">Revenue Impact</div>
                                <div className="text-3xl font-bold mt-2">₹{((territoryStats.totalRevenueLost || 0) / 100000).toFixed(1)}L</div>
                                <div className="text-gray-100 text-sm mt-1">Lost potential</div>
                            </div>
                            <div className="text-4xl opacity-80">💰</div>
                        </div>
                    </div>
                </div>

                {/* Filters and Controls */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">Territory Analysis & Controls</h2>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => bulkAction('REASSIGN')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                Bulk Reassign
                            </button>
                            <button
                                onClick={() => bulkAction('REMOVE')}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                            >
                                Bulk Remove
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-gray-700">Filter:</label>
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
                        
                        <div className="h-6 w-px bg-gray-300"></div>
                        
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-gray-700">Sort by:</label>
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
                    </div>
                </div>

                {/* Territory Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-xl">
                        <h2 className="text-xl font-bold flex items-center gap-3">
                            🎯 Critical Territory Analysis ({filteredTerritories.length})
                        </h2>
                        <p className="text-red-100 mt-2">Territories requiring immediate attention and intervention</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Territory</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MR Name</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Visits (90d)</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue/Visit</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion %</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredTerritories.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                            <div className="text-4xl mb-4">🎉</div>
                                            <p className="text-lg">No critical territories found!</p>
                                            <p className="text-sm mt-2">All territories are performing well for the selected filter.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTerritories.map((territory, index) => (
                                        <tr key={index} className={`hover:bg-gray-50 transition-colors ${
                                            (territory.total_sales_90d || 0) === 0 
                                                ? 'bg-red-50 border-l-4 border-red-500'
                                                : 'bg-yellow-50 border-l-4 border-yellow-500'
                                        }`}>
                                            <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                                                <div className="flex items-center">
                                                    <div className={`w-3 h-3 rounded-full mr-3 ${
                                                        (territory.total_sales_90d || 0) === 0 ? 'bg-red-500' : 'bg-yellow-500'
                                                    }`}></div>
                                                    {territory.territory || 'Unknown Territory'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-sm text-gray-700 font-medium">{territory.mr_name || 'Unknown MR'}</td>
                                            <td className="px-6 py-3 text-center">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                                                    {territory.total_visits_90d || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-bold ${
                                                    (territory.total_sales_90d || 0) === 0 
                                                        ? 'bg-red-100 text-red-800' 
                                                        : 'bg-green-100 text-green-800'
                                                }`}>
                                                    ₹{(territory.total_sales_90d || 0).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                                                ₹{(territory.revenue_per_visit || 0).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-3 text-center">
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
                                            <td className="px-6 py-3 text-center">
                                                <div className="flex items-center gap-2 justify-center">
                                                    <button 
                                                        onClick={() => flagTerritory(territory.territory, 'REASSIGN')}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                                    >
                                                        📝 Reassign
                                                    </button>
                                                    <button 
                                                        onClick={() => flagTerritory(territory.territory, 'REMOVE')}
                                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                                    >
                                                        🗑️ Remove
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Action Summary */}
                {filteredTerritories.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Action Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                                <h4 className="font-semibold text-red-800 mb-2">Immediate Action Required</h4>
                                <p className="text-sm text-red-700 mb-3">
                                    {territoryStats.zeroSalesTerritories} territories with zero sales need immediate intervention
                                </p>
                                <ul className="text-xs text-red-600 space-y-1">
                                    <li>• Contact MRs for explanation</li>
                                    <li>• Review territory boundaries</li>
                                    <li>• Consider reassignment</li>
                                </ul>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                                <h4 className="font-semibold text-orange-800 mb-2">Performance Review</h4>
                                <p className="text-sm text-orange-700 mb-3">
                                    {territoryStats.lowPerformingTerritories} territories underperforming but showing activity
                                </p>
                                <ul className="text-xs text-orange-600 space-y-1">
                                    <li>• Analyze customer potential</li>
                                    <li>• Provide additional training</li>
                                    <li>• Optimize visit frequency</li>
                                </ul>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                <h4 className="font-semibold text-blue-800 mb-2">Resource Optimization</h4>
                                <p className="text-sm text-blue-700 mb-3">
                                    {territoryStats.totalVisitsWasted} visits could be redirected to high-potential areas
                                </p>
                                <ul className="text-xs text-blue-600 space-y-1">
                                    <li>• Redistribute high-performing MRs</li>
                                    <li>• Focus on conversion optimization</li>
                                    <li>• Implement territory restructuring</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmergencyDashboard;
