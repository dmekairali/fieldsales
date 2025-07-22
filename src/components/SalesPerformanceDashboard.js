import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Calendar, TrendingUp, Users, Target, DollarSign, Activity, Award, AlertCircle, ChevronDown, Filter, Download, RefreshCw, User, MapPin, Phone, ShoppingCart, CheckCircle, Clock, XCircle } from 'lucide-react';

const SalesPerformanceDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState('2024-06');
  const [selectedWeek, setSelectedWeek] = useState('2024-W25');
  const [selectedQuarter, setSelectedQuarter] = useState('2024-Q2');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedMR, setSelectedMR] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' });
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration
  const teamData = {
    overview: {
      totalRevenue: 2847650,
      totalVisits: 3456,
      conversionRate: 68.5,
      activeReps: 24,
      targetAchievement: 92.3,
      avgOrderValue: 824.35
    },
    trends: {
      weekly: [
        { week: 'W1', revenue: 145000, visits: 180, conversion: 72, target: 150000 },
        { week: 'W2', revenue: 168000, visits: 195, conversion: 75, target: 150000 },
        { week: 'W3', revenue: 152000, visits: 172, conversion: 70, target: 150000 },
        { week: 'W4', revenue: 175000, visits: 201, conversion: 78, target: 150000 }
      ],
      monthly: [
        { month: 'Jan', revenue: 245000, visits: 320, conversion: 68, target: 250000, nbd: 145000, crr: 100000 },
        { month: 'Feb', revenue: 268000, visits: 345, conversion: 72, target: 260000, nbd: 158000, crr: 110000 },
        { month: 'Mar', revenue: 312000, visits: 380, conversion: 75, target: 300000, nbd: 187000, crr: 125000 },
        { month: 'Apr', revenue: 295000, visits: 360, conversion: 71, target: 290000, nbd: 175000, crr: 120000 },
        { month: 'May', revenue: 334000, visits: 395, conversion: 77, target: 320000, nbd: 200000, crr: 134000 },
        { month: 'Jun', revenue: 358000, visits: 412, conversion: 79, target: 340000, nbd: 215000, crr: 143000 }
      ]
    },
    topPerformers: [
      { name: 'Rajesh Kumar', id: 'MR001', revenue: 456000, visits: 487, conversion: 82, achievement: 114 },
      { name: 'Priya Sharma', id: 'MR002', revenue: 423000, visits: 465, conversion: 79, achievement: 106 },
      { name: 'Amit Singh', id: 'MR003', revenue: 398000, visits: 445, conversion: 76, achievement: 99 },
      { name: 'Neha Patel', id: 'MR004', revenue: 387000, visits: 432, conversion: 74, achievement: 97 },
      { name: 'Suresh Verma', id: 'MR005', revenue: 365000, visits: 410, conversion: 73, achievement: 91 }
    ],
    performanceByCategory: [
      { category: 'New Business (NBD)', value: 1650000, percentage: 58 },
      { category: 'Repeat Business (CRR)', value: 1197650, percentage: 42 }
    ],
    detailedMetrics: {
      visitMetrics: {
        planned: 3600,
        completed: 3456,
        missed: 144,
        completionRate: 96
      },
      conversionMetrics: {
        totalLeads: 3456,
        converted: 2367,
        pending: 890,
        lost: 199
      },
      revenueMetrics: {
        target: 3000000,
        achieved: 2847650,
        gap: 152350,
        growthRate: 12.5
      }
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const KPICard = ({ title, value, change, icon: Icon, color }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {change && (
          <span className={`text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );

  const PerformanceTable = ({ data }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visits</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Achievement</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((rep, index) => (
              <tr key={rep.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {index === 0 && <Award className="w-5 h-5 text-yellow-500 mr-2" />}
                    {index === 1 && <Award className="w-5 h-5 text-gray-400 mr-2" />}
                    {index === 2 && <Award className="w-5 h-5 text-orange-600 mr-2" />}
                    <span className="text-sm font-medium text-gray-900">#{index + 1}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{rep.name}</div>
                    <div className="text-sm text-gray-500">{rep.id}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(rep.revenue)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rep.visits}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-900">{rep.conversion}%</span>
                    <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${rep.conversion}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    rep.achievement >= 100 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {rep.achievement}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
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
            <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
              <div className="flex gap-2">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom">Custom Date Range</option>
                </select>
                
                {selectedPeriod === 'weekly' && (
                  <input
                    type="week"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
                
                {selectedPeriod === 'monthly' && (
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
                
                {selectedPeriod === 'quarterly' && (
                  <select
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="2024-Q1">2024 Q1</option>
                    <option value="2024-Q2">2024 Q2</option>
                    <option value="2024-Q3">2024 Q3</option>
                    <option value="2024-Q4">2024 Q4</option>
                    <option value="2023-Q1">2023 Q1</option>
                    <option value="2023-Q2">2023 Q2</option>
                    <option value="2023-Q3">2023 Q3</option>
                    <option value="2023-Q4">2023 Q4</option>
                  </select>
                )}
                
                {selectedPeriod === 'yearly' && (
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                    <option value="2021">2021</option>
                  </select>
                )}
              </div>
              
              {selectedPeriod === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Regions</option>
                <option value="north">North</option>
                <option value="south">South</option>
                <option value="east">East</option>
                <option value="west">West</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team (ASM/RSM)</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Teams</option>
                <option value="ASM001">Vijay Kumar (ASM) - North</option>
                <option value="ASM002">Priya Mehta (ASM) - South</option>
                <option value="RSM001">Rajesh Sharma (RSM) - North</option>
                <option value="RSM002">Anita Patel (RSM) - South</option>
                <option value="ASM003">Sunil Verma (ASM) - East</option>
                <option value="ASM004">Deepak Singh (ASM) - West</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All States</option>
                <option value="UP">Uttar Pradesh</option>
                <option value="DL">Delhi</option>
                <option value="HR">Haryana</option>
                <option value="RJ">Rajasthan</option>
                <option value="MH">Maharashtra</option>
                <option value="GJ">Gujarat</option>
                <option value="KA">Karnataka</option>
                <option value="TN">Tamil Nadu</option>
                <option value="WB">West Bengal</option>
                <option value="BR">Bihar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Medical Rep</label>
              <select
                value={selectedMR}
                onChange={(e) => setSelectedMR(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Representatives</option>
                {teamData.topPerformers.map(rep => (
                  <option key={rep.id} value={rep.id}>{rep.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(teamData.overview.totalRevenue)}
          change={12.5}
          icon={DollarSign}
          color="bg-blue-600"
        />
        <KPICard
          title="Total Visits"
          value={teamData.overview.totalVisits.toLocaleString()}
          change={8.3}
          icon={MapPin}
          color="bg-green-600"
        />
        <KPICard
          title="Conversion Rate"
          value={`${teamData.overview.conversionRate}%`}
          change={5.2}
          icon={TrendingUp}
          color="bg-purple-600"
        />
        <KPICard
          title="Active Reps"
          value={teamData.overview.activeReps}
          change={0}
          icon={Users}
          color="bg-orange-600"
        />
        <KPICard
          title="Target Achievement"
          value={`${teamData.overview.targetAchievement}%`}
          change={-2.1}
          icon={Target}
          color="bg-pink-600"
        />
        <KPICard
          title="Avg Order Value"
          value={formatCurrency(teamData.overview.avgOrderValue)}
          change={3.7}
          icon={ShoppingCart}
          color="bg-indigo-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={teamData.trends[selectedPeriod]}>
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

        {/* Visit & Conversion Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Visits & Conversion Rate</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={teamData.trends[selectedPeriod]}>
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

        {/* Revenue Split (NBD vs CRR) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamData.trends.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="nbd" stackId="a" fill="#0088FE" name="New Business" />
              <Bar dataKey="crr" stackId="a" fill="#00C49F" name="Repeat Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-6">
            {/* Visit Metrics */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Visit Completion</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="text-sm font-medium">{teamData.detailedMetrics.visitMetrics.completed}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${teamData.detailedMetrics.visitMetrics.completionRate}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Planned: {teamData.detailedMetrics.visitMetrics.planned}</span>
                  <span>Missed: {teamData.detailedMetrics.visitMetrics.missed}</span>
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
                  <span className="text-sm font-medium">{teamData.detailedMetrics.conversionMetrics.totalLeads}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-sm text-gray-700">Converted</span>
                  </div>
                  <span className="text-sm font-medium">{teamData.detailedMetrics.conversionMetrics.converted}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-yellow-600 mr-2" />
                    <span className="text-sm text-gray-700">Pending</span>
                  </div>
                  <span className="text-sm font-medium">{teamData.detailedMetrics.conversionMetrics.pending}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <XCircle className="w-4 h-4 text-red-600 mr-2" />
                    <span className="text-sm text-gray-700">Lost</span>
                  </div>
                  <span className="text-sm font-medium">{teamData.detailedMetrics.conversionMetrics.lost}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers Table */}
      <PerformanceTable data={teamData.topPerformers} />

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
                    strokeDasharray={`${2 * Math.PI * 70 * 0.923} ${2 * Math.PI * 70}`}
                    strokeDashoffset="0"
                    transform="rotate(-90 80 80)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">92.3%</div>
                    <div className="text-sm text-gray-600">of target</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Target</span>
                <span className="font-medium">{formatCurrency(teamData.detailedMetrics.revenueMetrics.target)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Achieved</span>
                <span className="font-medium text-green-600">{formatCurrency(teamData.detailedMetrics.revenueMetrics.achieved)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Gap</span>
                <span className="font-medium text-red-600">{formatCurrency(teamData.detailedMetrics.revenueMetrics.gap)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Business Type</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={teamData.performanceByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percentage }) => `${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {teamData.performanceByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            <div className="text-sm text-gray-600">
              <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                <span>New Business Development (NBD)</span>
                <span className="font-medium">{formatCurrency(1650000)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-green-50 rounded mt-2">
                <span>Customer Retention & Repeat (CRR)</span>
                <span className="font-medium">{formatCurrency(1197650)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Avg Visits per Rep</span>
              <span className="text-sm font-medium">144</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Avg Revenue per Visit</span>
              <span className="text-sm font-medium">{formatCurrency(824)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Best Performing Day</span>
              <span className="text-sm font-medium">Thursday</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Growth Rate</span>
              <span className="text-sm font-medium text-green-600">+12.5%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPerformanceDashboard;