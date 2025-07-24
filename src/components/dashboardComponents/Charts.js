import React from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

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
    minWidth: 0,
    overflow: "hidden"
};

const OrderFulfillmentChart = ({ data }) => {
    const deliveryPercent = data.deliveryRate;
    const paymentPercent = data.paymentRate;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Order Fulfillment Pipeline</h3>

        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="absolute left-0 top-0 transform -translate-x-full pr-4 h-full flex flex-col justify-between text-right">
              <div className="text-sm font-medium text-blue-700">
                Order Confirmed
                <div className="text-xs text-gray-600">{data.confirmedOrders} orders</div>
                <div className="text-xs font-semibold text-blue-600">{formatCurrency(data.confirmedValue)}</div>
              </div>
              <div className="text-sm font-medium text-green-700">
                Delivered ({deliveryPercent}%)
                <div className="text-xs text-gray-600">{data.deliveredOrders} orders</div>
                <div className="text-xs font-semibold text-green-600">{formatCurrency(data.deliveredValue)}</div>
              </div>
              <div className="text-sm font-medium text-purple-700">
                Payment Received ({paymentPercent}%)
                <div className="text-xs text-gray-600">{data.paidOrders} orders</div>
                <div className="text-xs font-semibold text-purple-600">{formatCurrency(data.paidValue)}</div>
              </div>
            </div>

            <div className="w-24 h-80 bg-blue-200 rounded-lg relative overflow-hidden border-2 border-blue-300">
              <div className="absolute inset-0 bg-blue-500 flex items-center justify-center">
                <div className="text-white text-xs font-bold text-center">
                  <div>100%</div>
                  <div className="text-[10px]">Confirmed</div>
                </div>
              </div>

              <div
                className="absolute bottom-0 left-0 right-0 bg-green-500 flex items-center justify-center transition-all duration-1000 ease-out"
                style={{ height: `${deliveryPercent}%` }}
              >
                <div className="text-white text-xs font-bold text-center">
                  <div>{deliveryPercent}%</div>
                  <div className="text-[10px]">Delivered</div>
                </div>
              </div>

              <div
                className="absolute bottom-0 left-0 right-0 bg-purple-600 flex items-center justify-center transition-all duration-1000 ease-out"
                style={{ height: `${paymentPercent}%` }}
              >
                <div className="text-white text-xs font-bold text-center">
                  <div>{paymentPercent}%</div>
                  <div className="text-[10px]">Paid</div>
                </div>
              </div>
            </div>

            <div className="absolute right-0 top-0 transform translate-x-full pl-4 h-full flex flex-col justify-between text-left">
              <div className="text-sm text-gray-500">100%</div>
              <div className="text-sm text-green-600 font-semibold" style={{ marginBottom: `${100 - deliveryPercent}%` }}>
                {deliveryPercent}%
              </div>
              <div className="text-sm text-purple-600 font-semibold" style={{ marginBottom: `${100 - paymentPercent}%` }}>
                {paymentPercent}%
              </div>
              <div className="text-sm text-gray-500">0%</div>
            </div>
          </div>
        </div>
      </div>
    );
};

const ChartWrapper = ({ children, title }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 min-w-0 overflow-hidden">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 truncate">{title}</h3>
      <div style={chartContainerStyles}>
        {children}
      </div>
    </div>
);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const Charts = ({ dashboardData, selectedPeriod }) => {
    return (
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

            <OrderFulfillmentChart data={dashboardData.detailedMetrics.fulfillmentMetrics} />
        </div>
    )
}

export default Charts;
