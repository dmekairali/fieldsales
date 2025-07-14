import React, { useState, useEffect, useRef } from 'react';
import MonthlyPlanServiceV2 from '../services/MonthlyPlanServiceV2';
import MonthlyPlanDecompressionService from '../services/MonthlyPlanDecompressionService';
import { useMedicalRepresentatives } from '../hooks/useMedicalRepresentatives';
import { 
  Calendar, 
  TrendingUp, 
  MapPin, 
  Users, 
  Target,
  DollarSign,
  Clock,
  BarChart3,
  RefreshCw,
  Download,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  Zap,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  PlayCircle,
  Bell,
  Volume2,
  VolumeX,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Timer,
  Code,
  Activity,
  Send,
  Brain,
  Loader2,
  Search,
  Sparkles,
  ArrowRight,
  Building,
  TrendingDown,
  Database
} from 'lucide-react';

// Notification System
class NotificationManager {
  constructor() {
    this.notifications = [];
    this.listeners = [];
    this.soundEnabled = true;
  }

  addNotification(notification) {
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      ...notification
    };
    
    this.notifications.unshift(newNotification);
    this.listeners.forEach(listener => listener(this.notifications));
    
    if (this.soundEnabled) {
      this.playNotificationSound(notification.type);
    }
    
    if (['success', 'info'].includes(notification.type)) {
      setTimeout(() => {
        this.removeNotification(newNotification.id);
      }, 10000);
    }
  }

  removeNotification(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.listeners.forEach(listener => listener(this.notifications));
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
  }

  playNotificationSound(type) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const frequencies = {
        success: [523.25, 659.25, 783.99],
        error: [220, 196],
        warning: [440, 493.88],
        info: [440]
      };
      
      const freq = frequencies[type] || frequencies.info;
      
      freq.forEach((f, i) => {
        setTimeout(() => {
          oscillator.frequency.setValueAtTime(f, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          
          if (i === 0) {
            oscillator.start(audioContext.currentTime);
          }
          if (i === freq.length - 1) {
            oscillator.stop(audioContext.currentTime + 0.2);
          }
        }, i * 150);
      });
    } catch (error) {
      console.log('Audio not supported');
    }
  }
}

// Batch Processing Manager
class BatchProcessingManager {
  constructor(notificationManager) {
    this.notificationManager = notificationManager;
    this.activeJobs = new Map();
    this.planService = new MonthlyPlanServiceV2();
  }

