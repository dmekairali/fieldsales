import React from 'react';
import { Target, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const NBDPerformanceDashboard = ({ mrName, dateRange, performanceFilter }) => {
  const performanceData = [
    { id: 1, territory: 'South Delhi', target: 50, achieved: 45, conversion: '90%' },
    { id: 2, territory: 'West Mumbai', target: 60, achieved: 40, conversion: '66%' },
    { id: 3, territory: 'North Bangalore', target: 40, achieved: 38, conversion: '95%' },
    { id: 4, territory: 'East Chennai', target: 70, achieved: 50, conversion: '71%' },
  ];

  const getConversionIcon = (conversion) => {
    const value = parseInt(conversion);
    if (value >= 90) {
      return <TrendingUp size={20} className="text-green-500" />;
    } else if (value < 70) {
      return <TrendingDown size={20} className="text-red-500" />;
    } else {
      return null;
    }
  };

  return (
    <div className="p-6 bg-brand-light min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-brand-dark">NBD Performance</h1>
        {mrName && <p className="text-lg text-brand-secondary">MR: {mrName}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-brand-dark mb-4">Total Target</h2>
          <div className="flex items-center justify-center">
            <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center">
              <p className="text-4xl font-bold text-blue-500">220</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-brand-dark mb-4">Total Achieved</h2>
          <div className="flex items-center justify-center">
            <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center">
              <p className="text-4xl font-bold text-green-500">173</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-brand-dark mb-4">Overall Conversion</h2>
          <div className="flex items-center justify-center">
            <div className="w-32 h-32 bg-yellow-100 rounded-full flex items-center justify-center">
              <p className="text-4xl font-bold text-yellow-500">78%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-brand-dark mb-4">Territory Performance</h2>
        <table className="w-full">
          <thead>
            <tr className="text-left text-brand-dark">
              <th className="p-2">Territory</th>
              <th className="p-2">Target</th>
              <th className="p-2">Achieved</th>
              <th className="p-2">Conversion</th>
            </tr>
          </thead>
          <tbody>
            {performanceData.map((item) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="p-2">{item.territory}</td>
                <td className="p-2 flex items-center gap-2">
                  <Target size={16} className="text-brand-secondary" />
                  <span>{item.target}</span>
                </td>
                <td className="p-2 flex items-center gap-2">
                  <DollarSign size={16} className="text-brand-secondary" />
                  <span>{item.achieved}</span>
                </td>
                <td className="p-2 flex items-center gap-2">
                  {getConversionIcon(item.conversion)}
                  <span>{item.conversion}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NBDPerformanceDashboard;
