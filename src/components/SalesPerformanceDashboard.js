import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Calendar, TrendingUp, Users, Target, DollarSign, Activity, Award, AlertCircle, ChevronDown, Filter, Download, RefreshCw, User, MapPin, Phone, ShoppingCart, CheckCircle, Clock, XCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

let globalAddLog = () => {};

 

// Add these imports after your existing imports
const CACHE_KEY = 'sales_dashboard_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds


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

// Add the cache service class before your main component
class DataCacheService {
  constructor() {
    this.cache = this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          console.log('✅ Loading data from cache');
          return parsed;
        } else {
          console.log('⏰ Cache expired, will fetch fresh data');
          localStorage.removeItem(CACHE_KEY); // Clean up expired cache
        }
      }
    } catch (error) {
      console.error('Error loading cache:', error);
      localStorage.removeItem(CACHE_KEY); // Clean up corrupted cache
    }
    return null;
  }

  saveToStorage(data) {
    try {
      // Compress data by removing unnecessary fields
      const compressedData = {
        orders: data.orders.map(order => ({
          order_id: order.order_id,
          order_date: order.order_date,
          net_amount: order.net_amount,
          order_type: order.order_type,
          mr_name_standardized: order.mr_name_standardized,
          customer_code: order.customer_code,
          state: order.state,
          status: order.status,
          delivery_status: order.delivery_status,
          payment_status: order.payment_status
        })),
        visits: data.visits.map(visit => ({
          visitId: visit.visitId,
          dcrDate: visit.dcrDate,
          empName_standardized: visit.empName_standardized,
          clientMobileNo: visit.clientMobileNo
        })),
        targets: data.targets.map(target => ({
          target_date: target.target_date,
          mr_name_standardized: target.mr_name_standardized,
          total_revenue_target: target.total_revenue_target,
          total_visit_plan: target.total_visit_plan
        })),
        allVisits: data.allVisits.map(visit => ({
          visitId: visit.visitId,
          dcrDate: visit.dcrDate,
          empName_standardized: visit.empName_standardized,
          clientMobileNo: visit.clientMobileNo
        })),
        dateRange: data.dateRange
      };

      const cacheData = {
        data: compressedData,
        timestamp: Date.now()
      };
      
      const jsonString = JSON.stringify(cacheData);
      
      // Check if data is too large (5MB limit for localStorage)
      if (jsonString.length > 5 * 1024 * 1024) {
        console.warn('⚠️ Cache data too large, skipping localStorage cache');
        this.cache = { data: compressedData, timestamp: Date.now() };
        return;
      }
      
      localStorage.setItem(CACHE_KEY, jsonString);
      console.log('💾 Data saved to cache', `${(jsonString.length / 1024 / 1024).toFixed(2)}MB`);
      globalAddLog(`✓ Data cached successfully (${(jsonString.length / 1024 / 1024).toFixed(2)}MB)`, 'success');
      this.cache = { data: compressedData, timestamp: Date.now() };
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage quota exceeded, clearing cache and using memory only');
        localStorage.removeItem(CACHE_KEY);
        // Keep data in memory cache only
        this.cache = { data: data, timestamp: Date.now() };
      } else {
        console.error('Error saving cache:', error);
      }
    }
  }

  async loadHistoricalData(currentYear = new Date().getFullYear()) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
 
      // 🔧 CHECK: Is cache valid for today's date?
  if (this.cache && this.cache.data) {
    const cacheDate = this.cache.data.dateRange?.end;
    const cacheAge = Date.now() - this.cache.timestamp;
    const oneHour = 60 * 60 * 1000;
    
    console.log(`📋 Cache info: cacheDate=${cacheDate}, today=${today}, age=${Math.round(cacheAge/1000/60)}min`);
    
    // 🔧 CRITICAL FIX: Cache is valid ONLY if it includes today's date AND is recent
    if (cacheDate >= today && cacheAge < oneHour) {
      console.log(`✅ Using cached data (valid for today: ${today})`);
      return this.cache.data;
    } else {
      console.log(`❌ Cache outdated - cacheDate: ${cacheDate}, today: ${today}, age: ${Math.round(cacheAge/1000/60)}min`);
      // Clear outdated cache
      this.cache = null;
      localStorage.removeItem(CACHE_KEY);
    }
  }

  console.log('📊 Loading fresh historical data including today...');
  // Add logging for cache service if addLog is available
