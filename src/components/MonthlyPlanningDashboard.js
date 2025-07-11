import React, { useState, useEffect } from 'react';
import { Calendar, Target, Users, TrendingUp, MapPin, Clock, Download, RefreshCw, CheckCircle, AlertCircle, Zap, BarChart3 } from 'lucide-react';
import { useMedicalRepresentatives } from '../hooks/useMedicalRepresentatives';

const MonthlyPlanningDashboard = () => {
  const [selectedMR, setSelectedMR] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [territoryData, setTerritoryData] = useState(null);
  const [activeView, setActiveView] = useState('overview');

  const { mrList, loading: mrLoading, error: mrError } = useMedicalRepresentatives();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const views = [
    { id: 'overview', label: 'Plan Overview', icon: BarChart3 },
    { id: 'calendar', label: 'Monthly Calendar', icon: Calendar },
    { id: 'customers', label: 'Customer Schedule', icon: Users },
    { id: 'areas', label: 'Area Coverage', icon: MapPin },
    { id: 'analytics', label: 'Performance Analytics', icon: TrendingUp }
  ];

  // Generate monthly plan
  const generatePlan = async () => {
    if (!selectedMR) return;
    
    setLoading(true);
    try {
      // First get territory context
      const territoryResponse = await fetch('/api/territory/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mrName: selectedMR.name,
          month: selectedMonth,
          year: selectedYear
        })
      });

      const territoryContext = await territoryResponse.json();
      setTerritoryData(territoryContext);

      // Generate plan using the API
      const planResponse = await fetch('/api/openai/monthly-plan-persistentV2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mrName: selectedMR.name,
          month: selectedMonth,
          year: selectedYear,
          territoryContext: territoryContext,
          action: 'generate'
        })
      });

      const result = await planResponse.json();
      
      if (result.success) {
        setPlan(result.plan);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Plan generation failed:', error);
      alert(`Plan generation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get status color for metrics
  const getStatusColor = (value, target) => {
    const percentage = (value / target) * 100;
    if (percentage >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const PlanOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{plan?.summary?.total_visits_planned || 0}</span>
          </div>
          <h3 className="font-semibold text-gray-700">Total Visits</h3>
          <p className="text-sm text-gray-500 mt-1">Planned for the month</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{plan?.summary?.total_customers_scheduled || 0}</span>
          </div>
          <h3 className="font-semibold text-gray-700">Customers</h3>
          <p className="text-sm text-gray-500 mt-1">To be visited</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{Object.keys(plan?.avs || {}).length}</span>
          </div>
          <h3 className="font-semibold text-gray-700">Areas</h3>
          <p className="text-sm text-gray-500 mt-1">Coverage planned</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{plan?.summary?.visits_per_day_avg || 0}</span>
          </div>
          <h3 className="font-semibold text-gray-700">Daily Average</h3>
          <p className="text-sm text-gray-500 mt-1">Visits per day</p>
        </div>
      </div>

      {/* Weekly Breakdown */}
      {plan?.wp && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Weekly Planning</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plan.wp.map((week) => (
              <div key={week.w} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Week {week.w}</h4>
                  <span className="text-sm text-gray-500">Days {week.sd}-{week.ed}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Visits:</span>
                    <span className="font-medium">{week.tv}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue:</span>
                    <span className="font-medium">₹{week.tr?.toLocaleString()}</span>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Focus Areas:</p>
                    <div className="flex flex-wrap gap-1">
                      {week.fa?.map((area, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Territory Insights */}
      {territoryData && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Territory Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Customer Distribution</h4>
              <div className="space-y-2">
                {Object.entries(territoryData.tier_distribution || {}).map(([tier, count]) => (
                  <div key={tier} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{tier.replace('TIER_', 'Tier ').replace('_', ' ')}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Performance</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Previous Visits</span>
                  <span className="font-medium">{territoryData.previous_performance?.total_visits || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Revenue</span>
                  <span className="font-medium">₹{territoryData.previous_performance?.total_revenue?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Coverage</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Areas</span>
                  <span className="font-medium">{territoryData.areas?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Working Days</span>
                  <span className="font-medium">{plan?.mo?.wd || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const CustomerSchedule = () => (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Customer Visit Schedule</h3>
      {plan?.cvs ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Customer</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Planned Visits</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Dates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.entries(plan.cvs).slice(0, 20).map(([customerCode, dates]) => (
                <tr key={customerCode} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{customerCode}</td>
                  <td className="px-4 py-3 text-center">{dates.length}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {dates.map((date, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {date}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Generate a plan to view customer schedule
        </div>
      )}
    </div>
  );

  if (mrLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading MR data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Monthly Planning</h1>
              <p className="text-gray-600">AI-powered comprehensive monthly tour planning</p>
            </div>
            <div className="flex items-center gap-4">
              {plan && (
                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <Download className="w-4 h-4" />
                  Export Plan
                </button>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Medical Representative</label>
                <select
                  value={selectedMR?.name || ''}
                  onChange={(e) => {
                    const mr = mrList.find(m => m.name === e.target.value);
                    setSelectedMR(mr);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select MR</option>
                  {mrList.map((mr) => (
                    <option key={mr.id} value={mr.name}>
                      {mr.name} - {mr.territory}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {months.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={generatePlan}
                  disabled={!selectedMR || loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {loading ? 'Generating...' : 'Generate Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        {plan && (
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8">
                {views.map((view) => {
                  const Icon = view.icon;
                  return (
                    <button
                      key={view.id}
                      onClick={() => setActiveView(view.id)}
                      className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeView === view.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {view.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Content */}
        {plan ? (
          <>
            {activeView === 'overview' && <PlanOverview />}
            {activeView === 'customers' && <CustomerSchedule />}
            {activeView === 'calendar' && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Calendar View</h3>
                <p className="text-gray-500">Calendar view coming soon...</p>
              </div>
            )}
            {activeView === 'areas' && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Area Coverage Plan</h3>
                <p className="text-gray-500">Area coverage view coming soon...</p>
              </div>
            )}
            {activeView === 'analytics' && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Analytics</h3>
                <p className="text-gray-500">Analytics view coming soon...</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ready to Generate Monthly Plan</h2>
            <p className="text-gray-600 mb-6">Select an MR and month to generate an AI-powered comprehensive monthly tour plan</p>
            {!selectedMR && (
              <p className="text-sm text-orange-600">Please select a Medical Representative to continue</p>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating Monthly Plan</h3>
              <p className="text-gray-600 text-sm">
                AI is analyzing territory data and creating optimized tour plan...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyPlanningDashboard;
