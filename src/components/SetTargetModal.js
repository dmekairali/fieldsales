import React, { useState, useEffect } from 'react';
import { X, Target, Zap, ChevronLeft, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return [d.getUTCFullYear(), weekNo];
};

const getWeekStartDate = (year, weekNumber) => {
  const january4th = new Date(year, 0, 4);
  const startOfWeek1 = new Date(january4th);
  startOfWeek1.setDate(january4th.getDate() - january4th.getDay() + 1);
  
  const weekStartDate = new Date(startOfWeek1);
  weekStartDate.setDate(startOfWeek1.getDate() + (weekNumber - 1) * 7);
  
  return weekStartDate;
};

const SetTargetModal = ({ isOpen, onClose, performers, onSave }) => {
  const [targets, setTargets] = useState({});
  const [selectedDate, setSelectedDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
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

  // Initialize targets when performers change
  useEffect(() => {
    if (performers && performers.length > 0) {
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
    setTargets(prevTargets => {
      const newTargets = {
        ...prevTargets,
        [mrId]: {
          ...prevTargets[mrId],
          [field]: parseFloat(value) || 0
        }
      };
      
      // Auto-calculate splits when total changes
      if (field === 'total_revenue_target') {
        const total = parseFloat(value) || 0;
        newTargets[mrId].nbd_revenue_target = (total * defaultTargets.nbd_revenue_split) / 100;
        newTargets[mrId].crr_revenue_target = (total * defaultTargets.crr_revenue_split) / 100;
      }
      
      return newTargets;
    });
    
    // Clear validation errors when user makes changes
    setValidationErrors([]);
  };

  // Validation function
  const validateTargetsData = () => {
    const errors = [];
    
    performers.forEach(performer => {
      const target = targets[performer.id];
      
      if (!target) {
        errors.push(`Missing target data for ${performer.name}`);
        return;
      }
      
      // Check required numeric fields
      const numericFields = [
        'total_visit_plan', 'nbd_visit_plan', 'crr_visit_plan',
        'total_conversion_percent_plan', 'nbd_conversion_percent_plan', 'crr_conversion_percent_plan',
        'total_revenue_target', 'nbd_revenue_target', 'crr_revenue_target'
      ];
      
      numericFields.forEach(field => {
        const value = parseFloat(target[field]);
        if (isNaN(value) || value < 0) {
          errors.push(`${performer.name}: Invalid ${field} value: ${target[field]}`);
        }
      });
      
      // Check visit plan consistency
      const totalVisits = parseInt(target.total_visit_plan) || 0;
      const nbdVisits = parseInt(target.nbd_visit_plan) || 0;
      const crrVisits = parseInt(target.crr_visit_plan) || 0;
      
      if (totalVisits !== (nbdVisits + crrVisits)) {
        errors.push(`${performer.name}: Total visits must equal NBD + CRR visits`);
      }
      
      // Check conversion percentages add up (database constraint)
      const totalConversion = parseFloat(target.total_conversion_percent_plan) || 0;
      const nbdConversion = parseFloat(target.nbd_conversion_percent_plan) || 0;
      const crrConversion = parseFloat(target.crr_conversion_percent_plan) || 0;
      
      if (Math.abs(totalConversion - (nbdConversion + crrConversion)) >= 0.01) {
        errors.push(`${performer.name}: Total conversion % must equal NBD + CRR conversion %`);
      }
    });
    
    return errors;
  };

  // Direct Supabase save function
  const saveWeeklyTargetsDirectly = async (week, year) => {
    console.log('🎯 Starting direct Supabase save for weekly targets');
    console.log('📊 Performers data:', performers);
    console.log('🎯 Targets data:', targets);
    
    try {
      // Step 1: Validate performers have required fields
      if (!performers || performers.length === 0) {
        throw new Error('No performers data available');
      }
      
      // Check each performer has required ID field
      const invalidPerformers = performers.filter(p => !p.id || !p.name);
      if (invalidPerformers.length > 0) {
        console.error('❌ Invalid performers:', invalidPerformers);
        throw new Error(`Some performers missing ID or name: ${invalidPerformers.map(p => p.name || 'Unknown').join(', ')}`);
      }
      
      // Step 2: Check if records already exist
      const employeeIds = performers.map(p => p.id);
      console.log('🔍 Employee IDs to check:', employeeIds);
      
      const { data: existingRecords, error: checkError } = await supabase
        .from('mr_weekly_targets')
        .select('id, employee_id, mr_name')
        .in('employee_id', employeeIds)
        .eq('week_number', week)
        .eq('week_year', year);

      if (checkError) {
        console.error('❌ Check existing records error:', checkError);
        throw new Error(`Failed to check existing records: ${checkError.message}`);
      }
      
      // Step 3: Delete existing records if any
      if (existingRecords && existingRecords.length > 0) {
        console.log(`🗑️ Deleting ${existingRecords.length} existing records`);
        
        const { error: deleteError } = await supabase
          .from('mr_weekly_targets')
          .delete()
          .in('employee_id', employeeIds)
          .eq('week_number', week)
          .eq('week_year', year);

        if (deleteError) {
          console.error('❌ Delete error:', deleteError);
          throw new Error(`Failed to delete existing records: ${deleteError.message}`);
        }
      }
      
      // Step 4: Prepare records for insertion
      const recordsToInsert = [];
      const weekStartDate = getWeekStartDate(year, week);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 6);
      
      console.log('📅 Week dates:', {
        weekStartDate: weekStartDate.toISOString().split('T')[0],
        weekEndDate: weekEndDate.toISOString().split('T')[0]
      });
      
      performers.forEach((performer, performerIndex) => {
        console.log(`📋 Processing performer ${performerIndex + 1}:`, {
          id: performer.id,
          name: performer.name,
          hasTargetData: !!targets[performer.id]
        });
        
        // Validate performer data
        if (!performer.id) {
          console.error(`❌ Performer missing ID:`, performer);
          throw new Error(`Performer "${performer.name || 'Unknown'}" is missing employee ID`);
        }
        
        if (!performer.name) {
          console.error(`❌ Performer missing name:`, performer);
          throw new Error(`Performer with ID "${performer.id}" is missing name`);
        }
        
        const performerTarget = targets[performer.id];
        
        if (!performerTarget) {
          console.warn(`⚠️ Skipping ${performer.name} - no target data`);
          return;
        }
        
        // Convert values to proper types with validation
        const totalRevenue = parseFloat(performerTarget.total_revenue_target) || 0;
        const nbdRevenue = parseFloat(performerTarget.nbd_revenue_target) || 0;
        const crrRevenue = parseFloat(performerTarget.crr_revenue_target) || 0;
        
        const totalVisits = parseInt(performerTarget.total_visit_plan) || 0;
        const nbdVisits = parseInt(performerTarget.nbd_visit_plan) || 0;
        const crrVisits = parseInt(performerTarget.crr_visit_plan) || 0;
        
        // Create 6 records (Monday to Saturday)
        for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
          const targetDate = new Date(weekStartDate);
          targetDate.setDate(weekStartDate.getDate() + dayIndex);
          
          const record = {
            employee_id: performer.id.toString(), // Ensure it's a string
            mr_name: performer.name.toString(),   // Ensure it's a string
            week_number: parseInt(week),
            week_year: parseInt(year),
            week_start_date: weekStartDate.toISOString().split('T')[0],
            week_end_date: weekEndDate.toISOString().split('T')[0],
            target_date: targetDate.toISOString().split('T')[0],
            
            // Visit plans (integers)
            total_visit_plan: totalVisits,
            nbd_visit_plan: nbdVisits,
            crr_visit_plan: crrVisits,
            
            // Conversion percentages
            total_conversion_percent_plan: parseFloat(performerTarget.total_conversion_percent_plan) || 0,
            nbd_conversion_percent_plan: parseFloat(performerTarget.nbd_conversion_percent_plan) || 0,
            crr_conversion_percent_plan: parseFloat(performerTarget.crr_conversion_percent_plan) || 0,
            
            // Revenue targets
            total_revenue_target: totalRevenue,
            nbd_revenue_target: nbdRevenue,
            crr_revenue_target: crrRevenue,
            
            // Per day calculations
            per_day_revenue_total: totalRevenue > 0 ? parseFloat((totalRevenue / 6).toFixed(2)) : 0,
            per_day_nbd_revenue: nbdRevenue > 0 ? parseFloat((nbdRevenue / 6).toFixed(2)) : 0,
            per_day_crr_revenue: crrRevenue > 0 ? parseFloat((crrRevenue / 6).toFixed(2)) : 0,
            
            created_by: 'SYSTEM_MANUAL_ENTRY',
            is_active: true
          };
          
          // Validate record before adding
          if (!record.employee_id || record.employee_id === 'undefined' || record.employee_id === 'null') {
            console.error('❌ Invalid employee_id in record:', record);
            throw new Error(`Invalid employee_id for performer: ${performer.name}`);
          }
          
          if (!record.mr_name || record.mr_name === 'undefined' || record.mr_name === 'null') {
            console.error('❌ Invalid mr_name in record:', record);
            throw new Error(`Invalid mr_name for performer: ${performer.name}`);
          }
          
          recordsToInsert.push(record);
        }
      });
      
      if (recordsToInsert.length === 0) {
        throw new Error('No valid records to insert. Check that all performers have target data.');
      }
      
      console.log(`💾 Prepared ${recordsToInsert.length} records for insertion`);
      console.log('🔍 Sample record:', recordsToInsert[0]);
      
      // Step 5: Insert records in batches to avoid timeout
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < recordsToInsert.length; i += batchSize) {
        batches.push(recordsToInsert.slice(i, i + batchSize));
      }
      
      console.log(`📦 Inserting in ${batches.length} batches of max ${batchSize} records each`);
      
      let totalInserted = 0;
      let allInsertedData = [];
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`📤 Inserting batch ${batchIndex + 1}/${batches.length} (${batch.length} records)`);
        
        const { data: batchData, error: batchError } = await supabase
          .from('mr_weekly_targets')
          .insert(batch)
          .select('id, employee_id, mr_name, target_date');
        
        if (batchError) {
          console.error(`❌ Batch ${batchIndex + 1} insert error:`, batchError);
          console.error('❌ Failed batch data:', batch[0]); // Log first record of failed batch
          throw new Error(`Database insert failed in batch ${batchIndex + 1}: ${batchError.message}`);
        }
        
        totalInserted += batchData?.length || 0;
        allInsertedData = [...allInsertedData, ...batchData];
        console.log(`✅ Batch ${batchIndex + 1} inserted: ${batchData?.length} records`);
      }
      
      console.log(`✅ Successfully inserted ${totalInserted} total records`);
      
      return {
        success: true,
        records_inserted: totalInserted,
        week_number: week,
        week_year: year,
        mr_count: performers.length,
        data: allInsertedData
      };
      
    } catch (error) {
      console.error('❌ Direct save failed:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setValidationErrors([]);
    
    try {
      // Validate data first
      const errors = validateTargetsData();
      if (errors.length > 0) {
        setValidationErrors(errors);
        throw new Error(`Please fix validation errors before saving`);
      }
      
      const [year, weekNo] = getWeekNumber(selectedDate);
      
      console.log('🎯 Saving weekly targets directly to Supabase');
      console.log('Week:', weekNo, 'Year:', year);
      console.log('Performers:', performers.length);
      
      const result = await saveWeeklyTargetsDirectly(weekNo, year);
      
      console.log('✅ Save result:', result);
      
      alert(`Success! Targets saved for ${result.mr_count} MRs (${result.records_inserted} records created).`);
      
      // Call parent callback if provided
      if (onSave) {
        onSave(result);
      }
      
      onClose();
      
    } catch (error) {
      console.error('❌ Error saving targets:', error);
      alert(`Error saving targets: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDefaultTargetChange = (field, value) => {
    setDefaultTargets(prev => {
      const newDefaults = { ...prev, [field]: value };
      
      // Ensure NBD + CRR splits add up to 100%
      if (field === 'nbd_revenue_split') {
        newDefaults.crr_revenue_split = 100 - value;
      } else if (field === 'crr_revenue_split') {
        newDefaults.nbd_revenue_split = 100 - value;
      }
      
      return newDefaults;
    });
  };

  const handleAutoCompute = async () => {
    const today = new Date();
    const threeWeeksAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 21);

    try {
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
        const avgRevenue = Math.round(totalRevenue / 3); // 3 weeks average
        
        newTargets[performer.id] = {
          ...newTargets[performer.id],
          total_revenue_target: avgRevenue,
          nbd_revenue_target: Math.round((avgRevenue * defaultTargets.nbd_revenue_split) / 100),
          crr_revenue_target: Math.round((avgRevenue * defaultTargets.crr_revenue_split) / 100)
        };
      });

      setTargets(newTargets);
      alert('Auto-computation complete!');
    } catch (error) {
      console.error('Auto-compute error:', error);
      alert('Error during auto-computation.');
    }
  };

  if (!isOpen) {
    return null;
  }

  const [year, weekNo] = getWeekNumber(selectedDate);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Set Weekly Targets (Direct Save)</h2>
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

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="p-4 bg-red-50 border-b">
            <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
              <AlertCircle size={20} />
              Please fix these issues:
            </div>
            <ul className="text-red-700 text-sm list-disc list-inside">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4 flex gap-4 items-center">
            <button
              onClick={handleAutoCompute}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Zap size={16} />
              Auto-Compute from History
            </button>
          </div>

          {/* Targets Grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2 text-left">MR Name</th>
                  <th className="border border-gray-300 p-2 text-center">Total Visits</th>
                  <th className="border border-gray-300 p-2 text-center">NBD Visits</th>
                  <th className="border border-gray-300 p-2 text-center">CRR Visits</th>
                  <th className="border border-gray-300 p-2 text-center">Total Conv %</th>
                  <th className="border border-gray-300 p-2 text-center">NBD Conv %</th>
                  <th className="border border-gray-300 p-2 text-center">CRR Conv %</th>
                  <th className="border border-gray-300 p-2 text-center">Total Revenue</th>
                  <th className="border border-gray-300 p-2 text-center">NBD Revenue</th>
                  <th className="border border-gray-300 p-2 text-center">CRR Revenue</th>
                </tr>
              </thead>
              <tbody>
                {performers.map((performer, index) => (
                  <tr key={performer.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 p-2 font-medium">{performer.name}</td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        value={targets[performer.id]?.total_visit_plan || ''}
                        onChange={(e) => handleInputChange(performer.id, 'total_visit_plan', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-center"
                        min="0"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        value={targets[performer.id]?.nbd_visit_plan || ''}
                        onChange={(e) => handleInputChange(performer.id, 'nbd_visit_plan', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-center"
                        min="0"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        value={targets[performer.id]?.crr_visit_plan || ''}
                        onChange={(e) => handleInputChange(performer.id, 'crr_visit_plan', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-center"
                        min="0"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        step="0.01"
                        value={targets[performer.id]?.total_conversion_percent_plan || ''}
                        onChange={(e) => handleInputChange(performer.id, 'total_conversion_percent_plan', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-center"
                        min="0"
                        max="100"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        step="0.01"
                        value={targets[performer.id]?.nbd_conversion_percent_plan || ''}
                        onChange={(e) => handleInputChange(performer.id, 'nbd_conversion_percent_plan', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-center"
                        min="0"
                        max="100"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        step="0.01"
                        value={targets[performer.id]?.crr_conversion_percent_plan || ''}
                        onChange={(e) => handleInputChange(performer.id, 'crr_conversion_percent_plan', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-center"
                        min="0"
                        max="100"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        value={targets[performer.id]?.total_revenue_target || ''}
                        onChange={(e) => handleInputChange(performer.id, 'total_revenue_target', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-center"
                        min="0"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        value={targets[performer.id]?.nbd_revenue_target || ''}
                        onChange={(e) => handleInputChange(performer.id, 'nbd_revenue_target', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-center bg-gray-100"
                        min="0"
                        readOnly
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        value={targets[performer.id]?.crr_revenue_target || ''}
                        onChange={(e) => handleInputChange(performer.id, 'crr_revenue_target', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-center bg-gray-100"
                        min="0"
                        readOnly
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Default Targets Section */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Default Target Settings</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NBD Revenue Split (%)
                </label>
                <input
                  type="number"
                  value={defaultTargets.nbd_revenue_split}
                  onChange={(e) => handleDefaultTargetChange('nbd_revenue_split', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CRR Revenue Split (%)
                </label>
                <input
                  type="number"
                  value={defaultTargets.crr_revenue_split}
                  onChange={(e) => handleDefaultTargetChange('crr_revenue_split', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium">Total MRs</div>
                <div className="text-xl font-bold text-blue-600">{performers.length}</div>
              </div>
              <div>
                <div className="font-medium">Total Visits/Week</div>
                <div className="text-xl font-bold text-green-600">
                  {Object.values(targets).reduce((sum, target) => sum + (parseInt(target.total_visit_plan) || 0), 0)}
                </div>
              </div>
              <div>
                <div className="font-medium">Total Revenue Target</div>
                <div className="text-xl font-bold text-purple-600">
                  ₹{Object.values(targets).reduce((sum, target) => sum + (parseFloat(target.total_revenue_target) || 0), 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="font-medium">Records to Create</div>
                <div className="text-xl font-bold text-orange-600">{performers.length * 6}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle size={16} />
              Direct save to Supabase (no API required)
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Target size={16} />
                {isSaving ? 'Saving...' : 'Save Targets'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetTargetModal;