globalAddLog('Cache miss - fetching fresh data from database...', 'info');

   const startDate = `${currentYear}-04-01`;
  const endDate = today; // Always use today's date
  

  try {
    // Helper function to fetch all data with pagination
    const fetchAllData = async (tableName, selectFields, dateField, additionalFilters = null) => {
      let allData = [];
      let from = 0;
      const batchSize = 10000;
      let hasMore = true;

      console.log(`📥 Loading all data from ${tableName}...`);
     globalAddLog(`Loading ${tableName} data...`, 'info');
      while (hasMore) {
        let query = supabase
          .from(tableName)
          .select(selectFields)
          .gte(dateField, startDate)
          .lte(dateField, endDate)
          .range(from, from + batchSize - 1)
          .order(dateField, { ascending: true });

        // Apply additional filters if provided
        if (additionalFilters) {
          if (tableName === 'orders') {
            query = query
              .in('customer_type', ['Doctor', 'Retailer'])
              .eq('status', 'Order Confirmed')
              .or('delivery_status.eq.Dispatch Confirmed,delivery_status.is.null');
          }
        }

        const { data, error } = await query;
        
        if (error) {
          console.error(`Error fetching ${tableName}:`, error);
          break;
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          console.log(`📥 Loaded ${allData.length} rows from ${tableName}...`);
          
          // If we got less than batchSize, we've reached the end
          if (data.length < batchSize) {
            hasMore = false;
          } else {
            from += batchSize;
          }
        } else {
          hasMore = false;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ Finished loading ${allData.length} rows from ${tableName}`);
      console.log(`✅ Finished loading ${allData.length} rows from ${tableName}`);
globalAddLog(`✓ Loaded ${allData.length} rows from ${tableName}`, 'success');
      return allData;
    };

    // Load all data with pagination
    console.log('📊 Starting parallel data loading...');
   globalAddLog('Loading orders, visits, and targets in parallel...', 'info');

    const [orderData, visitData, targetData, allVisitsData] = await Promise.all([
      // Orders
      fetchAllData(
        'orders',
        'order_id, order_date, net_amount, order_type, mr_name, customer_code, state, status, delivery_status, payment_status',
        'order_date',
        true // Apply additional filters
      ),

      // Visits
      fetchAllData(
        'mr_visits',
        '"visitId", "dcrDate", "empName", "clientMobileNo"',
        '"dcrDate"'
      ),

      // Targets
      fetchAllData(
        'mr_weekly_targets',
        'target_date, mr_name, total_revenue_target, total_visit_plan',
        'target_date'
      ),

      // All visits for conversion tracking (same as visits in this case)
      fetchAllData(
        'mr_visits',
        '"visitId", "dcrDate", "empName", "clientMobileNo"',
        '"dcrDate"'
      )
    ]);

    console.log('📊 Processing and standardizing data...');

   globalAddLog('Processing and standardizing data...', 'info');

    const data = {
      orders: orderData.map(order => ({
        ...order,
        mr_name_standardized: standardizeName(order.mr_name)
      })),
      visits: visitData.map(visit => ({
        ...visit,
        empName_standardized: standardizeName(visit.empName)
      })),
      targets: targetData.map(target => ({
        ...target,
        mr_name_standardized: standardizeName(target.mr_name)
      })),
      allVisits: allVisitsData.map(visit => ({
        ...visit,
        empName_standardized: standardizeName(visit.empName)
      })),
      dateRange: { start: startDate, end: endDate } // ✅ Store actual date range used
    };
    // Save to cache
    this.saveToStorage(data);

 console.log('📈 Fresh historical data loaded successfully:', {
      orders: data.orders.length,
      visits: data.visits.length,
      targets: data.targets.length,
      totalRevenue: data.orders.reduce((sum, order) => sum + (order.net_amount || 0), 0),
      dateRange: `${startDate} to ${endDate}`
    });


    return data;
  } catch (error) {
    console.error('Error loading historical data:', error);
    return { orders: [], visits: [], targets: [], allVisits: [] };
  }
}


  // 🔧 FIXED: filterDataByDateRange function with consistent date parsing
filterDataByDateRange(data, startDate, endDate) {
  // 🔧 CRITICAL FIX: Parse start/end dates at noon to match chart boundaries
  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');

  return {
    orders: data.orders.filter(order => {
      // 🔧 CRITICAL FIX: Parse order date at noon to match chart logic
      const orderDate = new Date(order.order_date + 'T12:00:00');
      return orderDate >= start && orderDate <= end;
    }),
    visits: data.visits.filter(visit => {
      // 🔧 CRITICAL FIX: Parse visit date at noon to match chart logic
      const visitDate = new Date(visit.dcrDate + 'T12:00:00');
      return visitDate >= start && visitDate <= end;
    }),
    targets: data.targets.filter(target => {
      // 🔧 CRITICAL FIX: Parse target date at noon to match chart logic
      const targetDate = new Date(target.target_date + 'T12:00:00');
      return targetDate >= start && targetDate <= end;
    }),
    allVisits: data.allVisits
  };
}

  filterDataByFilters(data, filters) {
  const { selectedMR, selectedTeam, selectedRegion, selectedState, medicalReps, teams } = filters;
  
  let filteredData = { 
    orders: [...data.orders],
    visits: [...data.visits], 
    targets: [...data.targets],
    allVisits: [...data.allVisits]
  };

  // Apply MR filter first
  if (selectedMR !== 'all') {
    console.log('🔍 Filtering by MR:', selectedMR);
    filteredData.orders = filteredData.orders.filter(order => 
      order.mr_name_standardized === selectedMR
    );
    filteredData.visits = filteredData.visits.filter(visit => 
      visit.empName_standardized === selectedMR
    );
    filteredData.targets = filteredData.targets.filter(target => 
      target.mr_name_standardized === selectedMR
    );
    
    
    return filteredData;
  }

  // If no specific MR selected, check if other filters are applied
  if (selectedTeam === 'all' && selectedRegion === 'all' && selectedState === 'all') {
    // NO FILTERING - return all data
    console.log('🔍 No filters applied, returning all data');
    return filteredData;
  }

  // Apply team/region/state filters only if they are selected
  let includedPersons = [];

  // Apply team filter
  if (selectedTeam !== 'all') {
    console.log('🔍 Filtering by team:', selectedTeam);
    
    if (selectedTeam === 'independent') {
      includedPersons = medicalReps.filter(rep => 
        rep.role_level === 'MR' && 
        !rep.area_sales_manager_name && 
        !rep.regional_sales_manager_name
      );
    } else {
      const selectedTeamData = teams.find(team => standardizeName(team.name) === selectedTeam);
      if (selectedTeamData) {
        console.log('🔍 Found team data:', selectedTeamData);
        
        if (selectedTeamData.role_level === 'RSM') {
          const rsmName = standardizeName(selectedTeamData.name);
          const asmUnderRSM = medicalReps.filter(rep => 
            rep.role_level === 'ASM' && standardizeName(rep.regional_sales_manager_name || '') === rsmName
          );
          const asmNames = asmUnderRSM.map(asm => standardizeName(asm.name));
          
          includedPersons = medicalReps.filter(rep => 
            rep.role_level === 'MR' && (
              standardizeName(rep.regional_sales_manager_name || '') === rsmName ||
              asmNames.includes(standardizeName(rep.area_sales_manager_name || ''))
            )
          );
        } else if (selectedTeamData.role_level === 'ASM') {
          const asmName = standardizeName(selectedTeamData.name);
          includedPersons = medicalReps.filter(rep => 
            rep.role_level === 'MR' && standardizeName(rep.area_sales_manager_name || '') === asmName
          );
        }
      }
    }
  } else {
    // Include all MRs if no team filter
    includedPersons = medicalReps.filter(rep => rep.role_level === 'MR');
  }

  // Apply region filter
  if (selectedRegion !== 'all') {
    console.log('🔍 Filtering by region:', selectedRegion);
    includedPersons = includedPersons.filter(rep => rep.region === selectedRegion);
  }

  // Apply state filter
  if (selectedState !== 'all') {
    console.log('🔍 Filtering by state:', selectedState);
    includedPersons = includedPersons.filter(rep => rep.state === selectedState);
  }

  console.log('🔍 Final included persons:', includedPersons.length);

  if (includedPersons.length > 0) {
    const personNames = includedPersons.map(person => person.name);
    console.log('🔍 Person names to filter by:', personNames);
    
    filteredData.orders = filteredData.orders.filter(order => 
      personNames.includes(order.mr_name_standardized)
    );
    filteredData.visits = filteredData.visits.filter(visit => 
      personNames.includes(visit.empName_standardized)
    );
    filteredData.targets = filteredData.targets.filter(target => 
      personNames.includes(target.mr_name_standardized)
    );
  } else {
    // If no persons match the filters, return empty data
   
    filteredData.orders = [];
    filteredData.visits = [];
    filteredData.targets = [];
  }

  // Apply state filter to orders (additional filter for order state)
  if (selectedState !== 'all') {
    filteredData.orders = filteredData.orders.filter(order => order.state === selectedState);
  }


  return filteredData;
}

  clearCache() {
    localStorage.removeItem(CACHE_KEY);
    this.cache = null;
    console.log('🗑️ Cache cleared');
  }
}

// Create the cache service instance
const dataCacheService = new DataCacheService();


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
  const [customDateRange, setCustomDateRange] = useState({ start: '2025-01-01', end: '2025-12-31' });
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [states, setStates] = useState([]);
  const [regions, setRegions] = useState([]); 
  const [medicalReps, setMedicalReps] = useState([]);
  const [unknownMRs, setUnknownMRs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState([]);

  // New state variables for enhanced functionality
  const [sortConfig, setSortConfig] = useState({ key: 'revenue', direction: 'desc' });
  const [visiblePerformers, setVisiblePerformers] = useState(10);

   const addLog = (message, type = 'info') => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  setLoadingLogs(prev => [...prev, { 
    id: Date.now() + Math.random(),
    timestamp, 
    message, 
    type 
  }]);
};
// Set the global reference
globalAddLog = addLog;

const LoadingTerminal = () => {
  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [loadingLogs]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales Performance Dashboard</h1>
            <p className="text-gray-600 mt-1">Loading system components...</p>
          </div>
        </div>
      </div>

      {/* Terminal Container */}
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl mx-auto overflow-hidden border border-gray-700">
        {/* Terminal Header */}
        <div className="bg-gray-800 px-4 py-3 flex items-center border-b border-gray-700">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="flex-1 text-center text-gray-300 text-sm font-mono">
            Sales Dashboard Terminal - Loading Components
          </div>
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 text-green-400 animate-spin" />
            <span className="text-xs text-gray-400">Processing...</span>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="bg-black p-6 font-mono text-sm h-96 overflow-y-auto">
          <div className="text-green-400 mb-2 flex items-center">
            <span className="mr-2">🚀</span>
            Sales Performance Dashboard v2.0
          </div>
          <div className="text-gray-400 mb-4">
            Initializing system components and loading data...
          </div>

          {/* Loading Logs */}
          <div className="space-y-1">
            {loadingLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-2 py-0.5">
                <span className="text-gray-500 text-xs min-w-[70px]">
                  [{log.timestamp}]
                </span>
                <span className={`text-xs flex-1 ${
                  log.type === 'success' ? 'text-green-400' : 
                  log.type === 'error' ? 'text-red-400' : 
                  'text-gray-300'
                }`}>
                  {log.type === 'success' && '✓ '}
                  {log.type === 'error' && '✗ '}
                  {log.type === 'info' && '▶ '}
                  {log.message}
                </span>
              </div>
            ))}
          </div>

          {/* Animated Cursor */}
          <div className="flex items-center mt-4">
            <span className="text-green-400">dashboard$ </span>
            <div className="w-2 h-4 bg-green-400 ml-1 animate-pulse"></div>
          </div>

          <div ref={logsEndRef} />
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-800 px-6 py-4 border-t border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm font-mono">Loading Progress</span>
            <span className="text-green-400 text-xs">
              {loadingLogs.filter(log => log.type === 'success').length} / {loadingLogs.length} tasks completed
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: `${loadingLogs.length > 0 ? (loadingLogs.filter(log => log.type === 'success').length / loadingLogs.length) * 100 : 0}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* Loading Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Data Loading</p>
              <p className="text-xs text-gray-600">Fetching from database...</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Team Data</p>
              <p className="text-xs text-gray-600">Processing representatives...</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg mr-3">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Analytics</p>
              <p className="text-xs text-gray-600">Calculating metrics...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

  // Helper function to get date range based on selected period
  // 🔧 FIXED: getDateRange function with correct monthly end date calculation
  const dateRange = useMemo(() => {
    if (selectedPeriod === 'custom') {
      return customDateRange;
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
        // 🔧 CRITICAL FIX: Calculate last day of the month correctly
        end = new Date(parseInt(monthYear), parseInt(monthNum), 0);

        console.log('🔧 Monthly date calculation DEBUG:', {
          selectedMonth,
          monthYear: parseInt(monthYear),
          monthNum: parseInt(monthNum),
          startCalc: `new Date(${parseInt(monthYear)}, ${parseInt(monthNum) - 1}, 1)`,
          endCalc: `new Date(${parseInt(monthYear)}, ${parseInt(monthNum)}, 0)`,
          actualStart: start.toISOString(),
          actualEnd: end.toISOString(),
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0]
        });
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

    const result = {
      start: start.getFullYear() + '-' +
             String(start.getMonth() + 1).padStart(2, '0') + '-' +
             String(start.getDate()).padStart(2, '0'),
      end: end.getFullYear() + '-' +
           String(end.getMonth() + 1).padStart(2, '0') + '-' +
           String(end.getDate()).padStart(2, '0')
    };

    console.log('📅 getDateRange result (using local dates):', result);
    return result;
  }, [selectedPeriod, selectedMonth, selectedWeek, selectedQuarter, selectedYear, customDateRange]);

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
  const initializeData = async () => {
    setLoading(true);
    setLoadingLogs([]);
    addLog('System initialization started...', 'info');
    await fetchFilterData();
  };
  initializeData();
}, []);

  // Fetch dashboard data when filters change
 // Make sure this useEffect includes ALL filter dependencies
useEffect(() => {
  if (medicalReps.length > 0) {
    // Refetch unknown MRs when period changes (they might be different)
    getUnknownMRsFromSalesData().then(setUnknownMRs);
    fetchDashboardData();
  }
}, [
  selectedPeriod, selectedMonth, selectedWeek, selectedQuarter, selectedYear, 
  selectedRegion, selectedTeam, selectedState, selectedMR, dateRange, 
  medicalReps // Make sure all filter dependencies are here
]);

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
    addLog('Starting filter data initialization...', 'info');
    
    addLog('Loading team data (ASM/RSM)...', 'info');
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
    addLog(`✓ Loaded ${standardizedTeams.length} teams`, 'success');

    addLog('Loading states and regions...', 'info');
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
    addLog(`✓ Loaded ${uniqueStates.length} states, ${uniqueRegions.length} regions`, 'success');

    addLog('Loading medical representatives...', 'info');
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
    addLog(`✓ Loaded ${standardizedMRData.length} medical representatives`, 'success');

    addLog('Identifying unknown sales agents...', 'info');
    // Fetch unknown MRs
    const unknownMRData = await getUnknownMRsFromSalesData();
    addLog(`✓ Found ${unknownMRData.length} unknown sales agents`, 'success');
    
    addLog('Filter data initialization complete!', 'success');

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
    addLog(`✗ Error loading filter data: ${error.message}`, 'error');
    console.error('Error fetching filter data:', error);
  }
};

 // 🔍 COMPLETE fetchDashboardData with comprehensive debugging
