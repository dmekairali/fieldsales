import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, Target, Users, MapPin, DollarSign, AlertTriangle, CheckCircle, Clock, BarChart3, RefreshCw } from 'lucide-react';
import { weeklyRevisionService } from '../services/WeeklyRevisionService';

const WeeklyRevisionDashboard = ({ 
  mrName: propMrName, 
  selectedMonth: propMonth, 
  selectedYear: propYear,
  monthlyPlan: propMonthlyPlan 
}) => {
  // Use props for main data, but allow override if props not provided
  const [mrName] = useState(propMrName || 'John Doe');
  const [selectedMonth] = useState(propMonth || 7);
  const [selectedYear] = useState(propYear || 2025);
  const [currentWeek, setCurrentWeek] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  
  // Real data from backend
  const [dashboardData, setDashboardData] = useState(null);
  const [weeklyData, setWeeklyData] = useState({});
  const [monthlyPlan, setMonthlyPlan] = useState(propMonthlyPlan || null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [revisionForm, setRevisionForm] = useState({
    weekNumber: 1,
    additional_context: ''
  });

  // Update monthlyPlan when prop changes
  useEffect(() => {
    if (propMonthlyPlan) {
      setMonthlyPlan(propMonthlyPlan);
    }
  }, [propMonthlyPlan]);

  // Load dashboard data on component mount
  useEffect(() => {
    loadDashboardData();
  }, [mrName, selectedMonth, selectedYear]);

  /**
   * Load all dashboard data from backend
   */
  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`📊 Loading dashboard data for ${mrName} - ${selectedMonth}/${selectedYear}`);
      
      const data = await weeklyRevisionService.getDashboardData(mrName, selectedMonth, selectedYear);
      
      if (data) {
        setDashboardData(data);
        setWeeklyData(data.weeklyData);
        setMonthlyPlan(data.monthlyPlan);
        
        console.log('✅ Dashboard data loaded successfully');
        console.log('📈 Weekly data summary:', Object.keys(data.weeklyData).map(week => ({
          week,
          visits: data.weeklyData[week].actual.total_visits,
          revenue: data.weeklyData[week].actual.total_revenue
        })));
      } else {
        setError('No monthly plan found for this period');
      }
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate performance metrics from real data
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
    
    return { visitAchievement, revenueAchievement, performance };
  };

  const getPerformanceColor = (performance) => {
    switch (performance) {
      case 'EXCELLENT': return 'text-green-600 bg-green-50';
      case 'GOOD': return 'text-blue-600 bg-blue-50';
      case 'AVERAGE': return 'text-yellow-600 bg-yellow-50';
      case 'BELOW_AVERAGE': return 'text-orange-600 bg-orange-50';
      case 'POOR': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleRevisionSubmit = async () => {
    if (!monthlyPlan?.thread_id) {
      setError('No thread ID found. Cannot perform revision.');
      return;
    }

    if (!revisionForm.additional_context.trim()) {
      // Optional context, so we can proceed without it
      console.log('ℹ️ No additional context provided, proceeding with AI analysis only');
    }

    setIsRevising(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log(`🤖 Starting AI-powered revision for Week ${revisionForm.weekNumber}`);
      
      const revisionData = {
        thread_id: monthlyPlan.thread_id,
        week_number: revisionForm.weekNumber,
        mr_name: mrName,
        month: selectedMonth,
        year: selectedYear,
        additional_context: revisionForm.additional_context
      };

      const result = await weeklyRevisionService.performWeeklyRevision(revisionData);

      if (result.success) {
        setSuccess(`Week ${revisionForm.weekNumber} revision completed successfully! Version: ${result.version}`);
        
        console.log('✅ AI Revision Results:', {
          revision_id: result.revision_id,
          version: result.version,
          recommendations: result.ai_recommendations?.length || 0,
          actual_visits: result.actual_data?.total_visits,
          actual_revenue: result.actual_data?.total_revenue
        });
        
        // Reload the dashboard data to show updated information
        await loadDashboardData();
        
        // Reset form and move to next week
        setRevisionForm({
          weekNumber: Math.min(revisionForm.weekNumber + 1, 4),
          additional_context: ''
        });
        
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Weekly Revision Dashboard</h1>
              <p className="text-gray-600">Phase 2: Weekly Performance Analysis & Plan Revision</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
                <span className="text-sm text-gray-500">MR:</span>
                <span className="font-semibold text-gray-900 ml-2">{mrName}</span>
              </div>
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
                <span className="text-sm text-gray-500">Period:</span>
                <span className="font-semibold text-gray-900 ml-2">{selectedMonth}/{selectedYear}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-center justify-center space-x-3">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-gray-600">Loading dashboard data...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Success State */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800">{success}</span>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {!isLoading && weeklyData && Object.keys(weeklyData).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Object.entries(weeklyData).map(([weekKey, week], index) => {
            const weekNumber = index + 1;
            const performance = calculateWeekPerformance(week);
            
            return (
              <div key={weekKey} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Week {weekNumber}</h3>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${getPerformanceColor(performance.performance)}`}>
                    {performance.performance}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Visits</span>
                    <span className="font-medium">
                      {week.actual.visits}/{week.planned.visits}
                      {week.actual.visits > 0 && (
                        <span className={`ml-2 text-xs ${performance.visitAchievement >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                          ({performance.visitAchievement.toFixed(0)}%)
                        </span>
                      )}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Revenue</span>
                    <span className="font-medium">
                      ₹{week.actual.revenue.toLocaleString()}/₹{week.planned.revenue.toLocaleString()}
                      {week.actual.revenue > 0 && (
                        <span className={`ml-2 text-xs ${performance.revenueAchievement >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                          ({performance.revenueAchievement.toFixed(0)}%)
                        </span>
                      )}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Customers</span>
                    <span className="font-medium">{week.actual.customers}/{week.planned.customers}</span>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Status</span>
                      <div className="flex items-center space-x-1">
                        {week.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {week.status === 'in_progress' && <Clock className="h-4 w-4 text-blue-600" />}
                        {week.status === 'planned' && <Calendar className="h-4 w-4 text-gray-400" />}
                        <span className="text-xs capitalize">{week.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Performance Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Cumulative Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Cumulative Performance
            </h3>
            
            <div className="space-y-4">
              {Object.entries(weeklyData).map(([weekKey, week], index) => {
                const weekNumber = index + 1;
                const performance = calculateWeekPerformance(week);
                
                if (week.status === 'planned') return null;
                
                return (
                  <div key={weekKey} className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-gray-700">Week {weekNumber}</span>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${performance.visitAchievement >= 100 ? 'bg-green-500' : performance.visitAchievement >= 80 ? 'bg-blue-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(performance.visitAchievement, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 w-10">{performance.visitAchievement.toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-600 w-10">{performance.revenueAchievement.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Territory Coverage Analysis */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Territory Coverage Analysis
            </h3>
            
            <div className="space-y-3">
              {Object.entries(weeklyData).map(([weekKey, week], index) => {
                const weekNumber = index + 1;
                if (week.status === 'planned') return null;
                
                const coveredAreas = week.actual.areas;
                const plannedAreas = week.planned.areas;
                const missedAreas = plannedAreas.filter(area => !coveredAreas.includes(area));
                
                return (
                  <div key={weekKey} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">Week {weekNumber}</span>
                      <span className="text-sm text-gray-500">
                        {coveredAreas.length}/{plannedAreas.length} areas
                      </span>
                    </div>
                    <div className="space-y-1">
                      {plannedAreas.map(area => (
                        <div key={area} className="flex items-center justify-between text-sm">
                          <span className={coveredAreas.includes(area) ? 'text-green-600' : 'text-red-600'}>
                            {area}
                          </span>
                          {coveredAreas.includes(area) ? 
                            <CheckCircle className="h-3 w-3 text-green-600" /> : 
                            <AlertTriangle className="h-3 w-3 text-red-600" />
                          }
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI-Powered Weekly Revision */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <RefreshCw className="h-5 w-5 mr-2" />
            AI-Powered Weekly Revision
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Data Status & Week Selection */}
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <h4 className="font-medium text-blue-900">AI Context Available</h4>
                </div>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>✓ Original monthly plan (Thread ID: abc123)</li>
                  <li>✓ Previous revisions and decisions</li>
                  <li>✓ Customer visit history and patterns</li>
                  <li>✓ Territory performance analytics</li>
                </ul>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Select Week to Revise</label>
                <div className="grid grid-cols-2 gap-3">
                  {[1,2,3,4].map(week => {
                    const weekData = weeklyData[`week${week}`];
                    const canRevise = week === 1 || weeklyData[`week${week-1}`]?.status === 'completed';
                    const isCompleted = weekData.status === 'completed';
                    
                    return (
                      <button
                        key={week}
                        onClick={() => setRevisionForm({...revisionForm, weekNumber: week})}
                        disabled={!canRevise}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          revisionForm.weekNumber === week 
                            ? 'border-blue-500 bg-blue-50 text-blue-900' 
                            : canRevise 
                              ? 'border-gray-200 hover:border-gray-300 bg-white text-gray-700' 
                              : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <div className="font-medium">Week {week}</div>
                        <div className="text-xs mt-1">
                          {isCompleted ? '✓ Completed' : weekData.status === 'in_progress' ? '⏳ In Progress' : '📅 Planned'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-1">How AI Revision Works</h4>
                    <p className="text-sm text-yellow-700">
                      AI analyzes your actual visit data from the database, compares it with the original plan, 
                      and automatically generates optimized revisions for remaining weeks based on performance gaps and opportunities.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* AI Analysis Preview & Action */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                <h4 className="font-medium text-purple-900 mb-3 flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  Week {revisionForm.weekNumber} Analysis Preview
                </h4>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-700">Visit Data:</span>
                    <span className="font-medium text-purple-900">Auto-fetched from database</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Performance Gap:</span>
                    <span className="font-medium text-purple-900">AI calculated</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Redistribution:</span>
                    <span className="font-medium text-purple-900">Smart algorithm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Route Optimization:</span>
                    <span className="font-medium text-purple-900">Territory based</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Additional Context (Optional)</label>
                <textarea
                  value={revisionForm.revisionReason}
                  onChange={(e) => setRevisionForm({...revisionForm, revisionReason: e.target.value})}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional context for the AI? (e.g., market conditions, seasonal factors, specific challenges faced...)"
                />
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={handleRevisionSubmit}
                  disabled={isRevising}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {isRevising ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>AI Analyzing & Revising...</span>
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4" />
                      <span>Generate AI Revision for Week {revisionForm.weekNumber}</span>
                    </>
                  )}
                </button>
                
                <p className="text-xs text-gray-500 text-center">
                  AI will fetch actual visit data, analyze performance gaps, and revise remaining weeks automatically
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Revision History */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Revision History
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 px-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-900">Week 1 Revision Completed</div>
                  <div className="text-sm text-green-700">Performance analysis and remaining weeks adjusted</div>
                </div>
              </div>
              <div className="text-sm text-green-600">Version 1.1 • July 7, 2025</div>
            </div>
            
            <div className="flex items-center justify-between py-3 px-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-900">Monthly Plan Generated</div>
                  <div className="text-sm text-blue-700">Initial 4-week plan created with AI analysis</div>
                </div>
              </div>
              <div className="text-sm text-blue-600">Version 1.0 • July 1, 2025</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyRevisionDashboard;
