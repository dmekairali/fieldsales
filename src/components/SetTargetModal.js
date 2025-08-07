import React, { useState, useEffect } from 'react';
import { X, Target, Zap, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Calculator, TrendingUp, Users, DollarSign } from 'lucide-react';
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

        initialTargets[performer.employee_id || performer.id] = {
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

  const handleInputChange = (employeeId, field, value) => {
    setTargets(prevTargets => {
      const newTargets = {
        ...prevTargets,
        [employeeId]: {
          ...prevTargets[employeeId],
          [field]: parseFloat(value) || 0
        }
      };
      
      // Auto-calculate splits when total changes
      if (field === 'total_revenue_target') {
        const total = parseFloat(value) || 0;
        newTargets[employeeId].nbd_revenue_target = (total * defaultTargets.nbd_revenue_split) / 100;
        newTargets[employeeId].crr_revenue_target = (total * defaultTargets.crr_revenue_split) / 100;
      }
      
      // Auto-calculate total when NBD/CRR changes
      if (field === 'nbd_visit_plan' || field === 'crr_visit_plan') {
        const nbd = field === 'nbd_visit_plan' ? (parseInt(value) || 0) : (parseInt(newTargets[employeeId].nbd_visit_plan) || 0);
        const crr = field === 'crr_visit_plan' ? (parseInt(value) || 0) : (parseInt(newTargets[employeeId].crr_visit_plan) || 0);
        newTargets[employeeId].total_visit_plan = nbd + crr;
      }
      
      // Auto-calculate total conversion when NBD/CRR changes
      if (field === 'nbd_conversion_percent_plan' || field === 'crr_conversion_percent_plan') {
        const nbd = field === 'nbd_conversion_percent_plan' ? (parseFloat(value) || 0) : (parseFloat(newTargets[employeeId].nbd_conversion_percent_plan) || 0);
        const crr = field === 'crr_conversion_percent_plan' ? (parseFloat(value) || 0) : (parseFloat(newTargets[employeeId].crr_conversion_percent_plan) || 0);
        newTargets[employeeId].total_conversion_percent_plan = nbd + crr;
      }
      
      return newTargets;
    });
    
    setValidationErrors([]);
  };

  const handleDefaultTargetChange = (field, value) => {
    setDefaultTargets(prev => {
      const newDefaults = { ...prev, [field]: value };
      
      if (field === 'nbd_revenue_split') {
        newDefaults.crr_revenue_split = 100 - value;
      } else if (field === 'crr_revenue_split') {
        newDefaults.nbd_revenue_split = 100 - value;
      }
      
      return newDefaults;
    });
  };

  // Validation function
  const validateTargetsData = () => {
    const errors = [];
    
    performers.forEach(performer => {
      const employeeId = performer.employee_id || performer.id;
      const target = targets[employeeId];
      
      if (!target) {
        errors.push(`Missing target data for ${performer.name}`);
        return;
      }
      
      const numericFields = [
        'total_visit_plan', 'nbd_visit_plan', 'crr_visit_plan',
        'total_conversion_percent_plan', 'nbd_conversion_percent_plan', 'crr_conversion_percent_plan',
        'total_revenue_target', 'nbd_revenue_target', 'crr_revenue_target'
      ];
      
      numericFields.forEach(field => {
        const value = parseFloat(target[field]);
        if (isNaN(value) || value < 0) {
          errors.push(`${performer.name}: Invalid ${field}`);
        }
      });
      
      const totalConversion = parseFloat(target.total_conversion_percent_plan) || 0;
      const nbdConversion = parseFloat(target.nbd_conversion_percent_plan) || 0;
      const crrConversion = parseFloat(target.crr_conversion_percent_plan) || 0;
      
      if (Math.abs(totalConversion - (nbdConversion + crrConversion)) >= 0.01) {
        errors.push(`${performer.name}: Conversion percentages don't match`);
      }
    });
    
    return errors;
  };

  // Direct Supabase save function
  const saveWeeklyTargetsDirectly = async (week, year) => {
    console.log('🎯 Starting direct Supabase save for weekly targets');
    
    try {
      const employeeIds = performers.map(p => p.employee_id || p.id);
      
      // Delete existing records
      const { error: deleteError } = await supabase
        .from('mr_weekly_targets')
        .delete()
        .in('employee_id', employeeIds)
        .eq('week_number', week)
        .eq('week_year', year);

      if (deleteError) {
        throw new Error(`Failed to delete existing records: ${deleteError.message}`);
      }
      
      const recordsToInsert = [];
      const weekStartDate = getWeekStartDate(year, week);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 6);
      
      performers.forEach(performer => {
        const employeeId = performer.employee_id || performer.id;
        const performerTarget = targets[employeeId];
        
        if (!performerTarget) {
          console.warn(`⚠️ Skipping ${performer.name} - no target data`);
          return;
        }
        
        const totalRevenue = parseFloat(performerTarget.total_revenue_target) || 0;
        const nbdRevenue = parseFloat(performerTarget.nbd_revenue_target) || 0;
        const crrRevenue = parseFloat(performerTarget.crr_revenue_target) || 0;
        
        // Create 6 records (Monday to Saturday)
        for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
          const targetDate = new Date(weekStartDate);
          targetDate.setDate(weekStartDate.getDate() + dayIndex);
          
          const record = {
            employee_id: employeeId,  // Fixed: use proper employee_id
            mr_name: performer.name,
            week_number: parseInt(week),
            week_year: parseInt(year),
            week_start_date: weekStartDate.toISOString().split('T')[0],
            week_end_date: weekEndDate.toISOString().split('T')[0],
            target_date: targetDate.toISOString().split('T')[0],
            
            total_visit_plan: parseInt(performerTarget.total_visit_plan) || 0,
            nbd_visit_plan: parseInt(performerTarget.nbd_visit_plan) || 0,
            crr_visit_plan: parseInt(performerTarget.crr_visit_plan) || 0,
            
            total_conversion_percent_plan: parseFloat(performerTarget.total_conversion_percent_plan) || 0,
            nbd_conversion_percent_plan: parseFloat(performerTarget.nbd_conversion_percent_plan) || 0,
            crr_conversion_percent_plan: parseFloat(performerTarget.crr_conversion_percent_plan) || 0,
            
            total_revenue_target: totalRevenue,
            nbd_revenue_target: nbdRevenue,
            crr_revenue_target: crrRevenue,
            
            per_day_revenue_total: totalRevenue > 0 ? parseFloat((totalRevenue / 6).toFixed(2)) : 0,
            per_day_nbd_revenue: nbdRevenue > 0 ? parseFloat((nbdRevenue / 6).toFixed(2)) : 0,
            per_day_crr_revenue: crrRevenue > 0 ? parseFloat((crrRevenue / 6).toFixed(2)) : 0,
            
            created_by: 'SYSTEM_MANUAL_ENTRY',
            is_active: true
          };
          
          recordsToInsert.push(record);
        }
      });
      
      if (recordsToInsert.length === 0) {
        throw new Error('No valid records to insert');
      }
      
      console.log(`💾 Inserting ${recordsToInsert.length} records`);
      console.log('Sample record:', recordsToInsert[0]);
      
      const { data, error } = await supabase
        .from('mr_weekly_targets')
        .insert(recordsToInsert)
        .select('id, employee_id, mr_name, target_date');
      
      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw new Error(`Database insert failed: ${error.message}`);
      }
      
      console.log(`✅ Successfully inserted ${data?.length || 0} records`);
      
      return {
        success: true,
        records_inserted: data?.length || 0,
        week_number: week,
        week_year: year,
        mr_count: performers.length,
        data: data
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
      const errors = validateTargetsData();
      if (errors.length > 0) {
        setValidationErrors(errors);
        throw new Error(`Please fix validation errors before saving`);
      }
      
      const [year, weekNo] = getWeekNumber(selectedDate);
      
      console.log('🎯 Saving weekly targets directly to Supabase');
      console.log('Week:', weekNo, 'Year:', year);
      console.log('Performers:', performers.map(p => ({ id: p.employee_id || p.id, name: p.name })));
      
      const result = await saveWeeklyTargetsDirectly(weekNo, year);
      
      console.log('✅ Save result:', result);
      
      alert(`🎉 Success! Targets saved for ${result.mr_count} MRs (${result.records_inserted} records created).`);
      
      if (onSave) {
        onSave(result);
      }
      
      onClose();
      
    } catch (error) {
      console.error('❌ Error saving targets:', error);
      alert(`❌ Error saving targets: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoCompute = async () => {
    const today = new Date();
    const threeWeeksAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 21);

    try {
      const performerIds = performers.map(p => p.employee_id || p.id);

      const { data, error } = await supabase
        .from('orders')
        .select('mr_name, net_amount')
        .in('mr_name', performerIds)
        .gte('order_date', threeWeeksAgo.toISOString().split('T')[0])
        .lte('order_date', today.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching orders:', error);
        alert('Error fetching historical data.');
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
        const employeeId = performer.employee_id || performer.id;
        const totalRevenue = revenueByPerformer[employeeId] || 0;
        const avgRevenue = Math.round(totalRevenue / 3);
        
        if (newTargets[employeeId]) {
          newTargets[employeeId] = {
            ...newTargets[employeeId],
            total_revenue_target: avgRevenue,
            nbd_revenue_target: Math.round((avgRevenue * defaultTargets.nbd_revenue_split) / 100),
            crr_revenue_target: Math.round((avgRevenue * defaultTargets.crr_revenue_split) / 100)
          };
        }
      });

      setTargets(newTargets);
      alert('✨ Auto-computation complete based on 3-week average!');
    } catch (error) {
      console.error('Auto-compute error:', error);
      alert('❌ Error during auto-computation.');
    }
  };

  // Calculate totals for footer
  const calculateTotals = () => {
    return performers.reduce((totals, performer) => {
      const employeeId = performer.employee_id || performer.id;
      const target = targets[employeeId] || {};
      
      return {
        totalVisits: totals.totalVisits + (parseInt(target.total_visit_plan) || 0),
        nbdVisits: totals.nbdVisits + (parseInt(target.nbd_visit_plan) || 0),
        crrVisits: totals.crrVisits + (parseInt(target.crr_visit_plan) || 0),
        totalRevenue: totals.totalRevenue + (parseFloat(target.total_revenue_target) || 0),
        nbdRevenue: totals.nbdRevenue + (parseFloat(target.nbd_revenue_target) || 0),
        crrRevenue: totals.crrRevenue + (parseFloat(target.crr_revenue_target) || 0),
      };
    }, {
      totalVisits: 0, nbdVisits: 0, crrVisits: 0,
      totalRevenue: 0, nbdRevenue: 0, crrRevenue: 0
    });
  };

  const totals = calculateTotals();

  if (!isOpen) {
    return null;
  }

  const [year, weekNo] = getWeekNumber(selectedDate);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start pt-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[95vh] flex flex-col border-0 overflow-hidden">
        {/* Modern Header with Gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Target size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Weekly Targets Dashboard</h2>
                <p className="text-blue-100 text-sm">Set performance targets for your sales team</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleWeekChange('prev')} 
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="text-center">
                    <div className="text-lg font-bold">Week {weekNo}</div>
                    <div className="text-sm text-blue-100">{year}</div>
                  </div>
                  <button 
                    onClick={() => handleWeekChange('next')} 
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
              
              <button 
                onClick={onClose} 
                className="p-3 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{performers.length}</div>
                  <div className="text-sm text-gray-500">Team Members</div>
                </div>
                <Users className="text-blue-500" size={24} />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totals.totalVisits}</div>
                  <div className="text-sm text-gray-500">Total Visits</div>
                </div>
                <TrendingUp className="text-green-500" size={24} />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">₹{(totals.totalRevenue / 100000).toFixed(1)}L</div>
                  <div className="text-sm text-gray-500">Revenue Target</div>
                </div>
                <DollarSign className="text-purple-500" size={24} />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{performers.length * 6}</div>
                  <div className="text-sm text-gray-500">Records to Create</div>
                </div>
                <Calculator className="text-orange-500" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-6 bg-white border-b">
          <div className="flex gap-4">
            <button
              onClick={handleAutoCompute}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 flex items-center gap-2 transition-all shadow-lg font-medium"
            >
              <Zap size={18} />
              Smart Auto-Compute
            </button>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
              <AlertCircle size={20} />
              Please fix these issues:
            </div>
            <ul className="text-red-700 text-sm space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Main Table Container */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="border-r border-gray-200 p-4 text-left font-semibold text-gray-700 bg-gray-50 sticky left-0 z-20 min-w-[200px]">
                    MR Name
                  </th>
                  <th className="border-r border-gray-200 p-4 text-center font-semibold text-gray-700 min-w-[120px]">Total Visits</th>
                  <th className="border-r border-gray-200 p-4 text-center font-semibold text-gray-700 min-w-[120px]">NBD Visits</th>
                  <th className="border-r border-gray-200 p-4 text-center font-semibold text-gray-700 min-w-[120px]">CRR Visits</th>
                  <th className="border-r border-gray-200 p-4 text-center font-semibold text-gray-700 min-w-[140px]">Total Conv %</th>
                  <th className="border-r border-gray-200 p-4 text-center font-semibold text-gray-700 min-w-[140px]">NBD Conv %</th>
                  <th className="border-r border-gray-200 p-4 text-center font-semibold text-gray-700 min-w-[140px]">CRR Conv %</th>
                  <th className="border-r border-gray-200 p-4 text-center font-semibold text-gray-700 min-w-[150px]">Total Revenue</th>
                  <th className="border-r border-gray-200 p-4 text-center font-semibold text-gray-700 min-w-[140px]">NBD Revenue</th>
                  <th className="border-gray-200 p-4 text-center font-semibold text-gray-700 min-w-[140px]">CRR Revenue</th>
                </tr>
              </thead>
              
              <tbody>
                {performers.map((performer, index) => {
                  const employeeId = performer.employee_id || performer.id;
                  return (
                    <tr key={employeeId} className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="border-r border-gray-200 p-4 font-medium text-gray-900 bg-white sticky left-0 z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {performer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold">{performer.name}</div>
                            <div className="text-xs text-gray-500">ID: {employeeId}</div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="border-r border-gray-200 p-2">
                        <input
                          type="number"
                          value={targets[employeeId]?.total_visit_plan || ''}
                          onChange={(e) => handleInputChange(employeeId, 'total_visit_plan', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          min="0"
                          readOnly
                        />
                      </td>
                      
                      <td className="border-r border-gray-200 p-2">
                        <input
                          type="number"
                          value={targets[employeeId]?.nbd_visit_plan || ''}
                          onChange={(e) => handleInputChange(employeeId, 'nbd_visit_plan', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          min="0"
                        />
                      </td>
                      
                      <td className="border-r border-gray-200 p-2">
                        <input
                          type="number"
                          value={targets[employeeId]?.crr_visit_plan || ''}
                          onChange={(e) => handleInputChange(employeeId, 'crr_visit_plan', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          min="0"
                        />
                      </td>
                      
                      <td className="border-r border-gray-200 p-2">
                        <input
                          type="number"
                          step="0.01"
                          value={targets[employeeId]?.total_conversion_percent_plan || ''}
                          onChange={(e) => handleInputChange(employeeId, 'total_conversion_percent_plan', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50"
                          min="0"
                          max="100"
                          readOnly
                        />
                      </td>
                      
                      <td className="border-r border-gray-200 p-2">
                        <input
                          type="number"
                          step="0.01"
                          value={targets[employeeId]?.nbd_conversion_percent_plan || ''}
                          onChange={(e) => handleInputChange(employeeId, 'nbd_conversion_percent_plan', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          min="0"
                          max="100"
                        />
                      </td>
                      
                      <td className="border-r border-gray-200 p-2">
                        <input
                          type="number"
                          step="0.01"
                          value={targets[employeeId]?.crr_conversion_percent_plan || ''}
                          onChange={(e) => handleInputChange(employeeId, 'crr_conversion_percent_plan', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          min="0"
                          max="100"
                        />
                      </td>
                      
                      <td className="border-r border-gray-200 p-2">
                        <input
                          type="number"
                          value={targets[employeeId]?.total_revenue_target || ''}
                          onChange={(e) => handleInputChange(employeeId, 'total_revenue_target', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          min="0"
                        />
                      </td>
                      
                      <td className="border-r border-gray-200 p-2">
                        <input
                          type="number"
                          value={targets[employeeId]?.nbd_revenue_target || ''}
                          onChange={(e) => handleInputChange(employeeId, 'nbd_revenue_target', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          min="0"
                          readOnly
                        />
                      </td>
                      
                      <td className="border-gray-200 p-2">
                        <input
                          type="number"
                          value={targets[employeeId]?.crr_revenue_target || ''}
                          onChange={(e) => handleInputChange(employeeId, 'crr_revenue_target', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          min="0"
                          readOnly
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              
              {/* Frozen Footer Totals */}
              <tfoot className="bg-gradient-to-r from-gray-800 to-gray-900 text-white sticky bottom-0 z-10">
                <tr>
                  <td className="border-r border-gray-600 p-4 font-bold text-white bg-gray-800 sticky left-0 z-20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        Σ
                      </div>
                      <div>
                        <div className="font-bold text-lg">TOTALS</div>
                        <div className="text-xs text-gray-300">{performers.length} Members</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="border-r border-gray-600 p-4 text-center">
                    <div className="font-bold text-xl text-green-400">{totals.totalVisits}</div>
                    <div className="text-xs text-gray-300">Total Visits</div>
                  </td>
                  
                  <td className="border-r border-gray-600 p-4 text-center">
                    <div className="font-bold text-xl text-blue-400">{totals.nbdVisits}</div>
                    <div className="text-xs text-gray-300">NBD Visits</div>
                  </td>
                  
                  <td className="border-r border-gray-600 p-4 text-center">
                    <div className="font-bold text-xl text-purple-400">{totals.crrVisits}</div>
                    <div className="text-xs text-gray-300">CRR Visits</div>
                  </td>
                  
                  <td className="border-r border-gray-600 p-4 text-center">
                    <div className="font-bold text-xl text-yellow-400">
                      {totals.totalVisits > 0 ? ((totals.nbdVisits + totals.crrVisits) / totals.totalVisits * 100).toFixed(1) : 0}%
                    </div>
                    <div className="text-xs text-gray-300">Avg Conv</div>
                  </td>
                  
                  <td className="border-r border-gray-600 p-4 text-center">
                    <div className="font-bold text-xl text-cyan-400">
                      {performers.length > 0 ? (totals.nbdVisits / performers.length).toFixed(1) : 0}%
                    </div>
                    <div className="text-xs text-gray-300">Avg NBD</div>
                  </td>
                  
                  <td className="border-r border-gray-600 p-4 text-center">
                    <div className="font-bold text-xl text-pink-400">
                      {performers.length > 0 ? (totals.crrVisits / performers.length).toFixed(1) : 0}%
                    </div>
                    <div className="text-xs text-gray-300">Avg CRR</div>
                  </td>
                  
                  <td className="border-r border-gray-600 p-4 text-center">
                    <div className="font-bold text-xl text-green-400">
                      ₹{(totals.totalRevenue / 100000).toFixed(2)}L
                    </div>
                    <div className="text-xs text-gray-300">Total Revenue</div>
                  </td>
                  
                  <td className="border-r border-gray-600 p-4 text-center">
                    <div className="font-bold text-xl text-blue-400">
                      ₹{(totals.nbdRevenue / 100000).toFixed(2)}L
                    </div>
                    <div className="text-xs text-gray-300">NBD Revenue</div>
                  </td>
                  
                  <td className="border-gray-600 p-4 text-center">
                    <div className="font-bold text-xl text-purple-400">
                      ₹{(totals.crrRevenue / 100000).toFixed(2)}L
                    </div>
                    <div className="text-xs text-gray-300">CRR Revenue</div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Revenue Split Settings */}
        <div className="p-6 bg-gray-50 border-t">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calculator size={20} className="text-blue-600" />
              Revenue Split Configuration
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NBD Revenue Split (%)
                </label>
                <input
                  type="number"
                  value={defaultTargets.nbd_revenue_split}
                  onChange={(e) => handleDefaultTargetChange('nbd_revenue_split', parseFloat(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  min="0"
                  max="100"
                />
                <div className="mt-1 text-xs text-gray-500">
                  New Business Development allocation
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CRR Revenue Split (%)
                </label>
                <input
                  type="number"
                  value={defaultTargets.crr_revenue_split}
                  onChange={(e) => handleDefaultTargetChange('crr_revenue_split', parseFloat(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  min="0"
                  max="100"
                />
                <div className="mt-1 text-xs text-gray-500">
                  Customer Relationship & Retention allocation
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-700">
                <strong>Note:</strong> Revenue splits are automatically balanced to total 100%. 
                NBD typically ranges 10-20%, CRR 80-90% based on business strategy.
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-6 border-t bg-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle size={16} className="text-green-500" />
                Direct database save (no API required)
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Target size={16} className="text-blue-500" />
                {performers.length * 6} records will be created
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-medium"
                disabled={isSaving}
              >
                Cancel
              </button>
              
              <button
                onClick={handleSave}
                disabled={isSaving || validationErrors.length > 0}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-lg font-medium text-lg"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving Targets...
                  </>
                ) : (
                  <>
                    <Target size={20} />
                    Save Weekly Targets
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetTargetModal;
