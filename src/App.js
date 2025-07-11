import React, { useState, useEffect } from 'react';
import TourPlanSidebar from './components/TourPlanSidebar';
import MonthlyTourPlanDashboard from './components/MonthlyTourPlanDashboard';
import MonthlyPlanningDashboard from './components/MonthlyPlanningDashboard'; // Add this import
import EmergencyDashboard from './components/EmergencyDashboard';
import VisitQualityMonitor from './components/VisitQualityMonitor';
import NBDPerformanceDashboard from './components/NBDPerformanceDashboard';
import RouteOptimizationDashboard from './components/RouteOptimizationDashboard';
import AITourPlanDashboard from './components/AITourPlanDashboard';
import GeocodingDashboard from './components/GeocodingDashboard';
import { useMedicalRepresentatives } from './hooks/useMedicalRepresentatives';

function App() {
  const [activeTab, setActiveTab] = useState('monthly-tour');
  const [selectedMR, setSelectedMR] = useState(null);
  const [selectedMRName, setSelectedMRName] = useState('ALL_MRS');
  
  const { mrList, loading: mrLoading, error: mrError, totalMRs } = useMedicalRepresentatives();

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

  const handleMRChange = (e) => {
    const selectedValue = e.target.value;
    setSelectedMRName(selectedValue);
    
    if (selectedValue === 'ALL_MRS') {
      setSelectedMR(null);
    } else {
      const mrData = mrList.find(mr => mr.name === selectedValue);
      setSelectedMR(mrData);
    }
  };

  // Helper function to get page title
  const getPageTitle = (tab) => {
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
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'emergency':
        return <EmergencyDashboard />;
      case 'quality':
        return <VisitQualityMonitor mrName={selectedMRName === 'ALL_MRS' ? null : selectedMRName} />;
      case 'nbd':
        return <NBDPerformanceDashboard 
          mrName={selectedMRName === 'ALL_MRS' ? null : selectedMRName}
        />;
      case 'routes':
        return <RouteOptimizationDashboard mrName={selectedMR?.name} mrData={selectedMR} />;
      case 'ai-tour':
        return <AITourPlanDashboard mrName={selectedMR?.name} mrData={selectedMR} />;
      case 'monthly-tour':
        return <MonthlyPlanningDashboard />; // Use the new component
      case 'geocoding':
        return <GeocodingDashboard />;
      case 'settings':
        return (
          <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
                <p className="text-gray-600">Dashboard configuration options coming soon...</p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-20">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Dashboard Overview</h2>
                <p className="text-gray-600 text-lg">Select a module from the sidebar to get started</p>
              </div>
            </div>
          </div>
        );
    }
  };

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
      {/* Sidebar */}
      <TourPlanSidebar 
        onNavigate={handleSidebarNavigation}
        activeItem={activeTab}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
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
            
            {/* MR Selector - Only show for tabs that need it */}
            {['quality', 'nbd', 'routes', 'ai-tour'].includes(activeTab) && (
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
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

export default App;
