import React from 'react';
import { DollarSign, MapPin, TrendingUp, Users, Target, ShoppingCart, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

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

const KPICard = ({ title, value, subtitle, subvalue, change, icon: Icon, color }) => (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow min-w-0">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${color} flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {change !== undefined && change !== 0 && (
          <span className={`text-xs font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'} flex-shrink-0`}>
            {change > 0 ? '+' : ''}{parseFloat(change).toFixed(1)}%
          </span>
        )}
      </div>
      <h3 className="text-gray-600 text-xs font-medium mb-1 truncate">{title}</h3>
      <p className="text-lg font-bold text-gray-900 truncate" title={value}>{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1 truncate" title={subtitle}>{subtitle}</p>
      )}
      {subvalue && (
        <p className="text-sm font-semibold text-blue-600 mt-1 truncate" title={subvalue}>{subvalue}</p>
      )}
    </div>
);

const KPICards = ({ dashboardData }) => {
    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4 min-w-0">
                <KPICard
                title="Total Revenue"
                value={formatCurrency(dashboardData.overview.totalRevenue)}
                change={dashboardData.overview.totalRevenueChange}
                icon={DollarSign}
                color="bg-blue-600"
                />
                <KPICard
                title="Total Visits"
                value={dashboardData.overview.totalVisits.toLocaleString()}
                change={dashboardData.overview.totalVisitsChange}
                icon={MapPin}
                color="bg-green-600"
                />
                <KPICard
                title="Conversion Rate"
                value={`${dashboardData.overview.conversionRate}%`}
                change={dashboardData.overview.conversionRateChange}
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
                change={0}
                icon={Target}
                color="bg-pink-600"
                />
                <KPICard
                title="Avg Order Value"
                value={formatCurrency(dashboardData.overview.avgOrderValue)}
                change={dashboardData.overview.avgOrderValueChange}
                icon={ShoppingCart}
                color="bg-indigo-600"
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8 min-w-0">
                <KPICard
                title="Delivery Rate"
                value={`${dashboardData.overview.deliveryRate}%`}
                subtitle={`${dashboardData.detailedMetrics.fulfillmentMetrics.deliveredOrders}/${dashboardData.detailedMetrics.fulfillmentMetrics.confirmedOrders} orders`}
                subvalue={formatCurrency(dashboardData.detailedMetrics.fulfillmentMetrics.deliveredValue)}
                change={dashboardData.overview.deliveryRateChange}
                icon={CheckCircle}
                color="bg-blue-500"
                />
                <KPICard
                title="Payment Rate"
                value={`${dashboardData.detailedMetrics.fulfillmentMetrics.paymentRate}%`}
                subtitle={`${dashboardData.detailedMetrics.fulfillmentMetrics.paidOrders}/${dashboardData.detailedMetrics.fulfillmentMetrics.confirmedOrders} orders`}
                subvalue={formatCurrency(dashboardData.detailedMetrics.fulfillmentMetrics.paidValue)}
                change={0}
                icon={DollarSign}
                color="bg-green-500"
                />
                <KPICard
                title="Pending Pipeline"
                value={dashboardData.detailedMetrics.fulfillmentMetrics.confirmedOrders - dashboardData.detailedMetrics.fulfillmentMetrics.deliveredOrders}
                subtitle="Bills + Payments"
                subvalue={formatCurrency(dashboardData.detailedMetrics.fulfillmentMetrics.confirmedValue - dashboardData.detailedMetrics.fulfillmentMetrics.deliveredValue)}
                change={0}
                icon={Clock}
                color="bg-orange-500"
                />
                <KPICard
                title="Bills Pending"
                value={dashboardData.overview.billsPending}
                change={dashboardData.overview.billsPendingChange}
                icon={AlertCircle}
                color="bg-yellow-500"
                />
                <KPICard
                title="Payment Pending"
                value={dashboardData.overview.paymentPending}
                change={dashboardData.overview.paymentPendingChange}
                icon={XCircle}
                color="bg-red-500"
                />
            </div>
        </>
    )
}

export default KPICards;
