// src/components/AITourPlanDashboard.js
import React, { useState, useEffect } from 'react';
import { aiTourPlanGenerator } from '../services/AITourPlanGenerator';

const AITourPlanDashboard = ({ mrName, mrData }) => {
    const [tourPlan, setTourPlan] = useState(null);
    const [savedPlans, setSavedPlans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [generationHistory, setGenerationHistory] = useState([]);

    // Initialize with tomorrow's date
    useEffect(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setSelectedDate(tomorrow.toISOString().split('T')[0]);
    }, []);

    // Load saved plans when MR changes
    useEffect(() => {
        if (mrName) {
            loadSavedPlans();
            setTourPlan(null);
            setError(null);
        }
    }, [mrName]);

    const loadSavedPlans = async () => {
        if (!mrName) return;

        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7); // Last 7 days
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30); // Next 30 days

            const plans = await aiTourPlanGenerator.getSavedTourPlans(
                mrName, 
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );
            setSavedPlans(plans);
        } catch (err) {
            console.error('Error loading saved plans:', err);
        }
    };

    const generateTourPlan = async () => {
        if (!mrName || !selectedDate) {
            setError('Please select an MR and date');
            return;
        }

        setLoading(true);
        setError(null);
        setTourPlan(null);

        try {
            console.log(`🤖 Generating AI tour plan for ${mrName} on ${selectedDate}`);
            
            const result = await aiTourPlanGenerator.generateTourPlan(mrName, selectedDate);
            
            if (result.success) {
                setTourPlan(result);
                setGenerationHistory(prev => [{
                    date: selectedDate,
                    generated_at: result.generated_at,
                    context_summary: result.context_summary
                }, ...prev.slice(0, 4)]); // Keep last 5 generations
                await loadSavedPlans(); // Refresh saved plans
            } else {
                setError(result.error);
                if (result.raw_response) {
                    console.error('Raw AI response:', result.raw_response);
                }
            }
        } catch (err) {
            console.error('Tour plan generation error:', err);
            setError(`Generation failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const loadExistingPlan = async (planDate) => {
        const existingPlan = savedPlans.find(p => p.plan_date === planDate);
        if (existingPlan) {
            setTourPlan({
                success: true,
                plan: existingPlan.plan_json,
                generated_at: existingPlan.created_at,
                context_summary: existingPlan.context_summary || {}
            });
            setSelectedDate(planDate);
        }
    };

    const formatTime = (timeSlot) => {
        return timeSlot || 'Time TBD';
    };

    const getTierColor = (tierLevel) => {
        switch (tierLevel) {
            case 'TIER_1_CHAMPION': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'TIER_2_PERFORMER': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'TIER_3_DEVELOPER': return 'bg-green-50 text-green-700 border-green-100';
            case 'TIER_4_PROSPECT': return 'bg-gray-50 text-gray-700 border-gray-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    const getPriorityIcon = (reason) => {
        if (reason?.toLowerCase().includes('churn')) return '🚨';
        if (reason?.toLowerCase().includes('high value')) return '💎';
        if (reason?.toLowerCase().includes('new')) return '🆕';
        return '📋';
    };

    if (!mrName) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                            <span className="text-3xl text-white">🤖</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">AI Tour Plan Generator</h2>
                        <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
                            Generate intelligent tour plans using AI analysis of customer data, performance metrics, and territory insights
                        </p>
                        
                        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl mx-auto border border-gray-100">
                            <h3 className="text-xl font-semibold text-gray-900 mb-8">AI-Powered Features</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="flex items-start space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-lg">🎯</span>
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-semibold text-gray-900 mb-2">Smart Customer Prioritization</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Uses customer tiers, churn risk, and performance data to prioritize visits
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-lg">⏰</span>
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-semibold text-gray-900 mb-2">Optimal Time Scheduling</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Creates time-efficient schedules based on customer importance and geography
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-lg">📊</span>
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-semibold text-gray-900 mb-2">Performance Context Analysis</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Considers recent visit quality and conversion rates for planning
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-lg">🎪</span>
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-semibold text-gray-900 mb-2">NBD Focus Integration</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Ensures 40% NBD-focused visits for business development
                                        </p>
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
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                🤖 AI Tour Plan Generator
                            </h1>
                            <div className="mt-3 flex items-center gap-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                    <span className="font-medium text-gray-900">{mrName}</span>
                                </div>
                                {mrData?.territory && (
                                    <>
                                        <div className="h-4 w-px bg-gray-300"></div>
                                        <span className="text-gray-600">Territory: {mrData.territory}</span>
                                    </>
                                )}
                                <div className="h-4 w-px bg-gray-300"></div>
                                <span className="text-gray-600">AI-Powered Planning</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            />
                            <button
                                onClick={generateTourPlan}
                                disabled={loading || !selectedDate}
                                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors shadow-sm"
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin">🔄</span>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        🤖 Generate AI Plan
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Generation History */}
                {generationHistory.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Generations</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {generationHistory.map((gen, index) => (
                                <div key={index} className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-indigo-900">{gen.date}</span>
                                        <span className="text-xs text-indigo-600">
                                            {new Date(gen.generated_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    {gen.context_summary && (
                                        <div className="text-xs text-indigo-700 space-y-1">
                                            <div>Customers: {gen.context_summary.total_customers}</div>
                                            <div>Quality Score: {gen.context_summary.performance_score?.toFixed(1) || 'N/A'}</div>
                                            <div>Conversion: {gen.context_summary.conversion_rate?.toFixed(1) || 0}%</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Saved Plans */}
                {savedPlans.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Saved Plans</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {savedPlans.map((plan, index) => (
                                <button
                                    key={index}
                                    onClick={() => loadExistingPlan(plan.plan_date)}
                                    className="text-left bg-gray-50 hover:bg-gray-100 rounded-lg p-4 border border-gray-200 transition-colors"
                                >
                                    <div className="font-medium text-gray-900">{plan.plan_date}</div>
                                    <div className="text-sm text-gray-600 mt-1">
                                        {plan.plan_json?.plan_summary?.total_customers || 0} customers
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2">
                                        {new Date(plan.created_at).toLocaleDateString()}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5">⚠️</div>
                            <div>
                                <h3 className="text-sm font-medium text-red-800">Generation Error</h3>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tour Plan Display */}
                {tourPlan && tourPlan.success && (
                    <div className="space-y-6">
                        {/* Plan Summary */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    🎯 AI Tour Plan for {selectedDate}
                                </h3>
                                <div className="text-sm text-gray-500">
                                    Generated: {new Date(tourPlan.generated_at).toLocaleString()}
                                </div>
                            </div>

                            {/* Summary Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                                <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {tourPlan.plan?.plan_summary?.total_customers || 0}
                                    </div>
                                    <div className="text-sm text-blue-600 font-medium">Total Visits</div>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-100">
                                    <div className="text-2xl font-bold text-purple-600">
                                        {tourPlan.plan?.plan_summary?.tier_1_customers || 0}
                                    </div>
                                    <div className="text-sm text-purple-600 font-medium">Tier 1</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-4 text-center border border-green-100">
                                    <div className="text-2xl font-bold text-green-600">
                                        {tourPlan.plan?.plan_summary?.nbd_focused_visits || 0}
                                    </div>
                                    <div className="text-sm text-green-600 font-medium">NBD Focus</div>
                                </div>
                                <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-100">
                                    <div className="text-2xl font-bold text-orange-600">
                                        ₹{(tourPlan.plan?.plan_summary?.estimated_revenue || 0).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-orange-600 font-medium">Est. Revenue</div>
                                </div>
                                <div className="bg-indigo-50 rounded-lg p-4 text-center border border-indigo-100">
                                    <div className="text-2xl font-bold text-indigo-600">
                                        {tourPlan.plan?.plan_summary?.route_efficiency || 'Medium'}
                                    </div>
                                    <div className="text-sm text-indigo-600 font-medium">Efficiency</div>
                                </div>
                                <div className="bg-pink-50 rounded-lg p-4 text-center border border-pink-100">
                                    <div className="text-lg font-bold text-pink-600">
                                        {tourPlan.context_summary?.performance_score?.toFixed(1) || 'N/A'}
                                    </div>
                                    <div className="text-sm text-pink-600 font-medium">Quality Score</div>
                                </div>
                            </div>

                            {/* Key Objectives */}
                            {tourPlan.plan?.key_objectives && (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h4 className="font-semibold text-gray-900 mb-3">🎯 Key Objectives</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {tourPlan.plan.key_objectives.map((objective, index) => (
                                            <span key={index} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                                                {objective}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Daily Schedule */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6 rounded-t-xl">
                                <h3 className="text-xl font-bold">📅 Daily Visit Schedule</h3>
                                <p className="text-indigo-100 mt-2">AI-optimized customer visit sequence</p>
                            </div>
                            
                            <div className="p-6">
                                {tourPlan.plan?.daily_plan && tourPlan.plan.daily_plan.length > 0 ? (
                                    <div className="space-y-4">
                                        {tourPlan.plan.daily_plan.map((visit, index) => (
                                            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-4 flex-1">
                                                        <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-lg font-bold text-sm min-w-24 text-center">
                                                            {formatTime(visit.time_slot)}
                                                        </div>
                                                        
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <span className="text-lg">{getPriorityIcon(visit.priority_reason)}</span>
                                                                <h4 className="font-semibold text-gray-900 text-lg">{visit.customer_name}</h4>
                                                                <span className="text-gray-400">•</span>
                                                                <span className="text-gray-600 font-medium">{visit.customer_type}</span>
                                                            </div>
                                                            
                                                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                                                <span className={`px-3 py-1 rounded-md text-xs font-bold border ${getTierColor(visit.tier_level)}`}>
                                                                    {visit.tier_level?.replace('TIER_', 'T') || 'T2'}
                                                                </span>
                                                                <span className="text-sm text-gray-600">
                                                                    <span className="font-medium">Duration:</span> {visit.expected_duration || 30}min
                                                                </span>
                                                                <span className="text-sm text-gray-600">
                                                                    <span className="font-medium">Purpose:</span> {visit.visit_purpose}
                                                                </span>
                                                            </div>
                                                            
                                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                                <div className="text-sm">
                                                                    <span className="font-medium text-yellow-800">Priority Reason:</span>
                                                                    <span className="text-yellow-700 ml-2">{visit.priority_reason}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <div className="text-4xl mb-4">📅</div>
                                        <p>No visits planned for this date</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading Overlay */}
                {loading && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-8 text-center max-w-sm mx-4 shadow-2xl">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-indigo-200 rounded-full mx-auto mb-4"></div>
                                <div className="w-16 h-16 border-4 border-indigo-600 rounded-full animate-spin absolute top-0 left-1/2 transform -translate-x-1/2 border-t-transparent"></div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">🤖 AI Planning in Progress</h3>
                            <p className="text-gray-600 text-sm">
                                Analyzing territory data and generating optimal tour plan...
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AITourPlanDashboard;
