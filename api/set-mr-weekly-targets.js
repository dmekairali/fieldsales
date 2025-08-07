const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { targets, week, year } = req.body;
    const recordsToInsert = [];

    for (const mrId in targets) {
      const performerTarget = targets[mrId];
      const weekStartDate = getWeekStartDate(year, week);

      for (let i = 0; i < 6; i++) {
        const target_date = new Date(weekStartDate);
        target_date.setDate(target_date.getDate() + i);

        const record = {
          employee_id: mrId,
          mr_name: performerTarget.name, // Assuming name is passed in targets
          week_number: week,
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
          created_by: 'SYSTEM_MANUAL_ENTRY', // Or get from session
        };
        recordsToInsert.push(record);
      }
    }

    const { data, error } = await supabase.from('mr_weekly_targets').insert(recordsToInsert);

    if (error) {
      throw error;
    }

    res.status(200).json({ message: 'Targets saved successfully', data });
  } catch (error) {
    res.status(500).json({ message: 'Error saving targets', error: error.message });
  }
};

function getWeekStartDate(year, weekNumber) {
    const firstDayOfYear = new Date(year, 0, 1);
    const daysToAdd = (weekNumber - 1) * 7;
    const weekDate = new Date(firstDayOfYear.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    const dayOfWeek = weekDate.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekDate.setDate(weekDate.getDate() + daysToMonday);
    return weekDate;
}
