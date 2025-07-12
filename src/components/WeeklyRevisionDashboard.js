// /src/components/WeeklyRevisionDashboard.js
// Enhanced Weekly Revision Dashboard with fixes

import React, { useState, useEffect } from 'react';
import { weeklyRevisionService } from '../services/WeeklyRevisionService';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Users, 
  MapPin, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  BarChart3, 
  RefreshCw,
  Activity,
  Zap,
  Eye,
  Edit3,
  Brain,
  ChevronRight,
  ChevronLeft,
  Filter,
  Download,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Info,
  X,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

const WeeklyRevisionDashboard = ({ 
  mrName,                    // MR name string from App.js
  selectedMonth,             // Month number from App.js
  selectedYear,              // Year number from App.js
  onRevisionComplete,        // Callback when revision completes
  mrData                     // Full MR object for additional context
}) => {
  
  // Early validation
  useEffect(() => {
    console.log('🔄 WeeklyRevisionDashboard props received:', {
      mrName,
      selectedMonth,
      selectedYear,
      hasMrData: !!mrData,
      propsValid: !!(mrName && selectedMonth && selectedYear)
    });
  }, [mrName, selectedMonth, selectedYear, mrData]);

  // Calculate current week based on today's date
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    const currentDay = today.getDate();
    return Math.min(Math.ceil(currentDay / 7), 4);
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  
  // Backend data states
  const [dashboardData, setDashboardData] = useState(null);
  const [weeklyData, setWeeklyData] = useState({});
  const [planData, setPlanData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [revisionForm, setRevisionForm] = useState({
    weekNumber: currentWeek,
    additional_context: ''
  });

  // Load dashboard data when key props change
  useEffect(() => {
    if (mrName && selectedMonth && selectedYear && mrName !== 'ALL_MRS') {
      console.log(`🔄 Props changed - loading data for ${mrName} ${selectedMonth}/${selectedYear}`);
      loadDashboardData();
    } else {
      console.log('⚠️ Invalid props for revision:', { mrName, selectedMonth, selectedYear });
      if (!mrName || mrName === 'ALL_MRS') {
        setError('Please select a specific MR for weekly revision');
      } else {
        setError('Missing month or year selection');
      }
    }
  }, [mrName, selectedMonth, selectedYear]);

  const loadDashboardData = async () => {
    if (!mrName || mrName === 'ALL_MRS') {
      setError('Please select a specific MR');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`📊 Loading dashboard data for ${mrName} - ${selectedMonth}/${selectedYear}`);
      
      const data = await weeklyRevisionService.getDashboardData(mrName, selectedMonth, selectedYear);
      
      if (data) {
        setDashboardData(data);
        setWeeklyData(data.weeklyData);
        setPlanData(data.monthlyPlan);
        
        console.log('✅ Dashboard data loaded successfully');
        console.log('📈 Weekly data keys:', Object.keys(data.weeklyData));
      } else {
        setError(`No monthly plan found for ${mrName} in ${selectedMonth}/${selectedYear}`);
      }
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWeekPerformance = (week) => {
    if (!week || !week.actual || !week.planned) {
      return { visitAchievement: 0, revenueAchievement: 0, performance: 'POOR' };
    }
    
    const visitAchievement = week.planned.visits > 0 ? (week.actual.total_visits / week.planned.visits) * 100 : 0;
    const revenueAchievement = week.planned.revenue > 0 ? (week.actual.total_revenue / week.planned.revenue) * 100 : 0;
    const avgPerformance = (visitAchievement + revenueAchievement) / 2;
    
    let performance = 'POOR';
    if (avgPerformance >= 90) performance = 'EXCELLENT';
    else if (avgPerformance >= 75) performance = 'GOOD';
    else if (avgPerformance >= 60) performance = 'AVERAGE';
    else if (avgPerformance >= 40) performance = 'BELOW_AVERAGE';
    
    return { visitAchievement, revenueAchievement, performance, avgPerformance };
  };

  const getPerformanceColor = (performance) => {
    switch (performance) {
      case 'EXCELLENT': return 'text-green-700 bg-green-50 border-green-200';
      case 'GOOD': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'AVERAGE': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'BELOW_AVERAGE': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'POOR': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getPerformanceIcon = (performance) => {
    switch (performance) {
      case 'EXCELLENT': return <CheckCircle className="h-4 w-4" />;
      case 'GOOD': return <TrendingUp className="h-4 w-4" />;
      case 'AVERAGE': return <Activity className="h-4 w-4" />;
      case 'BELOW_AVERAGE': return <TrendingDown className="h-4 w-4" />;
      case 'POOR': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleRevisionSubmit = async () => {
    if (!planData?.thread_id) {
      setError('No thread ID found. Cannot perform revision.');
      return;
    }

    setIsRevising(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log(`🤖 Starting AI-powered revision for Week ${revisionForm.weekNumber}`);
      
      const revisionData = {
        thread_id: planData.thread_id,
        week_number: revisionForm.weekNumber,
        mr_name: mrName,
        month: selectedMonth,
        year: selectedYear,
        additional_context: revisionForm.additional_context
      };

      const result = await weeklyRevisionService.performWeeklyRevision(revisionData);

      if (result.success) {
        setSuccess(`Week ${revisionForm.weekNumber} revision completed successfully! Version: ${result.version}`);
        
        await loadDashboardData();
        
        setRevisionForm({
          weekNumber: Math.min(revisionForm.weekNumber + 1, 4),
          additional_context: ''
        });
        
        if (onRevisionComplete) {
          onRevisionComplete(result);
        }
        
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

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const viewOptions = [
    { id: 'overview', name: 'Overview', icon: BarChart3, description: 'Performance summary' },
    { id: 'performance', name: 'Performance', icon: TrendingUp, description: 'Detailed analysis' },
    { id: 'revision', name: 'AI Revision', icon: Brain, description: 'Smart plan updates' },
    { id: 'history', name: 'History', icon: Clock, description: 'Revision timeline' }
  ];

  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-xl shadow-lg text-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold">Weekly Revision</h1>
                <p className="text-emerald-100">Performance tracking & AI-powered plan adjustments</p>
              </div>
            </div>
            {mrName && (
              <div className="flex items-center space-x-2 text-sm text-emerald-100">
                <Users className="h-4 w-4" />
                <span>Revising for {mrName}</span>
                <span>•</span>
                <Calendar className="h-4 w-4" />
                <span>{monthNames[selectedMonth]} {selectedYear}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
              <div className="text-sm text-emerald-100">Current Week</div>
              <div className="text-xl font-bold">Week {currentWeek}</div>
            </div>
            <button 
              onClick={loadDashboardData}
              disabled={isLoading}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
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

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-center space-x-3">
            <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="text-gray-600">Loading revision data...</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && weeklyData && Object.keys(weeklyData).length > 0 && (
        <div className="space-y-6">
          {/* Weekly Performance Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(weeklyData).map(([weekKey, week], index) => {
              const weekNumber = index + 1;
              const performance = calculateWeekPerformance(week);
              const isCurrentWeek = weekNumber === currentWeek;
              
              return (
                <div key={weekKey} className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-all cursor-pointer ${
                  isCurrentWeek 
                    ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-lg' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`} onClick={() => setCurrentWeek(weekNumber)}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-semibold text-lg ${isCurrentWeek ? 'text-emerald-900' : 'text-gray-900'}`}>
                      Week {weekNumber}
                    </h3>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getPerformanceColor(performance.performance)}`}>
                      <div className="flex items-center space-x-1">
                        {getPerformanceIcon(performance.performance)}
                        <span>{performance.performance}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Visits</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {week.actual?.total_visits || 0}/{week.planned?.visits || 0}
                        </span>
                        {week.actual?.total_visits > 0 && (
                          <div className={`flex items-center space-x-1 text-xs ${
                            performance.visitAchievement >= 100 ? 'text-green-600' : 
                            performance.visitAchievement >= 80 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {performance.visitAchievement >= 100 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            <span>{performance.visitAchievement.toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Revenue</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          ₹{((week.actual?.total_revenue || 0) / 1000).toFixed(0)}K
                        </span>
                        {week.actual?.total_revenue > 0 && (
                          <div className={`flex items-center space-x-1 text-xs ${
                            performance.revenueAchievement >= 100 ? 'text-green-600' : 
                            performance.revenueAchievement >= 80 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {performance.revenueAchievement >= 100 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            <span>{performance.revenueAchievement.toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Customers</span>
                      <span className="font-medium">{week.actual?.unique_customers || 0}</span>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Status</span>
                        <div className="flex items-center space-x-1">
                          {week.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                          {week.status === 'in_progress' && <Clock className="h-4 w-4 text-blue-600" />}
                          {week.status === 'planned' && <Calendar className="h-4 w-4 text-gray-400" />}
                          <span className="text-xs capitalize font-medium">{week.status?.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

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
                          ? 'border-emerald-500 text-emerald-600'
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
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                          <BarChart3 className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-medium text-blue-700 bg-blue-200 px-2 py-1 rounded-full">OVERALL</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-900 mb-1">
                        {Object.values(weeklyData).reduce((sum, week) => sum + (week.actual?.total_visits || 0), 0)}
                      </div>
                      <p className="text-sm text-blue-700">Total visits completed</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-medium text-green-700 bg-green-200 px-2 py-1 rounded-full">REVENUE</span>
                      </div>
                      <div className="text-2xl font-bold text-green-900 mb-1">
                        ₹{(Object.values(weeklyData).reduce((sum, week) => sum + (week.actual?.total_revenue || 0), 0) / 100000).toFixed(1)}L
                      </div>
                      <p className="text-sm text-green-700">Total revenue generated</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                          <Target className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-medium text-purple-700 bg-purple-200 px-2 py-1 rounded-full">EFFICIENCY</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-900 mb-1">
                        {Math.round(Object.values(weeklyData).reduce((sum, week, index) => {
                          const perf = calculateWeekPerformance(week);
                          return sum + perf.avgPerformance;
                        }, 0) / Object.keys(weeklyData).length)}%
                      </div>
                      <p className="text-sm text-purple-700">Average performance</p>
                    </div>
                  </div>

                  {/* Weekly Breakdown Chart */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Performance Breakdown</h3>
                    <div className="space-y-4">
                      {Object.entries(weeklyData).map(([weekKey, week], index) => {
                        const weekNumber = index + 1;
                        const performance = calculateWeekPerformance(week);
                        
                        return (
                          <div key={weekKey} className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                            <div className="w-16 text-center">
                              <div className="font-semibold text-gray-900">Week {weekNumber}</div>
                              <div className="text-xs text-gray-500">{week.status}</div>
                            </div>
                            
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Visits Progress</span>
                                <span className="text-sm font-medium">{week.actual?.total_visits || 0}/{week.planned?.visits || 0}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all ${
                                    performance.visitAchievement >= 100 ? 'bg-green-500' : 
                                    performance.visitAchievement >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(performance.visitAchievement, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                            
                            <div className="w-24 text-right">
                              <div className={`text-sm font-semibold ${
                                performance.visitAchievement >= 100 ? 'text-green-600' : 
                                performance.visitAchievement >= 80 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {performance.visitAchievement.toFixed(0)}%
                              </div>
                              <div className="text-xs text-gray-500">Achievement</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Performance View */}
              {activeView === 'performance' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Detailed Performance Analysis</h3>
                    <div className="flex items-center space-x-2">
                      <select 
                        value={currentWeek} 
                        onChange={(e) => setCurrentWeek(parseInt(e.target.value))}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        {[1,2,3,4].map(week => (
                          <option key={week} value={week}>Week {week}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {weeklyData[`week${currentWeek}`] && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Performance Metrics */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="font-semibold text-gray-900 mb-4">Week {currentWeek} Metrics</h4>
                        <div className="space-y-4">
                          {(() => {
                            const week = weeklyData[`week${currentWeek}`];
                            const performance = calculateWeekPerformance(week);
                            
                            return (
                              <>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                  <span className="text-gray-600">Visit Achievement</span>
                                  <span className={`font-semibold ${
                                    performance.visitAchievement >= 100 ? 'text-green-600' : 
                                    performance.visitAchievement >= 80 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {performance.visitAchievement.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                  <span className="text-gray-600">Revenue Achievement</span>
                                  <span className={`font-semibold ${
                                    performance.revenueAchievement >= 100 ? 'text-green-600' : 
                                    performance.revenueAchievement >= 80 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {performance.revenueAchievement.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                  <span className="text-gray-600">Actual Visits</span>
                                  <span className="font-semibold">{week.actual?.total_visits || 0}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                  <span className="text-gray-600">Planned Visits</span>
                                  <span className="font-semibold">{week.planned?.visits || 0}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                  <span className="text-gray-600">Revenue Generated</span>
                                  <span className="font-semibold">₹{(week.actual?.total_revenue || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                  <span className="text-gray-600">Unique Customers</span>
                                  <span className="font-semibold">{week.actual?.unique_customers || 0}</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Territory Coverage */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="font-semibold text-gray-900 mb-4">Territory Coverage</h4>
                        <div className="space-y-3">
                          {(() => {
                            const week = weeklyData[`week${currentWeek}`];
                            const coveredAreas = week.actual?.areas_covered || [];
                            const plannedAreas = week.planned?.areas || [];
                            
                            return plannedAreas.map(area => (
                              <div key={area} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                                <span className="font-medium text-gray-900">{area}</span>
                                <div className="flex items-center space-x-2">
                                  {coveredAreas.includes(area) ? (
                                    <>
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                      <span className="text-sm text-green-600 font-medium">Covered</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="h-4 w-4 text-red-600" />
                                      <span className="text-sm text-red-600 font-medium">Missed</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Revision View */}
              {activeView === 'revision' && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Brain className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-emerald-900 mb-2">AI-Powered Weekly Revision</h3>
                        <p className="text-emerald-800 text-sm leading-relaxed">
                          Our AI analyzes actual visit data, identifies performance gaps, and automatically generates 
                          optimized revisions for remaining weeks. No manual data entry required.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Week Selection & Context */}
                    <div className="space-y-6">
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="font-semibold text-gray-900 mb-4">Select Week to Revise</h4>

<div className="grid grid-cols-2 gap-3">
  {[1,2,3,4].map(week => {
    const weekData = weeklyData[`week${week}`];
    const isCompleted = weekData?.status === 'completed';
    const isSelected = revisionForm.weekNumber === week;
    // Only allow revision if week is not completed and previous week is completed (or week 1)
    const canRevise = !isCompleted && (week === 1 || weeklyData[`week${week-1}`]?.status === 'completed');
    
    return (
      <button
        key={week}
        onClick={() => !isCompleted && setRevisionForm({...revisionForm, weekNumber: week})}
        disabled={!canRevise}
        className={`p-4 rounded-xl border-2 transition-all ${
          isSelected
            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-lg'
            : canRevise 
              ? 'border-gray-200 hover:border-gray-300 bg-white text-gray-700 hover:shadow-md' 
              : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
        }`}
      >
        <div className="text-center">
          <div className="font-semibold text-lg">Week {week}</div>
          <div className="text-xs mt-1">
            {isCompleted ? (
              <span className="inline-flex items-center space-x-1 text-green-600">
                <CheckCircle className="h-3 w-3" />
                <span>Completed</span>
              </span>
            ) : weekData?.status === 'in_progress' ? (
              <span className="inline-flex items-center space-x-1 text-blue-600">
                <Clock className="h-3 w-3" />
                <span>In Progress</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 text-gray-500">
                <Calendar className="h-3 w-3" />
                <span>Planned</span>
              </span>
            )}
          </div>
          {weekData?.actual?.total_visits > 0 && (
            <div className="mt-2 text-xs text-gray-600">
              {weekData.actual.total_visits} visits completed
            </div>
          )}
        </div>
      </button>
    );
  })}
</div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <div className="flex items-start space-x-3">
                          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium text-blue-900 mb-2">AI Context Available</h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                              <li>✓ Original monthly plan & strategy</li>
                              <li>✓ Actual visit data from database</li>
                              <li>✓ Customer performance history</li>
                              <li>✓ Territory efficiency patterns</li>
                              <li>✓ Previous revision decisions</li>
                              {planData?.thread_id && (
                                <li>✓ Thread ID: {planData.thread_id.substring(0, 12)}...</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="font-semibold text-gray-900 mb-4">Additional Context (Optional)</h4>
                        <textarea
                          value={revisionForm.additional_context}
                          onChange={(e) => setRevisionForm({...revisionForm, additional_context: e.target.value})}
                          rows={4}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                          placeholder="Any additional context for the AI? (e.g., market conditions, seasonal factors, specific challenges...)"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          AI will automatically analyze performance data. Add context only if needed.
                        </p>
                      </div>
                    </div>

                    {/* AI Analysis Preview & Action */}
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
                        <h4 className="font-medium text-purple-900 mb-4 flex items-center">
                          <Sparkles className="h-5 w-5 mr-2" />
                          Week {revisionForm.weekNumber} AI Analysis Preview
                        </h4>
                        
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center py-2 border-b border-purple-200">
                            <span className="text-purple-700">Visit Data Source:</span>
                            <span className="font-medium text-purple-900">Live Database</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-purple-200">
                            <span className="text-purple-700">Performance Analysis:</span>
                            <span className="font-medium text-purple-900">AI Calculated</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-purple-200">
                            <span className="text-purple-700">Gap Identification:</span>
                            <span className="font-medium text-purple-900">Automatic</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-purple-200">
                            <span className="text-purple-700">Redistribution:</span>
                            <span className="font-medium text-purple-900">Smart Algorithm</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-purple-700">Route Optimization:</span>
                            <span className="font-medium text-purple-900">Territory-based</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="font-semibold text-gray-900 mb-4">Expected Outcomes</h4>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <Target className="h-5 w-5 text-green-600" />
                            <span className="text-sm text-green-800">Optimized remaining weeks schedule</span>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <Users className="h-5 w-5 text-blue-600" />
                            <span className="text-sm text-blue-800">Missed customer redistribution</span>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <BarChart3 className="h-5 w-5 text-purple-600" />
                            <span className="text-sm text-purple-800">Performance gap analysis</span>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <MapPin className="h-5 w-5 text-orange-600" />
                            <span className="text-sm text-orange-800">Territory efficiency improvements</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">

<button
  onClick={handleRevisionSubmit}
  disabled={
    isRevising || 
    !planData?.thread_id || 
    weeklyData[`week${revisionForm.weekNumber}`]?.status === 'completed'
  }
  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-4 px-6 rounded-lg font-semibold hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
>
  {isRevising ? (
    <>
      <RefreshCw className="h-5 w-5 animate-spin" />
      <span>AI Analyzing & Revising...</span>
    </>
  ) : (
    <>
      <Brain className="h-5 w-5" />
      <span>
        {weeklyData[`week${revisionForm.weekNumber}`]?.status === 'completed'
          ? 'Week Already Completed'
          : `Generate AI Revision for Week ${revisionForm.weekNumber}`
        }
      </span>
    </>
  )}
</button>
                        
                        <p className="text-xs text-gray-500 text-center">
                          AI will automatically fetch visit data and optimize remaining weeks
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* History View */}
              {activeView === 'history' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Revision History</h3>
                    <div className="flex items-center space-x-2">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                        <option>All Revisions</option>
                        <option>This Month</option>
                        <option>Completed</option>
                        <option>Pending</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Sample revision history items */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Week 1 Revision Completed</h4>
                            <p className="text-sm text-gray-600">AI-powered performance analysis and plan adjustment</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">Version 1.1</div>
                          <div className="text-xs text-gray-500">July 7, 2025</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm text-gray-600">Performance Impact</div>
                          <div className="font-semibold text-green-600">+15% efficiency</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm text-gray-600">Visits Redistributed</div>
                          <div className="font-semibold text-gray-900">24 visits</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm text-gray-600">Revenue Adjustment</div>
                          <div className="font-semibold text-blue-600">₹2.3L optimized</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>AI Confidence: 94%</span>
                          <span>•</span>
                          <span>Tokens Used: 1,247</span>
                        </div>
                        <button className="inline-flex items-center space-x-1 text-sm text-emerald-600 hover:text-emerald-800">
                          <Eye className="h-4 w-4" />
                          <span>View Details</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Monthly Plan Generated</h4>
                            <p className="text-sm text-gray-600">Initial 4-week plan created with AI analysis</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">Version 1.0</div>
                          <div className="text-xs text-gray-500">July 1, 2025</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm text-gray-600">Total Customers</div>
                          <div className="font-semibold text-gray-900">250 customers</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm text-gray-600">Planned Visits</div>
                          <div className="font-semibold text-gray-900">420 visits</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm text-gray-600">Target Revenue</div>
                          <div className="font-semibold text-green-600">₹27.5L</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>Territory Coverage: 8 areas</span>
                          <span>•</span>
                          <span>Optimization Score: 87%</span>
                        </div>
                        <button className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800">
                          <Eye className="h-4 w-4" />
                          <span>View Original Plan</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!isLoading && (!weeklyData || Object.keys(weeklyData).length === 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Activity className="h-10 w-10 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">No Revision Data Available</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {!mrName || mrName === 'ALL_MRS' 
                ? 'Please select a specific MR to view weekly revision data'
                : `No monthly plan found for ${mrName} in ${monthNames[selectedMonth]} ${selectedYear}. Please generate a monthly plan first.`
              }
            </p>
            
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6 max-w-md mx-auto border border-emerald-200">
              <h4 className="font-semibold text-emerald-900 mb-3">📋 Getting Started</h4>
              <div className="text-sm text-emerald-800 space-y-2">
                <p>1. Select a specific MR (not "All MRs")</p>
                <p>2. Generate a monthly plan first</p>
                <p>3. Execute visits according to plan</p>
                <p>4. Return here for weekly revisions</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyRevisionDashboard;