// /src/components/MonthlyPlanDashboardV2.js
// Enhanced Monthly Planning Dashboard - World Class UI

import React, { useState, useEffect } from 'react';
import MonthlyPlanServiceV2 from '../services/MonthlyPlanServiceV2';
import MonthlyPlanDecompressionService from '../services/MonthlyPlanDecompressionService';
import { 
  Calendar, 
  TrendingUp, 
  MapPin, 
  Users, 
  Target,
  DollarSign,
  Clock,
  BarChart3,
  RefreshCw,
  Download,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  Zap,
  CheckCircle,
  AlertCircle,
  Info,
  X
} from 'lucide-react';

const MonthlyPlanDashboardV2 = ({ selectedMR, selectedMRName }) => {
    const [monthlyPlan, setMonthlyPlan] = useState(null);
    const [expandedPlan, setExpandedPlan] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeView, setActiveView] = useState('overview'); // overview, calendar, weekly, customers
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [calendarDate, setCalendarDate] = useState(new Date());

    const planService = new MonthlyPlanServiceV2();
    const decompressionService = new MonthlyPlanDecompressionService();

    const monthNames = [
        '', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const mrName = selectedMR?.name || selectedMRName;

    // Load existing plan on component mount or when MR/month changes
    useEffect(() => {
        if (mrName && mrName !== 'ALL_MRS') {
            loadExistingPlan();
        }
    }, [mrName, selectedMonth, selectedYear]);

    const loadExistingPlan = async () => {
        try {
            setError(null);
            console.log(`🔍 [Monthly Planning] Loading plan for ${mrName} - ${selectedMonth}/${selectedYear}`);
            
            const dashboardData = await planService.getDashboardData(mrName, selectedMonth, selectedYear);
            
            if (dashboardData) {
                setMonthlyPlan({
                    id: dashboardData.metadata?.plan_id,
                    current_plan_json: {
                        mo: dashboardData.monthly_overview,
                        cvs: {},
                        ws: dashboardData.weekly_summary
                    },
                    thread_id: dashboardData.metadata?.thread_id,
                    tokens_used: dashboardData.metadata?.tokens_used,
                    generated_at: dashboardData.metadata?.generated_at,
                    plan_version: dashboardData.metadata?.plan_version
                });
                
                setExpandedPlan({
                    mo: dashboardData.monthly_overview,
                    customer_summary: dashboardData.customer_summary,
                    weekly_summary: dashboardData.weekly_summary,
                    summary_metrics: dashboardData.summary_metrics,
                    quick_stats: dashboardData.quick_stats
                });
                
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
        if (!mrName || mrName === 'ALL_MRS') {
            setError('Please select a specific MR first');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setSuccess(null);

        try {
            console.log(`🚀 [Monthly Planning] Generating new plan for ${mrName}`);
            
            const result = await planService.generateEnhancedMonthlyPlan(mrName, selectedMonth, selectedYear);

            if (result.success) {
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
                
                setSuccess(`Monthly plan generated successfully! Plan ID: ${result.plan_id}`);
                setActiveView('overview');
                
                console.log('✅ Plan generated successfully');
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

    const clearMessages = () => {
        setError(null);
        setSuccess(null);
    };

    const navigateMonth = (direction) => {
        if (direction === 'next') {
            if (selectedMonth === 12) {
                setSelectedMonth(1);
                setSelectedYear(selectedYear + 1);
            } else {
                setSelectedMonth(selectedMonth + 1);
            }
        } else {
            if (selectedMonth === 1) {
                setSelectedMonth(12);
                setSelectedYear(selectedYear - 1);
            } else {
                setSelectedMonth(selectedMonth - 1);
            }
        }
    };

    const getCalendarDays = () => {
        const year = selectedYear;
        const month = selectedMonth;
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        const days = [];
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        
        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }
        
        return days;
    };

    const getVisitsForDay = (day) => {
        if (!expandedPlan?.customer_summary || !day) return [];
        
        const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        return expandedPlan.customer_summary.filter(customer => 
            customer.visit_dates && customer.visit_dates.includes(dateStr)
        );
    };

    const viewOptions = [
        { id: 'overview', name: 'Overview', icon: BarChart3, description: 'Key metrics & summary' },
        { id: 'calendar', name: 'Calendar View', icon: Calendar, description: 'Daily visit schedule' },
        { id: 'weekly', name: 'Weekly Plans', icon: Clock, description: 'Week-wise breakdown' },
        { id: 'customers', name: 'Customer List', icon: Users, description: 'All planned customers' }
    ];

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-xl shadow-lg text-white p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <Calendar className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl lg:text-3xl font-bold">Monthly Planning</h1>
                                <p className="text-violet-100">AI-powered territory tour planning</p>
                            </div>
                        </div>
                        {mrName && mrName !== 'ALL_MRS' && (
                            <div className="flex items-center space-x-2 text-sm text-violet-100">
                                <Users className="h-4 w-4" />
                                <span>Planning for {mrName}</span>
                                {selectedMR?.territory && (
                                    <>
                                        <span>•</span>
                                        <MapPin className="h-4 w-4" />
                                        <span>{selectedMR.territory}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Month/Year Navigation */}
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center bg-white bg-opacity-20 rounded-lg p-2">
                            <button 
                                onClick={() => navigateMonth('prev')}
                                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div className="px-4 py-2 text-center min-w-32">
                                <div className="font-semibold">{monthNames[selectedMonth]}</div>
                                <div className="text-sm text-violet-200">{selectedYear}</div>
                            </div>
                            <button 
                                onClick={() => navigateMonth('next')}
                                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                        
                        {monthlyPlan && (
                            <div className="flex items-center space-x-2">
                                <button className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors">
                                    <Download className="h-5 w-5" />
                                </button>
                                <button 
                                    onClick={loadExistingPlan}
                                    className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                                >
                                    <RefreshCw className="h-5 w-5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Alert Messages */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <h4 className="font-medium text-red-900">Error</h4>
                        <p className="text-red-700 text-sm mt-1">{error}</p>
                    </div>
                    <button onClick={clearMessages} className="text-red-400 hover:text-red-600">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
            
            {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <h4 className="font-medium text-green-900">Success</h4>
                        <p className="text-green-700 text-sm mt-1">{success}</p>
                    </div>
                    <button onClick={clearMessages} className="text-green-400 hover:text-green-600">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Plan Generation State */}
            {isGenerating && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    <div className="text-center">
                        <div className="relative mb-6">
                            <div className="w-16 h-16 border-4 border-violet-200 rounded-full mx-auto"></div>
                            <div className="w-16 h-16 border-4 border-violet-600 rounded-full animate-spin absolute top-0 left-1/2 transform -translate-x-1/2 border-t-transparent"></div>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">Generating AI Monthly Plan</h3>
                        <p className="text-gray-600 mb-6">
                            AI is analyzing {mrName}'s territory and creating an optimized monthly schedule...
                        </p>
                        
                        <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-6 max-w-md mx-auto border border-violet-200">
                            <div className="space-y-3 text-sm text-violet-800">
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
                                    <span>Analyzing customer data & territory patterns</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                                    <span>Optimizing visit frequencies & routes</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                                    <span>Building comprehensive monthly schedule</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
                                    <span>Creating revision-ready format</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            {monthlyPlan && expandedPlan && !isGenerating && (
                <div className="space-y-6">
                    {/* Key Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Calendar className="h-6 w-6 text-blue-600" />
                                </div>
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">VISITS</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">
                                {expandedPlan.mo?.total_visits || expandedPlan.summary_metrics?.total_planned_visits || 0}
                            </div>
                            <p className="text-sm text-gray-600">Planned visits</p>
                            <div className="mt-3 flex items-center text-xs text-green-600">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Optimized schedule
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <DollarSign className="h-6 w-6 text-green-600" />
                                </div>
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">REVENUE</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">
                                ₹{((expandedPlan.mo?.target_revenue || expandedPlan.summary_metrics?.total_revenue_target || 0) / 100000).toFixed(1)}L
                            </div>
                            <p className="text-sm text-gray-600">Target revenue</p>
                            <div className="mt-3 flex items-center text-xs text-green-600">
                                <Target className="h-3 w-3 mr-1" />
                                Monthly goal
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Users className="h-6 w-6 text-purple-600" />
                                </div>
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">CUSTOMERS</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">
                                {expandedPlan.summary_metrics?.total_customers || 0}
                            </div>
                            <p className="text-sm text-gray-600">Total customers</p>
                            <div className="mt-3 flex items-center text-xs text-purple-600">
                                <MapPin className="h-3 w-3 mr-1" />
                                All territories
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-orange-600" />
                                </div>
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">EFFICIENCY</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">
                                {expandedPlan.quick_stats?.customers_per_day || Math.round((expandedPlan.mo?.total_visits || 0) / (expandedPlan.mo?.working_days || 26))}
                            </div>
                            <p className="text-sm text-gray-600">Visits per day</p>
                            <div className="mt-3 flex items-center text-xs text-orange-600">
                                <Zap className="h-3 w-3 mr-1" />
                                Optimized load
                            </div>
                        </div>
                    </div>

                    {/* Strategy Summary */}
                    {expandedPlan.mo?.strategy_summary && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                            <div className="flex items-start space-x-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Target className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Monthly Strategy</h3>
                                    <p className="text-blue-800 leading-relaxed">{expandedPlan.mo.strategy_summary}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* View Tabs */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="border-b border-gray-200">
                            <nav className="flex space-x-8 px-6 overflow-x-auto">
                                {viewOptions.map((option) => {
                                    const Icon = option.icon;
                                    const isActive = activeView === option.id;
                                    
                                    return (
                                        <button
                                            key={option.id}
                                            onClick={() => setActiveView(option.id)}
                                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                                                isActive
                                                    ? 'border-violet-500 text-violet-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <Icon className="h-4 w-4" />
                                                <span>{option.name}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1 hidden lg:block">
                                                {option.description}
                                            </div>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* View Content */}
                        <div className="p-6">
                            {/* Overview View */}
                            {activeView === 'overview' && (
                                <div className="space-y-6">
                                    {/* Quick Stats Grid */}
                                    {expandedPlan.quick_stats && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-gray-50 rounded-lg p-4 text-center">
                                                <div className="text-2xl font-bold text-gray-900">
                                                    ₹{(expandedPlan.quick_stats.revenue_per_customer || 0).toLocaleString()}
                                                </div>
                                                <div className="text-sm text-gray-600">Revenue/Customer</div>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-4 text-center">
                                                <div className="text-2xl font-bold text-gray-900">
                                                    {expandedPlan.quick_stats.areas_covered || 0}
                                                </div>
                                                <div className="text-sm text-gray-600">Areas Covered</div>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-4 text-center">
                                                <div className="text-2xl font-bold text-gray-900">
                                                    {expandedPlan.quick_stats.highest_tier_count || 0}
                                                </div>
                                                <div className="text-sm text-gray-600">Top Tier Customers</div>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-4 text-center">
                                                <div className="text-2xl font-bold text-gray-900">
                                                    {expandedPlan.mo?.working_days || 26}
                                                </div>
                                                <div className="text-sm text-gray-600">Working Days</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tier Distribution */}
                                    {expandedPlan.summary_metrics?.tier_distribution && (
                                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Tier Distribution</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {Object.entries(expandedPlan.summary_metrics.tier_distribution).map(([tier, data]) => (
                                                    <div key={tier} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="font-semibold text-gray-900">
                                                                {tier.replace('TIER_', 'Tier ').replace('_', ' ')}
                                                            </span>
                                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                                tier.includes('PERFORMER') ? 'bg-purple-100 text-purple-700' :
                                                                tier.includes('DEVELOPER') ? 'bg-blue-100 text-blue-700' :
                                                                'bg-green-100 text-green-700'
                                                            }`}>
                                                                {data.count} customers
                                                            </span>
                                                        </div>
                                                        <div className="space-y-2 text-sm text-gray-600">
                                                            <div className="flex justify-between">
                                                                <span>Visits:</span>
                                                                <span className="font-medium">{data.visits}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Revenue:</span>
                                                                <span className="font-medium">₹{data.revenue.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Calendar View */}
                            {activeView === 'calendar' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900">Daily Visit Schedule</h3>
                                        <div className="text-sm text-gray-500">
                                            Total: {expandedPlan.summary_metrics?.total_planned_visits || 0} visits planned
                                        </div>
                                    </div>
                                    
                                    {/* Calendar Grid */}
                                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                        {/* Calendar Header */}
                                        <div className="bg-gray-50 border-b border-gray-200 p-4">
                                            <div className="grid grid-cols-7 gap-4 text-center text-sm font-medium text-gray-700">
                                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                                    <div key={day}>{day}</div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        {/* Calendar Body */}
                                        <div className="p-4">
                                            <div className="grid grid-cols-7 gap-4">
                                                {getCalendarDays().map((day, index) => {
                                                    const visits = getVisitsForDay(day);
                                                    const isToday = day === new Date().getDate() && 
                                                                   selectedMonth === new Date().getMonth() + 1 && 
                                                                   selectedYear === new Date().getFullYear();
                                                    
                                                    return (
                                                        <div key={index} className={`min-h-24 p-2 border border-gray-200 rounded-lg ${
                                                            day ? 'bg-white hover:bg-gray-50 cursor-pointer' : 'bg-gray-50'
                                                        } ${isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                                                            {day && (
                                                                <>
                                                                    <div className={`text-sm font-medium mb-2 ${
                                                                        isToday ? 'text-blue-700' : 'text-gray-900'
                                                                    }`}>
                                                                        {day}
                                                                    </div>
                                                                    {visits.length > 0 && (
                                                                        <div className="space-y-1">
                                                                            {visits.slice(0, 2).map((visit, i) => (
                                                                                <div key={i} className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded truncate">
                                                                                    {visit.customer_name}
                                                                                </div>
                                                                            ))}
                                                                            {visits.length > 2 && (
                                                                                <div className="text-xs text-gray-500">
                                                                                    +{visits.length - 2} more
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Weekly Plans View */}
                            {activeView === 'weekly' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900">Weekly Strategic Plans</h3>
                                        <div className="flex items-center space-x-2">
                                            <label className="text-sm font-medium text-gray-700">Week:</label>
                                            <select 
                                                value={selectedWeek} 
                                                onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                            >
                                                {[1,2,3,4].map(week => (
                                                    <option key={week} value={week}>Week {week}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {expandedPlan.weekly_summary?.map((week, index) => {
                                            const weekNumber = index + 1;
                                            const isSelected = selectedWeek === weekNumber;
                                            
                                            return (
                                                <div key={weekNumber} className={`rounded-xl border-2 p-6 transition-all cursor-pointer ${
                                                    isSelected 
                                                        ? 'border-violet-500 bg-violet-50 shadow-lg' 
                                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                                                }`} onClick={() => setSelectedWeek(weekNumber)}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <h4 className={`text-lg font-semibold ${isSelected ? 'text-violet-900' : 'text-gray-900'}`}>
                                                            Week {weekNumber}
                                                        </h4>
                                                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                            {week.dates?.join(' - ') || 'N/A'}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                                        <div className="text-center">
                                                            <div className={`text-2xl font-bold ${isSelected ? 'text-violet-700' : 'text-gray-900'}`}>
                                                                {week.customers || 0}
                                                            </div>
                                                            <div className="text-sm text-gray-600">Customers</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className={`text-2xl font-bold ${isSelected ? 'text-violet-700' : 'text-gray-900'}`}>
                                                                ₹{((week.revenue_target || 0) / 1000).toFixed(0)}K
                                                            </div>
                                                            <div className="text-sm text-gray-600">Revenue Target</div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className={`p-3 rounded-lg ${isSelected ? 'bg-white border border-violet-200' : 'bg-gray-50'}`}>
                                                        <div className="text-sm text-gray-600 mb-1">Strategic Focus</div>
                                                        <div className={`text-sm font-medium ${isSelected ? 'text-violet-800' : 'text-gray-900'}`}>
                                                            {week.focus || 'Balanced territory coverage'}
                                                        </div>
                                                    </div>
                                                    
                                                    {week.expanded_data?.area_coverage && (
                                                        <div className="mt-3 flex flex-wrap gap-1">
                                                            {week.expanded_data.area_coverage.slice(0, 3).map((area, i) => (
                                                                <span key={i} className={`text-xs px-2 py-1 rounded-full ${
                                                                    isSelected ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
                                                                }`}>
                                                                    {area}
                                                                </span>
                                                            ))}
                                                            {week.expanded_data.area_coverage.length > 3 && (
                                                                <span className="text-xs text-gray-500">
                                                                    +{week.expanded_data.area_coverage.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Customers View */}
                            {activeView === 'customers' && (
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                                        <h3 className="text-lg font-semibold text-gray-900">Customer Schedule</h3>
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-2">
                                                <Filter className="h-4 w-4 text-gray-500" />
                                                <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent">
                                                    <option>All Tiers</option>
                                                    <option>Tier 2 Performers</option>
                                                    <option>Tier 3 Developers</option>
                                                    <option>Tier 4 Prospects</option>
                                                </select>
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {expandedPlan.summary_metrics?.total_customers || 0} customers
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Visits</th>
                                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {expandedPlan.customer_summary?.slice(0, 20).map((customer, index) => (
                                                        <tr key={customer.customer_code || index} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div>
                                                                    <div className="font-medium text-gray-900">{customer.customer_name}</div>
                                                                    <div className="text-sm text-gray-500">{customer.customer_code}</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                    {customer.customer_type}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                    customer.tier_level === 'TIER_2_PERFORMER' ? 'bg-purple-100 text-purple-800' :
                                                                    customer.tier_level === 'TIER_3_DEVELOPER' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-green-100 text-green-800'
                                                                }`}>
                                                                    {customer.tier_level?.replace('TIER_', 'T').replace('_', ' ')}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center text-sm text-gray-600">{customer.area_name}</td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-violet-100 text-violet-800">
                                                                    {customer.total_visits}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center font-semibold text-green-600">
                                                                ₹{(customer.estimated_revenue || 0).toLocaleString()}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <button className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500">
                                                                    <Eye className="h-4 w-4 mr-1" />
                                                                    View
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        
                                        {expandedPlan.customer_summary && expandedPlan.customer_summary.length > 20 && (
                                            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                                                <div className="text-center text-sm text-gray-500">
                                                    Showing first 20 customers. Total: {expandedPlan.summary_metrics?.total_customers} customers
                                                    <button className="ml-2 text-violet-600 hover:text-violet-800 font-medium">
                                                        View All
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* No Plan State */}
            {!monthlyPlan && !isGenerating && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Calendar className="h-10 w-10 text-violet-600" />
                        </div>
                        <h3 className="text-2xl font-semibold text-gray-900 mb-3">No Monthly Plan Found</h3>
                        <p className="text-gray-600 mb-8 max-w-md mx-auto">
                            Generate an AI-powered monthly plan for {mrName} for {monthNames[selectedMonth]} {selectedYear}
                        </p>
                        
                        <button
                            onClick={generateNewPlan}
                            disabled={!mrName || mrName === 'ALL_MRS'}
                            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-lg hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            Generate Monthly Plan
                        </button>
                        
                        <div className="mt-8 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-6 max-w-2xl mx-auto border border-violet-200">
                            <h4 className="font-semibold text-violet-900 mb-3">✨ AI-Powered Features</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-violet-800">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                                    <span>Customer tier analysis & prioritization</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                                    <span>Optimized visit frequency planning</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                                    <span>Territory coverage optimization</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                                    <span>Revenue forecasting & targeting</span>
                                </div>
                            </div>
                        </div>
                        
                        {(!mrName || mrName === 'ALL_MRS') && (
                            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-md mx-auto">
                                <div className="flex items-center space-x-2 text-amber-800">
                                    <Info className="h-4 w-4" />
                                    <span className="text-sm font-medium">Please select a specific MR to generate a plan</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Footer with Plan Info */}
            {monthlyPlan && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 text-sm text-gray-600">
                        <div className="flex flex-wrap items-center gap-4">
                            <span>Plan ID: <span className="font-medium text-gray-900">{monthlyPlan.id}</span></span>
                            <span>Version: <span className="font-medium text-gray-900">{monthlyPlan.plan_version}</span></span>
                            <span>Generated: <span className="font-medium text-gray-900">{new Date(monthlyPlan.generated_at).toLocaleDateString()}</span></span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <span>Tokens: <span className="font-medium text-gray-900">{monthlyPlan.tokens_used || 'N/A'}</span></span>
                            <span>Thread: <span className="font-medium text-gray-900">{monthlyPlan.thread_id?.substring(0, 12)}...</span></span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonthlyPlanDashboardV2;