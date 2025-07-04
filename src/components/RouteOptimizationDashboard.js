import React, { useState, useEffect } from 'react';

const RouteOptimizationDashboard = ({ mrName, mrData }) => {
    const [customers, setCustomers] = useState([]);
    const [dailyRoute, setDailyRoute] = useState(null);
    const [weeklyRoutes, setWeeklyRoutes] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [debugInfo, setDebugInfo] = useState({});
    const [optimizationParams, setOptimizationParams] = useState({
        maxVisits: 10,
        maxTravelTime: 240
    });

    // API base URL with fallback and debugging
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 
                        (window.location.hostname === 'localhost' ? 'http://localhost:8000' : window.location.origin);

    // Debug info on component mount
    useEffect(() => {
        const debug = {
            hostname: window.location.hostname,
            origin: window.location.origin,
            envApiUrl: process.env.REACT_APP_API_BASE_URL,
            finalApiUrl: API_BASE_URL,
            nodeEnv: process.env.NODE_ENV
        };
        setDebugInfo(debug);
        console.log('🔍 Route Dashboard Debug Info:', debug);
    }, []);

    useEffect(() => {
        if (mrName) {
            console.log(`🔄 MR changed to: ${mrName}, fetching customers...`);
            fetchCustomers();
        }
    }, [mrName]);

    const testAPIConnection = async () => {
        const healthUrl = `${API_BASE_URL}/health`;
        console.log('🏥 Testing API health at:', healthUrl);
        
        try {
            const response = await fetch(healthUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            console.log('🏥 Health check response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ API Health Check Success:', data);
                return { success: true, data };
            } else {
                const errorText = await response.text();
                console.error('❌ Health check failed:', errorText);
                return { success: false, error: `HTTP ${response.status}: ${errorText}` };
            }
        } catch (error) {
            console.error('❌ Health check error:', error);
            return { success: false, error: error.message };
        }
    };

    const fetchCustomers = async () => {
        if (!mrName) {
            setError('Please select an MR first');
            return;
        }

        setLoading(true);
        setError(null);
        
        // First test API connection
        console.log('🔍 Testing API connection before fetching customers...');
        const healthCheck = await testAPIConnection();
        
        if (!healthCheck.success) {
            setError(`API Connection Failed: ${healthCheck.error}`);
            setLoading(false);
            return;
        }

        const apiUrl = `${API_BASE_URL}/api/route/customers/${encodeURIComponent(mrName)}`;
        console.log('🔍 Fetching customers from:', apiUrl);
        
        try {
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
               // signal: AbortSignal.timeout(15000) // 15 second timeout
            });

            console.log('📡 Customer fetch response status:', response.status);
            console.log('📡 Response URL:', response.url);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error Response:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log('✅ Customer data received:', data);
            
            if (data.status === 'success') {
                setCustomers(data.customers || []);
                console.log(`✅ Successfully loaded ${data.customers?.length || 0} customers for ${mrName}`);
            } else {
                throw new Error(data.message || 'API returned error status');
            }
        } catch (err) {
            console.error('❌ Fetch customers error:', err);
            
            let errorMessage = 'Unknown error occurred';
            
            if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
                errorMessage = `Cannot connect to API server at ${API_BASE_URL}. Please check:\n` +
                              `1. API server is running\n` +
                              `2. Correct API URL in environment variables\n` +
                              `3. CORS is configured properly\n` +
                              `4. Network connectivity`;
            } else if (err.name === 'TimeoutError') {
                errorMessage = 'Request timed out. API server may be slow or unresponsive.';
            } else if (err.message.includes('HTTP 404')) {
                errorMessage = 'API endpoint not found. Check if the route exists.';
            } else if (err.message.includes('HTTP 500')) {
                errorMessage = 'Internal server error. Check API logs.';
            } else {
                errorMessage = `API Error: ${err.message}`;
            }
            
            setError(errorMessage);
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
            const url = `${API_BASE_URL}/api/route/optimize/${encodeURIComponent(mrName)}?` +
                       `max_visits=${optimizationParams.maxVisits}&` +
                       `max_travel_time=${optimizationParams.maxTravelTime}`;
            
            console.log('🎯 Optimizing route:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(30000) // 30 second timeout for optimization
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            
            if (data.status === 'success') {
                setDailyRoute(data.route_data);
                console.log('✅ Route optimization successful:', data.route_data);
            } else {
                throw new Error(data.message || 'Route optimization failed');
            }
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
            const url = `${API_BASE_URL}/api/route/weekly/${encodeURIComponent(mrName)}`;
            console.log('📅 Generating weekly routes:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(45000) // 45 second timeout for weekly generation
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            
            if (data.status === 'success') {
                setWeeklyRoutes(data.weekly_routes);
                console.log('✅ Weekly routes generated:', data.weekly_routes);
            } else {
                throw new Error(data.message || 'Weekly route generation failed');
            }
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
                        
                        {/* Debug Info Panel */}
                        <div className="mt-8 bg-gray-100 p-4 rounded-lg max-w-md mx-auto">
                            <h3 className="font-semibold text-gray-800 mb-2">Debug Info</h3>
                            <div className="text-xs text-gray-600 space-y-1 text-left">
                                <div><strong>API URL:</strong> {debugInfo.finalApiUrl}</div>
                                <div><strong>Environment:</strong> {debugInfo.nodeEnv}</div>
                                <div><strong>Hostname:</strong> {debugInfo.hostname}</div>
                            </div>
                        </div>
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

                {/* Debug Panel (only show if there are errors) */}
                {error && (
                    <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <span className="text-yellow-500 text-xl">🔧</span>
                            <div className="flex-1">
                                <h3 className="font-semibold text-yellow-800 mb-2">Debug Information</h3>
                                <div className="text-sm text-yellow-700 space-y-1">
                                    <div><strong>API Base URL:</strong> {debugInfo.finalApiUrl}</div>
                                    <div><strong>Environment:</strong> {debugInfo.nodeEnv || 'undefined'}</div>
                                    <div><strong>Test URL:</strong> {debugInfo.finalApiUrl}/api/health</div>
                                </div>
                                <button 
                                    onClick={testAPIConnection}
                                    className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
                                >
                                    Test API Connection
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
                            <div className="text-red-600 font-semibold">Connection Error</div>
                        </div>
                        <div className="mt-2 text-red-600 text-sm whitespace-pre-line">
                            {error}
                        </div>
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={testAPIConnection}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                            >
                                Test API Connection
                            </button>
                            <button
                                onClick={fetchCustomers}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                {/* Rest of your existing components... */}
                {/* Customer List, Route Results, etc. */}
                {customers.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Available Customers for {mrName}</h2>
                        <div className="text-sm text-gray-600 mb-4">
                            Found {customers.length} customers with GPS coordinates
                        </div>
                        {/* Add your customer table here */}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RouteOptimizationDashboard;