const fetchDashboardData = async () => {
  setLoading(true);
  setLoadingLogs([]); // Clear previous logs
  try {
    addLog('Starting dashboard data fetch...', 'info');
    
    addLog('Loading historical data from cache/database...', 'info');
    // Load historical data (cached for 1 hour)
    const historicalData = await dataCacheService.loadHistoricalData();
    addLog(`✓ Historical data loaded: ${historicalData.orders?.length || 0} orders, ${historicalData.visits?.length || 0} visits`, 'success');

    // Get current and previous date ranges
    const currentRange = dateRange;
    const previousRange = getPreviousDateRange(currentRange);
    addLog(`Date range: ${currentRange.start} to ${currentRange.end}`, 'info');
    
    addLog('Filtering data for current period...', 'info');
    // Filter data for current period (KPI cards use this)
    const currentData = dataCacheService.filterDataByDateRange(
      historicalData, 
      currentRange.start, 
      currentRange.end
    );
    
    addLog('Filtering data for previous period comparison...', 'info');
    // Filter data for previous period
    const previousData = dataCacheService.filterDataByDateRange(
      historicalData, 
      previousRange.start, 
      previousRange.end
    );
    
    addLog('Applying user filters (MR, team, region, state)...', 'info');
    // Apply filters (MR, team, region, state) to current data
    const filteredCurrentData = dataCacheService.filterDataByFilters(currentData, {
      selectedMR,
      selectedTeam,
      selectedRegion,
      selectedState,
      medicalReps,
      teams
    });
    
    // Apply filters to previous data
    const filteredPreviousData = dataCacheService.filterDataByFilters(previousData, {
      selectedMR,
      selectedTeam,
      selectedRegion,
      selectedState,
      medicalReps,
      teams
    });
    addLog(`✓ Filtered data: ${filteredCurrentData.orders?.length || 0} current orders, ${filteredPreviousData.orders?.length || 0} previous orders`, 'success');

    addLog('Processing performance metrics and calculations...', 'info');
    // Process data with enhanced function
    const processedData = processDataWithConversions(
      filteredCurrentData.orders,
      filteredCurrentData.visits,
      filteredCurrentData.targets,
      filteredPreviousData.orders,
      filteredPreviousData.visits,
      medicalReps,
      historicalData.allVisits,
      historicalData
    );
    
    addLog('✓ Dashboard data processing complete!', 'success');
    console.log('✅ Final processed data:', {
      overviewRevenue: processedData.overview.totalRevenue,
      trendsData: processedData.trends,
      trendsJulyRevenue: processedData.trends?.find(t => t.key === 'Jul')?.revenue || 'Not found'
    });
    
    // Add a small delay to show the completion message
    setTimeout(() => {
      setDashboardData(processedData);
    }, 500);
    
  } catch (error) {
    addLog(`✗ Error fetching dashboard data: ${error.message}`, 'error');
    console.error('Error fetching dashboard data:', error);
  } finally {
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }
};

  const processDataWithConversions = (
  currentOrders, currentVisits, currentTargets,
  previousOrders, previousVisits,
  mrs, allVisits, historicalData
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
    const conversionRate = totalVisits > 0 ? Math.round(((convertedVisits.size / totalVisits) * 100),1) : 0;
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
  const trends = groupDataByPeriod(
  currentOrders,   // Use current filtered orders for now
  currentVisits,   // Use current filtered visits for now
  currentTargets,  // Use current filtered targets for now
  selectedPeriod, 
  currentMetrics.convertedVisitsSet,
  selectedMonth,
  selectedWeek, 
  selectedQuarter,
  selectedYear,
  historicalData   // Pass historical data as parameter
);

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
      }
    });
  }


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
        const selectedPeriodStart = new Date(dateRange.start);
        const selectedPeriodEnd = new Date(dateRange.end);
        
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

