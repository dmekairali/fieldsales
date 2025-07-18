// src/App.js - Updated with Authentication Integration
import React, { useState, useEffect } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import authService from './services/AuthService';
import MonthlyPlanDashboardV2 from './components/MonthlyPlanDashboardV2';
import EmergencyDashboard from './components/EmergencyDashboard';
import GeocodingDashboard from './components/GeocodingDashboard';
import { 
  BarChart3, 
  Users, 
  MapPin, 
  Settings, 
  LogOut, 
  User,
  Shield,
  Building,
  Calendar
} from 'lucide-react';

// Navigation items with access control
const getNavigationItems = (userAccessLevel) => {
  const allItems = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'Main dashboard overview',
      icon: BarChart3,
      color: 'blue',
      requiredAccess: 'viewer',
      component: 'DashboardOverview'
    },
    {
      id: 'monthly-planning',
      name: 'Monthly Planning',
      description: 'AI-powered monthly tour planning',
      icon: Calendar,
      color: 'violet',
      requiredAccess: 'mr',
      component: 'MonthlyPlanDashboardV2'
    },
    {
      id: 'emergency',
      name: 'Emergency Dashboard',
      description: 'Zero ROI territories analysis',
      icon: Users,
      color: 'red',
      requiredAccess: 'manager',
      component: 'EmergencyDashboard'
    },
    {
      id: 'geocoding',
      name: 'Geocoding',
      description: 'Customer location management',
      icon: MapPin,
      color: 'green',
      requiredAccess: 'admin',
      component: 'GeocodingDashboard'
    },
    {
      id: 'settings',
      name: 'Settings',
      description: 'System configuration',
      icon: Settings,
      color: 'gray',
      requiredAccess: 'admin',
      component: 'Settings'
    }
  ];

  // Filter items based on user access level
  const levelHierarchy = {
    'viewer': 1,
    'mr': 2,
    'manager': 3,
    'admin': 4
  };

  const userLevelNum = levelHierarchy[userAccessLevel] || 0;

  return allItems.filter(item => {
    const requiredLevelNum = levelHierarchy[item.requiredAccess] || 0;
    return userLevelNum >= requiredLevelNum;
  });
};

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = authService.onAuthStateChange((event, userData) => {
      if (event === 'SIGNED_IN') {
        setCurrentUser(userData);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setActiveTab('dashboard'); // Reset to default tab
      }
    });

    return () => unsubscribe();
  }, []);

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

  const renderComponent = () => {
    switch (activeTab) {
      case 'monthly-planning':
        return <MonthlyPlanDashboardV2 />;
      case 'emergency':
        return <EmergencyDashboard />;
      case 'geocoding':
        return <GeocodingDashboard />;
      case 'settings':
        return <SettingsComponent />;
      default:
        return <DashboardOverview user={currentUser} />;
    }
  };

  return (
    <ProtectedRoute requiredAccess="viewer">
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="font-bold text-gray-900">Field Sales</h1>
                  <p className="text-xs text-gray-500">Dashboard</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {currentUser && getNavigationItems(currentUser.profile?.access_level).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  title={sidebarCollapsed ? item.name : ''}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <div className="ml-3 flex-1 min-w-0 text-left">
                      <div className="font-medium text-sm truncate">{item.name}</div>
                      <div className="text-xs text-gray-500 truncate">{item.description}</div>
                    </div>
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
                    <Building className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-600 truncate">
                      {currentUser.profile.assigned_territories.slice(0, 2).join(', ')}
                      {currentUser.profile.assigned_territories.length > 2 && '...'}
                    </span>
                  </div>
                )}

                {/* Sign Out Button */}
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
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <BarChart3 className="h-5 w-5 text-gray-600" />
                </button>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {getNavigationItems(currentUser?.profile?.access_level || 'viewer')
                      .find(item => item.id === activeTab)?.name || 'Dashboard'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Welcome back, {currentUser?.profile?.full_name || 'User'}
                  </p>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {currentUser?.profile?.mr_name || currentUser?.profile?.full_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    Last login: {currentUser?.profile?.last_login 
                      ? new Date(currentUser.profile.last_login).toLocaleDateString()
                      : 'Never'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <main className="flex-1 overflow-auto p-6">
            {renderComponent()}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
};

// Dashboard Overview Component
const DashboardOverview = ({ user }) => (
  <div className="space-y-6">
    <div className="text-center py-20">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
        <BarChart3 className="h-10 w-10 text-white" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Field Sales Dashboard</h2>
      <p className="text-gray-600 text-lg mb-8">
        Hello {user?.profile?.full_name}, you're signed in as {user?.profile?.access_level}
      </p>
      
      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600 mb-2">
            {user?.profile?.assigned_territories?.length || 0}
          </div>
          <div className="text-sm text-gray-600">Assigned Territories</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600 mb-2">
            {user?.profile?.access_level?.toUpperCase() || 'UNKNOWN'}
          </div>
          <div className="text-sm text-gray-600">Access Level</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-purple-600 mb-2">
            {user?.profile?.employee_id || 'N/A'}
          </div>
          <div className="text-sm text-gray-600">Employee ID</div>
        </div>
      </div>
    </div>
  </div>
);

// Settings Component Placeholder
const SettingsComponent = () => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-gray-900">Settings</h3>
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <p className="text-gray-600">Settings component will be implemented here.</p>
    </div>
  </div>
);

export default App;
