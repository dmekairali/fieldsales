import React, { useState, useEffect } from 'react';
import {
  Calendar, Users, TrendingUp, Target, Activity,
  Clock, ArrowRight, Eye, CheckCircle, AlertTriangle,
  BarChart3, Download, Filter, Search,
  Sparkles, Route, DollarSign, Stethoscope, Store, Hospital,
  ArrowUpDown, Edit3, ThumbsUp, Cpu, Bot, User, RefreshCw
} from 'lucide-react';

// Import actual supabase client
import { supabase } from '../supabaseClient';

const AITPPlanDashboard = () => {
  const [activeView, setActiveView] = useState("overview");
  const [selectedMR, setSelectedMR] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [mrPlansData, setMrPlansData] = useState([]);
  const [actualVisitsData, setActualVisitsData] = useState([]);
  const [medicalReps, setMedicalReps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMethod, setFilterMethod] = useState("all");

  useEffect(() => {
    loadDashboardData();
    loadMedicalReps();
  }, [selectedMonth, selectedYear]);

  const loadMedicalReps = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_representatives')
        .select('id, name, territory, manager_name, is_active')
        .eq('is_active', true)
        .order('name');

      if (!error && data) {
        setMedicalReps(data);
      }
    } catch (error) {
      console.error('Error loading medical representatives:', error);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load monthly plans
      const { data: plansData, error: plansError } = await supabase
        .from('monthly_tour_plans')
        .select('*')
        .eq('plan_month', selectedMonth)
        .eq('plan_year', selectedYear)
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;

      // Load actual visits from mr_visits table
      const { data: visitsData, error: visitsError } = await supabase
        .from('mr_visits')
        .select('*')
        .gte('dcrDate', `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`)
        .lt('dcrDate', `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-01`);

      if (visitsError) throw visitsError;

      // Load orders from orders table
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'Order Confirmed')
        .gte('order_date', `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`)
        .lt('order_date', `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-01`);

      if (ordersError) throw ordersError;

      // Enrich plans with actual data
      const enrichedData = (plansData || []).map(plan => {
        const actualVisits = (visitsData || []).filter(visit => visit.empName === plan.mr_name);
        const actualOrders = (ordersData || []).filter(order => order.mr_name === plan.mr_name);
        const actualRevenue = actualOrders.reduce((sum, order) => sum + (order.net_amount || 0), 0);

        let plannedVisits = plan.total_planned_visits;
        const planJson = plan.current_plan_json || plan.original_plan_json;

        if (planJson && planJson.daily_plan) {
            plannedVisits = planJson.daily_plan.reduce((total, day) => {
                const dayParts = day.dayparts || {};
                const amVisits = dayParts.AM?.length || 0;
                const pmVisits = dayParts.PM?.length || 0;
                const eveVisits = dayParts.EVE?.length || 0;
                return total + amVisits + pmVisits + eveVisits;
            }, 0);
        }

        return {
          ...plan,
          total_planned_visits: plannedVisits,
          actual_visits: actualVisits.length,
          actual_revenue: actualRevenue,
          actual_orders: actualOrders.length,
          achievement_percentage: plannedVisits > 0 ?
            Math.round((actualVisits.length / plannedVisits) * 100) : 0,
          revenue_achievement: plan.total_revenue_target > 0 ?
            Math.round((actualRevenue / plan.total_revenue_target) * 100) : 0
        };
      });

      setMrPlansData(enrichedData);
      setActualVisitsData(visitsData || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
    setLoading(false);
  };

  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    let sortableData = [...mrPlansData];

    // Apply search filter
    if (searchQuery) {
      sortableData = sortableData.filter(item =>
        item.mr_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (getMRTerritory(item.mr_name) || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply method filter
    if (filterMethod !== "all") {
      sortableData = sortableData.filter(item => {
        const isAI = item.generation_method?.includes('ai');
        return filterMethod === "ai" ? isAI : !isAI;
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (typeof aValue === 'string') {
          return sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else {
          return sortConfig.direction === 'asc'
            ? aValue - bValue
            : bValue - aValue;
        }
      });
    }

    return sortableData;
  };

  const getMRData = (mrName) => {
    return medicalReps.find(mr => mr.name === mrName) || {};
  };

  const getMRTerritory = (mrName) => {
    return getMRData(mrName).territory || 'Unknown Territory';
  };

  const getMethodBadge = (method) => {
    const isAI = method?.includes('ai');
    return isAI ? (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        <Bot className="h-3 w-3 mr-1" />
        AI Generated
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <User className="h-3 w-3 mr-1" />
        Standard
      </span>
    );
  };

  const getStatusBadge = (achievement) => {
    if (achievement >= 90) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Excellent
      </span>;
    } else if (achievement >= 75) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <ThumbsUp className="h-3 w-3 mr-1" />
        Good
      </span>;
    } else if (achievement >= 50) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="h-3 w-3 mr-1" />
        Average
      </span>;
    } else {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Needs Attention
      </span>;
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

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const getVisitsForDay = (day) => {
    const selectedPlanData = mrPlansData.find(plan => plan.mr_name === selectedMR);
    if (!selectedPlanData?.original_plan_json?.daily_plan || !day) return [];

    const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const dayPlan = selectedPlanData.original_plan_json.daily_plan.find(d => d.date === dateStr);

    if (!dayPlan) return [];

    const visits = [];
    Object.entries(dayPlan.dayparts || {}).forEach(([timeSlot, customers]) => {
      (customers || []).forEach(customerId => {
        visits.push({
          timeSlot,
          customerId,
          customer: `Customer ${customerId}`,
          type: Math.random() > 0.7 ? 'doctor' : 'retailer'
        });
      });
    });

    return visits;
  };

  const getActualVisitsForDay = (day) => {
    if (!selectedMR || !day) return [];
    const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return actualVisitsData.filter(visit => visit.empName === selectedMR && visit.dcrDate === dateStr);
  };

  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const selectedPlanData = selectedMR ? mrPlansData.find(plan => plan.mr_name === selectedMR) : null;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl shadow-lg text-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Cpu className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl lg:text-3xl font-bold">AI TP Plan Dashboard</h1>
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold animate-pulse">
                    NEW
                  </span>
                </div>
                <p className="text-indigo-100">Manager view for AI-powered territory planning & performance tracking</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={`${selectedMonth}-${selectedYear}`}
              onChange={(e) => {
                const [month, year] = e.target.value.split('-');
                setSelectedMonth(parseInt(month));
                setSelectedYear(parseInt(year));
              }}
              className="bg-white bg-opacity-20 text-white rounded-lg px-4 py-2 border border-white border-opacity-30"
            >
              <option value="8-2025">August 2025</option>
              <option value="7-2025">July 2025</option>
              <option value="9-2025">September 2025</option>
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveView('overview')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'overview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Team Overview</span>
          </button>
          <button
            onClick={() => setActiveView('calendar')}
            disabled={!selectedMR}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'calendar'
                ? 'bg-indigo-600 text-white shadow-sm'
                : selectedMR
                  ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Detailed Calendar</span>
            {selectedMR && <span className="text-xs">({selectedMR})</span>}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
            <span className="text-gray-600">Loading team plans data...</span>
          </div>
        </div>
      )}

      {/* Overview Tab */}
      {activeView === 'overview' && !loading && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total MRs</p>
                  <p className="text-2xl font-bold text-gray-900">{mrPlansData.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">AI Generated Plans</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {mrPlansData.filter(p => p.generation_method?.includes('ai')).length}
                  </p>
                </div>
                <Bot className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Planned Visits</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {mrPlansData.reduce((sum, plan) => sum + (plan.total_planned_visits || 0), 0)}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue Target</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{(mrPlansData.reduce((sum, plan) => sum + (plan.total_revenue_target || 0), 0) / 100000).toFixed(1)}L
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Medical Representatives Overview</h3>

              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search MR or territory..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>

                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Methods</option>
                  <option value="ai">AI Generated Only</option>
                  <option value="standard">Standard Only</option>
                </select>
              </div>
            </div>

            {/* MR Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('mr_name')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>MR Name</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Territory</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan Type</th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('total_planned_visits')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Planned</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('actual_visits')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Actual</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Achievement</th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('total_revenue_target')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Revenue Target</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revision</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSortedData().map((plan) => {
                    const mrData = getMRData(plan.mr_name);
                    return (
                      <tr
                        key={plan.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedMR(plan.mr_name);
                          setActiveView('calendar');
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-indigo-800">
                                  {plan.mr_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{plan.mr_name}</div>
                              <div className="text-sm text-gray-500">{mrData.manager_name || 'Unknown Manager'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getMRTerritory(plan.mr_name)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getMethodBadge(plan.generation_method)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {plan.total_planned_visits || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {plan.actual_visits || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(plan.achievement_percentage || 0)}
                            <span className="text-xs text-gray-500">
                              {plan.achievement_percentage || 0}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div className="font-medium">₹{((plan.total_revenue_target || 0) / 1000).toFixed(0)}K</div>
                            <div className="text-xs text-gray-400">
                              ₹{((plan.actual_revenue || 0) / 1000).toFixed(0)}K achieved
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              v{plan.current_revision || 0}
                            </span>
                            {(plan.current_revision || 0) > 0 && (
                              <Edit3 className="h-3 w-3 text-blue-600" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMR(plan.mr_name);
                              setActiveView('calendar');
                            }}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {getSortedData().length === 0 && (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No plans found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchQuery || filterMethod !== 'all'
                      ? 'Try adjusting your search or filters.'
                      : 'No monthly plans available for this period.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calendar Tab */}
      {activeView === 'calendar' && selectedMR && selectedPlanData && (
        <div className="space-y-6">
          {/* Selected MR Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setActiveView('overview')}
                  className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowRight className="h-4 w-4 mr-1 rotate-180" />
                  Back to Overview
                </button>
                <div className="h-6 border-l border-gray-300"></div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedMR}</h2>
                  <p className="text-sm text-gray-500">
                    {getMRTerritory(selectedMR)} • {monthNames[selectedMonth]} {selectedYear}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {getMethodBadge(selectedPlanData.generation_method)}
                <button className="inline-flex items-center px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  <Download className="h-4 w-4 mr-2" />
                  Export Plan
                </button>
              </div>
            </div>

            {/* Plan Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Planned Visits</p>
                    <p className="text-2xl font-bold text-blue-900">{selectedPlanData.total_planned_visits || 0}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900">Actual Visits</p>
                    <p className="text-2xl font-bold text-green-900">{selectedPlanData.actual_visits || 0}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-900">Revenue Target</p>
                    <p className="text-2xl font-bold text-purple-900">₹{((selectedPlanData.total_revenue_target || 0) / 1000).toFixed(0)}K</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-900">Achievement</p>
                    <p className="text-2xl font-bold text-orange-900">{selectedPlanData.achievement_percentage || 0}%</p>
                  </div>
                  <Target className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Customer Type Analysis */}
          {selectedPlanData.original_plan_json?.executive_summary && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Customer Distribution</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tier 2 Customers</span>
                      <span className="font-medium">{selectedPlanData.original_plan_json.executive_summary.tier_coverage?.T2 || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tier 3 Customers</span>
                      <span className="font-medium">{selectedPlanData.original_plan_json.executive_summary.tier_coverage?.T3 || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Visit Distribution</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Doctors</span>
                      <span className="font-medium">{selectedPlanData.original_plan_json.executive_summary.doctor_vs_retailer_split?.doctor || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Retailers</span>
                      <span className="font-medium">{selectedPlanData.original_plan_json.executive_summary.doctor_vs_retailer_split?.retailer || 0}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Performance Forecast</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expected Revenue</span>
                      <span className="font-medium">₹{((selectedPlanData.original_plan_json.executive_summary.expected_revenue || 0) / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenue Uplift</span>
                      <span className="font-medium text-green-600">+{selectedPlanData.original_plan_json.executive_summary.revenue_uplift_pct || 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Calendar Grid */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {monthNames[selectedMonth]} {selectedYear} Schedule
              </h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-200 rounded-full"></div>
                  <span className="text-sm text-gray-600">Planned</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-200 rounded-full"></div>
                  <span className="text-sm text-gray-600">Completed</span>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 border-b border-gray-200">
                  {day}
                </div>
              ))}

              {getCalendarDays().map((day, index) => {
                if (!day) {
                  return <div key={index} className="p-2 h-32"></div>;
                }

                const plannedVisits = getVisitsForDay(day);
                const actualVisits = getActualVisitsForDay(day);
                const hasPlannedVisits = plannedVisits.length > 0;
                const hasActualVisits = actualVisits.length > 0;
                const dayPlan = selectedPlanData.original_plan_json?.daily_plan?.find(
                  d => d.date === `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
                );

                let statusColor = 'bg-gray-50 border-gray-200';
                if (hasPlannedVisits) {
                  if (hasActualVisits) {
                    statusColor = 'bg-green-50 border-green-200';
                  } else {
                    statusColor = 'bg-blue-50 border-blue-200';
                  }
                }

                return (
                  <div key={day} className={`p-3 h-32 border rounded-lg transition-colors ${statusColor}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-900">{day}</span>
                      <div className="flex space-x-1">
                        {hasPlannedVisits && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                        {hasActualVisits && (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                    </div>

                    {hasPlannedVisits && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-blue-700">
                          {plannedVisits.length} planned
                        </div>
                        {actualVisits.length > 0 && (
                          <div className="text-xs font-medium text-green-700">
                            {actualVisits.length} completed
                          </div>
                        )}
                        {dayPlan?.notes && (
                          <div className="text-xs text-gray-600 line-clamp-2 mt-1">
                            {dayPlan.notes.substring(0, 50)}...
                          </div>
                        )}
                      </div>
                    )}

                    {!hasPlannedVisits && (
                      <div className="text-xs text-gray-400 text-center mt-4">
                        No visits planned
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Plan Details */}
          {selectedPlanData.original_plan_json?.daily_plan && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Plan Details</h3>
              <div className="space-y-4">
                {selectedPlanData.original_plan_json.daily_plan.slice(0, 4).map((dayPlan, index) => {
                  const dateObj = new Date(dayPlan.date);
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                  const totalVisits = Object.values(dayPlan.dayparts || {}).flat().length;
                  const actualDayVisits = getActualVisitsForDay(dateObj.getDate());

                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {dayName}, {dateObj.getDate()} {monthNames[dateObj.getMonth() + 1]}
                          </h4>
                          <p className="text-xs text-gray-500">{totalVisits} visits planned</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          <span className="text-xs text-purple-600 font-medium">AI Strategy</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mb-3">{dayPlan.notes}</p>

                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="font-medium text-gray-500">Morning:</span>
                          <span className="ml-1 text-gray-700">{(dayPlan.dayparts?.AM || []).length} visits</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Afternoon:</span>
                          <span className="ml-1 text-gray-700">{(dayPlan.dayparts?.PM || []).length} visits</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Evening:</span>
                          <span className="ml-1 text-gray-700">{(dayPlan.dayparts?.EVE || []).length} visits</span>
                        </div>
                      </div>

                      {actualDayVisits.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-600">Actual Performance:</span>
                            <span className="font-medium text-green-600">
                              {actualDayVisits.length} visits completed
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State for Calendar */}
      {activeView === 'calendar' && !selectedMR && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No MR Selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please select an MR from the overview table to view their detailed calendar.
          </p>
          <button
            onClick={() => setActiveView('overview')}
            className="mt-4 inline-flex items-center px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go to Overview
          </button>
        </div>
      )}
    </div>
  );
};

export default AITPPlanDashboard;
