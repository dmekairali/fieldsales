import React, { useState, useEffect } from 'react';
import { X, Target, Zap, ChevronLeft, ChevronRight } from 'lucide-react';

const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return [d.getUTCFullYear(), weekNo];
}

const SetTargetModal = ({ isOpen, onClose, performers, onSave, supabase }) => {
  const [targets, setTargets] = useState({});
  const [selectedDate, setSelectedDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  });
  const [defaultTargets, setDefaultTargets] = useState({
    total_visit_plan: 11,
    nbd_visit_plan: 3,
    crr_visit_plan: 8,
    total_conversion_percent_plan: 20,
    nbd_conversion_percent_plan: 5,
    crr_conversion_percent_plan: 15,
    total_revenue_target: 50000,
    nbd_revenue_split: 15,
    crr_revenue_split: 85,
  });

  useEffect(() => {
    if (performers) {
      const initialTargets = {};
      performers.forEach(performer => {
        const nbd_revenue_target = (defaultTargets.total_revenue_target * defaultTargets.nbd_revenue_split) / 100;
        const crr_revenue_target = (defaultTargets.total_revenue_target * defaultTargets.crr_revenue_split) / 100;

        initialTargets[performer.id] = {
          ...defaultTargets,
          nbd_revenue_target,
          crr_revenue_target,
        };
      });
      setTargets(initialTargets);
    }
  }, [performers, defaultTargets]);

  const handleWeekChange = (direction) => {
    setSelectedDate(currentDate => {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  };

  const handleInputChange = (mrId, field, value) => {
    setTargets(prevTargets => ({
      ...prevTargets,
      [mrId]: {
        ...prevTargets[mrId],
        [field]: value
      }
    }));
  };

  const handleAutoCompute = async () => {
    const today = new Date();
    const threeWeeksAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 21);

    const performerIds = performers.map(p => p.id);

    const { data, error } = await supabase
      .from('orders')
      .select('mr_name, net_amount')
      .in('mr_name', performerIds)
      .gte('order_date', threeWeeksAgo.toISOString().split('T')[0])
      .lte('order_date', today.toISOString().split('T')[0]);

    if (error) {
      console.error('Error fetching orders for auto-computation:', error);
      alert('Error fetching data for auto-computation.');
      return;
    }

    const revenueByPerformer = {};
    data.forEach(order => {
      if (!revenueByPerformer[order.mr_name]) {
        revenueByPerformer[order.mr_name] = 0;
      }
      revenueByPerformer[order.mr_name] += order.net_amount;
    });

    const newTargets = { ...targets };
    performers.forEach(performer => {
      const totalRevenue = revenueByPerformer[performer.id] || 0;
      const avgRevenue = totalRevenue / 3; // 3 weeks
      newTargets[performer.id].total_revenue_target = avgRevenue.toFixed(2);
    });

    setTargets(newTargets);
    alert('Auto-computation complete!');
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

  const handleDefaultTargetChange = (field, value) => {
    setDefaultTargets(prev => ({ ...prev, [field]: value }));
  };

  const [year, weekNo] = getWeekNumber(selectedDate);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Set Weekly Targets</h2>
          <div className="flex items-center gap-4">
            <button onClick={() => handleWeekChange('prev')} className="p-2 rounded-full hover:bg-gray-200">
              <ChevronLeft size={20} />
            </button>
            <div className="font-semibold">{`Year ${year}, Week ${weekNo}`}</div>
            <button onClick={() => handleWeekChange('next')} className="p-2 rounded-full hover:bg-gray-200">
              <ChevronRight size={20} />
            </button>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 grid grid-cols-5 gap-4 border-b">
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Revenue</label>
            <input type="number" value={defaultTargets.total_revenue_target} onChange={(e) => handleDefaultTargetChange('total_revenue_target', e.target.value)} className="w-full p-1 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">NBD Revenue %</label>
            <input type="number" value={defaultTargets.nbd_revenue_split} onChange={(e) => handleDefaultTargetChange('nbd_revenue_split', e.target.value)} className="w-full p-1 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CRR Revenue %</label>
            <input type="number" value={defaultTargets.crr_revenue_split} onChange={(e) => handleDefaultTargetChange('crr_revenue_split', e.target.value)} className="w-full p-1 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Visits</label>
            <input type="number" value={defaultTargets.total_visit_plan} onChange={(e) => handleDefaultTargetChange('total_visit_plan', e.target.value)} className="w-full p-1 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">NBD Visits</label>
            <input type="number" value={defaultTargets.nbd_visit_plan} onChange={(e) => handleDefaultTargetChange('nbd_visit_plan', e.target.value)} className="w-full p-1 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CRR Visits</label>
            <input type="number" value={defaultTargets.crr_visit_plan} onChange={(e) => handleDefaultTargetChange('crr_visit_plan', e.target.value)} className="w-full p-1 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Conv. %</label>
            <input type="number" value={defaultTargets.total_conversion_percent_plan} onChange={(e) => handleDefaultTargetChange('total_conversion_percent_plan', e.target.value)} className="w-full p-1 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">NBD Conv. %</label>
            <input type="number" value={defaultTargets.nbd_conversion_percent_plan} onChange={(e) => handleDefaultTargetChange('nbd_conversion_percent_plan', e.target.value)} className="w-full p-1 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CRR Conv. %</label>
            <input type="number" value={defaultTargets.crr_conversion_percent_plan} onChange={(e) => handleDefaultTargetChange('crr_conversion_percent_plan', e.target.value)} className="w-full p-1 border rounded" />
          </div>
        </div>

        <div className="p-4 overflow-y-auto">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">S.No.</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-100 z-10">MR Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Total Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">NBD Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">CRR Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Total Visits</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">NBD Visits</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">CRR Visits</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Total Conv. %</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">NBD Conv. %</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">CRR Conv. %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(performers || []).map((performer, index) => (
                  <tr key={performer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">{performer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{performer.role_level}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="number" step="0.01" className="w-32 p-1 border rounded" value={targets[performer.id]?.total_revenue_target} onChange={(e) => handleInputChange(performer.id, 'total_revenue_target', e.target.value)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="number" step="0.01" className="w-32 p-1 border rounded" value={targets[performer.id]?.nbd_revenue_target} onChange={(e) => handleInputChange(performer.id, 'nbd_revenue_target', e.target.value)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="number" step="0.01" className="w-32 p-1 border rounded" value={targets[performer.id]?.crr_revenue_target} onChange={(e) => handleInputChange(performer.id, 'crr_revenue_target', e.target.value)} />
                    </td>
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
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td colSpan="3" className="px-6 py-3 text-right text-sm font-bold text-gray-600 uppercase tracking-wider">Total</td>
                  <td className="px-6 py-3 text-left text-sm font-bold text-gray-600">{Object.values(targets).reduce((acc, t) => acc + parseFloat(t.total_revenue_target || 0), 0).toFixed(2)}</td>
                  <td className="px-6 py-3 text-left text-sm font-bold text-gray-600">{Object.values(targets).reduce((acc, t) => acc + parseFloat(t.nbd_revenue_target || 0), 0).toFixed(2)}</td>
                  <td className="px-6 py-3 text-left text-sm font-bold text-gray-600">{Object.values(targets).reduce((acc, t) => acc + parseFloat(t.crr_revenue_target || 0), 0).toFixed(2)}</td>
                  <td className="px-6 py-3 text-left text-sm font-bold text-gray-600">{Object.values(targets).reduce((acc, t) => acc + parseInt(t.total_visit_plan || 0), 0)}</td>
                  <td className="px-6 py-3 text-left text-sm font-bold text-gray-600">{Object.values(targets).reduce((acc, t) => acc + parseInt(t.nbd_visit_plan || 0), 0)}</td>
                  <td className="px-6 py-3 text-left text-sm font-bold text-gray-600">{Object.values(targets).reduce((acc, t) => acc + parseInt(t.crr_visit_plan || 0), 0)}</td>
                  <td colSpan="3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="p-4 border-t flex justify-between items-center">
          <button
            onClick={handleAutoCompute}
            disabled
            className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
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