// Fixed groupDataByPeriod function - ensures data consistency between KPI cards and charts
const groupDataByPeriod = (orders, visits, targets, period, convertedVisits, selectedMonth, selectedWeek, selectedQuarter, selectedYear, historicalData) => {
 
  
  // 🔄 CRITICAL FIX: For trends, we need ALL historical data filtered by user filters ONLY
  // Don't apply date range filter here - let each period function handle its own date ranges
  const filteredHistoricalData = dataCacheService.filterDataByFilters(historicalData, {
    selectedMR,
    selectedTeam,
    selectedRegion,
    selectedState,
    medicalReps,
    teams
  });
  
  

  switch (period) {
    case 'monthly':
      return generateMonthlyHistoricalData(selectedMonth, filteredHistoricalData);
    case 'weekly':
      return generateWeeklyHistoricalData(selectedWeek, filteredHistoricalData);
    case 'quarterly':
      return generateQuarterlyHistoricalData(selectedQuarter, filteredHistoricalData);
    case 'yearly':
      return generateYearlyHistoricalData(selectedYear, filteredHistoricalData);
    default:
      return generateMonthlyHistoricalData(selectedMonth, filteredHistoricalData);
  }
};

// Updated generateMonthlyHistoricalData with comprehensive debugging
const generateMonthlyHistoricalData = (selectedMonth, filteredHistoricalData) => {
  const [year, month] = selectedMonth.split('-');
  const selectedMonthNum = parseInt(month);
  const data = [];
  
  
  
  // Start from April (month 4) to selected month
  for (let i = 4; i <= selectedMonthNum; i++) {
    // 🔧 TIMEZONE FIX: Create dates at noon to avoid UTC conversion issues
    const monthStart = new Date(parseInt(year), i - 1, 1, 12, 0, 0);  // First day of month at noon
    const monthEnd = new Date(parseInt(year), i, 0, 12, 0, 0);        // Last day of month at noon
    const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' });
    
    // Filter by date range only (same logic as KPI cards)
    const monthOrders = filteredHistoricalData.orders.filter(order => {
      // 🔧 CRITICAL FIX: Parse order date correctly for comparison
      const orderDate = new Date(order.order_date + 'T12:00:00'); // Add noon time to match boundaries
      const inRange = orderDate >= monthStart && orderDate <= monthEnd;
      
      
      return inRange;
    });
    
    const monthVisits = filteredHistoricalData.visits.filter(visit => {
      // 🔧 CRITICAL FIX: Parse visit date correctly for comparison
      const visitDate = new Date(visit.dcrDate + 'T12:00:00'); // Add noon time to match boundaries
      return visitDate >= monthStart && visitDate <= monthEnd;
    });
    
    const monthTargets = filteredHistoricalData.targets.filter(target => {
      // 🔧 CRITICAL FIX: Parse target date correctly for comparison
      const targetDate = new Date(target.target_date + 'T12:00:00'); // Add noon time to match boundaries
      return targetDate >= monthStart && targetDate <= monthEnd;
    });
    
    // Calculate metrics (same logic as KPI cards)
    const revenue = monthOrders.reduce((sum, order) => sum + (order.net_amount || 0), 0);
    const target = monthTargets.reduce((sum, target) => sum + (target.total_revenue_target || 0), 0);
    const visitCount = monthVisits.length;
    
    // Calculate converted visits for this month (same logic as KPI cards)
    const monthConvertedVisits = new Set();
    monthOrders.forEach(order => {
      const orderDate = order.order_date;
      monthVisits.forEach(visit => {
        if (visit.dcrDate === orderDate && 
            (visit.clientMobileNo === order.customer_code || 
             visit.clientMobileNo === order.customer_code)) {
          monthConvertedVisits.add(visit.visitId);
        }
      });
    });
    
    const convertedCount = monthConvertedVisits.size;
    const nbdRevenue = monthOrders.filter(order => order.order_type === 'NBD').reduce((sum, order) => sum + (order.net_amount || 0), 0);
    const crrRevenue = monthOrders.filter(order => order.order_type === 'CRR').reduce((sum, order) => sum + (order.net_amount || 0), 0);
    
    
    data.push({
      key: monthName,
      month: monthName,
      revenue,
      target,
      visits: visitCount,
      conversion: visitCount > 0 ? 
        Math.round(((convertedCount / visitCount) * 100), 1) : 0,
      nbd: nbdRevenue,
      crr: crrRevenue,
      converted: convertedCount,
      orders: monthOrders.length,
      isCurrent: i === selectedMonthNum
    });
  }
  
  return data;
};

