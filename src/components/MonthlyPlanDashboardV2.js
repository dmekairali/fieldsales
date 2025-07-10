// /src/components/MonthlyPlanDashboardV2.js
// Phase 1: Dashboard for new monthly planning system

import React, { useState, useEffect } from 'react';
import MonthlyPlanServiceV2 from '../services/MonthlyPlanServiceV2';

const MonthlyPlanDashboardV2 = ({ selectedMR }) => {
    const [monthlyPlan, setMonthlyPlan] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState('overview');
    const [expandedPlan, setExpandedPlan] = useState(null);

    const planService = new MonthlyPlanServiceV2();

    const monthNames = [
        '', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Load existing plan on component mount or when MR/month changes
    useEffect(() => {
        if (selectedMR?.mrName) {
            loadExistingPlan();
        }
    }, [selectedMR, selectedMonth, selectedYear]);

    const loadExistingPlan = async () => {
        try {
            console.log(`🔍 Loading plan for ${selectedMR.mrName} - ${selectedMonth}/${selectedYear}`);
            const plan = await planService.getMonthlyPlan(selectedMR.mrName, selectedMonth, selectedYear);
            
            if (plan) {
                setMonthlyPlan(plan);
                const expanded = planService.expandPlanForDisplay(plan.current_plan_json);
                setExpandedPlan(expanded);
                console.log('✅ Plan loaded successfully');
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

    const generateNewPlan = async () => {
        if (!selectedMR?.mrName) {
            setError('Please select an MR first');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            console.log(`🚀 Generating new plan for ${selectedMR.mrName}`);
            
            const result = await planService.generateMonthlyPlan(
                selectedMR.mrName, 
                selectedMonth, 
                selectedYear
            );

            if (result.success) {
                setMonthlyPlan({
                    id: result.plan_id,
                    current_plan_json: result.plan,
                    thread_id: result.thread_id,
                    tokens_used: result.tokens_used,
                    generated_at: result.generated_at
                });
                
                const expanded = planService.expandPlanForDisplay(result.plan);
                setExpandedPlan(expanded);
                
                console.log('✅ Plan generated successfully');
                console.log(`📊 Metrics:`, {
                    customers: Object.keys(result.plan.cvs || {}).length,
                    areas: Object.keys(result.plan.avs || {}).length,
                    tokens: result.tokens_used
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

    const formatDateReadable = (ddmmDate) => {
        if (!ddmmDate || ddmmDate.length !== 4) return ddmmDate;
        const day = ddmmDate.substring(0, 2);
        const month = ddmmDate.substring(2, 4);
        return `${day}/${month}`;
    };

    const getPlanSummary = () => {
        if (!expandedPlan) return null;
        return planService.getPlanSummary(expandedPlan);
    };

    const getCustomerVisitsForDate = (targetDate) => {
        if (!expandedPlan) return [];
        return planService.getCustomerVisitsForDate(expandedPlan, targetDate);
    };

    if (!selectedMR) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                            <span className="text-3xl text-white">📅</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Monthly Tour Planning V2</h2>
                        <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
                            Advanced AI-powered monthly planning with customer-date grouping and optimized token usage
                        </p>
                        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl mx-auto border border-gray-100">
                            <h3 className="text-xl font-semibold text-gray-900 mb-8">Select an MR to get started</h3>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 rounded-t-xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-bold">Monthly Tour Planning V2</h1>
                                <p className="text-indigo-100 mt-2">
                                    AI-powered planning for {selectedMR.mrName} - {monthNames[selectedMonth]} {selectedYear}
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="bg-white text-gray-900 px-3 py-2 rounded-lg"
                                >
                                    {monthNames.slice(1).map((name, index) => (
                                        <option key={index + 1} value={index + 1}>{name}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="bg-white text-gray-900 px-3 py-2 rounded-lg"
                                >
                                    <option value={2024}>2024</option>
                                    <option value={2025}>2025</option>
                                    <option value={2026}>2026</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Generation Controls */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={generateNewPlan}
                                    disabled={isGenerating}
                                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                                        isGenerating
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
                                    }`}
                                >
                                    {isGenerating ? '🤖 Generating...' : '🚀 Generate New Plan'}
                                </button>
                                
                                <button
                                    onClick={loadExistingPlan}
                                    className="px-6 py-3 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                                >
                                    🔄 Refresh
                                </button>
                            </div>

                            {monthlyPlan && (
                                <div className="text-sm text-gray-500">
                                    <div>Plan ID: {monthlyPlan.id}</div>
                                    <div>Generated: {new Date(monthlyPlan.generated_at).toLocaleString()}</div>
                                    {monthlyPlan.tokens_used && <div>Tokens: {monthlyPlan.tokens_used}</div>}
                                    {monthlyPlan.thread_id && <div>Thread: {monthlyPlan.thread_id.substring(0, 12)}...</div>}
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="text-red-800 font-semibold">Error</div>
                                <div className="text-red-600">{error}</div>
                            </div>
                        )}
                    </div>

                    {/* Tab Navigation */}
                    {monthlyPlan && (
                        <div className="px-6">
                            <div className="flex space-x-8 border-b border-gray-200">
                                {[
                                    { id: 'overview', name: 'Overview', icon: '📊' },
                                    { id: 'schedule', name: 'Customer Schedule', icon: '📅' },
                                    { id: 'areas', name: 'Area Coverage', icon: '🗺️' },
                                    { id: 'weekly', name: 'Weekly Plans', icon: '📈' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`py-4 px-2 font-medium text-sm border-b-2 transition-colors ${
                                            activeTab === tab.id
                                                ? 'border-indigo-500 text-indigo-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        {tab.icon} {tab.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Content */}
                {monthlyPlan && expandedPlan && (
                    <div className="space-y-6">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Monthly Overview */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
                                        <h3 className="text-xl font-bold">Monthly Overview</h3>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {expandedPlan.mo && (
                                            <>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-blue-50 p-4 rounded-lg">
                                                        <div className="text-2xl font-bold text-blue-600">
                                                            {expandedPlan.mo.tv}
                                                        </div>
                                                        <div className="text-sm text-gray-600">Total Visits</div>
                                                    </div>
                                                    <div className="bg-green-50 p-4 rounded-lg">
                                                        <div className="text-2xl font-bold text-green-600">
                                                            ₹{(expandedPlan.mo.tr || 0).toLocaleString()}
                                                        </div>
                                                        <div className="text-sm text-gray-600">Target Revenue</div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-purple-50 p-4 rounded-lg">
                                                        <div className="text-2xl font-bold text-purple-600">
                                                            {expandedPlan.mo.wd}
                                                        </div>
                                                        <div className="text-sm text-gray-600">Working Days</div>
                                                    </div>
                                                    <div className="bg-orange-50 p-4 rounded-lg">
                                                        <div className="text-2xl font-bold text-orange-600">
                                                            {expandedPlan.mo.nt || 0}
                                                        </div>
                                                        <div className="text-sm text-gray-600">NBD Target</div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Plan Summary */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-xl">
                                        <h3 className="text-xl font-bold">Plan Summary</h3>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {(() => {
                                            const summary = getPlanSummary();
                                            return summary ? (
                                                <>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="bg-gray-50 p-3 rounded-lg">
                                                            <div className="text-lg font-semibold">{summary.total_customers}</div>
                                                            <div className="text-sm text-gray-600">Customers Scheduled</div>
                                                        </div>
                                                        <div className="bg-gray-50 p-3 rounded-lg">
                                                            <div className="text-lg font-semibold">{summary.total_areas}</div>
                                                            <div className="text-sm text-gray-600">Areas Covered</div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-indigo-50 p-4 rounded-lg">
                                                        <div className="text-lg font-semibold text-indigo-700">
                                                            {summary.avg_visits_per_day} visits/day
                                                        </div>
                                                        <div className="text-sm text-gray-600">Average Daily Visits</div>
                                                    </div>
                                                </>
                                            ) : null;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Customer Schedule Tab */}
                        {activeTab === 'schedule' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-xl">
                                    <h3 className="text-xl font-bold">Customer Visit Schedule</h3>
                                    <p className="text-purple-100 mt-2">Complete customer-date mapping</p>
                                </div>
                                <div className="p-6">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer Code</th>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Visit Count</th>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Scheduled Dates</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {Object.entries(expandedPlan.expanded_cvs || {})
                                                    .slice(0, 20) // Show first 20 customers
                                                    .map(([customerCode, schedule]) => (
                                                        <tr key={customerCode} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 font-medium text-gray-900">{customerCode}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
                                                                    {schedule.visit_count}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-sm">
                                                                <div className="flex flex-wrap gap-1 justify-center">
                                                                    {schedule.dates.map((date, index) => (
                                                                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                                                            {formatDateReadable(date)}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {Object.keys(expandedPlan.expanded_cvs || {}).length > 20 && (
                                        <div className="text-center mt-4 text-sm text-gray-500">
                                            Showing first 20 customers. Total: {Object.keys(expandedPlan.expanded_cvs).length} customers scheduled.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Area Coverage Tab */}
                        {activeTab === 'areas' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 rounded-t-xl">
                                    <h3 className="text-xl font-bold">Area Coverage Schedule</h3>
                                    <p className="text-orange-100 mt-2">Area-wise visit planning</p>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.entries(expandedPlan.expanded_avs || {}).map(([area, schedule]) => (
                                            <div key={area} className="bg-gray-50 rounded-lg p-4">
                                                <h4 className="font-semibold text-gray-900 mb-2">{area}</h4>
                                                <div className="text-sm text-gray-600 mb-3">
                                                    {schedule.visit_days} visit days scheduled
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {schedule.dates.map((date, index) => (
                                                        <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                                                            {formatDateReadable(date)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Weekly Plans Tab */}
                        {activeTab === 'weekly' && (
                            <div className="space-y-6">
                                {expandedPlan.wp?.map((week) => (
                                    <div key={week.w} className="bg-white rounded-xl shadow-sm border border-gray-200">
                                        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-xl">
                                            <h3 className="text-xl font-bold">Week {week.w} Plan</h3>
                                            <p className="text-green-100 mt-2">
                                                Days {week.sd}-{week.ed} • Target: {week.tv} visits • Revenue: ₹{(week.tr || 0).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="p-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 mb-3">Focus Areas</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {week.fa?.map((area, index) => (
                                                            <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm">
                                                                {area}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 mb-3">Priority Customers</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {week.pc?.map((priority, index) => (
                                                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">
                                                                {priority}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            {week.strategy && (
                                                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                                    <h5 className="font-medium text-gray-900 mb-2">Strategy</h5>
                                                    <p className="text-gray-700 text-sm">{week.strategy}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Loading State */}
                {isGenerating && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating Monthly Plan</h3>
                            <p className="text-gray-600 mb-4">
                                AI is analyzing {selectedMR.mrName}'s territory and creating an optimized monthly plan...
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
                                <div className="text-sm text-gray-700 space-y-2">
                                    <div>🔍 Analyzing customer data</div>
                                    <div>🤖 Generating strategic framework</div>
                                    <div>📅 Creating customer schedules</div>
                                    <div>🗺️ Optimizing area coverage</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* No Plan State */}
                {!monthlyPlan && !isGenerating && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">📅</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Monthly Plan Found</h3>
                            <p className="text-gray-600 mb-6">
                                Generate a new monthly plan for {selectedMR.mrName} for {monthNames[selectedMonth]} {selectedYear}
                            </p>
                            <button
                                onClick={generateNewPlan}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                            >
                                🚀 Generate Monthly Plan
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MonthlyPlanDashboardV2;
