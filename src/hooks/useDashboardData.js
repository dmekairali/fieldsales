import { useState, useEffect } from 'react';
import { fetchFilterData, fetchDashboardData, getUnknownMRsFromSalesData as getUnknownMRsFromSalesDataAPI } from '../services/dataService';

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

const useDashboardData = () => {
    const getCurrentPeriodDefaults = () => {
        const now = new Date();
        const currentWeek = (() => {
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          const dayOfYear = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000)) + 1;
          const weekNumber = Math.ceil(dayOfYear / 7);
          return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
        })();
        const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const currentQuarter = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
        const currentYear = now.getFullYear().toString();
        return {
          week: currentWeek,
          month: currentMonth,
          quarter: currentQuarter,
          year: currentYear
        };
    };

    const currentDefaults = getCurrentPeriodDefaults();

    const [selectedPeriod, setSelectedPeriod] = useState('monthly');
    const [selectedMonth, setSelectedMonth] = useState(currentDefaults.month);
    const [selectedWeek, setSelectedWeek] = useState(currentDefaults.week);
    const [selectedQuarter, setSelectedQuarter] = useState(currentDefaults.quarter);
    const [selectedYear, setSelectedYear] = useState(currentDefaults.year);
    const [selectedRegion, setSelectedRegion] = useState('all');
    const [selectedTeam, setSelectedTeam] = useState('all');
    const [selectedState, setSelectedState] = useState('all');
    const [selectedMR, setSelectedMR] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' });
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [teams, setTeams] = useState([]);
    const [states, setStates] = useState([]);
    const [regions, setRegions] = useState([]);
    const [medicalReps, setMedicalReps] = useState([]);
    const [unknownMRs, setUnknownMRs] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'revenue', direction: 'desc' });
    const [visiblePerformers, setVisiblePerformers] = useState(10);

    const getDateRange = () => {
        if (selectedPeriod === 'custom') {
          return { start: dateRange.start, end: dateRange.end };
        }

        const now = new Date();
        let start, end;

        switch (selectedPeriod) {
          case 'weekly':
            const [year, week] = selectedWeek.split('-W');
            const firstDayOfYear = new Date(parseInt(year), 0, 1);
            const daysToAdd = (parseInt(week) - 1) * 7;
            start = new Date(firstDayOfYear.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
            const dayOfWeek = start.getDay();
            const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            start.setDate(start.getDate() + daysToMonday);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            break;

          case 'monthly':
            const [monthYear, monthNum] = selectedMonth.split('-');
            start = new Date(parseInt(monthYear), parseInt(monthNum) - 1, 1);
            end = new Date(parseInt(monthYear), parseInt(monthNum), 0);
            break;

          case 'quarterly':
            const [qYear, quarter] = selectedQuarter.split('-Q');
            const qNum = parseInt(quarter);
            start = new Date(parseInt(qYear), (qNum - 1) * 3, 1);
            end = new Date(parseInt(qYear), qNum * 3, 0);
            break;

          case 'yearly':
            start = new Date(parseInt(selectedYear), 0, 1);
            end = new Date(parseInt(selectedYear), 11, 31);
            break;
        }

        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        };
    };

    const getPreviousDateRange = (currentRange) => {
        const { start, end } = currentRange;
        const startDate = new Date(start);
        const endDate = new Date(end);
        let prevStart, prevEnd;

        switch (selectedPeriod) {
            case 'weekly':
                prevStart = new Date(startDate);
                prevStart.setDate(startDate.getDate() - 7);
                prevEnd = new Date(endDate);
                prevEnd.setDate(endDate.getDate() - 7);
                break;
            case 'monthly':
                prevStart = new Date(startDate);
                prevStart.setMonth(startDate.getMonth() - 1);
                prevEnd = new Date(startDate);
                prevEnd.setDate(0);
                break;
            case 'quarterly':
                prevStart = new Date(startDate);
                prevStart.setMonth(startDate.getMonth() - 3);
                prevEnd = new Date(startDate);
                prevEnd.setDate(0);
                break;
            case 'yearly':
                prevStart = new Date(startDate);
                prevStart.setFullYear(startDate.getFullYear() - 1);
                prevEnd = new Date(endDate);
                prevEnd.setFullYear(endDate.getFullYear() - 1);
                break;
            default: // custom
                const diff = endDate.getTime() - startDate.getTime();
                prevStart = new Date(startDate.getTime() - diff);
                prevEnd = new Date(startDate);
                break;
        }

        return {
            start: prevStart.toISOString().split('T')[0],
            end: prevEnd.toISOString().split('T')[0],
        };
    };

    const handlePeriodChange = (newPeriod) => {
        setSelectedPeriod(newPeriod);
        const current = getCurrentPeriodDefaults();
        switch (newPeriod) {
          case 'weekly':
            setSelectedWeek(current.week);
            break;
          case 'monthly':
            setSelectedMonth(current.month);
            break;
          case 'quarterly':
            setSelectedQuarter(current.quarter);
            break;
          case 'yearly':
            setSelectedYear(current.year);
            break;
        }
    };

    const getFilteredMedicalReps = () => {
        let filteredReps = [...medicalReps];
        let filteredUnknownReps = [...unknownMRs];

        console.log('Starting getFilteredMedicalReps with:', filteredReps.length, 'known +', filteredUnknownReps.length, 'unknown');

        if (selectedRegion !== 'all') {
          filteredReps = filteredReps.filter(rep => rep.region === selectedRegion);
          filteredUnknownReps = [];
        }

        if (selectedState !== 'all') {
          filteredReps = filteredReps.filter(rep => rep.state === selectedState);
          filteredUnknownReps = [];
        }

        if (selectedTeam !== 'all') {
          const selectedTeamData = teams.find(team => standardizeName(team.name) === selectedTeam);

          if (selectedTeam === 'independent') {
            filteredReps = filteredReps.filter(rep =>
              rep.role_level === 'MR' &&
              !rep.area_sales_manager_name &&
              !rep.regional_sales_manager_name
            );
            filteredUnknownReps = [];
          } else if (selectedTeamData) {
            if (selectedTeamData.role_level === 'RSM') {
              const rsmName = standardizeName(selectedTeamData.name);
              const asmUnderRSM = medicalReps.filter(rep =>
                rep.role_level === 'ASM' && standardizeName(rep.regional_sales_manager_name) === rsmName
              );
              const asmNames = asmUnderRSM.map(asm => standardizeName(asm.name));

              filteredReps = filteredReps.filter(rep =>
                rep.role_level === 'MR' && (
                  standardizeName(rep.regional_sales_manager_name) === rsmName ||
                  asmNames.includes(standardizeName(rep.area_sales_manager_name))
                )
              );
            } else if (selectedTeamData.role_level === 'ASM') {
              const asmName = standardizeName(selectedTeamData.name);
              filteredReps = filteredReps.filter(rep =>
                rep.role_level === 'MR' && standardizeName(rep.area_sales_manager_name) === asmName
              );
            }
            filteredUnknownReps = [];
          }
        }

        filteredReps = filteredReps.filter(rep => rep.role_level === 'MR');

        const allFilteredReps = [...filteredReps, ...filteredUnknownReps];

        const activeReps = allFilteredReps.filter(rep => rep.is_active === true);
        const inactiveReps = allFilteredReps.filter(rep => rep.is_active === false);

        console.log('Final split:', {
          knownActive: filteredReps.filter(r => r.is_active).length,
          unknownActive: filteredUnknownReps.length,
          totalActive: activeReps.length,
          totalInactive: inactiveReps.length
        });

        return { activeReps, inactiveReps };
    };

    const getUnknownMRsFromSalesData = () => {
        return getUnknownMRsFromSalesDataAPI(getDateRange, medicalReps);
    }

    useEffect(() => {
        const loadFilterData = async () => {
            const data = await fetchFilterData(getUnknownMRsFromSalesData);
            setTeams(data.teams);
            setStates(data.states);
            setRegions(data.regions);
            setMedicalReps(data.medicalReps);
            setUnknownMRs(data.unknownMRs);
        }
        loadFilterData();
    }, []);

    useEffect(() => {
        if (medicalReps.length > 0) {
          getUnknownMRsFromSalesData().then(setUnknownMRs);
          const loadDashboardData = async () => {
            setLoading(true)
            const data = await fetchDashboardData(
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
            );
            setDashboardData(data)
            setLoading(false)
          }
          loadDashboardData()
        }
    }, [selectedPeriod, selectedMonth, selectedWeek, selectedQuarter, selectedYear,
          selectedRegion, selectedTeam, selectedState, selectedMR, dateRange, medicalReps]);

    useEffect(() => {
        if (selectedMR !== 'all') {
            const { activeReps, inactiveReps } = getFilteredMedicalReps();
            const allFilteredReps = [...activeReps, ...inactiveReps];
            const isCurrentMRInFiltered = allFilteredReps.some(rep => standardizeName(rep.name) === selectedMR);

            if (!isCurrentMRInFiltered) {
            setSelectedMR('all');
            }
        }
    }, [selectedRegion, selectedTeam, selectedState]);

    const processDataWithConversions = (
        currentOrders, currentVisits, currentTargets,
        previousOrders, previousVisits,
        mrs, allVisits
    ) => {
        const calculateMetrics = (orders, visits) => {
            const visitMap = new Map();
            visits.forEach(visit => {
              const dateKey = visit.dcrDate;
              const customerKey = visit.clientMobileNo;
              if (!visitMap.has(dateKey)) {
                visitMap.set(dateKey, new Map());
              }
              visitMap.get(dateKey).set(customerKey, visit);
            });

            const convertedVisits = new Set();
            orders.forEach(order => {
              const dateKey = order.order_date;
              const dayVisits = visitMap.get(dateKey);
              if (dayVisits) {
                dayVisits.forEach((visit, customerKey) => {
                  if (customerKey === order.customer_code ||
                      (visit.clientMobileNo && order.customer_code &&
                       visit.clientMobileNo === order.customer_code)) {
                    convertedVisits.add(visit.visitId);
                  }
                });
              }
            });

            const totalRevenue = orders.reduce((sum, order) => sum + (order.net_amount || 0), 0);
            const totalVisits = visits.length;
            const conversionRate = totalVisits > 0 ? ((convertedVisits.size / totalVisits) * 100) : 0;
            const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
            const billsPending = orders.filter(order =>
              order.status === 'Order Confirmed' && order.delivery_status === null
            ).length;
            const paymentPending = orders.filter(order => order.payment_status === null).length;

            const confirmedOrders = orders.filter(order => order.status === 'Order Confirmed');
            const deliveredOrders = orders.filter(order =>
              order.status === 'Order Confirmed' && order.delivery_status === 'Dispatch Confirmed'
            );
            const deliveryRate = confirmedOrders.length > 0 ?
              ((deliveredOrders.length / confirmedOrders.length) * 100) : 0;

            return {
              totalRevenue,
              totalVisits,
              conversionRate,
              avgOrderValue,
              billsPending,
              paymentPending,
              deliveryRate,
              convertedVisits: convertedVisits.size,
              convertedVisitsSet: convertedVisits
            };
        };

        const currentMetrics = calculateMetrics(currentOrders, currentVisits);
        const previousMetrics = calculateMetrics(previousOrders, previousVisits);

        const calculateChange = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        const firstVisitMap = new Map();
        const sortedAllVisits = allVisits.sort((a, b) => new Date(a.dcrDate) - new Date(b.dcrDate));

        sortedAllVisits.forEach(visit => {
            const customerKey = visit.clientMobileNo;
            const standardizedName = visit.empName_standardized || standardizeName(visit.empName);
            if (!firstVisitMap.has(customerKey)) {
              firstVisitMap.set(customerKey, {
                mrName: standardizedName,
                firstDate: visit.dcrDate
              });
            }
        });

        const activeMRNames = [...new Set(currentVisits.map(v => v.empName_standardized || standardizeName(v.empName)))];
        let activeReps = activeMRNames.length;

        if (selectedMR !== 'all') {
            activeReps = activeMRNames.includes(selectedMR) ? 1 : 0;
            console.log(`${selectedMR} is ${activeReps > 0 ? 'active' : 'inactive'} in this period`);
        }

        const totalTarget = currentTargets.reduce((sum, target) => sum + (target.total_revenue_target || 0), 0);
        const targetAchievement = totalTarget > 0 ? ((currentMetrics.totalRevenue / totalTarget) * 100).toFixed(1) : 0;

        const nbdRevenue = currentOrders
            .filter(order => order.order_type === 'NBD')
            .reduce((sum, order) => sum + (order.net_amount || 0), 0);
        const crrRevenue = currentOrders
            .filter(order => order.order_type === 'CRR')
            .reduce((sum, order) => sum + (order.net_amount || 0), 0);

        const confirmedOrders = currentOrders.filter(order => order.status === 'Order Confirmed');
        const deliveredOrders = currentOrders.filter(order =>
            order.status === 'Order Confirmed' && order.delivery_status === 'Dispatch Confirmed'
        );
        const paidOrders = currentOrders.filter(order =>
            order.status === 'Order Confirmed' && order.payment_status !== null
        );

        const deliveryRate = confirmedOrders.length > 0 ?
            ((deliveredOrders.length / confirmedOrders.length) * 100).toFixed(1) : 0;
        const paymentRate = confirmedOrders.length > 0 ?
            ((paidOrders.length / confirmedOrders.length) * 100).toFixed(1) : 0;

        const deliveredValue = deliveredOrders.reduce((sum, order) => sum + (order.net_amount || 0), 0);
        const paidValue = paidOrders.reduce((sum, order) => sum + (order.net_amount || 0), 0);
        const confirmedValue = confirmedOrders.reduce((sum, order) => sum + (order.net_amount || 0), 0);

        const trends = groupDataByPeriod(currentOrders, currentVisits, currentTargets, selectedPeriod, currentMetrics.convertedVisitsSet);

        const performerMap = {};

        if (selectedMR !== 'all') {
            const selectedMRData = medicalReps.find(mr => standardizeName(mr.name) === selectedMR) ||
              unknownMRs.find(mr => standardizeName(mr.name) === selectedMR);

            performerMap[selectedMR] = {
              id: selectedMR,
              name: selectedMR,
              isActive: selectedMRData ? selectedMRData.is_active : true,
              roleLevel: selectedMRData ? selectedMRData.role_level : 'SALES_AGENT',
              revenue: 0,
              visits: 0,
              orders: 0,
              convertedVisits: 0,
              nbdOrders: 0,
              crrOrders: 0,
              nbdRevenue: 0,
              crrRevenue: 0,
              newProspects: 0,
              billsPending: 0,
              paymentPending: 0
            };
            console.log('Initialized single MR:', selectedMR, 'with role:', performerMap[selectedMR].roleLevel);
        } else {
            const { activeReps: filteredActiveReps, inactiveReps: filteredInactiveReps } = getFilteredMedicalReps();
            const allFilteredMRs = [...filteredActiveReps, ...filteredInactiveReps];

            if (selectedTeam !== 'all' && selectedTeam !== 'independent') {
              const selectedTeamData = teams.find(team => standardizeName(team.name) === selectedTeam);
              if (selectedTeamData) {
                allFilteredMRs.push({
                  ...selectedTeamData,
                  is_active: true
                });
              }
            }

            allFilteredMRs.forEach(person => {
              const standardizedName = person.name;
              performerMap[standardizedName] = {
                id: standardizedName,
                name: standardizedName,
                isActive: person.is_active,
                roleLevel: person.role_level || 'MR',
                revenue: 0,
                visits: 0,
                orders: 0,
                convertedVisits: 0,
                nbdOrders: 0,
                crrOrders: 0,
                nbdRevenue: 0,
                crrRevenue: 0,
                newProspects: 0,
                billsPending: 0,
                paymentPending: 0
              };
            });

            const allOrderMRs = [...new Set(currentOrders.map(order => order.mr_name_standardized || standardizeName(order.mr_name)))].filter(Boolean);
            const allVisitMRs = [...new Set(currentVisits.map(visit => visit.empName_standardized || standardizeName(visit.empName)))].filter(Boolean);
            const allActiveMRNames = [...new Set([...allOrderMRs, ...allVisitMRs])];

            allActiveMRNames.forEach(mrName => {
              if (!performerMap[mrName]) {
                const existingMR = medicalReps.find(mr => standardizeName(mr.name) === mrName);

                performerMap[mrName] = {
                  id: mrName,
                  name: mrName,
                  isActive: existingMR ? existingMR.is_active : true,
                  roleLevel: existingMR ? existingMR.role_level : 'SALES_AGENT',
                  revenue: 0,
                  visits: 0,
                  orders: 0,
                  convertedVisits: 0,
                  nbdOrders: 0,
                  crrOrders: 0,
                  nbdRevenue: 0,
                  crrRevenue: 0,
                  newProspects: 0,
                  billsPending: 0,
                  paymentPending: 0
                };
                console.log('Added MR from data:', mrName, 'with role:', performerMap[mrName].roleLevel);
              }
            });
        }

        console.log('Total performers initialized:', Object.keys(performerMap).length);

        currentOrders.forEach(order => {
            const mrName = order.mr_name_standardized || standardizeName(order.mr_name);
            if (performerMap[mrName]) {
              performerMap[mrName].revenue += order.net_amount || 0;
              performerMap[mrName].orders += 1;

              if (order.order_type === 'NBD') {
                performerMap[mrName].nbdOrders += 1;
                performerMap[mrName].nbdRevenue += order.net_amount || 0;
              } else if (order.order_type === 'CRR') {
                performerMap[mrName].crrOrders += 1;
                performerMap[mrName].crrRevenue += order.net_amount || 0;
              }

              if (order.status === 'Order Confirmed' && order.delivery_status === null) {
                performerMap[mrName].billsPending += 1;
              }

              if (order.payment_status === null) {
                performerMap[mrName].paymentPending += 1;
              }
            }
        });

        currentVisits.forEach(visit => {
            const mrName = visit.empName_standardized || standardizeName(visit.empName);
            const customerKey = visit.clientMobileNo;

            if (performerMap[mrName]) {
              performerMap[mrName].visits += 1;

              if (currentMetrics.convertedVisitsSet.has(visit.visitId)) {
                performerMap[mrName].convertedVisits += 1;
              }

              const firstVisit = firstVisitMap.get(customerKey);
              if (firstVisit && firstVisit.mrName === mrName) {
                const visitDate = new Date(visit.dcrDate);
                const selectedPeriodStart = new Date(getDateRange().start);
                const selectedPeriodEnd = new Date(getDateRange().end);

                if (visitDate >= selectedPeriodStart && visitDate <= selectedPeriodEnd) {
                  performerMap[mrName].newProspects += 1;
                }
              }
            }
        });

        const allPerformers = Object.values(performerMap)
            .map(performer => ({
              ...performer,
              conversion: performer.visits > 0 ?
                ((performer.convertedVisits / performer.visits) * 100).toFixed(1) : '0.0',
              nbdConversion: performer.visits > 0 ?
                ((performer.nbdOrders / performer.visits) * 100).toFixed(1) : '0.0',
              achievement: 100
        }));

        const plannedVisits = currentTargets.reduce((sum, target) => sum + (target.total_visit_plan || 0), 0);
        const visitMetrics = {
            planned: plannedVisits,
            completed: currentMetrics.totalVisits,
            missed: Math.max(0, plannedVisits - currentMetrics.totalVisits),
            completionRate: plannedVisits > 0 ? ((currentMetrics.totalVisits / plannedVisits) * 100).toFixed(0) : 0
        };

        const conversionMetrics = {
            totalLeads: currentMetrics.totalVisits,
            converted: currentMetrics.convertedVisits,
            pending: 0,
            lost: currentMetrics.totalVisits - currentMetrics.convertedVisits
        };

        const revenueMetrics = {
            target: totalTarget,
            achieved: currentMetrics.totalRevenue,
            gap: totalTarget - currentMetrics.totalRevenue,
            growthRate: calculateChange(currentMetrics.totalRevenue, previousMetrics.totalRevenue)
        };

        const overview = {
            totalRevenue: currentMetrics.totalRevenue,
            totalVisits: currentMetrics.totalVisits,
            conversionRate: currentMetrics.conversionRate.toFixed(1),
            avgOrderValue: currentMetrics.avgOrderValue,
            billsPending: currentMetrics.billsPending,
            paymentPending: currentMetrics.paymentPending,
            deliveryRate: currentMetrics.deliveryRate.toFixed(1),
            activeReps,
            targetAchievement,

            totalRevenueChange: calculateChange(currentMetrics.totalRevenue, previousMetrics.totalRevenue),
            totalVisitsChange: calculateChange(currentMetrics.totalVisits, previousMetrics.totalVisits),
            conversionRateChange: calculateChange(currentMetrics.conversionRate, previousMetrics.conversionRate),
            avgOrderValueChange: calculateChange(currentMetrics.avgOrderValue, previousMetrics.avgOrderValue),
            billsPendingChange: calculateChange(currentMetrics.billsPending, previousMetrics.billsPending),
            paymentPendingChange: calculateChange(currentMetrics.paymentPending, previousMetrics.paymentPending),
            deliveryRateChange: calculateChange(currentMetrics.deliveryRate, previousMetrics.deliveryRate),
        };

        return {
            overview,
            trends,
            allPerformers,
            performanceByCategory: [
              { category: 'New Business (NBD)', value: nbdRevenue, percentage: currentMetrics.totalRevenue > 0 ? ((nbdRevenue / currentMetrics.totalRevenue) * 100).toFixed(0) : 0 },
              { category: 'Customer Retention (CRR)', value: crrRevenue, percentage: currentMetrics.totalRevenue > 0 ? ((crrRevenue / currentMetrics.totalRevenue) * 100).toFixed(0) : 0 }
            ],
            detailedMetrics: {
              visitMetrics,
              conversionMetrics,
              revenueMetrics,
              fulfillmentMetrics: {
                confirmedOrders: confirmedOrders.length,
                deliveredOrders: deliveredOrders.length,
                paidOrders: paidOrders.length,
                deliveryRate: parseFloat(deliveryRate),
                paymentRate: parseFloat(paymentRate),
                confirmedValue,
                deliveredValue,
                paidValue
              }
            }
        };
    };

    const groupDataByPeriod = (orders, visits, targets, period, convertedVisits) => {
        const grouped = {
          weekly: [],
          monthly: []
        };

        const monthlyData = {};

        const totalOrderRevenue = orders.reduce((sum, order) => sum + (order.net_amount || 0), 0);
        console.log('Total revenue from all orders:', totalOrderRevenue);

        orders.forEach(order => {
          const month = new Date(order.order_date).toLocaleString('default', { month: 'short' });
          if (!monthlyData[month]) {
            monthlyData[month] = {
              month,
              revenue: 0,
              visits: 0,
              orders: 0,
              nbd: 0,
              crr: 0,
              target: 0,
              converted: 0
            };
          }
          monthlyData[month].revenue += order.net_amount || 0;
          monthlyData[month].orders += 1;
          if (order.order_type === 'NBD') {
            monthlyData[month].nbd += order.net_amount || 0;
          } else {
            monthlyData[month].crr += order.net_amount || 0;
          }
        });

        visits.forEach(visit => {
          const month = new Date(visit.dcrDate).toLocaleString('default', { month: 'short' });
          if (!monthlyData[month]) {
            monthlyData[month] = {
              month,
              revenue: 0,
              visits: 0,
              orders: 0,
              nbd: 0,
              crr: 0,
              target: 0,
              converted: 0
            };
          }
          monthlyData[month].visits += 1;
          if (convertedVisits.has(visit.visitId)) {
            monthlyData[month].converted += 1;
          }
        });

        targets.forEach(target => {
          const month = new Date(target.target_date).toLocaleString('default', { month: 'short' });
          if (monthlyData[month]) {
            monthlyData[month].target += target.total_revenue_target || 0;
          }
        });

        Object.values(monthlyData).forEach(data => {
          data.conversion = data.visits > 0 ? ((data.converted / data.visits) * 100).toFixed(0) : 0;
        });

        const chartTotalRevenue = Object.values(monthlyData).reduce((sum, month) => sum + month.revenue, 0);
        console.log('Total revenue in chart data:', chartTotalRevenue);
        console.log('Difference:', totalOrderRevenue - chartTotalRevenue);

        grouped.monthly = Object.values(monthlyData);

        return grouped;
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedPerformers = () => {
        const performers = [...(dashboardData?.allPerformers || [])];

        if (sortConfig.key) {
          performers.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (typeof aValue === 'string') {
              return sortConfig.direction === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
            }

            return sortConfig.direction === 'asc'
              ? aValue - bValue
              : bValue - aValue;
          });
        }

        return performers;
    };

    return {
        selectedPeriod,
        selectedMonth,
        selectedWeek,
        selectedQuarter,
        selectedYear,
        selectedRegion,
        selectedTeam,
        selectedState,
        selectedMR,
        dateRange,
        loading,
        dashboardData,
        teams,
        states,
        regions,
        medicalReps,
        unknownMRs,
        sortConfig,
        visiblePerformers,
        handlePeriodChange,
        setSelectedPeriod,
        setSelectedMonth,
        setSelectedWeek,
        setSelectedQuarter,
        setSelectedYear,
        setSelectedRegion,
        setSelectedTeam,
        setSelectedState,
        setSelectedMR,
        setDateRange,
        handleSort,
        getSortedPerformers,
        setVisiblePerformers,
        getFilteredMedicalReps,
        fetchDashboardData: () => {
            setLoading(true)
            fetchDashboardData(
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
            ).then(data => {
                setDashboardData(data)
                setLoading(false)
            })
        }
    }
}

export default useDashboardData;
