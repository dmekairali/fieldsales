import React, { useState, useEffect } from 'react';
import EmergencyDashboard from './components/EmergencyDashboard';
import NBDPerformanceDashboard from './components/NBDPerformanceDashboard';
import RouteOptimizationDashboard from './components/RouteOptimizationDashboard';
import GeocodingDashboard from './components/GeocodingDashboard';
import { useMedicalRepresentatives } from './hooks/useMedicalRepresentatives';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('emergency');
  const [selectedMR, setSelectedMR] = useState(null);
//okay
  const { 
    mrList, 
    loading: mrLoading, 
    error: mrError, 
    getMRByName,
    totalMRs 
  } = useMedicalRepresentatives();

  // Set default MR when list loads
  useEffect(() => {
    if (mrList.length > 0 && !selectedMR) {
      setSelectedMR(mrList[0]);
    }
  }, [mrList, selectedMR]);

  const tabs = [
    {
      id: 'emergency',
      name: 'Emergency Fixes',
      icon: '🚨',
      description: 'Critical territory & visit monitoring',
      color: 'red'
    },
    {
      id: 'nbd',
      name: 'NBD Performance',
      icon: '📈',
      description: 'New business development tracking',
      color: 'green'
    },
    {
      id: 'routes',
      name: 'Route Optimization',
      icon: '🗺️',
      description: 'AI-powered route planning',
      color: 'blue'
    },
    {
      id: 'analytics',
      name: 'Analytics',
      icon: '📊',
      description: 'Performance insights & trends',
      color: 'purple'
    },
    {
      id: 'reports',
      name: 'Reports',
      icon: '📋',
      description: 'Detailed territory reports',
      color: 'indigo'
    },
    {
      id: 'geocoding',
      name: 'Geocoding',
      icon: '📍',
      description: 'Add GPS coordinates to customers',
      color: 'teal'
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: '⚙️',
      description: 'Dashboard configuration',
      color: 'gray'
    }
  ];

  const getTabColorClasses = (tab, isActive) => {
    const colorMap = {
      red: isActive ? 'border-red-500 text-red-600 bg-red-50' : 'hover:border-red-300',
      green: isActive ? 'border-green-500 text-green-600 bg-green-50' : 'hover:border-green-300',
      blue: isActive ? 'border-blue-500 text-blue-600 bg-blue-50' : 'hover:border-blue-300',
      purple: isActive ? 'border-purple-500 text-purple-600 bg-purple-50' : 'hover:border-purple-300',
      indigo: isActive ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'hover:border-indigo-300',
      teal: isActive ? 'border-teal-500 text-teal-600 bg-teal-50' : 'hover:border-teal-300',
      gray: isActive ? 'border-gray-500 text-gray-600 bg-gray-50' : 'hover:border-gray-300'
    };
    return colorMap[tab.color] || colorMap.gray;
  };

  const handleMRChange = (e) => {
    const selectedMRName = e.target.value;
    const mrData = getMRByName(selectedMRName);
    setSelectedMR(mrData);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'emergency':
        return <EmergencyDashboard />;
      case 'nbd':
        return <NBDPerformanceDashboard />;
      case 'routes':
        return <RouteOptimizationDashboard mrName={selectedMR?.name} mrData={selectedMR} />;
      case 'geocoding':
        return <GeocodingDashboard />;
      case 'analytics':
        return (
          <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Analytics Dashboard</h2>
                <p className="text-gray-600 text-lg">Coming Soon - Advanced analytics and performance insights</p>
                
                {/* Show MR-specific preview */}
                {selectedMR && (
                  <div className="mt-8 bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
                    <h3 className="font-semibold text-gray-800 mb-2">MR Analytics Preview</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><span className="font-medium">Territory:</span> {selectedMR.territory}</p>
                      <p><span className="font-medium">Monthly Target:</span> ₹{selectedMR.monthly_target?.toLocaleString()}</p>
                      <p><span className="font-medium">Manager:</span> {selectedMR.manager_name || 'Not assigned'}</p>
                    </div>
                  </div>
                )}
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold text-gray-800 mb-2">Territory Performance Trends</h3>
                    <p className="text-gray-600 text-sm">Historical performance analysis and forecasting</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold text-gray-800 mb-2">MR Efficiency Metrics</h3>
                    <p className="text-gray-600 text-sm">Individual performance tracking and ranking</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold text-gray-800 mb-2">Revenue Optimization</h3>
                    <p className="text-gray-600 text-sm">Territory reallocation and optimization suggestions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'reports':
        return (
          <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📋</div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Reports Center</h2>
                <p className="text-gray-600 text-lg">Comprehensive reporting and data exports</p>
                
                {/* MR-specific reports */}
                {selectedMR && (
                  <div className="mt-8 bg-blue-50 p-4 rounded-lg max-w-md mx-auto">
                    <h3 className="font-semibold text-blue-800 mb-2">Reports for {selectedMR.name}</h3>
                    <p className="text-blue-600 text-sm">Territory: {selectedMR.territory}</p>
                  </div>
                )}
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold text-gray-800 mb-2">Monthly Territory Reports</h3>
                    <p className="text-gray-600 text-sm mb-4">Detailed performance summaries by territory</p>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Generate Report</button>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold text-gray-800 mb-2">Visit Quality Analysis</h3>
                    <p className="text-gray-600 text-sm mb-4">Suspicious activity and quality metrics</p>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Export Data</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                  ⚙️ Dashboard Settings
                </h2>
                <div className="space-y-6">
                  <div className="border-b pb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Alert Thresholds</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Visit Duration (minutes)</label>
                        <input type="number" defaultValue="2" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Visit Duration (hours)</label>
                        <input type="number" defaultValue="3" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Zero ROI Visit Threshold</label>
                        <input type="number" defaultValue="10" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Low Revenue per Visit (₹)</label>
                        <input type="number" defaultValue="100" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                      </div>
                    </div>
                  </div>
                  <div className="border-b pb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Notifications</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-3" />
                        <span className="text-gray-700">Email alerts for critical territories</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-3" />
                        <span className="text-gray-700">Real-time suspicious visit notifications</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-3" />
                        <span className="text-gray-700">Daily performance summary</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Refresh</h3>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center">
                        <input type="radio" name="refresh" defaultChecked className="mr-2" />
                        <span className="text-gray-700">Auto-refresh every 30 seconds</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="refresh" className="mr-2" />
                        <span className="text-gray-700">Manual refresh only</span>
                      </label>
                    </div>
                  </div>
                  <div className="pt-6">
                    <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold">
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return <EmergencyDashboard />;
    }
  };

  if (mrLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading Medical Representatives...</p>
          <p className="text-gray-500 text-sm mt-2">Connecting to database</p>
        </div>
      </div>
    );
  }

  if (mrError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Database Connection Error</h2>
          <p className="text-gray-600 mb-4">{mrError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App min-h-screen bg-gray-100">
      {/* Header with Live MR Selector */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-4 flex items-center gap-3">
            🏥 Kairali Analytics - Master Dashboard
          </h1>
          
          {/* MR Selector and Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <label className="text-blue-100 font-medium">Active MR:</label>
                <select 
                  value={selectedMR?.name || ''} 
                  onChange={handleMRChange}
                  className="bg-white text-gray-800 px-4 py-2 rounded-lg border-0 font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-48"
                  disabled={mrList.length === 0}
                >
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
              
              {selectedMR && (
                <div className="hidden md:flex items-center gap-4 text-sm">
                  <div className="bg-blue-500 bg-opacity-30 px-3 py-1 rounded-full">
                    <span className="text-blue-100">Territory: </span>
                    <span className="font-semibold">{selectedMR.territory}</span>
                  </div>
                  <div className="bg-green-500 bg-opacity-30 px-3 py-1 rounded-full">
                    <span className="text-green-100">Target: </span>
                    <span className="font-semibold">₹{selectedMR.monthly_target?.toLocaleString() || 'N/A'}</span>
                  </div>
                  {selectedMR.manager_name && (
                    <div className="bg-yellow-500 bg-opacity-30 px-3 py-1 rounded-full">
                      <span className="text-yellow-100">Manager: </span>
                      <span className="font-semibold">{selectedMR.manager_name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="text-right">
              <div className="text-sm text-blue-100">Total MRs</div>
              <div className="font-semibold">{totalMRs} Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto">
          <div className="flex space-x-0 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative px-6 py-4 text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? getTabColorClasses(tab, true)
                    : `border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 ${getTabColorClasses(tab, false)}`
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{tab.icon}</span>
                  <span className="font-semibold">{tab.name}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1 hidden lg:block">
                  {tab.description}
                </div>
                {activeTab === tab.id && (
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-${tab.color}-500`}></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {renderTabContent()}
      </div>

      {/* Enhanced Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white px-6 py-2 text-sm shadow-2xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              Connected to Live Database
            </span>
            {selectedMR && (
              <span className="hidden md:block">
                Active MR: {selectedMR.name} ({selectedMR.employee_id})
              </span>
            )}
            <span>Last Updated: {new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="hidden md:block text-gray-300">
              Active Tab: {tabs.find(t => t.id === activeTab)?.name}
            </span>
            <span className="text-gray-300">Kairali Field Sales Analytics v2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
