import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Calendar, TrendingUp, Users, Target, DollarSign, Activity, Award, AlertCircle, ChevronDown, Filter, Download, RefreshCw, User, MapPin, Phone, ShoppingCart, CheckCircle, Clock, XCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SalesPerformanceDashboard = () => {


// Helper function to get current period values
const getCurrentPeriodDefaults = () => {
  const now = new Date();
  
  // Current week in YYYY-Www format
  const currentWeek = (() => {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000)) + 1;
    const weekNumber = Math.ceil(dayOfYear / 7);
    return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  })();
  
  // Current month in YYYY-MM format
  const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  
  // Current quarter in YYYY-Qn format
  const currentQuarter = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
  
  // Current year
  const currentYear = now.getFullYear().toString();
  
  return {
    week: currentWeek,
    month: currentMonth,
    quarter: currentQuarter,
    year: currentYear
  };
};


// Initialize with current defaults
const currentDefaults = getCurrentPeriodDefaults();


  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
const [selectedMonth, setSelectedMonth] = useState(currentDefaults.month);
const [selectedWeek, setSelectedWeek] = useState(currentDefaults.week);
const [selectedQuarter, setSelectedQuarter] = useState(currentDefaults.quarter);
const [selectedYear, setSelectedYear] = useState(currentDefaults.year);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedMR, setSelectedMR] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' });
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [states, setStates] = useState([]);
  const [medicalReps, setMedicalReps] = useState([]);

  // Helper function to get date range based on selected period
  const getDateRange = () => {
    if (selectedPeriod === 'custom') {
      return { start: dateRange.start, end: dateRange.end };
    }

    const now = new Date();
    let start, end;

    switch (selectedPeriod) {
      case 'weekly':
        const [year, week] = selectedWeek.split('-W');
        const firstDayOfYear = new Date(parseInt(year), 0, 1);
        const daysToAdd = (parseInt(week) - 1) * 7;
        start = new Date(firstDayOfYear.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
        // Adjust to Monday
        const dayOfWeek = start.getDay();
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        start.setDate(start.getDate() + daysToMonday);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;

      case 'monthly':
        const [monthYear, monthNum] = selectedMonth.split('-');
        start = new Date(parseInt(monthYear), parseInt(monthNum) - 1, 1);
        end = new Date(parseInt(monthYear), parseInt(monthNum), 0);
        break;

      case 'quarterly':
        const [qYear, quarter] = selectedQuarter.split('-Q');
        const qNum = parseInt(quarter);
        start = new Date(parseInt(qYear), (qNum - 1) * 3, 1);
        end = new Date(parseInt(qYear), qNum * 3, 0);
        break;

      case 'yearly':
        start = new Date(parseInt(selectedYear), 0, 1);
        end = new Date(parseInt(selectedYear), 11, 31);
        break;
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

// Updated period change handler
const handlePeriodChange = (newPeriod) => {
  setSelectedPeriod(newPeriod);
  
  // Auto-update to current period when changing period type
  const current = getCurrentPeriodDefaults();
  
  switch (newPeriod) {
    case 'weekly':
      setSelectedWeek(current.week);
      break;
    case 'monthly':
      setSelectedMonth(current.month);
      break;
    case 'quarterly':
      setSelectedQuarter(current.quarter);
      break;
    case 'yearly':
      setSelectedYear(current.year);
      break;
  }
};


  // Fetch initial data for filters
  useEffect(() => {
    fetchFilterData();
  }, []);

  // Fetch dashboard data when filters change
  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod, selectedMonth, selectedWeek, selectedQuarter, selectedYear, 
      selectedRegion, selectedTeam, selectedState, selectedMR]);

  const fetchFilterData = async () => {
    try {
      // Fetch teams (ASM/RSM)
      const { data: teamData } = await supabase
        .from('medical_representatives')
        .select('employee_id, name, role_level, region')
        .in('role_level', ['ASM', 'RSM'])
        .order('name');

      // Fetch states
      const { data: stateData } = await supabase
        .from('medical_representatives')
        .select('state')
        .not('state', 'is', null)
        .order('state');

      // Get unique states
      const uniqueStates = [...new Set(stateData?.map(item => item.state) || [])];

      // Fetch all medical representatives
      const { data: mrData } = await supabase
        .from('medical_representatives')
        .select('employee_id, name, role_level')
        .eq('role_level', 'MR')
        .order('name');

      setTeams(teamData || []);
      setStates(uniqueStates);
      setMedicalReps(mrData || []);
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      // Build base query for orders
      let orderQuery = supabase
        .from('orders')
        .select(`
         order_id,
         order_date,
         net_amount,
         order_type,
         mr_name,
         customer_code,
         state
          )
        `)
        .gte('order_date', start)
        .lte('order_date', end);

      // Build base query for visits  
      let visitQuery = supabase
        .from('mr_visits')
        .select(`
          "visitId",
          "dcrDate",
          "empName",
          "clientMobileNo",
          "clientName",
          "amountOfSale"
        `)
        .gte('"dcrDate"', start)
        .lte('"dcrDate"', end);

      // Build base query for targets
      let targetQuery = supabase
        .from('mr_weekly_targets')
        .select('*')
        .gte('target_date', start)
        .lte('target_date', end);

      // Apply filters
      if (selectedMR !== 'all') {
        const selectedMRData = medicalReps.find(mr => mr.employee_id === selectedMR);
        if (selectedMRData) {
          orderQuery = orderQuery.eq('mr_name', selectedMRData.name);
          visitQuery = visitQuery.eq('"empName"', selectedMRData.name);
          targetQuery = targetQuery.eq('employee_id', selectedMR);
        }
      }

      if (selectedTeam !== 'all') {
        // Get MRs under selected ASM/RSM
        const { data: teamMRs } = await supabase
          .from('medical_representatives')
          .select('employee_id, name')
          .or(`area_sales_manager_name.eq.${teams.find(t => t.employee_id === selectedTeam)?.name},regional_sales_manager_name.eq.${teams.find(t => t.employee_id === selectedTeam)?.name}`);
        
        const mrNames = teamMRs?.map(mr => mr.name) || [];
        const mrIds = teamMRs?.map(mr => mr.employee_id) || [];
        
        if (mrNames.length > 0) {
          orderQuery = orderQuery.in('mr_name', mrNames);
          visitQuery = visitQuery.in('"empName"', mrNames);
          targetQuery = targetQuery.in('employee_id', mrIds);
        }
      }

      if (selectedState !== 'all') {
          orderQuery = orderQuery.eq('state', selectedState);
        // For visits, we need to join with customers based on mobile number
      }

      // Execute queries
      const [orderData, visitData, targetData, mrData] = await Promise.all([
        orderQuery,
        visitQuery,
        targetQuery,
        supabase
          .from('medical_representatives')
          .select('employee_id, name, role_level, region, state')
      ]);

      // Process data to calculate conversions
      const processedData = processDataWithConversions(
        orderData.data || [],
        visitData.data || [],
        targetData.data || [],
        mrData.data || []
      );

      setDashboardData(processedData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processDataWithConversions = (orders, visits, targets, mrs) => {
    // Create a map of visits by date and customer for conversion tracking
    const visitMap = new Map();
    visits.forEach(visit => {
      const dateKey = visit.dcrDate;
      const customerKey = `${visit.clientMobileNo}_${visit.clientName}`;
      if (!visitMap.has(dateKey)) {
        visitMap.set(dateKey, new Map());
      }
      visitMap.get(dateKey).set(customerKey, visit);
    });

    // Calculate conversions - a visit is converted if there's an order for the same customer on the same date
    const convertedVisits = new Set();
    orders.forEach(order => {
      const dateKey = order.order_date;
      const dayVisits = visitMap.get(dateKey);
      if (dayVisits) {
        // Check if any visit matches this order's customer
        dayVisits.forEach((visit, customerKey) => {
          if (customerKey.includes(order.customer_code) || 
              (visit.clientName && order.customer_code && 
               visit.clientName.toLowerCase().includes(order.customer_code.toLowerCase()))) {
            convertedVisits.add(visit.visitId);
          }
        });
      }
    });

    // Calculate overview metrics
    const totalRevenue = orders.reduce((sum, order) => sum + (order.net_amount || 0), 0);
    const totalVisits = visits.length;
    const conversionRate = totalVisits > 0 ? ((convertedVisits.size / totalVisits) * 100).toFixed(1) : 0;
    
    // Get unique MRs from visits
    const activeMRNames = [...new Set(visits.map(v => v.empName))];
    const activeReps = activeMRNames.length;
    
    // Calculate target achievement
    const totalTarget = targets.reduce((sum, target) => sum + (target.total_revenue_target || 0), 0);
    const targetAchievement = totalTarget > 0 ? ((totalRevenue / totalTarget) * 100).toFixed(1) : 0;
    
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Calculate NBD vs CRR
    const nbdRevenue = orders
      .filter(order => order.order_type === 'NBD')
      .reduce((sum, order) => sum + (order.net_amount || 0), 0);
    const crrRevenue = orders
      .filter(order => order.order_type === 'CRR')
      .reduce((sum, order) => sum + (order.net_amount || 0), 0);

    // Group data by time period for trends
    const trends = groupDataByPeriod(orders, visits, targets, selectedPeriod, convertedVisits);

    // Calculate top performers
    const performerMap = {};
    
    // Group orders by MR
    orders.forEach(order => {
      const mrName = order.mr_name;
      if (!performerMap[mrName]) {
        const mr = mrs.find(m => m.name === mrName);
        performerMap[mrName] = {
          id: mr?.employee_id || mrName,
          name: mrName,
          revenue: 0,
          visits: 0,
          orders: 0,
          convertedVisits: 0
        };
      }
      performerMap[mrName].revenue += order.net_amount || 0;
      performerMap[mrName].orders += 1;
    });

    // Group visits by MR
    visits.forEach(visit => {
      const mrName = visit.empName;
      if (!performerMap[mrName]) {
        const mr = mrs.find(m => m.name === mrName);
        performerMap[mrName] = {
          id: mr?.employee_id || mrName,
          name: mrName,
          revenue: 0,
          visits: 0,
          orders: 0,
          convertedVisits: 0
        };
      }
      performerMap[mrName].visits += 1;
      if (convertedVisits.has(visit.visitId)) {
        performerMap[mrName].convertedVisits += 1;
      }
    });

    const topPerformers = Object.values(performerMap)
      .map(performer => ({
        ...performer,
        conversion: performer.visits > 0 ? ((performer.convertedVisits / performer.visits) * 100).toFixed(0) : 0,
        achievement: 100 // This would be calculated based on individual targets
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Visit metrics
    const plannedVisits = targets.reduce((sum, target) => sum + (target.total_visit_plan || 0), 0);
    const completedVisits = visits.length;
    const visitMetrics = {
      planned: plannedVisits,
      completed: completedVisits,
      missed: Math.max(0, plannedVisits - completedVisits),
      completionRate: plannedVisits > 0 ? ((completedVisits / plannedVisits) * 100).toFixed(0) : 0
    };

    // Conversion metrics
    const conversionMetrics = {
      totalLeads: totalVisits,
      converted: convertedVisits.size,
      pending: 0, // Would need additional data
      lost: totalVisits - convertedVisits.size
    };

    // Revenue metrics
    const revenueMetrics = {
      target: totalTarget,
      achieved: totalRevenue,
      gap: totalTarget - totalRevenue,
      growthRate: 12.5 // This would be calculated based on previous period
    };

    return {
      overview: {
        totalRevenue,
        totalVisits,
        conversionRate,
        activeReps,
        targetAchievement,
        avgOrderValue
      },
      trends,
      topPerformers,
      performanceByCategory: [
        { category: 'New Business (NBD)', value: nbdRevenue, percentage: totalRevenue > 0 ? ((nbdRevenue / totalRevenue) * 100).toFixed(0) : 0 },
        { category: 'Customer Retention (CRR)', value: crrRevenue, percentage: totalRevenue > 0 ? ((crrRevenue / totalRevenue) * 100).toFixed(0) : 0 }
      ],
      detailedMetrics: {
        visitMetrics,
        conversionMetrics,
        revenueMetrics
      }
    };
  };

  const groupDataByPeriod = (orders, visits, targets, period, convertedVisits) => {
    // This is a simplified version - you would implement proper grouping logic
    // based on the selected period (weekly, monthly, quarterly, yearly)
    const grouped = {
      weekly: [],
      monthly: []
    };

    // Example monthly grouping
    const monthlyData = {};
    orders.forEach(order => {
      const month = new Date(order.order_date).toLocaleString('default', { month: 'short' });
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          revenue: 0,
          visits: 0,
          orders: 0,
          nbd: 0,
          crr: 0,
          target: 0,
          converted: 0
        };
      }
      monthlyData[month].revenue += order.net_amount || 0;
      monthlyData[month].orders += 1;
      if (order.order_type === 'NBD') {
        monthlyData[month].nbd += order.net_amount || 0;
      } else {
        monthlyData[month].crr += order.net_amount || 0;
      }
    });

    // Add visit counts and conversions
    visits.forEach(visit => {
      const month = new Date(visit.dcrDate).toLocaleString('default', { month: 'short' });
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          revenue: 0,
          visits: 0,
          orders: 0,
          nbd: 0,
          crr: 0,
          target: 0,
          converted: 0
        };
      }
      monthlyData[month].visits += 1;
      if (convertedVisits.has(visit.visitId)) {
        monthlyData[month].converted += 1;
      }
    });

    // Add targets
    targets.forEach(target => {
      const month = new Date(target.target_date).toLocaleString('default', { month: 'short' });
      if (monthlyData[month]) {
        monthlyData[month].target += target.total_revenue_target || 0;
      }
    });

    // Calculate conversion rates
    Object.values(monthlyData).forEach(data => {
      data.conversion = data.visits > 0 ? ((data.converted / data.visits) * 100).toFixed(0) : 0;
    });

    grouped.monthly = Object.values(monthlyData);

    return grouped;
  };

  const formatCurrency = (value) => {
    if (value >= 10000000) { // 1 crore
      return `₹${(value / 10000000).toFixed(1)}Cr`;
    } else if (value >= 100000) { // 1 lakh
      return `₹${(value / 100000).toFixed(1)}L`;
    } else if (value >= 1000) { // 1 thousand
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const chartContainerStyles = {
    width: "100%",
    height: 300,
    minWidth: 0, // Allow shrinking
    overflow: "hidden"
  };

  const KPICard = ({ title, value, change, icon: Icon, color }) => (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow min-w-0">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${color} flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {change && (
          <span className={`text-xs font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'} flex-shrink-0`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <h3 className="text-gray-600 text-xs font-medium mb-1 truncate">{title}</h3>
      <p className="text-lg font-bold text-gray-900 truncate" title={value}>{value}</p>
    </div>
  );

  const ChartWrapper = ({ children, title }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 min-w-0 overflow-hidden">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 truncate">{title}</h3>
      <div style={chartContainerStyles}>
        {children}
      </div>
    </div>
  );

  const TableWrapper = ({ children }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto min-w-0">
        <div className="min-w-[800px]"> {/* Minimum width for table */}
          {children}
        </div>
      </div>
    </div>
  );

  const PerformanceTable = ({ data }) => (
  <TableWrapper>
    <div className="p-6 border-b border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
    </div>
    <table className="w-full min-w-[800px]">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Rank</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Revenue</th>
          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Visits</th>
          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Conversion</th>
          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Achievement</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map((rep, index) => (
          <tr key={rep.id} className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3 whitespace-nowrap w-16">
              <div className="flex items-center">
                {index === 0 && <Award className="w-4 h-4 text-yellow-500 mr-1" />}
                {index === 1 && <Award className="w-4 h-4 text-gray-400 mr-1" />}
                {index === 2 && <Award className="w-4 h-4 text-orange-600 mr-1" />}
                <span className="text-sm font-medium text-gray-900">#{index + 1}</span>
              </div>
            </td>
            <td className="px-4 py-3 min-w-0">
              <div className="truncate">
                <div className="text-sm font-medium text-gray-900 truncate">{rep.name}</div>
                <div className="text-xs text-gray-500 truncate">{rep.id}</div>
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900 w-24">
              <span title={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(rep.revenue)}>
                {formatCurrency(rep.revenue)}
              </span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900 w-20">{rep.visits}</td>
            <td className="px-4 py-3 whitespace-nowrap w-24">
              <div className="flex items-center justify-center">
                <span className="text-xs text-gray-900 mr-1">{rep.conversion}%</span>
                <div className="w-8 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{ width: `${Math.min(rep.conversion, 100)}%` }}
                  />
                </div>
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap w-24">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                rep.achievement >= 100 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {rep.achievement}%
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </TableWrapper>
);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (loading || !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6 overflow-x-hidden max-w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales Performance Dashboard</h1>
            <p className="text-gray-600 mt-1">
              {selectedPeriod === 'weekly' && `Week: ${selectedWeek}`}
              {selectedPeriod === 'monthly' && `Month: ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
              {selectedPeriod === 'quarterly' && `Quarter: ${selectedQuarter}`}
              {selectedPeriod === 'yearly' && `Year: ${selectedYear}`}
              {selectedPeriod === 'custom' && `${dateRange.start} to ${dateRange.end}`}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={fetchDashboardData}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Filter content with responsive grid */}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8 min-w-0">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(dashboardData.overview.totalRevenue)}
          change={12.5}
          icon={DollarSign}
          color="bg-blue-600"
        />
        <KPICard
          title="Total Visits"
          value={dashboardData.overview.totalVisits.toLocaleString()}
          change={8.3}
          icon={MapPin}
          color="bg-green-600"
        />
        <KPICard
          title="Conversion Rate"
          value={`${dashboardData.overview.conversionRate}%`}
          change={5.2}
          icon={TrendingUp}
          color="bg-purple-600"
        />
        <KPICard
          title="Active Reps"
          value={dashboardData.overview.activeReps}
          change={0}
          icon={Users}
          color="bg-orange-600"
        />
        <KPICard
          title="Target Achievement"
          value={`${dashboardData.overview.targetAchievement}%`}
          change={-2.1}
          icon={Target}
          color="bg-pink-600"
        />
        <KPICard
          title="Avg Order Value"
          value={formatCurrency(dashboardData.overview.avgOrderValue)}
          change={3.7}
          icon={ShoppingCart}
          color="bg-indigo-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6 min-w-0 overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 truncate">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300} minWidth={0}>
            <AreaChart data={dashboardData.trends[selectedPeriod] || dashboardData.trends.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={selectedPeriod === 'weekly' ? 'week' : 'month'} />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#0088FE" fill="#0088FE" fillOpacity={0.6} name="Actual Revenue" />
              <Area type="monotone" dataKey="target" stroke="#FF8042" fill="#FF8042" fillOpacity={0.3} name="Target Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6 min-w-0 overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 truncate">Visits & Conversion Rate</h3>
          <ResponsiveContainer width="100%" height={300} minWidth={0}>
            <LineChart data={dashboardData.trends[selectedPeriod] || dashboardData.trends.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={selectedPeriod === 'weekly' ? 'week' : 'month'} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="visits" stroke="#00C49F" strokeWidth={2} name="Visits" />
              <Line yAxisId="right" type="monotone" dataKey="conversion" stroke="#8884D8" strokeWidth={2} name="Conversion %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6 min-w-0 overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 truncate">Revenue Distribution</h3>
          <ResponsiveContainer width="100%" height={300} minWidth={0}>
            <BarChart data={dashboardData.trends[selectedPeriod] || dashboardData.trends.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={selectedPeriod === 'weekly' ? 'week' : 'month'} />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="nbd" stackId="a" fill="#0088FE" name="New Business" />
              <Bar dataKey="crr" stackId="a" fill="#00C49F" name="Repeat Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6 min-w-0 overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 truncate">Performance Metrics</h3>
          <div className="space-y-6">
            {/* Visit Metrics */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Visit Completion</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="text-sm font-medium">{dashboardData.detailedMetrics.visitMetrics.completed}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${dashboardData.detailedMetrics.visitMetrics.completionRate}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Planned: {dashboardData.detailedMetrics.visitMetrics.planned}</span>
                  <span>Missed: {dashboardData.detailedMetrics.visitMetrics.missed}</span>
                </div>
              </div>
            </div>

            {/* Conversion Funnel */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Conversion Funnel</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="text-sm text-gray-700">Total Leads</span>
                  </div>
                  <span className="text-sm font-medium">{dashboardData.detailedMetrics.conversionMetrics.totalLeads}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-sm text-gray-700">Converted</span>
                  </div>
                  <span className="text-sm font-medium">{dashboardData.detailedMetrics.conversionMetrics.converted}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-yellow-600 mr-2" />
                    <span className="text-sm text-gray-700">Pending</span>
                  </div>
                  <span className="text-sm font-medium">{dashboardData.detailedMetrics.conversionMetrics.pending}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <XCircle className="w-4 h-4 text-red-600 mr-2" />
                    <span className="text-sm text-gray-700">Lost</span>
                  </div>
                  <span className="text-sm font-medium">{dashboardData.detailedMetrics.conversionMetrics.lost}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers Table */}
      <TableWrapper>
        <PerformanceTable data={dashboardData.topPerformers} />
      </TableWrapper>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Achievement</h3>
          <div className="relative pt-4">
            <div className="flex items-center justify-center">
              <div className="relative">
                <svg className="w-40 h-40">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="12"
                    strokeDasharray={`${2 * Math.PI * 70 * (dashboardData.overview.targetAchievement / 100)} ${2 * Math.PI * 70}`}
                    strokeDashoffset="0"
                    transform="rotate(-90 80 80)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{dashboardData.overview.targetAchievement}%</div>
                    <div className="text-sm text-gray-600">of target</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Target</span>
                <span className="font-medium">{formatCurrency(dashboardData.detailedMetrics.revenueMetrics.target)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Achieved</span>
                <span className="font-medium text-green-600">{formatCurrency(dashboardData.detailedMetrics.revenueMetrics.achieved)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Gap</span>
                <span className="font-medium text-red-600">{formatCurrency(Math.abs(dashboardData.detailedMetrics.revenueMetrics.gap))}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Business Type</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={dashboardData.performanceByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percentage }) => `${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {dashboardData.performanceByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            <div className="text-sm text-gray-600">
              {dashboardData.performanceByCategory.map((category, index) => (
                <div key={index} className={`flex justify-between items-center p-2 ${index === 0 ? 'bg-blue-50' : 'bg-green-50'} rounded`}>
                  <span>{category.category}</span>
                  <span className="font-medium">{formatCurrency(category.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600 truncate pr-2">Avg Visits per Rep</span>
              <span className="text-sm font-medium text-right flex-shrink-0">
                {dashboardData.overview.activeReps > 0 
                  ? Math.round(dashboardData.overview.totalVisits / dashboardData.overview.activeReps)
                  : 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600 truncate pr-2">Avg Revenue per Visit</span>
              <span className="text-sm font-medium text-right flex-shrink-0" title={formatCurrency(dashboardData.overview.totalVisits > 0 ? dashboardData.overview.totalRevenue / dashboardData.overview.totalVisits : 0)}>
                {formatCurrency(dashboardData.overview.totalVisits > 0 ? dashboardData.overview.totalRevenue / dashboardData.overview.totalVisits : 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600 truncate pr-2">Visit to Order Ratio</span>
              <span className="text-sm font-medium text-right flex-shrink-0">{dashboardData.overview.conversionRate}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600 truncate pr-2">Growth Rate</span>
              <span className="text-sm font-medium text-green-600 text-right flex-shrink-0">+{dashboardData.detailedMetrics.revenueMetrics.growthRate}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPerformanceDashboard;
