import React from 'react';

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
    <div className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
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
  );
};

export default Header;
