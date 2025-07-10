// src/services/MonthlyTourPlanService.js
import { supabase } from '../supabaseClient';
import { aiTourPlanGenerator } from './AITourPlanGenerator';

class MonthlyTourPlanService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    }

    /**
     * Generate complete monthly tour plan
     */
    async generateMonthlyPlan(mrName, month, year) {
        try {
            console.log(`🗓️ Generating monthly plan for ${mrName} - ${month}/${year}`);

            // Get territory context for the month
            const territoryContext = await this.getMonthlyTerritoryContext(mrName, month, year);
            
            // Generate AI-powered monthly plan
            const monthlyPlan = await this.createMonthlyAIPlan(mrName, month, year, territoryContext);
            
            // Validate and structure the plan
            const structuredPlan = await this.structureMonthlyPlan(monthlyPlan, month, year);
            
            // Save to database
            const savedPlan = await this.saveMonthlyPlan(mrName, month, year, structuredPlan);
            
            console.log(`✅ Monthly plan generated and saved for ${mrName}`);
            return {
                success: true,
                plan_id: savedPlan.id,
                plan: structuredPlan,
                generated_at: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Monthly plan generation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get comprehensive territory context for monthly planning
     */
    async getMonthlyTerritoryContext(mrName, month, year) {
        console.log(`🔍 Fetching monthly territory context for ${mrName}`);

        // Get customer data from materialized view
        const { data: customers, error: customersError } = await supabase
            .from('customer_tiers')
            .select(`
                customer_code,
                customer_name,
                customer_type,
                territory,
                area_name,
                city_name,
                tier_score,
                tier_level,
                recommended_frequency,
                recommended_visit_duration,
                total_orders_90d,
                total_sales_90d,
                conversion_rate_90d,
                last_visit_date,
                days_since_last_visit,
                customer_segment,
                status
            `)
            .eq('mr_name', mrName)
            .eq('status', 'ACTIVE');


         // ADD THIS COMPREHENSIVE DEBUG BLOCK
    console.log('🔍 DEBUG: Monthly Territory Context Results:', {
        mrName: mrName,
        error: customersError,
        customerCount: customers?.length,
        querySuccessful: !customersError && customers,
        firstThreeCustomers: customers?.slice(0, 3).map(c => ({
            code: c.customer_code,
            name: c.customer_name,
            area: c.area_name,
            tier: c.tier_level,
            score: c.tier_score,
            status: c.status
        })),
        realAreas: [...new Set(customers?.slice(0, 10).map(c => c.area_name))],
        tierDistribution: customers?.reduce((acc, c) => {
            acc[c.tier_level] = (acc[c.tier_level] || 0) + 1;
            return acc;
        }, {}),
        rawDataSample: customers?.[0] // Show the complete first customer object
    });

  if (customersError) {
        console.error('❌ Customer data fetch error:', customersError);
        throw new Error(`Customer data fetch failed: ${customersError.message}`);
    }

        // Get previous month performance
        const previousMonth = month === 1 ? 12 : month - 1;
        const previousYear = month === 1 ? year - 1 : year;
        
        const previousPerformance = await this.getPreviousMonthPerformance(mrName, previousMonth, previousYear);
        
        // Get seasonal patterns
        const seasonalData = await this.getSeasonalPatterns(mrName, month);
        
        // Calculate territory metrics
        const territoryMetrics = await this.calculateTerritoryMetrics(mrName);

        return {
            customers: customers || [],
            previous_performance: previousPerformance,
            seasonal_patterns: seasonalData,
            territory_metrics: territoryMetrics,
            planning_month: month,
            planning_year: year
        };
    }

    /**
     * Get previous month performance data
     */
    async getPreviousMonthPerformance(mrName, month, year) {
        try {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0); // Last day of month

            const { data: visits, error } = await supabase
                .from('mr_visits')
                .select(`
                    "visitId",
                    "clientName",
                    "amountOfSale",
                    "visitTime",
                    "dcrDate",
                    "areaName"
                `)
                .eq('empName', mrName)
                .gte('dcrDate', startDate.toISOString().split('T')[0])
                .lte('dcrDate', endDate.toISOString().split('T')[0]);

            if (error) {
                console.warn('⚠️ Previous month data fetch error:', error);
                return this.getDefaultPerformanceMetrics();
            }

            return this.calculatePerformanceMetrics(visits || []);

        } catch (error) {
            console.warn('⚠️ Previous month performance calculation failed:', error);
            return this.getDefaultPerformanceMetrics();
        }
    }

    /**
     * Calculate performance metrics from visit data
     */
    calculatePerformanceMetrics(visits) {
        if (!visits || visits.length === 0) {
            return this.getDefaultPerformanceMetrics();
        }

        const totalVisits = visits.length;
        const totalRevenue = visits.reduce((sum, visit) => sum + (parseFloat(visit.amountOfSale) || 0), 0);
        const convertingVisits = visits.filter(visit => (parseFloat(visit.amountOfSale) || 0) > 0).length;
        const uniqueCustomers = new Set(visits.map(visit => visit.clientName)).size;
        
        // Calculate average visit duration
        const validDurations = visits
            .filter(visit => visit.visitTime)
            .map(visit => this.timeToMinutes(visit.visitTime))
            .filter(duration => duration > 0);
        
        const avgVisitDuration = validDurations.length > 0 
            ? validDurations.reduce((sum, duration) => sum + duration, 0) / validDurations.length 
            : 35;

        // Area-wise performance
        const areaPerformance = {};
        visits.forEach(visit => {
            const area = visit.areaName || 'Unknown';
            if (!areaPerformance[area]) {
                areaPerformance[area] = { visits: 0, revenue: 0, conversions: 0 };
            }
            areaPerformance[area].visits++;
            areaPerformance[area].revenue += parseFloat(visit.amountOfSale) || 0;
            if ((parseFloat(visit.amountOfSale) || 0) > 0) {
                areaPerformance[area].conversions++;
            }
        });

        return {
            total_visits: totalVisits,
            total_revenue: totalRevenue,
            unique_customers: uniqueCustomers,
            conversion_rate: totalVisits > 0 ? (convertingVisits / totalVisits) * 100 : 0,
            avg_revenue_per_visit: totalVisits > 0 ? totalRevenue / totalVisits : 0,
            avg_visit_duration: avgVisitDuration,
            visits_per_day: totalVisits / 30, // Approximate monthly average
            area_performance: areaPerformance,
            performance_grade: this.calculatePerformanceGrade(totalVisits, totalRevenue, convertingVisits)
        };
    }

    /**
     * Calculate performance grade based on metrics
     */
    calculatePerformanceGrade(visits, revenue, conversions) {
        const visitScore = Math.min((visits / 300) * 100, 100); // Target: 10 visits/day * 30 days
        const revenueScore = Math.min((revenue / 150000) * 100, 100); // Target: 5K/day * 30 days
        const conversionScore = conversions > 0 ? Math.min((conversions / visits) * 200, 100) : 0;
        
        const overallScore = (visitScore + revenueScore + conversionScore) / 3;
        
        if (overallScore >= 80) return 'EXCELLENT';
        if (overallScore >= 60) return 'GOOD';
        if (overallScore >= 40) return 'AVERAGE';
        return 'NEEDS_IMPROVEMENT';
    }

    /**
     * Get default performance metrics
     */
    getDefaultPerformanceMetrics() {
        return {
            total_visits: 0,
            total_revenue: 0,
            unique_customers: 0,
            conversion_rate: 0,
            avg_revenue_per_visit: 0,
            avg_visit_duration: 35,
            visits_per_day: 0,
            area_performance: {},
            performance_grade: 'NEW_MR'
        };
    }

    /**
     * Get seasonal patterns for the month
     */
    async getSeasonalPatterns(mrName, month) {
        try {
            // Get same month data from previous years
            const { data: historicalData, error } = await supabase
                .from('mr_visits')
                .select(`
                    "amountOfSale",
                    "dcrDate",
                    "clientName"
                `)
                .eq('empName', mrName)
                .like('dcrDate', `%-${month.toString().padStart(2, '0')}-%`)
                .order('dcrDate', { ascending: false });

            if (error || !historicalData || historicalData.length === 0) {
                return this.getDefaultSeasonalPattern(month);
            }

            // Group by year and calculate metrics
            const yearlyData = {};
            historicalData.forEach(visit => {
                const year = visit.dcrDate.split('-')[0];
                if (!yearlyData[year]) {
                    yearlyData[year] = { visits: 0, revenue: 0, customers: new Set() };
                }
                yearlyData[year].visits++;
                yearlyData[year].revenue += parseFloat(visit.amountOfSale) || 0;
                yearlyData[year].customers.add(visit.clientName);
            });

            // Calculate trends
            const years = Object.keys(yearlyData).sort();
            const avgVisits = years.reduce((sum, year) => sum + yearlyData[year].visits, 0) / years.length;
            const avgRevenue = years.reduce((sum, year) => sum + yearlyData[year].revenue, 0) / years.length;

            return {
                month_performance_trend: this.calculateTrend(years, yearlyData),
                avg_monthly_visits: avgVisits,
                avg_monthly_revenue: avgRevenue,
                seasonal_factor: this.getSeasonalFactor(month),
                historical_years: years.length
            };

        } catch (error) {
            console.warn('⚠️ Seasonal pattern calculation failed:', error);
            return this.getDefaultSeasonalPattern(month);
        }
    }

    /**
     * Get default seasonal pattern
     */
    getDefaultSeasonalPattern(month) {
        const seasonalFactors = {
            1: 0.9,  // January - Post-holiday slow
            2: 0.95, // February
            3: 1.1,  // March - Financial year end
            4: 1.0,  // April - New year start
            5: 1.05, // May
            6: 1.0,  // June
            7: 0.95, // July - Monsoon
            8: 0.9,  // August - Monsoon
            9: 1.05, // September - Festival season prep
            10: 1.15, // October - Festival season
            11: 1.1, // November - Festival season
            12: 0.85 // December - Holiday season
        };

        return {
            month_performance_trend: 'STABLE',
            avg_monthly_visits: 250,
            avg_monthly_revenue: 125000,
            seasonal_factor: seasonalFactors[month] || 1.0,
            historical_years: 0
        };
    }

    /**
     * Calculate trend from historical data
     */
    calculateTrend(years, yearlyData) {
        if (years.length < 2) return 'INSUFFICIENT_DATA';

        const recentYear = years[years.length - 1];
        const previousYear = years[years.length - 2];

        const recentRevenue = yearlyData[recentYear].revenue;
        const previousRevenue = yearlyData[previousYear].revenue;

        const change = ((recentRevenue - previousRevenue) / previousRevenue) * 100;

        if (change > 10) return 'IMPROVING';
        if (change < -10) return 'DECLINING';
        return 'STABLE';
    }

    /**
     * Get seasonal factor for month
     */
    getSeasonalFactor(month) {
        const factors = {
            1: 0.9, 2: 0.95, 3: 1.1, 4: 1.0, 5: 1.05, 6: 1.0,
            7: 0.95, 8: 0.9, 9: 1.05, 10: 1.15, 11: 1.1, 12: 0.85
        };
        return factors[month] || 1.0;
    }

    /**
     * Calculate territory metrics
     */
    async calculateTerritoryMetrics(mrName) {
        try {
            const { data: territoryData, error } = await supabase
                .from('customer_tiers')
                .select(`
                    area_name,
                    tier_level,
                    total_sales_90d,
                    conversion_rate_90d
                `)
                .eq('mr_name', mrName)
                .eq('status', 'ACTIVE');

            if (error || !territoryData) {
                return this.getDefaultTerritoryMetrics();
            }

            // Area-wise analysis
            const areaMetrics = {};
            territoryData.forEach(customer => {
                const area = customer.area_name || 'Unknown';
                if (!areaMetrics[area]) {
                    areaMetrics[area] = {
                        customers: 0,
                        total_sales: 0,
                        tier_distribution: {},
                        avg_conversion: 0
                    };
                }

                areaMetrics[area].customers++;
                areaMetrics[area].total_sales += parseFloat(customer.total_sales_90d) || 0;
                
                const tier = customer.tier_level || 'TIER_4_PROSPECT';
                areaMetrics[area].tier_distribution[tier] = (areaMetrics[area].tier_distribution[tier] || 0) + 1;
                areaMetrics[area].avg_conversion += parseFloat(customer.conversion_rate_90d) || 0;
            });

            // Calculate averages
            Object.keys(areaMetrics).forEach(area => {
                areaMetrics[area].avg_conversion = areaMetrics[area].avg_conversion / areaMetrics[area].customers;
                areaMetrics[area].sales_per_customer = areaMetrics[area].total_sales / areaMetrics[area].customers;
            });

            return {
                total_customers: territoryData.length,
                area_metrics: areaMetrics,
                territory_efficiency: this.calculateTerritoryEfficiency(areaMetrics),
                coverage_analysis: this.analyzeTerritoryFocus(areaMetrics)
            };

        } catch (error) {
            console.warn('⚠️ Territory metrics calculation failed:', error);
            return this.getDefaultTerritoryMetrics();
        }
    }

    /**
     * Get default territory metrics
     */
    getDefaultTerritoryMetrics() {
        return {
            total_customers: 0,
            area_metrics: {},
            territory_efficiency: 'UNKNOWN',
            coverage_analysis: 'INSUFFICIENT_DATA'
        };
    }

    /**
     * Calculate territory efficiency
     */
    calculateTerritoryEfficiency(areaMetrics) {
        const areas = Object.keys(areaMetrics);
        if (areas.length === 0) return 'NO_DATA';

        const avgSalesPerArea = areas.reduce((sum, area) => sum + areaMetrics[area].total_sales, 0) / areas.length;
        const avgCustomersPerArea = areas.reduce((sum, area) => sum + areaMetrics[area].customers, 0) / areas.length;

        if (avgSalesPerArea > 50000 && avgCustomersPerArea > 10) return 'HIGH';
        if (avgSalesPerArea > 25000 && avgCustomersPerArea > 5) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Analyze territory coverage focus
     */
    analyzeTerritoryFocus(areaMetrics) {
        const areas = Object.keys(areaMetrics);
        if (areas.length === 0) return 'NO_AREAS';
        if (areas.length <= 3) return 'FOCUSED';
        if (areas.length <= 8) return 'BALANCED';
        return 'DISPERSED';
    }

    /**
     * Create AI-powered monthly plan
     */
    async createMonthlyAIPlan(mrName, month, year, context) {
        console.log(`🤖 Creating AI monthly plan for ${mrName}`);

        const prompt = this.generateMonthlyPlanPrompt(mrName, month, year, context);
        
        try {
            const aiResponse = await aiTourPlanGenerator.callOpenAI(prompt);
            console.log('🤖 AI Response Length:', aiResponse.length);
            console.log('🤖 AI Response End:', aiResponse.slice(-500)); // Last 500 chars
            
            const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
            const planJson = JSON.parse(cleanResponse);
            
            this.validateMonthlyPlanStructure(planJson);
            return planJson;

        } catch (error) {
            console.error('❌ AI monthly plan generation failed:', error);
            throw new Error(`AI planning failed: ${error.message}`);
        }
    }

    /**
     * Generate comprehensive AI prompt for monthly planning
     */
    generateMonthlyPlanPrompt(mrName, month, year, context) {
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[month];
    const daysInMonth = new Date(year, month, 0).getDate();

    const customersSummary = `Total active customers: ${context.customers.length}`;
    const tierSummary = {};
    context.customers.forEach(customer => {
        const tier = customer.tier_level || 'TIER_4_PROSPECT';
        tierSummary[tier] = (tierSummary[tier] || 0) + 1;
    });

    let tierBreakdown = '';
    Object.entries(tierSummary).forEach(([tier, count]) => {
        tierBreakdown += `- ${tier}: ${count} customers\n`;
    });

    // ✅ ADD: Extract real customer data for the prompt
    const topCustomers = context.customers
        .sort((a, b) => (parseFloat(b.tier_score) || 0) - (parseFloat(a.tier_score) || 0))
        .slice(0, 15)
        .map((customer, index) => {
            const tierScore = parseFloat(customer.tier_score) || 0;
            const salesAmount = parseFloat(customer.total_sales_90d) || 0;
            const conversionRate = parseFloat(customer.conversion_rate_90d) || 0;
            const daysSinceVisit = parseInt(customer.days_since_last_visit) || 999;
            
            return `${index + 1}. ${customer.customer_name} (${customer.tier_level}) - Area: ${customer.area_name}, Score: ${tierScore.toFixed(1)}, Sales: ₹${salesAmount.toLocaleString()}, Days since visit: ${daysSinceVisit}`;
        }).join('\n');

    // ✅ ADD: Extract real area names
    const realAreas = [...new Set(context.customers.map(c => c.area_name))].slice(0, 10);
    const realAreasString = realAreas.join('", "');

    // ✅ ADD: Get sample high-value customers for examples
    const highValueCustomers = context.customers
        .filter(c => parseFloat(c.tier_score) > 20)
        .slice(0, 3);
    
    const sampleCustomer1 = highValueCustomers[0] || context.customers[0];
    const sampleCustomer2 = highValueCustomers[1] || context.customers[1];
    const sampleArea1 = realAreas[0] || 'MAUJPUR';
    const sampleArea2 = realAreas[1] || 'NAVEEN SHAHDARA';

    return `
You are an AI Monthly Tour Planning Assistant for Kairali Ayurvedic products. Generate a comprehensive monthly tour plan for ${mrName} for ${monthName} ${year} (${daysInMonth} days).

TERRITORY CONTEXT:
${customersSummary}
${tierBreakdown}

TOP CUSTOMERS (by tier score) - USE THESE REAL NAMES:
${topCustomers}

REAL AREA NAMES - USE THESE ACTUAL AREAS:
"${realAreasString}"

Previous Month Performance:
- Total visits: ${context.previous_performance.total_visits}
- Total revenue: ₹${context.previous_performance.total_revenue?.toLocaleString()}
- Conversion rate: ${context.previous_performance.conversion_rate?.toFixed(1)}%
- Performance grade: ${context.previous_performance.performance_grade}
- Average visits per day: ${context.previous_performance.visits_per_day?.toFixed(1)}

Seasonal Analysis:
- Month performance trend: ${context.seasonal_patterns.month_performance_trend}
- Seasonal factor: ${context.seasonal_patterns.seasonal_factor}
- Historical average visits: ${context.seasonal_patterns.avg_monthly_visits}
- Historical average revenue: ₹${context.seasonal_patterns.avg_monthly_revenue?.toLocaleString()}

Territory Metrics:
- Total customers: ${context.territory_metrics.total_customers}
- Territory efficiency: ${context.territory_metrics.territory_efficiency}
- Coverage analysis: ${context.territory_metrics.coverage_analysis}

CRITICAL INSTRUCTIONS:
- Use ONLY the real customer names and area names provided above
- DO NOT use generic names like "Customer1", "Area1", "Customer2", "Area2" 
- Use actual names like "${sampleCustomer1?.customer_name}", "${sampleCustomer2?.customer_name}"
- Use actual areas like "${sampleArea1}", "${sampleArea2}"

MONTHLY PLANNING CONSTRAINTS:
- Plan for ${daysInMonth} days (excluding Sundays)
- Target 11-15 visits per working day
- Ensure 40% NBD focus throughout month
- Balance tier-wise customer coverage
- Optimize for seasonal factors
- Account for territory efficiency
- Plan for weekly revision cycles

OUTPUT FORMAT (JSON only) - USE REAL NAMES THROUGHOUT:
{
    "monthly_overview": {
        "mr_name": "${mrName}",
        "month": ${month},
        "year": ${year},
        "total_working_days": ${Math.floor(daysInMonth * 6/7)},
        "total_planned_visits": 300,
        "target_revenue": 150000,
        "nbd_visits_target": 120,
        "tier_distribution_target": ${JSON.stringify(tierSummary)}
    },
    "weekly_plans": [
        {
            "week_number": 1,
            "start_date": "${year}-${month.toString().padStart(2, '0')}-01",
            "end_date": "${year}-${month.toString().padStart(2, '0')}-07",
            "target_visits": 75,
            "target_revenue": 37500,
            "focus_areas": ["${sampleArea1}", "${sampleArea2}"],
            "priority_customers": ["${sampleCustomer1?.customer_name}", "${sampleCustomer2?.customer_name}"],
            "daily_plans": [
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-01",
                    "day_of_week": "Monday",
                    "planned_visits": 12,
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${sampleArea1}"],
                    "estimated_revenue": 6000
                }
            ]
        }
    ],
    "customer_visit_frequency": {
        "${sampleCustomer1?.customer_name}": {
            "tier": "${sampleCustomer1?.tier_level}",
            "planned_visits": 1,
            "recommended_dates": ["${year}-${month.toString().padStart(2, '0')}-01"],
            "priority_reason": "High value customer from ${sampleCustomer1?.area_name}"
        }
    },
    "area_coverage_plan": {
        "${sampleArea1}": {
            "total_customers": 15,
            "planned_visits": 45,
            "focus_weeks": [1, 3],
            "efficiency_rating": "HIGH"
        }
    },
    "revision_checkpoints": [
        {
            "date": "${year}-${month.toString().padStart(2, '0')}-07",
            "week": 1,
            "review_focus": "Week 1 performance vs plan",
            "key_metrics": ["visit_completion", "revenue_achievement", "quality_scores"]
        }
    ],
    "risk_mitigation": {
        "weather_contingency": "Indoor customer focus during monsoon",
        "festival_adjustments": "Customer availability considerations",
        "territory_challenges": "Traffic and accessibility planning"
    }
}

IMPORTANT: Replace ALL instances of generic names with actual customer names and area names from the data provided above. Return only valid JSON with real data.`;
}

    /**
     * Validate monthly plan structure
     */
    validateMonthlyPlanStructure(plan) {
        if (!plan.monthly_overview) throw new Error('Missing monthly_overview');
        if (!plan.weekly_plans || !Array.isArray(plan.weekly_plans)) throw new Error('Missing weekly_plans array');
        if (!plan.customer_visit_frequency) throw new Error('Missing customer_visit_frequency');
        if (!plan.area_coverage_plan) throw new Error('Missing area_coverage_plan');
        if (!plan.revision_checkpoints) throw new Error('Missing revision_checkpoints');
    }

    /**
     * Structure and validate monthly plan
     */
    async structureMonthlyPlan(aiPlan, month, year) {
        console.log(`📋 Structuring monthly plan for ${month}/${year}`);

        const structuredPlan = {
            ...aiPlan,
            plan_metadata: {
                generated_at: new Date().toISOString(),
                plan_version: '1.0',
                revision_count: 0,
                status: 'ACTIVE',
                month: month,
                year: year
            },
            performance_baseline: {
                planned_visits: aiPlan.monthly_overview.total_planned_visits,
                planned_revenue: aiPlan.monthly_overview.target_revenue,
                planned_nbd_visits: aiPlan.monthly_overview.nbd_visits_target,
                baseline_date: new Date().toISOString()
            }
        };

        // Validate structure
        this.validateStructuredPlan(structuredPlan);
        
        return structuredPlan;
    }

    /**
     * Validate structured plan
     */
    validateStructuredPlan(plan) {
        if (!plan.monthly_overview || !plan.weekly_plans) {
            throw new Error('Invalid plan structure');
        }
        if (!plan.plan_metadata || !plan.performance_baseline) {
            throw new Error('Missing metadata or baseline');
        }
    }

    /**
     * Save monthly plan to database
     */
    async saveMonthlyPlan(mrName, month, year, plan) {
        try {
                    console.log('🚀 Executing upsert with data:', plan);
            const { data, error } = await supabase
                .from('monthly_tour_plans')
                .upsert({
                    mr_name: mrName,
                    plan_month: month,
                    plan_year: year,
                    original_plan_json: plan,
                    current_plan_json: plan,
                    current_revision: 0,
                    status: 'ACTIVE',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'mr_name,plan_month,plan_year,status'
                })
                .select()
                .single();

            if (error) {
                throw new Error(`Database save failed: ${error.message}`);
            }

            console.log(`✅ Monthly plan saved with ID: ${data.id}`);
            return data;

        } catch (error) {
            console.error('❌ Failed to save monthly plan:', error);
            throw error;
        }
    }

    /**
     * WEEKLY REVISION SYSTEM
     * Analyze performance and revise remaining days
     */
    async performWeeklyRevision(mrName, month, year, weekNumber) {
        try {
            console.log(`📊 Performing weekly revision for ${mrName} - Week ${weekNumber} of ${month}/${year}`);

            // Get current monthly plan
            const currentPlan = await this.getMonthlyPlan(mrName, month, year);
            if (!currentPlan) {
                throw new Error('Monthly plan not found');
            }

            // Analyze week performance vs plan
            const weekAnalysis = await this.analyzeWeekPerformance(mrName, month, year, weekNumber);
            
            // Generate revised plan for remaining days
            const revisedPlan = await this.generateRevisedPlan(currentPlan, weekAnalysis, weekNumber);
            
            // Save revision
            const savedRevision = await this.saveWeeklyRevision(currentPlan.id, weekNumber, revisedPlan, weekAnalysis);

            // Update current plan
            await this.updateCurrentPlan(currentPlan.id, revisedPlan);

            console.log(`✅ Weekly revision completed for Week ${weekNumber}`);
            
            return {
                success: true,
                revision_id: savedRevision.id,
                week_analysis: weekAnalysis,
                revised_plan: revisedPlan,
                revision_date: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Weekly revision failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get monthly plan from database
     */
   /**
 * Get monthly plan from database
 */
async getMonthlyPlan(mrName, month, year) {
    try {
       

        // Then query without schema qualification
        const { data, error } = await supabase
            .from('monthly_tour_plans') // Just table name, no schema prefix
            .select('*')
            .eq('mr_name', mrName)
            .eq('plan_month', month)
            .eq('plan_year', year)
            .eq('status', 'ACTIVE')
            .single();

        if (error) {
            console.error('❌ Monthly plan fetch error:', error);
            return null;
        }

        return data;

    } catch (error) {
        console.error('❌ Failed to get monthly plan:', error);
        return null;
    }
}

    /**
     * Analyze week performance vs planned targets
     */
    async analyzeWeekPerformance(mrName, month, year, weekNumber) {
        console.log(`🔍 Analyzing Week ${weekNumber} performance for ${mrName}`);

        // Calculate week date range
        const weekDates = this.getWeekDateRange(month, year, weekNumber);
        
        // Get actual visits for the week
        const actualVisits = await this.getActualVisits(mrName, weekDates.start, weekDates.end);
        
        // Get planned visits for the week
        const plannedVisits = await this.getPlannedVisits(mrName, month, year, weekNumber);
        
        // Calculate performance metrics
        const analysis = this.calculateWeekAnalysis(plannedVisits, actualVisits, weekNumber);

        return {
            week_number: weekNumber,
            analysis_date: new Date().toISOString(),
            week_dates: weekDates,
            planned_metrics: plannedVisits,
            actual_metrics: actualVisits,
            performance_analysis: analysis,
            recommendations: this.generateWeekRecommendations(analysis)
        };
    }

    /**
     * Get week date range
     */
    getWeekDateRange(month, year, weekNumber) {
        const firstDay = new Date(year, month - 1, 1);
        const startDate = new Date(firstDay);
        startDate.setDate(firstDay.getDate() + (weekNumber - 1) * 7);
        
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);

        return {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
        };
    }

    /**
     * Get actual visits for date range
     */
    async getActualVisits(mrName, startDate, endDate) {
        try {
            const { data: visits, error } = await supabase
                .from('mr_visits')
                .select(`
                    "visitId",
                    "clientName",
                    "amountOfSale",
                    "visitTime",
                    "dcrDate",
                    "areaName",
                    "sampleGiven"
                `)
                .eq('empName', mrName)
                .gte('dcrDate', startDate)
                .lte('dcrDate', endDate)
                .order('dcrDate');

            if (error) {
                console.error('❌ Actual visits fetch error:', error);
                return this.getEmptyVisitMetrics();
            }

            return this.processVisitData(visits || []);

        } catch (error) {
            console.error('❌ Failed to get actual visits:', error);
            return this.getEmptyVisitMetrics();
        }
    }

    /**
     * Get planned visits for the week
     */
    async getPlannedVisits(mrName, month, year, weekNumber) {
        const monthlyPlan = await this.getMonthlyPlan(mrName, month, year);
        
        if (!monthlyPlan || !monthlyPlan.current_plan_json) {
            return this.getEmptyVisitMetrics();
        }

        const plan = monthlyPlan.current_plan_json;
        const weekPlan = plan.weekly_plans?.find(w => w.week_number === weekNumber);
        
        if (!weekPlan) {
            return this.getEmptyVisitMetrics();
        }

        return {
            total_visits: weekPlan.target_visits || 0,
            target_revenue: weekPlan.target_revenue || 0,
            planned_customers: weekPlan.priority_customers?.length || 0,
            focus_areas: weekPlan.focus_areas || [],
            daily_targets: weekPlan.daily_plans || []
        };
    }

    /**
     * Process visit data into metrics
     */
    processVisitData(visits) {
        const totalVisits = visits.length;
        const totalRevenue = visits.reduce((sum, visit) => sum + (parseFloat(visit.amountOfSale) || 0), 0);
        const convertingVisits = visits.filter(visit => (parseFloat(visit.amountOfSale) || 0) > 0).length;
        const uniqueCustomers = new Set(visits.map(visit => visit.clientName)).size;
        
        // Area-wise breakdown
        const areaBreakdown = {};
        visits.forEach(visit => {
            const area = visit.areaName || 'Unknown';
            if (!areaBreakdown[area]) {
                areaBreakdown[area] = { visits: 0, revenue: 0 };
            }
            areaBreakdown[area].visits++;
            areaBreakdown[area].revenue += parseFloat(visit.amountOfSale) || 0;
        });

        // Daily breakdown
        const dailyBreakdown = {};
        visits.forEach(visit => {
            const date = visit.dcrDate;
            if (!dailyBreakdown[date]) {
                dailyBreakdown[date] = { visits: 0, revenue: 0 };
            }
            dailyBreakdown[date].visits++;
            dailyBreakdown[date].revenue += parseFloat(visit.amountOfSale) || 0;
        });

        return {
            total_visits: totalVisits,
            total_revenue: totalRevenue,
            unique_customers: uniqueCustomers,
            conversion_rate: totalVisits > 0 ? (convertingVisits / totalVisits) * 100 : 0,
            avg_revenue_per_visit: totalVisits > 0 ? totalRevenue / totalVisits : 0,
            area_breakdown: areaBreakdown,
            daily_breakdown: dailyBreakdown,
            sample_distribution: visits.filter(v => v.sampleGiven).length
        };
    }

    /**
     * Get empty visit metrics template
     */
    getEmptyVisitMetrics() {
        return {
            total_visits: 0,
            total_revenue: 0,
            unique_customers: 0,
            conversion_rate: 0,
            avg_revenue_per_visit: 0,
            area_breakdown: {},
            daily_breakdown: {},
            sample_distribution: 0
        };
    }

    /**
     * Calculate comprehensive week analysis
     */
    calculateWeekAnalysis(planned, actual, weekNumber) {
        const visitAchievement = planned.total_visits > 0 ? (actual.total_visits / planned.total_visits) * 100 : 0;
        const revenueAchievement = planned.target_revenue > 0 ? (actual.total_revenue / planned.target_revenue) * 100 : 0;
        
        const analysis = {
            visit_achievement_percentage: visitAchievement,
            revenue_achievement_percentage: revenueAchievement,
            conversion_performance: actual.conversion_rate,
            customer_coverage: actual.unique_customers,
            
            // Gap analysis
            visit_gap: planned.total_visits - actual.total_visits,
            revenue_gap: planned.target_revenue - actual.total_revenue,
            
            // Performance rating
            overall_performance: this.calculateOverallPerformance(visitAchievement, revenueAchievement, actual.conversion_rate),
            
            // Area performance
            area_performance: this.analyzeAreaPerformance(planned.focus_areas, actual.area_breakdown),
            
            // Weekly trends
            week_trend: this.calculateWeekTrend(weekNumber, visitAchievement, revenueAchievement)
        };

        return analysis;
    }

    /**
     * Calculate overall performance rating
     */
    calculateOverallPerformance(visitAchievement, revenueAchievement, conversionRate) {
        const avgAchievement = (visitAchievement + revenueAchievement) / 2;
        const conversionBonus = conversionRate > 50 ? 10 : 0;
        const totalScore = avgAchievement + conversionBonus;

        if (totalScore >= 90) return 'EXCELLENT';
        if (totalScore >= 75) return 'GOOD';
        if (totalScore >= 60) return 'AVERAGE';
        if (totalScore >= 40) return 'BELOW_AVERAGE';
        return 'POOR';
    }

    /**
     * Analyze area performance vs planned focus
     */
    analyzeAreaPerformance(focusAreas, actualAreas) {
        const analysis = {};
        
        focusAreas.forEach(area => {
            const actualData = actualAreas[area] || { visits: 0, revenue: 0 };
            analysis[area] = {
                planned_focus: true,
                actual_visits: actualData.visits,
                actual_revenue: actualData.revenue,
                performance: actualData.visits > 0 ? 'COVERED' : 'MISSED'
            };
        });

        // Check for unplanned areas with significant activity
        Object.keys(actualAreas).forEach(area => {
            if (!focusAreas.includes(area) && actualAreas[area].visits > 3) {
                analysis[area] = {
                    planned_focus: false,
                    actual_visits: actualAreas[area].visits,
                    actual_revenue: actualAreas[area].revenue,
                    performance: 'UNPLANNED_ACTIVITY'
                };
            }
        });

        return analysis;
    }

    /**
     * Calculate week trend
     */
    calculateWeekTrend(weekNumber, visitAchievement, revenueAchievement) {
        // This would be enhanced with historical data comparison
        const avgPerformance = (visitAchievement + revenueAchievement) / 2;
        
        return {
            week_number: weekNumber,
            performance_score: avgPerformance,
            trend_direction: avgPerformance >= 80 ? 'IMPROVING' : avgPerformance >= 60 ? 'STABLE' : 'DECLINING',
            month_progress: (weekNumber / 4) * 100
        };
    }

    /**
     * Generate recommendations based on week analysis
     */
    generateWeekRecommendations(analysis) {
        const recommendations = [];

        // Visit gap recommendations
        if (analysis.visit_gap > 5) {
            recommendations.push({
                priority: 'HIGH',
                category: 'VISIT_VOLUME',
                recommendation: `Increase visit frequency - ${analysis.visit_gap} visits behind target`,
                action: 'Schedule additional customer visits in remaining days'
            });
        }

        // Revenue gap recommendations
        if (analysis.revenue_gap > 10000) {
            recommendations.push({
                priority: 'HIGH',
                category: 'REVENUE',
                recommendation: `Focus on high-value customers - ₹${analysis.revenue_gap.toLocaleString()} revenue gap`,
                action: 'Prioritize Tier 1 and Tier 2 customers in revised plan'
            });
        }

        // Conversion recommendations
        if (analysis.conversion_performance < 40) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'CONVERSION',
                recommendation: 'Improve visit quality and customer engagement',
                action: 'Focus on relationship building and product demonstration'
            });
        }

        // Area focus recommendations
        Object.entries(analysis.area_performance).forEach(([area, performance]) => {
            if (performance.planned_focus && performance.performance === 'MISSED') {
                recommendations.push({
                    priority: 'MEDIUM',
                    category: 'TERRITORY',
                    recommendation: `Area ${area} not covered as planned`,
                    action: 'Prioritize missed focus areas in remaining days'
                });
            }
        });

        return recommendations;
    }

    /**
     * Generate revised plan for remaining days
     */
    async generateRevisedPlan(currentPlan, weekAnalysis, weekNumber) {
        console.log(`🔄 Generating revised plan after Week ${weekNumber}`);

        const revisedPlan = JSON.parse(JSON.stringify(currentPlan.current_plan_json));
        
        // Update plan metadata
        revisedPlan.plan_metadata.revision_count++;
        revisedPlan.plan_metadata.last_revision_date = new Date().toISOString();
        revisedPlan.plan_metadata.revision_trigger = `Week ${weekNumber} performance analysis`;

        // Analyze gaps and adjust remaining weeks
        const remainingWeeks = revisedPlan.weekly_plans.filter(week => week.week_number > weekNumber);
        
        // Redistribute missed visits and revenue targets
        const redistributionPlan = this.calculateRedistribution(weekAnalysis, remainingWeeks);
        
        // Apply redistributions to remaining weeks
        remainingWeeks.forEach(week => {
            week.target_visits += redistributionPlan.additional_visits_per_week;
            week.target_revenue += redistributionPlan.additional_revenue_per_week;
            
            // Update focus based on missed areas
            if (redistributionPlan.missed_areas.length > 0) {
                week.focus_areas = [...new Set([...week.focus_areas, ...redistributionPlan.missed_areas])];
            }
        });

        // Update customer visit frequencies for missed customers
        this.updateCustomerFrequencies(revisedPlan, weekAnalysis, weekNumber);

        // Add specific revision notes
        revisedPlan.revision_notes = {
            week_analyzed: weekNumber,
            performance_gaps: weekAnalysis.performance_analysis,
            adjustments_made: redistributionPlan,
            revision_date: new Date().toISOString()
        };

        return revisedPlan;
    }

    /**
     * Calculate redistribution of targets to remaining weeks
     */
    calculateRedistribution(weekAnalysis, remainingWeeks) {
        const visitGap = Math.max(0, weekAnalysis.performance_analysis.visit_gap);
        const revenueGap = Math.max(0, weekAnalysis.performance_analysis.revenue_gap);
        const remainingWeekCount = remainingWeeks.length;
        
        // Find missed focus areas
        const missedAreas = Object.entries(weekAnalysis.performance_analysis.area_performance)
            .filter(([area, perf]) => perf.planned_focus && perf.performance === 'MISSED')
            .map(([area]) => area);

        return {
            additional_visits_per_week: remainingWeekCount > 0 ? Math.ceil(visitGap / remainingWeekCount) : 0,
            additional_revenue_per_week: remainingWeekCount > 0 ? Math.ceil(revenueGap / remainingWeekCount) : 0,
            missed_areas: missedAreas,
            redistribution_strategy: visitGap > 10 ? 'AGGRESSIVE_CATCHUP' : 'GRADUAL_ADJUSTMENT'
        };
    }

    /**
     * Update customer visit frequencies based on analysis
     */
    updateCustomerFrequencies(revisedPlan, weekAnalysis, weekNumber) {
        const actualCustomers = new Set(Object.keys(weekAnalysis.actual_metrics.area_breakdown));
        
        // Identify customers that were planned but not visited
        Object.entries(revisedPlan.customer_visit_frequency).forEach(([customer, plan]) => {
            const plannedThisWeek = plan.recommended_dates?.some(date => {
                const weekOfDate = Math.ceil(new Date(date).getDate() / 7);
                return weekOfDate === weekNumber;
            });

            if (plannedThisWeek && !actualCustomers.has(customer)) {
                // Customer was planned but not visited - increase priority
                plan.priority_reason = `Missed in Week ${weekNumber} - High Priority`;
                plan.adjusted_priority = 'HIGH';
            }
        });
    }

    /**
     * Save weekly revision to database
     */
    async saveWeeklyRevision(monthlyPlanId, weekNumber, revisedPlan, analysis) {
        try {
            const { data, error } = await supabase
                .from('weekly_plan_revisions')
                .insert({
                    monthly_plan_id: monthlyPlanId,
                    week_number: weekNumber,
                    revision_date: new Date().toISOString(),
                    revised_plan_json: revisedPlan,
                    performance_analysis: analysis,
                    version: `1.${weekNumber}`,
                    revision_reason: `Week ${weekNumber} performance analysis and adjustment`,
                    week_start_date: analysis.week_dates.start,
                    week_end_date: analysis.week_dates.end
                })
                .select()
                .single();

            if (error) {
                throw new Error(`Revision save failed: ${error.message}`);
            }

            console.log(`✅ Weekly revision saved with ID: ${data.id}`);
            return data;

        } catch (error) {
            console.error('❌ Failed to save weekly revision:', error);
            throw error;
        }
    }

    /**
     * Update current plan in monthly_tour_plans table
     */
    async updateCurrentPlan(planId, revisedPlan) {
        try {
            const { error } = await supabase
                .from('monthly_tour_plans')
                .update({
                    current_plan_json: revisedPlan,
                    current_revision: revisedPlan.plan_metadata.revision_count,
                    updated_at: new Date().toISOString()
                })
                .eq('id', planId);

            if (error) {
                throw new Error(`Plan update failed: ${error.message}`);
            }

            console.log(`✅ Current plan updated for ID: ${planId}`);

        } catch (error) {
            console.error('❌ Failed to update current plan:', error);
            throw error;
        }
    }

    /**
     * Generate final monthly report
     */
    async generateMonthlyReport(mrName, month, year) {
        try {
            console.log(`📈 Generating monthly report for ${mrName} - ${month}/${year}`);

            const monthlyPlan = await this.getMonthlyPlan(mrName, month, year);
            if (!monthlyPlan) {
                throw new Error('Monthly plan not found');
            }

            // Get all weekly revisions
            const { data: revisions, error: revisionsError } = await supabase
                .from('weekly_plan_revisions')
                .select('*')
                .eq('monthly_plan_id', monthlyPlan.id)
                .order('week_number');

            if (revisionsError) {
                console.warn('⚠️ Could not fetch revisions:', revisionsError);
            }

            // Calculate month-end performance
            const monthDates = this.getMonthDateRange(month, year);
            const actualPerformance = await this.getActualVisits(mrName, monthDates.start, monthDates.end);
            
            // Generate comprehensive report
            const report = {
                mr_name: mrName,
                month: month,
                year: year,
                report_generated: new Date().toISOString(),
                
                plan_summary: {
                    original_plan: monthlyPlan.original_plan_json.monthly_overview,
                    final_plan: monthlyPlan.current_plan_json.monthly_overview,
                    total_revisions: monthlyPlan.current_revision
                },
                
                performance_summary: {
                    planned_vs_actual: this.compareMonthlyPerformance(monthlyPlan, actualPerformance),
                    weekly_breakdown: revisions?.map(rev => rev.performance_analysis) || [],
                    key_achievements: this.identifyKeyAchievements(actualPerformance),
                    improvement_areas: this.identifyImprovementAreas(actualPerformance)
                },
                
                lessons_learned: this.extractLessonsLearned(revisions || []),
                next_month_recommendations: this.generateNextMonthRecommendations(actualPerformance, monthlyPlan)
            };

            // Save report
            const savedReport = await this.saveMonthlyReport(report);

            console.log(`✅ Monthly report generated and saved`);
            return {
                success: true,
                report_id: savedReport.id,
                report: report
            };

        } catch (error) {
            console.error('❌ Monthly report generation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get month date range
     */
    getMonthDateRange(month, year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        return {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
        };
    }

    /**
     * Compare monthly performance
     */
    compareMonthlyPerformance(monthlyPlan, actualPerformance) {
        const originalPlan = monthlyPlan.original_plan_json.monthly_overview;
        
        return {
            visit_achievement: (actualPerformance.total_visits / originalPlan.total_planned_visits) * 100,
            revenue_achievement: (actualPerformance.total_revenue / originalPlan.target_revenue) * 100,
            customer_coverage: actualPerformance.unique_customers,
            conversion_performance: actualPerformance.conversion_rate,
            plan_adherence_score: this.calculatePlanAdherenceScore(monthlyPlan, actualPerformance)
        };
    }

    /**
     * Calculate plan adherence score
     */
    calculatePlanAdherenceScore(monthlyPlan, actualPerformance) {
        const planned = monthlyPlan.original_plan_json.monthly_overview;
        const visitScore = Math.min((actualPerformance.total_visits / planned.total_planned_visits) * 100, 100);
        const revenueScore = Math.min((actualPerformance.total_revenue / planned.target_revenue) * 100, 100);
        const conversionScore = Math.min(actualPerformance.conversion_rate * 2, 100); // Max at 50% conversion
        
        return (visitScore + revenueScore + conversionScore) / 3;
    }

    /**
     * Save monthly report
     */
    async saveMonthlyReport(report) {
        try {
            const { data, error } = await supabase
                .from('monthly_performance_reports')
                .insert({
                    monthly_plan_id: report.monthly_plan_id || null,
                    mr_name: report.mr_name,
                    month: report.month,
                    year: report.year,
                    final_metrics: report.performance_summary,
                    lessons_learned: report.lessons_learned,
                    next_month_recommendations: report.next_month_recommendations,
                    report_json: report,
                    created_at: new Date().toISOString(),
                    overall_achievement_score: report.performance_summary?.planned_vs_actual?.plan_adherence_score || 0
                })
                .select()
                .single();

            if (error) {
                throw new Error(`Report save failed: ${error.message}`);
            }

            return data;

        } catch (error) {
            console.error('❌ Failed to save monthly report:', error);
            throw error;
        }
    }

    /**
     * Utility: Convert time string to minutes
     */
    timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const parts = timeStr.split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]) + (parseInt(parts[2] || 0) / 60);
    }

    /**
     * Identify key achievements
     */
    identifyKeyAchievements(performance) {
        const achievements = [];
        
        if (performance.conversion_rate > 50) {
            achievements.push('Excellent conversion rate achieved');
        }
        if (performance.total_visits > 300) {
            achievements.push('High visit volume maintained');
        }
        if (performance.avg_revenue_per_visit > 500) {
            achievements.push('Strong revenue per visit performance');
        }
        
        return achievements;
    }

    /**
     * Identify improvement areas
     */
    identifyImprovementAreas(performance) {
        const areas = [];
        
        if (performance.conversion_rate < 30) {
            areas.push('Conversion rate needs improvement');
        }
        if (performance.avg_revenue_per_visit < 300) {
            areas.push('Revenue per visit below target');
        }
        if (performance.unique_customers < 100) {
            areas.push('Customer coverage needs expansion');
        }
        
        return areas;
    }

    /**
     * Extract lessons learned from revisions
     */
    extractLessonsLearned(revisions) {
        const lessons = [];
        
        revisions.forEach(revision => {
            const analysis = revision.performance_analysis;
            if (analysis.performance_analysis.overall_performance === 'POOR') {
                lessons.push(`Week ${revision.week_number}: Performance challenges identified`);
            }
            if (analysis.recommendations.length > 0) {
                lessons.push(`Week ${revision.week_number}: ${analysis.recommendations[0].recommendation}`);
            }
        });
        
        return lessons;
    }

    /**
     * Generate next month recommendations
     */
    generateNextMonthRecommendations(performance, monthlyPlan) {
        const recommendations = [];
        
        // Based on performance
        if (performance.conversion_rate < 40) {
            recommendations.push('Focus on visit quality improvement training');
        }
        if (performance.total_revenue < monthlyPlan.original_plan_json.monthly_overview.target_revenue * 0.8) {
            recommendations.push('Increase focus on high-value customers');
        }
        
        // Based on plan adherence
        if (monthlyPlan.current_revision > 2) {
            recommendations.push('Improve initial planning accuracy');
        }
        
        return recommendations;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Monthly Tour Plan cache cleared');
    }
}

// Export singleton instance
export const monthlyTourPlanService = new MonthlyTourPlanService();
export default MonthlyTourPlanService;
