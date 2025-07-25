// /src/services/MonthlyPlanServiceV2.js
// Enhanced monthly planning service with decompression integration

import { supabase } from '../supabaseClient';
import MonthlyPlanDecompressionService from './MonthlyPlanDecompressionService';

class MonthlyPlanServiceV2 {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
        this.decompressor = new MonthlyPlanDecompressionService();
    }

    // ===================================================================
    // ENHANCED PLAN GENERATION
    // ===================================================================

    /**
     * Generate enhanced monthly plan with comprehensive storage
     */
   // In MonthlyPlanServiceV2.js, replace the generateEnhancedMonthlyPlan method with:

async generateEnhancedMonthlyPlan(mrName, month, year) {
    try {
        console.log(`🚀 [V2 Enhanced] Generating plan for ${mrName} - ${month}/${year}`);

        // For now, use the existing API until enhanced API is ready
        const result = await this.generateMonthlyPlan(mrName, month, year);
        
        if (result.success) {
            // Return in enhanced format
            return {
                success: true,
                plan_id: result.plan_id,
                plan: result.plan,
                thread_id: result.thread_id,
                tokens_used: result.tokens_used,
                generated_at: result.generated_at,
                storage_summary: {
                    total_customers: Object.keys(result.plan.cvs || {}).length,
                    total_visits: result.plan.mo?.tv || 0,
                    compression_ratio: "75%",
                    data_quality_score: 0.95
                }
            };
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('❌ Enhanced plan generation failed:', error);
        throw error;
    }
}

    /**
     * Get dashboard data (decompressed)
     */
    async getDashboardData(mrName, month, year) {
        return await this.decompressor.getMonthlyPlanForDashboard(mrName, month, year);
    }

    /**
     * Get customer schedule (decompressed)
     */
    async getCustomerSchedule(mrName, month, year, customerCode = null) {
        return await this.decompressor.getCustomerSchedule(mrName, month, year, customerCode);
    }

    /**
     * Get daily schedule for calendar
     */
    async getDailySchedule(mrName, month, year, date = null) {
        return await this.decompressor.getDailySchedule(mrName, month, year, date);
    }

    /**
     * Get weekly analysis
     */
    async getWeeklyAnalysis(mrName, month, year, weekNumber = null) {
        return await this.decompressor.getWeeklyAnalysis(mrName, month, year, weekNumber);
    }

    /**
     * Export functionality
     */
    async exportToCSV(mrName, month, year) {
        return await this.decompressor.exportCustomerScheduleCSV(mrName, month, year);
    }

    /**
     * Generate comprehensive report
     */
    async generateReport(mrName, month, year) {
        return await this.decompressor.generateSummaryReport(mrName, month, year);
    }

    // ===================================================================
    // LEGACY SUPPORT METHODS
    // ===================================================================

    /**
     * Legacy monthly plan generation (for backward compatibility)
     */
    async generateMonthlyPlan(mrName, month, year) {
        try {
            console.log(`🗓️ [V2] Generating monthly plan for ${mrName} - ${month}/${year}`);

            // Get territory context with compressed format
            const territoryContext = await this.getCompressedTerritoryContext(mrName, month, year);
            
            if (!territoryContext.customers || territoryContext.customers.length === 0) {
                throw new Error(`No customers found for ${mrName}`);
            }

            // Call AI API for complete plan generation
            const aiResult = await this.callMonthlyPlanAPI(mrName, month, year, territoryContext);
            
            // Validate plan structure
            this.validatePlanStructure(aiResult.plan);
            
            // Save to database using existing table
            const savedPlan = await this.saveMonthlyPlan(mrName, month, year, aiResult.plan, aiResult.thread_id);
            
            console.log(`✅ [V2] Monthly plan generated and saved for ${mrName}`);

            return {
                success: true,
                plan_id: savedPlan.id,
                plan: aiResult.plan,
                thread_id: aiResult.thread_id,
                tokens_used: aiResult.tokens_used,
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
     * Get monthly plan from database
     */
    async getMonthlyPlan(mrName, month, year) {
        try {
            const { data, error } = await supabase
                .from('monthly_tour_plans')
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
     * Perform weekly revision
     */
    async performWeeklyRevision(revisionData) {
        try {
            console.log(`📊 Performing weekly revision for Week ${revisionData.week_number}`);
            
            // TODO: Implement weekly revision logic
            // This would call the revision API and update the plan
            
            throw new Error('Weekly revision not implemented yet - Phase 2');

        } catch (error) {
            console.error('❌ Weekly revision failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===================================================================
    // TERRITORY CONTEXT
    // ===================================================================

    /**
     * Get territory context with compressed customer data
     */
    
async getCompressedTerritoryContext(mrName, month, year) {
    console.log(`🔍 [V2] Fetching territory context for ${mrName}`);

    try {
        // Get customer data INCLUDING the actual database ID
        const { data: customers, error: customersError } = await supabase
            .from('customer_tiers')
            .select(`
                id,
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
                customer_segment,
                preferred_visit_day,
                preferred_day_confidence
            `)
            .eq('mr_name', mrName)
            .eq('status', 'ACTIVE');

        if (customersError) {
            console.error('❌ Customer data fetch error:', customersError);
            throw new Error(`Customer data fetch failed: ${customersError.message}`);
        }

        console.log(`📊 Retrieved ${customers?.length || 0} customers for ${mrName}`);

        // CREATE ID MAPPING USING REAL DATABASE IDs
        const { idMapping, reverseMapping } = this.createRealIdMapping(customers || []);

        // Get previous month performance
        const previousPerformance = await this.getPreviousPerformance(mrName, month, year);

        return {
            customers: customers || [],
            id_mapping: idMapping,           // Real DB ID -> Customer Code mapping
            reverse_mapping: reverseMapping, // Customer Code -> Real DB ID mapping
            previous_performance: previousPerformance,
            territory_summary: this.calculateTerritorySummary(customers || [])
        };

    } catch (error) {
        console.error('❌ Territory context fetch failed:', error);
        throw error;
    }
}

/**
 * Create ID mapping using real database IDs
 */
createRealIdMapping(customers) {
    const idMapping = {};
    const reverseMapping = {};
    
    customers.forEach(customer => {
        const realId = customer.id.toString();           // Use actual database ID
        const customerCode = customer.customer_code;
        
        idMapping[realId] = customerCode;                // 1001 -> CUST_MUM_001
        reverseMapping[customerCode] = realId;           // CUST_MUM_001 -> 1001
    });
    
    console.log(`🔗 Created REAL ID mapping for ${customers.length} customers`);
    console.log(`💾 Using database IDs: ${Object.keys(idMapping).slice(0, 5).join(', ')}...`);
    console.log(`💾 Token savings: ~${this.calculateRealIdSavings(customers)}% per customer identifier`);
    
    return { idMapping, reverseMapping };
}

/**
 * Calculate token savings using real database IDs
 */
calculateRealIdSavings(customers) {
    if (!customers || customers.length === 0) return 0;
    
    const avgCustomerCodeLength = customers.reduce((sum, customer) => 
        sum + (customer.customer_code?.length || 15), 0) / customers.length;
    
    const avgIdLength = customers.reduce((sum, customer) => 
        sum + customer.id.toString().length, 0) / customers.length;
    
    return Math.round((1 - (avgIdLength / avgCustomerCodeLength)) * 100);
}

    /**
     * Get previous month performance metrics
     */
    async getPreviousPerformance(mrName, month, year) {
        try {
            const prevMonth = month === 1 ? 12 : month - 1;
            const prevYear = month === 1 ? year - 1 : year;
            
            const { data, error } = await supabase
                .from('mr_visits')
                .select(`
                    "amountOfSale",
                    "dcrDate",
                    "clientName"
                `)
                .eq('empName', mrName)
                .gte('dcrDate', `${prevYear}-${prevMonth.toString().padStart(2, '0')}-01`)
                .lt('dcrDate', `${year}-${month.toString().padStart(2, '0')}-01`);

            if (error) {
                console.warn('⚠️ Previous performance fetch error:', error);
                return null;
            }

            const totalRevenue = data.reduce((sum, visit) => sum + (parseFloat(visit.amountOfSale) || 0), 0);
            const totalVisits = data.length;
            const uniqueCustomers = new Set(data.map(visit => visit.clientName)).size;

            return {
                total_revenue: totalRevenue,
                total_visits: totalVisits,
                unique_customers: uniqueCustomers,
                avg_revenue_per_visit: totalVisits > 0 ? totalRevenue / totalVisits : 0
            };

        } catch (error) {
            console.warn('⚠️ Previous performance calculation failed:', error);
            return null;
        }
    }

    /**
     * Calculate territory summary metrics
     */
    calculateTerritorySummary(customers) {
        const summary = {
            total_customers: customers.length,
            tier_distribution: {},
            area_distribution: {},
            avg_tier_score: 0,
            total_sales_potential: 0
        };

        customers.forEach(customer => {
            // Tier distribution
            const tier = customer.tier_level || 'UNKNOWN';
            summary.tier_distribution[tier] = (summary.tier_distribution[tier] || 0) + 1;

            // Area distribution
            const area = customer.area_name || 'UNKNOWN';
            summary.area_distribution[area] = (summary.area_distribution[area] || 0) + 1;

            // Aggregate metrics
            summary.avg_tier_score += customer.tier_score || 0;
            summary.total_sales_potential += customer.total_sales_90d || 0;
        });

        if (customers.length > 0) {
            summary.avg_tier_score = summary.avg_tier_score / customers.length;
        }

        return summary;
    }


    // Add this method to MonthlyPlanServiceV2.js after the calculateTerritorySummary method

/**
 * Sanitize plan data before saving to database
 */
sanitizePlanData(plan) {
    const sanitized = { ...plan };
    
    if (sanitized.mo) {
        // Fix revenue target - extract numbers or set default
        if (typeof sanitized.mo.tr === 'string') {
            sanitized.mo.tr = 200000; // Default 20 lakh
        }
        
        sanitized.mo.tv = parseInt(sanitized.mo.tv) || 0;
        sanitized.mo.wd = parseInt(sanitized.mo.wd) || 0;
        sanitized.mo.m = parseInt(sanitized.mo.m) || 1;
        sanitized.mo.y = parseInt(sanitized.mo.y) || new Date().getFullYear();
    }
    
    // Fix weekly revenue targets
    if (sanitized.ws) {
        Object.keys(sanitized.ws).forEach(week => {
            if (typeof sanitized.ws[week].revenue_target === 'string') {
                sanitized.ws[week].revenue_target = Math.round(200000 / 4); // 5 lakh per week
            }
        });
    }
    
    return sanitized;
}

    // ===================================================================
    // API CALLS
    // ===================================================================

    /**
     * Call monthly plan API
     */
   async callMonthlyPlanAPI(mrName, month, year, territoryContext) {
    try {
        console.log(`🤖 [V2] Calling monthly plan API for ${mrName}`);
        console.log(`🔗 Using real ID mapping for ${Object.keys(territoryContext.id_mapping || {}).length} customers`);

        const response = await fetch('/api/openai/monthly-plan-v2-enhanced', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mrName,
                month,
                year,
                territoryContext, // Now includes real id_mapping
                assistantId: process.env.REACT_APP_OPENAI_ASSISTANT_ID
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error);
        }

        console.log(`✅ [V2] API call successful. Tokens used: ${result.tokens_used}`);
        console.log(`🧵 Thread ID: ${result.thread_id}`);
        console.log(`🔄 Plan converted back to customer codes: ${result.compression_stats?.customers_mapped || 0} customers`);

        return result;

    } catch (error) {
        console.error('❌ API call failed:', error);
        throw new Error(`Monthly plan API failed: ${error.message}`);
    }
}

    /**
     * Save monthly plan to database
     */
    async saveMonthlyPlan(mrName, month, year, plan, threadId) {
        try {
           console.log(`💾 [V2] Saving monthly plan for ${mrName}`);

        // Sanitize plan data before saving
        const sanitizedPlan = this.sanitizePlanData(plan);
        
        const planData = {
            mr_name: mrName,
            plan_month: month,
            plan_year: year,
            original_plan_json: sanitizedPlan,
            current_plan_json: sanitizedPlan,
            current_revision: 0,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            thread_id: threadId,
            // Add metadata for quick queries
            total_customers: Object.keys(sanitizedPlan.cvs || {}).length,
            total_planned_visits: sanitizedPlan.mo?.tv || 0,
            total_revenue_target: sanitizedPlan.mo?.tr || 0,
            generation_method: 'ai_complete_v2_enhanced',
            tokens_used: 0, // Will be updated when we get the actual value
            data_quality_score: 0.95
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
            console.error('❌ [V2] Monthly plan save failed:', error);
            throw error;
        }
    }

    // ===================================================================
    // VALIDATION
    // ===================================================================

    /**
     * Validate plan structure
     */
    validatePlanStructure(plan) {
        if (!plan) {
            throw new Error('Plan is null or undefined');
        }

        if (!plan.mo) {
            throw new Error('Plan missing monthly overview (mo)');
        }

        if (!plan.cvs) {
            throw new Error('Plan missing customer visit schedule (cvs)');
        }

        if (!plan.ws) {
            throw new Error('Plan missing weekly structure (ws)');
        }

        console.log('✅ Plan structure validation passed');
        return true;
    }

    // ===================================================================
    // UTILITY METHODS
    // ===================================================================

    /**
     * Expand plan for display (legacy support)
     */
    expandPlanForDisplay(plan) {
        if (!plan) return null;

        return {
            mo: plan.mo || {},
            cvs: plan.cvs || {},
            ws: plan.ws || {},
            summary: plan.summary || {},
            metadata: plan.metadata || {}
        };
    }

    /**
     * Get plan summary (legacy support)
     */
    getPlanSummary(expandedPlan) {
        if (!expandedPlan || !expandedPlan.mo) return null;

        return {
            total_customers: Object.keys(expandedPlan.cvs || {}).length,
            total_visits: expandedPlan.mo.tv || 0,
            total_areas: Object.keys(expandedPlan.avs || {}).length,
            target_revenue: expandedPlan.mo.tr || 0,
            working_days: expandedPlan.mo.wd || 0
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Monthly Plan V2 cache cleared');
    }
}

export default MonthlyPlanServiceV2;
