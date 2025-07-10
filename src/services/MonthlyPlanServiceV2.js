// /src/services/MonthlyPlanServiceV2.js
// Phase 1: New monthly planning service with finalized format

import { supabase } from '../supabaseClient';

class MonthlyPlanServiceV2 {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    }

    // ===================================================================
    // PHASE 1: MONTHLY PLAN GENERATION
    // ===================================================================

    /**
     * Generate complete monthly plan using new AI approach
     */
    async generateMonthlyPlan(mrName, month, year) {
        try {
            console.log(`🗓️ [V2] Generating monthly plan for ${mrName} - ${month}/${year}`);

            // Get territory context with compressed format
            const territoryContext = await this.getCompressedTerritoryContext(mrName, month, year);
            
            if (!territoryContext.customers || territoryContext.customers.length === 0) {
                throw new Error(`No customers found for ${mrName}`);
            }

            // Call new AI API for complete plan generation
            const aiResult = await this.callMonthlyPlanAPI(mrName, month, year, territoryContext);
            
            // Validate plan structure
            this.validatePlanStructure(aiResult.plan);
            
            // Save to database using existing table
            const savedPlan = await this.saveMonthlyPlan(mrName, month, year, aiResult.plan, aiResult.thread_id);
            
            console.log(`✅ [V2] Monthly plan generated and saved for ${mrName}`);
            console.log(`📊 Plan metrics:`, {
                customers: Object.keys(aiResult.plan.cvs || {}).length,
                areas: Object.keys(aiResult.plan.avs || {}).length,
                tokens_used: aiResult.tokens_used,
                thread_id: aiResult.thread_id
            });

            return {
                success: true,
                plan_id: savedPlan.id,
                plan: aiResult.plan,
                thread_id: aiResult.thread_id,
                tokens_used: aiResult.tokens_used,
                generated_at: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ [V2] Monthly plan generation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get territory context with compressed customer data
     */
    async getCompressedTerritoryContext(mrName, month, year) {
        console.log(`🔍 [V2] Fetching territory context for ${mrName}`);

        try {
            // Get customer data from existing materialized view
            const { data: customers, error: customersError } = await supabase
                .from('customer_tiers')
                .select(`
                    customer_code,
                    customer_name,
                    customer_type,
                    area_name,
                    tier_score,
                    tier_level,
                    recommended_frequency,
                    recommended_visit_duration,
                    total_orders_90d,
                    total_sales_90d,
                    conversion_rate_90d,
                    last_visit_date,
                    days_since_last_visit,
                    customer_segment
                `)
                .eq('mr_name', mrName)
                .eq('status', 'ACTIVE');

            if (customersError) {
                console.error('❌ Customer data fetch error:', customersError);
                throw new Error(`Customer data fetch failed: ${customersError.message}`);
            }

            console.log(`📊 Retrieved ${customers?.length || 0} customers for ${mrName}`);

            // Get previous month performance
            const previousPerformance = await this.getPreviousPerformance(mrName, month, year);

            // Calculate territory metrics
            const territoryMetrics = this.calculateTerritoryMetrics(customers);

            return {
                customers: customers || [],
                previous_performance: previousPerformance,
                territory_metrics: territoryMetrics,
                mr_name: mrName,
                month: month,
                year: year
            };

        } catch (error) {
            console.error('❌ Territory context fetch failed:', error);
            throw error;
        }
    }

    /**
     * Call the new monthly plan API
     */
    async callMonthlyPlanAPI(mrName, month, year, territoryContext) {
        try {
            console.log(`📡 [V2] Calling monthly plan API`);
            
            const requestBody = {
                mrName: mrName,
                month: month,
                year: year,
                territoryContext: territoryContext,
                action: 'generate'
            };
            
            console.log(`📤 Request payload size: ${JSON.stringify(requestBody).length} characters`);
            console.log(`📊 Customer count: ${territoryContext.customers.length}`);

            const response = await fetch('/api/openai/monthly-plan-persistentV2', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const responseText = await response.text();
            
            if (!response.ok) {
                console.error('❌ API call failed:', response.status, responseText);
                throw new Error(`API call failed (${response.status}): ${responseText}`);
            }

            const result = JSON.parse(responseText);
            
            if (!result.success) {
                throw new Error(result.error || 'API call failed');
            }

            console.log(`✅ API call successful`);
            console.log(`📊 Tokens used: ${result.tokens_used}`);
            console.log(`🧵 Thread ID: ${result.thread_id}`);

            return result;

        } catch (error) {
            console.error('❌ API call failed:', error);
            throw new Error(`Monthly plan API failed: ${error.message}`);
        }
    }

    /**
     * Save monthly plan to existing database table
     */
    async saveMonthlyPlan(mrName, month, year, plan, threadId) {
        try {
            console.log(`💾 [V2] Saving monthly plan for ${mrName}`);

            const planData = {
                mr_name: mrName,
                plan_month: month,
                plan_year: year,
                current_plan_json: plan,
                plan_status: 'ACTIVE',
                generated_at: new Date().toISOString(),
                thread_id: threadId,
                plan_version: '2.0', // V2 format
                tokens_used: plan.metadata?.tokens_used || 0,
                customer_count: Object.keys(plan.cvs || {}).length,
                area_count: Object.keys(plan.avs || {}).length
            };

            // Check if plan already exists
            const { data: existingPlan } = await supabase
                .from('monthly_tour_plans')
                .select('id')
                .eq('mr_name', mrName)
                .eq('plan_month', month)
                .eq('plan_year', year)
                .single();

            let savedPlan;
            
            if (existingPlan) {
                // Update existing plan
                const { data, error } = await supabase
                    .from('monthly_tour_plans')
                    .update(planData)
                    .eq('id', existingPlan.id)
                    .select()
                    .single();

                if (error) throw error;
                savedPlan = data;
                console.log(`✅ Updated existing plan with ID: ${savedPlan.id}`);
            } else {
                // Create new plan
                const { data, error } = await supabase
                    .from('monthly_tour_plans')
                    .insert(planData)
                    .select()
                    .single();

                if (error) throw error;
                savedPlan = data;
                console.log(`✅ Created new plan with ID: ${savedPlan.id}`);
            }

            return savedPlan;

        } catch (error) {
            console.error('❌ Failed to save monthly plan:', error);
            throw error;
        }
    }

    /**
     * Get existing monthly plan
     */
    async getMonthlyPlan(mrName, month, year) {
        try {
            const cacheKey = `${mrName}_${month}_${year}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    console.log(`📋 [V2] Using cached plan for ${mrName}`);
                    return cached.data;
                }
            }

            const { data: plan, error } = await supabase
                .from('monthly_tour_plans')
                .select('*')
                .eq('mr_name', mrName)
                .eq('plan_month', month)
                .eq('plan_year', year)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (plan) {
                // Cache the result
                this.cache.set(cacheKey, {
                    data: plan,
                    timestamp: Date.now()
                });
                console.log(`📋 [V2] Retrieved plan for ${mrName} - ${month}/${year}`);
            }

            return plan;

        } catch (error) {
            console.error('❌ Failed to get monthly plan:', error);
            return null;
        }
    }

    /**
     * Get previous month performance for context
     */
    async getPreviousPerformance(mrName, month, year) {
        try {
            const previousMonth = month === 1 ? 12 : month - 1;
            const previousYear = month === 1 ? year - 1 : year;

            // Try to get from monthly plans first
            const { data: previousPlan } = await supabase
                .from('monthly_tour_plans')
                .select('current_plan_json')
                .eq('mr_name', mrName)
                .eq('plan_month', previousMonth)
                .eq('plan_year', previousYear)
                .single();

            if (previousPlan?.current_plan_json?.summary) {
                return {
                    total_visits: previousPlan.current_plan_json.summary.total_visits_planned || 0,
                    total_revenue: previousPlan.current_plan_json.mo?.tr || 0,
                    conversion_rate: 75 // Default estimate
                };
            }

            // Fallback to DCR data (you can implement this later)
            return {
                total_visits: 0,
                total_revenue: 0,
                conversion_rate: 0
            };

        } catch (error) {
            console.warn('⚠️ Could not fetch previous performance:', error);
            return {
                total_visits: 0,
                total_revenue: 0,
                conversion_rate: 0
            };
        }
    }

    /**
     * Calculate basic territory metrics
     */
    calculateTerritoryMetrics(customers) {
        if (!customers || customers.length === 0) {
            return {
                total_customers: 0,
                tier_distribution: {},
                area_count: 0,
                avg_tier_score: 0
            };
        }

        const tierDistribution = {};
        const areas = new Set();
        let totalTierScore = 0;

        customers.forEach(customer => {
            // Tier distribution
            const tier = customer.tier_level || 'TIER_4_PROSPECT';
            tierDistribution[tier] = (tierDistribution[tier] || 0) + 1;

            // Areas
            if (customer.area_name) {
                areas.add(customer.area_name);
            }

            // Tier score
            totalTierScore += parseFloat(customer.tier_score) || 0;
        });

        return {
            total_customers: customers.length,
            tier_distribution: tierDistribution,
            area_count: areas.size,
            avg_tier_score: Math.round(totalTierScore / customers.length)
        };
    }

    /**
     * Validate plan structure for V2 format
     */
    validatePlanStructure(plan) {
        if (!plan) throw new Error('Plan is null or undefined');
        
        // Check required V2 structure
        if (!plan.mo) throw new Error('Missing monthly overview (mo)');
        if (!plan.wp || !Array.isArray(plan.wp)) throw new Error('Missing weekly plans (wp)');
        if (!plan.cvs) throw new Error('Missing customer visit schedule (cvs)');
        if (!plan.avs) throw new Error('Missing area visit schedule (avs)');
        
        // Validate monthly overview
        if (!plan.mo.mr || !plan.mo.m || !plan.mo.y) {
            throw new Error('Invalid monthly overview structure');
        }

        // Validate weekly plans
        if (plan.wp.length !== 4) {
            throw new Error('Must have exactly 4 weekly plans');
        }

        plan.wp.forEach((week, index) => {
            if (!week.w || week.w !== index + 1) {
                throw new Error(`Invalid week number in week ${index + 1}`);
            }
            if (!week.fa || !Array.isArray(week.fa)) {
                throw new Error(`Missing focus areas in week ${index + 1}`);
            }
        });

        console.log('✅ Plan structure validation passed');
    }

    // ===================================================================
    // QUERY METHODS FOR DASHBOARD
    // ===================================================================

    /**
     * Get customer visits for specific date
     */
    getCustomerVisitsForDate(plan, targetDate) {
        if (!plan?.cvs) return [];

        const visits = [];
        Object.entries(plan.cvs).forEach(([customerCode, dates]) => {
            if (dates.includes(targetDate)) {
                visits.push(customerCode);
            }
        });

        return visits;
    }

    /**
     * Get areas to visit on specific date
     */
    getAreasForDate(plan, targetDate) {
        if (!plan?.avs) return [];

        const areas = [];
        Object.entries(plan.avs).forEach(([area, dates]) => {
            if (dates.includes(targetDate)) {
                areas.push(area);
            }
        });

        return areas;
    }

    /**
     * Get customer's complete schedule
     */
    getCustomerSchedule(plan, customerCode) {
        return plan?.cvs?.[customerCode] || [];
    }

    /**
     * Get area's visit schedule
     */
    getAreaSchedule(plan, areaName) {
        return plan?.avs?.[areaName] || [];
    }

    /**
     * Get weekly focus areas
     */
    getWeeklyFocusAreas(plan, weekNumber) {
        const week = plan?.wp?.find(w => w.w === weekNumber);
        return week?.fa || [];
    }

    /**
     * Get plan summary statistics
     */
    getPlanSummary(plan) {
        if (!plan) return null;

        const totalCustomers = Object.keys(plan.cvs || {}).length;
        const totalVisits = Object.values(plan.cvs || {}).reduce((sum, dates) => sum + dates.length, 0);
        const totalAreas = Object.keys(plan.avs || {}).length;

        return {
            total_customers: totalCustomers,
            total_visits: totalVisits,
            total_areas: totalAreas,
            target_revenue: plan.mo?.tr || 0,
            working_days: plan.mo?.wd || 0,
            avg_visits_per_day: Math.round((totalVisits / (plan.mo?.wd || 1)) * 10) / 10
        };
    }

    // ===================================================================
    // PHASE 2 & 3 PLACEHOLDERS
    // ===================================================================

    /**
     * Weekly revision (Phase 2)
     */
    async reviseWeeklyPlan(planId, weekNumber, actualPerformance, revisionReason) {
        console.log(`🔄 [V2] Weekly revision - Phase 2 not implemented yet`);
        throw new Error('Weekly revision not implemented - Phase 2');
    }

    /**
     * Daily update (Phase 2) 
     */
    async updateDailyPlan(planId, actualPerformance) {
        console.log(`📅 [V2] Daily update - Phase 2 not implemented yet`);
        throw new Error('Daily update not implemented - Phase 2');
    }

    /**
     * Monthly review (Phase 3)
     */
    async monthlyReview(planId, monthlyPerformance) {
        console.log(`📊 [V2] Monthly review - Phase 3 not implemented yet`);
        throw new Error('Monthly review not implemented - Phase 3');
    }

    // ===================================================================
    // UTILITY METHODS
    // ===================================================================

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Cache cleared');
    }

    /**
     * Format date from DDMM to readable format
     */
    formatDate(ddmmDate, year) {
        if (!ddmmDate || ddmmDate.length !== 4) return ddmmDate;
        
        const day = ddmmDate.substring(0, 2);
        const month = ddmmDate.substring(2, 4);
        
        try {
            const date = new Date(year, parseInt(month) - 1, parseInt(day));
            return date.toLocaleDateString();
        } catch (error) {
            return ddmmDate;
        }
    }

    /**
     * Convert compressed format to readable format for display
     */
    expandPlanForDisplay(plan) {
        if (!plan) return null;

        // Expand customer visit schedule with readable dates
        const expandedCvs = {};
        Object.entries(plan.cvs || {}).forEach(([customerCode, dates]) => {
            expandedCvs[customerCode] = {
                dates: dates,
                readable_dates: dates.map(date => this.formatDate(date, plan.mo?.y)),
                visit_count: dates.length
            };
        });

        // Expand area visit schedule
        const expandedAvs = {};
        Object.entries(plan.avs || {}).forEach(([area, dates]) => {
            expandedAvs[area] = {
                dates: dates,
                readable_dates: dates.map(date => this.formatDate(date, plan.mo?.y)),
                visit_days: dates.length
            };
        });

        return {
            ...plan,
            expanded_cvs: expandedCvs,
            expanded_avs: expandedAvs
        };
    }
}

export default MonthlyPlanServiceV2;
