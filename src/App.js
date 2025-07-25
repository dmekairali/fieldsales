// App.js - Complete Integration with Authentication and Settings Dropdown Logout

import React, { useState, useEffect, useRef } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import authService from './services/AuthService';
import EmergencyDashboard from './components/EmergencyDashboard';
import VisitQualityMonitor from './components/VisitQualityMonitor';
import NBDPerformanceDashboard from './components/NBDPerformanceDashboard';
import RouteOptimizationDashboard from './components/RouteOptimizationDashboard';
import GeocodingDashboard from './components/GeocodingDashboard';
import MonthlyPlanDashboardV2 from './components/MonthlyPlanDashboardV2';
import WeeklyRevisionDashboard from './components/WeeklyRevisionDashboard';
import SalesPerformanceDashboard from './components/SalesPerformanceDashboard';
import LiveTracker from './components/LiveTracker';
import LostAnalysis from './components/LostAnalysis';
import CriticalParameters from './components/CriticalParameters';
import FiveForFive from './components/FiveForFive';


import { useMedicalRepresentatives } from './hooks/useMedicalRepresentatives';
import './index.css';
import { 
  Calendar, 
  TrendingUp, 
  MapPin, 
  AlertTriangle, 
  BarChart3, 
  Users, 
  Settings, 
  Target,
  Activity,
  DollarSign,
  Navigation,
  FileText,
  Bell,
  User,
  ChevronDown,
  Search,
  Filter,
  LogOut,
  Shield
} from 'lucide-react';

