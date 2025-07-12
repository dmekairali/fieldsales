import React from 'react';
import { ChevronDown, User, Users, Calendar, MapPin } from 'lucide-react';

const Header = ({
  selectedMRName,
  handleMRChange,
  mrList,
  totalMRs,
  activeTab,
  nbdDateRange,
  setNbdDateRange,
  nbdPerformanceFilter,
  setNbdPerformanceFilter,
  selectedMR,
}) => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-brand-light shadow-md z-10" style={{ marginLeft: '80px' }}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <User size={20} className="text-brand-secondary" />
              <select
                value={selectedMRName}
                onChange={handleMRChange}
                className="bg-white text-brand-dark px-4 py-2 rounded-lg border border-gray-300 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary min-w-48 text-sm"
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

            {activeTab === 'nbd' && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar size={20} className="text-brand-secondary" />
                  <select
                    value={nbdDateRange}
                    onChange={(e) => setNbdDateRange(e.target.value)}
                    className="bg-white text-brand-dark px-3 py-2 rounded-lg border border-gray-300 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronDown size={20} className="text-brand-secondary" />
                  <select
                    value={nbdPerformanceFilter}
                    onChange={(e) => setNbdPerformanceFilter(e.target.value)}
                    className="bg-white text-brand-dark px-3 py-2 rounded-lg border border-gray-300 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                  >
                    <option value="all">All Performance</option>
                    <option value="good">Good Performers</option>
                    <option value="insufficient">Insufficient Focus</option>
                    <option value="poor">Poor Conversion</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-brand-secondary" />
              <span className="text-brand-dark font-semibold">{totalMRs}</span>
              <span className="text-gray-500">Active MRs</span>
            </div>
            {selectedMR && selectedMRName !== 'ALL_MRS' && (
              <div className="flex items-center gap-2">
                <MapPin size={20} className="text-brand-secondary" />
                <span className="text-brand-dark font-semibold">{selectedMR.territory}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
