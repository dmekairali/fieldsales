import React from 'react';
import { Map, Zap, Clock, TrendingUp } from 'lucide-react';

const RouteOptimizationDashboard = ({ mrName, mrData }) => {
  const routes = [
    { id: 1, name: 'Morning Route', stops: 12, duration: '3h 15m', efficiency: '92%' },
    { id: 2, name: 'Afternoon Route', stops: 8, duration: '2h 30m', efficiency: '88%' },
    { id: 3, name: 'Evening Route', stops: 5, duration: '1h 45m', efficiency: '95%' },
  ];

  return (
    <div className="p-6 bg-brand-light min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-brand-dark">Route Optimization</h1>
        {mrName && <p className="text-lg text-brand-secondary">MR: {mrName}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-brand-dark mb-4">Total Routes</h2>
          <div className="flex items-center justify-center">
            <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center">
              <p className="text-4xl font-bold text-blue-500">3</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-brand-dark mb-4">Total Duration</h2>
          <div className="flex items-center justify-center">
            <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center">
              <p className="text-4xl font-bold text-green-500">7h 30m</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-brand-dark mb-4">Overall Efficiency</h2>
          <div className="flex items-center justify-center">
            <div className="w-32 h-32 bg-yellow-100 rounded-full flex items-center justify-center">
              <p className="text-4xl font-bold text-yellow-500">91%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-brand-dark mb-4">Optimized Routes</h2>
        <table className="w-full">
          <thead>
            <tr className="text-left text-brand-dark">
              <th className="p-2">Route Name</th>
              <th className="p-2">Stops</th>
              <th className="p-2">Duration</th>
              <th className="p-2">Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((route) => (
              <tr key={route.id} className="border-b border-gray-200">
                <td className="p-2 flex items-center gap-2">
                  <Map size={16} className="text-brand-secondary" />
                  <span>{route.name}</span>
                </td>
                <td className="p-2">{route.stops}</td>
                <td className="p-2 flex items-center gap-2">
                  <Clock size={16} className="text-brand-secondary" />
                  <span>{route.duration}</span>
                </td>
                <td className="p-2 flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-500" />
                  <span>{route.efficiency}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-6 flex justify-end">
          <button className="bg-brand-primary hover:bg-brand-secondary text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2">
            <Zap size={20} />
            <span>Regenerate Routes</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteOptimizationDashboard;
