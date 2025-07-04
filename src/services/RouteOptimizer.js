import React, { useState, useEffect } from 'react';
import { routeOptimizer } from '../services/RouteOptimizer';

const RouteOptimizationDashboard = ({ mrName, mrData }) => {
    const [customers, setCustomers] = useState([]);
    const [dailyRoute, setDailyRoute] = useState(null);
    const [weeklyRoutes, setWeeklyRoutes] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedDays, setExpandedDays] = useState({});
    const [optimizationParams, setOptimizationParams] = useState({
        maxVisits: 10,
        maxTravelTime: 240,
        prioritizeUrgency: true,
        includeReturnTime: true
    });

    useEffect(() => {
        if (mrName) {
            console.log(`🔄 MR changed to: ${mrName}, fetching customers...`);
            fetchCustomers();
        }
    }, [mrName]);

    const fetchCustomers = async () => {
        if (!mrName) {
            setError('Please select an MR first');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const customerData = await routeOptimizer.getCustomersForMR(mrName);
            setCustomers(customerData);
            console.log(`✅ Successfully loaded ${customerData.length} customers for ${mrName}`);
        } catch (err) {
            console.error('❌ Error fetching customers:', err);
            setError(`Failed to fetch customers: ${err.message}`);
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    };

    const optimizeDailyRoute = async () => {
        if (!customers || customers.length === 0) {
            setError('No customers available for optimization');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            console.log('🎯 Starting route optimization...');
            const result = routeOptimizer.optimizeDailyRoute(customers, optimizationParams);
            setDailyRoute(result);
            console.log('✅ Route optimization completed:', result);
        } catch (err) {
            console.error('❌ Route optimization error:', err);
            setError(`Route optimization failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const generateWeeklyRoutes = async () => {
        if (!mrName) {
            setError('Please select an MR first');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            console.log('📅 Generating weekly routes...');
            const result = await routeOptimizer.generateWeeklyRoutes(mrName, optimizationParams);
            setWeeklyRoutes(result);
            console.log('✅ Weekly routes generated:', result);
        } catch (err) {
            console.error('❌ Weekly routes error:', err);
            setError(`Weekly route generation failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleDayExpansion = (day) => {
        setExpandedDays(prev => ({
            ...prev,
            [day]: !prev[day]
        }));
    };

    const getUrgencyColor = (score) => {
        if (score >= 75) return 'text-red-600 bg-red-100';
        if (score >= 50) return 'text-orange-600 bg-orange-100';
        return 'text-green-600 bg-green-100';
    };

    const getChurnRiskColor = (risk) => {
        if (risk >= 0.7) return 'text-red-600 bg-red-100';
        if (risk >= 0.4) return 'text-orange-600 bg-orange-100';
        return 'text-green-600 bg-green-100';
    };

    const formatDuration = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    const formatDistance = (km) => {
        return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
    };

    if (!mrName) {
        return (
            <div className="min-h-screen bg-gray-50 p-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-16">
                        <div className="text-5xl mb-4">🗺️</div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-3">Route Optimization</h2>
                        <p className="text-gray-600 text-lg">Please select an MR from the dropdown to start route optimization</p>
                        <div className="mt-6 bg-blue-50 p-4 rounded-lg max-w-lg mx-auto">
                            <h3 className="font-semibold text-blue-800 mb-2">✨ AI Features</h3>
                            <div className="text-sm text-blue-700 space-y-1 text-left">
                                <div>• Performance-based customer prioritization</div>
                                <div>• Geographic clustering & TSP optimization</div>
                                <div>• Churn risk and urgency scoring</div>
                                <div>• Smart weekly route distribution</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Compact Header */}
                <div className="mb-6 text-center">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent flex items-center justify-center gap-2">
                        🗺️ Route Optimization
                    </h1>
                    <div className="mt-2 inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        {mrName} • {customers.length} Customers
                        {mrData?.territory && ` • ${mrData.territory}`}
                    </div>
                </div>

                {/* Compact Controls */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Max Visits</label>
                            <input
                                type="number"
                                value={optimizationParams.maxVisits}
                                onChange={(e) => setOptimizationParams({
                                    ...optimizationParams, 
                                    maxVisits: parseInt(e.target.value)
                                })}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500"
                                min="5" max="20"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Max Travel (min)</label>
                            <input
                                type="number"
                                value={optimizationParams.maxTravelTime}
                                onChange={(e) => setOptimizationParams({
                                    ...optimizationParams, 
                                    maxTravelTime: parseInt(e.target.value)
                                })}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500"
                                min="120" max="480"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={optimizeDailyRoute}
                                disabled={loading || customers.length === 0}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm font-semibold transition-colors"
                            >
                                {loading ? '🔄' : '🎯'} Daily Route
                            </button>
                            <button
                                onClick={fetchCustomers}
                                disabled={loading}
                                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                                🔄
                            </button>
                        </div>
                        <div>
                            <button
                                onClick={generateWeeklyRoutes}
                                disabled={loading || customers.length === 0}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm font-semibold transition-colors"
                            >
                                {loading ? '🔄 Generating...' : '📅 Generate Weekly Routes'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                        <div className="flex items-center gap-2">
                            <span className="text-red-500">⚠️</span>
                            <div className="text-red-600 text-sm">{error}</div>
                        </div>
                    </div>
                )}

                {/* Weekly Routes Results */}
                {weeklyRoutes && (
                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-3">📅 Weekly Route Plan</h2>
                        
                        {/* Compact Weekly Summary */}
                        <div className="bg-blue-50 p-3 rounded-lg mb-4">
                            <div className="grid grid-cols-4 gap-4 text-center">
                                <div>
                                    <div className="text-lg font-bold text-blue-700">{weeklyRoutes.weekly_summary.total_customers_week}</div>
                                    <div className="text-xs text-blue-600">Total Customers</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-green-700">₹{(weeklyRoutes.weekly_summary.total_estimated_revenue / 1000).toFixed(0)}K</div>
                                    <div className="text-xs text-green-600">Est. Revenue</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-orange-700">{formatDuration(weeklyRoutes.weekly_summary.total_travel_time)}</div>
                                    <div className="text-xs text-orange-600">Total Travel</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-purple-700">{weeklyRoutes.weekly_summary.avg_customers_per_day}</div>
                                    <div className="text-xs text-purple-600">Avg/Day</div>
                                </div>
                            </div>
                        </div>

                        {/* Compact Daily Routes Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            {Object.entries(weeklyRoutes.weekly_routes).map(([day, route]) => (
                                <div key={day} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-sm text-gray-800">{day}</h4>
                                        <div className="text-xs text-gray-500">{route.planned_date}</div>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-1 text-xs mb-3">
                                        <div className="text-center">
                                            <div className="font-bold text-blue-600">{route.total_customers}</div>
                                            <div className="text-gray-500">Customers</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-bold text-green-600">₹{(route.estimated_revenue / 1000).toFixed(0)}K</div>
                                            <div className="text-gray-500">Revenue</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-bold text-orange-600">{formatDuration(route.total_travel_time)}</div>
                                            <div className="text-gray-500">Travel</div>
                                        </div>
                                    </div>

                                    {route.route && route.route.length > 0 ? (
                                        <div className="space-y-1">
                                            {route.route.slice(0, expandedDays[day] ? route.route.length : 3).map((customer, index) => (
                                                <div key={customer.customer_code} className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-gray-900 truncate">{customer.customer_name}</div>
                                                        <div className="text-gray-500 truncate">{customer.customer_type}</div>
                                                    </div>
                                                    <div className="text-right ml-2">
                                                        <div className="font-bold text-green-600">₹{(customer.expected_revenue || 0).toLocaleString()}</div>
                                                        <div className={`text-xs px-1 rounded ${getUrgencyColor(customer.urgency_score)}`}>
                                                            {Math.round(customer.urgency_score)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {route.route.length > 3 && (
                                                <button
                                                    onClick={() => toggleDayExpansion(day)}
                                                    className="w-full text-center text-xs text-blue-600 hover:text-blue-800 py-1"
                                                >
                                                    {expandedDays[day] 
                                                        ? 'Show Less' 
                                                        : `+${route.route.length - 3} more customers`
                                                    }
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-500 py-3 text-xs">
                                            No customers scheduled
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Daily Route Results */}
                {dailyRoute && (
                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-800">🎯 Optimized Daily Route</h2>
                            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-lg text-sm font-semibold">
                                Score: {dailyRoute.optimization_score}/100
                            </div>
                        </div>

                        {/* Compact Route Metrics */}
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                            <div className="bg-blue-50 p-2 rounded text-center">
                                <div className="text-blue-600 text-xs font-medium">Customers</div>
                                <div className="text-lg font-bold text-blue-700">{dailyRoute.total_customers}</div>
                            </div>
                            <div className="bg-green-50 p-2 rounded text-center">
                                <div className="text-green-600 text-xs font-medium">Revenue</div>
                                <div className="text-lg font-bold text-green-700">₹{(dailyRoute.estimated_revenue / 1000).toFixed(0)}K</div>
                            </div>
                            <div className="bg-orange-50 p-2 rounded text-center">
                                <div className="text-orange-600 text-xs font-medium">Travel</div>
                                <div className="text-lg font-bold text-orange-700">{formatDuration(dailyRoute.total_travel_time)}</div>
                            </div>
                            <div className="bg-purple-50 p-2 rounded text-center">
                                <div className="text-purple-600 text-xs font-medium">Distance</div>
                                <div className="text-lg font-bold text-purple-700">{formatDistance(dailyRoute.total_distance)}</div>
                            </div>
                            <div className="bg-indigo-50 p-2 rounded text-center">
                                <div className="text-indigo-600 text-xs font-medium">Efficiency</div>
                                <div className="text-lg font-bold text-indigo-700">{dailyRoute.route_efficiency.toFixed(1)}</div>
                            </div>
                            <div className="bg-pink-50 p-2 rounded text-center">
                                <div className="text-pink-600 text-xs font-medium">Rev/Hr</div>
                                <div className="text-lg font-bold text-pink-700">₹{(dailyRoute.revenue_per_hour / 1000).toFixed(0)}K</div>
                            </div>
                        </div>

                        {/* Compact Route Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">#</th>
                                        <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">Customer</th>
                                        <th className="px-2 py-2 text-center text-xs font-bold text-gray-700">Type</th>
                                        <th className="px-2 py-2 text-center text-xs font-bold text-gray-700">Urgency</th>
                                        <th className="px-2 py-2 text-center text-xs font-bold text-gray-700">Risk</th>
                                        <th className="px-2 py-2 text-center text-xs font-bold text-gray-700">Travel</th>
                                        <th className="px-2 py-2 text-center text-xs font-bold text-gray-700">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {dailyRoute.route.map((customer, index) => (
                                        <tr key={customer.customer_code} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                                            <td className="px-2 py-2 text-center">
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold text-xs">
                                                    {customer.route_position}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="font-semibold text-gray-900 text-xs">{customer.customer_name}</div>
                                                <div className="text-xs text-gray-500">{customer.area_name}</div>
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                    {customer.customer_type}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <span className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-bold ${getUrgencyColor(customer.urgency_score)}`}>
                                                    {Math.round(customer.urgency_score)}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <span className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-bold ${getChurnRiskColor(customer.churn_risk)}`}>
                                                    {Math.round(customer.churn_risk * 100)}%
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-center text-xs">
                                                {formatDuration(customer.travel_time_from_previous || 0)}
                                            </td>
                                            <td className="px-2 py-2 text-center font-semibold text-green-600 text-xs">
                                                ₹{((customer.expected_revenue || 0) / 1000).toFixed(0)}K
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Customer List Preview */}
                {customers.length > 0 && !dailyRoute && !weeklyRoutes && (
                    <div className="bg-white rounded-lg shadow p-4">
                        <h2 className="text-lg font-bold text-gray-800 mb-3">📋 Available Customers ({customers.length})</h2>
                        <div className="text-sm text-gray-600 mb-3">
                            Ready for route optimization with AI performance metrics
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {customers.slice(0, 9).map((customer, index) => (
                                <div key={customer.customer_code} className="border border-gray-200 rounded p-3">
                                    <div className="font-medium text-gray-900 text-sm">{customer.customer_name}</div>
                                    <div className="text-xs text-gray-500">{customer.customer_type} • {customer.area_name}</div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${getUrgencyColor(customer.urgency_score)}`}>
                                            Urgency: {Math.round(customer.urgency_score)}
                                        </span>
                                        <span className="text-xs text-gray-600">₹{(customer.predicted_value / 1000).toFixed(0)}K</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {customers.length > 9 && (
                            <div className="text-center mt-3 text-sm text-gray-500">
                                +{customers.length - 9} more customers available for optimization
                            </div>
                        )}
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Optimizing routes...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RouteOptimizationDashboard;
