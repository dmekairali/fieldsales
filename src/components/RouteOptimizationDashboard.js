import React, { useState, useEffect } from 'react';

const RouteOptimizationDashboard = ({ mrName }) => {
    const [customers, setCustomers] = useState([]);
    const [dailyRoute, setDailyRoute] = useState(null);
    const [weeklyRoutes, setWeeklyRoutes] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [optimizationParams, setOptimizationParams] = useState({
        maxVisits: 10,
        maxTravelTime: 240
    });

    // For demo purposes - replace with actual API calls once deployed
    const mockApiCall = async (endpoint, delay = 1000) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        
        if (endpoint === 'customers') {
            return {
                status: 'success',
                total_customers: 45,
                customers: [
                    {
                        customer_code: '9876543210',
                        customer_name: 'Dr. Rajesh Sharma',
                        customer_type: 'Doctor',
                        area_name: 'Gomti Nagar',
                        city_name: 'Lucknow',
                        priority_score: 85,
                        churn_risk: 0.3,
                        order_probability: 0.7,
                        predicted_value: 5000,
                        urgency_score: 78,
                        days_since_visit: 12,
                        latitude: 26.8467,
                        longitude: 80.9462
                    },
                    {
                        customer_code: '9876543211',
                        customer_name: 'Apollo Pharmacy',
                        customer_type: 'Retailer',
                        area_name: 'Hazratganj',
                        city_name: 'Lucknow',
                        priority_score: 72,
                        churn_risk: 0.5,
                        order_probability: 0.6,
                        predicted_value: 3500,
                        urgency_score: 65,
                        days_since_visit: 8,
                        latitude: 26.8486,
                        longitude: 80.9455
                    },
                    // Add more mock customers...
                ]
            };
        } else if (endpoint === 'optimize') {
            return {
                status: 'success',
                route_data: {
                    route: [
                        {
                            customer_code: '9876543210',
                            customer_name: 'Dr. Rajesh Sharma',
                            customer_type: 'Doctor',
                            area_name: 'Gomti Nagar',
                            urgency_score: 78,
                            predicted_value: 5000,
                            order_probability: 0.7
                        },
                        {
                            customer_code: '9876543211',
                            customer_name: 'Apollo Pharmacy',
                            customer_type: 'Retailer',
                            area_name: 'Hazratganj',
                            urgency_score: 65,
                            predicted_value: 3500,
                            order_probability: 0.6
                        },
                        // Add more optimized route...
                    ],
                    total_customers: 8,
                    estimated_travel_time: 180,
                    estimated_revenue: 28500,
                    route_efficiency: 2.7,
                    avg_urgency_score: 71.2
                }
            };
        } else if (endpoint === 'weekly') {
            return {
                status: 'success',
                weekly_routes: {
                    Monday: {
                        route: [],
                        total_customers: 9,
                        estimated_travel_time: 195,
                        estimated_revenue: 31200
                    },
                    Tuesday: {
                        route: [],
                        total_customers: 8,
                        estimated_travel_time: 172,
                        estimated_revenue: 25800
                    },
                    // Add other days...
                }
            };
        }
    };

    const fetchCustomers = async () => {
        setLoading(true);
        setError(null);
        try {
            // Replace with actual API call: const response = await fetch(`/api/route/customers/${mrName}`);
            const data = await mockApiCall('customers');
            setCustomers(data.customers || []);
        } catch (err) {
            setError('Failed to fetch customers');
            console.error('Error fetching customers:', err);
        } finally {
            setLoading(false);
        }
    };

    const optimizeDailyRoute = async () => {
        setLoading(true);
        setError(null);
        try {
            // Replace with actual API call:
            // const response = await fetch(`/api/route/optimize/${mrName}?max_visits=${optimizationParams.maxVisits}&max_travel_time=${optimizationParams.maxTravelTime}`);
            const data = await mockApiCall('optimize');
            setDailyRoute(data.route_data);
        } catch (err) {
            setError('Failed to optimize route');
            console.error('Error optimizing route:', err);
        } finally {
            setLoading(false);
        }
    };

    const generateWeeklyRoutes = async () => {
        setLoading(true);
        setError(null);
        try {
            // Replace with actual API call: const response = await fetch(`/api/route/weekly/${mrName}`);
            const data = await mockApiCall('weekly');
            setWeeklyRoutes(data.weekly_routes);
        } catch (err) {
            setError('Failed to generate weekly routes');
            console.error('Error generating weekly routes:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mrName) {
            fetchCustomers();
        }
    }, [mrName]);

    const getUrgencyColor = (score) => {
        if (score >= 75) return 'text-red-600 bg-red-100';
        if (score >= 50) return 'text-orange-600 bg-orange-100';
        return 'text-green-600 bg-green-100';
    };

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
                    </div>
                </div>

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
                                max="15"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Max Travel Time (min)</label>
                            <input
                                type="number"
                                value={optimizationParams.maxTravelTime}
                                onChange={(e) => setOptimizationParams({...optimizationParams, maxTravelTime: parseInt(e.target.value)})}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                min="120"
                                max="360"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={optimizeDailyRoute}
                                disabled={loading || customers.length === 0}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold"
                            >
                                🎯 Optimize Today's Route
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={generateWeeklyRoutes}
                                disabled={loading || customers.length === 0}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold"
                            >
                                📅 Generate Weekly Routes
                            </button>
                        </div>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
                        <div className="text-red-600 font-semibold">⚠️ {error}</div>
                    </div>
                )}

                {/* Daily Route Results */}
                {dailyRoute && (
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Today's Optimized Route</h2>
                        
                        {/* Route Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                                <div className="text-2xl font-bold text-orange-700">{Math.round(dailyRoute.estimated_travel_time)} min</div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <div className="text-purple-600 text-sm font-medium">Efficiency</div>
                                <div className="text-2xl font-bold text-purple-700">{dailyRoute.route_efficiency} /hr</div>
                            </div>
                        </div>

                        {/* Route List */}
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
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {dailyRoute.route?.map((customer, index) => (
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
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
                                            <span className="font-semibold">{Math.round(route.estimated_travel_time)} min</span>
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
                                        {Math.round(Object.values(weeklyRoutes).reduce((sum, day) => sum + day.estimated_travel_time, 0))} min
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
                    
                    {customers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <div className="text-4xl mb-2">🗺️</div>
                            {loading ? 'Loading customers...' : 'No customers found with GPS coordinates.'}
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
                                                {customer.days_since_visit || 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="font-semibold text-green-600">
                                                    {Math.round((customer.order_probability || 0.3) * 100)}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-semibold">₹{(customer.predicted_value || 3000).toLocaleString()}</td>
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
