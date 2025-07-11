// /src/components/MonthlyPlanDashboardV2.js
// Complete V2 dashboard based on existing structure with V2 adaptations

import React, { useState, useEffect } from 'react';
import MonthlyPlanServiceV2 from '../services/MonthlyPlanServiceV2';
import WeeklyCalendarView from './WeeklyCalendarView'; // Import the calendar view

// FullCalendar CSS - ensure these are loaded
import '@fullcalendar/core/main.css';
import '@fullcalendar/daygrid/main.css';
import '@fullcalendar/timegrid/main.css';


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
    // Modal state for event details
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [currentCalendarWeekContext, setCurrentCalendarWeekContext] = useState(null);

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

    const monthNames = [
        '', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const mrName = selectedMR?.mrName || selectedMRName;

    const transformDataForCalendar = (planData) => {
        if (!planData || !planData.expanded_cvs || !planData.mo) {
            return [];
        }
        const events = [];
        const year = planData.mo.y;
        const month = planData.mo.m -1; // JavaScript months are 0-indexed
        const tiers = ['TIER_1_CHAMPION', 'TIER_2_PERFORMER', 'TIER_3_DEVELOPER', 'TIER_4_PROSPECT']; // Example tiers

        let customerCounter = 0; // To cycle through tiers for demo purposes

        for (const customerCode in planData.expanded_cvs) {
            const schedule = planData.expanded_cvs[customerCode];
            // DEMO: Assign a tier cyclically for styling. Replace with actual tier data.
            const demoTier = tiers[customerCounter % tiers.length];
            customerCounter++;

            schedule.dates.forEach(ddmm => {
                if (ddmm && ddmm.length === 4) {
                    const day = parseInt(ddmm.substring(0, 2), 10);
                    const eventDate = new Date(year, month, day);

                    events.push({
                        title: customerCode,
                        start: eventDate,
                        allDay: true,
                        extendedProps: {
                            customerCode: customerCode,
                            tier: demoTier, // Using demo tier
                            visitPurpose: "Routine Check-in", // Placeholder
                            priorityReason: "Scheduled Visit" // Placeholder
                        }
                    });
                }
            });
        }
        return events;
    };

    const handleDatesSet = (dateInfo) => {
        if (!expandedPlan || !expandedPlan.wp || !expandedPlan.mo) {
            setCurrentCalendarWeekContext(null);
            return;
        }

        const viewStart = dateInfo.start; // This is the start of the displayed range in the calendar
        const planMonthStart = new Date(expandedPlan.mo.y, expandedPlan.mo.m - 1, 1);

        // Calculate week number based on viewStart relative to the plan's month start
        // This is a simplified calculation and might need refinement for edge cases (e.g., weeks spanning month boundaries)
        const diffTime = Math.abs(viewStart - planMonthStart);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        let weekNumber = Math.floor(diffDays / 7) + 1;

        // Ensure weekNumber is within the bounds of the weekly plan array
        weekNumber = Math.max(1, Math.min(weekNumber, expandedPlan.wp.length));

        const contextWeekData = expandedPlan.wp.find(w => w.w === weekNumber);

        if (contextWeekData) {
            console.log(`Setting calendar context for week: ${weekNumber}`, contextWeekData);
            setCurrentCalendarWeekContext(contextWeekData);
        } else {
            console.log(`No weekly plan data found for calculated week number: ${weekNumber} from viewStart: ${viewStart}`);
            // If no exact match, try to find a week that contains the viewStart
            const fallbackWeek = expandedPlan.wp.find(w => {
                // Assuming w.sd and w.ed are like "0107" (DDMM) - this needs robust parsing based on actual data structure
                // For now, this part is a placeholder for more robust week matching logic
                // This example assumes w.sd is day of month, which is not what's in the V2 plan structure.
                // The V2 structure is { w: 1, sd: 1, ed: 7, ... } where sd/ed are day numbers.
                const weekStartDate = new Date(expandedPlan.mo.y, expandedPlan.mo.m - 1, w.sd);
                const weekEndDate = new Date(expandedPlan.mo.y, expandedPlan.mo.m - 1, w.ed);
                return viewStart >= weekStartDate && viewStart <= weekEndDate;
            });
            setCurrentCalendarWeekContext(fallbackWeek || null);
            if(fallbackWeek) console.log(`Fallback calendar context for week: ${fallbackWeek.w}`, fallbackWeek);

        }
    };

    // Load existing plan on component mount or when MR/month changes
    useEffect(() => {
        if (mrName && mrName !== 'ALL_MRS') {
            loadExistingPlan();
            loadWeeklyRevisions();
        }
        // Reset context when MR/Month/Year changes
        setCurrentCalendarWeekContext(null);
    }, [mrName, selectedMonth, selectedYear]);

    const loadExistingPlan = async () => {
        try {
            setError(null);
            console.log(`🔍 [V2] Loading plan for ${mrName} - ${selectedMonth}/${selectedYear}`);
            
            const plan = await planService.getMonthlyPlan(mrName, selectedMonth, selectedYear);
            
            if (plan) {
                setMonthlyPlan(plan);
                const expanded = planService.expandPlanForDisplay(plan.current_plan_json);
                setExpandedPlan(expanded);
                console.log('✅ Plan loaded successfully');
                console.log('📊 Plan structure:', {
                    customers: Object.keys(plan.current_plan_json?.cvs || {}).length,
                    areas: Object.keys(plan.current_plan_json?.avs || {}).length,
                    weeks: plan.current_plan_json?.wp?.length || 0
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
            
            const result = await planService.generateMonthlyPlan(mrName, selectedMonth, selectedYear);

            if (result.success) {
                setMonthlyPlan({
                    id: result.plan_id,
                    current_plan_json: result.plan,
                    thread_id: result.thread_id,
                    tokens_used: result.tokens_used,
                    generated_at: result.generated_at,
                    plan_version: '2.0'
                });
                
                const expanded = planService.expandPlanForDisplay(result.plan);
                setExpandedPlan(expanded);
                
                setSuccess(`Plan generated successfully! Plan ID: ${result.plan_id}`);
                setActiveTab('overview');
                
                console.log('✅ Plan generated successfully');
                console.log(`📊 V2 Metrics:`, {
                    customers: Object.keys(result.plan.cvs || {}).length,
                    areas: Object.keys(result.plan.avs || {}).length,
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

        setIsRevising(true);
        setError(null);

        try {
            console.log(`🔄 [V2] Weekly revision for week ${revisionWeek}`);
            
            // TODO: Implement when Phase 2 is ready
            setError('Weekly revision not implemented yet - Phase 2');
            
        } catch (error) {
            console.error('❌ Weekly revision failed:', error);
            setError(`Weekly revision failed: ${error.message}`);
        } finally {
            setIsRevising(false);
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

    const getWeekStatus = (weekNumber) => {
        const revision = weeklyRevisions.find(r => r.week_number === weekNumber);
        if (revision) return 'revised';
        
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        
        if (selectedMonth === currentMonth && selectedYear === currentYear) {
            const currentWeek = Math.ceil(today.getDate() / 7);
            if (weekNumber < currentWeek) return 'completed';
            if (weekNumber === currentWeek) return 'active';
        }
        
        return 'pending';
    };

    const canGenerateReport = () => {
        return monthlyPlan && getWeekStatus(4) === 'completed';
    };

    if (!mrName) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                            <span className="text-3xl text-white">🚀</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Monthly Tour Planning V2</h2>
                        <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
                            Advanced AI-powered monthly planning with customer-date grouping and optimized token usage
                        </p>
                        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl mx-auto border border-gray-100">
                            <h3 className="text-xl font-semibold text-gray-900 mb-8">Select an MR to get started</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="flex items-start space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-lg">📊</span>
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-semibold text-gray-900 mb-2">V2 Features</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Customer-date mapping, compressed format, and 75% token reduction
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-lg">🤖</span>
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-semibold text-gray-900 mb-2">AI Powered</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Complete strategic framework with persistent thread conversations
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                    <div className="bg-gradient-to-r from-violet-600 to-violet-700 text-white p-6 rounded-t-xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-bold">Monthly Tour Planning V2</h1>
                                <p className="text-violet-100 mt-2">
                                    Advanced AI planning for {mrName} - {monthNames[selectedMonth]} {selectedYear}
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="bg-white text-gray-900 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-violet-500"
                                >
                                    {monthNames.slice(1).map((name, index) => (
                                        <option key={index + 1} value={index + 1}>{name}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="bg-white text-gray-900 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-violet-500"
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
                                            : 'bg-violet-600 text-white hover:bg-violet-700 shadow-md hover:shadow-lg'
                                    }`}
                                >
                                    {isGenerating ? '🤖 Generating V2 Plan...' : '🚀 Generate V2 Plan'}
                                </button>
                                
                                <button
                                    onClick={loadExistingPlan}
                                    className="px-6 py-3 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                                >
                                    🔄 Refresh
                                </button>

                                {monthlyPlan && (
                                    <button
                                        onClick={() => setActiveTab('revisions')}
                                        className="px-6 py-3 rounded-lg font-semibold bg-orange-100 text-orange-700 hover:bg-orange-200 transition-all"
                                    >
                                        📝 Weekly Revisions
                                    </button>
                                )}
                            </div>

                            {monthlyPlan && (
                                <div className="text-sm text-gray-500 space-y-1">
                                    <div className="flex items-center space-x-4">
                                        <div>Plan ID: {monthlyPlan.id}</div>
                                        <div>Version: {monthlyPlan.plan_version || '2.0'}</div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div>Generated: {new Date(monthlyPlan.generated_at).toLocaleString()}</div>
                                        {monthlyPlan.tokens_used && <div>Tokens: {monthlyPlan.tokens_used}</div>}
                                    </div>
                                    {monthlyPlan.thread_id && (
                                        <div>Thread: {monthlyPlan.thread_id.substring(0, 16)}...</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Status Messages */}
                        {error && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="text-red-800 font-semibold">Error</div>
                                <div className="text-red-600">{error}</div>
                            </div>
                        )}

                        {success && (
                            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="text-green-800 font-semibold">Success</div>
                                <div className="text-green-600">{success}</div>
                            </div>
                        )}
                    </div>

                    {/* Tab Navigation */}
                    {monthlyPlan && (
                        <div className="px-6">
                            <div className="flex space-x-8 border-b border-gray-200">
                                {[
                                    { id: 'overview', name: 'Overview', icon: '📊' },
                                    { id: 'weekly', name: 'Weekly Plans', icon: '📅' },
                                    { id: 'customers', name: 'Customer Schedule', icon: '👥' },
                                    { id: 'areas', name: 'Area Coverage', icon: '🗺️' },
                                    { id: 'revisions', name: 'Revisions', icon: '📝' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`py-4 px-2 font-medium text-sm border-b-2 transition-colors ${
                                            activeTab === tab.id
                                                ? 'border-violet-500 text-violet-600'
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
                                {expandedPlan.mo && (
                                    <>
                                        {/* Plan Status - More descriptive */}
                                        <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                            <h4 className="font-semibold text-indigo-700">Current Plan Status:</h4>
                                            {/* This status would be dynamic based on current date and revision state */}
                                            <p className="text-indigo-600 text-sm">
                                                Baseline Plan Active - Week {Math.min(Math.ceil(new Date().getDate() / 7), 4)} of 4 (Example)
                                            </p>
                                            <p className="text-xs text-indigo-500">Version: {monthlyPlan.plan_version || '2.0'}.{monthlyPlan.current_revision || 0}</p>
                                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-blue-50 p-4 rounded-lg">
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {expandedPlan.mo.tv || 0}
                                                </div>
                                                <div className="text-sm text-gray-600">Total Planned Visits</div>
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
                                                <div className="text-sm text-purple-700">Working Days</div>
                                                <div className="text-xl font-bold text-purple-600">
                                                    {expandedPlan.mo.wd || 0}
                                                </div>
                                                            </div>
                                            <div className="bg-orange-50 p-4 rounded-lg">
                                                <div className="text-sm text-orange-700">NBD Target (Visits)</div>
                                                <div className="text-xl font-bold text-orange-600">
                                                    {expandedPlan.mo.nt || 0}
                                                </div>
                                                            </div>
                                        </div>

                                        {/* Placeholder for KPIs */}
                                        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <h4 className="font-semibold text-gray-700 mb-2">Key Performance Indicators (Monthly)</h4>
                                            <div className="space-y-1 text-sm text-gray-600">
                                                <p>Overall Achievement: <span className="font-medium text-gray-800">XX%</span> (Visits: YY%, Revenue: ZZ%)</p>
                                                <p>Plan Adherence: <span className="font-medium text-gray-800">XX%</span></p>
                                                <p>Revision Effectiveness: <span className="font-medium text-gray-800">Data N/A until revisions occur</span></p>
                                                            </div>
                                                        </div>

                                        {expandedPlan.mo.td && (
                                            <div className="bg-gray-50 p-4 rounded-lg mt-4">
                                                <h4 className="font-semibold text-gray-900 mb-2">Planned Tier Distribution (Visits)</h4>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <div className="text-center">
                                                        <div className="font-bold text-lg">{expandedPlan.mo.td[0] || 0}</div>
                                                        <div className="text-gray-600">TIER_2</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="font-bold text-lg">{expandedPlan.mo.td[1] || 0}</div>
                                                        <div className="text-gray-600">TIER_3</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="font-bold text-lg">{expandedPlan.mo.td[2] || 0}</div>
                                                        <div className="text-gray-600">TIER_4</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
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
                                                    <div className="bg-violet-50 p-4 rounded-lg">
                                                        <div className="text-lg font-semibold text-violet-700">
                                                            {summary.avg_visits_per_day} visits/day
                                                        </div>
                                                        <div className="text-sm text-gray-600">Average Daily Visits</div>
                                                    </div>
                                                    <div className="bg-blue-50 p-4 rounded-lg">
                                                        <div className="text-lg font-semibold text-blue-700">
                                                            {summary.total_visits} total visits
                                                        </div>
                                                        <div className="text-sm text-gray-600">Planned for the month</div>
                                                    </div>
                                                </>
                                            ) : null;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Weekly Plans Tab */}
                        {activeTab === 'weekly' && (
                            <div className="space-y-6">
                                <WeeklyCalendarView
                                    events={transformDataForCalendar(expandedPlan)}
                                    onDateClick={(arg) => {
                                        console.log('Date clicked:', arg.dateStr);
                                    }}
                                    onEventClick={(arg) => {
                                        setSelectedEvent(arg.event);
                                        setShowEventModal(true);
                                    }}
                                    onDatesSet={handleDatesSet}
                                />
                                {currentCalendarWeekContext && (
                                    <div className="mt-6 p-4 bg-sky-50 rounded-lg border border-sky-200">
                                        <h4 className="text-lg font-semibold text-sky-700 mb-3">
                                            Context: Week {currentCalendarWeekContext.w} (Days {currentCalendarWeekContext.sd} - {currentCalendarWeekContext.ed})
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-600">Target Visits: <span className="font-medium text-gray-800">{currentCalendarWeekContext.tv}</span></p>
                                                <p className="text-gray-600">Target Revenue: <span className="font-medium text-gray-800">₹{(currentCalendarWeekContext.tr || 0).toLocaleString()}</span></p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600 font-medium">Focus Areas:</p>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {currentCalendarWeekContext.fa?.map((area, index) => (
                                                        <span key={index} className="px-2 py-0.5 bg-sky-200 text-sky-800 rounded-full text-xs">{area}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="md:col-span-2">
                                                <p className="text-gray-600 font-medium">Priority Customers/Segments:</p>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                {currentCalendarWeekContext.pc?.map((priority, index) => (
                                                    <span key={index} className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs">{priority}</span>
                                                ))}
                                                </div>
                                            </div>
                                            {currentCalendarWeekContext.strategy && (
                                                <div className="md:col-span-2 mt-2 p-3 bg-gray-100 rounded">
                                                    <p className="text-gray-600 font-medium">Strategy:</p>
                                                    <p className="text-gray-700 text-xs">{currentCalendarWeekContext.strategy}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {/* Original weekly plan list (can be kept or removed based on final UI design) */}
                                {/* {expandedPlan.wp?.map((week) => (
                                    <div key={week.w} className="bg-white rounded-xl shadow-sm border border-gray-200">
                                        ... (original weekly plan rendering) ...
                                    </div>
                                ))} */}
                            </div>
                        )}

                        {/* Customer Schedule Tab */}
                        {activeTab === 'customers' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-xl">
                                    <h3 className="text-xl font-bold">Customer Visit Schedule</h3>
                                    <p className="text-purple-100 mt-2">Complete customer-date mapping (V2 Format)</p>
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
                                                {Object.entries(expandedPlan?.expanded_cvs || {})
                                                    .slice(0, 50)
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
                                    {Object.keys(expandedPlan?.expanded_cvs || {}).length > 50 && (
                                        <div className="text-center mt-4 text-sm text-gray-500">
                                            Showing first 50 customers. Total: {Object.keys(expandedPlan.expanded_cvs).length} customers scheduled.
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
                                    <p className="text-orange-100 mt-2">Area-wise visit planning (V2 Format)</p>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.entries(expandedPlan?.expanded_avs || {}).map(([area, schedule]) => (
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

                        {/* Revisions Tab */}
                        {activeTab === 'revisions' && (
                            <div className="space-y-6">
                                {/* Weekly Revision Form */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                    <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-6 rounded-t-xl">
                                        <h3 className="text-xl font-bold">Weekly Performance Revision</h3>
                                        <p className="text-amber-100 mt-2">Update plan based on actual performance (Phase 2)</p>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Week Number
                                                </label>
                                                <select
                                                    value={revisionWeek}
                                                    onChange={(e) => setRevisionWeek(parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                                >
                                                    <option value={1}>Week 1</option>
                                                    <option value={2}>Week 2</option>
                                                    <option value={3}>Week 3</option>
                                                    <option value={4}>Week 4</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Visits Completed
                                                </label>
                                                <input
                                                    type="number"
                                                    value={actualPerformance.visits_completed}
                                                    onChange={(e) => setActualPerformance({
                                                        ...actualPerformance,
                                                        visits_completed: e.target.value
                                                    })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                                    placeholder="Actual visits"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Revenue Achieved (₹)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={actualPerformance.revenue_achieved}
                                                    onChange={(e) => setActualPerformance({
                                                        ...actualPerformance,
                                                        revenue_achieved: e.target.value
                                                    })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                                    placeholder="Actual revenue"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Conversion Rate (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={actualPerformance.conversion_rate}
                                                    onChange={(e) => setActualPerformance({
                                                        ...actualPerformance,
                                                        conversion_rate: e.target.value
                                                    })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                                    placeholder="Conversion %"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Revision Reason
                                            </label>
                                            <textarea
                                                value={revisionReason}
                                                onChange={(e) => setRevisionReason(e.target.value)}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                                placeholder="Explain why revision is needed..."
                                            />
                                        </div>

                                        <div className="mt-6 flex space-x-4">
                                            <button
                                                onClick={handleWeeklyRevision}
                                                disabled={isRevising || !monthlyPlan?.thread_id}
                                                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                                                    isRevising || !monthlyPlan?.thread_id
                                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        : 'bg-amber-600 text-white hover:bg-amber-700'
                                                }`}
                                            >
                                                {isRevising ? '🔄 Revising...' : '📝 Submit Revision'}
                                            </button>
                                            
                                            {!monthlyPlan?.thread_id && (
                                                <div className="text-sm text-red-600 flex items-center">
                                                    ⚠️ No thread ID found. Generate a new plan first.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Previous Revisions */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                    <div className="bg-gradient-to-r from-gray-600 to-gray-700 text-white p-6 rounded-t-xl">
                                        <h3 className="text-xl font-bold">Revision History</h3>
                                    </div>
                                    <div className="p-6">
                                        {weeklyRevisions.length > 0 ? (
                                            <div className="space-y-4">
                                                {weeklyRevisions.map((revision, index) => (
                                                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h4 className="font-semibold">Week {revision.week_number} Revision</h4>
                                                            <span className="text-sm text-gray-500">
                                                                {new Date(revision.revision_date).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-700 text-sm">{revision.revision_reason}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                <div className="text-4xl mb-4">📝</div>
                                                <p>No revisions made yet</p>
                                                <p className="text-sm">Submit weekly performance data to track revisions</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Loading State */}
                {isGenerating && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-100 rounded-full mb-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating V2 Monthly Plan</h3>
                            <p className="text-gray-600 mb-4">
                                AI is analyzing {mrName}'s territory using the new compressed format...
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
                                <div className="text-sm text-gray-700 space-y-2">
                                    <div>🔍 Compressing customer data (75% token reduction)</div>
                                    <div>🤖 Generating strategic framework</div>
                                    <div>📅 Creating customer-date mappings</div>
                                    <div>🗺️ Optimizing area coverage</div>
                                    <div>🧵 Setting up persistent thread</div>
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
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No V2 Monthly Plan Found</h3>
                            <p className="text-gray-600 mb-6">
                                Generate a new V2 monthly plan for {mrName} for {monthNames[selectedMonth]} {selectedYear}
                            </p>
                            <button
                                onClick={generateNewPlan}
                                className="px-6 py-3 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 transition-colors"
                            >
                                🚀 Generate V2 Monthly Plan
                            </button>
                            <div className="mt-4 text-sm text-gray-500">
                                <div>✨ Features: Customer-date grouping, 75% token reduction, persistent threads</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Event Detail Modal */}
                {showEventModal && selectedEvent && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out">
                        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 transform transition-all duration-300 ease-in-out scale-100">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-semibold text-gray-800">Visit Details</h3>
                                <button
                                    onClick={() => setShowEventModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>

                            <div className="border-t border-gray-200 pt-4 space-y-3 text-sm">
                                <div>
                                    <span className="font-medium text-gray-500">Customer:</span>
                                    <span className="ml-2 text-gray-700 font-semibold">{selectedEvent.title} ({selectedEvent.extendedProps.customerCode})</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-500">Date:</span>
                                    <span className="ml-2 text-gray-700">{selectedEvent.start.toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-500">Tier:</span>
                                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                                        selectedEvent.extendedProps.tier === 'TIER_1_CHAMPION' ? 'bg-purple-100 text-purple-800' :
                                        selectedEvent.extendedProps.tier === 'TIER_2_PERFORMER' ? 'bg-blue-100 text-blue-800' :
                                        selectedEvent.extendedProps.tier === 'TIER_3_DEVELOPER' ? 'bg-green-100 text-green-800' :
                                        selectedEvent.extendedProps.tier === 'TIER_4_PROSPECT' ? 'bg-gray-100 text-gray-800' :
                                        'bg-sky-100 text-sky-800'
                                    }`}>
                                        {selectedEvent.extendedProps.tier?.replace('_', ' ') || 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-500">Visit Purpose:</span>
                                    <span className="ml-2 text-gray-700">{selectedEvent.extendedProps.visitPurpose || 'Not specified'}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-500">Priority Reason:</span>
                                    <span className="ml-2 text-gray-700">{selectedEvent.extendedProps.priorityReason || 'Not specified'}</span>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowEventModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                                {/* Add other actions like "Edit Visit" or "View Customer Details" here */}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default MonthlyPlanDashboardV2;
