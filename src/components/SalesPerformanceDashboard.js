import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Calendar, TrendingUp, Users, Target, DollarSign, Activity, Award, AlertCircle, ChevronDown, Filter, Download, RefreshCw, User, MapPin, Phone, ShoppingCart, CheckCircle, Clock, XCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SalesPerformanceDashboard = () => {

  // CRITICAL: Name standardization function
  const standardizeName = (name) => {
    if (!name) return '';
    return name
      .trim()                          // Remove leading/trailing whitespace
      .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
      .replace(/#S$/, '')             // Remove #S suffix
      .toLowerCase()                   // Convert to lowercase for comparison
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
      .join(' ');
  };

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
  const [regions, setRegions] = useState([]); 
  const [medicalReps, setMedicalReps] = useState([]);
  const [unknownMRs, setUnknownMRs] = useState([]);
  
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

  // Get previous period date range for comparison
  const getPreviousDateRange = (currentRange) => {
    const { start, end } = currentRange;
    const startDate = new Date(start);
    const endDate = new Date(end);
    let prevStart, prevEnd;

    switch (selectedPeriod) {
        case 'weekly':
            prevStart = new Date(startDate);
            prevStart.setDate(startDate.getDate() - 7);
            prevEnd = new Date(endDate);
            prevEnd.setDate(endDate.getDate() - 7);
            break;
        case 'monthly':
            prevStart = new Date(startDate);
            prevStart.setMonth(startDate.getMonth() - 1);
            prevEnd = new Date(startDate);
            prevEnd.setDate(0);
            break;
        case 'quarterly':
            prevStart = new Date(startDate);
            prevStart.setMonth(startDate.getMonth() - 3);
            prevEnd = new Date(startDate);
            prevEnd.setDate(0);
            break;
        case 'yearly':
            prevStart = new Date(startDate);
            prevStart.setFullYear(startDate.getFullYear() - 1);
            prevEnd = new Date(endDate);
            prevEnd.setFullYear(endDate.getFullYear() - 1);
            break;
        default: // custom
            const diff = endDate.getTime() - startDate.getTime();
            prevStart = new Date(startDate.getTime() - diff);
            prevEnd = new Date(startDate);
            break;
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
    let filteredReps = [...medicalReps];
    let filteredUnknownReps = [...unknownMRs];
    
    console.log('Starting getFilteredMedicalReps with:', filteredReps.length, 'known +', filteredUnknownReps.length, 'unknown');

    // Apply Region filter to known MRs
    if (selectedRegion !== 'all') {
      filteredReps = filteredReps.filter(rep => rep.region === selectedRegion);
      // Unknown MRs don't have proper region data, so exclude them when region is filtered
      filteredUnknownReps = [];
    }

    // Apply State filter to known MRs
    if (selectedState !== 'all') {
      filteredReps = filteredReps.filter(rep => rep.state === selectedState);
      // Unknown MRs don't have proper state data, so exclude them when state is filtered
      filteredUnknownReps = [];
    }

    // Apply Team filter to known MRs
    if (selectedTeam !== 'all') {
      const selectedTeamData = teams.find(team => standardizeName(team.name) === selectedTeam);
      
      if (selectedTeam === 'independent') {
        // Independent: only known MRs with no team assignment
        filteredReps = filteredReps.filter(rep => 
          rep.role_level === 'MR' && 
          !rep.area_sales_manager_name && 
          !rep.regional_sales_manager_name
        );
        filteredUnknownReps = []; // Unknown MRs are not part of independent
      } else if (selectedTeamData) {
        // Specific team selected: only known MRs under that team
        if (selectedTeamData.role_level === 'RSM') {
          const rsmName = standardizeName(selectedTeamData.name);
          const asmUnderRSM = medicalReps.filter(rep => 
            rep.role_level === 'ASM' && standardizeName(rep.regional_sales_manager_name) === rsmName
          );
          const asmNames = asmUnderRSM.map(asm => standardizeName(asm.name));
          
          filteredReps = filteredReps.filter(rep => 
            rep.role_level === 'MR' && (
              standardizeName(rep.regional_sales_manager_name) === rsmName ||
              asmNames.includes(standardizeName(rep.area_sales_manager_name))
            )
          );
        } else if (selectedTeamData.role_level === 'ASM') {
          const asmName = standardizeName(selectedTeamData.name);
          filteredReps = filteredReps.filter(rep => 
            rep.role_level === 'MR' && standardizeName(rep.area_sales_manager_name) === asmName
          );
        }
        filteredUnknownReps = []; // Unknown MRs are not part of specific teams
      }
    }

    // Only include MRs in the final result
    filteredReps = filteredReps.filter(rep => rep.role_level === 'MR');

    // Combine known and unknown MRs
    const allFilteredReps = [...filteredReps, ...filteredUnknownReps];

    // Group by active status
    const activeReps = allFilteredReps.filter(rep => rep.is_active === true);
    const inactiveReps = allFilteredReps.filter(rep => rep.is_active === false);

    console.log('Final split:', { 
      knownActive: filteredReps.filter(r => r.is_active).length,
      unknownActive: filteredUnknownReps.length,
      totalActive: activeReps.length,
      totalInactive: inactiveReps.length 
    });

    return { activeReps, inactiveReps };
  };

  // Fetch initial data for filters
  useEffect(() => {
    fetchFilterData();
  }, []);

  // Fetch dashboard data when filters change
  useEffect(() => {
    if (medicalReps.length > 0) {
      // Refetch unknown MRs when period changes (they might be different)
      getUnknownMRsFromSalesData().then(setUnknownMRs);
      fetchDashboardData();
    }
  }, [selectedPeriod, selectedMonth, selectedWeek, selectedQuarter, selectedYear, 
      selectedRegion, selectedTeam, selectedState, selectedMR, dateRange, medicalReps]);

  // Reset MR selection when other filters change
  useEffect(() => {
    if (selectedMR !== 'all') {
      const { activeReps, inactiveReps } = getFilteredMedicalReps();
      const allFilteredReps = [...activeReps, ...inactiveReps];
      const isCurrentMRInFiltered = allFilteredReps.some(rep => standardizeName(rep.name) === selectedMR);
      
      if (!isCurrentMRInFiltered) {
        setSelectedMR('all');
      }
    }
  }, [selectedRegion, selectedTeam, selectedState]);

  const fetchFilterData = async () => {
    try {
      // Fetch teams (ASM/RSM) - Using name as identifier
      const { data: teamData } = await supabase
        .from('medical_representatives')
        .select('name, role_level, region')
        .in('role_level', ['ASM', 'RSM'])
        .eq('is_active', true)
        .order('role_level', { ascending: false })
        .order('name');

      // Standardize team names
      const standardizedTeams = teamData?.map(team => ({
        ...team,
        name: standardizeName(team.name),
        original_name: team.name
      })) || [];

      // Fetch unique states
      const { data: stateData } = await supabase
        .from('medical_representatives')
        .select('state')
        .not('state', 'is', null)
        .eq('role_level', 'MR')
        .order('state');

      // Fetch unique regions  
      const { data: regionData } = await supabase
        .from('medical_representatives')
        .select('region')
        .not('region', 'is', null)
        .eq('role_level', 'MR')
        .order('region');

      const uniqueStates = [...new Set(stateData?.map(item => item.state) || [])];
      const uniqueRegions = [...new Set(regionData?.map(item => item.region) || [])];

      // Fetch all medical representatives
      const { data: mrData } = await supabase
        .from('medical_representatives')
        .select('name, role_level, is_active, region, state, area_sales_manager_name, regional_sales_manager_name')
        .order('name');

      // Standardize all names in medical reps data
      const standardizedMRData = mrData?.map(rep => ({
        ...rep,
        name: standardizeName(rep.name),
        area_sales_manager_name: standardizeName(rep.area_sales_manager_name),
        regional_sales_manager_name: standardizeName(rep.regional_sales_manager_name),
        original_name: rep.name
      })) || [];

      // Fetch unknown MRs
      const unknownMRData = await getUnknownMRsFromSalesData();
      
      console.log('Filter data loaded:', {
        teams: standardizedTeams.length,
        states: uniqueStates.length,
        regions: uniqueRegions.length,
        allReps: standardizedMRData.length,
        mrOnly: standardizedMRData.filter(r => r.role_level === 'MR').length,
        unknownMRs: unknownMRData.length
      });

      setTeams(standardizedTeams);
      setStates(uniqueStates);
      setRegions(uniqueRegions);
      setMedicalReps(standardizedMRData);
      setUnknownMRs(unknownMRData);
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const currentRange = getDateRange();
      const previousRange = getPreviousDateRange(currentRange);

      console.log('Date ranges:', { current: currentRange, previous: previousRange });
      console.log('Current filters:', { selectedRegion, selectedTeam, selectedState, selectedMR });

      const fetchDataForRange = async (range) => {
        const { start, end } = range;
        
        // Build base queries
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
          .eq('status', 'Order Confirmed');

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

        let targetQuery = supabase
          .from('mr_weekly_targets')
          .select('*')
          .gte('target_date', start)
          .lte('target_date', end);

        // Handle MR selection by name
        if (selectedMR !== 'all') {
          console.log('Selected MR:', selectedMR);
          
          // For regular MRs and Sales Agents, filter by standardized name
          orderQuery = orderQuery.ilike('mr_name', `%${selectedMR}%`);
          visitQuery = visitQuery.ilike('"empName"', `%${selectedMR}%`);
          targetQuery = targetQuery.ilike('mr_name', `%${selectedMR}%`);
          
        } else {
          // Handle team-based filtering
          if (selectedTeam === 'all' && selectedRegion === 'all' && selectedState === 'all') {
            console.log('Showing ALL data without MR filtering');
          } else {
            let allIncludedPersons = [];
            
            if (selectedTeam === 'independent') {
              const independentMRs = medicalReps.filter(rep => 
                rep.role_level === 'MR' && 
                !rep.area_sales_manager_name && 
                !rep.regional_sales_manager_name
              );
              
              let filteredIndependent = [...independentMRs];
              if (selectedRegion !== 'all') {
                filteredIndependent = filteredIndependent.filter(rep => rep.region === selectedRegion);
              }
              if (selectedState !== 'all') {
                filteredIndependent = filteredIndependent.filter(rep => rep.state === selectedState);
              }
              
              allIncludedPersons = filteredIndependent;
              
            } else {
              const { activeReps, inactiveReps } = getFilteredMedicalReps();
              allIncludedPersons = [...activeReps, ...inactiveReps];
              
              if (selectedTeam !== 'all') {
                const selectedTeamData = teams.find(team => standardizeName(team.name) === selectedTeam);
                if (selectedTeamData) {
                  allIncludedPersons.push(selectedTeamData);
                }
              }
            }
            
            if (allIncludedPersons.length === 0) {
              return { orders: [], visits: [], targets: [] };
            }
            
            // Use original names for database queries
            const personNames = allIncludedPersons.map(person => person.original_name || person.name);
            orderQuery = orderQuery.in('mr_name', personNames);
            visitQuery = visitQuery.in('"empName"', personNames);
            targetQuery = targetQuery.in('mr_name', personNames);
          }
        }

        // Apply state filter to orders if needed
        if (selectedState !== 'all') {
          orderQuery = orderQuery.eq('state', selectedState);
        }

        try {
          const [orderData, visitData, targetData] = await Promise.all([
            orderQuery,
            visitQuery,
            targetQuery,
          ]);

          // Standardize names in the results
          const standardizedOrders = (orderData.data || []).map(order => ({
            ...order,
            mr_name_standardized: standardizeName(order.mr_name)
          }));

          const standardizedVisits = (visitData.data || []).map(visit => ({
            ...visit,
            empName_standardized: standardizeName(visit.empName)
          }));

          const standardizedTargets = (targetData.data || []).map(target => ({
            ...target,
            mr_name_standardized: standardizeName(target.mr_name)
          }));

          const results = {
            orders: standardizedOrders,
            visits: standardizedVisits,
            targets: standardizedTargets,
          };

          console.log('Query results:', {
            selectedMR: selectedMR,
            orders: results.orders.length,
            visits: results.visits.length,
            totalRevenue: results.orders.reduce((sum, order) => sum + (order.net_amount || 0), 0)
          });

          return results;

        } catch (error) {
          console.error('Database query error:', error);
          return { orders: [], visits: [], targets: [] };
        }
      };

      const [currentData, previousData, allVisitsData] = await Promise.all([
        fetchDataForRange(currentRange),
        fetchDataForRange(previousRange),
        supabase
          .from('mr_visits')
          .select(`"clientMobileNo", "empName", "dcrDate"`)
          .order('"dcrDate"', { ascending: true })
      ]);

      // Standardize names in all visits data
      const standardizedAllVisits = (allVisitsData.data || []).map(visit => ({
        ...visit,
        empName_standardized: standardizeName(visit.empName)
      }));

      console.log('Final data summary:', {
        currentOrders: currentData.orders.length,
        currentVisits: currentData.visits.length,
        previousOrders: previousData.orders.length,
        previousVisits: previousData.visits.length
      });

      // Process data
      const processedData = processDataWithConversions(
        currentData.orders,
        currentData.visits,
        currentData.targets,
        previousData.orders,
        previousData.visits,
        medicalReps,
        standardizedAllVisits
      );

      setDashboardData(processedData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processDataWithConversions = (
  currentOrders, currentVisits, currentTargets,
  previousOrders, previousVisits,
  mrs, allVisits
) => {
  // Helper function to calculate metrics for a period
  const calculateMetrics = (orders, visits) => {
    // Create a map of visits by date and customer for conversion tracking
    const visitMap = new Map();
    visits.forEach(visit => {
      const dateKey = visit.dcrDate;
      const customerKey = visit.clientMobileNo;
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
        dayVisits.forEach((visit, customerKey) => {
          if (customerKey === order.customer_code || 
              (visit.clientMobileNo && order.customer_code && 
               visit.clientMobileNo === order.customer_code)) {
            convertedVisits.add(visit.visitId);
          }
        });
      }
    });

    const totalRevenue = orders.reduce((sum, order) => sum + (order.net_amount || 0), 0);
    const totalVisits = visits.length;
    const conversionRate = totalVisits > 0 ? ((convertedVisits.size / totalVisits) * 100) : 0;
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
    const billsPending = orders.filter(order => 
      order.status === 'Order Confirmed' && order.delivery_status === null
    ).length;
    const paymentPending = orders.filter(order => order.payment_status === null).length;
    
    const confirmedOrders = orders.filter(order => order.status === 'Order Confirmed');
    const deliveredOrders = orders.filter(order => 
      order.status === 'Order Confirmed' && order.delivery_status === 'Dispatch Confirmed'
    );
    const deliveryRate = confirmedOrders.length > 0 ? 
      ((deliveredOrders.length / confirmedOrders.length) * 100) : 0;

    return {
      totalRevenue,
      totalVisits,
      conversionRate,
      avgOrderValue,
      billsPending,
      paymentPending,
      deliveryRate,
      convertedVisits: convertedVisits.size,
      convertedVisitsSet: convertedVisits
    };
  };

  const currentMetrics = calculateMetrics(currentOrders, currentVisits);
  const previousMetrics = calculateMetrics(previousOrders, previousVisits);

  // Calculate actual change percentages
  const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Create map to track first visits ever for new prospects calculation
  const firstVisitMap = new Map();
  const sortedAllVisits = allVisits.sort((a, b) => new Date(a.dcrDate) - new Date(b.dcrDate));
  
  sortedAllVisits.forEach(visit => {
    const customerKey = visit.clientMobileNo;
    const standardizedName = visit.empName_standardized || standardizeName(visit.empName);
    if (!firstVisitMap.has(customerKey)) {
      firstVisitMap.set(customerKey, {
        mrName: standardizedName,
        firstDate: visit.dcrDate
      });
    }
  });

  // Get unique MRs from current visits
  const activeMRNames = [...new Set(currentVisits.map(v => v.empName_standardized || standardizeName(v.empName)))];
  let activeReps = activeMRNames.length;

  // Handle single MR selection for active count
  if (selectedMR !== 'all') {
    activeReps = activeMRNames.includes(selectedMR) ? 1 : 0;
    console.log(`${selectedMR} is ${activeReps > 0 ? 'active' : 'inactive'} in this period`);
  }
  
  // Calculate target achievement
  const totalTarget = currentTargets.reduce((sum, target) => sum + (target.total_revenue_target || 0), 0);
  const targetAchievement = totalTarget > 0 ? ((currentMetrics.totalRevenue / totalTarget) * 100).toFixed(1) : 0;

  // Calculate NBD vs CRR
  const nbdRevenue = currentOrders
    .filter(order => order.order_type === 'NBD')
    .reduce((sum, order) => sum + (order.net_amount || 0), 0);
  const crrRevenue = currentOrders
    .filter(order => order.order_type === 'CRR')
    .reduce((sum, order) => sum + (order.net_amount || 0), 0);

  // Calculate order fulfillment metrics
  const confirmedOrders = currentOrders.filter(order => order.status === 'Order Confirmed');
  const deliveredOrders = currentOrders.filter(order => 
    order.status === 'Order Confirmed' && order.delivery_status === 'Dispatch Confirmed'
  );
  const paidOrders = currentOrders.filter(order => 
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
  const trends = groupDataByPeriod(currentOrders, currentVisits, currentTargets, selectedPeriod, currentMetrics.convertedVisitsSet);

  // Calculate detailed performer metrics
  const performerMap = {};

  // Handle single MR selection
  if (selectedMR !== 'all') {
    // Find the MR in medicalReps to get their actual role level
    const selectedMRData = medicalReps.find(mr => standardizeName(mr.name) === selectedMR) || 
      unknownMRs.find(mr => standardizeName(mr.name) === selectedMR);

    performerMap[selectedMR] = {
      id: selectedMR,
      name: selectedMR,
      isActive: selectedMRData ? selectedMRData.is_active : true,
      roleLevel: selectedMRData ? selectedMRData.role_level : 'SALES_AGENT',
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
    console.log('Initialized single MR:', selectedMR, 'with role:', performerMap[selectedMR].roleLevel);
  } else {
    // Regular filtering logic
    const { activeReps: filteredActiveReps, inactiveReps: filteredInactiveReps } = getFilteredMedicalReps();
    const allFilteredMRs = [...filteredActiveReps, ...filteredInactiveReps];

    // Include ASM/RSM if team is selected
    if (selectedTeam !== 'all' && selectedTeam !== 'independent') {
      const selectedTeamData = teams.find(team => standardizeName(team.name) === selectedTeam);
      if (selectedTeamData) {
        allFilteredMRs.push({
          ...selectedTeamData,
          is_active: true
        });
      }
    }

    // Initialize known MRs with their actual roles
    allFilteredMRs.forEach(person => {
      const standardizedName = person.name; // Already standardized
      performerMap[standardizedName] = {
        id: standardizedName,
        name: standardizedName,
        isActive: person.is_active,
        roleLevel: person.role_level || 'MR', // Use actual role_level
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

    // Add any unknown MRs from actual data if not already included
    const allOrderMRs = [...new Set(currentOrders.map(order => order.mr_name_standardized || standardizeName(order.mr_name)))].filter(Boolean);
    const allVisitMRs = [...new Set(currentVisits.map(visit => visit.empName_standardized || standardizeName(visit.empName)))].filter(Boolean);
    const allActiveMRNames = [...new Set([...allOrderMRs, ...allVisitMRs])];

    allActiveMRNames.forEach(mrName => {
      if (!performerMap[mrName]) {
        // Check if this MR exists in medicalReps but wasn't filtered
        const existingMR = medicalReps.find(mr => standardizeName(mr.name) === mrName);
        
        performerMap[mrName] = {
          id: mrName,
          name: mrName,
          isActive: existingMR ? existingMR.is_active : true,
          roleLevel: existingMR ? existingMR.role_level : 'SALES_AGENT', // Only mark as SALES_AGENT if truly unknown
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
        console.log('Added MR from data:', mrName, 'with role:', performerMap[mrName].roleLevel);
      }
    });
  }

  console.log('Total performers initialized:', Object.keys(performerMap).length);

  // Group orders by MR
  currentOrders.forEach(order => {
    const mrName = order.mr_name_standardized || standardizeName(order.mr_name);
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
      
      if (order.status === 'Order Confirmed' && order.delivery_status === null) {
        performerMap[mrName].billsPending += 1;
      }
      
      if (order.payment_status === null) {
        performerMap[mrName].paymentPending += 1;
      }
    }
  });

  // Group visits by MR and calculate conversions and new prospects
  currentVisits.forEach(visit => {
    const mrName = visit.empName_standardized || standardizeName(visit.empName);
    const customerKey = visit.clientMobileNo;
    
    if (performerMap[mrName]) {
      performerMap[mrName].visits += 1;
      
      // Use the correct convertedVisits set
      if (currentMetrics.convertedVisitsSet.has(visit.visitId)) {
        performerMap[mrName].convertedVisits += 1;
      }
      
      // Check if this visit is to a new prospect
      const firstVisit = firstVisitMap.get(customerKey);
      if (firstVisit && firstVisit.mrName === mrName) {
        const visitDate = new Date(visit.dcrDate);
        const selectedPeriodStart = new Date(getDateRange().start);
        const selectedPeriodEnd = new Date(getDateRange().end);
        
        if (visitDate >= selectedPeriodStart && visitDate <= selectedPeriodEnd) {
          performerMap[mrName].newProspects += 1;
        }
      }
    }
  });

  const allPerformers = Object.values(performerMap)
    .map(performer => ({
      ...performer,
      conversion: performer.visits > 0 ? 
        ((performer.convertedVisits / performer.visits) * 100).toFixed(1) : '0.0',
      nbdConversion: performer.visits > 0 ? 
        ((performer.nbdOrders / performer.visits) * 100).toFixed(1) : '0.0',
      achievement: 100
    }));

  // Calculate visit metrics
  const plannedVisits = currentTargets.reduce((sum, target) => sum + (target.total_visit_plan || 0), 0);
  const visitMetrics = {
    planned: plannedVisits,
    completed: currentMetrics.totalVisits,
    missed: Math.max(0, plannedVisits - currentMetrics.totalVisits),
    completionRate: plannedVisits > 0 ? ((currentMetrics.totalVisits / plannedVisits) * 100).toFixed(0) : 0
  };

  // Conversion metrics
  const conversionMetrics = {
    totalLeads: currentMetrics.totalVisits,
    converted: currentMetrics.convertedVisits,
    pending: 0,
    lost: currentMetrics.totalVisits - currentMetrics.convertedVisits
  };

  // Revenue metrics
  const revenueMetrics = {
    target: totalTarget,
    achieved: currentMetrics.totalRevenue,
    gap: totalTarget - currentMetrics.totalRevenue,
    growthRate: calculateChange(currentMetrics.totalRevenue, previousMetrics.totalRevenue)
  };

  // Return overview with calculated changes
  const overview = {
    totalRevenue: currentMetrics.totalRevenue,
    totalVisits: currentMetrics.totalVisits,
    conversionRate: currentMetrics.conversionRate.toFixed(1),
    avgOrderValue: currentMetrics.avgOrderValue,
    billsPending: currentMetrics.billsPending,
    paymentPending: currentMetrics.paymentPending,
    deliveryRate: currentMetrics.deliveryRate.toFixed(1),
    activeReps,
    targetAchievement,

    // Calculate actual changes
    totalRevenueChange: calculateChange(currentMetrics.totalRevenue, previousMetrics.totalRevenue),
    totalVisitsChange: calculateChange(currentMetrics.totalVisits, previousMetrics.totalVisits),
    conversionRateChange: calculateChange(currentMetrics.conversionRate, previousMetrics.conversionRate),
    avgOrderValueChange: calculateChange(currentMetrics.avgOrderValue, previousMetrics.avgOrderValue),
    billsPendingChange: calculateChange(currentMetrics.billsPending, previousMetrics.billsPending),
    paymentPendingChange: calculateChange(currentMetrics.paymentPending, previousMetrics.paymentPending),
    deliveryRateChange: calculateChange(currentMetrics.deliveryRate, previousMetrics.deliveryRate),
  };

  return {
    overview,
    trends,
    allPerformers,
    performanceByCategory: [
      { category: 'New Business (NBD)', value: nbdRevenue, percentage: currentMetrics.totalRevenue > 0 ? ((nbdRevenue / currentMetrics.totalRevenue) * 100).toFixed(0) : 0 },
      { category: 'Customer Retention (CRR)', value: crrRevenue, percentage: currentMetrics.totalRevenue > 0 ? ((crrRevenue / currentMetrics.totalRevenue) * 100).toFixed(0) : 0 }
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
    const groupedData = {};

    const getGroupKey = (date) => {
      if (period === 'weekly') {
        return getWeek(date);
      }
      // Default to monthly
      const d = new Date(date);
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    };

    const initializeGroup = (key) => {
      if (!groupedData[key]) {
        groupedData[key] = {
          name: key,
          revenue: 0,
          visits: 0,
          orders: 0,
          nbd: 0,
          crr: 0,
          target: 0,
          converted: 0,
        };
      }
    };

    orders.forEach(order => {
      const groupKey = getGroupKey(order.order_date);
      initializeGroup(groupKey);
      groupedData[groupKey].revenue += order.net_amount || 0;
      groupedData[groupKey].orders += 1;
      if (order.order_type === 'NBD') {
        groupedData[groupKey].nbd += order.net_amount || 0;
      } else {
        groupedData[groupKey].crr += order.net_amount || 0;
      }
    });

    visits.forEach(visit => {
      const groupKey = getGroupKey(visit.dcrDate);
      initializeGroup(groupKey);
      groupedData[groupKey].visits += 1;
      if (convertedVisits.has(visit.visitId)) {
        groupedData[groupKey].converted += 1;
      }
    });

    targets.forEach(target => {
      const groupKey = getGroupKey(target.target_date);
      initializeGroup(groupKey);
      groupedData[groupKey].target += target.total_revenue_target || 0;
    });

    Object.values(groupedData).forEach(data => {
      data.conversion = data.visits > 0 ? ((data.converted / data.visits) * 100).toFixed(0) : 0;
    });

    const sortedData = Object.values(groupedData).sort((a, b) => a.name.localeCompare(b.name));

    return {
      [period]: sortedData,
    };
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

  const getWeek = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
  };

  const formatXAxis = (tickItem) => {
    if (tickItem.includes('-W')) {
      return tickItem;
    }
    const [year, month] = tickItem.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
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

  const getUnknownMRsFromSalesData = async () => {
    try {
      const currentRange = getDateRange();
      
      // Get all unique MR names from orders in current period
      const { data: orderMRs } = await supabase
        .from('orders')
        .select('mr_name')
        .gte('order_date', currentRange.start)
        .lte('order_date', currentRange.end)
        .in('customer_type', ['Doctor', 'Retailer'])
        .eq('status', 'Order Confirmed')
        .not('mr_name', 'is', null);

      // Get all unique MR names from visits in current period  
      const { data: visitMRs } = await supabase
        .from('mr_visits')
        .select('"empName"')
        .gte('"dcrDate"', currentRange.start)
        .lte('"dcrDate"', currentRange.end)
        .not('"empName"', 'is', null);

      // Standardize and combine names
      const allActiveNames = [
        ...new Set([
          ...(orderMRs?.map(o => standardizeName(o.mr_name)) || []),
          ...(visitMRs?.map(v => standardizeName(v.empName)) || [])
        ])
      ].filter(Boolean);

      // Get known MR names from medical_representatives (already standardized)
      const knownMRNames = medicalReps.map(mr => mr.name);

      // Find unknown MRs (in sales data but not in medical_representatives)
      const unknownMRNames = allActiveNames.filter(name => !knownMRNames.includes(name));

      console.log('Unknown MRs found:', unknownMRNames);

      return unknownMRNames.map(name => ({
        name: name,
        role_level: 'SALES_AGENT',
        is_active: true,
        region: 'Unknown',
        state: 'Unknown',
        area_sales_manager_name: null,
        regional_sales_manager_name: null
      }));

    } catch (error) {
      console.error('Error fetching unknown MRs:', error);
      return [];
    }
  };

  // Add these definitions before the return statement, around line 960 (after the getUnknownMRsFromSalesData function):

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
    
    // Separate known and unknown MRs
    const knownActiveReps = activeReps.filter(rep => rep.role_level === 'MR');
    const knownInactiveReps = inactiveReps.filter(rep => rep.role_level === 'MR');
    const salesAgents = activeReps.filter(rep => rep.role_level === 'SALES_AGENT');
    
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Team Member 
          <span className="text-xs text-gray-500 ml-1">
            ({activeReps.length + inactiveReps.length} available)
          </span>
          {selectedTeam === 'independent' && (
            <span className="text-xs text-blue-600 ml-1">[Independent Only]</span>
          )}
        </label>
        <select
          value={selectedMR}
          onChange={(e) => setSelectedMR(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Representatives</option>
          
          {/* Active Known MRs */}
          {knownActiveReps.length > 0 && (
            <optgroup label={`🟢 Active Medical Reps (${knownActiveReps.length})`}>
              {knownActiveReps.map(rep => (
                <option key={rep.name} value={rep.name}>
                  {rep.name}
                </option>
              ))}
            </optgroup>
          )}
          
          {/* Sales Agents (Unknown MRs) */}
          {salesAgents.length > 0 && (
            <optgroup label={`🔶 Sales Agents (${salesAgents.length})`}>
              {salesAgents.map(rep => (
                <option key={rep.name} value={rep.name}>
                  {rep.name} (Sales Agent)
                </option>
              ))}
            </optgroup>
          )}
          
          {/* Inactive Known MRs */}
          {knownInactiveReps.length > 0 && (
            <optgroup label={`🔴 Inactive Medical Reps (${knownInactiveReps.length})`}>
              {knownInactiveReps.map(rep => (
                <option key={rep.name} value={rep.name}>
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
          {selectedTeam !== 'all' && selectedTeam !== 'independent' && (
            <span className="mr-2">👥 {teams.find(t => standardizeName(t.name) === selectedTeam)?.name}</span>
          )}
          {selectedTeam === 'independent' && <span className="mr-2">🔸 Independent</span>}
          {selectedState !== 'all' && <span className="mr-2">🏛️ {selectedState}</span>}
          {selectedMR !== 'all' && <span className="mr-2">👤 {selectedMR}</span>}
          {salesAgents.length > 0 && selectedMR === 'all' && <span className="mr-2">🔶 {salesAgents.length} Sales Agents</span>}
        </div>
      </div>
    );
  };

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
                  onClick={() => setSelectedMR(rep.name)}
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
                      <div className="text-sm font-medium text-gray-900 truncate flex items-center">
                        {rep.roleLevel === 'RSM' && <span className="mr-1 text-xs bg-purple-100 text-purple-800 px-1 rounded">RSM</span>}
                        {rep.roleLevel === 'ASM' && <span className="mr-1 text-xs bg-blue-100 text-blue-800 px-1 rounded">ASM</span>}
                        {rep.roleLevel === 'MR' && <span className="mr-1 text-xs bg-green-100 text-green-800 px-1 rounded">MR</span>}
                        {rep.roleLevel === 'SALES_AGENT' && <span className="mr-1 text-xs bg-orange-100 text-orange-800 px-1 rounded">AGENT</span>}
                        {rep.name}
                        {!rep.isActive && <span className="ml-1 text-xs text-red-500">(Inactive)</span>}
                      </div>
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
                          style={{ width: `${Math.min(parseFloat(rep.conversion), 100)}%` }}
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
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
            
            {/* Team Filter - Using name as value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team (ASM/RSM)</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Teams</option>
                
                {/* Regular Teams */}
                {teams.map(team => {
                  const mrCount = team.role_level === 'RSM' 
                    ? medicalReps.filter(mr => 
                        mr.role_level === 'MR' && (
                          standardizeName(mr.regional_sales_manager_name) === team.name ||
                          (mr.area_sales_manager_name && 
                           medicalReps.some(asm => 
                             asm.role_level === 'ASM' && 
                             standardizeName(asm.name) === standardizeName(mr.area_sales_manager_name) && 
                             standardizeName(asm.regional_sales_manager_name) === team.name
                           ))
                        )
                      ).length
                    : medicalReps.filter(mr => 
                        mr.role_level === 'MR' && standardizeName(mr.area_sales_manager_name) === team.name
                      ).length;
                  
                  return (
                    <option key={team.name} value={team.name}>
                      {team.role_level === 'RSM' ? '🏢' : '👥'} {team.name} ({team.role_level}) - {team.region} [{mrCount} MRs]
                    </option>
                  );
                })}
                
                {/* Independent Employees Option */}
                <option value="independent">
                  🔸 Independent Employees [{medicalReps.filter(rep => 
                    rep.role_level === 'MR' && 
                    !rep.area_sales_manager_name && 
                    !rep.regional_sales_manager_name
                  ).length} MRs]
                </option>
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
      
      {/* Second Row */}
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6 min-w-0 overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 truncate">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300} minWidth={0}>
            <AreaChart data={dashboardData.trends[selectedPeriod]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tickFormatter={formatXAxis} />
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
            <LineChart data={dashboardData.trends[selectedPeriod]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tickFormatter={formatXAxis} />
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
            <BarChart data={dashboardData.trends[selectedPeriod]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tickFormatter={formatXAxis} />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="nbd" stackId="a" fill="#0088FE" name="New Business" />
              <Bar dataKey="crr" stackId="a" fill="#00C49F" name="Repeat Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Order Fulfillment Chart */}
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
              <span className="text-sm text-gray-600 truncate pr-2">Conversion Growth</span>
              <span className={`text-sm font-medium ${dashboardData.overview.conversionRateChange > 0 ? 'text-green-600' : 'text-red-600'} text-right flex-shrink-0`}>
                {dashboardData.overview.conversionRateChange > 0 ? '+' : ''}{parseFloat(dashboardData.overview.conversionRateChange).toFixed(1)}%
              </span>
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
