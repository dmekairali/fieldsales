import React from 'react';
import { Leaf, BarChart, Map, Award, Calendar, Settings, HelpCircle, LifeBuoy } from 'lucide-react';

const Sidebar = ({ isOpen, toggle, tabs, activeTab, setActiveTab }) => {
  const icons = {
    emergency: <LifeBuoy size={20} />,
    quality: <Award size={20} />,
    nbd: <BarChart size={20} />,
    routes: <Map size={20} />,
    'monthly-tour-v2': <Calendar size={20} />,
    analytics: <BarChart size={20} />,
    geocoding: <Map size={20} />,
    reports: <Leaf size={20} />,
    settings: <Settings size={20} />,
  };

  return (
    <div className={`fixed top-0 left-0 h-full bg-brand-primary text-white transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'}`}>
      <div className="flex items-center justify-between p-4">
        <div className={`flex items-center gap-2 ${isOpen ? 'block' : 'hidden'}`}>
          <Leaf size={24} />
          <div>
            <h1 className="text-lg font-bold">AyurAI</h1>
            <p className="text-xs text-slate-300">Field Team Dashboard</p>
          </div>
        </div>
        <button onClick={toggle} className="text-white focus:outline-none">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      <nav className="mt-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-brand-secondary text-white'
                : 'text-slate-300 hover:bg-brand-secondary hover:text-white'
            }`}
          >
            <span className="mr-4">{icons[tab.id]}</span>
            <span className={`${isOpen ? 'block' : 'hidden'}`}>{tab.name}</span>
          </button>
        ))}
      </nav>
      <div className={`absolute bottom-0 w-full p-4 ${isOpen ? 'block' : 'hidden'}`}>
        <div className="bg-brand-secondary rounded-lg p-4">
          <div className="flex items-center gap-2">
            <HelpCircle size={20} />
            <div>
              <h3 className="text-sm font-semibold">Need Help?</h3>
              <p className="text-xs text-slate-300">Contact support</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
