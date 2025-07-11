// /src/components/MonthlyPlanDashboardV2.js
// Complete V2 dashboard updated for enhanced storage and decompression

import React, { useState, useEffect } from 'react';
import MonthlyPlanServiceV2 from '../services/MonthlyPlanServiceV2';
import MonthlyPlanDecompressionService from '../services/MonthlyPlanDecompressionService';

const MonthlyPlanDashboardV2 = ({ selectedMR, selectedMRName }) => {
    const [monthlyPlan, setMonthlyPlan] = useState(null);
    const [expandedPlan, setExpandedPlan] = useState(null);
    const [weeklyRevisions, setWeeklyRevisions] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRevising, setIsRevising] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState('overview');
    
    // Revision states
    const [revisionWeek, setRevisionWeek] = useState(1);
    const [actualPerformance, setActualPerformance] = useState({
        visits_completed: '',
        revenue_achieved: '',
        customers_visited: '',
        areas_covered: '',
        conversion_rate: '',
        missed_visits: '',
        missed_customers: '',
        revenue_gap: ''
    });
    const [revisionReason, setRevisionReason] = useState('');

    const planService = new MonthlyPlanServiceV2();
    const decompressionService = new MonthlyPlanDecompressionService();

    const monthNames = [
        '', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const mrName = selectedMR?.mrName || selectedMRName;

    // Load existing plan on component mount or when MR/month changes
    useEffect(() => {
        if (mrName && mrName !== 'ALL_MRS') {
            loadExistingPlan();
            loadWeeklyRevisions();
        }
    }, [mrName, selectedMonth, selectedYear]);

    const loadExistingPlan = async () => {
        try {
            setError(null);
            console.log(`🔍 [V2] Loading plan for ${mrName} - ${selectedMonth}/${selectedYear}`);
            
            // Try to get decompressed dashboard data first
            const dashboardData = await planService.getDashboardData(mrName, selectedMonth, selectedYear);
            
            if (dashboardData) {
                setMonthlyPlan({
                    id: dashboardData.metadata?.plan_id,
                    current_plan_json: {
                        mo: dashboardData.monthly_overview,
                        cvs: {}, // Will be populated when needed
                        ws: dashboardData.weekly_summary
                    },
                    thread_id: dashboardData.metadata?.thread_id,
                    tokens_used: dashboardData.metadata?.tokens_used,
                    generated_at: dashboardData.metadata?.generated_at,
                    plan_version: dashboardData.metadata?.plan_version
                });
                
                // Set expanded plan for display
                setExpandedPlan({
                    mo: dashboardData.monthly_overview,
                    customer_summary: dashboardData.customer_summary,
                    weekly_summary: dashboardData.weekly_summary,
                    summary_metrics: dashboardData.summary_metrics,
                    quick_stats: dashboardData.quick_stats
                });
                
                console.log('✅ Plan loaded successfully');
                console.log('📊 Plan structure:', {
                    customers: dashboardData.summary_metrics?.total_customers || 0,
                    visits: dashboardData.summary_metrics?.total_planned_visits || 0,
                    revenue: dashboardData.summary_metrics?.total_revenue_target || 0
                });
            } else {
                setMonthlyPlan(null);
                setExpandedPlan(null);
                console.log('ℹ️ No existing plan found');
            }
        } catch (error) {
            console.error('❌ Failed to load plan:', error);
            setError(`Failed to load plan: ${error.message}`);
        }
    };

    const loadWeeklyRevisions = async () => {
        // TODO: Implement when Phase 2 is ready
        setWeeklyRevisions([]);
    };

    const generateNewPlan = async () => {
        if (!mrName || mrName === 'ALL_MRS') {
            setError('Please select a specific MR first');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setSuccess(null);

        try {
            console.log(`🚀 [V2] Generating new plan for ${mrName}`);
            
            const result = await planService.generateEnhancedMonthlyPlan(mrName, selectedMonth, selectedYear);

            if (result.success) {
                // After generation, load the decompressed dashboard data
                const dashboardData = await planService.getDashboardData(mrName, selectedMonth, selectedYear);
                
                setMonthlyPlan({
                    id: result.plan_id,
                    current_plan_json: {
                        mo: dashboardData.monthly_overview,
                        cvs: {},
                        ws: dashboardData.weekly_summary
                    },
                    thread_id: result.thread_id,
                    tokens_used: result.tokens_used,
                    generated_at: result.generated_at,
                    plan_version: '2.0'
                });
                
                setExpandedPlan({
                    mo: dashboardData.monthly_overview,
                    customer_summary: dashboardData.customer_summary,
                    weekly_summary: dashboardData.weekly_summary,
                    summary_metrics: dashboardData.summary_metrics,
                    quick_stats: dashboardData.quick_stats
                });
                
                setSuccess(`Plan generated successfully! Plan ID: ${result.plan_id}`);
                setActiveTab('overview');
                
                console.log('✅ Plan generated successfully');
                console.log(`📊 V2 Metrics:`, {
                    customers: dashboardData.summary_metrics?.total_customers || 0,
                    visits: dashboardData.summary_metrics?.total_planned_visits || 0,
                    revenue: dashboardData.summary_metrics?.total_revenue_target || 0,
                    tokens: result.tokens_used,
                    thread_id: result.thread_id
                });
            } else {
                setError(result.error);
            }
        } catch (error) {
            console.error('❌ Plan generation failed:', error);
            setError(`Plan generation failed: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleWeeklyRevision = async () => {
        if (!monthlyPlan?.thread_id) {
            setError('No thread ID found. Cannot perform revision.');
            return;
        }

        if (!revisionReason.trim()) {
            setError('Please provide a reason for revision');
            return;
        }

        setIsRevising(true);
        setError(null);

        try {
            console.log(`📊 [V2] Performing weekly revision for Week ${revisionWeek}`);
            
            const revisionData = {
                thread_id: monthlyPlan.thread_id,
                week_number: revisionWeek,
                actual_performance: actualPerformance,
                revision_reason: revisionReason,
                mr_name: mrName,
                month: selectedMonth,
                year: selectedYear
            };

            const result = await planService.performWeeklyRevision(revisionData);

            if (result.success) {
                setSuccess(`Week ${revisionWeek} revision completed successfully!`);
                
                // Reload the updated plan
                await loadExistingPlan();
                await loadWeeklyRevisions();
                
                // Reset form
                setActualPerformance({
                    visits_completed: '',
                    revenue_achieved: '',
                    customers_visited: '',
                    areas_covered: '',
                    conversion_rate: '',
                    missed_visits: '',
                    missed_customers: '',
                    revenue_gap: ''
                });
                setRevisionReason('');
                
                console.log('✅ Weekly revision completed successfully');
            } else {
                setError(result.error);
            }
        } catch (error) {
            console.error('❌ Weekly revision failed:', error);
            setError(`Weekly revision failed: ${error.message}`);
        } finally {
            setIsRevising(false);
        }
    };

    // Helper function for backward compatibility
    const getPlanSummary = () => {
        if (expandedPlan?.summary_metrics) {
            return {
                total_customers: expandedPlan.summary_metrics.total_customers,
                total_areas: Object.keys(expandedPlan.summary_metrics.area_distribution || {}).length,
                total_visits: expandedPlan.summary_metrics.total_planned_visits,
                target_revenue: expandedPlan.summary_metrics.total_revenue_target
            };
        }
        return null;
    };

    const clearMessages = () => {
        setError(null);
        setSuccess(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-violet-700 text-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Monthly Tour Planning V2 Enhanced</h1>
                        <p className="text-violet-100 mt-2">
                            {mrName ? `Planning for ${mrName}` : 'Select an MR to get started'}
                        </p>
                    </div>
                    <div className="flex space-x-4">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="bg-white bg-opacity-20 text-white border border-white border-opacity-30 rounded-lg px-3 py-2"
                        >
                            {monthNames.slice(1).map((month, index) => (
                                <option key={index + 1} value={index + 1} className="text-gray-900">
                                    {month}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-white bg-opacity-20 text-white border border-white border-opacity-30 rounded-lg px-3 py-2"
                        >
                            {[2024, 2025, 2026].map(year => (
                                <option key={year} value={year} className="text-gray-900">
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={clearMessages} className="text-red-500 hover:text-red-700">×</button>
                </div>
            )}
            
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex justify-between items-center">
                    <span>{success}</span>
                    <button onClick={clearMessages} className="text-green-500 hover:text-green-700">×</button>
                </div>
            )}

            {/* Main Content */}
            <div className="space-y-6">
                {/* Monthly Plan Content */}
                {monthlyPlan && expandedPlan && (
                    <div className="space-y-6">
                        {/* Tab Navigation */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="border-b border-gray-200">
                                <nav className="-mb-px flex space-x-8 px-6">
                                    {[
                                        { id: 'overview', name: 'Overview', icon: '📊' },
                                        { id: 'customers', name: 'Customers', icon: '👥' },
                                        { id: 'weekly', name: 'Weekly Plans', icon: '📅' },
                                        { id: 'revision', name: 'Weekly Revision', icon: '🔄' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                                activeTab === tab.id
                                                    ? 'border-violet-500 text-violet-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            <span className="mr-2">{tab.icon}</span>
                                            {tab.name}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            {/* Tab Content */}
                            <div className="p-6">
                                {/* Overview Tab */}
                                {activeTab === 'overview' && (
                                    <div className="space-y-6">
                                        {/* Key Metrics Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl">
                                                <div className="text-3xl font-bold">{expandedPlan.mo.total_visits || 0}</div>
                                                <div className="text-blue-100">Total Visits Planned</div>
                                            </div>
                                            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl">
                                                <div className="text-3xl font-bold">₹{(expandedPlan.mo.target_revenue || 0).toLocaleString()}</div>
                                                <div className="text-green-100">Revenue Target</div>
                                            </div>
                                            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl">
                                                <div className="text-3xl font-bold">{expandedPlan.summary_metrics?.total_customers || 0}</div>
                                                <div className="text-purple-100">Total Customers</div>
                                            </div>
                                            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-xl">
                                                <div className="text-3xl font-bold">{expandedPlan.mo.working_days || 0}</div>
                                                <div className="text-orange-100">Working Days</div>
                                            </div>
                                        </div>

                                        {/* Strategy Summary */}
                                        {expandedPlan.mo.strategy_summary && (
                                            <div className="bg-violet-50 border border-violet-200 rounded-xl p-6">
                                                <h3 className="text-lg font-semibold text-violet-900 mb-3">Monthly Strategy</h3>
                                                <p className="text-violet-700">{expandedPlan.mo.strategy_summary}</p>
                                            </div>
                                        )}

                                        {/* Quick Stats */}
                                        {expandedPlan.quick_stats && (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="bg-gray-50 p-4 rounded-lg text-center">
                                                    <div className="text-2xl font-bold text-gray-900">{expandedPlan.quick_stats.customers_per_day}</div>
                                                    <div className="text-sm text-gray-600">Customers/Day</div>
                                                </div>
                                                <div className="bg-gray-50 p-4 rounded-lg text-center">
                                                    <div className="text-2xl font-bold text-gray-900">₹{expandedPlan.quick_stats.revenue_per_customer?.toLocaleString()}</div>
                                                    <div className="text-sm text-gray-600">Revenue/Customer</div>
                                                </div>
                                                <div className="bg-gray-50 p-4 rounded-lg text-center">
                                                    <div className="text-2xl font-bold text-gray-900">{expandedPlan.quick_stats.areas_covered}</div>
                                                    <div className="text-sm text-gray-600">Areas Covered</div>
                                                </div>
                                                <div className="bg-gray-50 p-4 rounded-lg text-center">
                                                    <div className="text-2xl font-bold text-gray-900">{expandedPlan.quick_stats.highest_tier_count}</div>
                                                    <div className="text-sm text-gray-600">Top Tier Customers</div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Tier Distribution */}
                                        {expandedPlan.summary_metrics?.tier_distribution && (
                                            <div className="bg-white border border-gray-200 rounded-xl p-6">
                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tier Distribution</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {Object.entries(expandedPlan.summary_metrics.tier_distribution).map(([tier, data]) => (
                                                        <div key={tier} className="bg-gray-50 p-4 rounded-lg">
                                                            <div className="font-semibold text-gray-900">{tier}</div>
                                                            <div className="text-sm text-gray-600 mt-1">
                                                                <div>{data.count} customers</div>
                                                                <div>{data.visits} visits</div>
                                                                <div>₹{data.revenue.toLocaleString()} revenue</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Customers Tab */}
                                {activeTab === 'customers' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Customer Schedule</h3>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Planned Visits</th>
                                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Visit Dates</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {expandedPlan.customer_summary?.slice(0, 20).map((customer, index) => (
                                                        <tr key={customer.customer_code || index} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 font-medium text-gray-900">{customer.customer_name}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                                                    {customer.customer_type}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                                                                    customer.tier_level === 'TIER_2_PERFORMER' ? 'bg-purple-100 text-purple-800' :
                                                                    customer.tier_level === 'TIER_3_DEVELOPER' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-green-100 text-green-800'
                                                                }`}>
                                                                    {customer.tier_level?.replace('TIER_', 'T').replace('_', ' ')}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-sm text-gray-600">{customer.area_name}</td>
                                                            <td className="px-4 py-3 text-center font-semibold">{customer.total_visits}</td>
                                                            <td className="px-4 py-3 text-center font-semibold">₹{customer.estimated_revenue?.toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-center text-sm text-gray-600">
                                                                {customer.visit_dates?.slice(0, 3).join(', ')}
                                                                {customer.visit_dates?.length > 3 && '...'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {expandedPlan.customer_summary?.length > 20 && (
                                            <div className="text-center text-gray-500 text-sm">
                                                Showing first 20 customers. Total: {expandedPlan.summary_metrics?.total_customers} customers
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Weekly Plans Tab */}
                                {activeTab === 'weekly' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Weekly Strategic Plans</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {expandedPlan.weekly_summary?.map((week, index) => (
                                                <div key={week.week_number || index} className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <h4 className="text-lg font-semibold text-gray-900">Week {week.week_number}</h4>
                                                        <span className="text-sm text-gray-500">{week.dates?.join(' - ')}</span>
                                                    </div>
                                                    
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <div className="text-sm text-gray-600">Customers</div>
                                                                <div className="text-lg font-semibold">{week.customers}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-sm text-gray-600">Revenue Target</div>
                                                                <div className="text-lg font-semibold">₹{week.revenue_target?.toLocaleString()}</div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="bg-white p-3 rounded-lg">
                                                            <div className="text-sm text-gray-600 mb-1">Strategic Focus</div>
                                                            <div className="text-sm font-medium text-gray-900">{week.focus}</div>
                                                        </div>
                                                        
                                                        {week.expanded_data?.area_coverage && (
                                                            <div>
                                                                <div className="text-sm text-gray-600 mb-1">Areas</div>
                                                                <div className="text-sm text-gray-900">
                                                                    {week.expanded_data.area_coverage.slice(0, 3).join(', ')}
                                                                    {week.expanded_data.area_coverage.length > 3 && ` +${week.expanded_data.area_coverage.length - 3} more`}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Weekly Revision Tab */}
                                {activeTab === 'revision' && (
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-semibold text-gray-900">Weekly Performance Revision</h3>
                                        
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <div className="text-sm text-blue-700">
                                                <strong>Thread ID:</strong> {monthlyPlan.thread_id || 'Not available'}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Week Number</label>
                                                <select
                                                    value={revisionWeek}
                                                    onChange={(e) => setRevisionWeek(parseInt(e.target.value))}
                                                    className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                                                >
                                                    {[1, 2, 3, 4].map(week => (
                                                        <option key={week} value={week}>Week {week}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Visits Completed</label>
                                                    <input
                                                        type="number"
                                                        value={actualPerformance.visits_completed}
                                                        onChange={(e) => setActualPerformance(prev => ({...prev, visits_completed: e.target.value}))}
                                                        className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Revenue Achieved</label>
                                                    <input
                                                        type="number"
                                                        value={actualPerformance.revenue_achieved}
                                                        onChange={(e) => setActualPerformance(prev => ({...prev, revenue_achieved: e.target.value}))}
                                                        className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Revision Reason</label>
                                                <textarea
                                                    value={revisionReason}
                                                    onChange={(e) => setRevisionReason(e.target.value)}
                                                    className="border border-gray-300 rounded-lg px-3 py-2 w-full h-24"
                                                    placeholder="Explain why this revision is needed..."
                                                />
                                            </div>

                                            <button
                                                onClick={handleWeeklyRevision}
                                                disabled={isRevising}
                                                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                                            >
                                                {isRevising ? '🔄 Processing Revision...' : '🔄 Perform Revision'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {isGenerating && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-100 rounded-full mb-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating V2 Enhanced Monthly Plan</h3>
                            <p className="text-gray-600 mb-4">
                                AI is analyzing {mrName}'s territory using the new enhanced format...
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
                                <div className="text-sm text-gray-700 space-y-2">
                                    <div>🔍 Ultra-compressing customer data (85% token reduction)</div>
                                    <div>🤖 Generating complete visit schedule with AI</div>
                                    <div>📅 Creating comprehensive plan structure</div>
                                    <div>🗺️ Building decompression data for analysis</div>
                                    <div>🧵 Setting up persistent thread for revisions</div>
                                    <div>💾 Storing enhanced plan for multiple views</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* No Plan State */}
                {!monthlyPlan && !isGenerating && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">🚀</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No V2 Enhanced Monthly Plan Found</h3>
                            <p className="text-gray-600 mb-6">
                                Generate a new V2 enhanced monthly plan for {mrName} for {monthNames[selectedMonth]} {selectedYear}
                            </p>
                            <button
                                onClick={generateNewPlan}
                                disabled={!mrName || mrName === 'ALL_MRS'}
                                className="px-6 py-3 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                🚀 Generate V2 Enhanced Monthly Plan
                            </button>
                            <div className="mt-4 text-sm text-gray-500">
                                <div className="space-y-1">
                                    <div>✨ Enhanced Features:</div>
                                    <div>• Ultra-compressed input (85% token reduction)</div>
                                    <div>• Complete AI-generated visit schedule</div>
                                    <div>• Comprehensive storage for multiple views</div>
                                    <div>• Advanced decompression & analytics</div>
                                    <div>• Export capabilities & reporting</div>
                                </div>
                            </div>
                            
                            {(!mrName || mrName === 'ALL_MRS') && (
                                <div className="mt-4 text-sm text-red-600">
                                    ⚠️ Please select a specific MR to generate a plan
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer with Plan Info */}
            {monthlyPlan && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center text-sm text-gray-600">
                        <div className="space-x-4">
                            <span>Plan ID: {monthlyPlan.id}</span>
                            <span>Version: {monthlyPlan.plan_version}</span>
                            <span>Generated: {new Date(monthlyPlan.generated_at).toLocaleDateString()}</span>
                        </div>
                        <div className="space-x-4">
                            <span>Tokens Used: {monthlyPlan.tokens_used}</span>
                            <span>Thread ID: {monthlyPlan.thread_id?.substring(0, 12)}...</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonthlyPlanDashboardV2;