const generateWeeklyHistoricalData = (selectedWeek, filteredHistoricalData) => {
  const [year, weekStr] = selectedWeek.split('-W');
  const weekNum = parseInt(weekStr);
  const data = [];
  
  console.log('📈 Generating weekly trends for:', selectedWeek);
  
  // Generate previous 5 weeks + selected week
  for (let i = -5; i <= 0; i++) {
    const currentWeekNum = weekNum + i;
    const weekStart = getWeekStartDate(parseInt(year), currentWeekNum);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    // Filter by date range only (same logic as KPI cards)
    const weekOrders = filteredHistoricalData.orders.filter(order => {
      const orderDate = new Date(order.order_date);
      return orderDate >= weekStart && orderDate <= weekEnd;
    });
    
    const weekVisits = filteredHistoricalData.visits.filter(visit => {
      const visitDate = new Date(visit.dcrDate);
      return visitDate >= weekStart && visitDate <= weekEnd;
    });
    
    const weekTargets = filteredHistoricalData.targets.filter(target => {
      const targetDate = new Date(target.target_date);
      return targetDate >= weekStart && targetDate <= weekEnd;
    });
    
    // Calculate metrics (same logic as KPI cards)
    const revenue = weekOrders.reduce((sum, order) => sum + (order.net_amount || 0), 0);
    const target = weekTargets.reduce((sum, target) => sum + (target.total_revenue_target || 0), 0);
    const visitCount = weekVisits.length;
    
    // Calculate converted visits for this week
    const weekConvertedVisits = new Set();
    weekOrders.forEach(order => {
      const orderDate = order.order_date;
      weekVisits.forEach(visit => {
        if (visit.dcrDate === orderDate && 
            (visit.clientMobileNo === order.customer_code || 
             visit.clientMobileNo === order.customer_code)) {
          weekConvertedVisits.add(visit.visitId);
        }
      });
    });
    
    const convertedCount = weekConvertedVisits.size;
    const nbdRevenue = weekOrders.filter(order => order.order_type === 'NBD').reduce((sum, order) => sum + (order.net_amount || 0), 0);
    const crrRevenue = weekOrders.filter(order => order.order_type === 'CRR').reduce((sum, order) => sum + (order.net_amount || 0), 0);
    
    data.push({
      key: `W${currentWeekNum}`,
      week: `W${currentWeekNum}`,
      revenue,
      target,
      visits: visitCount,
      conversion: visitCount > 0 ? Math.round(((convertedCount / visitCount) * 100), 1) : 0,
      nbd: nbdRevenue,
      crr: crrRevenue,
      converted: convertedCount,
      orders: weekOrders.length,
      isCurrent: i === 0
    });
  }
  
  return data;
};


