import React, { useState, useEffect } from 'react';
import EmergencyDashboard from './components/EmergencyDashboard';
import VisitQualityMonitor from './components/VisitQualityMonitor';
import NBDPerformanceDashboard from './components/NBDPerformanceDashboard';
import RouteOptimizationDashboard from './components/RouteOptimizationDashboard';
import GeocodingDashboard from './components/GeocodingDashboard';
import { useMedicalRepresentatives } from './hooks/useMedicalRepresentatives';
import './index.css';
import MonthlyPlanDashboardV2 from './components/MonthlyPlanDashboardV2';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

function App() {
  const [activeTab, setActiveTab] = useState('emergency');
  const [selectedMR, setSelectedMR] = useState(null);
  const [selectedMRName, setSelectedMRName] = useState('ALL_MRS');
  const [nbdDateRange, setNbdDateRange] = useState(30);
  const [nbdPerformanceFilter, setNbdPerformanceFilter] = useState('all');
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const {
    mrList,
    loading: mrLoading,
    error: mrError,
    getMRByName,
    totalMRs
  } = useMedicalRepresentatives();

  useEffect(() => {
    if (mrList.length > 0 && !selectedMR) {
      setSelectedMR(mrList[0]);
    }
  }, [mrList, selectedMR]);

  const tabs = [
    { id: 'emergency', name: 'Emergency Fixes' },
    { id: 'quality', name: 'Visit Quality' },
    { id: 'nbd', name: 'NBD Performance' },
    { id: 'routes', name: 'Route Optimization' },
    { id: 'monthly-tour-v2', name: 'Monthly Planning V2' },
    { id: 'analytics', name: 'Analytics' },
    { id: 'geocoding', name: 'Geocoding' },
    { id: 'reports', name: 'Reports' },
    { id: 'settings', name: 'Settings' },
  ];

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
      case 'monthly-tour-v2':
        return <MonthlyPlanDashboardV2 selectedMR={selectedMR} selectedMRName={selectedMRName} />;
      case 'geocoding':
        return <GeocodingDashboard />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-brand-dark">Coming Soon</h2>
              <p className="text-gray-500">This feature is under development.</p>
            </div>
          </div>
        );
    }
  };

  if (mrLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-brand-primary mx-auto mb-4"></div>
          <p className="text-brand-dark text-lg font-medium">Loading Data...</p>
        </div>
      </div>
    );
  }

  if (mrError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-light">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md border border-gray-200">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-brand-dark mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{mrError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-brand-primary hover:bg-brand-secondary text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App min-h-screen bg-brand-light flex">
      <Sidebar
        isOpen={isSidebarOpen}
        toggle={() => setSidebarOpen(!isSidebarOpen)}
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <Header
          selectedMRName={selectedMRName}
          handleMRChange={handleMRChange}
          mrList={mrList}
          totalMRs={totalMRs}
          activeTab={activeTab}
          nbdDateRange={nbdDateRange}
          setNbdDateRange={setNbdDateRange}
          nbdPerformanceFilter={nbdPerformanceFilter}
          setNbdPerformanceFilter={setNbdPerformanceFilter}
          selectedMR={selectedMR}
        />
        <main className="p-6" style={{ paddingTop: '100px' }}>
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
