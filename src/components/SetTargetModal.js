import React, { useState, useEffect } from 'react';
import { X, Target, Zap } from 'lucide-react';

const SetTargetModal = ({ isOpen, onClose, performers, onSave }) => {
  const [targets, setTargets] = useState({});

  useEffect(() => {
    if (performers) {
      const initialTargets = {};
      performers.forEach(performer => {
        initialTargets[performer.id] = {
          total_visit_plan: 0,
          nbd_visit_plan: 0,
          crr_visit_plan: 0,
          total_conversion_percent_plan: 0,
          nbd_conversion_percent_plan: 0,
          crr_conversion_percent_plan: 0,
          total_revenue_target: 0,
          nbd_revenue_target: 0,
          crr_revenue_target: 0,
        };
      });
      setTargets(initialTargets);
    }
  }, [performers]);

  const handleInputChange = (mrId, field, value) => {
    setTargets(prevTargets => ({
      ...prevTargets,
      [mrId]: {
        ...prevTargets[mrId],
        [field]: value
      }
    }));
  };

  const handleAutoCompute = () => {
    // Placeholder for auto-computation logic
    alert('Auto-compute feature to be implemented.');
  };

  const handleSave = () => {
    // onSave(targets);
    // For now, just logging to console as backend is on hold.
    console.log('Saving targets:', targets);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Set Weekly Targets</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">MR Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Visits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NBD Visits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CRR Visits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Conv. %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NBD Conv. %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CRR Conv. %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NBD Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CRR Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(performers || []).map((performer) => (
                  <tr key={performer.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">{performer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="number" className="w-24 p-1 border rounded" value={targets[performer.id]?.total_visit_plan} onChange={(e) => handleInputChange(performer.id, 'total_visit_plan', e.target.value)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="number" className="w-24 p-1 border rounded" value={targets[performer.id]?.nbd_visit_plan} onChange={(e) => handleInputChange(performer.id, 'nbd_visit_plan', e.target.value)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="number" className="w-24 p-1 border rounded" value={targets[performer.id]?.crr_visit_plan} onChange={(e) => handleInputChange(performer.id, 'crr_visit_plan', e.target.value)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="number" step="0.01" className="w-24 p-1 border rounded" value={targets[performer.id]?.total_conversion_percent_plan} onChange={(e) => handleInputChange(performer.id, 'total_conversion_percent_plan', e.target.value)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="number" step="0.01" className="w-24 p-1 border rounded" value={targets[performer.id]?.nbd_conversion_percent_plan} onChange={(e) => handleInputChange(performer.id, 'nbd_conversion_percent_plan', e.target.value)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="number" step="0.01" className="w-24 p-1 border rounded" value={targets[performer.id]?.crr_conversion_percent_plan} onChange={(e) => handleInputChange(performer.id, 'crr_conversion_percent_plan', e.target.value)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="number" step="0.01" className="w-32 p-1 border rounded" value={targets[performer.id]?.total_revenue_target} onChange={(e) => handleInputChange(performer.id, 'total_revenue_target', e.target.value)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="number" step="0.01" className="w-32 p-1 border rounded" value={targets[performer.id]?.nbd_revenue_target} onChange={(e) => handleInputChange(performer.id, 'nbd_revenue_target', e.target.value)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="number" step="0.01" className="w-32 p-1 border rounded" value={targets[performer.id]?.crr_revenue_target} onChange={(e) => handleInputChange(performer.id, 'crr_revenue_target', e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 border-t flex justify-between items-center">
          <button
            onClick={handleAutoCompute}
            className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          >
            <Zap size={16} className="mr-2" />
            Auto-compute
          </button>
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Target size={16} className="mr-2" />
              Save Targets
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetTargetModal;
