import React from 'react';

const Sidebar = ({ isOpen, toggle, tabs, activeTab, setActiveTab, getTabColorClasses }) => {
  return (
    <div className={`fixed top-0 left-0 h-full bg-slate-800 text-white transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'}`}>
      <div className="flex items-center justify-between p-4">
        <h1 className={`text-2xl font-bold ${isOpen ? 'block' : 'hidden'}`}>Kairali</h1>
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
                ? `bg-slate-700 text-white`
                : `text-slate-300 hover:bg-slate-700 hover:text-white`
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className={`ml-4 ${isOpen ? 'block' : 'hidden'}`}>{tab.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
