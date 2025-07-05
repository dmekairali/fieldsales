import React, { useState, useEffect } from 'react';
import EmergencyDashboard from './components/EmergencyDashboard';
import VisitQualityMonitor from './components/VisitQualityMonitor';
import NBDPerformanceDashboard from './components/NBDPerformanceDashboard';
import RouteOptimizationDashboard from './components/RouteOptimizationDashboard';
import GeocodingDashboard from './components/GeocodingDashboard';
import { useMedicalRepresentatives } from './hooks/useMedicalRepresentatives';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('emergency');
  const [selectedMR, setSelectedMR] = useState(null);
  const [selectedMRName, setSelectedMRName] = useState('ALL_MRS'); // Add state for MR name filter
  const [nbdDateRange, setNbdDateRange] = useState(30); // NBD specific filters
  const [nbdPerformanceFilter, setNbdPerformanceFilter] = useState('all');

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
      description: 'Critical territory management',
      color: 'red',
      gradient: 'from-red-500 to-red-600'
    },
    {
      id: 'quality',
      name: 'Visit Quality',
      icon: '📊',
      description: 'Quality monitoring & analysis',
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      id: 'nbd',
      name: 'NBD Performance',
      icon: '📈',
      description: 'New business development',
      color: 'green',
      gradient: 'from-green-500 to-green-600'
    },
    {
      id: 'routes',
      name: 'Route Optimization',
      icon: '🗺️',
      description: 'AI-powered route planning',
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'analytics',
      name: 'Analytics',
      icon: '📊',
      description: 'Performance insights & trends',
      color: 'indigo',
      gradient: 'from-indigo-500 to-indigo-600'
    },
    {
      id: 'geocoding',
      name: 'Geocoding',
      icon: '📍',
      description: 'GPS coordinate management',
      color: 'teal',
      gradient: 'from-teal-500 to-teal-600'
    },
    {
      id: 'reports',
      name: 'Reports',
      icon: '📋',
      description: 'Detailed territory reports',
      color: 'amber',
      gradient: 'from-amber-500 to-amber-600'
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: '⚙️',
      description: 'Dashboard configuration',
      color: 'gray',
      gradient: 'from-gray-500 to-gray-600'
    }
  ];

  const getTabColorClasses = (tab, isActive) => {
    if (isActive) {
      return `border-${tab.color}-500 text-${tab.color}-600 bg-${tab.color}-50`;
    }
    return `border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50`;
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

  const renderTabContent = () => {
    switch (activeTab) {
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
        return (
          <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-3xl text-white">📊</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Advanced Analytics Dashboard</h2>
                <p className="text-gray-600 text-lg mb-8">Comprehensive performance insights and predictive analytics</p>
                
                {/* Show MR-specific preview */}
                {selectedMR && (
                  <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto border border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-800 mb-6">MR Analytics Preview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                      <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                        <h4 className="font-semibold text-indigo-800 mb-2">Territory Performance</h4>
                        <div className="space-y-2 text-sm text-indigo-700">
                          <p><span className="font-medium">Territory:</span> {selectedMR.territory}</p>
                          <p><span className="font-medium">Monthly Target:</span> ₹{selectedMR.monthly_target?.toLocaleString()}</p>
                          <p><span className="font-medium">Manager:</span> {selectedMR.manager_name || 'Not assigned'}</p>
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                        <h4 className="font-semibold text-green-800 mb-2">Coming Soon</h4>
                        <div className="space-y-1 text-sm text-green-700">
                          <p>• Revenue trend analysis</p>
                          <p>• Customer behavior insights</p>
                          <p>• Predictive performance modeling</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                  <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-white text-xl">📈</span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-3">Territory Performance Trends</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">Historical performance analysis with predictive forecasting and trend identification</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-white text-xl">🎯</span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-3">MR Efficiency Metrics</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">Individual performance tracking, ranking systems, and efficiency optimization recommendations</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-white text-xl">💡</span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-3">Revenue Optimization</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">Territory reallocation suggestions and optimization strategies based on data insights</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'reports':
        return (
          <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-3xl text-white">📋</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Comprehensive Reports Center</h2>
                <p className="text-gray-600 text-lg mb-8">Advanced reporting system with data exports and insights</p>
                
                {/* MR-specific reports */}
                {selectedMR && (
                  <div className="bg-amber-50 rounded-xl p-6 max-w-2xl mx-auto mb-8 border border-amber-200">
                    <h3 className="font-semibold text-amber-800 mb-3">Reports for {selectedMR.name}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-amber-700">
                        <span className="font-medium">Territory:</span> {selectedMR.territory}
                      </div>
                      <div className="text-amber-700">
                        <span className="font-medium">Employee ID:</span> {selectedMR.employee_id}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-white text-xl">📊</span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-4">Monthly Territory Reports</h3>
                    <p className="text-gray-600 text-sm mb-6 leading-relaxed">Detailed performance summaries with KPI analysis and trend comparisons</p>
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                      Generate Report
                    </button>
                  </div>
                  <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-white text-xl">🔍</span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-4">Visit Quality Analysis</h3>
                    <p className="text-gray-600 text-sm mb-6 leading-relaxed">Comprehensive quality metrics and suspicious activity detection reports</p>
                    <button className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                      Export Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-xl">⚙️</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Dashboard Settings</h2>
                    <p className="text-gray-600">Configure alerts, thresholds, and system preferences</p>
                  </div>
                </div>
                
                <div className="space-y-8">
                  <div className="border-b border-gray-200 pb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Alert Thresholds</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Visit Duration (minutes)</label>
                          <input type="number" defaultValue="2" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                          <p className="text-xs text-gray-500 mt-1">Visits shorter than this trigger alerts</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Visit Duration (hours)</label>
                          <input type="number" defaultValue="3" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                          <p className="text-xs text-gray-500 mt-1">Visits longer than this trigger review</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Zero ROI Visit Threshold</label>
                          <input type="number" defaultValue="10" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                          <p className="text-xs text-gray-500 mt-1">Territory flagged after this many zero-outcome visits</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Low Revenue per Visit (₹)</label>
                          <input type="number" defaultValue="100" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                          <p className="text-xs text-gray-500 mt-1">Revenue threshold for performance alerts</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-b border-gray-200 pb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h3>
                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                        <span className="text-gray-700">Email alerts for critical territories</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                        <span className="text-gray-700">Real-time suspicious visit notifications</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                        <span className="text-gray-700">Daily performance summary reports</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                        <span className="text-gray-700">Weekly territory performance updates</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="border-b border-gray-200 pb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Data Refresh Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Dashboard Refresh Rate</label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input type="radio" name="refresh" defaultChecked className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500" />
                            <span className="text-gray-700">Auto-refresh every 30 minutes</span>
                          </label>
                          <label className="flex items-center">
                            <input type="radio" name="refresh" className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500" />
                            <span className="text-gray-700">Auto-refresh every hour</span>
                          </label>
                          <label className="flex items-center">
                            <input type="radio" name="refresh" className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500" />
                            <span className="text-gray-700">Manual refresh only</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-6">
                    <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-sm">
                      Save All Settings
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
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading Medical Representatives...</p>
          <p className="text-gray-500 text-sm mt-2">Connecting to database</p>
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
    <div className="App min-h-screen bg-slate-100">
      {/* Header with Live MR Selector */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-blue-900 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-xl">🏥</span>
                </div>
                Kairali Analytics - Master Dashboard
              </h1>
              <p className="text-blue-100 text-lg">Advanced field sales analytics and territory management system</p>
            </div>
            
            <div className="flex items-center gap-6">
              {/* MR Selector */}
              <div className="flex items-center gap-3">
                <label className="text-blue-100 font-medium text-sm">Active MR:</label>
                <select 
                  value={selectedMRName} 
                  onChange={handleMRChange}
                  className="bg-white text-gray-800 px-4 py-2 rounded-lg border-0 font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-48 text-sm"
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
              
              {/* NBD Specific Filters - Show only when NBD tab is active */}
              {activeTab === 'nbd' && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-blue-100 font-medium text-sm">Date Range:</label>
                    <select 
                      value={nbdDateRange} 
                      onChange={(e) => setNbdDateRange(e.target.value)}
                      className="bg-white text-gray-800 px-3 py-2 rounded-lg border-0 font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                    >
                      <option value={7}>Last 7 days</option>
                      <option value={30}>Last 30 days</option>
                      <option value={90}>Last 90 days</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-blue-100 font-medium text-sm">Performance:</label>
                    <select 
                      value={nbdPerformanceFilter} 
                      onChange={(e) => setNbdPerformanceFilter(e.target.value)}
                      className="bg-white text-gray-800 px-3 py-2 rounded-lg border-0 font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                    >
                      <option value="all">All Performance</option>
                      <option value="good">Good Performers</option>
                      <option value="insufficient">Insufficient Focus</option>
                      <option value="poor">Poor Conversion</option>
                    </select>
                  </div>
                </div>
              )}
              
              {/* Stats */}
              <div className="text-right">
                <div className="text-sm text-blue-100">Total Active MRs</div>
                <div className="font-semibold text-xl">{totalMRs}</div>
              </div>
            </div>
          </div>
          
          {/* MR Details */}
          {selectedMR && selectedMRName !== 'ALL_MRS' && (
            <div className="mt-4 flex items-center gap-6 text-sm">
              <div className="bg-blue-500 bg-opacity-30 px-3 py-1 rounded-full border border-blue-400">
                <span className="text-blue-100">Territory: </span>
                <span className="font-semibold text-white">{selectedMR.territory}</span>
              </div>
              <div className="bg-green-500 bg-opacity-30 px-3 py-1 rounded-full border border-green-400">
                <span className="text-green-100">Target: </span>
                <span className="font-semibold text-white">₹{selectedMR.monthly_target?.toLocaleString() || 'N/A'}</span>
              </div>
              {selectedMR.manager_name && (
                <div className="bg-yellow-500 bg-opacity-30 px-3 py-1 rounded-full border border-yellow-400">
                  <span className="text-yellow-100">Manager: </span>
                  <span className="font-semibold text-white">{selectedMR.manager_name}</span>
                </div>
              )}
              <div className="bg-purple-500 bg-opacity-30 px-3 py-1 rounded-full border border-purple-400">
                <span className="text-purple-100">Joined: </span>
                <span className="font-semibold text-white">
                  {selectedMR.joining_date ? new Date(selectedMR.joining_date).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          )}
          
          {/* All MRs Summary */}
          {selectedMRName === 'ALL_MRS' && (
            <div className="mt-4 flex items-center gap-6 text-sm">
              <div className="bg-blue-500 bg-opacity-30 px-3 py-1 rounded-full border border-blue-400">
                <span className="text-blue-100">Viewing: </span>
                <span className="font-semibold text-white">All {totalMRs} Active MRs</span>
              </div>
              <div className="bg-green-500 bg-opacity-30 px-3 py-1 rounded-full border border-green-400">
                <span className="text-green-100">Mode: </span>
                <span className="font-semibold text-white">Comprehensive Analysis</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Professional Tab Navigation */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex space-x-0 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative px-6 py-4 text-sm font-medium transition-all duration-300 border-b-3 whitespace-nowrap ${
                  activeTab === tab.id
                    ? `border-${tab.color}-500 text-${tab.color}-600 bg-${tab.color}-50`
                    : `border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50`
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{tab.icon}</span>
                  <div className="text-left">
                    <div className="font-semibold">{tab.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5 hidden lg:block">
                      {tab.description}
                    </div>
                  </div>
                </div>
                {activeTab === tab.id && (
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${tab.gradient} rounded-t-full`}></div>
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
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 text-white px-6 py-3 text-sm shadow-2xl border-t border-slate-700">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              Connected to Live Database
            </span>
            {selectedMRName !== 'ALL_MRS' && selectedMR && (
              <span className="hidden md:block text-slate-300">
                Active MR: {selectedMR.name} ({selectedMR.employee_id})
              </span>
            )}
            {selectedMRName === 'ALL_MRS' && (
              <span className="hidden md:block text-slate-300">
                Viewing: All {totalMRs} Active MRs
              </span>
            )}
            <span className="text-slate-400">Last Updated: {new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center space-x-6">
            <span className="hidden md:block text-slate-300">
              Active Tab: {tabs.find(t => t.id === activeTab)?.name}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-slate-400">Kairali Field Sales Analytics v2.1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
