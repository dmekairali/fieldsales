import React, { useState, useEffect } from 'react';
import { X, Target, Zap, ChevronLeft, ChevronRight } from 'lucide-react';


const SetTargetModal = ({ isOpen, onClose, performers, onSave, supabase }) => {
  const [targets, setTargets] = useState({});
  const [selectedDate, setSelectedDate] = useState(() => {
  const today = new Date();
  return today; // This will show current week
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

  const [isSaving, setIsSaving] = useState(false);

  
/**
 * Get ISO week number and year for a date
 * @param {Date} date - Input date
 * @returns {[number, number]} - [year, weekNumber]
 */
const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  
  // Set to nearest Thursday (current date + 4 - current day number)
  // ISO weeks start on Monday, but Thursday is always in the correct week
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  
  // January 4 is always in week 1 (ISO standard)
  const week1 = new Date(d.getFullYear(), 0, 4);
  
  // Adjust to Thursday in week 1 and count number of weeks
  const weekNo = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  
  return [d.getFullYear(), weekNo];
};

/**
 * Get the Monday of the given ISO week
 * @param {number} year - Year (e.g. 2025)
 * @param {number} weekNumber - ISO week number (1-53)
 * @returns {Date} - Monday of the requested week
 */
const getWeekStartDate = (year, weekNumber) => {
  // Create a date for Jan 1 of the year
  const jan1 = new Date(year, 0, 1);
  const jan1Day = (jan1.getDay() + 6) % 7; // Convert to ISO day (0=Monday)
  
  // Calculate the date of Thursday in week 1
  let firstThursday;
  if (jan1Day <= 3) { // Week 1 contains Jan 1
    firstThursday = new Date(jan1);
    firstThursday.setDate(jan1.getDate() + (3 - jan1Day));
  } else { // Week 1 starts after Jan 1
    firstThursday = new Date(jan1);
    firstThursday.setDate(jan1.getDate() + (3 - jan1Day + 7));
  }
  
  // The Monday of week 1 is 3 days before Thursday
  const week1Monday = new Date(firstThursday);
  week1Monday.setDate(firstThursday.getDate() - 3);
  
  // Calculate the Monday of the target week
  const targetMonday = new Date(week1Monday);
  targetMonday.setDate(week1Monday.getDate() + (weekNumber - 1) * 7);
  
  // Final verification
  if (targetMonday.getDay() !== 1) {
    console.warn('Adjusting to Monday');
    while (targetMonday.getDay() !== 1) {
      targetMonday.setDate(targetMonday.getDate() + 1);
    }
  }
  
  return targetMonday;
};

/**
 * Handle saving targets with proper date validation
 */
const handleSave = async () => {
  setIsSaving(true);
  
  try {
    // 1. Get year and week number
    const [year, weekNo] = getWeekNumber(selectedDate);
    console.log(`Saving targets for Year ${year}, Week ${weekNo}`);
    
    // 2. Get the Monday of the week
    const weekStartDate = getWeekStartDate(year, weekNo);
    console.log(`Week starts on: ${weekStartDate.toDateString()}`);
    
    // 3. Validate it's actually Monday
    if (weekStartDate.getDay() !== 1) {
      throw new Error('Week calculation error - week should start on Monday');
    }
    
    // 4. Get employee IDs for all performers
    const performerNames = performers.map(p => p.name);
    const { data: mrData, error: mrError } = await supabase
      .from('medical_representatives')
      .select('employee_id, name')
      .in('name', performerNames);

    if (mrError) throw new Error(`MR lookup failed: ${mrError.message}`);
    if (!mrData?.length) throw new Error('No matching MRs found');
    
    // 5. Create name to ID mapping
    const nameToIdMap = {};
    mrData.forEach(mr => {
      nameToIdMap[mr.name] = mr.employee_id;
    });
    
    // 6. Verify all performers have IDs
    const missingIDs = performers.filter(p => !nameToIdMap[p.name]);
    if (missingIDs.length) {
      throw new Error(`Missing IDs for: ${missingIDs.map(p => p.name).join(', ')}`);
    }
    
    // 7. Delete existing targets for this week
    const employeeIds = performers.map(p => nameToIdMap[p.name]);
    const { error: deleteError } = await supabase
      .from('mr_weekly_targets')
      .delete()
      .in('employee_id', employeeIds)
      .eq('week_number', weekNo)
      .eq('week_year', year);

    if (deleteError) console.warn('Delete warning:', deleteError.message);
    
    // 8. Prepare records for insertion (Monday-Saturday)
    const recordsToInsert = [];
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 5); // Saturday
    
    performers.forEach(performer => {
      const performerTarget = targets[performer.id];
      const employeeId = nameToIdMap[performer.name];
      
      if (!performerTarget || !employeeId) {
        console.warn(`Skipping ${performer.name} - missing data`);
        return;
      }
      
      // Create records for each working day (Monday-Saturday)
      for (let i = 0; i < 6; i++) {
        const targetDate = new Date(weekStartDate);
        targetDate.setDate(weekStartDate.getDate() + i);
        
        // Validate day of week (1=Monday to 6=Saturday)
        const dayOfWeek = targetDate.getDay();
        if (dayOfWeek === 0) { // Sunday check
          throw new Error('Invalid date generated - Sunday detected');
        }
        
        recordsToInsert.push({
          employee_id: employeeId,
          mr_name: performer.name,
          week_number: weekNo,
          week_year: year,
          week_start_date: weekStartDate.toISOString().split('T')[0],
          week_end_date: weekEndDate.toISOString().split('T')[0],
          target_date: targetDate.toISOString().split('T')[0],
          total_visit_plan: performerTarget.total_visit_plan,
          nbd_visit_plan: performerTarget.nbd_visit_plan,
          crr_visit_plan: performerTarget.crr_visit_plan,
          total_conversion_percent_plan: performerTarget.total_conversion_percent_plan,
          nbd_conversion_percent_plan: performerTarget.nbd_conversion_percent_plan,
          crr_conversion_percent_plan: performerTarget.crr_conversion_percent_plan,
          total_revenue_target: performerTarget.total_revenue_target,
          nbd_revenue_target: performerTarget.nbd_revenue_target,
          crr_revenue_target: performerTarget.crr_revenue_target,
          per_day_revenue_total: (performerTarget.total_revenue_target / 6).toFixed(2),
          per_day_nbd_revenue: (performerTarget.nbd_revenue_target / 6).toFixed(2),
          per_day_crr_revenue: (performerTarget.crr_revenue_target / 6).toFixed(2),
          created_by: 'SYSTEM_MANUAL_ENTRY',
        });
      }
    });
    
    console.log('Records to insert:', recordsToInsert);
    
    // 9. Insert the new records
    const { error: insertError } = await supabase
      .from('mr_weekly_targets')
      .insert(recordsToInsert);

    if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
    
    alert('Targets saved successfully!');
    onClose();
    
  } catch (error) {
    console.error('Save error:', error);
    alert(`Error saving targets: ${error.message}`);
  } finally {
    setIsSaving(false);
  }
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
              disabled={isSaving}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <Target size={16} className="mr-2" />
              )}
              {isSaving ? 'Saving...' : 'Save Targets'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetTargetModal;
