import { routeOptimizer } from '../services/RouteOptimizer';

const RouteOptimizationDashboard = ({ mrName, mrData }) => {
    const [customers, setCustomers] = useState([]);
    const [dailyRoute, setDailyRoute] = useState(null);
    const [weeklyRoutes, setWeeklyRoutes] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedDays, setExpandedDays] = useState({});
    const [activeTab, setActiveTab] = useState('weekly');
    const [optimizationParams, setOptimizationParams] = useState({
        maxVisits: 10,
        maxTravelTime: 240,
        prioritizeUrgency: true,
        includeReturnTime: true
    });

    // Clear all data when MR changes
    useEffect(() => {
        if (mrName) {
            console.log(`🔄 MR changed to: ${mrName}, clearing existing data...`);
            // Clear all existing data
            setCustomers([]);
            setDailyRoute(null);
            setWeeklyRoutes(null);
            setError(null);
            setExpandedDays({});
            setActiveTab('weekly');
            
            // Fetch new data
            fetchCustomers();
        } else {
            // Clear everything if no MR selected
            setCustomers([]);
            setDailyRoute(null);
            setWeeklyRoutes(null);
            setError(null);
            setExpandedDays({});
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
            setActiveTab('daily');
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
            setActiveTab('weekly');
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
        if (score >= 75) return 'bg-red-100 text-red-700 border-red-200';
        if (score >= 50) return 'bg-orange-100 text-orange-700 border-orange-200';
        return 'bg-green-100 text-green-700 border-green-200';
    };

    const getPriorityColor = (score) => {
        if (score >= 80) return 'bg-purple-100 text-purple-700 border-purple-200';
        if (score >= 60) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (score >= 40) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const getChurnRiskColor = (risk) => {
        if (risk >= 0.7) return 'bg-red-100 text-red-700 border-red-200';
        if (risk >= 0.4) return 'bg-orange-100 text-orange-700 border-orange-200';
        return 'bg-green-100 text-green-700 border-green-200';
    };

    const formatDuration = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    };

    const formatDistance = (km) => {
        return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
    };

    const formatCurrency = (amount) => {
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
        return `₹${amount.toLocaleString()}`;
    };

    if (!mrName) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center py-20">
                        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">🗺️</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">AI Route Optimization</h2>
                        <p className="text-gray-600 text-lg mb-8">Select an MR from the dropdown to start intelligent route planning</p>
                        
                        <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
                            <h3 className="text-xl font-semibold text-gray-800 mb-6">✨ Intelligent Features</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <span className="text-blue-600 font-bold">AI</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Performance-Based Prioritization</h4>
                                        <p className="text-sm text-gray-600">Customers ranked by urgency, churn risk, and revenue potential</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <span className="text-green-600">🎯</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Geographic Optimization</h4>
                                        <p className="text-sm text-gray-600">TSP algorithms minimize travel time and maximize efficiency</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <span className="text-purple-600">📊</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Predictive Analytics</h4>
                                        <p className="text-sm text-gray-600">Revenue forecasting and churn prevention strategies</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <span className="text-orange-600">📅</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Smart Weekly Planning</h4>
                                        <p className="text-sm text-gray-600">Balanced workload distribution across 6 working days</p>
                                    </div>
                                </div>
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
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                🗺️ Route Optimization Dashboard
                            </h1>
                            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="font-medium">{mrName}</span>
                                </div>
                                <div className="text-gray-400">•</div>
                                <span>{customers.length} Customers Available</span>
                                {mrData?.territory && (
                                    <>
                                        <div className="text-gray-400">•</div>
                                        <span>Territory: {mrData.territory}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchCustomers}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                <span className={loading ? 'animate-spin' : ''}>🔄</span>
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Optimization Parameters</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Max Visits per Day</label>
                            <input
                                type="number"
                                value={optimizationParams.maxVisits}
                                onChange={(e) => setOptimizationParams(prev => ({
                                    ...prev, 
                                    maxVisits: parseInt(e.target.value)
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                min="5" max="20"
                            />
                            <p className="text-xs text-gray-500 mt-1">5-20 visits recommended</p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Max Travel Time (minutes)</label>
                            <input
                                type="number"
                                value={optimizationParams.maxTravelTime}
                                onChange={(e) => setOptimizationParams(prev => ({
                                    ...prev, 
                                    maxTravelTime: parseInt(e.target.value)
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                min="120" max="480"
                            />
                            <p className="text-xs text-gray-500 mt-1">2-8 hours travel time</p>
                        </div>

                        <div>
                            <button
                                onClick={optimizeDailyRoute}
                                disabled={loading || customers.length === 0}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin">🔄</span>
                                        Optimizing...
                                    </>
                                ) : (
                                    <>
                                        🎯 Daily Route
                                    </>
                                )}
                            </button>
                        </div>

                        <div>
                            <button
                                onClick={generateWeeklyRoutes}
                                disabled={loading || customers.length === 0}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin">🔄</span>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        📅 Weekly Routes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <div className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5">⚠️</div>
                            <div>
                                <h3 className="text-sm font-medium text-red-800">Error</h3>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab Navigation */}
                {(weeklyRoutes || dailyRoute) && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                        <div className="border-b border-gray-200">
                            <nav className="flex space-x-8 px-6">
                                <button
                                    onClick={() => setActiveTab('weekly')}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'weekly'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    📅 Weekly Routes
                                    {weeklyRoutes && (
                                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {weeklyRoutes.weekly_summary.total_customers_week} customers
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('daily')}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'daily'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    🎯 Daily Route
                                    {dailyRoute && (
                                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            {dailyRoute.total_customers} customers
                                        </span>
                                    )}
                                </button>
                            </nav>
                        </div>

                        {/* Tab Content */}
                        <div className="p-6">
                            {activeTab === 'weekly' && weeklyRoutes && (
                                <div>
                                    {/* Weekly Summary */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Weekly Performance Summary</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-blue-600">{weeklyRoutes.weekly_summary.total_customers_week}</div>
                                                <div className="text-sm text-gray-600">Total Customers</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-green-600">{formatCurrency(weeklyRoutes.weekly_summary.total_estimated_revenue)}</div>
                                                <div className="text-sm text-gray-600">Est. Revenue</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-orange-600">{formatDuration(weeklyRoutes.weekly_summary.total_travel_time)}</div>
                                                <div className="text-sm text-gray-600">Total Travel</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-purple-600">{weeklyRoutes.weekly_summary.avg_customers_per_day}</div>
                                                <div className="text-sm text-gray-600">Avg/Day</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-indigo-600">{weeklyRoutes.weekly_summary.efficiency_score}</div>
                                                <div className="text-sm text-gray-600">Efficiency</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Daily Routes Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {Object.entries(weeklyRoutes.weekly_routes).map(([day, route]) => (
                                            <div key={day} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                                <div className="p-4 border-b border-gray-100">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="font-semibold text-gray-900">{day}</h4>
                                                        <div className="text-xs text-gray-500">{route.planned_date}</div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-3 gap-3 text-center">
                                                        <div>
                                                            <div className="text-lg font-bold text-blue-600">{route.total_customers}</div>
                                                            <div className="text-xs text-gray-500">Customers</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-lg font-bold text-green-600">{formatCurrency(route.estimated_revenue)}</div>
                                                            <div className="text-xs text-gray-500">Revenue</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-lg font-bold text-orange-600">{formatDuration(route.total_travel_time)}</div>
                                                            <div className="text-xs text-gray-500">Travel</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-4">
                                                    {route.route && route.route.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {route.route.slice(0, expandedDays[day] ? route.route.length : 3).map((customer, index) => (
                                                                <div key={customer.customer_code} className="bg-gray-50 rounded-lg p-3">
                                                                    <div className="flex items-start justify-between">
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="font-medium text-gray-900 text-sm truncate">{customer.customer_name}</div>
                                                                            <div className="text-xs text-gray-500 truncate">{customer.customer_type} • {customer.area_name}</div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 ml-3">
                                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(customer.priority_score)}`}>
                                                                                P{customer.priority_score}
                                                                            </span>
                                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(customer.urgency_score)}`}>
                                                                                U{Math.round(customer.urgency_score)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="mt-2 flex items-center justify-between">
                                                                        <span className="text-xs font-medium text-green-600">{formatCurrency(customer.expected_revenue || 0)}</span>
                                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getChurnRiskColor(customer.churn_risk)}`}>
                                                                            Risk: {Math.round(customer.churn_risk * 100)}%
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {route.route.length > 3 && (
                                                                <button
                                                                    onClick={() => toggleDayExpansion(day)}
                                                                    className="w-full text-center text-sm text-blue-600 hover:text-blue-800 py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                                                                >
                                                                    {expandedDays[day] 
                                                                        ? 'Show Less' 
                                                                        : `+${route.route.length - 3} more customers`
                                                                    }
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center text-gray-500 py-6">
                                                            <div className="text-2xl mb-2">📅</div>
                                                            <div className="text-sm">No customers scheduled</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'daily' && dailyRoute && (
                                <div>
                                    {/* Daily Route Header */}
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900">🎯 Optimized Daily Route</h3>
                                        <div className="flex items-center gap-4">
                                            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                                                Score: {dailyRoute.optimization_score}/100
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Algorithm: {dailyRoute.algorithm_used?.replace(/_/g, ' ')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Daily Route Metrics */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                                            <div className="text-2xl font-bold text-blue-600">{dailyRoute.total_customers}</div>
                                            <div className="text-sm text-blue-600 font-medium">Customers</div>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-4 text-center">
                                            <div className="text-2xl font-bold text-green-600">{formatCurrency(dailyRoute.estimated_revenue)}</div>
                                            <div className="text-sm text-green-600 font-medium">Revenue</div>
                                        </div>
                                        <div className="bg-orange-50 rounded-lg p-4 text-center">
                                            <div className="text-2xl font-bold text-orange-600">{formatDuration(dailyRoute.total_travel_time)}</div>
                                            <div className="text-sm text-orange-600 font-medium">Travel</div>
                                        </div>
                                        <div className="bg-purple-50 rounded-lg p-4 text-center">
                                            <div className="text-2xl font-bold text-purple-600">{formatDistance(dailyRoute.total_distance)}</div>
                                            <div className="text-sm text-purple-600 font-medium">Distance</div>
                                        </div>
                                        <div className="bg-indigo-50 rounded-lg p-4 text-center">
                                            <div className="text-2xl font-bold text-indigo-600">{dailyRoute.route_efficiency.toFixed(1)}</div>
                                            <div className="text-sm text-indigo-600 font-medium">Efficiency</div>
                                        </div>
                                        <div className="bg-pink-50 rounded-lg p-4 text-center">
                                            <div className="text-2xl font-bold text-pink-600">{formatCurrency(dailyRoute.revenue_per_hour)}/hr</div>
                                            <div className="text-sm text-pink-600 font-medium">Revenue Rate</div>
                                        </div>
                                    </div>

                                    {/* Daily Route Table */}
                                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-48">Customer</th>
                                                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Type</th>
                                                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Priority</th>
                                                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Urgency</th>
                                                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Churn Risk</th>
                                                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Visit History</th>
                                                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Visit Time</th>
                                                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Travel</th>
                                                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Revenue</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {dailyRoute.route.map((customer, index) => (
                                                        <tr key={customer.customer_code} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                            <td className="px-3 py-4 text-center">
                                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-sm">
                                                                    {customer.route_position}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <div className="font-medium text-gray-900 text-sm">{customer.customer_name}</div>
                                                                <div className="text-xs text-gray-500">{customer.area_name}</div>
                                                            </td>
                                                            <td className="px-3 py-4 text-center">
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                                    {customer.customer_type}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-4 text-center">
                                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border ${getPriorityColor(customer.priority_score)}`}>
                                                                    {customer.priority_score}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-4 text-center">
                                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border ${getUrgencyColor(customer.urgency_score)}`}>
                                                                    {Math.round(customer.urgency_score)}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-4 text-center">
                                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border ${getChurnRiskColor(customer.churn_risk)}`}>
                                                                    {Math.round(customer.churn_risk * 100)}%
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-4 text-center">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {customer.visit_start_time && customer.visit_end_time ? (
                                                                        <>
                                                                            {customer.visit_start_time} - {customer.visit_end_time}
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-gray-400">-</span>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    ({customer.estimated_visit_time || 35}m visit)
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-4 text-center">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {formatDuration(customer.travel_time_from_previous || 0)}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {formatDistance(customer.distance_from_previous || 0)}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-4 text-center">
                                                                <div className="font-semibold text-green-600 text-sm">
                                                                    {formatCurrency(customer.expected_revenue || 0)}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {Math.round((customer.order_probability || 0) * 100)}% prob
                                                                </div>
                                                                <div className="text-xs text-gray-400">
                                                                    Pred: {formatCurrency(customer.predicted_order_value || customer.predicted_value || 0)}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Customer List Preview */}
                {customers.length > 0 && !dailyRoute && !weeklyRoutes && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">📋 Available Customers</h2>
                            <div className="text-sm text-gray-500">
                                {customers.length} customers ready for optimization
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {customers.slice(0, 12).map((customer, index) => (
                                <div key={customer.customer_code} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 text-sm truncate">{customer.customer_name}</div>
                                            <div className="text-xs text-gray-500 truncate">{customer.customer_type} • {customer.area_name}</div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ml-2 ${customer.customer_segment === 'VIP' ? 'bg-purple-100 text-purple-700 border-purple-200' : 
                                            customer.customer_segment === 'HIGH_VALUE' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                            'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                            {customer.customer_segment}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Priority:</span>
                                            <span className={`px-1.5 py-0.5 rounded font-medium ${getPriorityColor(customer.priority_score)}`}>
                                                {customer.priority_score}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Urgency:</span>
                                            <span className={`px-1.5 py-0.5 rounded font-medium ${getUrgencyColor(customer.urgency_score)}`}>
                                                {Math.round(customer.urgency_score)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Revenue:</span>
                                            <span className="font-medium text-green-600">{formatCurrency(customer.predicted_value)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Risk:</span>
                                            <span className={`px-1.5 py-0.5 rounded font-medium ${getChurnRiskColor(customer.churn_risk)}`}>
                                                {Math.round(customer.churn_risk * 100)}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                        <div className="text-xs text-gray-500">
                                            Last visit: {customer.days_since_last_visit < 999 
                                                ? `${customer.days_since_last_visit} days ago`
                                                : 'Never visited'
                                            }
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {customers.length > 12 && (
                            <div className="text-center mt-6 pt-6 border-t border-gray-200">
                                <div className="text-sm text-gray-500">
                                    +{customers.length - 12} more customers available for optimization
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                    Use the optimization buttons above to generate routes for all customers
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Loading Overlay */}
                {loading && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-8 text-center max-w-sm mx-4">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-blue-200 rounded-full mx-auto mb-4"></div>
                                <div className="w-16 h-16 border-4 border-blue-600 rounded-full animate-spin absolute top-0 left-1/2 transform -translate-x-1/2 border-t-transparent"></div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Optimizing Routes</h3>
                            <p className="text-gray-600 text-sm">
                                Using AI algorithms to find the best customer sequence...
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RouteOptimizationDashboard;
