import React from 'react';
import { Award } from 'lucide-react';

const formatCurrency = (value) => {
    if (value >= 10000000) { // 1 crore
      return `₹${(value / 10000000).toFixed(1)}Cr`;
    } else if (value >= 100000) { // 1 lakh
      return `₹${(value / 100000).toFixed(1)}L`;
    } else if (value >= 1000) { // 1 thousand
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
};

const TableWrapper = ({ children }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto min-w-0">
        <div className="min-w-[1200px]">
          {children}
        </div>
      </div>
    </div>
);

const SortIcon = ({ column, sortConfig }) => {
    if (sortConfig.key !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      );
    }

    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
};

const PerformanceTable = ({ data, getSortedPerformers, visiblePerformers, setVisiblePerformers, handleSort, sortConfig, setSelectedMR }) => {
    const sortedPerformers = getSortedPerformers();
    const displayedPerformers = sortedPerformers.slice(0, visiblePerformers);

    return (
      <TableWrapper>
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">All Performers ({sortedPerformers.length})</h3>
          <p className="text-sm text-gray-600">Showing {Math.min(visiblePerformers, sortedPerformers.length)} of {sortedPerformers.length} representatives</p>
        </div>

        <div className="overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Rank</th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Name</span>
                    <SortIcon column="name" sortConfig={sortConfig} />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('revenue')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Revenue</span>
                    <SortIcon column="revenue" sortConfig={sortConfig} />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('visits')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Visits</span>
                    <SortIcon column="visits" sortConfig={sortConfig} />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('conversion')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Conversion</span>
                    <SortIcon column="conversion" sortConfig={sortConfig} />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('convertedVisits')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Converted</span>
                    <SortIcon column="convertedVisits" sortConfig={sortConfig} />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('nbdConversion')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>NBD Conv.</span>
                    <SortIcon column="nbdConversion" sortConfig={sortConfig} />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('newProspects')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>New Prospects</span>
                    <SortIcon column="newProspects" sortConfig={sortConfig} />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('billsPending')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Bills Pending</span>
                    <SortIcon column="billsPending" sortConfig={sortConfig} />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('paymentPending')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Payment Pending</span>
                    <SortIcon column="paymentPending" sortConfig={sortConfig} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedPerformers.map((rep, index) => (
                <tr
                  key={rep.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedMR(rep.name)}
                >
                  <td className="px-4 py-3 whitespace-nowrap w-16">
                    <div className="flex items-center">
                      {index === 0 && <Award className="w-4 h-4 text-yellow-500 mr-1" />}
                      {index === 1 && <Award className="w-4 h-4 text-gray-400 mr-1" />}
                      {index === 2 && <Award className="w-4 h-4 text-orange-600 mr-1" />}
                      <span className="text-sm font-medium text-gray-900">#{index + 1}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 min-w-0">
                    <div className="truncate">
                      <div className="text-sm font-medium text-gray-900 truncate flex items-center">
                        {rep.roleLevel === 'RSM' && <span className="mr-1 text-xs bg-purple-100 text-purple-800 px-1 rounded">RSM</span>}
                        {rep.roleLevel === 'ASM' && <span className="mr-1 text-xs bg-blue-100 text-blue-800 px-1 rounded">ASM</span>}
                        {rep.roleLevel === 'MR' && <span className="mr-1 text-xs bg-green-100 text-green-800 px-1 rounded">MR</span>}
                        {rep.roleLevel === 'SALES_AGENT' && <span className="mr-1 text-xs bg-orange-100 text-orange-800 px-1 rounded">AGENT</span>}
                        {rep.name}
                        {!rep.isActive && <span className="ml-1 text-xs text-red-500">(Inactive)</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900 w-24">
                    <span title={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(rep.revenue)}>
                      {formatCurrency(rep.revenue)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900 w-20">{rep.visits}</td>
                  <td className="px-4 py-3 whitespace-nowrap w-24">
                    <div className="flex items-center justify-center">
                      <span className="text-xs text-gray-900 mr-1">{rep.conversion}%</span>
                      <div className="w-8 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{ width: `${Math.min(parseFloat(rep.conversion), 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900 w-20">{rep.convertedVisits}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900 w-24">{rep.nbdConversion}%</td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900 w-20">{rep.newProspects}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900 w-20">
                    <span className={rep.billsPending > 0 ? 'text-orange-600 font-medium' : 'text-gray-900'}>
                      {rep.billsPending}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900 w-20">
                    <span className={rep.paymentPending > 0 ? 'text-red-600 font-medium' : 'text-gray-900'}>
                      {rep.paymentPending}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedPerformers.length > visiblePerformers && (
          <div className="p-4 border-t border-gray-100 text-center">
            <button
              onClick={() => setVisiblePerformers(prev => Math.min(prev + 10, sortedPerformers.length))}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Show More ({sortedPerformers.length - visiblePerformers} remaining)
            </button>
          </div>
        )}
      </TableWrapper>
    );
};

export default PerformanceTable;