// Helper function to get week start date
const getWeekStartDate = (year, weekNumber) => {
  const firstDayOfYear = new Date(year, 0, 1);
  const daysToAdd = (weekNumber - 1) * 7;
  const weekDate = new Date(firstDayOfYear.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  const dayOfWeek = weekDate.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekDate.setDate(weekDate.getDate() + daysToMonday);
  return weekDate;
};


// 🔧 FIXED: Corrected quarterly data generation
const generateQuarterlyHistoricalData = (selectedQuarter, filteredHistoricalData) => {
  const [year, quarterStr] = selectedQuarter.split('-Q');
  const quarterNum = parseInt(quarterStr);
  const data = [];
  
  console.log('📈 Generating quarterly trends for:', selectedQuarter);
  
  // Start from Q2 if selected is Q3/Q4, or Q1 if selected is Q2
  const startQuarter = quarterNum > 2 ? 2 : 1;
  
  for (let i = startQuarter; i <= quarterNum; i++) {
    const quarterStart = new Date(parseInt(year), (i - 1) * 3, 1);
    const quarterEnd = new Date(parseInt(year), i * 3, 0);
    
    // Filter by date range only (same logic as KPI cards)
    const quarterOrders = filteredHistoricalData.orders.filter(order => {
      const orderDate = new Date(order.order_date);
      return orderDate >= quarterStart && orderDate <= quarterEnd;
    });
    
    const quarterVisits = filteredHistoricalData.visits.filter(visit => {
      const visitDate = new Date(visit.dcrDate);
      return visitDate >= quarterStart && visitDate <= quarterEnd;
    });
    
    const quarterTargets = filteredHistoricalData.targets.filter(target => {
      const targetDate = new Date(target.target_date);
      return targetDate >= quarterStart && targetDate <= quarterEnd;
    });
    
    // Calculate metrics (same logic as KPI cards)
    const revenue = quarterOrders.reduce((sum, order) => sum + (order.net_amount || 0), 0);
    const target = quarterTargets.reduce((sum, target) => sum + (target.total_revenue_target || 0), 0);
    const visitCount = quarterVisits.length;
    
    // Calculate converted visits for this quarter
    const quarterConvertedVisits = new Set();
    quarterOrders.forEach(order => {
      const orderDate = order.order_date;
      quarterVisits.forEach(visit => {
        if (visit.dcrDate === orderDate && 
            (visit.clientMobileNo === order.customer_code || 
             visit.clientMobileNo === order.customer_code)) {
          quarterConvertedVisits.add(visit.visitId);
        }
      });
    });
    
    const convertedCount = quarterConvertedVisits.size;
    const nbdRevenue = quarterOrders.filter(order => order.order_type === 'NBD').reduce((sum, order) => sum + (order.net_amount || 0), 0);
    const crrRevenue = quarterOrders.filter(order => order.order_type === 'CRR').reduce((sum, order) => sum + (order.net_amount || 0), 0);
    
    data.push({
      key: `Q${i}`,
      quarter: `Q${i}`,
      revenue,
      target,
      visits: visitCount,
      conversion: visitCount > 0 ? 
        Math.round(((convertedCount / visitCount) * 100), 1) : 0,
      nbd: nbdRevenue,
      crr: crrRevenue,
      converted: convertedCount,
      orders: quarterOrders.length, // 🔧 FIXED: Use quarterOrders, not monthOrders
      isCurrent: i === quarterNum
    });
  }
  
  return data;
};

// 🔧 FIXED: Ensure yearly data uses correct order counts  
const generateYearlyHistoricalData = (selectedYear, filteredHistoricalData) => {
  const yearNum = parseInt(selectedYear);
  const data = [];
  
  console.log('📈 Generating yearly trends for:', selectedYear);
  
  // Previous year and current year
  for (let i = -1; i <= 0; i++) {
    const currentYear = yearNum + i;
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);
    
    // Filter by date range only (same logic as KPI cards)
    const yearOrders = filteredHistoricalData.orders.filter(order => {
      const orderDate = new Date(order.order_date);
      return orderDate >= yearStart && orderDate <= yearEnd;
    });
    
    const yearVisits = filteredHistoricalData.visits.filter(visit => {
      const visitDate = new Date(visit.dcrDate);
      return visitDate >= yearStart && visitDate <= yearEnd;
    });
    
    const yearTargets = filteredHistoricalData.targets.filter(target => {
      const targetDate = new Date(target.target_date);
      return targetDate >= yearStart && targetDate <= yearEnd;
    });
    
    // Calculate metrics (same logic as KPI cards)
    const revenue = yearOrders.reduce((sum, order) => sum + (order.net_amount || 0), 0);
    const target = yearTargets.reduce((sum, target) => sum + (target.total_revenue_target || 0), 0);
    const visitCount = yearVisits.length;
    
    // Calculate converted visits for this year
    const yearConvertedVisits = new Set();
    yearOrders.forEach(order => {
      const orderDate = order.order_date;
      yearVisits.forEach(visit => {
        if (visit.dcrDate === orderDate && 
            (visit.clientMobileNo === order.customer_code || 
             visit.clientMobileNo === order.customer_code)) {
          yearConvertedVisits.add(visit.visitId);
        }
      });
    });
    
    const convertedCount = yearConvertedVisits.size;
    const nbdRevenue = yearOrders.filter(order => order.order_type === 'NBD').reduce((sum, order) => sum + (order.net_amount || 0), 0);
    const crrRevenue = yearOrders.filter(order => order.order_type === 'CRR').reduce((sum, order) => sum + (order.net_amount || 0), 0);
    
    data.push({
      key: currentYear.toString(),
      year: currentYear.toString(),
      revenue,
      target,
      visits: visitCount,
      conversion: visitCount > 0 ? 
        Math.round(((convertedCount / visitCount) * 100), 1) : 0,
      nbd: nbdRevenue,
      crr: crrRevenue,
      converted: convertedCount,
      orders: yearOrders.length, // 🔧 FIXED: Use yearOrders, not monthOrders
      isCurrent: i === 0
    });
  }
  
  return data;
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

  const getUnknownMRsFromSalesData = async () => {
  try {
    // Wait for medicalReps to be loaded
    if (medicalReps.length === 0) {
      return [];
    }

    const currentRange = dateRange;
    
    // Get all unique MR names from orders and visits
    const [orderData, visitData] = await Promise.all([
      supabase
        .from('orders')
        .select('mr_name')
        .gte('order_date', currentRange.start)
        .lte('order_date', currentRange.end)
        .in('customer_type', ['Doctor', 'Retailer'])
        .eq('status', 'Order Confirmed')
        .not('mr_name', 'is', null),
      
      supabase
        .from('mr_visits')
        .select('"empName"')
        .gte('"dcrDate"', currentRange.start)
        .lte('"dcrDate"', currentRange.end)
        .not('"empName"', 'is', null)
    ]);

    // Get unique standardized names from sales data
    const salesMRNames = [
      ...new Set([
        ...(orderData.data?.map(o => standardizeName(o.mr_name)) || []),
        ...(visitData.data?.map(v => standardizeName(v.empName)) || [])
      ])
    ].filter(Boolean);

    // Get known MR names (already standardized)
    const knownMRNames = medicalReps.map(mr => mr.name);

    // Find unknown MRs
    const unknownMRNames = salesMRNames.filter(name => 
      !knownMRNames.includes(name) && 
      !unknownMRs.some(unknown => unknown.name === name)
    );

    console.log('Unknown MRs detection:', {
      salesMRNames: salesMRNames.length,
      knownMRNames: knownMRNames.length,
      unknownMRNames: unknownMRNames.length
    });

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
  return <LoadingTerminal />;
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
            
             <button 
    onClick={() => {
      dataCacheService.clearCache();
      fetchDashboardData();
    }}
    className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
    title="Clear cache and reload data"
  >
    🗑️ Clear Cache
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
                    <option value="2025-Q1">2025-Q1(Jan,Feb,Mar)</option>
                    <option value="2025-Q2">2025-Q2(Apr,May,Jun)</option>
                    <option value="2025-Q3">2025-Q3(Jul,Aug,Sep)</option>
                    <option value="2025-Q4">2025-Q4(Oct,Nov,Dec)</option>
                  
                  </select>
                )}

                {selectedPeriod === 'yearly' && (
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="2025">2025</option>
                    
                  </select>
                )}
              </div>

              {selectedPeriod === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
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

{/* Enhanced Top Performers Table */}
      <div className="mb-8">
        <EnhancedPerformanceTable data={dashboardData.allPerformers} />
      </div>
      
      {/* Enhanced Charts Section */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
  {/* Revenue Trend Chart */}
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6 min-w-0 overflow-hidden">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900 truncate">Revenue Trend</h3>
      <div className="text-xs text-gray-500">
        {selectedPeriod === 'monthly' && 'Apr - Current Month'}
        {selectedPeriod === 'weekly' && 'Last 5 Weeks + Current'}
        {selectedPeriod === 'quarterly' && 'Previous Quarter - Current'}
        {selectedPeriod === 'yearly' && 'Previous Year - Current'}
      </div>
    </div>
    <ResponsiveContainer width="100%" height={300} minWidth={0}>
      <AreaChart data={dashboardData.trends || []}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6}/>
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis 
          dataKey="key" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickFormatter={(value) => formatCurrency(value)}
        />
        <Tooltip 
          formatter={(value, name) => [formatCurrency(value), name]}
          labelStyle={{ color: '#1e293b' }}
          contentStyle={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Legend />
        <Area 
          type="monotone" 
          dataKey="revenue" 
          stroke="#2563eb" 
          strokeWidth={2}
          fill="url(#colorRevenue)" 
          name="Actual Revenue" 
        />
        <Area 
          type="monotone" 
          dataKey="target" 
          stroke="#f59e0b" 
          strokeWidth={2}
          fill="url(#colorTarget)" 
          fillOpacity={0.3} 
          name="Target Revenue" 
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
  
  {/* Visits & Conversion Rate Chart */}
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6 min-w-0 overflow-hidden">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900 truncate">Visits & Conversion Rate</h3>
      <div className="text-xs text-gray-500">Historical Trend</div>
    </div>
    <ResponsiveContainer width="100%" height={300} minWidth={0}>
      <LineChart data={dashboardData.trends || []}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis 
          dataKey="key" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
        />
        <YAxis 
          yAxisId="left" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
        />
        <YAxis 
          yAxisId="right" 
          orientation="right" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip 
          formatter={(value, name) => [
            name === 'Conversion %' ? `${value}%` : value, 
            name
          ]}
          contentStyle={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Legend />
        <Line 
          yAxisId="left" 
          type="monotone" 
          dataKey="visits" 
          stroke="#10b981" 
          strokeWidth={3}
          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
          name="Visits" 
        />
        <Line 
          yAxisId="right" 
          type="monotone" 
          dataKey="conversion" 
          stroke="#8b5cf6" 
          strokeWidth={3}
          dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
          name="Conversion %" 
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
  
  {/* Revenue Distribution Chart */}
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6 min-w-0 overflow-hidden">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900 truncate">Revenue Distribution</h3>
      <div className="text-xs text-gray-500">NBD vs CRR Trend</div>
    </div>
    <ResponsiveContainer width="100%" height={300} minWidth={0}>
      <BarChart data={dashboardData.trends || []}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis 
          dataKey="key" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickFormatter={(value) => formatCurrency(value)}
        />
        <Tooltip 
          formatter={(value) => formatCurrency(value)}
          contentStyle={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Legend />
        <Bar 
          dataKey="nbd" 
          stackId="a" 
          fill="#3b82f6" 
          name="New Business"
          radius={[0, 0, 0, 0]}
        />
        <Bar 
          dataKey="crr" 
          stackId="a" 
          fill="#10b981" 
          name="Repeat Revenue"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>

 
        
        {/* Order Fulfillment Chart */}
        <OrderFulfillmentChart data={dashboardData.detailedMetrics.fulfillmentMetrics} />
      </div>

      
      {/* Enhanced Performance Metrics Detail Section */}
<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
  {/* Revenue Achievement Card */}
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue Achievement</h3>
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
      <div className="mt-6 space-y-3">
        <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
          <span className="text-gray-600 font-medium">Target</span>
          <span className="font-semibold text-gray-900">{formatCurrency(dashboardData.detailedMetrics.revenueMetrics.target)}</span>
        </div>
        <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
          <span className="text-gray-600 font-medium">Achieved</span>
          <span className="font-semibold text-green-600">{formatCurrency(dashboardData.detailedMetrics.revenueMetrics.achieved)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 font-medium">Gap</span>
          <span className="font-semibold text-red-600">{formatCurrency(Math.abs(dashboardData.detailedMetrics.revenueMetrics.gap))}</span>
        </div>
      </div>
    </div>
  </div>

  {/* Revenue Distribution Card */}
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue by Business Type</h3>
    <div className="h-64 mb-4">
      <ResponsiveContainer width="100%" height="100%">
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
    </div>
    <div className="space-y-3">
      {dashboardData.performanceByCategory.map((category, index) => (
        <div key={index} className={`flex justify-between items-center p-3 rounded-lg ${index === 0 ? 'bg-blue-50 border border-blue-100' : 'bg-green-50 border border-green-100'}`}>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${index === 0 ? 'bg-blue-500' : 'bg-green-500'}`}></div>
            <span className="text-sm font-medium text-gray-700">{category.category}</span>
          </div>
          <span className="font-semibold text-gray-900">{formatCurrency(category.value)}</span>
        </div>
      ))}
    </div>
  </div>

  {/* Performance Metrics Card */}
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Metrics</h3>
    
    {/* Visit Completion Section */}
<div className="mb-6">
  <div className="flex items-center justify-between mb-3">
    <h4 className="text-sm font-semibold text-gray-700 flex items-center">
      <Activity className="w-4 h-4 mr-2 text-blue-600" />
      Visit Completion
    </h4>
    <span className="text-lg font-bold text-blue-600">
      {Math.min(dashboardData.detailedMetrics.visitMetrics.completionRate, 100)}%
    </span>
  </div>
  
  <div className="space-y-2 mb-4">
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div
        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000 ease-out"
        style={{ 
          width: `${Math.min(dashboardData.detailedMetrics.visitMetrics.completionRate, 100)}%` 
        }}
      />
    </div>
    <div className="flex justify-between text-xs text-gray-600">
      <span>Completed: <span className="font-semibold text-green-600">{dashboardData.detailedMetrics.visitMetrics.completed}</span></span>
      <span>Planned: <span className="font-semibold text-gray-700">{dashboardData.detailedMetrics.visitMetrics.planned}</span></span>
      <span>Missed: <span className="font-semibold text-red-600">{dashboardData.detailedMetrics.visitMetrics.missed}</span></span>
    </div>
  </div>
</div>

    {/* Conversion Funnel Section */}
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
        <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
        Conversion Funnel
      </h4>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
              <Users className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">Total Leads</span>
          </div>
          <span className="text-lg font-bold text-blue-600">{dashboardData.detailedMetrics.conversionMetrics.totalLeads.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">Converted</span>
          </div>
          <span className="text-lg font-bold text-green-600">{dashboardData.detailedMetrics.conversionMetrics.converted.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">Pending</span>
          </div>
          <span className="text-lg font-bold text-yellow-600">{dashboardData.detailedMetrics.conversionMetrics.pending.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-red-100 rounded-lg border border-red-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
              <XCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">Lost</span>
          </div>
          <span className="text-lg font-bold text-red-600">{dashboardData.detailedMetrics.conversionMetrics.lost.toLocaleString()}</span>
        </div>
      </div>
    </div>
  </div>
</div>

{/* Enhanced Quick Stats Section */}
<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-6">Key Performance Indicators</h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
      <div>
        <span className="text-sm text-gray-600 font-medium">Avg Visits per Rep</span>
        <div className="text-2xl font-bold text-blue-600 mt-1">
          {dashboardData.overview.activeReps > 0 
            ? Math.round(dashboardData.overview.totalVisits / dashboardData.overview.activeReps)
            : 0}
        </div>
      </div>
      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
        <Users className="w-6 h-6 text-white" />
      </div>
    </div>

    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-600 font-medium">Avg Revenue per Visit</span>
        <div className="text-xl font-bold text-green-600 mt-1 truncate" title={formatCurrency(dashboardData.overview.totalVisits > 0 ? dashboardData.overview.totalRevenue / dashboardData.overview.totalVisits : 0)}>
          {formatCurrency(dashboardData.overview.totalVisits > 0 ? dashboardData.overview.totalRevenue / dashboardData.overview.totalVisits : 0)}
        </div>
      </div>
      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
        <DollarSign className="w-6 h-6 text-white" />
      </div>
    </div>

    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200">
      <div>
        <span className="text-sm text-gray-600 font-medium">Visit to Order Ratio</span>
        <div className="text-2xl font-bold text-purple-600 mt-1">
          {dashboardData.overview.conversionRate}%
        </div>
      </div>
      <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
        <TrendingUp className="w-6 h-6 text-white" />
      </div>
    </div>

    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200">
      <div>
        <span className="text-sm text-gray-600 font-medium">Conversion Growth</span>
        <div className={`text-2xl font-bold mt-1 ${dashboardData.overview.conversionRateChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {dashboardData.overview.conversionRateChange > 0 ? '+' : ''}{parseFloat(dashboardData.overview.conversionRateChange).toFixed(1)}%
        </div>
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${dashboardData.overview.conversionRateChange > 0 ? 'bg-green-500' : 'bg-red-500'}`}>
        <Activity className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
</div>

    </div>
  );
};

export default SalesPerformanceDashboard;
