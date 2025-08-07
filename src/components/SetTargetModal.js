import React, { useState, useEffect } from 'react';
import { X, Target, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabaseClient';

const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return [d.getUTCFullYear(), weekNo];
}

function getWeekStartDate(year, weekNumber) {
    const firstDayOfYear = new Date(year, 0, 1);
    const daysToAdd = (weekNumber - 1) * 7;
    const weekDate = new Date(firstDayOfYear.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    const dayOfWeek = weekDate.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekDate.setDate(weekDate.getDate() + daysToMonday);
    return weekDate;
}

const SetTargetModal = ({ isOpen, onClose, performers, onSave }) => {
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

        // Use performer.name as the key since performer.id is undefined
        initialTargets[performer.name] = {
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

  const handleInputChange = (performerName, field, value) => {
    setTargets(prevTargets => ({
      ...prevTargets,
      [performerName]: {
        ...prevTargets[performerName],
        [field]: value
      }
    }));
  };

  const handleAutoCompute = async () => {
    const today = new Date();
    const threeWeeksAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 21);

    const performerNames = performers.map(p => p.name);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('mr_name, net_amount')
        .in('mr_name', performerNames)
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
        const totalRevenue = revenueByPerformer[performer.name] || 0;
        const avgRevenue = totalRevenue / 3; // 3 weeks
        newTargets[performer.name].total_revenue_target = avgRevenue.toFixed(2);
      });

      setTargets(newTargets);
      alert('Auto-computation complete!');
    } catch (error) {
      console.error('Error during auto-computation:', error);
      alert('Error during auto-computation.');
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const [year, weekNo] = getWeekNumber(selectedDate);
    
    try {
      console.log('🎯 Starting save process...');
      console.log('Performers data:', performers);
      
      // Step 1: Get employee_ids from medical_representatives table
      const performerNames = performers.map(p => p.name);
      console.log('Looking up employee_ids for names:', performerNames);
      
      const { data: mrData, error: mrError } = await supabase
        .from('medical_representatives')
        .select('employee_id, name')
        .in('name', performerNames);

      if (mrError) {
        throw new Error(`Failed to get employee IDs: ${mrError.message}`);
      }

      if (!mrData || mrData.length === 0) {
        throw new Error('No matching medical representatives found in database');
      }

      console.log('Found MR data:', mrData);

      // Step 2: Create name to employee_id mapping
      const nameToIdMap = {};
      mrData.forEach(mr => {
        nameToIdMap[mr.name] = mr.employee_id;
      });

      console.log('Name to ID mapping:', nameToIdMap);

      // Step 3: Check for missing mappings
      const missingMappings = performers.filter(p => !nameToIdMap[p.name]);
      if (missingMappings.length > 0) {
        throw new Error(`Employee IDs not found for: ${missingMappings.map(p => p.name).join(', ')}`);
      }

      // Step 4: Delete existing records for this week
      const employeeIds = performers.map(p => nameToIdMap[p.name]);
      console.log('Employee IDs:', employeeIds);

      const { error: deleteError } = await supabase
        .from('mr_weekly_targets')
        .delete()
        .in('employee_id', employeeIds)
        .eq('week_number', weekNo)
        .eq('week_year', year);

      if (deleteError) {
        console.warn('Delete existing records warning:', deleteError);
      }

      // Step 5: Prepare records for insertion
      const recordsToInsert = [];
      const weekStartDate = getWeekStartDate(year, weekNo);

      performers.forEach(performer => {
        const performerTarget = targets[performer.name];
        const employeeId = nameToIdMap[performer.name];
        
        if (!performerTarget) {
          console.warn(`No target data for ${performer.name}`);
          return;
        }

        if (!employeeId) {
          console.error(`No employee ID found for ${performer.name}`);
          return;
        }

        for (let i = 0; i < 6; i++) {
          const target_date = new Date(weekStartDate);
          target_date.setDate(target_date.getDate() + i);

          const record = {
            employee_id: employeeId,
            mr_name: performer.name,
            week_number: weekNo,
            week_year: year,
            week_start_date: weekStartDate.toISOString().split('T')[0],
            week_end_date: new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            target_date: target_date.toISOString().split('T')[0],
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
          };
          recordsToInsert.push(record);
        }
      });

      if (recordsToInsert.length === 0) {
        throw new Error('No records to insert');
      }

      console.log(`Inserting ${recordsToInsert.length} records...`);
      console.log('Sample record:', recordsToInsert[0]);

      // Step 6: Insert records
      const { data, error } = await supabase
        .from('mr_weekly_targets')
        .insert(recordsToInsert);

      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }

      console.log('Insert successful!');
      alert('Targets saved successfully!');
      onClose();

    } catch (error) {
      console.error('Error saving targets:', error);
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
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-6 flex flex-wrap gap-4 items-center">
            <button
              onClick={handleAutoCompute}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
            >
              <Zap size={20} />
              Auto-Compute from Last 3 Weeks
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {performers.map((performer, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">{performer.name}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Visit Plans */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700">Visit Plans</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Total Visits</label>
                      <input
                        type="number"
                        value={targets[performer.name]?.total_visit_plan || ''}
                        onChange={(e) => handleInputChange(performer.name, 'total_visit_plan', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">NBD Visits</label>
                      <input
                        type="number"
                        value={targets[performer.name]?.nbd_visit_plan || ''}
                        onChange={(e) => handleInputChange(performer.name, 'nbd_visit_plan', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">CRR Visits</label>
                      <input
                        type="number"
                        value={targets[performer.name]?.crr_visit_plan || ''}
                        onChange={(e) => handleInputChange(performer.name, 'crr_visit_plan', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Conversion Plans */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700">Conversion %</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Total Conversion %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={targets[performer.name]?.total_conversion_percent_plan || ''}
                        onChange={(e) => handleInputChange(performer.name, 'total_conversion_percent_plan', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">NBD Conversion %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={targets[performer.name]?.nbd_conversion_percent_plan || ''}
                        onChange={(e) => handleInputChange(performer.name, 'nbd_conversion_percent_plan', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">CRR Conversion %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={targets[performer.name]?.crr_conversion_percent_plan || ''}
                        onChange={(e) => handleInputChange(performer.name, 'crr_conversion_percent_plan', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Revenue Targets */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700">Revenue Targets</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Total Revenue</label>
                      <input
                        type="number"
                        value={targets[performer.name]?.total_revenue_target || ''}
                        onChange={(e) => handleInputChange(performer.name, 'total_revenue_target', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">NBD Revenue</label>
                      <input
                        type="number"
                        value={targets[performer.name]?.nbd_revenue_target || ''}
                        onChange={(e) => handleInputChange(performer.name, 'nbd_revenue_target', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">CRR Revenue</label>
                      <input
                        type="number"
                        value={targets[performer.name]?.crr_revenue_target || ''}
                        onChange={(e) => handleInputChange(performer.name, 'crr_revenue_target', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Default Settings */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-800">Default Target Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">NBD Revenue Split (%)</label>
                  <input
                    type="number"
                    value={defaultTargets.nbd_revenue_split}
                    onChange={(e) => handleDefaultTargetChange('nbd_revenue_split', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">CRR Revenue Split (%)</label>
                  <input
                    type="number"
                    value={defaultTargets.crr_revenue_split}
                    onChange={(e) => handleDefaultTargetChange('crr_revenue_split', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              <Target size={20} />
              {isSaving ? 'Saving...' : 'Save Targets'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetTargetModal;
