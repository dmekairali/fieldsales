// App.js - Updated with new sidebar
import React, { useState, useEffect } from 'react';
import TourPlanSidebar from './components/TourPlanSidebar'; // Import the new sidebar
import MonthlyTourPlanDashboard from './components/MonthlyTourPlanDashboard';
import EmergencyDashboard from './components/EmergencyDashboard';
import VisitQualityMonitor from './components/VisitQualityMonitor';
// ... other imports

function App() {
  const [activeTab, setActiveTab] = useState('monthly-planning');
  const [selectedMR, setSelectedMR] = useState(null);
  const [selectedMRName, setSelectedMRName] = useState('ALL_MRS');
  // ... other state variables

  // Handle sidebar navigation
  const handleSidebarNavigation = (path) => {
    const tabMapping = {
      '/dashboard': 'dashboard',
      '/monthly-planning': 'monthly-tour',
      '/weekly-revision': 'weekly-revision',
      '/performance': 'analytics',
      '/emergency': 'emergency',
      '/visit-quality': 'quality',
      '/nbd-performance': 'nbd',
      '/reports': 'reports',
      '/settings': 'settings'
    };
    
    const newTab = tabMapping[path] || 'dashboard';
    setActiveTab(newTab);
  };

  // ... existing useEffect and functions

  if (mrLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md border border-gray-200">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading Medical Representatives...</p>
        </div>
      </div>
    );
  }

  if (mrError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md border border-gray-200">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Database Connection Error</h2>
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* New Sidebar Component */}
      <TourPlanSidebar 
        onNavigate={handleSidebarNavigation}
        activeItem={activeTab}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header with MR Selector */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getPageTitle(activeTab)}
              </h1>
              <p className="text-gray-600 text-sm">
                Advanced field sales analytics and territory management
              </p>
            </div>
            
            {/* MR Selector */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-gray-700 font-medium text-sm">Active MR:</label>
                <select 
                  value={selectedMRName} 
                  onChange={handleMRChange}
                  className="bg-white border border-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-48 text-sm"
                  disabled={mrList.length === 0}
                >
                  <option value="ALL_MRS">All MRs ({totalMRs})</option>
                  {mrList.map((mr) => (
                    <option key={mr.id} value={mr.name}>
                      {mr.name} - {mr.territory}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedMR && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <div className="text-xs text-blue-600 font-medium">
                    {selectedMR.territory} | Target: ₹{selectedMR.monthly_target?.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );

  // Helper function to get page title
  function getPageTitle(tab) {
    const titles = {
      'dashboard': 'Dashboard Overview',
      'monthly-tour': 'Monthly Planning',
      'weekly-revision': 'Weekly Revision',
      'analytics': 'Performance Analytics',
      'emergency': 'Emergency Territory',
      'quality': 'Visit Quality Analysis',
      'nbd': 'NBD Performance',
      'reports': 'Reports & Analytics',
      'settings': 'Settings'
    };
    return titles[tab] || 'Dashboard';
  }

  // Your existing renderTabContent function stays the same
  function renderTabContent() {
    switch (activeTab) {
      case 'emergency':
        return <EmergencyDashboard />;
      case 'quality':
        return <VisitQualityMonitor mrName={selectedMRName === 'ALL_MRS' ? null : selectedMRName} />;
      case 'monthly-tour':
        return <MonthlyTourPlanDashboard mrName={selectedMR?.name} mrData={selectedMR} />;
      // ... other cases
      default:
        return <div>Select a tab</div>;
    }
  }

  // ... rest of your existing functions
}
