import { supabase } from '../supabaseClient';

const standardizeName = (name) => {
    if (!name) return '';
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/#S$/, '')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
};

export const fetchFilterData = async (getUnknownMRsFromSalesData) => {
    try {
      // Fetch teams (ASM/RSM) - Using name as identifier
      const { data: teamData } = await supabase
        .from('medical_representatives')
        .select('name, role_level, region')
        .in('role_level', ['ASM', 'RSM'])
        .eq('is_active', true)
        .order('role_level', { ascending: false })
        .order('name');

      // Standardize team names
      const standardizedTeams = teamData?.map(team => ({
        ...team,
        name: standardizeName(team.name),
        original_name: team.name
      })) || [];

      // Fetch unique states
      const { data: stateData } = await supabase
        .from('medical_representatives')
        .select('state')
        .not('state', 'is', null)
        .eq('role_level', 'MR')
        .order('state');

      // Fetch unique regions
      const { data: regionData } = await supabase
        .from('medical_representatives')
        .select('region')
        .not('region', 'is', null)
        .eq('role_level', 'MR')
        .order('region');

      const uniqueStates = [...new Set(stateData?.map(item => item.state) || [])];
      const uniqueRegions = [...new Set(regionData?.map(item => item.region) || [])];

      // Fetch all medical representatives
      const { data: mrData } = await supabase
        .from('medical_representatives')
        .select('name, role_level, is_active, region, state, area_sales_manager_name, regional_sales_manager_name')
        .order('name');

      // Standardize all names in medical reps data
      const standardizedMRData = mrData?.map(rep => ({
        ...rep,
        name: standardizeName(rep.name),
        area_sales_manager_name: standardizeName(rep.area_sales_manager_name),
        regional_sales_manager_name: standardizeName(rep.regional_sales_manager_name),
        original_name: rep.name
      })) || [];

      // Fetch unknown MRs
      const unknownMRData = await getUnknownMRsFromSalesData();

      console.log('Filter data loaded:', {
        teams: standardizedTeams.length,
        states: uniqueStates.length,
        regions: uniqueRegions.length,
        allReps: standardizedMRData.length,
        mrOnly: standardizedMRData.filter(r => r.role_level === 'MR').length,
        unknownMRs: unknownMRData.length
      });

      return {
          teams: standardizedTeams,
          states: uniqueStates,
          regions: uniqueRegions,
          medicalReps: standardizedMRData,
          unknownMRs: unknownMRData
      }
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  export const fetchDashboardData = async (
    getDateRange,
    getPreviousDateRange,
    selectedPeriod,
    selectedMR,
    selectedTeam,
    selectedRegion,
    selectedState,
    getFilteredMedicalReps,
    medicalReps,
    teams,
    processDataWithConversions,
    getUnknownMRsFromSalesData
  ) => {
    try {
      const currentRange = getDateRange();
      const previousRange = getPreviousDateRange(currentRange);

      console.log('Date ranges:', { current: currentRange, previous: previousRange });
      console.log('Current filters:', { selectedRegion, selectedTeam, selectedState, selectedMR });

      const fetchDataForRange = async (range) => {
        const { start, end } = range;

        // Build base queries
        let orderQuery = supabase
          .from('orders')
          .select(`
            order_id,
            order_date,
            net_amount,
            order_type,
            mr_name,
            customer_code,
            state,
            status,
            delivery_status,
            payment_status
          `)
          .gte('order_date', start)
          .lte('order_date', end)
          .in('customer_type', ['Doctor', 'Retailer'])
          .eq('status', 'Order Confirmed')
          .or('delivery_status.eq.Dispatch Confirmed,delivery_status.is.null');

        let visitQuery = supabase
          .from('mr_visits')
          .select(`
            "visitId",
            "dcrDate",
            "empName",
            "clientMobileNo",
            "clientName",
            "amountOfSale"
          `)
          .gte('"dcrDate"', start)
          .lte('"dcrDate"', end);

        let targetQuery = supabase
          .from('mr_weekly_targets')
          .select('*')
          .gte('target_date', start)
          .lte('target_date', end);

        // Handle MR selection by name
        if (selectedMR !== 'all') {
          console.log('Selected MR:', selectedMR);

          // For regular MRs and Sales Agents, filter by standardized name
          orderQuery = orderQuery.ilike('mr_name', `%${selectedMR}%`);
          visitQuery = visitQuery.ilike('"empName"', `%${selectedMR}%`);
          targetQuery = targetQuery.ilike('mr_name', `%${selectedMR}%`);

        } else {
          // Handle team-based filtering
          if (selectedTeam === 'all' && selectedRegion === 'all' && selectedState === 'all') {
            console.log('Showing ALL data without MR filtering');
          } else {
            let allIncludedPersons = [];

            if (selectedTeam === 'independent') {
              const independentMRs = medicalReps.filter(rep =>
                rep.role_level === 'MR' &&
                !rep.area_sales_manager_name &&
                !rep.regional_sales_manager_name
              );

              let filteredIndependent = [...independentMRs];
              if (selectedRegion !== 'all') {
                filteredIndependent = filteredIndependent.filter(rep => rep.region === selectedRegion);
              }
              if (selectedState !== 'all') {
                filteredIndependent = filteredIndependent.filter(rep => rep.state === selectedState);
              }

              allIncludedPersons = filteredIndependent;

            } else {
              const { activeReps, inactiveReps } = getFilteredMedicalReps();
              allIncludedPersons = [...activeReps, ...inactiveReps];

              if (selectedTeam !== 'all') {
                const selectedTeamData = teams.find(team => standardizeName(team.name) === selectedTeam);
                if (selectedTeamData) {
                  allIncludedPersons.push(selectedTeamData);
                }
              }
            }

            if (allIncludedPersons.length === 0) {
              return { orders: [], visits: [], targets: [] };
            }

            // Use original names for database queries
            const personNames = allIncludedPersons.map(person => person.original_name || person.name);
            orderQuery = orderQuery.in('mr_name', personNames);
            visitQuery = visitQuery.in('"empName"', personNames);
            targetQuery = targetQuery.in('mr_name', personNames);
          }
        }

        // Apply state filter to orders if needed
        if (selectedState !== 'all') {
          orderQuery = orderQuery.eq('state', selectedState);
        }

        try {
          const [orderData, visitData, targetData] = await Promise.all([
            orderQuery,
            visitQuery,
            targetQuery,
          ]);

          // Standardize names in the results
          const standardizedOrders = (orderData.data || []).map(order => ({
            ...order,
            mr_name_standardized: standardizeName(order.mr_name)
          }));

          const standardizedVisits = (visitData.data || []).map(visit => ({
            ...visit,
            empName_standardized: standardizeName(visit.empName)
          }));

          const standardizedTargets = (targetData.data || []).map(target => ({
            ...target,
            mr_name_standardized: standardizeName(target.mr_name)
          }));

          const results = {
            orders: standardizedOrders,
            visits: standardizedVisits,
            targets: standardizedTargets,
          };

          console.log('Query results:', {
            selectedMR: selectedMR,
            orders: results.orders.length,
            visits: results.visits.length,
            totalRevenue: results.orders.reduce((sum, order) => sum + (order.net_amount || 0), 0)
          });

          return results;

        } catch (error) {
          console.error('Database query error:', error);
          return { orders: [], visits: [], targets: [] };
        }
      };

      const [currentData, previousData, allVisitsData] = await Promise.all([
        fetchDataForRange(currentRange),
        fetchDataForRange(previousRange),
        supabase
          .from('mr_visits')
          .select(`"clientMobileNo", "empName", "dcrDate"`)
          .order('"dcrDate"', { ascending: true })
      ]);

      // Standardize names in all visits data
      const standardizedAllVisits = (allVisitsData.data || []).map(visit => ({
        ...visit,
        empName_standardized: standardizeName(visit.empName)
      }));

      console.log('Final data summary:', {
        currentOrders: currentData.orders.length,
        currentVisits: currentData.visits.length,
        previousOrders: previousData.orders.length,
        previousVisits: previousData.visits.length
      });

      // Process data
      const processedData = processDataWithConversions(
        currentData.orders,
        currentData.visits,
        currentData.targets,
        previousData.orders,
        previousData.visits,
        medicalReps,
        standardizedAllVisits
      );

      return processedData
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  export const getUnknownMRsFromSalesData = async (getDateRange, medicalReps) => {
    try {
      const currentRange = getDateRange();

      // Get all unique MR names from orders in current period
      const { data: orderMRs } = await supabase
        .from('orders')
        .select('mr_name')
        .gte('order_date', currentRange.start)
        .lte('order_date', currentRange.end)
        .in('customer_type', ['Doctor', 'Retailer'])
        .eq('status', 'Order Confirmed')
        .not('mr_name', 'is', null);

      // Get all unique MR names from visits in current period
      const { data: visitMRs } = await supabase
        .from('mr_visits')
        .select('"empName"')
        .gte('"dcrDate"', currentRange.start)
        .lte('"dcrDate"', currentRange.end)
        .not('"empName"', 'is', null);

      // Standardize and combine names
      const allActiveNames = [
        ...new Set([
          ...(orderMRs?.map(o => standardizeName(o.mr_name)) || []),
          ...(visitMRs?.map(v => standardizeName(v.empName)) || [])
        ])
      ].filter(Boolean);

      // Get known MR names from medical_representatives (already standardized)
      const knownMRNames = medicalReps.map(mr => mr.name);

      // Find unknown MRs (in sales data but not in medical_representatives)
      const unknownMRNames = allActiveNames.filter(name => !knownMRNames.includes(name));

      console.log('Unknown MRs found:', unknownMRNames);

      return unknownMRNames.map(name => ({
        name: name,
        role_level: 'SALES_AGENT',
        is_active: true,
        region: 'Unknown',
        state: 'Unknown',
        area_sales_manager_name: null,
        regional_sales_manager_name: null
      }));

    } catch (error) {
      console.error('Error fetching unknown MRs:', error);
      return [];
    }
  };
