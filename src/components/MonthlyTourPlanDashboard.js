// src/components/MonthlyTourPlanDashboard.js
import React, { useState, useEffect } from 'react';
import { monthlyTourPlanService } from '../services/MonthlyTourPlanService';

const MonthlyTourPlanDashboard = ({ mrName, mrData }) => {
    const [activeView, setActiveView] = useState('overview');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [monthlyPlan, setMonthlyPlan] = useState(null);
    const [weeklyRevisions, setWeeklyRevisions] = useState([]);
    const [monthlyReports, setMonthlyReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    // Current week calculation
    const [currentWeek, setCurrentWeek] = useState(1);

    useEffect(() => {
        if (mrName) {
            loadMonthlyData();
        }
    }, [mrName, selectedMonth, selectedYear]);

    useEffect(() => {
        // Calculate current week based on today's date
        const today = new Date();
        if (today.getMonth() + 1 === selectedMonth && today.getFullYear() === selectedYear) {
            const weekOfMonth = Math.ceil(today.getDate() / 7);
            setCurrentWeek(weekOfMonth);
        } else {
            setCurrentWeek(1);
        }
    }, [selectedMonth, selectedYear]);

    const loadMonthlyData = async () => {
        if (!mrName) return;

        setLoading(true);
        setError(null);

        try {
            // Load existing monthly plan
            const existingPlan = await monthlyTourPlanService.getMonthlyPlan(mrName, selectedMonth, selectedYear);
            setMonthlyPlan(existingPlan);

            // Load weekly revisions if plan exists
            if (existingPlan) {
                const revisions = await loadWeeklyRevisions(existingPlan.id);
                setWeeklyRevisions(revisions);
            }

            // Load monthly reports
            const reports = await loadMonthlyReports();
            setMonthlyReports(reports);

        } catch (err) {
            console.error('Error loading monthly data:', err);
            setError('Failed to load monthly planning data');
        } finally {
            setLoading(false);
        }
    };

    const loadWeeklyRevisions = async (planId) => {
        try {
            // This would be implemented in the service
            // For now, return empty array
            return [];
        } catch (error) {
            console.error('Error loading weekly revisions:', error);
            return [];
        }
    };

    const loadMonthlyReports = async () => {
        try {
            // This would be implemented in the service
            // For now, return empty array
            return [];
        } catch (error) {
            console.error('Error loading monthly reports:', error);
            return [];
        }
    };

    const generateMonthlyPlan = async () => {
        if (!mrName) return;

        setActionLoading('generating');
        setError(null);

        try {
            const result = await monthlyTourPlanService.generateMonthlyPlan(mrName, selectedMonth, selectedYear);
            
            if (result.success) {
                setMonthlyPlan({ 
                    id: result.plan_id, 
                    current_plan_json: result.plan,
                    original_plan_json: result.plan,
                    current_revision: 0
                });
                setWeeklyRevisions([]);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(`Plan generation failed: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const performWeeklyRevision = async (weekNumber) => {
        if (!mrName || !monthlyPlan) return;

        setActionLoading(`revision-${weekNumber}`);
        setError(null);

        try {
            const result = await monthlyTourPlanService.performWeeklyRevision(mrName, selectedMonth, selectedYear, weekNumber);
            
            if (result.success) {
                // Update monthly plan with revised version
                const updatedPlan = await monthlyTourPlanService.getMonthlyPlan(mrName, selectedMonth, selectedYear);
                setMonthlyPlan(updatedPlan);
                
                // Refresh weekly revisions
                const revisions = await loadWeeklyRevisions(monthlyPlan.id);
                setWeeklyRevisions(revisions);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(`Weekly revision failed: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const generateMonthlyReport = async () => {
        if (!mrName || !monthlyPlan) return;

        setActionLoading('report');
        setError(null);

        try {
            const result = await monthlyTourPlanService.generateMonthlyReport(mrName, selectedMonth, selectedYear);
            
            if (result.success) {
                const reports = await loadMonthlyReports();
                setMonthlyReports(reports);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(`Report generation failed: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const getMonthName// src/components/MonthlyTourPlanDashboard.js
import React, { useState, useEffect } from 'react';
import { monthlyTourPlanService } from '../services/MonthlyTourPlanService';

const MonthlyTourPlanDashboard = ({ mrName, mrData }) => {
    const [activeView, setActiveView] = useState('overview');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [monthlyPlan, setMonthlyPlan] = useState(null);
    const [weeklyRevisions, setWeeklyRevisions] = useState([]);
    const [monthlyReports, setMonthlyReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    // Current week calculation
    const [currentWeek, setCurrentWeek] = useState(1);

    useEffect(() => {
        if (mrName) {
            loadMonthlyData();
        }
    }, [mrName, selectedMonth, selectedYear]);

    useEffect(() => {
        // Calculate current week based on today's date
        const today = new Date();
        if (today.getMonth() + 1 === selectedMonth && today.getFullYear() === selectedYear) {
            const weekOfMonth = Math.ceil(today.getDate() / 7);
            setCurrentWeek(weekOfMonth);
        } else {
            setCurrentWeek(1);
        }
    }, [selectedMonth, selectedYear]);

    const loadMonthlyData = async () => {
        if (!mrName) return;

        setLoading(true);
        setError(null);

        try {
            // Load existing monthly plan
            const existingPlan = await monthlyTourPlanService.getMonthlyPlan(mrName, selectedMonth, selectedYear);
            setMonthlyPlan(existingPlan);

            // Load weekly revisions if plan exists
            if (existingPlan) {
                const revisions = await loadWeeklyRevisions(existingPlan.id);
                setWeeklyRevisions(revisions);
            }

            // Load monthly reports
            const reports = await loadMonthlyReports();
            setMonthlyReports(reports);

        } catch (err) {
            console.error('Error loading monthly data:', err);
            setError('Failed to load monthly planning data');
        } finally {
            setLoading(false);
        }
    };

    const loadWeeklyRevisions = async (planId) => {
        try {
            // This would be implemented in the service
            // For now, return empty array
            return [];
        } catch (error) {
            console.error('Error loading weekly revisions:', error);
            return [];
        }
    };

    const loadMonthlyReports = async () => {
        try {
            // This would be implemented in the service
            // For now, return empty array
            return [];
        } catch (error) {
            console.error('Error loading monthly reports:', error);
            return [];
        }
    };

    const generateMonthlyPlan = async () => {
        if (!mrName) return;

        setActionLoading('generating');
        setError(null);

        try {
            const result = await monthlyTourPlanService.generateMonthlyPlan(mrName, selectedMonth, selectedYear);
            
            if (result.success) {
                setMonthlyPlan({ 
                    id: result.plan_id, 
                    current_plan_json: result.plan,
                    original_plan_json: result.plan,
                    current_revision: 0
                });
                setWeeklyRevisions([]);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(`Plan generation failed: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const performWeeklyRevision = async (weekNumber) => {
        if (!mrName || !monthlyPlan) return;

        setActionLoading(`revision-${weekNumber}`);
        setError(null);

        try {
            const result = await monthlyTourPlanService.performWeeklyRevision(mrName, selectedMonth, selectedYear, weekNumber);
            
            if (result.success) {
                // Update monthly plan with revised version
                const updatedPlan = await monthlyTourPlanService.getMonthlyPlan(mrName, selectedMonth, selectedYear);
                setMonthlyPlan(updatedPlan);
                
                // Refresh weekly revisions
                const revisions = await loadWeeklyRevisions(monthlyPlan.id);
                setWeeklyRevisions(revisions);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(`Weekly revision failed: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const generateMonthlyReport = async () => {
        if (!mrName || !monthlyPlan) return;

        setActionLoading('report');
        setError(null);

        try {
            const result = await monthlyTourPlanService.generateMonthlyReport(mrName, selectedMonth, selectedYear);
            
            if (result.success) {
                const reports = await loadMonthlyReports();
                setMonthlyReports(reports);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(`Report generation failed: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const getMonthName = (month) => {
        const months = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month];
    };

    const getWeekStatus = (weekNumber) => {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        
        if (selectedYear < currentYear || (selectedYear === currentYear && selectedMonth < currentMonth)) {
            return 'completed';
        }
        
        if (selectedYear === currentYear && selectedMonth === currentMonth) {
            if (weekNumber < currentWeek) return 'completed';
            if (weekNumber === currentWeek) return 'current';
            return 'upcoming';
        }
        
        return 'upcoming';
    };

    const getPerformanceColor = (performance) => {
        if (performance >= 90) return 'text-green-600 bg-green-50 border-green-200';
        if (performance >= 75) return 'text-blue-600 bg-blue-50 border-blue-200';
        if (performance >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        if (performance >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const isCurrentMonth = () => {
        const today = new Date();
        return selectedMonth === today.getMonth() + 1 && selectedYear === today.getFullYear();
    };

    const canGeneratePlan = () => {
        return !monthlyPlan && mrName;
    };

    const canPerformRevision = (weekNumber) => {
        return monthlyPlan && getWeekStatus(weekNumber) === 'completed' && 
               !weeklyRevisions.find(r => r.week_number === weekNumber);
    };

    const canGenerateReport = () => {
        return monthlyPlan && getWeekStatus(4) === 'completed';
    };

    if (!mrName) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                            <span className="text-3xl text-white">📅</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Monthly Tour Planning System</h2>
                        <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
                            Comprehensive monthly planning with AI-powered analysis and weekly revision cycles
                        </p>
                        
                        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl mx-auto border border-gray-100">
                            <h3 className="text-xl font-semibold text-gray-900 mb-8">System Features</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="flex items-start space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-lg">🗓️</span>
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-semibold text-gray-900 mb-2">Monthly Plan Generation</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            AI-powered complete month planning with customer prioritization and territory optimization
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-lg">📊</span>
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-semibold text-gray-900 mb-2">Weekly Performance Analysis</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Automated plan vs actual analysis every Sunday with performance insights
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-lg">🔄</span>
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-semibold text-gray-900 mb-2">Intelligent Plan Revision</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Dynamic plan adjustments based on weekly performance with target redistribution
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-lg">📈</span>
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-semibold text-gray-900 mb-2">Comprehensive Reporting</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Month-end reports with lessons learned and next month recommendations
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
                                📅 Monthly Tour Planning System
                            </h1>
                            <div className="mt-3 flex items-center gap-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span className="font-medium text-gray-900">{mrName}</span>
                                </div>
                                {mrData?.territory && (
                                    <>
                                        <div className="h-4 w-px bg-gray-300"></div>
                                        <span className="text-gray-600">Territory: {mrData.territory}</span>
                                    </>
                                )}
                                <div className="h-4 w-px bg-gray-300"></div>
                                <span className="text-gray-600">Month: {getMonthName(selectedMonth)} {selectedYear}</span>
                                {isCurrentMonth() && (
                                    <>
                                        <div className="h-4 w-px bg-gray-300"></div>
                                        <span className="text-blue-600 font-medium">Current Week: {currentWeek}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        {getMonthName(i + 1)}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                                {Array.from({ length: 3 }, (_, i) => (
                                    <option key={2024 + i} value={2024 + i}>
                                        {2024 + i}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6">
                            {[
                                { id: 'overview', name: 'Overview', icon: '📊' },
                                { id: 'monthly-plan', name: 'Monthly Plan', icon: '🗓️' },
                                { id: 'weekly-analysis', name: 'Weekly Analysis', icon: '📈' },
                                { id: 'reports', name: 'Reports', icon: '📋' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveView(tab.id)}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeView === tab.id
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <span>{tab.icon}</span>
                                        {tab.name}
                                    </span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5">⚠️</div>
                            <div>
                                <h3 className="text-sm font-medium text-red-800">Error</h3>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content based on active view */}
                {activeView === 'overview' && (
                    <div className="space-y-6">
                        {/* Status Overview */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Planning Status</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className={`p-4 rounded-lg border-2 text-center ${
                                    monthlyPlan ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                                }`}>
                                    <div className="text-2xl mb-2">
                                        {monthlyPlan ? '✅' : '⏳'}
                                    </div>
                                    <div className="font-semibold text-sm">Monthly Plan</div>
                                    <div className="text-xs text-gray-600 mt-1">
                                        {monthlyPlan ? 'Generated' : 'Not Generated'}
                                    </div>
                                </div>
                                
                                {[1, 2, 3, 4].map(week => {
                                    const status = getWeekStatus(week);
                                    const hasRevision = weeklyRevisions.find(r => r.week_number === week);
                                    
                                    return (
                                        <div key={week} className={`p-4 rounded-lg border-2 text-center ${
                                            status === 'completed' && hasRevision ? 'bg-blue-50 border-blue-200' :
                                            status === 'completed' ? 'bg-yellow-50 border-yellow-200' :
                                            status === 'current' ? 'bg-orange-50 border-orange-200' :
                                            'bg-gray-50 border-gray-200'
                                        }`}>
                                            <div className="text-2xl mb-2">
                                                {status === 'completed' && hasRevision ? '📊' :
                                                 status === 'completed' ? '⏰' :
                                                 status === 'current' ? '⚡' : '⏳'}
                                            </div>
                                            <div className="font-semibold text-sm">Week {week}</div>
                                            <div className="text-xs text-gray-600 mt-1">
                                                {status === 'completed' && hasRevision ? 'Analyzed' :
                                                 status === 'completed' ? 'Pending Analysis' :
                                                 status === 'current' ? 'In Progress' : 'Upcoming'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button
                                    onClick={generateMonthlyPlan}
                                    disabled={!canGeneratePlan() || actionLoading === 'generating'}
                                    className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {actionLoading === 'generating' ? (
                                        <>
                                            <span className="animate-spin">🔄</span>
                                            <span className="font-medium">Generating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-2xl">📅</span>
                                            <div className="text-left">
                                                <div className="font-semibold text-gray-900">Generate Monthly Plan</div>
                                                <div className="text-sm text-gray-600">Create AI-powered monthly tour plan</div>
                                            </div>
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => performWeeklyRevision(currentWeek)}
                                    disabled={!canPerformRevision(currentWeek) || actionLoading?.startsWith('revision')}
                                    className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {actionLoading?.startsWith('revision') ? (
                                        <>
                                            <span className="animate-spin">🔄</span>
                                            <span className="font-medium">Analyzing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-2xl">📊</span>
                                            <div className="text-left">
                                                <div className="font-semibold text-gray-900">Analyze Week {currentWeek}</div>
                                                <div className="text-sm text-gray-600">Perform weekly revision analysis</div>
                                            </div>
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={generateMonthlyReport}
                                    disabled={!canGenerateReport() || actionLoading === 'report'}
                                    className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {actionLoading === 'report' ? (
                                        <>
                                            <span className="animate-spin">🔄</span>
                                            <span className="font-medium">Generating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-2xl">📈</span>
                                            <div className="text-left">
                                                <div className="font-semibold text-gray-900">Generate Report</div>
                                                <div className="text-sm text-gray-600">Create monthly performance report</div>
                                            </div>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Current Month Progress */}
                        {monthlyPlan && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-6">Current Month Progress</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                        <div className="text-blue-600 font-semibold mb-2">Plan Overview</div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>Target Visits:</span>
                                                <span className="font-medium">{monthlyPlan.current_plan_json?.monthly_overview?.total_planned_visits || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Target Revenue:</span>
                                                <span className="font-medium">₹{(monthlyPlan.current_plan_json?.monthly_overview?.target_revenue || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Revisions:</span>
                                                <span className="font-medium">{monthlyPlan.current_revision || 0}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                                        <div className="text-green-600 font-semibold mb-2">Weekly Status</div>
                                        <div className="space-y-2 text-sm">
                                            {[1, 2, 3, 4].map(week => (
                                                <div key={week} className="flex justify-between">
                                                    <span>Week {week}:</span>
                                                    <span className={`font-medium ${
                                                        getWeekStatus(week) === 'completed' ? 'text-green-600' :
                                                        getWeekStatus(week) === 'current' ? 'text-blue-600' :
                                                        'text-gray-500'
                                                    }`}>
                                                        {getWeekStatus(week) === 'completed' ? 'Completed' :
                                                         getWeekStatus(week) === 'current' ? 'Current' : 'Upcoming'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                                        <div className="text-purple-600 font-semibold mb-2">Analysis Status</div>
                                        <div className="space-y-2 text-sm">
                                            {[1, 2, 3, 4].map(week => {
                                                const hasRevision = weeklyRevisions.find(r => r.week_number === week);
                                                return (
                                                    <div key={week} className="flex justify-between">
                                                        <span>Week {week}:</span>
                                                        <span className={`font-medium ${
                                                            hasRevision ? 'text-purple-600' : 'text-gray-400'
                                                        }`}>
                                                            {hasRevision ? 'Analyzed' : 'Pending'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeView === 'monthly-plan' && (
                    <div className="space-y-6">
                        {monthlyPlan ? (
                            <>
                                {/* Plan Header */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Monthly Plan: {getMonthName(selectedMonth)} {selectedYear}
                                        </h3>
                                        <div className="flex items-center gap-4">
                                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                                Version: {monthlyPlan.current_revision + 1}.0
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                Generated: {new Date(monthlyPlan.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Plan Summary */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {monthlyPlan.current_plan_json?.monthly_overview?.total_planned_visits || 0}
                                            </div>
                                            <div className="text-sm text-blue-600 font-medium">Total Visits</div>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-4 text-center border border-green-100">
                                            <div className="text-2xl font-bold text-green-600">
                                                ₹{((monthlyPlan.current_plan_json?.monthly_overview?.target_revenue || 0) / 1000).toFixed(0)}K
                                            </div>
                                            <div className="text-sm text-green-600 font-medium">Target Revenue</div>
                                        </div>
                                        <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-100">
                                            <div className="text-2xl font-bold text-purple-600">
                                                {monthlyPlan.current_plan_json?.monthly_overview?.nbd_visits_target || 0}
                                            </div>
                                            <div className="text-sm text-purple-600 font-medium">NBD Visits</div>
                                        </div>
                                        <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-100">
                                            <div className="text-2xl font-bold text-orange-600">
                                                {monthlyPlan.current_plan_json?.monthly_overview?.total_working_days || 0}
                                            </div>
                                            <div className="text-sm text-orange-600 font-medium">Working Days</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Weekly Plans */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
                                        <h3 className="text-xl font-bold">Weekly Plans Breakdown</h3>
                                        <p className="text-blue-100 mt-2">Detailed weekly targets and focus areas</p>
                                    </div>
                                    
                                    <div className="p-6">
                                        <div className="grid gap-6">
                                            {monthlyPlan.current_plan_json?.weekly_plans?.map((week, index) => (
                                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="font-semibold text-gray-900">
                                                            Week {week.week_number} ({week.start_date} to {week.end_date})
                                                        </h4>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                getWeekStatus(week.week_number) === 'completed' ? 'bg-green-100 text-green-800' :
                                                                getWeekStatus(week.week_number) === 'current' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-gray-100 text-gray-600'
                                                            }`}>
                                                                {getWeekStatus(week.week_number) === 'completed' ? 'Completed' :
                                                                 getWeekStatus(week.week_number) === 'current' ? 'Current' : 'Upcoming'}
                                                            </span>
                                                            {canPerformRevision(week.week_number) && (
                                                                <button
                                                                    onClick={() => performWeeklyRevision(week.week_number)}
                                                                    disabled={actionLoading?.startsWith('revision')}
                                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                                                                >
                                                                    {actionLoading === `revision-${week.week_number}` ? 'Analyzing...' : 'Analyze Week'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                        <div className="text-center">
                                                            <div className="text-lg font-bold text-blue-600">{week.target_visits}</div>
                                                            <div className="text-xs text-gray-600">Target Visits</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-lg font-bold text-green-600">₹{(week.target_revenue / 1000).toFixed(0)}K</div>
                                                            <div className="text-xs text-gray-600">Target Revenue</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-lg font-bold text-purple-600">{week.focus_areas?.length || 0}</div>
                                                            <div className="text-xs text-gray-600">Focus Areas</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-lg font-bold text-orange-600">{week.priority_customers?.length || 0}</div>
                                                            <div className="text-xs text-gray-600">Priority Customers</div>
                                                        </div>
                                                    </div>
                                                    
                                                    {week.focus_areas && week.focus_areas.length > 0 && (
                                                        <div className="mb-3">
                                                            <div className="text-sm font-medium text-gray-700 mb-2">Focus Areas:</div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {week.focus_areas.map((area, areaIndex) => (
                                                                    <span key={areaIndex} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs">
                                                                        {area}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {week.priority_customers && week.priority_customers.length > 0 && (
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-700 mb-2">Priority Customers:</div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {week.priority_customers.slice(0, 5).map((customer, customerIndex) => (
                                                                    <span key={customerIndex} className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs">
                                                                        {customer}
                                                                    </span>
                                                                ))}
                                                                {week.priority_customers.length > 5 && (
                                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs">
                                                                        +{week.priority_customers.length - 5} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )) || (
                                                <div className="text-center py-8 text-gray-500">
                                                    <div className="text-4xl mb-4">📅</div>
                                                    <p>No weekly plans available</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Customer Visit Frequency */}
                                {monthlyPlan.current_plan_json?.customer_visit_frequency && (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-xl">
                                            <h3 className="text-xl font-bold">Customer Visit Schedule</h3>
                                            <p className="text-green-100 mt-2">Planned customer visit frequencies and priorities</p>
                                        </div>
                                        
                                        <div className="p-6">
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Planned Visits</th>
                                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Priority Reason</th>
                                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled Dates</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {Object.entries(monthlyPlan.current_plan_json.customer_visit_frequency)
                                                            .slice(0, 10)
                                                            .map(([customerName, schedule], index) => (
                                                                <tr key={index} className="hover:bg-gray-50">
                                                                    <td className="px-4 py-3 font-medium text-gray-900">{customerName}</td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                                                                            schedule.tier === 'TIER_1_CHAMPION' ? 'bg-purple-100 text-purple-800' :
                                                                            schedule.tier === 'TIER_2_PERFORMER' ? 'bg-blue-100 text-blue-800' :
                                                                            schedule.tier === 'TIER_3_DEVELOPER' ? 'bg-green-100 text-green-800' :
                                                                            'bg-gray-100 text-gray-800'
                                                                        }`}>
                                                                            {schedule.tier?.replace('TIER_', 'T') || 'T4'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center font-semibold">{schedule.planned_visits}</td>
                                                                    <td className="px-4 py-3 text-center text-sm text-gray-600">{schedule.priority_reason}</td>
                                                                    <td className="px-4 py-3 text-center text-xs">
                                                                        {schedule.recommended_dates?.slice(0, 2).map((date, dateIndex) => (
                                                                            <div key={dateIndex} className="mb-1">
                                                                                {new Date(date).toLocaleDateString()}
                                                                            </div>
                                                                        ))}
                                                                        {schedule.recommended_dates?.length > 2 && (
                                                                            <div className="text-gray-500">+{schedule.recommended_dates.length - 2} more</div>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {Object.keys(monthlyPlan.current_plan_json.customer_visit_frequency).length > 10 && (
                                                <div className="text-center mt-4 text-sm text-gray-500">
                                                    Showing top 10 customers. Total: {Object.keys(monthlyPlan.current_plan_json.customer_visit_frequency).length} customers planned.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                                <div className="text-center">
                                    <div className="text-6xl mb-4">📅</div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Monthly Plan Generated</h3>
                                    <p className="text-gray-600 mb-6">Create a comprehensive monthly tour plan to get started with systematic territory planning.</p>
                                    <button
                                        onClick={generateMonthlyPlan}
                                        disabled={actionLoading === 'generating'}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                                    >
                                        {actionLoading === 'generating' ? 'Generating...' : 'Generate Monthly Plan'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeView === 'weekly-analysis' && (
                    <div className="space-y-6">
                        {/* Weekly Analysis Header */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Performance Analysis</h3>
                            <p className="text-gray-600">Automated plan vs actual analysis performed every Sunday for continuous improvement.</p>
                        </div>

                        {/* Week Cards */}
                        <div className="grid gap-6">
                            {[1, 2, 3, 4].map(weekNumber => {
                                const weekRevision = weeklyRevisions.find(r => r.week_number === weekNumber);
                                const weekStatus = getWeekStatus(weekNumber);
                                
                                return (
                                    <div key={weekNumber} className="bg-white rounded-xl shadow-sm border border-gray-200">
                                        <div className={`p-6 rounded-t-xl ${
                                            weekStatus === 'completed' && weekRevision ? 'bg-gradient-to-r from-green-600 to-green-700' :
                                            weekStatus === 'completed' ? 'bg-gradient-to-r from-yellow-600 to-yellow-700' :
                                            weekStatus === 'current' ? 'bg-gradient-to-r from-blue-600 to-blue-700' :
                                            'bg-gradient-to-r from-gray-600 to-gray-700'
                                        } text-white`}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-xl font-bold">Week {weekNumber} Analysis</h4>
                                                    <p className="opacity-90 mt-1">
                                                        {weekStatus === 'completed' && weekRevision ? 'Analysis completed' :
                                                         weekStatus === 'completed' ? 'Ready for analysis' :
                                                         weekStatus === 'current' ? 'Week in progress' :
                                                         'Analysis upcoming'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl mb-1">
                                                        {weekStatus === 'completed' && weekRevision ? '📊' :
                                                         weekStatus === 'completed' ? '⏰' :
                                                         weekStatus === 'current' ? '⚡' : '⏳'}
                                                    </div>
                                                    {canPerformRevision(weekNumber) && (
                                                        <button
                                                            onClick={() => performWeeklyRevision(weekNumber)}
                                                            disabled={actionLoading?.startsWith('revision')}
                                                            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                                                        >
                                                            {actionLoading === `revision-${weekNumber}` ? 'Analyzing...' : 'Analyze Now'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="p-6">
                                            {weekRevision ? (
                                                <div className="space-y-6">
                                                    {/* Performance Metrics */}
                                                    <div>
                                                        <h5 className="font-semibold text-gray-900 mb-4">Performance Metrics</h5>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            <div className={`p-3 rounded-lg border ${getPerformanceColor(weekRevision.performance_analysis?.visit_achievement_percentage || 0)}`}>
                                                                <div className="text-lg font-bold">{(weekRevision.performance_analysis?.visit_achievement_percentage || 0).toFixed(1)}%</div>
                                                                <div className="text-sm">Visit Achievement</div>
                                                            </div>
                                                            <div className={`p-3 rounded-lg border ${getPerformanceColor(weekRevision.performance_analysis?.revenue_achievement_percentage || 0)}`}>
                                                                <div className="text-lg font-bold">{(weekRevision.performance_analysis?.revenue_achievement_percentage || 0).toFixed(1)}%</div>
                                                                <div className="text-sm">Revenue Achievement</div>
                                                            </div>
                                                            <div className={`p-3 rounded-lg border ${getPerformanceColor(weekRevision.performance_analysis?.conversion_performance || 0)}`}>
                                                                <div className="text-lg font-bold">{(weekRevision.performance_analysis?.conversion_performance || 0).toFixed(1)}%</div>
                                                                <div className="text-sm">Conversion Rate</div>
                                                            </div>
                                                            <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 text-blue-600">
                                                                <div className="text-lg font-bold">{weekRevision.performance_analysis?.customer_coverage || 0}</div>
                                                                <div className="text-sm">Customers Visited</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Recommendations */}
                                                    {weekRevision.recommendations && weekRevision.recommendations.length > 0 && (
                                                        <div>
                                                            <h5 className="font-semibold text-gray-900 mb-4">Recommendations</h5>
                                                            <div className="space-y-3">
                                                                {weekRevision.recommendations.map((rec, index) => (
                                                                    <div key={index} className={`p-3 rounded-lg border-l-4 ${
                                                                        rec.priority === 'HIGH' ? 'border-red-500 bg-red-50' :
                                                                        rec.priority === 'MEDIUM' ? 'border-yellow-500 bg-yellow-50' :
                                                                        'border-blue-500 bg-blue-50'
                                                                    }`}>
                                                                        <div className="flex items-start gap-3">
                                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                                                rec.priority === 'HIGH' ? 'bg-red-200 text-red-800' :
                                                                                rec.priority === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                                                                                'bg-blue-200 text-blue-800'
                                                                            }`}>
                                                                                {rec.priority}
                                                                            </span>
                                                                            <div className="flex-1">
                                                                                <div className="font-medium text-gray-900">{rec.recommendation}</div>
                                                                                <div className="text-sm text-gray-600 mt-1">{rec.action}</div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-gray-500">
                                                    <div className="text-4xl mb-4">📊</div>
                                                    <p>
                                                        {weekStatus === 'completed' ? 'Analysis pending for this week' :
                                                         weekStatus === 'current' ? 'Week still in progress' :
                                                         'Analysis will be available after week completion'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeView === 'reports' && (
                    <div className="space-y-6">
                        {/* Reports Header */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Monthly Performance Reports</h3>
                                    <p className="text-gray-600 mt-1">Comprehensive analysis and insights for completed months</p>
                                </div>
                                {canGenerateReport() && (
                                    <button
                                        onClick={generateMonthlyReport}
                                        disabled={actionLoading === 'report'}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                                    >
                                        {actionLoading === 'report' ? 'Generating...' : 'Generate Report'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Reports List */}
                        {monthlyReports.length > 0 ? (
                            <div className="space-y-4">
                                {monthlyReports.map((report, index) => (
                                    <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-semibold text-gray-900">
                                                {getMonthName(report.month)} {report.year} Report
                                            </h4>
                                            <span className="text-sm text-gray-500">
                                                Generated: {new Date(report.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                                <div className="text-blue-600 font-semibold mb-2">Performance Summary</div>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span>Visit Achievement:</span>
                                                        <span className="font-medium">{report.final_metrics?.planned_vs_actual?.visit_achievement?.toFixed(1) || 0}%</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Revenue Achievement:</span>
                                                        <span className="font-medium">{report.final_metrics?.planned_vs_actual?.revenue_achievement?.toFixed(1) || 0}%</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Plan Adherence:</span>
                                                        <span className="font-medium">{report.final_metrics?.planned_vs_actual?.plan_adherence_score?.toFixed(1) || 0}%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                                                <div className="text-green-600 font-semibold mb-2">Key Achievements</div>
                                                <div className="space-y-1 text-sm">
                                                    {report.final_metrics?.key_achievements?.slice(0, 3).map((achievement, i) => (
                                                        <div key={i} className="flex items-start gap-2">
                                                            <span className="text-green-500 mt-0.5">✓</span>
                                                            <span>{achievement}</span>
                                                        </div>
                                                    )) || (
                                                        <div className="text-gray-500">No achievements recorded</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                                                <div className="text-orange-600 font-semibold mb-2">Improvement Areas</div>
                                                <div className="space-y-1 text-sm">
                                                    {report.final_metrics?.improvement_areas?.slice(0, 3).map((area, i) => (
                                                        <div key={i} className="flex items-start gap-2">
                                                            <span className="text-orange-500 mt-0.5">⚠</span>
                                                            <span>{area}</span>
                                                        </div>
                                                    )) || (
                                                        <div className="text-gray-500">No improvement areas identified</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Lessons Learned */}
                                        {report.lessons_learned && report.lessons_learned.length > 0 && (
                                            <div className="mt-6 bg-purple-50 rounded-lg p-4 border border-purple-100">
                                                <div className="text-purple-600 font-semibold mb-2">Lessons Learned</div>
                                                <div className="space-y-1 text-sm">
                                                    {report.lessons_learned.slice(0, 3).map((lesson, i) => (
                                                        <div key={i} className="flex items-start gap-2">
                                                            <span className="text-purple-500 mt-0.5">💡</span>
                                                            <span>{lesson}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Next Month Recommendations */}
                                        {report.next_month_recommendations && report.next_month_recommendations.length > 0 && (
                                            <div className="mt-4 bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                                                <div className="text-indigo-600 font-semibold mb-2">Next Month Recommendations</div>
                                                <div className="space-y-1 text-sm">
                                                    {report.next_month_recommendations.map((rec, i) => (
                                                        <div key={i} className="flex items-start gap-2">
                                                            <span className="text-indigo-500 mt-0.5">🎯</span>
                                                            <span>{rec}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                                <div className="text-center">
                                    <div className="text-6xl mb-4">📈</div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reports Available</h3>
                                    <p className="text-gray-600 mb-6">
                                        {canGenerateReport() 
                                            ? 'Generate a comprehensive monthly report to analyze performance and get insights.'
                                            : 'Complete the month and perform weekly analyses to generate reports.'
                                        }
                                    </p>
                                    {canGenerateReport() && (
                                        <button
                                            onClick={generateMonthlyReport}
                                            disabled={actionLoading === 'report'}
                                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading === 'report' ? 'Generating...' : 'Generate Monthly Report'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Loading Overlay */}
                {loading && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-8 text-center max-w-sm mx-4 shadow-2xl">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-blue-200 rounded-full mx-auto mb-4"></div>
                                <div className="w-16 h-16 border-4 border-blue-600 rounded-full animate-spin absolute top-0 left-1/2 transform -translate-x-1/2 border-t-transparent"></div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Monthly Data</h3>
                            <p className="text-gray-600 text-sm">
                                Loading plans and analysis data...
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MonthlyTourPlanDashboard;