// Settings Dropdown Component
const SettingsDropdown = ({ currentUser, onSignOut }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getAccessLevelDisplay = (level) => {
    const levels = {
      'admin': { label: 'Administrator', color: 'text-red-600', bgColor: 'bg-red-100' },
      'manager': { label: 'Manager', color: 'text-purple-600', bgColor: 'bg-purple-100' },
      'mr': { label: 'Medical Representative', color: 'text-blue-600', bgColor: 'bg-blue-100' },
      'viewer': { label: 'Viewer', color: 'text-green-600', bgColor: 'bg-green-100' }
    };
    return levels[level] || { label: level, color: 'text-gray-600', bgColor: 'bg-gray-100' };
  };

  const accessLevel = getAccessLevelDisplay(currentUser?.profile?.access_level);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Settings Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-colors ${
          isOpen 
            ? 'text-blue-600 bg-blue-100' 
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Settings className="h-4 w-4 lg:h-5 lg:w-5" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Settings & Account</h3>
            </div>
          </div>

          {/* User Info Section */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-violet-600 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {currentUser?.profile?.full_name || 'Unknown User'}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {currentUser?.profile?.email || 'No email'}
                </div>
              </div>
            </div>
            
            {/* Access Level & ID */}
            <div className="mt-3 flex items-center justify-between">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${accessLevel.color} ${accessLevel.bgColor}`}>
                <Shield className="h-3 w-3 mr-1" />
                {accessLevel.label}
              </span>
              <span className="text-xs text-gray-500">
                ID: {currentUser?.profile?.employee_id || 'N/A'}
              </span>
            </div>
          </div>

          {/* Quick Info */}
          <div className="p-4 space-y-3 border-b border-gray-100">
            {/* Territories */}
            {currentUser?.profile?.assigned_territories?.length > 0 && (
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Territories</div>
                  <div className="text-sm text-gray-900 truncate">
                    {currentUser.profile.assigned_territories.slice(0, 2).join(', ')}
                    {currentUser.profile.assigned_territories.length > 2 && 
                      ` (+${currentUser.profile.assigned_territories.length - 2} more)`
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Manager */}
            {currentUser?.profile?.reporting_manager && (
              <div className="flex items-start space-x-2">
                <Users className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Reports To</div>
                  <div className="text-sm text-gray-900 truncate">
                    {currentUser.profile.reporting_manager}
                  </div>
                </div>
              </div>
            )}

            {/* Last Login */}
            {currentUser?.profile?.last_login && (
              <div className="flex items-start space-x-2">
                <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</div>
                  <div className="text-sm text-gray-900">
                    {new Date(currentUser.profile.last_login).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Settings Options */}
          <div className="p-4 space-y-1 border-b border-gray-100">
            <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              <User className="h-4 w-4 text-gray-400" />
              <span>Profile Settings</span>
            </button>
            
            <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              <Bell className="h-4 w-4 text-gray-400" />
              <span>Notifications</span>
            </button>
            
            <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              <Shield className="h-4 w-4 text-gray-400" />
              <span>Privacy & Security</span>
            </button>
            
            <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              <Settings className="h-4 w-4 text-gray-400" />
              <span>App Preferences</span>
            </button>
          </div>

          {/* Sign Out */}
          <div className="p-4">
            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg border border-red-200 transition-all font-medium"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeOverviewTab, setActiveOverviewTab] = useState('dashboard');
  const [selectedMR, setSelectedMR] = useState(null);
  const [selectedMRName, setSelectedMRName] = useState('ALL_MRS');
  const [nbdDateRange, setNbdDateRange] = useState(30);
  const [nbdPerformanceFilter, setNbdPerformanceFilter] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Shared state for month/year - used by both Monthly Planning and Weekly Revision
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { 
    mrList, 
    loading: mrLoading, 
    error: mrError, 
    getMRByName,
    totalMRs 
  } = useMedicalRepresentatives();

  // Initialize authentication
  useEffect(() => {
    initializeAuth();
    
    // Listen for auth changes
    const unsubscribe = authService.onAuthStateChange((event, userData) => {
      if (event === 'SIGNED_IN') {
        setCurrentUser(userData);
        setAuthLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setAuthLoading(false);
        setActiveTab('overview'); // Reset to default tab
      }
    });

    return () => unsubscribe();
  }, []);

  const initializeAuth = async () => {
    try {
      setAuthLoading(true);
      await authService.initialize();
      const user = await authService.getCurrentSession();
      
      if (user) {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  // Set default MR when list loads
  useEffect(() => {
    if (mrList.length > 0 && !selectedMR) {
      setSelectedMR(mrList[0]);
    }
  }, [mrList, selectedMR]);

  // Navigation items with access control
  const getNavigationItems = () => {
    const allItems = [
      {
        id: 'overview',
        name: 'Dashboard Overview',
        icon: BarChart3,
        description: 'Key metrics and insights',
        color: 'blue',
        requiredAccess: 'viewer'
      },
      {
        id: 'monthly-planning',
        name: 'Monthly Planning',
        icon: Calendar,
        description: 'AI-powered tour planning',
        color: 'violet',
        badge: 'NEW',
        requiredAccess: 'mr'
      },
      {
        id: 'weekly-revision',
        name: 'Weekly Revision',
        icon: Activity,
        description: 'Performance tracking',
        color: 'green',
        count: 3,
        requiredAccess: 'mr'
      },
      {
        id: 'emergency',
        name: 'Emergency Territory',
        icon: AlertTriangle,
        description: 'Critical territory management',
        color: 'red',
        count: 2,
        requiredAccess: 'manager'
      },
      {
        id: 'quality',
        name: 'Visit Quality',
        icon: Target,
        description: 'Quality monitoring',
        color: 'purple',
        count: 5,
        requiredAccess: 'mr'
      },
      {
        id: 'nbd',
        name: 'NBD Performance',
        icon: TrendingUp,
        description: 'New business development',
        color: 'emerald',
        requiredAccess: 'mr'
      },
      {
        id: 'routes',
        name: 'Route Optimization',
        icon: Navigation,
        description: 'AI route planning',
        color: 'blue',
        requiredAccess: 'mr'
      },
      {
        id: 'analytics',
        name: 'Analytics',
        icon: BarChart3,
        description: 'Performance insights',
        color: 'indigo',
        requiredAccess: 'manager'
      },
      {
        id: 'geocoding',
        name: 'Geocoding',
        icon: MapPin,
        description: 'GPS management',
        color: 'teal',
        requiredAccess: 'admin'
      },
      {
        id: 'reports',
        name: 'Reports',
        icon: FileText,
        description: 'Territory reports',
        color: 'amber',
        requiredAccess: 'viewer'
      }
    ];

    // Filter based on user access level
    if (!currentUser?.profile?.access_level) return allItems;

    const levelHierarchy = {
      'viewer': 1,
      'mr': 2,
      'manager': 3,
      'admin': 4
    };

    const userLevelNum = levelHierarchy[currentUser.profile.access_level] || 0;

    return allItems.filter(item => {
      const requiredLevelNum = levelHierarchy[item.requiredAccess] || 0;
      return userLevelNum >= requiredLevelNum;
    });
  };

  const handleMRChange = (e) => {
    const selectedValue = e.target.value;
    setSelectedMRName(selectedValue);
    
    if (selectedValue === 'ALL_MRS') {
      setSelectedMR(null);
    } else {
      const mrData = getMRByName(selectedValue);
      setSelectedMR(mrData);
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const getAccessLevelDisplay = (level) => {
    const levels = {
      'admin': { label: 'Administrator', color: 'text-red-600 bg-red-100' },
      'manager': { label: 'Manager', color: 'text-purple-600 bg-purple-100' },
      'mr': { label: 'Medical Representative', color: 'text-blue-600 bg-blue-100' },
      'viewer': { label: 'Viewer', color: 'text-green-600 bg-green-100' }
    };
    return levels[level] || { label: level, color: 'text-gray-600 bg-gray-100' };
  };

  const getIconColor = (color, isActive) => {
    const colors = {
      blue: isActive ? 'text-blue-600' : 'text-gray-400',
      violet: isActive ? 'text-violet-600' : 'text-gray-400',
      green: isActive ? 'text-green-600' : 'text-gray-400',
      red: isActive ? 'text-red-600' : 'text-gray-400',
      purple: isActive ? 'text-purple-600' : 'text-gray-400',
      emerald: isActive ? 'text-emerald-600' : 'text-gray-400',
      indigo: isActive ? 'text-indigo-600' : 'text-gray-400',
      teal: isActive ? 'text-teal-600' : 'text-gray-400',
      amber: isActive ? 'text-amber-600' : 'text-gray-400'
    };
    return colors[color] || 'text-gray-400';
  };

  const getBadgeColor = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-700',
      violet: 'bg-violet-100 text-violet-700',
      green: 'bg-green-100 text-green-700',
      red: 'bg-red-100 text-red-700',
      purple: 'bg-purple-100 text-purple-700',
      emerald: 'bg-emerald-100 text-emerald-700',
      indigo: 'bg-indigo-100 text-indigo-700',
      teal: 'bg-teal-100 text-teal-700',
      amber: 'bg-amber-100 text-amber-700'
    };
    return colors[color] || 'bg-gray-100 text-gray-700';
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div>
            <div className="flex border-b">
              <button
                onClick={() => setActiveOverviewTab('live-tracker')}
                className={`py-2 px-4 ${activeOverviewTab === 'live-tracker' ? 'border-b-2 border-blue-500' : ''}`}
              >
                Live Tracker
              </button>
              <button
                onClick={() => setActiveOverviewTab('dashboard')}
                className={`py-2 px-4 ${activeOverviewTab === 'dashboard' ? 'border-b-2 border-blue-500' : ''}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveOverviewTab('lost-analysis')}
                className={`py-2 px-4 ${activeOverviewTab === 'lost-analysis' ? 'border-b-2 border-blue-500' : ''}`}
              >
                Lost Analysis
              </button>
              <button
                onClick={() => setActiveOverviewTab('critical-parameters')}
                className={`py-2 px-4 ${activeOverviewTab === 'critical-parameters' ? 'border-b-2 border-blue-500' : ''}`}
              >
                Critical Parameters
              </button>
              <button
                onClick={() => setActiveOverviewTab('5-for-5')}
                className={`py-2 px-4 ${activeOverviewTab === '5-for-5' ? 'border-b-2 border-blue-500' : ''}`}
              >
                5 for 5
              </button>
            </div>
            {activeOverviewTab === 'live-tracker' && <LiveTracker />}
            {activeOverviewTab === 'dashboard' && <SalesPerformanceDashboard />}
            {activeOverviewTab === 'lost-analysis' && <LostAnalysis />}
            {activeOverviewTab === 'critical-parameters' && <CriticalParameters />}
            {activeOverviewTab === '5-for-5' && <FiveForFive />}
          </div>
        );

      case 'monthly-planning':
        return (
          <MonthlyPlanDashboardV2
            selectedMR={selectedMR}
            selectedMRName={selectedMRName}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
          />
        );
      
      case 'weekly-revision':
        return (
          <WeeklyRevisionDashboard 
            mrName={selectedMRName !== 'ALL_MRS' ? selectedMRName : null}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            mrData={selectedMR}
            onRevisionComplete={(result) => {
              console.log('✅ Revision completed:', result);
            }}
          />
        );
      
      case 'emergency':
        return <EmergencyDashboard />;
      
      case 'quality':
        return <VisitQualityMonitor mrName={selectedMRName === 'ALL_MRS' ? null : selectedMRName} />;
      
      case 'nbd':
        return <NBDPerformanceDashboard 
          mrName={selectedMRName === 'ALL_MRS' ? null : selectedMRName}
          dateRange={nbdDateRange}
          performanceFilter={nbdPerformanceFilter}
        />;
      
      case 'routes':
        return <RouteOptimizationDashboard mrName={selectedMR?.name} mrData={selectedMR} />;
      
      case 'geocoding':
        return <GeocodingDashboard />;
      
      case 'analytics':
        return <AnalyticsView selectedMR={selectedMR} selectedMRName={selectedMRName} />;
      
      case 'reports':
        return <ReportsView selectedMR={selectedMR} selectedMRName={selectedMRName} />;
      
      default:
        return <EmergencyDashboard />;
    }
  };

  // Show loading while checking auth
  if (authLoading || mrLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading TourPlan Pro</h2>
          <p className="text-gray-600">
            {authLoading ? 'Verifying authentication...' : 'Connecting to territory management system...'}
          </p>
        </div>
      </div>
    );
  }

  if (mrError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md border border-gray-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{mrError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const navigationItems = getNavigationItems();

  return (
    <ProtectedRoute requiredAccess="viewer">
      <div className="min-h-screen bg-gray-50 overflow-x-hidden">
        {/* Sidebar */}
        <div className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-30 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}>
          {/* Logo & Collapse Button */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-violet-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">TP</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="font-bold text-gray-900 truncate">TourPlan Pro</h1>
                  <p className="text-xs text-gray-500 truncate">Territory Management</p>
                </div>
              </div>
            )}
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${sidebarCollapsed ? 'rotate-90' : '-rotate-90'}`} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-3 py-2.5 text-left rounded-lg transition-all duration-200 group ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  title={sidebarCollapsed ? item.name : ''}
                >
                  <Icon className={`h-5 w-5 ${getIconColor(item.color, isActive)} transition-colors flex-shrink-0`} />
                  {!sidebarCollapsed && (
                    <>
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.name}</div>
                        <div className="text-xs text-gray-500 truncate">{item.description}</div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {item.badge && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-700 rounded-full">
                            {item.badge}
                          </span>
                        )}
                        {item.count && (
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getBadgeColor(item.color)}`}>
                            {item.count}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200">
            {currentUser && (
              <div className="space-y-3">
                {/* User Info */}
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {currentUser.profile?.full_name || 'Unknown User'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {currentUser.profile?.employee_id || 'No ID'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Access Level Badge */}
                {!sidebarCollapsed && currentUser.profile?.access_level && (
                  <div className="flex items-center space-x-2">
                    <Shield className="h-3 w-3 text-gray-400" />
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getAccessLevelDisplay(currentUser.profile.access_level).color}`}>
                      {getAccessLevelDisplay(currentUser.profile.access_level).label}
                    </span>
                  </div>
                )}

                {/* Territory Info */}
                {!sidebarCollapsed && currentUser.profile?.assigned_territories?.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-600 truncate">
                      {currentUser.profile.assigned_territories.slice(0, 2).join(', ')}
                      {currentUser.profile.assigned_territories.length > 2 && '...'}
                    </span>
                  </div>
                )}

                {/* Sign Out Button - Backup in sidebar */}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={sidebarCollapsed ? 'Sign Out' : ''}
                >
                  <LogOut className="h-4 w-4" />
                  {!sidebarCollapsed && <span>Sign Out</span>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
          {/* Fixed Top Section */}
          <div className="fixed top-0 right-0 bg-white border-b border-gray-200 z-20" style={{ left: sidebarCollapsed ? '64px' : '256px' }}>
            {/* Top Header */}
            <header className="h-16 flex items-center justify-between px-4 lg:px-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg lg:text-xl font-bold text-gray-900 truncate">
                  {navigationItems.find(item => item.id === activeTab)?.name || 'Dashboard'}
                </h2>
                <div className="hidden lg:flex items-center space-x-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date().toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}</span>
                </div>
              </div>

             <div className="flex items-center space-x-2 lg:space-x-4">
                {/* MR Selector */}
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <label className="hidden lg:block text-sm font-medium text-gray-700">Medical Rep:</label>
                  <select 
                    value={selectedMRName} 
                    onChange={handleMRChange}
                    className="bg-white border border-gray-300 rounded-lg px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent w-32 lg:min-w-48"
                    disabled={mrList.length === 0}
                  >
                    <option value="ALL_MRS">All MRs ({totalMRs})</option>
                    {mrList.length === 0 ? (
                      <option value="">No MRs Available</option>
                    ) : (
                      mrList.map((mr) => (
                        <option key={mr.id} value={mr.name}>
                          {mr.name} ({mr.employee_id})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Month/Year Selectors - Show for Monthly Planning and Weekly Revision */}
                {(activeTab === 'monthly-planning' || activeTab === 'weekly-revision') && (
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="bg-white border border-gray-300 rounded-lg px-2 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {monthNames.slice(1).map((month, index) => (
                        <option key={index + 1} value={index + 1}>
                          {month}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="bg-white border border-gray-300 rounded-lg px-2 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {[2024, 2025, 2026].map(year => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* User Welcome */}
                <div className="hidden lg:flex items-center space-x-2 text-sm">
                  <span className="text-gray-600">Welcome,</span>
                  <span className="font-medium text-gray-900">
                    {currentUser?.profile?.full_name || 'User'}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-1 lg:space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <Search className="h-4 w-4 lg:h-5 lg:w-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <Bell className="h-4 w-4 lg:h-5 lg:w-5" />
                  </button>
                  
                  {/* Settings Dropdown with Logout */}
                  <SettingsDropdown 
                    currentUser={currentUser} 
                    onSignOut={handleSignOut}
                  />
                </div>
              </div>
            </header>

            {/* MR Details Bar */}
            {selectedMR && selectedMRName !== 'ALL_MRS' && (
              <div className="bg-gradient-to-r from-blue-50 to-violet-50 border-b border-blue-100 px-4 lg:px-6 py-3">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-2 lg:space-y-0">
                  <div className="flex flex-wrap items-center gap-3 lg:gap-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-semibold text-gray-900 text-sm lg:text-base">{selectedMR.name}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:gap-4 text-xs lg:text-sm">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 lg:h-4 lg:w-4 text-gray-500" />
                        <span className="text-gray-700">{selectedMR.territory}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Target className="h-3 w-3 lg:h-4 lg:w-4 text-gray-500" />
                        <span className="text-gray-700">₹{selectedMR.monthly_target?.toLocaleString() || 'N/A'}</span>
                      </div>
                      {selectedMR.manager_name && (
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3 lg:h-4 lg:w-4 text-gray-500" />
                          <span className="text-gray-700">{selectedMR.manager_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 lg:space-x-3 text-xs lg:text-sm text-gray-600">
                    <span>Joined: {selectedMR.joining_date ? new Date(selectedMR.joining_date).toLocaleDateString() : 'N/A'}</span>
                    <span className="hidden lg:inline">•</span>
                    <span>ID: {selectedMR.employee_id}</span>
                    {(activeTab === 'monthly-planning' || activeTab === 'weekly-revision') && (
                      <>
                        <span className="hidden lg:inline">•</span>
                        <span>{monthNames[selectedMonth]} {selectedYear}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* All MRs Summary */}
            {selectedMRName === 'ALL_MRS' && (
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100 px-4 lg:px-6 py-3">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-2 lg:space-y-0">
                  <div className="flex items-center space-x-2 lg:space-x-4">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                      <span className="font-semibold text-gray-900 text-sm lg:text-base">Comprehensive Analysis</span>
                    </div>
                    <span className="text-gray-600 text-xs lg:text-sm">Viewing all {totalMRs} active Medical Representatives</span>
                  </div>
                  <div className="flex items-center space-x-2 lg:space-x-4 text-xs lg:text-sm text-gray-600">
                    <span>Total Territories: {totalMRs}</span>
                    <span className="hidden lg:inline">•</span>
                    <span>System-wide Overview</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tab Content with proper top spacing */}
          <main className="pt-32 lg:pt-28 p-4 lg:p-6">
            {renderTabContent()}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}



// Analytics View Component  
const AnalyticsView = ({ selectedMR, selectedMRName }) => (
  <div className="space-y-6">
    <div className="text-center py-20">
      <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
        <BarChart3 className="h-10 w-10 text-white" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Advanced Analytics</h2>
      <p className="text-gray-600 text-lg mb-8">
        Comprehensive performance insights and predictive analytics
      </p>
      <div className="bg-indigo-50 rounded-xl p-6 max-w-md mx-auto border border-indigo-200">
        <h3 className="font-semibold text-indigo-900 mb-2">Coming Soon</h3>
        <p className="text-indigo-700 text-sm">
          Advanced analytics dashboard with trends and forecasting
        </p>
      </div>
    </div>
  </div>
);

// Reports View Component
const ReportsView = ({ selectedMR, selectedMRName }) => (
  <div className="space-y-6">
    <div className="text-center py-20">
      <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
        <FileText className="h-10 w-10 text-white" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Reports Center</h2>
      <p className="text-gray-600 text-lg mb-8">
        Comprehensive reports and data exports
      </p>
      <div className="bg-amber-50 rounded-xl p-6 max-w-md mx-auto border border-amber-200">
        <h3 className="font-semibold text-amber-900 mb-2">Coming Soon</h3>
        <p className="text-amber-700 text-sm">
          Advanced reporting system with custom exports
        </p>
      </div>
    </div>
  </div>
);

export default App;
