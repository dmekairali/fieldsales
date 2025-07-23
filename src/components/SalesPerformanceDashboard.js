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
  
  // New state variables for enhanced functionality
  const [sortConfig, setSortConfig] = useState({ key: 'revenue', direction: 'desc' });
  const [visiblePerformers, setVisiblePerformers] = useState(10);

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

  const getPreviousDateRange = () => {
    const { start: currentStart } = getDateRange();
    const startDate = new Date(currentStart);

    let prevStart, prevEnd;

    switch (selectedPeriod) {
      case 'weekly':
        prevStart = new Date(startDate);
        prevStart.setDate(startDate.getDate() - 7);
        prevEnd = new Date(startDate);
        prevEnd.setDate(startDate.getDate() - 1);
        break;
      case 'monthly':
        prevStart = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
        prevEnd = new Date(startDate.getFullYear(), startDate.getMonth(), 0);
        break;
      case 'quarterly':
        prevStart = new Date(startDate.getFullYear(), startDate.getMonth() - 3, 1);
        prevEnd = new Date(startDate.getFullYear(), startDate.getMonth(), 0);
        break;
      case 'yearly':
        prevStart = new Date(startDate.getFullYear() - 1, 0, 1);
        prevEnd = new Date(startDate.getFullYear() - 1, 11, 31);
        break;
      default:
        return null;
    }

    return {
      start: prevStart.toISOString().split('T')[0],
      end: prevEnd.toISOString().split('T')[0],
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

  // Filter Medical Reps based on other selections
  const getFilteredMedicalReps = () => {
    let filteredReps = medicalReps;

    // Filter by Region
    if (selectedRegion !== 'all') {
      filteredReps = filteredReps.filter(rep => rep.region === selectedRegion);
    }

    // Filter by Team (ASM/RSM)
    if (selectedTeam !== 'all') {
      const selectedTeamData = teams.find(team => team.employee_id === selectedTeam);
      if (selectedTeamData) {
        filteredReps = filteredReps.filter(rep => 
          rep.area_sales_manager_name === selectedTeamData.name || 
          rep.regional_sales_manager_name === selectedTeamData.name
        );
      }
    }

    // Filter by State
    if (selectedState !== 'all') {
      filteredReps = filteredReps.filter(rep => rep.state === selectedState);
    }

    // Group by active status
    const activeReps = filteredReps.filter(rep => rep.is_active === true);
    const inactiveReps = filteredReps.filter(rep => rep.is_active === false);

    return { activeReps, inactiveReps };
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

  // Reset MR selection when other filters change
  useEffect(() => {
    if (selectedMR !== 'all') {
      const { activeReps, inactiveReps } = getFilteredMedicalReps();
      const allFilteredReps = [...activeReps, ...inactiveReps];
      const isCurrentMRInFiltered = allFilteredReps.some(rep => rep.employee_id === selectedMR);
      
      if (!isCurrentMRInFiltered) {
        setSelectedMR('all');
      }
    }
  }, [selectedRegion, selectedTeam, selectedState]);

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

      // Fetch all medical representatives with enhanced fields
      const { data: mrData } = await supabase
        .from('medical_representatives')
        .select('employee_id, name, role_level, is_active, region, state, area_sales_manager_name, regional_sales_manager_name')
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
      const previousDateRange = getPreviousDateRange();
      
      // Build base query for orders with enhanced fields
      let orderQuery = supabase
        .from('orders')
        .select(`
          order_id,
          order_date,
          net_amount,
          order_type,
          mr_name,
          customer_code,
          state,
          status,
          delivery_status,
          payment_status
        `)
        .gte('order_date', start)
        .lte('order_date', end)
        .in('customer_type', ['Doctor', 'Retailer'])
        .eq('status', 'Order Confirmed')
        .or('delivery_status.eq.Dispatch Confirmed,delivery_status.is.null');

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

      // Get ALL historical visits to determine first visits (for new prospects calculation)
      let allVisitsQuery = supabase
        .from('mr_visits')
        .select(`
          "clientMobileNo",
          "empName",
          "dcrDate"
        `)
        .order('"dcrDate"', { ascending: true });

      // Apply filters
      if (selectedMR !== 'all') {
        const selectedMRData = medicalReps.find(mr => mr.employee_id === selectedMR);
        if (selectedMRData) {
          orderQuery = orderQuery.eq('mr_name', selectedMRData.name);
          visitQuery = visitQuery.eq('"empName"', selectedMRData.name);
          targetQuery = targetQuery.eq('employee_id', selectedMR);
          allVisitsQuery = allVisitsQuery.eq('"empName"', selectedMRData.name);
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
          allVisitsQuery = allVisitsQuery.in('"empName"', mrNames);
        }
      }

      if (selectedState !== 'all') {
        orderQuery = orderQuery.eq('state', selectedState);
      }

      const fetchDataForPeriod = async (startDate, endDate) => {
        let periodOrderQuery = supabase
          .from('orders')
          .select(`
            order_id,
            order_date,
            net_amount,
            order_type,
            mr_name,
            customer_code,
            state,
            status,
            delivery_status,
            payment_status
          `)
          .gte('order_date', startDate)
          .lte('order_date', endDate)
          .in('customer_type', ['Doctor', 'Retailer'])
          .eq('status', 'Order Confirmed')
          .or('delivery_status.eq.Dispatch Confirmed,delivery_status.is.null');

        let periodVisitQuery = supabase
          .from('mr_visits')
          .select(`
            "visitId",
            "dcrDate",
            "empName",
            "clientMobileNo",
            "clientName",
            "amountOfSale"
          `)
          .gte('"dcrDate"', startDate)
          .lte('"dcrDate"', endDate);

        if (selectedMR !== 'all') {
            const selectedMRData = medicalReps.find(mr => mr.employee_id === selectedMR);
            if (selectedMRData) {
                periodOrderQuery = periodOrderQuery.eq('mr_name', selectedMRData.name);
                periodVisitQuery = periodVisitQuery.eq('"empName"', selectedMRData.name);
            }
        }

        const [orderData, visitData] = await Promise.all([
            periodOrderQuery,
            periodVisitQuery,
        ]);

        return {
            orders: orderData.data || [],
            visits: visitData.data || [],
        };
      };

      const [currentPeriodData, previousPeriodData, targetData, mrData, allVisitsData] = await Promise.all([
        fetchDataForPeriod(start, end),
        previousDateRange ? fetchDataForPeriod(previousDateRange.start, previousDateRange.end) : Promise.resolve({ orders: [], visits: [] }),
        targetQuery,
        supabase
          .from('medical_representatives')
          .select('employee_id, name, role_level, region, state, is_active, area_sales_manager_name, regional_sales_manager_name'),
        allVisitsQuery,
      ]);

      // Process data to calculate conversions
      const processedData = processDataWithConversions(
        currentPeriodData.orders,
        currentPeriodData.visits,
        targetData.data || [],
        mrData.data || [],
        allVisitsData.data || [],
        previousPeriodData
      );

      setDashboardData(processedData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processDataWithConversions = (orders, visits, targets, mrs, allVisits, previousPeriodData) => {
    const calculateMetrics = (periodOrders, periodVisits) => {
        const totalRevenue = periodOrders.reduce((sum, order) => sum + (order.net_amount || 0), 0);
        const totalVisits = periodVisits.length;
        const convertedVisits = new Set();
        const visitMap = new Map();
        periodVisits.forEach(visit => {
            const dateKey = visit.dcrDate;
            const customerKey = visit.clientMobileNo;
            if (!visitMap.has(dateKey)) {
                visitMap.set(dateKey, new Map());
            }
            visitMap.get(dateKey).set(customerKey, visit);
        });
        periodOrders.forEach(order => {
            const dateKey = order.order_date;
            const dayVisits = visitMap.get(dateKey);
            if (dayVisits) {
                dayVisits.forEach((visit, customerKey) => {
                    if (customerKey === order.customer_code ||
                        (visit.clientMobileNo && order.customer_code &&
                            visit.clientMobileNo === order.customer_code)) {
                        convertedVisits.add(visit.visitId);
                    }
                });
            }
        });
        const conversionRate = totalVisits > 0 ? ((convertedVisits.size / totalVisits) * 100) : 0;
        const avgOrderValue = periodOrders.length > 0 ? totalRevenue / periodOrders.length : 0;
        return { totalRevenue, totalVisits, conversionRate, avgOrderValue };
    };

    const currentMetrics = calculateMetrics(orders, visits);
    const previousMetrics = calculateMetrics(previousPeriodData.orders, previousPeriodData.visits);

    const calculateChange = (current, previous) => {
        if (previous === 0) {
            return current > 0 ? 100 : 0;
        }
        return ((current - previous) / previous) * 100;
    };

    const totalRevenueChange = calculateChange(currentMetrics.totalRevenue, previousMetrics.totalRevenue);
    const totalVisitsChange = calculateChange(currentMetrics.totalVisits, previousMetrics.totalVisits);
    const conversionRateChange = calculateChange(currentMetrics.conversionRate, previousMetrics.conversionRate);
    const avgOrderValueChange = calculateChange(currentMetrics.avgOrderValue, previousMetrics.avgOrderValue);
    // Create a map of visits by date and customer for conversion tracking
    const visitMap = new Map();
    visits.forEach(visit => {
      const dateKey = visit.dcrDate;
      const customerKey = visit.clientMobileNo; // Using only mobile number as unique identifier
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
          if (customerKey === order.customer_code || 
              (visit.clientMobileNo && order.customer_code && 
               visit.clientMobileNo === order.customer_code)) {
            convertedVisits.add(visit.visitId);
          }
        });
      }
    });

    // Create map to track first visits ever for new prospects calculation
    const firstVisitMap = new Map(); // clientMobileNo -> { mrName, firstDate }
    
    // Sort all visits by date to find the very first visit for each customer
    const sortedAllVisits = allVisits.sort((a, b) => new Date(a.dcrDate) - new Date(b.dcrDate));
    
    sortedAllVisits.forEach(visit => {
      const customerKey = visit.clientMobileNo;
      if (!firstVisitMap.has(customerKey)) {
        // This is the first visit ever for this customer
        firstVisitMap.set(customerKey, {
          mrName: visit.empName,
          firstDate: visit.dcrDate
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

    // Calculate bills and payment pending
    const billsPending = orders.filter(order => 
      order.status === 'Order Confirmed' && order.delivery_status === null
    ).length;
    
    const paymentPending = orders.filter(order => 
      order.payment_status === null
    ).length;

    // Calculate order fulfillment metrics
    const confirmedOrders = orders.filter(order => order.status === 'Order Confirmed');
    const deliveredOrders = orders.filter(order => 
      order.status === 'Order Confirmed' && order.delivery_status === 'Dispatch Confirmed'
    );
    const paidOrders = orders.filter(order => 
      order.status === 'Order Confirmed' && order.payment_status !== null
    );

    const deliveryRate = confirmedOrders.length > 0 ? 
      ((deliveredOrders.length / confirmedOrders.length) * 100).toFixed(1) : 0;
    const paymentRate = confirmedOrders.length > 0 ? 
      ((paidOrders.length / confirmedOrders.length) * 100).toFixed(1) : 0;

    const deliveredValue = deliveredOrders.reduce((sum, order) => sum + (order.net_amount || 0), 0);
    const paidValue = paidOrders.reduce((sum, order) => sum + (order.net_amount || 0), 0);
    const confirmedValue = confirmedOrders.reduce((sum, order) => sum + (order.net_amount || 0), 0);

    // Group data by time period for trends
    const trends = groupDataByPeriod(orders, visits, targets, selectedPeriod, convertedVisits);

    // Calculate detailed performer metrics for all filtered MRs
    const performerMap = {};
    
    // Initialize all MRs from the filtered list to show everyone based on filters
    const filteredMRs = getFilteredMedicalReps();
    const allFilteredMRs = [...filteredMRs.activeReps, ...filteredMRs.inactiveReps];
    
    allFilteredMRs.forEach(mr => {
      performerMap[mr.name] = {
        id: mr.employee_id,
        name: mr.name,
        isActive: mr.is_active,
        revenue: 0,
        visits: 0,
        orders: 0,
        convertedVisits: 0,
        nbdOrders: 0,
        crrOrders: 0,
        nbdRevenue: 0,
        crrRevenue: 0,
        newProspects: 0,
        billsPending: 0,
        paymentPending: 0
      };
    });

    // Group orders by MR
    orders.forEach(order => {
      const mrName = order.mr_name;
      if (performerMap[mrName]) {
        performerMap[mrName].revenue += order.net_amount || 0;
        performerMap[mrName].orders += 1;
        
        if (order.order_type === 'NBD') {
          performerMap[mrName].nbdOrders += 1;
          performerMap[mrName].nbdRevenue += order.net_amount || 0;
        } else if (order.order_type === 'CRR') {
          performerMap[mrName].crrOrders += 1;
          performerMap[mrName].crrRevenue += order.net_amount || 0;
        }
        
        // Bills pending
        if (order.status === 'Order Confirmed' && order.delivery_status === null) {
          performerMap[mrName].billsPending += 1;
        }
        
        // Payment pending
        if (order.payment_status === null) {
          performerMap[mrName].paymentPending += 1;
        }
      }
    });

    // Group visits by MR and calculate new prospects
    visits.forEach(visit => {
      const mrName = visit.empName;
      const customerKey = visit.clientMobileNo;
      
      if (performerMap[mrName]) {
        performerMap[mrName].visits += 1;
        if (convertedVisits.has(visit.visitId)) {
          performerMap[mrName].convertedVisits += 1;
        }
        
        // Check if this visit is to a new prospect (first visit ever by this MR to this customer)
        const firstVisit = firstVisitMap.get(customerKey);
        if (firstVisit && firstVisit.mrName === mrName) {
          // This MR made the very first visit to this customer
          const visitDate = new Date(visit.dcrDate);
          const selectedPeriodStart = new Date(getDateRange().start);
          const selectedPeriodEnd = new Date(getDateRange().end);
          
          // Check if the first visit falls within the selected period
          if (visitDate >= selectedPeriodStart && visitDate <= selectedPeriodEnd) {
            performerMap[mrName].newProspects += 1;
          }
        }
      }
    });

    const allPerformers = Object.values(performerMap)
      .map(performer => ({
        ...performer,
        conversion: performer.visits > 0 ? ((performer.convertedVisits / performer.visits) * 100).toFixed(0) : 0,
        nbdConversion: performer.nbdOrders > 0 && performer.visits > 0 ? 
          ((performer.nbdOrders / performer.visits) * 100).toFixed(0) : 0,
        achievement: 100 // This would be calculated based on individual targets
      }));

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
        totalRevenue: currentMetrics.totalRevenue,
        totalVisits: currentMetrics.totalVisits,
        conversionRate: currentMetrics.conversionRate,
        activeReps,
        targetAchievement,
        avgOrderValue: currentMetrics.avgOrderValue,
        billsPending,
        paymentPending,
        totalRevenueChange,
        totalVisitsChange,
        conversionRateChange,
        avgOrderValueChange,
      },
      trends,
      allPerformers,
      performanceByCategory: [
        { category: 'New Business (NBD)', value: nbdRevenue, percentage: totalRevenue > 0 ? ((nbdRevenue / totalRevenue) * 100).toFixed(0) : 0 },
        { category: 'Customer Retention (CRR)', value: crrRevenue, percentage: totalRevenue > 0 ? ((crrRevenue / totalRevenue) * 100).toFixed(0) : 0 }
      ],
      detailedMetrics: {
        visitMetrics,
        conversionMetrics,
        revenueMetrics,
        fulfillmentMetrics: {
          confirmedOrders: confirmedOrders.length,
          deliveredOrders: deliveredOrders.length,
          paidOrders: paidOrders.length,
          deliveryRate: parseFloat(deliveryRate),
          paymentRate: parseFloat(paymentRate),
          confirmedValue,
          deliveredValue,
          paidValue
        }
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

  // Sorting functionality
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedPerformers = () => {
    const performers = [...(dashboardData?.allPerformers || [])];
    
    if (sortConfig.key) {
      performers.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (typeof aValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        return sortConfig.direction === 'asc' 
          ? aValue - bValue 
          : bValue - aValue;
      });
    }
    
    return performers;
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

  // Sort Icon Component
  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      );
    }
    
    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // Enhanced Medical Rep Dropdown Component
  const EnhancedMedicalRepDropdown = () => {
    const { activeReps, inactiveReps } = getFilteredMedicalReps();
    
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Medical Rep 
          <span className="text-xs text-gray-500 ml-1">
            ({activeReps.length + inactiveReps.length} available)
          </span>
        </label>
        <select
          value={selectedMR}
          onChange={(e) => setSelectedMR(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Representatives</option>
          
          {activeReps.length > 0 && (
            <optgroup label={`🟢 Active Representatives (${activeReps.length})`}>
              {activeReps.map(rep => (
                <option key={rep.employee_id} value={rep.employee_id}>
                  {rep.name}
                </option>
              ))}
            </optgroup>
          )}
          
          {inactiveReps.length > 0 && (
            <optgroup label={`🔴 Inactive Representatives (${inactiveReps.length})`}>
              {inactiveReps.map(rep => (
                <option key={rep.employee_id} value={rep.employee_id}>
                  {rep.name} (Inactive)
                </option>
              ))}
            </optgroup>
          )}
          
      
          
         
{activeReps.length === 0 && inactiveReps.length === 0 && (
            <option disabled>No representatives found for current filters</option>
          )}
        </select>
        
        {/* Filter summary */}
        <div className="mt-1 text-xs text-gray-500">
          {selectedRegion !== 'all' && <span className="mr-2">📍 {selectedRegion}</span>}
          {selectedTeam !== 'all' && <span className="mr-2">👥 {teams.find(t => t.employee_id === selectedTeam)?.name}</span>}
          {selectedState !== 'all' && <span className="mr-2">🏛️ {selectedState}</span>}
        </div>
      </div>
    );
  };

  // Enhanced Order Fulfillment Chart Component with Vertical Stacked Bar
  const OrderFulfillmentChart = ({ data }) => {
    const deliveryPercent = data.deliveryRate;
    const paymentPercent = data.paymentRate;
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Order Fulfillment Pipeline</h3>
        
        <div className="flex items-center justify-center">
          {/* Main Vertical Bar Container */}
          <div className="relative">
            {/* Bar Labels on the left */}
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

            {/* Main Vertical Bar */}
            <div className="w-24 h-80 bg-blue-200 rounded-lg relative overflow-hidden border-2 border-blue-300">
              {/* Order Confirmed Base (Full Bar) */}
              <div className="absolute inset-0 bg-blue-500 flex items-center justify-center">
                <div className="text-white text-xs font-bold text-center">
                  <div>100%</div>
                  <div className="text-[10px]">Confirmed</div>
                </div>
              </div>

              {/* Delivered Section */}
              <div 
                className="absolute bottom-0 left-0 right-0 bg-green-500 flex items-center justify-center transition-all duration-1000 ease-out"
                style={{ height: `${deliveryPercent}%` }}
              >
                <div className="text-white text-xs font-bold text-center">
                  <div>{deliveryPercent}%</div>
                  <div className="text-[10px]">Delivered</div>
                </div>
              </div>

              {/* Payment Received Section */}
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

            {/* Percentage markers on the right */}
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

  const KPICard = ({ title, value, subtitle, subvalue, change, icon: Icon, color }) => (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow min-w-0">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${color} flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {change !== undefined && change !== 0 && (
          <span className={`text-xs font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'} flex-shrink-0`}>
            {change > 0 ? '+' : ''}{change}%
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
        <div className="min-w-[1200px]"> {/* Minimum width for table */}
          {children}
        </div>
      </div>
    </div>
  );

  // Enhanced Performance Table Component
  const EnhancedPerformanceTable = ({ data }) => {
    const sortedPerformers = getSortedPerformers();
    const displayedPerformers = sortedPerformers.slice(0, visiblePerformers);
    
    return (
      <TableWrapper>
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">All Performers ({sortedPerformers.length})</h3>
          <p className="text-sm text-gray-600">Showing {Math.min(visiblePerformers, sortedPerformers.length)} of {sortedPerformers.length} representatives</p>
        </div>
        
        <div className="overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Rank</th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Name</span>
                    <SortIcon column="name" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('revenue')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Revenue</span>
                    <SortIcon column="revenue" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('visits')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Visits</span>
                    <SortIcon column="visits" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('conversion')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Conversion</span>
                    <SortIcon column="conversion" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('convertedVisits')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Converted</span>
                    <SortIcon column="convertedVisits" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('nbdConversion')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>NBD Conv.</span>
                    <SortIcon column="nbdConversion" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('newProspects')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>New Prospects</span>
                    <SortIcon column="newProspects" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('billsPending')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Bills Pending</span>
                    <SortIcon column="billsPending" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('paymentPending')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Payment Pending</span>
                    <SortIcon column="paymentPending" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedPerformers.map((rep, index) => (
                <tr 
                  key={rep.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedMR(rep.id)}
                >
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
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {rep.name}
                        {!rep.isActive && <span className="ml-1 text-xs text-red-500">(Inactive)</span>}
                      </div>
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
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900 w-20">{rep.convertedVisits}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900 w-24">{rep.nbdConversion}%</td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900 w-20">{rep.newProspects}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900 w-20">
                    <span className={rep.billsPending > 0 ? 'text-orange-600 font-medium' : 'text-gray-900'}>
                      {rep.billsPending}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900 w-20">
                    <span className={rep.paymentPending > 0 ? 'text-red-600 font-medium' : 'text-gray-900'}>
                      {rep.paymentPending}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {sortedPerformers.length > visiblePerformers && (
          <div className="p-4 border-t border-gray-100 text-center">
            <button
              onClick={() => setVisiblePerformers(prev => Math.min(prev + 10, sortedPerformers.length))}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Show More ({sortedPerformers.length - visiblePerformers} remaining)
            </button>
          </div>
        )}
      </TableWrapper>
    );
  };

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

        {/* Enhanced Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Period Filter */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
              <div className="flex gap-2">
                <select
                  value={selectedPeriod}
                  onChange={(e) => handlePeriodChange(e.target.value)}
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
                    <option value="2025">2025</option>
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
            
            {/* Region Filter */}
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
            
            {/* Team Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team (ASM/RSM)</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Teams</option>
                {teams.map(team => (
                  <option key={team.employee_id} value={team.employee_id}>
                    {team.name} ({team.role_level}) - {team.region}
                  </option>
                ))}
              </select>
            </div>
            
            {/* State Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All States</option>
                {states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            
            {/* Enhanced Medical Rep Filter */}
            <EnhancedMedicalRepDropdown />
          </div>
        </div>
      </div>

      {/* Enhanced KPI Cards - Two Rows Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4 min-w-0">
        {/* First Row */}
        <KPICard
          title="Total Revenue"
          value={formatCurrency(dashboardData.overview.totalRevenue)}
          change={dashboardData.overview.totalRevenueChange.toFixed(1)}
          icon={DollarSign}
          color="bg-blue-600"
        />
        <KPICard
          title="Total Visits"
          value={dashboardData.overview.totalVisits.toLocaleString()}
          change={dashboardData.overview.totalVisitsChange.toFixed(1)}
          icon={MapPin}
          color="bg-green-600"
        />
        <KPICard
          title="Conversion Rate"
          value={`${dashboardData.overview.conversionRate.toFixed(1)}%`}
          change={dashboardData.overview.conversionRateChange.toFixed(1)}
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
          change={dashboardData.overview.avgOrderValueChange.toFixed(1)}
          icon={ShoppingCart}
          color="bg-indigo-600"
        />
      </div>
      
      {/* Second Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8 min-w-0">
        <KPICard
          title="Delivery Rate"
          value={`${dashboardData.detailedMetrics.fulfillmentMetrics.deliveryRate}%`}
          subtitle={`${dashboardData.detailedMetrics.fulfillmentMetrics.deliveredOrders}/${dashboardData.detailedMetrics.fulfillmentMetrics.confirmedOrders} orders`}
          subvalue={formatCurrency(dashboardData.detailedMetrics.fulfillmentMetrics.deliveredValue)}
          change={2.3}
          icon={CheckCircle}
          color="bg-blue-500"
        />
        <KPICard
          title="Payment Rate"
          value={`${dashboardData.detailedMetrics.fulfillmentMetrics.paymentRate}%`}
          subtitle={`${dashboardData.detailedMetrics.fulfillmentMetrics.paidOrders}/${dashboardData.detailedMetrics.fulfillmentMetrics.confirmedOrders} orders`}
          subvalue={formatCurrency(dashboardData.detailedMetrics.fulfillmentMetrics.paidValue)}
          change={-1.2}
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
          change={0}
          icon={AlertCircle}
          color="bg-yellow-500"
        />
        <KPICard
          title="Payment Pending"
          value={dashboardData.overview.paymentPending}
          change={0}
          icon={XCircle}
          color="bg-red-500"
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
        
        {/* New Order Fulfillment Chart */}
        <OrderFulfillmentChart data={dashboardData.detailedMetrics.fulfillmentMetrics} />
      </div>

      {/* Enhanced Top Performers Table */}
      <div className="mb-8">
        <EnhancedPerformanceTable data={dashboardData.allPerformers} />
      </div>

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

      {/* Performance Metrics Detail Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6 min-w-0 overflow-hidden mt-8">
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
  );
};

export default SalesPerformanceDashboard;
