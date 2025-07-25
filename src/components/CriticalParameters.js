import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell 
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Activity,
  AlertCircle,
  CheckCircle,
  Calendar,
  RefreshCw,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  UserMinus,
  UserPlus,
  BarChart3,
  Award,
  Zap,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../supabaseClient';

// Color schemes
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];
const CRR_COLOR = '#10b981';
const NBD_COLOR = '#3b82f6';

// Utility functions
const formatCurrency = (value, currency = '₹') => {
  if (!value || isNaN(value)) return `${currency}0`;
  
  if (value >= 10000000) {
    return `${currency}${(value / 10000000).toFixed(2)}Cr`;
  } else if (value >= 100000) {
    return `${currency}${(value / 100000).toFixed(2)}L`;
  } else if (value >= 1000) {
    return `${currency}${(value / 1000).toFixed(2)}K`;
  }
  
  return `${currency}${Math.round(value).toLocaleString('en-IN')}`;
};

const formatPercentage = (value) => {
  if (!value || isNaN(value)) return '0%';
  return `${Math.round(value * 100) / 100}%`;
};

const formatNumber = (value) => {
  if (!value || isNaN(value)) return '0';
  return Math.round(value).toLocaleString('en-IN');
};

// Critical Parameters Service
class CriticalParametersService {
  static async getAllParameters(options = {}) {
    try {
      let query = supabase
        .from('critical_parameters_five_of_five')
        .select('*');

      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            query = query.eq(key, value);
          }
        });
      }

      query = query.order('year', { ascending: false })
                   .order('month', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        success: true,
        data: data || [],
        count: data?.length || 0
      };

    } catch (error) {
      console.error('Error fetching critical parameters:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  static async getCurrentMonthParameters() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
      const { data, error } = await supabase
        .from('critical_parameters_five_of_five')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        success: true,
        data: data || null
      };

    } catch (error) {
      console.error('Error fetching current month parameters:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  static async getKPISummary() {
    try {
      const currentData = await this.getCurrentMonthParameters();
      
      if (!currentData.success || !currentData.data) {
        return {
          success: false,
          error: 'No current month data available'
        };
      }

      const data = currentData.data;
      
      return {
        success: true,
        data: {
          crr: {
            conversionRatio: data.crr_conversion_ratio || 0,
            activeClients: data.crr_active_clients_count || 0,
            avgOrderValue: data.crr_average_rs_sales || 0,
            clientsLost: data.crr_clients_lost || 0,
            revenueLost: data.crr_revenue_lost_value || 0
          },
          nbd: {
            revenuePercentage: data.nbd_percentage_of_total_revenue || 0,
            conversionRatio: data.nbd_conversion_ratio || 0,
            newClients: data.nbd_new_clients_per_month || 0,
            avgOrderValue: data.nbd_average_rs_sales || 0,
            walletShare: data.nbd_wallet_share_existing_clients || 0
          },
          overall: {
            totalLeads: data.crr_enquiries_leads_per_month || 0,
            month: data.month_name,
            year: data.year
          }
        }
      };

    } catch (error) {
      console.error('Error fetching KPI summary:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }
}

// Main Dashboard Component
const CriticalParameters = () => {
  const [data, setData] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('overview');
  const [timeRange, setTimeRange] = useState(12);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [allParams, kpiData] = await Promise.all([
        CriticalParametersService.getAllParameters({ limit: timeRange }),
        CriticalParametersService.getKPISummary()
      ]);

      if (!allParams.success) {
        throw new Error(allParams.error);
      }

      setData(allParams.data);
      
      if (kpiData.success) {
        setKpis(kpiData.data);
        setCurrentMonth(allParams.data[0] || null);
      }

    } catch (err) {
      setError(err.message);
      console.error('Critical Parameters fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading Critical Parameters...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Critical Parameters</h1>
              <p className="text-sm text-gray-500">
                {currentMonth && `${currentMonth.month_name} ${currentMonth.year}`} • 5 for 5 Analytics
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                {['overview', 'crr', 'nbd', 'trends'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      viewMode === mode
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
              </div>
              
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={6}>Last 6 Months</option>
                <option value={12}>Last 12 Months</option>
                <option value={24}>Last 24 Months</option>
              </select>
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* CRR Conversion Ratio */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  CRR
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {formatPercentage(kpis.crr.conversionRatio)}
              </h3>
              <p className="text-sm text-gray-600">Conversion Ratio</p>
            </div>

            {/* NBD Revenue Share */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  NBD
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {formatPercentage(kpis.nbd.revenuePercentage)}
              </h3>
              <p className="text-sm text-gray-600">Revenue Share</p>
            </div>

            {/* Active Clients */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                  CRR
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {formatNumber(kpis.crr.activeClients)}
              </h3>
              <p className="text-sm text-gray-600">Active Clients</p>
            </div>

            {/* New Clients */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <UserPlus className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                  NBD
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {formatNumber(kpis.nbd.newClients)}
              </h3>
              <p className="text-sm text-gray-600">New Clients</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        {viewMode === 'overview' && <OverviewView data={data} kpis={kpis} />}
        {viewMode === 'crr' && <CRRView data={data} kpis={kpis} />}
        {viewMode === 'nbd' && <NBDView data={data} kpis={kpis} />}
        {viewMode === 'trends' && <TrendsView data={data} />}
      </div>
    </div>
  );
};

// Overview View Component
const OverviewView = ({ data, kpis }) => {
  const chartData = data.map(item => ({
    period: `${item.month_name?.substring(0, 3)} ${item.year}`,
    crrConversion: item.crr_conversion_ratio || 0,
    nbdRevenue: item.nbd_percentage_of_total_revenue || 0,
    activeClients: item.crr_active_clients_count || 0,
    newClients: item.nbd_new_clients_per_month || 0
  })).reverse();

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Conversion Ratios Trend */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Ratios Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="crrConversion" 
                stroke={CRR_COLOR} 
                strokeWidth={2}
                name="CRR Conversion (%)"
              />
              <Line 
                type="monotone" 
                dataKey="nbdRevenue" 
                stroke={NBD_COLOR} 
                strokeWidth={2}
                name="NBD Revenue Share (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Client Metrics */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Metrics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="activeClients" 
                stackId="1"
                stroke={CRR_COLOR} 
                fill={CRR_COLOR}
                fillOpacity={0.6}
                name="Active Clients"
              />
              <Area 
                type="monotone" 
                dataKey="newClients" 
                stackId="1"
                stroke={NBD_COLOR} 
                fill={NBD_COLOR}
                fillOpacity={0.6}
                name="New Clients"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Summary */}
      {kpis && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Current Month Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CRR Performance */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                <Target className="w-4 h-4 mr-2" />
                CRR Performance
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Conversion Ratio:</span>
                  <span className="font-medium">{formatPercentage(kpis.crr.conversionRatio)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Active Clients:</span>
                  <span className="font-medium">{formatNumber(kpis.crr.activeClients)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Avg Order Value:</span>
                  <span className="font-medium">{formatCurrency(kpis.crr.avgOrderValue)}</span>
                </div>
              </div>
            </div>

            {/* NBD Performance */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                NBD Performance
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Revenue Share:</span>
                  <span className="font-medium">{formatPercentage(kpis.nbd.revenuePercentage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">New Clients:</span>
                  <span className="font-medium">{formatNumber(kpis.nbd.newClients)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Avg Order Value:</span>
                  <span className="font-medium">{formatCurrency(kpis.nbd.avgOrderValue)}</span>
                </div>
              </div>
            </div>

            {/* Risk Indicators */}
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-3 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Risk Indicators
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-red-700">Clients Lost:</span>
                  <span className="font-medium">{formatNumber(kpis.crr.clientsLost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-700">Revenue Lost:</span>
                  <span className="font-medium">{formatCurrency(kpis.crr.revenueLost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-700">NBD Conversion:</span>
                  <span className={`font-medium ${kpis.nbd.conversionRatio < 5 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatPercentage(kpis.nbd.conversionRatio)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// CRR View Component
const CRRView = ({ data, kpis }) => {
  const crrData = data.map(item => ({
    period: `${item.month_name?.substring(0, 3)} ${item.year}`,
    enquiries: item.crr_enquiries_leads_per_month || 0,
    conversion: item.crr_conversion_ratio || 0,
    avgSales: item.crr_average_rs_sales || 0,
    newOrders: item.crr_new_orders_per_month || 0,
    clientsLost: item.crr_clients_lost || 0,
    activeClients: item.crr_active_clients_count || 0,
    revenueLost: item.crr_revenue_lost_value || 0
  })).reverse();

  return (
    <div className="space-y-8">
      {/* CRR Summary Cards */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-8 h-8" />
              <span className="text-green-100 text-sm font-medium">Conversion</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{formatPercentage(kpis.crr.conversionRatio)}</h3>
            <p className="text-green-100">CRR Conversion Rate</p>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8" />
              <span className="text-blue-100 text-sm font-medium">Active</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{formatNumber(kpis.crr.activeClients)}</h3>
            <p className="text-blue-100">Active Clients</p>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8" />
              <span className="text-purple-100 text-sm font-medium">Value</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{formatCurrency(kpis.crr.avgOrderValue)}</h3>
            <p className="text-purple-100">Avg Order Value</p>
          </div>

          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <UserMinus className="w-8 h-8" />
              <span className="text-red-100 text-sm font-medium">Lost</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{formatNumber(kpis.crr.clientsLost)}</h3>
            <p className="text-red-100">Clients Lost</p>
          </div>
        </div>
      )}

      {/* CRR Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Conversion & Orders */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CRR Conversion & Orders</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={crrData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="conversion" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Conversion Ratio (%)"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="newOrders" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="New Orders"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Client Retention */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Retention</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={crrData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="activeClients" 
                stroke="#10b981" 
                fill="#10b981"
                fillOpacity={0.6}
                name="Active Clients"
              />
              <Area 
                type="monotone" 
                dataKey="clientsLost" 
                stroke="#ef4444" 
                fill="#ef4444"
                fillOpacity={0.6}
                name="Clients Lost"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Analysis */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">CRR Revenue Analysis</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={crrData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="period" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => [
                name === 'avgSales' || name === 'revenueLost' ? formatCurrency(value) : value,
                name === 'avgSales' ? 'Avg Sales' : name === 'revenueLost' ? 'Revenue Lost' : name
              ]}
            />
            <Legend />
            <Bar dataKey="avgSales" fill="#10b981" name="Average Sales" />
           // Continuation of CRR View Component
            <Bar dataKey="revenueLost" fill="#ef4444" name="Revenue Lost" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// NBD View Component
const NBDView = ({ data, kpis }) => {
  const nbdData = data.map(item => ({
    period: `${item.month_name?.substring(0, 3)} ${item.year}`,
    revenueShare: item.nbd_percentage_of_total_revenue || 0,
    leads: item.nbd_leads_per_month || 0,
    conversion: item.nbd_conversion_ratio || 0,
    avgSales: item.nbd_average_rs_sales || 0,
    newClients: item.nbd_new_clients_per_month || 0,
    walletShare: item.nbd_wallet_share_existing_clients || 0
  })).reverse();

  return (
    <div className="space-y-8">
      {/* NBD Summary Cards */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8" />
              <span className="text-blue-100 text-sm font-medium">Revenue</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{formatPercentage(kpis.nbd.revenuePercentage)}</h3>
            <p className="text-blue-100">of Total Revenue</p>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-8 h-8" />
              <span className="text-purple-100 text-sm font-medium">Conversion</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{formatPercentage(kpis.nbd.conversionRatio)}</h3>
            <p className="text-purple-100">Conversion Rate</p>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <UserPlus className="w-8 h-8" />
              <span className="text-green-100 text-sm font-medium">Growth</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{formatNumber(kpis.nbd.newClients)}</h3>
            <p className="text-green-100">New Clients</p>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-8 h-8" />
              <span className="text-orange-100 text-sm font-medium">Value</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{formatCurrency(kpis.nbd.avgOrderValue)}</h3>
            <p className="text-orange-100">Avg Order Value</p>
          </div>
        </div>
      )}

      {/* NBD Performance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue & Conversion */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">NBD Revenue & Conversion</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={nbdData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenueShare" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Revenue Share (%)"
              />
              <Line 
                type="monotone" 
                dataKey="conversion" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Conversion Ratio (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* New Clients & Leads */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">New Clients & Leads</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={nbdData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="leads" 
                stroke="#8b5cf6" 
                fill="#8b5cf6"
                fillOpacity={0.6}
                name="Leads Per Month"
              />
              <Area 
                type="monotone" 
                dataKey="newClients" 
                stroke="#3b82f6" 
                fill="#3b82f6"
                fillOpacity={0.6}
                name="New Clients"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sales Performance */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">NBD Sales Performance</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Average Sales */}
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={nbdData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => [formatCurrency(value), 'Average Sales']}
              />
              <Legend />
              <Bar dataKey="avgSales" fill="#3b82f6" name="Average Sales" />
            </BarChart>
          </ResponsiveContainer>

          {/* Wallet Share */}
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={nbdData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="walletShare" 
                stroke="#06b6d4" 
                strokeWidth={3}
                name="Wallet Share (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Fixed TrendsView Component with proper error handling
const TrendsView = ({ data }) => {
  const [selectedMetrics, setSelectedMetrics] = useState([
    'crr_conversion_ratio',
    'nbd_percentage_of_total_revenue'
  ]);

  const metricsOptions = [
    { value: 'crr_conversion_ratio', label: 'CRR Conversion Ratio', color: '#10b981' },
    { value: 'crr_active_clients_count', label: 'Active Clients', color: '#8b5cf6' },
    { value: 'crr_average_rs_sales', label: 'CRR Avg Sales', color: '#06b6d4' },
    { value: 'nbd_percentage_of_total_revenue', label: 'NBD Revenue %', color: '#3b82f6' },
    { value: 'nbd_conversion_ratio', label: 'NBD Conversion', color: '#f59e0b' },
    { value: 'nbd_new_clients_per_month', label: 'New Clients', color: '#ef4444' },
  ];

  // Safe data processing with proper null/undefined checks
  const trendsData = React.useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data.map(item => {
      // Safety check for item
      if (!item) {
        return {
          period: 'Unknown',
          monthYear: 'Unknown'
        };
      }

      const result = {
        period: item.month_name && item.year 
          ? `${item.month_name.substring(0, 3)} ${item.year}` 
          : 'Unknown',
        monthYear: item.month && item.year 
          ? `${item.month}/${item.year}` 
          : 'Unknown'
      };
      
      // Safely add metric values with fallback to 0
      metricsOptions.forEach(metric => {
        result[metric.value] = item[metric.value] != null ? Number(item[metric.value]) || 0 : 0;
      });
      
      return result;
    }).reverse(); // Chronological order
  }, [data]);

  const toggleMetric = (metricValue) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metricValue)) {
        return prev.filter(m => m !== metricValue);
      } else {
        return [...prev, metricValue];
      }
    });
  };

  // Early return if no data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center">
          <div className="text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Trend Data Available</h3>
            <p className="text-sm text-gray-500">
              No data is available for trend analysis. Please check if data exists for the selected time period.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Safe calculation for growth analysis
  const calculateGrowthSafely = (current, previous) => {
    const currentVal = Number(current) || 0;
    const previousVal = Number(previous) || 0;
    
    if (previousVal === 0) {
      return currentVal > 0 ? 100 : 0;
    }
    
    return ((currentVal - previousVal) / previousVal) * 100;
  };

  return (
    <div className="space-y-8">
      {/* Metric Selector */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Metrics to Compare</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metricsOptions.map(metric => (
            <label
              key={metric.value}
              className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedMetrics.includes(metric.value)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedMetrics.includes(metric.value)}
                onChange={() => toggleMetric(metric.value)}
                className="hidden"
              />
              <div 
                className="w-4 h-4 rounded-full mr-3"
                style={{ backgroundColor: metric.color }}
              />
              <span className="text-sm font-medium">{metric.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Multi-Metric Trend Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Trend Analysis</h3>
        {trendsData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => {
                  const metric = metricsOptions.find(m => m.value === name);
                  return [
                    Number(value).toFixed(2), 
                    metric ? metric.label : name
                  ];
                }}
              />
              <Legend />
              {selectedMetrics.map(metricValue => {
                const metric = metricsOptions.find(m => m.value === metricValue);
                return (
                  <Line
                    key={metricValue}
                    type="monotone"
                    dataKey={metricValue}
                    stroke={metric?.color || '#8884d8'}
                    strokeWidth={2}
                    name={metric?.label || metricValue}
                    connectNulls={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p>No data available for the selected metrics</p>
          </div>
        )}
      </div>

      {/* Performance Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Month-over-Month Growth */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Month-over-Month Growth</h3>
          <div className="space-y-4">
            {trendsData.length > 1 ? (
              trendsData.slice(-6).map((item, index) => {
                if (index === 0) return null;
                const prevItem = trendsData[trendsData.length - 6 + index - 1];
                
                if (!prevItem) return null;

                return (
                  <div key={item.period} className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">{item.period}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedMetrics.slice(0, 4).map(metric => {
                        const current = item[metric] || 0;
                        const previous = prevItem[metric] || 0;
                        const growth = calculateGrowthSafely(current, previous);
                        const metricInfo = metricsOptions.find(m => m.value === metric);
                        
                        return (
                          <div key={metric} className="flex justify-between items-center">
                            <span className="text-gray-600 truncate pr-2">
                              {metricInfo?.label || metric}:
                            </span>
                            <div className="flex items-center">
                              {growth > 0 ? (
                                <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                              ) : growth < 0 ? (
                                <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                              ) : null}
                              <span 
                                className={`font-medium ${
                                  growth > 0 ? 'text-green-600' : 
                                  growth < 0 ? 'text-red-600' : 'text-gray-600'
                                }`}
                              >
                                {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>Need at least 2 months of data to show growth trends</p>
              </div>
            )}
          </div>
        </div>

        {/* Performance Heatmap */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Heatmap</h3>
          <div className="space-y-3">
            {trendsData.length > 0 ? (
              trendsData.slice(-12).map(item => {
                if (!item || !item.period) return null;
                
                return (
                  <div key={item.period} className="flex items-center space-x-3">
                    <div className="w-20 text-sm font-medium text-gray-600">
                      {item.period.split(' ')[0] || 'Unknown'}
                    </div>
                    <div className="flex-1 grid grid-cols-6 gap-1">
                      {selectedMetrics.map(metric => {
                        const value = Number(item[metric]) || 0;
                        const metricInfo = metricsOptions.find(m => m.value === metric);
                        
                        // Safe intensity calculation
                        const maxValue = Math.max(...trendsData.map(d => Number(d[metric]) || 0));
                        const intensity = maxValue > 0 ? value / maxValue : 0;
                        
                        return (
                          <div
                            key={metric}
                            className="h-8 rounded flex items-center justify-center text-xs font-medium text-white"
                            style={{
                              backgroundColor: metricInfo?.color || '#8884d8',
                              opacity: 0.3 + (intensity * 0.7)
                            }}
                            title={`${metricInfo?.label || metric}: ${value.toFixed(2)}`}
                          >
                            {value > 0 ? value.toFixed(0) : ''}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>No data available for heatmap</p>
              </div>
            )}
          </div>
          
          {/* Heatmap Legend */}
          {selectedMetrics.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2 text-xs">
                {selectedMetrics.map(metric => {
                  const metricInfo = metricsOptions.find(m => m.value === metric);
                  return (
                    <div key={metric} className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded mr-1"
                        style={{ backgroundColor: metricInfo?.color || '#8884d8' }}
                      />
                      <span className="text-gray-600">{metricInfo?.label || metric}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Correlation Analysis */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              CRR-NBD Balance
            </h4>
            <p className="text-sm text-blue-700">
              Optimal balance between customer retention (CRR) and new business development (NBD) 
              drives sustainable growth.
            </p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Conversion Trends
            </h4>
            <p className="text-sm text-green-700">
              Higher conversion ratios typically correlate with improved average order values 
              and client retention rates.
            </p>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="font-semibold text-purple-800 mb-2 flex items-center">
              <Target className="w-4 h-4 mr-2" />
              Growth Patterns
            </h4>
            <p className="text-sm text-purple-700">
              Consistent new client acquisition supports long-term revenue growth 
              and market expansion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CriticalParameters;
