// CriticalParametersService.js
// Standalone service for Critical Parameters data management

import { supabase } from '../supabaseClient';

/**
 * Critical Parameters Data Management Service
 * Based on the critical_parameters_five_of_five view
 */
export class CriticalParametersService {
  
  /**
   * Fetch all critical parameters data
   * @param {Object} options - Query options
   * @param {number} options.limit - Limit number of records
   * @param {Object} options.filters - Additional filters
   * @returns {Promise<Object>} Response with data and error
   */
  static async getAllParameters(options = {}) {
    try {
      let query = supabase
        .from('critical_parameters_five_of_five')
        .select('*');

      // Apply filters if provided
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            if (Array.isArray(value)) {
              query = query.in(key, value);
            } else {
              query = query.eq(key, value);
            }
          }
        });
      }

      // Apply ordering (default: newest first)
      query = query.order('year', { ascending: false })
                   .order('month', { ascending: false });

      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: data || [],
        count: data?.length || 0,
        message: `Retrieved ${data?.length || 0} records`
      };

    } catch (error) {
      console.error('Error fetching critical parameters:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        count: 0
      };
    }
  }

  /**
   * Get parameters for a specific month and year
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @returns {Promise<Object>} Single month's parameters
   */
  static async getParametersByMonth(year, month) {
    try {
      const { data, error } = await supabase
        .from('critical_parameters_five_of_five')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      return {
        success: true,
        data: data || null,
        message: data ? 'Month data found' : 'No data for specified month'
      };

    } catch (error) {
      console.error('Error fetching parameters by month:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get current month's parameters
   * @returns {Promise<Object>} Current month's parameters
   */
  static async getCurrentMonthParameters() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed

    return this.getParametersByMonth(year, month);
  }

  /**
   * Get previous month's parameters
   * @returns {Promise<Object>} Previous month's parameters
   */
  static async getPreviousMonthParameters() {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth(); // 0-indexed, so this is actually previous month
    
    if (month === 0) {
      month = 12;
      year = year - 1;
    }

    return this.getParametersByMonth(year, month);
  }

  /**
   * Get comprehensive KPI summary for current month
   * @returns {Promise<Object>} KPI summary with comparisons
   */
  static async getKPISummary() {
    try {
      const [currentMonth, previousMonth] = await Promise.all([
        this.getCurrentMonthParameters(),
        this.getPreviousMonthParameters()
      ]);
      
      if (!currentMonth.success) {
        return {
          success: false,
          error: 'No current month data available'
        };
      }

      const current = currentMonth.data;
      const previous = previousMonth.data;

      const kpis = {
        // CRR KPIs
        crr: {
          conversionRatio: {
            current: current?.crr_conversion_ratio || 0,
            previous: previous?.crr_conversion_ratio || 0,
            change: this.calculateChange(current?.crr_conversion_ratio, previous?.crr_conversion_ratio)
          },
          activeClients: {
            current: current?.crr_active_clients_count || 0,
            previous: previous?.crr_active_clients_count || 0,
            change: this.calculateChange(current?.crr_active_clients_count, previous?.crr_active_clients_count)
          },
          avgOrderValue: {
            current: current?.crr_average_rs_sales || 0,
            previous: previous?.crr_average_rs_sales || 0,
            change: this.calculateChange(current?.crr_average_rs_sales, previous?.crr_average_rs_sales)
          },
          clientsLost: {
            current: current?.crr_clients_lost || 0,
            previous: previous?.crr_clients_lost || 0,
            change: this.calculateChange(current?.crr_clients_lost, previous?.crr_clients_lost)
          },
          revenueLost: {
            current: current?.crr_revenue_lost_value || 0,
            previous: previous?.crr_revenue_lost_value || 0,
            change: this.calculateChange(current?.crr_revenue_lost_value, previous?.crr_revenue_lost_value)
          }
        },
        // NBD KPIs
        nbd: {
          revenuePercentage: {
            current: current?.nbd_percentage_of_total_revenue || 0,
            previous: previous?.nbd_percentage_of_total_revenue || 0,
            change: this.calculateChange(current?.nbd_percentage_of_total_revenue, previous?.nbd_percentage_of_total_revenue)
          },
          conversionRatio: {
            current: current?.nbd_conversion_ratio || 0,
            previous: previous?.nbd_conversion_ratio || 0,
            change: this.calculateChange(current?.nbd_conversion_ratio, previous?.nbd_conversion_ratio)
          },
          newClients: {
            current: current?.nbd_new_clients_per_month || 0,
            previous: previous?.nbd_new_clients_per_month || 0,
            change: this.calculateChange(current?.nbd_new_clients_per_month, previous?.nbd_new_clients_per_month)
          },
          avgOrderValue: {
            current: current?.nbd_average_rs_sales || 0,
            previous: previous?.nbd_average_rs_sales || 0,
            change: this.calculateChange(current?.nbd_average_rs_sales, previous?.nbd_average_rs_sales)
          },
          walletShare: {
            current: current?.nbd_wallet_share_existing_clients || 0,
            previous: previous?.nbd_wallet_share_existing_clients || 0,
            change: this.calculateChange(current?.nbd_wallet_share_existing_clients, previous?.nbd_wallet_share_existing_clients)
          }
        },
        // Overall performance
        overall: {
          totalLeads: current?.crr_enquiries_leads_per_month || 0,
          month: current?.month_name,
          year: current?.year,
          dataQuality: this.assessDataQuality(current)
        }
      };

      return {
        success: true,
        data: kpis,
        timestamp: new Date().toISOString()
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

  /**
   * Get CRR-specific metrics only
   * @param {Object} options - Query options
   * @returns {Promise<Object>} CRR metrics data
   */
  static async getCRRMetrics(options = {}) {
    try {
      let query = supabase
        .from('critical_parameters_five_of_five')
        .select(`
          year,
          month,
          month_name,
          crr_enquiries_leads_per_month,
          crr_conversion_ratio,
          crr_average_rs_sales,
          crr_new_orders_per_month,
          crr_clients_not_reordering_percentage,
          crr_revenue_lost_value,
          crr_clients_lost,
          crr_active_clients_count
        `);

      // Apply filters
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

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: data || [],
        type: 'CRR',
        count: data?.length || 0
      };

    } catch (error) {
      console.error('Error fetching CRR metrics:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        type: 'CRR'
      };
    }
  }

  /**
   * Get NBD-specific metrics only (continued)
   */
  static async getNBDMetrics(options = {}) {
    try {
      let query = supabase
        .from('critical_parameters_five_of_five')
        .select(`
          year,
          month,
          month_name,
          nbd_percentage_of_total_revenue,
          nbd_leads_per_month,
          nbd_conversion_ratio,
          nbd_average_rs_sales,
          nbd_new_clients_per_month,
          nbd_wallet_share_existing_clients
        `);

      // Apply filters
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

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: data || [],
        type: 'NBD',
        count: data?.length || 0
      };

    } catch (error) {
      console.error('Error fetching NBD metrics:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        type: 'NBD'
      };
    }
  }

  /**
   * Get trend analysis for a specific metric
   * @param {string} metric - Metric column name
   * @param {number} months - Number of months to analyze (default: 12)
   * @returns {Promise<Object>} Trend data with calculations
   */
  static async getMetricTrend(metric, months = 12) {
    try {
      const { data, error } = await supabase
        .from('critical_parameters_five_of_five')
        .select(`year, month, month_name, ${metric}`)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(months);

      if (error) {
        throw error;
      }

      // Calculate trend analysis
      const trendData = data.map((item, index) => {
        const currentValue = parseFloat(item[metric]) || 0;
        const previousValue = index < data.length - 1 ? parseFloat(data[index + 1][metric]) || 0 : 0;
        
        const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
        
        return {
          ...item,
          value: currentValue,
          previousValue: previousValue,
          change_percentage: Math.round(change * 100) / 100,
          change_absolute: currentValue - previousValue,
          trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
          period: `${item.month_name} ${item.year}`
        };
      });

      // Calculate overall trend metrics
      const values = trendData.map(d => d.value);
      const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
      const maxValue = Math.max(...values);
      const minValue = Math.min(...values);
      const firstValue = values[values.length - 1];
      const lastValue = values[0];
      const overallGrowth = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

      return {
        success: true,
        data: trendData.reverse(), // Return in chronological order
        metric: metric,
        summary: {
          average: Math.round(avgValue * 100) / 100,
          maximum: maxValue,
          minimum: minValue,
          overallGrowth: Math.round(overallGrowth * 100) / 100,
          volatility: this.calculateVolatility(values),
          trend: overallGrowth > 5 ? 'upward' : overallGrowth < -5 ? 'downward' : 'stable'
        }
      };

    } catch (error) {
      console.error('Error fetching metric trend:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        metric: metric
      };
    }
  }

  /**
   * Compare performance between two specific months
   * @param {number} year1 - First year
   * @param {number} month1 - First month
   * @param {number} year2 - Second year
   * @param {number} month2 - Second month
   * @returns {Promise<Object>} Detailed comparison
   */
  static async compareMonths(year1, month1, year2, month2) {
    try {
      const [period1, period2] = await Promise.all([
        this.getParametersByMonth(year1, month1),
        this.getParametersByMonth(year2, month2)
      ]);

      if (!period1.success || !period2.success) {
        throw new Error('Failed to fetch comparison data');
      }

      const comparison = {
        period1: {
          label: `${period1.data?.month_name} ${year1}`,
          data: period1.data
        },
        period2: {
          label: `${period2.data?.month_name} ${year2}`,
          data: period2.data
        },
        changes: {},
        insights: []
      };

      // Key metrics for comparison
      const keyMetrics = [
        { key: 'crr_conversion_ratio', name: 'CRR Conversion Ratio', type: 'percentage' },
        { key: 'crr_active_clients_count', name: 'Active Clients', type: 'number' },
        { key: 'crr_average_rs_sales', name: 'CRR Avg Sales', type: 'currency' },
        { key: 'nbd_percentage_of_total_revenue', name: 'NBD Revenue Share', type: 'percentage' },
        { key: 'nbd_conversion_ratio', name: 'NBD Conversion Ratio', type: 'percentage' },
        { key: 'nbd_new_clients_per_month', name: 'New Clients', type: 'number' },
        { key: 'crr_clients_lost', name: 'Clients Lost', type: 'number' },
        { key: 'nbd_wallet_share_existing_clients', name: 'Wallet Share', type: 'percentage' }
      ];

      keyMetrics.forEach(metric => {
        const val1 = parseFloat(period1.data?.[metric.key]) || 0;
        const val2 = parseFloat(period2.data?.[metric.key]) || 0;
        
        const change = this.calculateChange(val1, val2);
        
        comparison.changes[metric.key] = {
          name: metric.name,
          type: metric.type,
          current: val1,
          previous: val2,
          change_percentage: change.percentage,
          change_absolute: change.absolute,
          trend: change.trend,
          significance: this.assessSignificance(change.percentage, metric.type)
        };

        // Generate insights
        if (Math.abs(change.percentage) > 10) {
          comparison.insights.push({
            metric: metric.name,
            type: change.trend === 'improvement' ? 'positive' : 'negative',
            message: `${metric.name} ${change.trend === 'improvement' ? 'improved' : 'declined'} by ${Math.abs(change.percentage).toFixed(1)}%`,
            impact: change.percentage > 20 ? 'high' : change.percentage > 10 ? 'medium' : 'low'
          });
        }
      });

      return {
        success: true,
        data: comparison
      };

    } catch (error) {
      console.error('Error comparing months:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get available time periods in the dataset
   * @returns {Promise<Object>} Available periods with metadata
   */
  static async getAvailablePeriods() {
    try {
      const { data, error } = await supabase
        .from('critical_parameters_five_of_five')
        .select('year, month, month_name')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) {
        throw error;
      }

      const periods = data.map(item => ({
        ...item,
        value: `${item.year}-${item.month.toString().padStart(2, '0')}`,
        label: `${item.month_name} ${item.year}`,
        quarter: Math.ceil(item.month / 3)
      }));

      // Group by year for easier navigation
      const periodsByYear = periods.reduce((acc, period) => {
        if (!acc[period.year]) {
          acc[period.year] = [];
        }
        acc[period.year].push(period);
        return acc;
      }, {});

      return {
        success: true,
        data: periods,
        byYear: periodsByYear,
        count: periods.length,
        range: {
          earliest: periods[periods.length - 1],
          latest: periods[0]
        }
      };

    } catch (error) {
      console.error('Error fetching available periods:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        count: 0
      };
    }
  }

  /**
   * Get performance alerts based on thresholds
   * @param {Object} thresholds - Performance thresholds
   * @returns {Promise<Object>} Performance alerts
   */
  static async getPerformanceAlerts(thresholds = {}) {
    try {
      const defaultThresholds = {
        crr_conversion_ratio: { min: 5, max: 100 },
        nbd_conversion_ratio: { min: 2, max: 50 },
        crr_clients_lost: { max: 10 },
        nbd_percentage_of_total_revenue: { min: 15 },
        ...thresholds
      };

      const currentData = await this.getCurrentMonthParameters();
      
      if (!currentData.success) {
        return { success: false, error: 'No current data available' };
      }

      const data = currentData.data;
      const alerts = [];

      // Check each threshold
      Object.entries(defaultThresholds).forEach(([metric, threshold]) => {
        const value = data[metric];
        
        if (value !== null && value !== undefined) {
          if (threshold.min && value < threshold.min) {
            alerts.push({
              type: 'warning',
              metric: metric,
              message: `${this.formatMetricName(metric)} is below threshold`,
              value: value,
              threshold: threshold.min,
              severity: 'medium'
            });
          }
          
          if (threshold.max && value > threshold.max) {
            alerts.push({
              type: 'error',
              metric: metric,
              message: `${this.formatMetricName(metric)} exceeds threshold`,
              value: value,
              threshold: threshold.max,
              severity: value > threshold.max * 1.5 ? 'high' : 'medium'
            });
          }
        }
      });

      return {
        success: true,
        data: alerts,
        count: alerts.length,
        hasAlerts: alerts.length > 0
      };

    } catch (error) {
      console.error('Error checking performance alerts:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  /**
   * Calculate percentage change between two values
   */
  static calculateChange(current, previous) {
    if (!previous || previous === 0) {
      return {
        percentage: current > 0 ? 100 : 0,
        absolute: current - (previous || 0),
        trend: current > 0 ? 'improvement' : 'stable'
      };
    }
    
    const percentage = ((current - previous) / previous) * 100;
    
    return {
      percentage: Math.round(percentage * 100) / 100,
      absolute: current - previous,
      trend: percentage > 0 ? 'improvement' : percentage < 0 ? 'decline' : 'stable'
    };
  }

  /**
   * Calculate volatility of a series of values
   */
  static calculateVolatility(values) {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Assess significance of a change
   */
  static assessSignificance(changePercentage, metricType) {
    const absChange = Math.abs(changePercentage);
    
    if (metricType === 'percentage') {
      return absChange > 20 ? 'high' : absChange > 10 ? 'medium' : 'low';
    } else if (metricType === 'currency') {
      return absChange > 15 ? 'high' : absChange > 5 ? 'medium' : 'low';
    } else {
      return absChange > 25 ? 'high' : absChange > 10 ? 'medium' : 'low';
    }
  }

  /**
   * Assess data quality
   */
  static assessDataQuality(data) {
    if (!data) return 'poor';
    
    const requiredFields = [
      'crr_conversion_ratio',
      'nbd_percentage_of_total_revenue',
      'crr_active_clients_count',
      'nbd_new_clients_per_month'
    ];
    
    const nonNullFields = requiredFields.filter(field => 
      data[field] !== null && data[field] !== undefined && data[field] !== 0
    );
    
    const completeness = nonNullFields.length / requiredFields.length;
    
    return completeness > 0.8 ? 'excellent' : 
           completeness > 0.6 ? 'good' : 
           completeness > 0.4 ? 'fair' : 'poor';
  }

  /**
   * Format metric name for display
   */
  static formatMetricName(metric) {
    const nameMap = {
      'crr_conversion_ratio': 'CRR Conversion Ratio',
      'crr_active_clients_count': 'Active Clients',
      'crr_average_rs_sales': 'CRR Average Sales',
      'nbd_percentage_of_total_revenue': 'NBD Revenue Percentage',
      'nbd_conversion_ratio': 'NBD Conversion Ratio',
      'nbd_new_clients_per_month': 'New Clients per Month',
      'crr_clients_lost': 'Clients Lost',
      'nbd_wallet_share_existing_clients': 'NBD Wallet Share'
    };
    
    return nameMap[metric] || metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

// ===============================
// UTILITY FUNCTIONS (Export these separately)
// ===============================

/**
 * Format currency values with Indian numbering
 * @param {number} value - Numeric value
 * @param {string} currency - Currency symbol (default: ₹)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = '₹') => {
  if (!value || isNaN(value)) return `${currency}0`;
  
  // Format with Indian numbering system (lakhs, crores)
  if (value >= 10000000) { // 1 crore
    return `${currency}${(value / 10000000).toFixed(2)}Cr`;
  } else if (value >= 100000) { // 1 lakh
    return `${currency}${(value / 100000).toFixed(2)}L`;
  } else if (value >= 1000) { // 1 thousand
    return `${currency}${(value / 1000).toFixed(2)}K`;
  }
  
  return `${currency}${Math.round(value).toLocaleString('en-IN')}`;
};

/**
 * Format percentage values
 * @param {number} value - Numeric value
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value) => {
  if (!value || isNaN(value)) return '0%';
  return `${Math.round(value * 100) / 100}%`;
};

/**
 * Format number with proper separators
 * @param {number} value - Numeric value
 * @returns {string} Formatted number string
 */
export const formatNumber = (value) => {
  if (!value || isNaN(value)) return '0';
  return Math.round(value).toLocaleString('en-IN');
};

/**
 * Calculate growth rate with trend indication
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {Object} Growth calculation with trend
 */
export const calculateGrowth = (current, previous) => {
  if (!previous || previous === 0) {
    return {
      rate: current > 0 ? 100 : 0,
      trend: current > 0 ? 'up' : 'stable',
      absolute: current - (previous || 0),
      formatted: current > 0 ? '+100%' : '0%'
    };
  }
  
  const rate = ((current - previous) / previous) * 100;
  
  return {
    rate: Math.round(rate * 100) / 100,
    trend: rate > 0 ? 'up' : rate < 0 ? 'down' : 'stable',
    absolute: current - previous,
    formatted: `${rate > 0 ? '+' : ''}${Math.round(rate * 100) / 100}%`
  };
};

/**
 * Get trend color based on metric type and value
 * @param {number} value - The value to assess
 * @param {string} metricType - Type of metric (higher_better, lower_better)
 * @param {number} change - Change percentage
 * @returns {string} Color class
 */
export const getTrendColor = (value, metricType = 'higher_better', change = 0) => {
  if (change === 0) return 'text-gray-500';
  
  const isPositiveChange = change > 0;
  
  if (metricType === 'higher_better') {
    return isPositiveChange ? 'text-green-600' : 'text-red-600';
  } else if (metricType === 'lower_better') {
    return isPositiveChange ? 'text-red-600' : 'text-green-600';
  }
  
  return 'text-gray-500';
};

/**
 * Export default service
 */
export default CriticalParametersService;
