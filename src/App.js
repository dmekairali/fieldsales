import React, { useState } from 'react';
import EmergencyDashboard from './components/EmergencyDashboard';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('emergency');

  const tabs = [
    {
      id: 'emergency',
      name: 'Emergency Dashboard',
      icon: '🚨',
      description: 'Critical territory & visit monitoring'
    },
    {
      id: 'analytics',
      name: 'Analytics',
      icon: '📊',
      description: 'Performance insights & trends'
    },
    {
      id: 'reports',
      name: 'Reports',
      icon: '📋',
      description: 'Detailed territory reports'
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: '⚙️',
      description: 'Dashboard configuration'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'emergency':
        return <EmergencyDashboard />;
      case 'analytics':
        return (
          <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Analytics Dashboard</h2>
                <p className="text-gray-600 text-lg">Coming Soon - Advanced analytics and performance insights</p>
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

  return (
    <div className="App min-h-screen bg-gray-100">
      {/* Tab Navigation */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto">
          <div className="flex space-x-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative px-6 py-4 text-sm font-medium transition-all duration-200 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600 bg-red-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{tab.icon}</span>
                  <span className="font-semibold">{tab.name}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1 hidden md:block">
                  {tab.description}
                </div>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500"></div>
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

      {/* Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white px-6 py-2 text-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              Connected to Live Database
            </span>
            <span>Last Updated: {new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-300">Field Sales Dashboard v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
