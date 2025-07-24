import React from 'react';
import { RefreshCw } from 'lucide-react';
import useDashboardData from '../hooks/useDashboardData';
import KPICards from './dashboardComponents/KPICards';
import Charts from './dashboardComponents/Charts';
import PerformanceTable from './dashboardComponents/PerformanceTable';
import Filters from './dashboardComponents/Filters';
import { Award } from 'lucide-react';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const SalesPerformanceDashboard = () => {
  const {
    loading,
    dashboardData,
    ...props
  } = useDashboardData();

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

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6 overflow-x-hidden max-w-full">
      <Filters {...props} />
      <KPICards dashboardData={dashboardData} />
      <Charts dashboardData={dashboardData} selectedPeriod={props.selectedPeriod} />
      <div className="mb-8">
        <PerformanceTable
            data={dashboardData.allPerformers}
            getSortedPerformers={props.getSortedPerformers}
            visiblePerformers={props.visiblePerformers}
            setVisiblePerformers={props.setVisiblePerformers}
            handleSort={props.handleSort}
            sortConfig={props.sortConfig}
            setSelectedMR={props.setSelectedMR}
        />
      </div>
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
              <span className="text-sm text-gray-600 truncate pr-2">Conversion Growth</span>
              <span className={`text-sm font-medium ${dashboardData.overview.conversionRateChange > 0 ? 'text-green-600' : 'text-red-600'} text-right flex-shrink-0`}>
                {dashboardData.overview.conversionRateChange > 0 ? '+' : ''}{parseFloat(dashboardData.overview.conversionRateChange).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPerformanceDashboard;
