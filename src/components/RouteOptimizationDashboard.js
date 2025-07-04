import React, { useState, useEffect } from 'react';
import { routeOptimizer } from '../services/RouteOptimizer';

const RouteOptimizationDashboard = ({ mrName, mrData }) => {
    const [customers, setCustomers] = useState([]);
    const [dailyRoute, setDailyRoute] = useState(null);
    const [weeklyRoutes, setWeeklyRoutes] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
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
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🗺️</div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">Route Optimization</h2>
                        <p className="text-gray-600 text-lg">Please select an MR from the dropdown to start route optimization</p>
                        <div className="mt-8 bg-blue-50 p-6 rounded-lg max-w-lg mx-auto">
                            <h3 className="font-semibold text-blue-800 mb-3">✨ Client-Side AI Features</h3>
                            <div className="text-sm text-blue-700 space-y-2 text-left">
                                <div>• Real-time route optimization without API</div>
                                <div>• AI-powered customer prioritization</div>
                                <div>• Geographic clustering algorithms</div>
                                <div>• Traveling Salesman Problem (TSP) solving</div>
                                <div>• Smart weekly route distribution</div>
                                <div>• Churn risk and urgency scoring</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 md:mb-8 text-center">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent flex items-center justify-center gap-2 md:gap-3">
                        🗺️ <span className="truncate">AI Route Optimization Dashboard</span>
                    </h1>
                    <p className="text-gray-600 mt-2 md:mt-3 text-sm md:text-base lg:text-xl">Client-side AI-powered route planning for maximum efficiency</p>
                    <div className="mt-3 md:mt-4 inline-flex items-center flex-wrap justify-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span>MR: {mrName}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="block sm:inline whitespace-nowrap">{customers.length} Customers Available</span>
                        {mrData?.territory && <span className="hidden md:inline">• Territory: {mrData.territory}</span>}
                    </div>
                </div>

                {/* MR Information Card */}
                {mrData && (
                    <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6 md:mb-8">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-3 md:mb-4">MR Profile</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            <div className="bg-blue-50 p-3 md:p-4 rounded-lg">
                                <div className="text-blue-600 text-xs md:text-sm font-medium">Employee ID</div>
                                <div className="text-lg md:text-xl font-bold text-blue-700 truncate">{mrData.employee_id}</div>
                            </div>
                            <div className="bg-green-50 p-3 md:p-4 rounded-lg">
                                <div className="text-green-600 text-xs md:text-sm font-medium">Territory</div>
                                <div className="text-lg md:text-xl font-bold text-green-700 truncate">{mrData.territory}</div>
                            </div>
                            <div className="bg-purple-50 p-3 md:p-4 rounded-lg">
                                <div className="text-purple-600 text-xs md:text-sm font-medium">Monthly Target</div>
                                <div className="text-lg md:text-xl font-bold text-purple-700">
                                    ₹{mrData.monthly_target?.toLocaleString() || 'N/A'}
                                </div>
                            </div>
                            <div className="bg-orange-50 p-3 md:p-4 rounded-lg">
                                <div className="text-orange-600 text-xs md:text-sm font-medium">Manager</div>
                                <div className="text-lg md:text-xl font-bold text-orange-700 truncate">{mrData.manager_name || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Control Panel */}
                <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6 md:mb-8">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-3 md:mb-4">🎛️ AI Optimization Controls</h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Max Visits</label>
                            <input
                                type="number"
                                value={optimizationParams.maxVisits}
                                onChange={(e) => setOptimizationParams({
                                    ...optimizationParams, 
                                    maxVisits: parseInt(e.target.value)
                                })}
                                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-3 md:py-2 focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                                min="5"
                                max="20"
                            />
                            <div className="text-xxs md:text-xs text-gray-500 mt-1">5-20 visits per day</div>
                        </div>
                        
                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Max Travel Time (min)</label>
                            <input
                                type="number"
                                value={optimizationParams.maxTravelTime}
                                onChange={(e) => setOptimizationParams({
                                    ...optimizationParams, 
                                    maxTravelTime: parseInt(e.target.value)
                                })}
                                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-3 md:py-2 focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                                min="120"
                                max="480"
                            />
                            <div className="text-xxs md:text-xs text-gray-500 mt-1">2-8 hours travel time</div>
                        </div>

                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Optimization Options</label>
                            <div className="space-y-1.5 md:space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={optimizationParams.prioritizeUrgency}
                                        onChange={(e) => setOptimizationParams({
                                            ...optimizationParams,
                                            prioritizeUrgency: e.target.checked
                                        })}
                                        className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4"
                                    />
                                    <span className="text-xs md:text-sm">Prioritize Urgency</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={optimizationParams.includeReturnTime}
                                        onChange={(e) => setOptimizationParams({
                                            ...optimizationParams,
                                            includeReturnTime: e.target.checked
                                        })}
                                        className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4"
                                    />
                                    <span className="text-xs md:text-sm">Include Return Time</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5 md:gap-2">
                            <button
                                onClick={optimizeDailyRoute}
                                disabled={loading || customers.length === 0}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold transition-colors text-xs md:text-sm"
                            >
                                {loading ? '🔄 Optimizing...' : '🎯 Optimize Today\'s Route'}
                            </button>
                            <button
                                onClick={generateWeeklyRoutes}
                                disabled={loading || customers.length === 0}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold transition-colors text-xs md:text-sm"
                            >
                                {loading ? '🔄 Generating...' : '📅 Generate Weekly Routes'}
                            </button>
                        </div>
                    </div>

                    <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                        <button
                            onClick={fetchCustomers}
                            disabled={loading}
                            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold transition-colors text-xs md:text-sm"
                        >
                            {loading ? '🔄 Loading...' : '🔄 Refresh Customer Data'}
                        </button>
                        <button
                            onClick={() => routeOptimizer.clearCache()}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold transition-colors text-xs md:text-sm"
                        >
                            🗑️ Clear Cache
                        </button>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4 mb-6 md:mb-8">
                        <div className="flex items-center gap-1.5 md:gap-2">
                            <span className="text-red-500 text-lg md:text-xl">⚠️</span>
                            <div className="text-red-600 font-semibold text-sm md:text-base">Error</div>
                        </div>
                        <div className="mt-1.5 md:mt-2 text-red-600 text-xs md:text-sm">
                            {error}
                        </div>
                    </div>
                )}

                {/* Daily Route Results */}
                {dailyRoute && (
                    <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6 md:mb-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6">
                            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-2 sm:mb-0">🎯 Optimized Daily Route</h2>
                            <div className="bg-green-100 text-green-800 px-3 py-1 md:px-4 md:py-2 rounded-lg font-semibold text-xs md:text-sm">
                                Score: {dailyRoute.optimization_score}/100
                            </div>
                        </div>

                        {/* Route Metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-4 md:mb-6">
                            <div className="bg-blue-50 p-2.5 md:p-4 rounded-lg text-center">
                                <div className="text-blue-600 text-xs md:text-sm font-medium">Customers</div>
                                <div className="text-xl md:text-2xl font-bold text-blue-700">{dailyRoute.total_customers}</div>
                            </div>
                            <div className="bg-green-50 p-2.5 md:p-4 rounded-lg text-center">
                                <div className="text-green-600 text-xs md:text-sm font-medium">Est. Revenue</div>
                                <div className="text-xl md:text-2xl font-bold text-green-700">₹{dailyRoute.estimated_revenue.toLocaleString()}</div>
                            </div>
                            <div className="bg-orange-50 p-2.5 md:p-4 rounded-lg text-center">
                                <div className="text-orange-600 text-xs md:text-sm font-medium">Travel Time</div>
                                <div className="text-xl md:text-2xl font-bold text-orange-700">{formatDuration(dailyRoute.total_travel_time)}</div>
                            </div>
                            <div className="bg-purple-50 p-2.5 md:p-4 rounded-lg text-center">
                                <div className="text-purple-600 text-xs md:text-sm font-medium">Distance</div>
                                <div className="text-xl md:text-2xl font-bold text-purple-700">{formatDistance(dailyRoute.total_distance)}</div>
                            </div>
                            <div className="bg-indigo-50 p-2.5 md:p-4 rounded-lg text-center">
                                <div className="text-indigo-600 text-xs md:text-sm font-medium">Efficiency</div>
                                <div className="text-xl md:text-2xl font-bold text-indigo-700">{dailyRoute.route_efficiency.toFixed(1)}</div>
                            </div>
                            <div className="bg-pink-50 p-2.5 md:p-4 rounded-lg text-center">
                                <div className="text-pink-600 text-xs md:text-sm font-medium">Revenue/Hr</div>
                                <div className="text-xl md:text-2xl font-bold text-pink-700">₹{dailyRoute.revenue_per_hour}</div>
                            </div>
                        </div>

                        {/* Route Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px]">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-bold text-gray-700">#</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-bold text-gray-700">Customer</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-bold text-gray-700">Type</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">Urgency</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">Churn Risk</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">Distance</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">Travel Time</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">Est. Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {dailyRoute.route.map((customer, index) => (
                                        <tr key={customer.customer_code} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                                            <td className="px-3 py-2 md:px-4 md:py-3 text-center">
                                                <span className="inline-flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-xs md:text-sm">
                                                    {customer.route_position}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm">
                                                <div className="font-semibold text-gray-900 truncate">{customer.customer_name}</div>
                                                <div className="text-xxs md:text-xs text-gray-500 truncate">{customer.area_name}, {customer.city_name}</div>
                                            </td>
                                            <td className="px-3 py-2 md:px-4 md:py-3">
                                                <span className="inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xxs md:text-xs font-medium bg-gray-100 text-gray-800">
                                                    {customer.customer_type}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 md:px-4 md:py-3 text-center">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xxs md:text-xs font-bold ${getUrgencyColor(customer.urgency_score)}`}>
                                                    {Math.round(customer.urgency_score)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 md:px-4 md:py-3 text-center">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xxs md:text-xs font-bold ${getChurnRiskColor(customer.churn_risk)}`}>
                                                    {Math.round(customer.churn_risk * 100)}%
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm">
                                                {formatDistance(customer.distance_from_previous || 0)}
                                            </td>
                                            <td className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm">
                                                {formatDuration(customer.travel_time_from_previous || 0)}
                                            </td>
                                            <td className="px-3 py-2 md:px-4 md:py-3 text-center font-semibold text-green-600 text-xs md:text-sm">
                                                ₹{(customer.expected_revenue || 0).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Weekly Routes Results */}
                {weeklyRoutes && (
                    <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6 md:mb-8">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">📅 Weekly Route Plan</h2>
                        
                        {/* Weekly Summary */}
                        <div className="bg-blue-50 p-3 md:p-4 rounded-lg mb-4 md:mb-6">
                            <h3 className="font-semibold text-blue-800 mb-2 md:mb-3 text-sm md:text-base">Weekly Summary</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                                <div className="text-center">
                                    <div className="text-lg md:text-xl font-bold text-blue-700">{weeklyRoutes.weekly_summary.total_customers_week}</div>
                                    <div className="text-xs md:text-sm text-blue-600">Total Customers</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg md:text-xl font-bold text-green-700">₹{weeklyRoutes.weekly_summary.total_estimated_revenue.toLocaleString()}</div>
                                    <div className="text-xs md:text-sm text-green-600">Total Revenue</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg md:text-xl font-bold text-orange-700">{formatDuration(weeklyRoutes.weekly_summary.total_travel_time)}</div>
                                    <div className="text-xs md:text-sm text-orange-600">Total Travel</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg md:text-xl font-bold text-purple-700">{weeklyRoutes.weekly_summary.avg_customers_per_day}</div>
                                    <div className="text-xs md:text-sm text-purple-600">Avg/Day</div>
                                </div>
                            </div>
                        </div>

                        {/* Daily Routes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            {Object.entries(weeklyRoutes.weekly_routes).map(([day, route]) => (
                                <div key={day} className="border border-gray-200 rounded-lg p-3 md:p-4">
                                    <div className="flex items-center justify-between mb-3 md:mb-4">
                                        <h4 className="font-semibold text-gray-800 text-sm md:text-base">{day}</h4>
                                        <div className="text-xs md:text-sm text-gray-500">{route.planned_date}</div>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-1.5 md:gap-2 text-xs md:text-sm mb-3 md:mb-4">
                                        <div className="text-center">
                                            <div className="font-bold text-blue-600">{route.total_customers}</div>
                                            <div className="text-xxs md:text-xs text-gray-500">Customers</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-bold text-green-600">₹{route.estimated_revenue.toLocaleString()}</div>
                                            <div className="text-xxs md:text-xs text-gray-500">Revenue</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-bold text-orange-600">{formatDuration(route.total_travel_time)}</div>
                                            <div className="text-xxs md:text-xs text-gray-500">Travel</div>
                                        </div>
                                    </div>

                                    {route.route && route.route.length > 0 ? (
                                        <div className="space-y-1.5 md:space-y-2">
                                            {route.route.slice(0, 3).map((customer, index) => (
                                                <div key={customer.customer_code} className="flex items-center justify-between bg-gray-50 p-1.5 md:p-2 rounded">
                                                    <div className="text-xs md:text-sm">
                                                        <div className="font-medium truncate">{customer.customer_name}</div>
                                                        <div className="text-xxs md:text-xs text-gray-500">{customer.customer_type}</div>
                                                    </div>
                                                    <div className="text-right text-xxs md:text-xs">
                                                        <div className="font-bold text-green-600">₹{(customer.expected_revenue || 0).toLocaleString()}</div>
                                                        <div className="text-gray-500">Urgency: {Math.round(customer.urgency_score)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {route.route.length > 3 && (
                                                <div className="text-center text-xs md:text-sm text-gray-500 py-1.5 md:py-2">
                                                    +{route.route.length - 3} more customers
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-500 py-3 md:py-4 text-sm md:text-base">
                                            No customers scheduled
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Customer List */}
                {customers.length > 0 && !dailyRoute && !weeklyRoutes && (
                    <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-3 md:mb-4">📋 Available Customers for {mrName}</h2>
                        <div className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                            Found {customers.length} customers with GPS coordinates and AI scoring
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px]">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-bold text-gray-700">Customer</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-bold text-gray-700">Type</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-bold text-gray-700">Location</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">Priority</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">Urgency</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">Churn Risk</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">Predicted Value</th>
                                        <th className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm font-bold text-gray-700">Last Visit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {customers.slice(0, 20).map((customer, index) => (
                                        <tr key={customer.customer_code} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                                            <td className="px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm">
                                                <div className="font-semibold text-gray-900 truncate">{customer.customer_name}</div>
                                                <div className="text-xxs md:text-xs text-gray-500">{customer.customer_code}</div>
                                            </td>
                                            <td className="px-3 py-2 md:px-4 md:py-3">
                                                <span className="inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xxs md:text-xs font-medium bg-gray-100 text-gray-800">
                                                    {customer.customer_type}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm">
                                                <div className="text-gray-900 truncate">{customer.area_name}</div>
                                                <div className="text-xxs md:text-xs text-gray-500 truncate">{customer.city_name}</div>
                                            </td>
                                            <td className="px-3 py-2 md:px-4 md:py-3 text-center">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xxs md:text-xs font-bold ${getUrgencyColor(customer.priority_score)}`}>
                                                    {Math.round(customer.priority_score)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 md:px-4 md:py-3 text-center">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xxs md:text-xs font-bold ${getUrgencyColor(customer.urgency_score)}`}>
                                                    {Math.round(customer.urgency_score)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 md:px-4 md:py-3 text-center">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xxs md:text-xs font-bold ${getChurnRiskColor(customer.churn_risk)}`}>
                                                    {Math.round(customer.churn_risk * 100)}%
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 md:px-4 md:py-3 text-center font-semibold text-green-600 text-xs md:text-sm">
                                                ₹{customer.predicted_value.toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2 md:px-4 md:py-3 text-center text-xs md:text-sm">
                                                {customer.days_since_visit < 999 
                                                    ? `${customer.days_since_visit} days ago`
                                                    : 'Never visited'
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {customers.length > 20 && (
                                <div className="text-center py-3 md:py-4 text-xs md:text-sm text-gray-500">
                                    Showing 20 of {customers.length} customers. Optimize routes to see prioritized selection.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Algorithm Information */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 md:p-6 mt-6 md:mt-8">
                    <h3 className="text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4">🧠 AI Algorithms Used</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm">
                            <h4 className="font-semibold text-blue-700 mb-1 md:mb-2 text-sm md:text-base">Geographic Clustering</h4>
                            <p className="text-xs md:text-sm text-gray-600">K-means clustering to group nearby customers and minimize travel time</p>
                        </div>
                        <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm">
                            <h4 className="font-semibold text-green-700 mb-1 md:mb-2 text-sm md:text-base">TSP Optimization</h4>
                            <p className="text-xs md:text-sm text-gray-600">Traveling Salesman Problem solving with 2-opt improvements</p>
                        </div>
                        <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm">
                            <h4 className="font-semibold text-purple-700 mb-1 md:mb-2 text-sm md:text-base">AI Scoring Engine</h4>
                            <p className="text-xs md:text-sm text-gray-600">Multi-factor urgency, churn risk, and priority scoring algorithms</p>
                        </div>
                        <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm">
                            <h4 className="font-semibold text-orange-700 mb-1 md:mb-2 text-sm md:text-base">Predictive Analytics</h4>
                            <p className="text-xs md:text-sm text-gray-600">Order probability and revenue prediction based on historical data</p>
                        </div>
                        <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm">
                            <h4 className="font-semibold text-red-700 mb-1 md:mb-2 text-sm md:text-base">Real-time Processing</h4>
                            <p className="text-xs md:text-sm text-gray-600">Client-side processing with smart caching for instant results</p>
                        </div>
                        <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm">
                            <h4 className="font-semibold text-indigo-700 mb-1 md:mb-2 text-sm md:text-base">Weekly Distribution</h4>
                            <p className="text-xs md:text-sm text-gray-600">Smart weekly scheduling based on customer priority and visit frequency</p>
                        </div>
                    </div>
                    
                    <div className="mt-4 md:mt-6 text-center">
                        <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold">
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full"></span>
                            100% Client-Side • No API Required • Real-time Results
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RouteOptimizationDashboard;
