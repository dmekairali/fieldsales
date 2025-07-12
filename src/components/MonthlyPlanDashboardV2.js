import React from 'react';
import { Calendar, User, MapPin, Target, CheckSquare } from 'lucide-react';

const MonthlyPlanDashboardV2 = ({ selectedMR, selectedMRName }) => {
  const plan = {
    month: 'October 2024',
    mr: 'Amit Patel',
    territory: 'Central Mumbai',
    targets: [
      { id: 1, name: 'New Doctor Visits', target: 20, achieved: 15, status: 'On Track' },
      { id: 2, name: 'Sales Volume', target: '₹5,00,000', achieved: '₹4,50,000', status: 'On Track' },
      { id: 3, name: 'Product Samples Distributed', target: 100, achieved: 90, status: 'On Track' },
    ],
    schedule: [
      { day: 'Monday', area: 'Dadar', focus: 'New Doctor Visits' },
      { day: 'Tuesday', area: 'Mahim', focus: 'Follow-ups' },
      { day: 'Wednesday', area: 'Bandra', focus: 'Sales Calls' },
      { day: 'Thursday', area: 'Andheri', focus: 'Product Demos' },
      { day: 'Friday', area: 'Juhu', focus: 'Relationship Building' },
    ],
  };

  return (
    <div className="p-6 bg-brand-light min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-brand-dark">Monthly Plan</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-brand-secondary" />
            <span className="text-lg text-brand-dark font-semibold">{plan.month}</span>
          </div>
          {selectedMRName && (
            <div className="flex items-center gap-2">
              <User size={20} className="text-brand-secondary" />
              <span className="text-lg text-brand-dark font-semibold">{selectedMRName}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-brand-dark mb-4">Weekly Schedule</h2>
          <table className="w-full">
            <thead>
              <tr className="text-left text-brand-dark">
                <th className="p-2">Day</th>
                <th className="p-2">Area</th>
                <th className="p-2">Focus</th>
              </tr>
            </thead>
            <tbody>
              {plan.schedule.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="p-2">{item.day}</td>
                  <td className="p-2 flex items-center gap-2">
                    <MapPin size={16} className="text-brand-secondary" />
                    <span>{item.area}</span>
                  </td>
                  <td className="p-2">{item.focus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-brand-dark mb-4">Monthly Targets</h2>
          <div className="space-y-4">
            {plan.targets.map((target) => (
              <div key={target.id} className="p-4 bg-gray-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target size={20} className="text-brand-secondary" />
                    <p className="font-semibold text-brand-dark">{target.name}</p>
                  </div>
                  <p className={`text-sm font-semibold ${target.status === 'On Track' ? 'text-green-500' : 'text-red-500'}`}>{target.status}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-brand-dark">Target: {target.target}</p>
                  <p className="text-brand-dark">Achieved: {target.achieved}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyPlanDashboardV2;
