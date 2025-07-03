import React, { useState, useEffect } from 'react';

const RouteOptimizationDashboard = ({ mrName, mrData }) => {
    const [customers, setCustomers] = useState([]);
    const [dailyRoute, setDailyRoute] = useState(null);
    const [weeklyRoutes, setWeeklyRoutes] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [optimizationParams, setOptimizationParams] = useState({
        maxVisits: 10,
        maxTravelTime: 240
    });

    // API base URL - update this to match your deployment
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

    useEffect(() => {
        if (mrName) {
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
            console.log(`Fetching customers for MR: ${mrName}`);
            
            const response = await fetch(`${API_BASE_URL}/api/route/customers/${encodeURIComponent(mrName)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.status === 'success') {
                setCustomers(data.customers || []);
                console.log(`Loaded ${data.customers?.length || 0} customers for ${mrName}`);
            } else {
                throw new Error(data.message || 'Failed to fetch customers');
            }
        } catch (err) {
            console.error('Error fetching customers:', err);
            setError(`Failed to fetch customers: ${err.message}`);
            
            // Fallback to empty array
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    };

    const optimizeDailyRoute = async () => {
        if (!mrName) {
            setError('Please select an MR first');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            console.log(`Optimizing route for ${mrName} with params:`, optimizationParams);
            
            const url = `${API_BASE_URL}/api/route/optimize/${encodeURIComponent(mrName)}?` +
                       `max_visits=${optimizationParams.maxVisits}&` +
                       `max_travel_time=${optimizationParams.maxTravelTime}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.status === 'success') {
                setDailyRoute(data.route_data);
                console.log('Route optimization successful:', data.route_data);
            } else {
                throw new Error(data.message || 'Route optimization failed');
            }
        } catch (err) {
            console.error('Error optimizing route:', err);
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
            console.log(`Generating weekly routes for ${mrName}`);
            
            const response = await fetch(`${API_BASE_URL}/api/route/weekly/${encodeURIComponent(mrName)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.status === 'success') {
                setWeeklyRoutes(data.weekly_routes);
                console.log('Weekly routes generated successfully:', data.weekly_routes);
            } else {
                throw new Error(data.message || 'Weekly route generation failed');
            }
        } catch (err) {
            console.error('Error generating weekly routes:', err);
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

    const formatDuration = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    if (!mrName) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🗺️</div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">Route Optimization</h2>
                        <p className="text-gray-600 text-lg">Please select an MR from the dropdown to start route optimization</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent flex items-center justify-center gap-3">
                        🗺️ Route Optimization Dashboard
                    </h1>
                    <p className="text-gray-600 mt-3 text-xl">AI-powered route planning for maximum efficiency</p>
                    <div className="mt-4 inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        MR: {mrName} • {customers.length} Customers Available
                        {mrData?.territory && ` • Territory: ${mrData.territory}`}
                    </div>
                </div>

                {/* MR Information Card */}
                {mrData && (
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">MR Profile</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="text-blue-600 text-sm font-medium">Employee ID</div>
                                <div className="text-xl font-bold text-blue-700">{mrData.employee_id}</div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                                <div className="text-green-600 text-sm font-medium">Territory</div>
                                <div className="text-xl font-bold text-green-700">{mrData.territory}</div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <div className="text-purple-600 text-sm font-medium">Monthly Target</div>
                                <div className="text-xl font-bold text-purple-700">
                                    ₹{mrData.monthly_target?.toLocaleString() || 'N/A'}
                                </div>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-lg">
                                <div className="text-orange-600 text-sm font-medium">Manager</div>
                                <div className="text-xl font-bold text-orange-700">{mrData.manager_name || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Control Panel */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Route Optimization Controls</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Parameters */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Max Visits</label>
                            <input
                                type="number"
                                value={optimizationParams.maxVisits}
                                onChange={(e) => setOptimizationParams({...optimizationParams, maxVisits: parseInt(e.target.value)})}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                min="5"
                                max="20"
                            />
                            <div className="text-xs text-gray-500 mt-1">5-20 visits per day</div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Max Travel Time (min)</label>
                            <input
                                type="number"
                                value={optimizationParams.maxTravelTime}
                                onChange={(e) => setOptimizationParams({...optimizationParams, maxTravelTime: parseInt(e.target.value)})}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                min="120"
                                max="480"
                            />
                            <div className="text-xs text-gray-500 mt-1">2-8 hours travel time</div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={optimizeDailyRoute}
                                disabled={loading || customers.length === 0}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                            >
                                {loading ? '🔄 Optimizing...' : '🎯 Optimize Today\'s Route'}
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={generateWeeklyRoutes}
                                disabled={loading || customers.length === 0}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                            >
                                {loading ? '🔄 Generating...' : '📅 Generate Weekly Routes'}
                            </button>
                        </div>
                    </div>

                    {/* Refresh Customer Data */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <button
                            onClick={fetchCustomers}
                            disabled={loading}
                            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                            {loading ? '🔄 Loading...' : '🔄 Refresh Customer Data'}
                        </button>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
                        <div className="flex items-center gap-2">
                            <span className="text-red-500 text-xl">⚠️</span>
                            <div className="text-red-600 font-semibold">{error}</div>
                        </div>
                        <div className="mt-2 text-red-600 text-sm">
                            Please check:
                            <ul className="list-disc list-inside mt-1">
                                <li>API server is running on {API_BASE_URL}</li>
                                <li>Database connection is working</li>
                                <li>MR name exists in customer_master table</li>
                                <li>Customers have latitude/longitude coordinates</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* Daily Route Results */}
                {dailyRoute && (
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Today's Optimized Route</h2>
                        
                        {/* Route Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="text-blue-600 text-sm font-medium">Total Customers</div>
                                <div className="text-2xl font-bold text-blue-700">{dailyRoute.total_customers}</div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                                <div className="text-green-600 text-sm font-medium">Est. Revenue</div>
                                <div className="text-2xl font-bold text-green-700">₹{dailyRoute.estimated_revenue?.toLocaleString()}</div>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-lg">
                                <div className="text-orange-600 text-sm font-medium">Travel Time</div>
                                <div className="text-2xl font-bold text-orange-700">{formatDuration(dailyRoute.estimated_travel_time)}</div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <div className="text-purple-600 text-sm font-medium">Efficiency</div>
                                <div className="text-2xl font-bold text-purple-700">{dailyRoute.route_efficiency} /hr</div>
                            </div>
                            <div className="bg-teal-50 p-4 rounded-lg">
                                <div className="text-teal-600 text-sm font-medium">Avg Urgency</div>
                                <div className="text-2xl font-bold text-teal-700">{dailyRoute.avg_urgency_score}</div>
                            </div>
                        </div>

                        {/* Route List */}
                        {dailyRoute.route && dailyRoute.route.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Order</th>
                                            <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Customer</th>
                                            <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Type</th>
                                            <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Area</th>
                                            <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Urgency</th>
                                            <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Est. Revenue</th>
                                            <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Order Prob.</th>
                                            <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Last Visit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {dailyRoute.route.map((customer, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full font-bold">
                                                        {index + 1}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-gray-900">{customer.customer_name}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        customer.customer_type === 'Doctor' ? 'bg-blue-100 text-blue-800' :
                                                        customer.customer_type === 'Stockist' ? 'bg-green-100 text-green-800' :
                                                        'bg-orange-100 text-orange-800'
                                                    }`}>
                                                        {customer.customer_type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{customer.area_name}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getUrgencyColor(customer.urgency_score)}`}>
                                                        {Math.round(customer.urgency_score)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center font-semibold">₹{customer.predicted_value?.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="font-semibold text-green-600">
                                                        {Math.round(customer.order_probability * 100)}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm">
                                                    {customer.days_since_visit ? `${customer.days_since_visit} days ago` : 'Never'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <div className="text-4xl mb-2">📍</div>
                                No route could be optimized. Check if customers have GPS coordinates.
                            </div>
                        )}
                    </div>
                )}

                {/* Weekly Routes Summary */}
                {weeklyRoutes && (
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Weekly Route Summary</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {Object.entries(weeklyRoutes).map(([day, route]) => (
                                <div key={day} className="border border-gray-200 rounded-lg p-4">
                                    <h3 className="font-bold text-gray-800 mb-2">{day}</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Customers:</span>
                                            <span className="font-semibold">{route.total_customers}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Travel:</span>
                                            <span className="font-semibold">{formatDuration(route.estimated_travel_time)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Revenue:</span>
                                            <span className="font-semibold text-green-600">₹{route.estimated_revenue?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-semibold text-blue-800 mb-2">Weekly Totals</h4>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-blue-700">
                                        {Object.values(weeklyRoutes).reduce((sum, day) => sum + day.total_customers, 0)}
                                    </div>
                                    <div className="text-sm text-blue-600">Total Visits</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-green-700">
                                        ₹{Object.values(weeklyRoutes).reduce((sum, day) => sum + day.estimated_revenue, 0).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-green-600">Total Revenue</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-orange-700">
                                        {formatDuration(Object.values(weeklyRoutes).reduce((sum, day) => sum + day.estimated_travel_time, 0))}
                                    </div>
                                    <div className="text-sm text-orange-600">Total Travel</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Customer List */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Available Customers for {mrName}</h2>
                    
                    {loading && customers.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading customer data...</p>
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <div className="text-4xl mb-2">🗺️</div>
                            No customers found with GPS coordinates for this MR.
                            <div className="mt-4 text-sm">
                                <p>Make sure:</p>
                                <ul className="list-disc list-inside mt-2">
                                    <li>MR name matches exactly in customer_master table</li>
                                    <li>Customers have latitude and longitude coordinates</li>
                                    <li>Customer status is ACTIVE</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto max-h-96 overflow-y-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Customer</th>
                                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Type</th>
                                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Area</th>
                                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Priority</th>
                                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Days Since Visit</th>
                                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Order Probability</th>
                                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Est. Value</th>
                                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Coordinates</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {customers.map((customer, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-semibold text-gray-900">{customer.customer_name}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    customer.customer_type === 'Doctor' ? 'bg-blue-100 text-blue-800' :
                                                    customer.customer_type === 'Stockist' ? 'bg-green-100 text-green-800' :
                                                    'bg-orange-100 text-orange-800'
                                                }`}>
                                                    {customer.customer_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{customer.area_name}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${getUrgencyColor(customer.urgency_score || customer.priority_score)}`}>
                                                    {Math.round(customer.urgency_score || customer.priority_score)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-semibold">
                                                {customer.days_since_visit !== null ? `${customer.days_since_visit} days` : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="font-semibold text-green-600">
                                                    {Math.round((customer.order_probability || 0.3) * 100)}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-semibold">₹{(customer.predicted_value || 3000).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-center text-xs">
                                                <div className="text-green-600">
                                                    {customer.latitude?.toFixed(4)}, {customer.longitude?.toFixed(4)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RouteOptimizationDashboard;