  async processBatch(mrList, month, year, onProgress) {
    const batchId = `batch_${Date.now()}`;
    const totalMRs = mrList.length;
    
    this.notificationManager.addNotification({
      type: 'info',
      title: 'Batch Processing Started',
      message: `Processing ${totalMRs} MRs for ${month}/${year}. We'll notify you when complete!`,
      batchId,
      persistent: true
    });

    const results = {
      batchId,
      totalMRs,
      completed: 0,
      successful: 0,
      failed: 0,
      results: [],
      startTime: new Date(),
      endTime: null
    };

    this.activeJobs.set(batchId, {
      status: 'processing',
      progress: 0,
      results
    });

    for (let i = 0; i < mrList.length; i++) {
      const mr = mrList[i];
      
      try {
        const result = await this.planService.generateEnhancedMonthlyPlan(mr.name, month, year);
        
        if (result.success) {
          results.successful++;
          results.results.push({
            mrName: mr.name,
            status: 'success',
            planId: result.plan_id,
            tokensUsed: result.tokens_used
          });
          
          this.notificationManager.addNotification({
            type: 'success',
            title: `Plan Generated: ${mr.name}`,
            message: `Monthly plan created successfully!`
          });
        } else {
          results.failed++;
          results.results.push({
            mrName: mr.name,
            status: 'failed',
            error: 'Plan generation failed'
          });
        }
      } catch (error) {
        results.failed++;
        results.results.push({
          mrName: mr.name,
          status: 'failed',
          error: error.message
        });
      }

      results.completed++;
      const progress = Math.round((results.completed / totalMRs) * 100);
      
      this.activeJobs.set(batchId, {
        status: 'processing',
        progress,
        results
      });

      if (onProgress) {
        onProgress(results);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    results.endTime = new Date();
    
    this.activeJobs.set(batchId, {
      status: 'completed',
      progress: 100,
      results
    });

    this.notificationManager.addNotification({
      type: results.failed === 0 ? 'success' : results.successful === 0 ? 'error' : 'warning',
      title: 'Batch Processing Completed! 🎉',
      message: `${results.successful} successful, ${results.failed} failed out of ${totalMRs} MRs`,
      batchId,
      persistent: true
    });

    return results;
  }
}

const EnhancedMonthlyPlanningDashboard = ({ selectedMR, selectedMRName }) => {
  const { mrList, loading: mrLoading, error: mrError } = useMedicalRepresentatives();
  
  // Core state
  const [allPlans, setAllPlans] = useState([]);
  const [selectedPlanMR, setSelectedPlanMR] = useState(null);
  const [monthlyPlan, setMonthlyPlan] = useState(null);
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeView, setActiveView] = useState('overview');
  const [calendarView, setCalendarView] = useState('month');
  const [areaView, setAreaView] = useState('customer');
  const [selectedWeek, setSelectedWeek] = useState(1);

  // New state for enhanced features
  const [projectChangeLogs, setProjectChangeLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedMRsForBatch, setSelectedMRsForBatch] = useState([]);
  const [batchProgress, setBatchProgress] = useState(null);
  const [mrSearchFilter, setMrSearchFilter] = useState('');

  // Live service instances
  const planService = new MonthlyPlanServiceV2();
  const decompressionService = new MonthlyPlanDecompressionService();
  
  // Managers
  const notificationManagerRef = useRef(new NotificationManager());
  const batchManagerRef = useRef(new BatchProcessingManager(notificationManagerRef.current));

  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Setup notification listener
  useEffect(() => {
    const unsubscribe = notificationManagerRef.current.subscribe(setNotifications);
    return unsubscribe;
  }, []);

  // Load all plans on component mount
  useEffect(() => {
    if (mrList.length > 0) {
      loadAllPlans();
    }
  }, [mrList, selectedMonth, selectedYear]);

  // Auto-select first MR if none selected
  useEffect(() => {
    if (allPlans.length > 0 && !selectedPlanMR) {
      setSelectedPlanMR(allPlans[0].mrName);
    }
  }, [allPlans, selectedPlanMR]);

  // Load plan details when MR is selected
  useEffect(() => {
    if (selectedPlanMR) {
      loadPlanDetails(selectedPlanMR);
    }
  }, [selectedPlanMR, selectedMonth, selectedYear]);

  const loadAllPlans = async () => {
    try {
      const plans = [];
      
      // Load plans for all MRs
      for (const mr of mrList.slice(0, 10)) { // Limit to first 10 for demo
        try {
          const dashboardData = await planService.getDashboardData(mr.name, selectedMonth, selectedYear);
          
          if (dashboardData) {
            plans.push({
              mrName: mr.name,
              territory: mr.territory,
              planId: dashboardData.metadata?.plan_id,
              totalVisits: dashboardData.monthly_overview?.total_visits || 0,
              targetRevenue: dashboardData.monthly_overview?.target_revenue || 0,
              totalCustomers: dashboardData.summary_metrics?.total_customers || 0,
              generatedAt: dashboardData.metadata?.generated_at,
              status: 'active'
            });
          } else {
            plans.push({
              mrName: mr.name,
              territory: mr.territory,
              status: 'no_plan'
            });
          }
        } catch (error) {
          console.warn(`Failed to load plan for ${mr.name}:`, error);
          plans.push({
            mrName: mr.name,
            territory: mr.territory,
            status: 'error'
          });
        }
      }
      
      setAllPlans(plans);
    } catch (error) {
      console.error('Failed to load all plans:', error);
    }
  };

  const loadPlanDetails = async (mrName) => {
    try {
      setError(null);
      
      const dashboardData = await planService.getDashboardData(mrName, selectedMonth, selectedYear);
      
      if (dashboardData) {
        setMonthlyPlan({
          id: dashboardData.metadata?.plan_id,
          current_plan_json: {
            mo: dashboardData.monthly_overview,
            cvs: {},
            ws: dashboardData.weekly_summary
          },
          thread_id: dashboardData.metadata?.thread_id,
          tokens_used: dashboardData.metadata?.tokens_used,
          generated_at: dashboardData.metadata?.generated_at,
          plan_version: dashboardData.metadata?.plan_version
        });
        
        setExpandedPlan({
          mo: dashboardData.monthly_overview,
          customer_summary: dashboardData.customer_summary,
          weekly_summary: dashboardData.weekly_summary,
          summary_metrics: dashboardData.summary_metrics,
          quick_stats: dashboardData.quick_stats
        });
      } else {
        setMonthlyPlan(null);
        setExpandedPlan(null);
      }
    } catch (error) {
      console.error('Failed to load plan details:', error);
      setError(`Failed to load plan: ${error.message}`);
    }
  };

  const generateNewPlan = async (targetMrName = null) => {
    const mrName = targetMrName || selectedPlanMR;
    
    if (!mrName || mrName === 'ALL_MRS') {
      setError('Please select a specific MR first');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await planService.generateEnhancedMonthlyPlan(mrName, selectedMonth, selectedYear);

      if (result.success) {
        await loadAllPlans();
        await loadPlanDetails(mrName);
        
        setSuccess(`Monthly plan generated successfully! Plan ID: ${result.plan_id}`);
        
        notificationManagerRef.current.addNotification({
          type: 'success',
          title: 'Plan Generated Successfully! 🎉',
          message: `Monthly plan for ${mrName} created with AI optimization`
        });
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Plan generation failed:', error);
      setError(`Plan generation failed: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const startBatchProcessing = async () => {
    if (selectedMRsForBatch.length === 0) {
      notificationManagerRef.current.addNotification({
        type: 'warning',
        title: 'No MRs Selected',
        message: 'Please select at least one MR for batch processing'
      });
      return;
    }

    setShowBatchModal(false);
    
    const results = await batchManagerRef.current.processBatch(
      selectedMRsForBatch,
      selectedMonth,
      selectedYear,
      setBatchProgress
    );

    // Reload all plans after batch processing
    await loadAllPlans();
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const navigateMonth = (direction) => {
    if (direction === 'next') {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    } else {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    }
  };

  const toggleSound = () => {
    notificationManagerRef.current.toggleSound();
    setSoundEnabled(!soundEnabled);
  };

  const filteredMRs = mrList.filter(mr => 
    mr.name.toLowerCase().includes(mrSearchFilter.toLowerCase()) ||
    mr.territory?.toLowerCase().includes(mrSearchFilter.toLowerCase()) ||
    mr.employee_id?.toLowerCase().includes(mrSearchFilter.toLowerCase())
  );

  const viewOptions = [
    { id: 'overview', name: 'Overview', icon: BarChart3, description: 'All plans overview' },
    { id: 'ai-planner', name: 'AI Planner', icon: Sparkles, description: 'Create & batch process plans' },
    { id: 'calendar', name: 'Calendar View', icon: Calendar, description: 'Daily visit schedule' },
    { id: 'weekly', name: 'Weekly Plans', icon: Clock, description: 'Week-wise breakdown' },
    { id: 'customers', name: 'Customer List', icon: Users, description: 'All planned customers' },
    { id: 'changelog', name: 'Project Changes', icon: Activity, description: 'Input/Output tracking & logs' }
  ];

  const getCalendarDays = () => {
    const year = selectedYear;
    const month = selectedMonth;
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getWeekCalendarDays = () => {
    const year = selectedYear;
    const month = selectedMonth;
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const firstDayOfWeek = new Date(firstDayOfMonth);
    firstDayOfWeek.setDate(firstDayOfMonth.getDate() + (selectedWeek - 1) * 7 - firstDayOfMonth.getDay());

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(firstDayOfWeek);
      day.setDate(firstDayOfWeek.getDate() + i);
      weekDays.push(day);
    }
    return weekDays;
  };

  const navigateWeek = (direction) => {
    const year = selectedYear;
    const month = selectedMonth;
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);
    const numWeeks = Math.ceil((lastDayOfMonth.getDate() + firstDayOfMonth.getDay()) / 7);

    if (direction === 'next') {
      if (selectedWeek < numWeeks) {
        setSelectedWeek(selectedWeek + 1);
      }
    } else {
      if (selectedWeek > 1) {
        setSelectedWeek(selectedWeek - 1);
      }
    }
  };

  const getVisitsForDay = (day) => {
    if (!expandedPlan?.customer_summary || !day) return [];
    
    const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    const visits = expandedPlan.customer_summary.filter(customer =>
      customer.visit_dates && customer.visit_dates.includes(dateStr)
    );

    if (areaView === 'area') {
      const areas = visits.map(visit => visit.area_name);
      const uniqueAreas = [...new Set(areas)];
      return uniqueAreas.map(area => ({ area_name: area }));
    }

    return visits;
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-xl shadow-lg text-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold">Monthly Planning</h1>
                <p className="text-violet-100">AI-powered territory tour planning with batch processing</p>
              </div>
            </div>
            {selectedPlanMR && (
              <div className="flex items-center space-x-2 text-sm text-violet-100">
                <Users className="h-4 w-4" />
                <span>Viewing plan for {selectedPlanMR}</span>
              </div>
            )}
          </div>
          
          {/* Header Controls */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button 
                onClick={toggleSound}
                className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                title={soundEnabled ? 'Disable sound' : 'Enable sound'}
              >
                {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </button>
              
              <div className="relative">
                <button className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors">
                  <Bell className="h-5 w-5" />
                </button>
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center bg-white bg-opacity-20 rounded-lg p-2">
              <button 
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="px-4 py-2 text-center min-w-32">
                <div className="font-semibold">{monthNames[selectedMonth]}</div>
                <div className="text-sm text-violet-200">{selectedYear}</div>
              </div>
              <button 
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors">
                <Download className="h-5 w-5" />
              </button>
              <button 
                onClick={loadAllPlans}
                className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Area */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.slice(0, 3).map((notification) => (
            <div key={notification.id} className={`rounded-lg p-4 flex items-start space-x-3 ${
              notification.type === 'success' ? 'bg-green-50 border border-green-200' :
              notification.type === 'error' ? 'bg-red-50 border border-red-200' :
              notification.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              {notification.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />}
              {notification.type === 'error' && <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />}
              {notification.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />}
              {notification.type === 'info' && <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />}
              
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{notification.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </div>
              </div>
              
              <button 
                onClick={() => notificationManagerRef.current.removeNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active Batch Processing Status */}
      {batchProgress && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Batch Processing Status</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Timer className="h-4 w-4" />
              <span>Processing in background...</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Progress: {batchProgress.completed}/{batchProgress.totalMRs} MRs</span>
              <span>{Math.round((batchProgress.completed / batchProgress.totalMRs) * 100)}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-violet-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(batchProgress.completed / batchProgress.totalMRs) * 100}%` }}
              ></div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{batchProgress.successful}</div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{batchProgress.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">{batchProgress.totalMRs - batchProgress.completed}</div>
                <div className="text-sm text-gray-600">Remaining</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-red-900">Error</h4>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
          <button onClick={clearMessages} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-green-900">Success</h4>
            <p className="text-green-700 text-sm mt-1">{success}</p>
          </div>
          <button onClick={clearMessages} className="text-green-400 hover:text-green-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {viewOptions.map((option) => {
              const Icon = option.icon;
              const isActive = activeView === option.id;
              
              return (
                <button
                  key={option.id}
                  onClick={() => setActiveView(option.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-violet-500 text-violet-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span>{option.name}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1 hidden lg:block">
                    {option.description}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* View Content */}
        <div className="p-6">
          {/* Overview - Horizontal Scrollable Plans */}
          {activeView === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">All Monthly Plans</h3>
                <div className="text-sm text-gray-500">
                  {allPlans.length} MRs • {monthNames[selectedMonth]} {selectedYear}
                </div>
              </div>
              
              {/* Horizontal Scrollable Plan Cards */}
              <div className="overflow-x-auto pb-4">
                <div className="flex space-x-4 min-w-max">
                  {allPlans.map((plan) => {
                    const isSelected = selectedPlanMR === plan.mrName;
                    
                    return (
                      <div
                        key={plan.mrName}
                        onClick={() => setSelectedPlanMR(plan.mrName)}
                        className={`flex-shrink-0 w-80 p-6 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-violet-500 bg-violet-50 shadow-lg' 
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className={`font-semibold text-lg ${isSelected ? 'text-violet-900' : 'text-gray-900'}`}>
                              {plan.mrName}
                            </h4>
                            <p className="text-sm text-gray-600">{plan.territory}</p>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            plan.status === 'active' ? 'bg-green-100 text-green-800' :
                            plan.status === 'no_plan' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {plan.status === 'active' ? 'Active' : 
                             plan.status === 'no_plan' ? 'No Plan' : 'Error'}
                          </div>
                        </div>

                        {plan.status === 'active' ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center">
                                <div className={`text-2xl font-bold ${isSelected ? 'text-violet-700' : 'text-gray-900'}`}>
                                  {plan.totalVisits}
                                </div>
                                <div className="text-sm text-gray-600">Visits</div>
                              </div>
                              <div className="text-center">
                                <div className={`text-2xl font-bold ${isSelected ? 'text-violet-700' : 'text-gray-900'}`}>
                                  {plan.totalCustomers}
                                </div>
                                <div className="text-sm text-gray-600">Customers</div>
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <div className={`text-xl font-bold ${isSelected ? 'text-violet-700' : 'text-green-600'}`}>
                                ₹{((plan.targetRevenue || 0) / 100000).toFixed(1)}L
                              </div>
                              <div className="text-sm text-gray-600">Revenue Target</div>
                            </div>
                            
                            {plan.generatedAt && (
                              <div className="text-xs text-gray-500 text-center">
                                Generated: {new Date(plan.generatedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                              plan.status === 'no_plan' ? 'bg-gray-100' : 'bg-red-100'
                            }`}>
                              {plan.status === 'no_plan' ? 
                                <Calendar className="h-8 w-8 text-gray-400" /> :
                                <AlertCircle className="h-8 w-8 text-red-500" />
                              }
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                              {plan.status === 'no_plan' ? 'No plan generated yet' : 'Failed to load plan'}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                generateNewPlan(plan.mrName);
                              }}
                              className="inline-flex items-center px-3 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Generate Plan
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Plan Details */}
              {selectedPlanMR && monthlyPlan && expandedPlan && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Plan Details - {selectedPlanMR}</h3>
                    <button
                      onClick={() => setActiveView('calendar')}
                      className="inline-flex items-center px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Details
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-700">
                        {expandedPlan.mo?.total_visits || 0}
                      </div>
                      <div className="text-sm text-blue-600">Total Visits</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-700">
                        ₹{((expandedPlan.mo?.target_revenue || 0) / 100000).toFixed(1)}L
                      </div>
                      <div className="text-sm text-green-600">Revenue Target</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-700">
                        {expandedPlan.summary_metrics?.total_customers || 0}
                      </div>
                      <div className="text-sm text-purple-600">Customers</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-orange-700">
                        {expandedPlan.quick_stats?.customers_per_day || 0}
                      </div>
                      <div className="text-sm text-orange-600">Visits/Day</div>
                    </div>
                  </div>

                  {/* Strategy Summary */}
                  {expandedPlan.mo?.strategy_summary && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Target className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-blue-900 mb-2">Monthly Strategy</h3>
                          <p className="text-blue-800 leading-relaxed">{expandedPlan.mo.strategy_summary}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AI Planner Tab */}
          {activeView === 'ai-planner' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-10 w-10 text-violet-600" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">AI Plan Generator</h3>
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                  Create optimized monthly plans using AI for individual MRs or process multiple MRs in batch mode
                </p>
              </div>

              {/* Plan Generation Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Individual Plan Generation */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Brain className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-blue-900 mb-2">Individual Plan</h4>
                      <p className="text-blue-800 text-sm">Generate an AI-optimized plan for a single MR</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">Select MR</label>
                      <select 
                        value={selectedPlanMR || ''}
                        onChange={(e) => setSelectedPlanMR(e.target.value)}
                        className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Choose an MR...</option>
                        {mrList.map((mr) => (
                          <option key={mr.id} value={mr.name}>{mr.name} - {mr.territory}</option>
                        ))}
                      </select>
                    </div>
                    
                    <button
                      onClick={() => generateNewPlan()}
                      disabled={!selectedPlanMR || isGenerating || batchProgress}
                      className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          AI is thinking...
                        </>
                      ) : batchProgress ? (
                        <>
                          <Timer className="h-4 w-4 mr-2" />
                          Batch processing active...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Generate Plan
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="mt-4 bg-blue-100 rounded-lg p-3">
                    <div className="text-xs text-blue-700 space-y-1">
                      <p>• Analyzes territory and customer data</p>
                      <p>• Optimizes visit frequencies</p>
                      <p>• Takes 2-5 minutes to complete</p>
                    </div>
                  </div>
                </div>

                {/* Batch Plan Generation */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Layers className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-orange-900 mb-2">Batch Processing</h4>
                      <p className="text-orange-800 text-sm">Select and generate plans for multiple MRs simultaneously</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Quick MR Selection */}
                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-2">Quick Selection</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedMRsForBatch(mrList.slice(0, 5))}
                          disabled={isGenerating || batchProgress}
                          className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          First 5 MRs
                        </button>
                        <button
                          onClick={() => setSelectedMRsForBatch(mrList.slice(0, 10))}
                          disabled={isGenerating || batchProgress}
                          className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          First 10 MRs
                        </button>
                        <button
                          onClick={() => setSelectedMRsForBatch([...mrList])}
                          disabled={isGenerating || batchProgress}
                          className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          All {mrList.length} MRs
                        </button>
                        <button
                          onClick={() => setSelectedMRsForBatch([])}
                          disabled={isGenerating || batchProgress}
                          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Selected MRs Display */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-orange-800">Selected MRs ({selectedMRsForBatch.length})</label>
                        <button
                          onClick={() => setShowBatchModal(true)}
                          disabled={isGenerating || batchProgress}
                          className="text-xs text-orange-600 hover:text-orange-800 disabled:text-gray-400 disabled:cursor-not-allowed underline"
                        >
                          Choose Specific MRs
                        </button>
                      </div>
                      
                      <div className="bg-orange-100 rounded-lg p-3 min-h-[60px] max-h-[120px] overflow-y-auto">
                        {selectedMRsForBatch.length === 0 ? (
                          <div className="text-sm text-orange-600 text-center py-4">
                            No MRs selected. Use quick selection above or "Choose Specific MRs"
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {selectedMRsForBatch.map((mr, index) => (
                              <span key={mr.id} className="inline-flex items-center px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded-full">
                                {mr.name}
                                <button
                                  onClick={() => setSelectedMRsForBatch(selectedMRsForBatch.filter(m => m.id !== mr.id))}
                                  disabled={isGenerating || batchProgress}
                                  className="ml-1 hover:text-red-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-orange-100 rounded-lg p-4">
                      <div className="text-sm text-orange-800 space-y-2">
                        <div className="flex justify-between">
                          <span>Selected MRs:</span>
                          <span className="font-medium">{selectedMRsForBatch.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Processing Time:</span>
                          <span className="font-medium">~{selectedMRsForBatch.length * 3} minutes</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Background Mode:</span>
                          <span className="font-medium">✓ Enabled</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={startBatchProcessing}
                      disabled={selectedMRsForBatch.length === 0 || isGenerating || batchProgress}
                      className="w-full flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {batchProgress ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          AI is processing batch...
                        </>
                      ) : isGenerating ? (
                        <>
                          <Timer className="h-4 w-4 mr-2" />
                          Individual plan active...
                        </>
                      ) : (
                        <>
                          <Layers className="h-4 w-4 mr-2" />
                          Start Processing {selectedMRsForBatch.length > 0 ? `(${selectedMRsForBatch.length} MRs)` : ''}
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="mt-4 bg-orange-100 rounded-lg p-3">
                    <div className="text-xs text-orange-700 space-y-1">
                      <p>• Select specific MRs or use quick options</p>
                      <p>• Continue working while processing</p>
                      <p>• Get notifications when complete</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Processing Status */}
              {isGenerating && (
                <div className="bg-white border border-gray-200 rounded-xl p-8">
                  <div className="text-center">
                    <div className="relative mb-6">
                      <div className="w-16 h-16 border-4 border-violet-200 rounded-full mx-auto"></div>
                      <div className="w-16 h-16 border-4 border-violet-600 rounded-full animate-spin absolute top-0 left-1/2 transform -translate-x-1/2 border-t-transparent"></div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Generating AI Monthly Plan</h3>
                    <p className="text-gray-600 mb-6">
                      We're processing your request and will notify you when complete...
                    </p>
                    
                    <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-6 max-w-md mx-auto border border-violet-200">
                      <div className="space-y-3 text-sm text-violet-800">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
                          <span>Analyzing territory data & patterns</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                          <span>Optimizing visit frequencies & routes</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                          <span>Building comprehensive schedule</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
                          <span>Finalizing AI recommendations</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Features */}
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-6 border border-violet-200">
                <h4 className="font-semibold text-violet-900 mb-4">✨ AI-Powered Features</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-violet-800">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                    <span>Customer tier analysis & prioritization</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                    <span>Optimized visit frequency planning</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                    <span>Territory coverage optimization</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                    <span>Revenue forecasting & targeting</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                    <span>Route efficiency calculations</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                    <span>Real-time notifications & tracking</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Calendar View */}
          {activeView === 'calendar' && selectedPlanMR && expandedPlan && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Daily Visit Schedule - {selectedPlanMR}</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCalendarView('month')}
                      className={`px-3 py-1 text-sm font-medium rounded-lg ${
                        calendarView === 'month' ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Month
                    </button>
                    <button
                      onClick={() => setCalendarView('week')}
                      className={`px-3 py-1 text-sm font-medium rounded-lg ${
                        calendarView === 'week' ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Week
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setAreaView('customer')}
                      className={`px-3 py-1 text-sm font-medium rounded-lg ${
                        areaView === 'customer' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Customer
                    </button>
                    <button
                      onClick={() => setAreaView('area')}
                      className={`px-3 py-1 text-sm font-medium rounded-lg ${
                        areaView === 'area' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Area
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 p-4">
                  <div className="grid grid-cols-7 gap-4 text-center text-sm font-medium text-gray-700">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day}>{day}</div>
                    ))}
                  </div>
                </div>
                
                <div className="p-4">
                  {calendarView === 'month' ? (
                    <div className="grid grid-cols-7 gap-4">
                      {getCalendarDays().map((day, index) => {
                        const visits = getVisitsForDay(day);
                        const isToday = day === new Date().getDate() &&
                                       selectedMonth === new Date().getMonth() + 1 &&
                                       selectedYear === new Date().getFullYear();

                        return (
                          <div key={index} className={`min-h-24 p-2 border border-gray-200 rounded-lg ${
                            day ? 'bg-white hover:bg-gray-50 cursor-pointer' : 'bg-gray-50'
                          } ${isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                            {day && (
                              <>
                                <div className={`text-sm font-medium mb-2 ${
                                  isToday ? 'text-blue-700' : 'text-gray-900'
                                }`}>
                                  {day}
                                </div>
                                {visits.length > 0 && (
                                  <div className="space-y-1">
                                    {visits.slice(0, 2).map((visit, i) => (
                                      <div key={i} className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded truncate">
                                        {areaView === 'customer' ? visit.customer_name : visit.area_name}
                                      </div>
                                    ))}
                                    {visits.length > 2 && (
                                      <div className="text-xs text-gray-500">
                                        +{visits.length - 2} more
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <button onClick={() => navigateWeek('prev')} className="p-2 rounded-lg hover:bg-gray-200">
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <h4 className="text-lg font-semibold">
                          Week {selectedWeek}
                        </h4>
                        <button onClick={() => navigateWeek('next')} className="p-2 rounded-lg hover:bg-gray-200">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-4">
                        {getWeekCalendarDays().map((day, index) => {
                          const visits = getVisitsForDay(day.getDate());
                          const isToday = day.getDate() === new Date().getDate() &&
                                         day.getMonth() + 1 === new Date().getMonth() + 1 &&
                                         day.getFullYear() === new Date().getFullYear();

                          return (
                            <div key={index} className={`min-h-24 p-2 border border-gray-200 rounded-lg ${
                              day ? 'bg-white hover:bg-gray-50 cursor-pointer' : 'bg-gray-50'
                            } ${isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                              {day && (
                                <>
                                  <div className={`text-sm font-medium mb-2 ${
                                    isToday ? 'text-blue-700' : 'text-gray-900'
                                  }`}>
                                    {day.getDate()}
                                  </div>
                                  {visits.length > 0 && (
                                    <div className="space-y-1">
                                      {visits.map((visit, i) => (
                                        <div key={i} className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded truncate">
                                          {areaView === 'customer' ? visit.customer_name : visit.area_name}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Weekly Plans View */}
          {activeView === 'weekly' && selectedPlanMR && expandedPlan && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Weekly Strategic Plans - {selectedPlanMR}</h3>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Week:</label>
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    {[1,2,3,4].map(week => (
                      <option key={week} value={week}>Week {week}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {expandedPlan.weekly_summary?.map((week, index) => {
                  const weekNumber = index + 1;
                  const isSelected = selectedWeek === weekNumber;

                  return (
                    <div key={weekNumber} className={`rounded-xl border-2 p-6 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-violet-500 bg-violet-50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }`} onClick={() => setSelectedWeek(weekNumber)}>
                      <div className="flex justify-between items-start mb-4">
                        <h4 className={`text-lg font-semibold ${isSelected ? 'text-violet-900' : 'text-gray-900'}`}>
                          Week {weekNumber}
                        </h4>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {week.dates?.join(' - ') || 'N/A'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${isSelected ? 'text-violet-700' : 'text-gray-900'}`}>
                            {week.customers || 0}
                          </div>
                          <div className="text-sm text-gray-600">Customers</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${isSelected ? 'text-violet-700' : 'text-gray-900'}`}>
                            ₹{((week.revenue_target || 0) / 1000).toFixed(0)}K
                          </div>
                          <div className="text-sm text-gray-600">Revenue Target</div>
                        </div>
                      </div>

                      <div className={`p-3 rounded-lg ${isSelected ? 'bg-white border border-violet-200' : 'bg-gray-50'}`}>
                        <div className="text-sm text-gray-600 mb-1">Strategic Focus</div>
                        <div className={`text-sm font-medium ${isSelected ? 'text-violet-800' : 'text-gray-900'}`}>
                          {week.focus || 'Balanced territory coverage'}
                        </div>
                      </div>

                      {week.expanded_data?.area_coverage && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {week.expanded_data.area_coverage.slice(0, 3).map((area, i) => (
                            <span key={i} className={`text-xs px-2 py-1 rounded-full ${
                              isSelected ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {area}
                            </span>
                          ))}
                          {week.expanded_data.area_coverage.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{week.expanded_data.area_coverage.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Customers View */}
          {activeView === 'customers' && selectedPlanMR && expandedPlan && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <h3 className="text-lg font-semibold text-gray-900">Customer Schedule - {selectedPlanMR}</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent">
                      <option>All Tiers</option>
                      <option>Tier 2 Performers</option>
                      <option>Tier 3 Developers</option>
                      <option>Tier 4 Prospects</option>
                    </select>
                  </div>
                  <div className="text-sm text-gray-500">
                    {expandedPlan.summary_metrics?.total_customers || 0} customers
                  </div>
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Visits</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {expandedPlan.customer_summary?.slice(0, 20).map((customer, index) => (
                        <tr key={customer.customer_code || index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{customer.customer_name}</div>
                              <div className="text-sm text-gray-500">{customer.customer_code}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {customer.customer_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              customer.tier_level === 'TIER_2_PERFORMER' ? 'bg-purple-100 text-purple-800' :
                              customer.tier_level === 'TIER_3_DEVELOPER' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {customer.tier_level?.replace('TIER_', 'T').replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-600">{customer.area_name}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-violet-100 text-violet-800">
                              {customer.total_visits}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-semibold text-green-600">
                            ₹{(customer.estimated_revenue || 0).toLocaleString()}
                          </td>
                         <td className="px-6 py-4 text-center">
                            <button className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {expandedPlan.customer_summary && expandedPlan.customer_summary.length > 20 && (
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <div className="text-center text-sm text-gray-500">
                      Showing first 20 customers. Total: {expandedPlan.summary_metrics?.total_customers} customers
                      <button className="ml-2 text-violet-600 hover:text-violet-800 font-medium">
                        View All
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

{/* Project Changes View */}
          {activeView === 'changelog' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">AI Model Input/Output Structure</h3>
                <div className="text-sm text-gray-500">
                  General data structure that AI processes for decision making
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Model Input Structure */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Send className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Model Input Structure</h4>
                          <p className="text-sm text-gray-600">
                            Ultra-compressed customer data fields sent to AI for processing
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          Compressed Data Format
                        </div>
                        <div className="text-xs text-gray-500">
                          createUltraCompressedInput()
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Customer Data Fields */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Database className="h-4 w-4 text-blue-600" />
                          <h5 className="font-medium text-gray-900">Customer Data Fields</h5>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">tier_code:</span>
                            <span className="font-medium text-blue-800">1-4 (CHAMPION to PROSPECT)</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">area_name:</span>
                            <span className="font-medium text-blue-800">Geographical location</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">tier_score:</span>
                            <span className="font-medium text-blue-800">Monthly revenue / 1000</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">frequency:</span>
                            <span className="font-medium text-blue-800">M3, M2, M1, Q (visit frequency)</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">sales_90d:</span>
                            <span className="font-medium text-blue-800">90-day sales performance</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">days_since_visit:</span>
                            <span className="font-medium text-blue-800">Last visit recency</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">customer_type:</span>
                            <span className="font-medium text-blue-800">D, R, S, C, H (type codes)</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">orders_90d:</span>
                            <span className="font-medium text-blue-800">Order frequency count</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">conversion_rate:</span>
                            <span className="font-medium text-blue-800">Visit to order conversion %</span>
                          </div>
                        </div>
                      </div>

                      {/* Mapping Structures */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Code className="h-4 w-4 text-purple-600" />
                          <h5 className="font-medium text-gray-900">Field Mappings</h5>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                          <div>
                            <span className="text-xs font-medium text-purple-700">Tier Codes:</span>
                            <div className="text-xs text-purple-800 mt-1">
                              1: TIER_1_CHAMPION<br/>
                              2: TIER_2_PERFORMER<br/>
                              3: TIER_3_DEVELOPER<br/>
                              4: TIER_4_PROSPECT
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-purple-700">Customer Types:</span>
                            <div className="text-xs text-purple-800 mt-1">
                              D: Doctor, R: Retailer<br/>
                              S: Stockist, C: Clinic, H: Hospital
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-purple-700">Frequencies:</span>
                            <div className="text-xs text-purple-800 mt-1">
                              M3: Monthly (3 visits)<br/>
                              M2: Monthly (2 visits)<br/>
                              M1: Monthly (1 visit)<br/>
                              Q: Quarterly
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Input Processing Logic */}
                    <div className="mt-4 bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <Brain className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-gray-900">AI Decision Factors</span>
                      </div>
                      <p className="text-sm text-gray-700">AI analyzes tier_score + frequency + days_since_visit + conversion_rate to determine visit priorities, sales_90d + orders_90d for revenue projections, and area_name + customer_type for route optimization</p>
                    </div>
                  </div>
                </div>

                {/* Model Output Structure */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Download className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Model Output Structure</h4>
                          <p className="text-sm text-gray-600">
                            Standardized JSON structure returned by AI for all plans
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          JSON Response Format
                        </div>
                        <div className="text-xs text-gray-500">
                          NEW_PLAN & REVISE_PLAN
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Monthly Overview (mo) */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Target className="h-4 w-4 text-green-600" />
                          <h5 className="font-medium text-gray-900">Monthly Overview (mo)</h5>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">mr:</span>
                            <span className="font-medium text-green-800">MR Name</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">m:</span>
                            <span className="font-medium text-green-800">Month number (1-12)</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">y:</span>
                            <span className="font-medium text-green-800">Year</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">tv:</span>
                            <span className="font-medium text-green-800">Total visits planned</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">tr:</span>
                            <span className="font-medium text-green-800">Target revenue (₹)</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">wd:</span>
                            <span className="font-medium text-green-800">Working days count</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">summary:</span>
                            <span className="font-medium text-green-800">Strategic focus description</span>
                          </div>
                        </div>
                      </div>

                      {/* Weekly Structure (ws) */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <h5 className="font-medium text-gray-900">Weekly Structure (ws)</h5>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">dates:</span>
                            <span className="font-medium text-blue-800">Week date range array</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">customers:</span>
                            <span className="font-medium text-blue-800">Customer count for week</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">revenue_target:</span>
                            <span className="font-medium text-blue-800">Weekly revenue target (₹)</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">focus:</span>
                            <span className="font-medium text-blue-800">Week strategic focus</span>
                          </div>
                        </div>
                        
                        <div className="bg-yellow-50 rounded-lg p-3">
                          <div className="text-xs text-yellow-800">
                            <strong>Example Focus Values:</strong><br/>
                            • "TIER_2 relationship strengthening"<br/>
                            • "New prospect development"<br/>
                            • "Territory expansion"<br/>
                            • "Month-end target achievement"
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Customer Visit Schedule (cvs) */}
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <h5 className="font-medium text-gray-900">Customer Visit Schedule (cvs)</h5>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-sm text-purple-800">
                          <strong>Structure:</strong> {"{"}"CUST001": ["0107", "1507", "2907"], "CUST002": ["0207", "1607"]{"}"}<br/>
                          <strong>Format:</strong> Customer_Code → Array of visit dates (DDMM format)<br/>
                          <strong>Validation:</strong> No Sunday dates, optimized geographical grouping
                        </div>
                      </div>
                    </div>

                    {/* Output Decision Logic */}
                    <div className="mt-4 bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <Zap className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-gray-900">AI Output Logic</span>
                      </div>
                      <p className="text-sm text-gray-700">AI generates revenue_target based on tier_score patterns, creates focus themes from customer_type distribution, schedules visits using frequency mappings, and optimizes cvs dates by area_name clustering while avoiding Sundays</p>
                    </div>
                  </div>
                </div>

                {/* Processing Flow */}
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-6 border border-violet-200">
                  <h4 className="font-semibold text-violet-900 mb-4">🔄 AI Processing Flow</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-violet-800">
                    <div className="space-y-2">
                      <h5 className="font-medium flex items-center">
                        <ArrowRight className="h-4 w-4 mr-1" />
                        Input Analysis
                      </h5>
                      <ul className="space-y-1 text-xs">
                        <li>• Parse compressed customer fields</li>
                        <li>• Apply tier_code prioritization</li>
                        <li>• Calculate visit frequencies</li>
                        <li>• Analyze performance patterns</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium flex items-center">
                        <ArrowRight className="h-4 w-4 mr-1" />
                        Decision Making
                      </h5>
                      <ul className="space-y-1 text-xs">
                        <li>• Generate revenue targets (tr)</li>
                        <li>• Create weekly focus themes</li>
                        <li>• Optimize visit scheduling</li>
                        <li>• Apply geographical grouping</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium flex items-center">
                        <ArrowRight className="h-4 w-4 mr-1" />
                        Output Generation
                      </h5>
                      <ul className="space-y-1 text-xs">
                        <li>• Structure mo, ws, cvs format</li>
                        <li>• Validate Sunday constraints</li>
                        <li>• Ensure JSON compliance</li>
                        <li>• Return standardized response</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

                   {/* No Plan Selected State */}
          {!selectedPlanMR && activeView !== 'overview' && activeView !== 'ai-planner' && activeView !== 'changelog' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Plan Selected</h3>
              <p className="text-gray-600 mb-4">Select an MR from the Overview tab to view plan details</p>
              <button
                onClick={() => setActiveView('overview')}
                className="inline-flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Go to Overview
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer with Plan Info */}
      {monthlyPlan && selectedPlanMR && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 text-sm text-gray-600">
            <div className="flex flex-wrap items-center gap-4">
              <span>MR: <span className="font-medium text-gray-900">{selectedPlanMR}</span></span>
              <span>Plan ID: <span className="font-medium text-gray-900">{monthlyPlan.id}</span></span>
              <span>Version: <span className="font-medium text-gray-900">{monthlyPlan.plan_version}</span></span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <span>Generated: <span className="font-medium text-gray-900">{new Date(monthlyPlan.generated_at).toLocaleDateString()}</span></span>
              <span>Tokens: <span className="font-medium text-gray-900">{monthlyPlan.tokens_used || 'N/A'}</span></span>
            </div>
          </div>
        </div>
      )}

     {/* Batch Processing Modal - SELECTION ONLY */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Layers className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Select MRs for Batch Processing</h2>
                    <p className="text-sm text-gray-600">Choose which MRs you want to include in the batch</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBatchModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Month/Year Selection */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-3">Planning Period</h3>
                  <div className="flex items-center space-x-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-1">Month</label>
                      <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="border border-blue-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {monthNames.slice(1).map((month, index) => (
                          <option key={index + 1} value={index + 1}>{month}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-1">Year</label>
                      <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="border border-blue-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* MR Selection */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">Select MRs</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedMRsForBatch([...filteredMRs])}
                        className="text-sm text-violet-600 hover:text-violet-800 font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => setSelectedMRsForBatch([])}
                        className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Search Filter */}
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search MRs by name, territory, or employee ID..."
                        value={mrSearchFilter}
                        onChange={(e) => setMrSearchFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* MR Loading State */}
                  {mrLoading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      <span className="ml-2 text-gray-600">Loading MRs...</span>
                    </div>
                  )}

                  {/* MR Error State */}
                  {mrError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-900">Error loading MRs</span>
                      </div>
                      <p className="text-sm text-red-700 mt-1">{mrError}</p>
                    </div>
                  )}

                  {/* MR Grid */}
                  {!mrLoading && !mrError && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                      {filteredMRs.map((mr) => {
                        const isSelected = selectedMRsForBatch.some(selected => selected.id === mr.id);
                        
                        return (
                          <div
                            key={mr.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedMRsForBatch(selectedMRsForBatch.filter(selected => selected.id !== mr.id));
                              } else {
                                setSelectedMRsForBatch([...selectedMRsForBatch, mr]);
                              }
                            }}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-violet-500 bg-violet-50' 
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected ? 'border-violet-500 bg-violet-500' : 'border-gray-300'
                              }`}>
                                {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{mr.name}</div>
                                <div className="text-sm text-gray-600">ID: {mr.employee_id}</div>
                                {mr.territory && (
                                  <div className="text-sm text-gray-600">{mr.territory}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* No MRs Found */}
                  {!mrLoading && !mrError && filteredMRs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No MRs found matching your search criteria</p>
                    </div>
                  )}
                </div>

                {/* Selection Information */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-yellow-900">Selection Information</h4>
                      <div className="mt-2 text-sm text-yellow-800 space-y-1">
                        <p>• This window is for MR selection only</p>
                        <p>• Click "Confirm Selection" to close and return to AI Planner</p>
                        <p>• Then click "Start Processing" to begin batch generation</p>
                        <p>• Processing time: approximately 2-5 minutes per MR</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selection Summary */}
                {selectedMRsForBatch.length > 0 && (
                  <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                    <h4 className="font-medium text-violet-900 mb-2">Current Selection</h4>
                    <div className="text-sm text-violet-800 space-y-1">
                      <p>Selected MRs: <span className="font-medium">{selectedMRsForBatch.length}</span></p>
                      <p>Period: <span className="font-medium">{monthNames[selectedMonth]} {selectedYear}</span></p>
                      <p>Estimated time: <span className="font-medium">{selectedMRsForBatch.length * 3}-{selectedMRsForBatch.length * 5} minutes</span></p>
                    </div>
                    
                    {/* Selected MRs Preview */}
                    <div className="mt-3">
                      <p className="text-sm font-medium text-violet-900 mb-2">Selected MRs:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMRsForBatch.slice(0, 8).map((mr) => (
                          <span key={mr.id} className="inline-flex items-center px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded-full">
                            {mr.name}
                          </span>
                        ))}
                        {selectedMRsForBatch.length > 8 && (
                          <span className="inline-flex items-center px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded-full">
                            +{selectedMRsForBatch.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer - SELECTION ONLY */}
            <div className="p-6 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedMRsForBatch.length} MR{selectedMRsForBatch.length !== 1 ? 's' : ''} selected from {filteredMRs.length} available
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowBatchModal(false);
                    // Just close modal - DON'T start processing here
                  }}
                  className="flex items-center space-x-2 px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm Selection ({selectedMRsForBatch.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
  </div>
  );
};

export default EnhancedMonthlyPlanningDashboard;
