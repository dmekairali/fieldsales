// src/services/AITourPlanGenerator.js
import { supabase } from '../supabaseClient';

class AITourPlanGenerator {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
        this.openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY;
    }

    /**
     * Get comprehensive territory context for AI planning
     */
    async getTerritoryContext(mrName) {
        const cacheKey = `territory_context_${mrName}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            console.log('📋 Using cached territory context');
            return cached.data;
        }

        try {
            console.log(`🔍 Fetching territory context for MR: ${mrName}`);
            
            // Get customer tiers from materialized view with auto-calculated metrics
            const { data: customers, error: customersError } = await supabase
                .from('customer_tier_metrics')
                .select(`
                    customer_code,
                    customer_name,
                    customer_type,
                    territory,
                    mr_name,
                    area_name,
                    city_name,
                    pin_code,
                    full_address,
                    tier_score_calc,
                    tier_level_calc,
                    direct_sales_score_calc,
                    visit_efficiency_score_calc,
                    prescription_influence_score_calc,
                    market_potential_score_calc,
                    recommended_frequency_calc,
                    recommended_visit_duration,
                    total_orders_90d_calc,
                    total_sales_90d_calc,
                    conversion_rate_90d_calc,
                    last_tier_calculation_calc,
                    first_visit_date,
                    last_visit_date,
                    days_since_last_visit,
                    customer_segment,
                    status
                `)
                .eq('mr_name', mrName)
                .eq('status', 'ACTIVE')
                .order('tier_score_calc', { ascending: false });

            if (customersError) {
                console.error('❌ Error fetching customers:', customersError);
                throw customersError;
            }

            // Get recent performance (last 30 days)
            const { data: performance, error: performanceError } = await supabase
                .from('real_time_visit_quality')
                .select(`
                    quality_score,
                    "amountOfSale"
                `)
                .eq('empName', mrName)
                .gte('dcrDate', this.getDateDaysAgo(30))
                .not('quality_score', 'is', null);

            if (performanceError) {
                console.warn('⚠️ Performance data error:', performanceError);
            }

            // Calculate performance metrics
            const performanceMetrics = this.calculatePerformanceMetrics(performance || []);

            // Get territory efficiency from mr_visits
            const { data: territories, error: territoriesError } = await supabase
                .from('mr_visits')
                .select(`
                    "visitedArea",
                    "amountOfSale"
                `)
                .eq('empName', mrName)
                .gte('dcrDate', this.getDateDaysAgo(30))
                .not('visitedArea', 'is', null);

            if (territoriesError) {
                console.warn('⚠️ Territory data error:', territoriesError);
            }

            // Process territory data
            const territoryMetrics = this.processTerritoryData(territories || []);

            const context = {
                customers: customers || [],
                performance: performanceMetrics,
                territories: territoryMetrics
            };

            // Cache results
            this.cache.set(cacheKey, {
                data: context,
                timestamp: Date.now()
            });

            console.log(`✅ Territory context loaded: ${customers?.length || 0} customers`);
            console.log(`📊 Tier distribution:`, this.getTierDistribution(customers || []));
            
            return context;

        } catch (error) {
            console.error('❌ Error fetching territory context:', error);
            throw error;
        }
    }

    /**
     * Get tier distribution for logging
     */
    getTierDistribution(customers) {
        const distribution = {};
        customers.forEach(customer => {
            const tier = customer.tier_level_calc || 'UNKNOWN';
            distribution[tier] = (distribution[tier] || 0) + 1;
        });
        return distribution;
    }

    /**
     * Calculate performance metrics from raw data
     */
    calculatePerformanceMetrics(performance) {
        if (!performance || performance.length === 0) {
            return {
                avg_quality: 0,
                total_visits: 0,
                total_sales: 0,
                converting_visits: 0,
                conversion_rate: 0
            };
        }

        const totalVisits = performance.length;
        const totalSales = performance.reduce((sum, visit) => sum + (parseFloat(visit.amountOfSale) || 0), 0);
        const convertingVisits = performance.filter(visit => (parseFloat(visit.amountOfSale) || 0) > 0).length;
        const avgQuality = performance.reduce((sum, visit) => sum + (visit.quality_score || 0), 0) / totalVisits;

        return {
            avg_quality: avgQuality,
            total_visits: totalVisits,
            total_sales: totalSales,
            converting_visits: convertingVisits,
            conversion_rate: totalVisits > 0 ? (convertingVisits / totalVisits) * 100 : 0
        };
    }

    /**
     * Process territory data for efficiency metrics
     */
    processTerritoryData(territories) {
        const territoryMap = {};
        
        territories.forEach(visit => {
            const area = visit.visitedArea;
            if (!territoryMap[area]) {
                territoryMap[area] = {
                    visitedArea: area,
                    visits: 0,
                    sales: 0
                };
            }
            territoryMap[area].visits++;
            territoryMap[area].sales += parseFloat(visit.amountOfSale) || 0;
        });

        return Object.values(territoryMap)
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10); // Top 10 areas
    }

    /**
     * Generate AI prompt for tour planning with materialized view data
     */
    generateAIPrompt(mrName, context, date) {
        const customers = context.customers;
        const customersSummary = `Total active customers: ${customers.length}\n`;
        const tierSummary = {};
        
        customers.forEach(customer => {
            const tier = customer.tier_level_calc || 'TIER_4_PROSPECT';
            tierSummary[tier] = (tierSummary[tier] || 0) + 1;
        });

        let tierBreakdown = '';
        Object.entries(tierSummary).forEach(([tier, count]) => {
            tierBreakdown += `- ${tier}: ${count} customers\n`;
        });

        // Calculate aggregate metrics from materialized view
        const totalSales90d = customers.reduce((sum, c) => sum + (parseFloat(c.total_sales_90d_calc) || 0), 0);
        const totalOrders90d = customers.reduce((sum, c) => sum + (parseInt(c.total_orders_90d_calc) || 0), 0);
        const avgConversionRate = customers.length > 0 
            ? customers.reduce((sum, c) => sum + (parseFloat(c.conversion_rate_90d_calc) || 0), 0) / customers.length 
            : 0;

        // Identify high-priority customers
        const highValueCustomers = customers.filter(c => parseFloat(c.tier_score_calc || 0) >= 60);
        const recentlyInactiveCustomers = customers.filter(c => (parseInt(c.days_since_last_visit) || 0) > 30);
        const highConversionCustomers = customers.filter(c => parseFloat(c.conversion_rate_90d_calc || 0) > 70);

        const topCustomers = customers.slice(0, 15).map((customer, index) => {
            const tierScore = parseFloat(customer.tier_score_calc) || 0;
            const salesAmount = parseFloat(customer.total_sales_90d_calc) || 0;
            const conversionRate = parseFloat(customer.conversion_rate_90d_calc) || 0;
            const daysSinceVisit = parseInt(customer.days_since_last_visit) || 0;
            
            return `${index + 1}. ${customer.customer_name} (${customer.tier_level_calc || 'TIER_4'}) - Score: ${tierScore.toFixed(1)}, Sales: ₹${salesAmount.toLocaleString()}, Conversion: ${conversionRate.toFixed(1)}%, Days since visit: ${daysSinceVisit}`;
        }).join('\n');

        const prompt = `
You are an AI Tour Planning Assistant for Kairali Ayurvedic products. Generate an optimal daily tour plan for ${mrName} on ${date}.

TERRITORY CONTEXT:
${customersSummary}
${tierBreakdown}

Territory Performance (Last 90 days from materialized view):
- Total territory sales: ₹${totalSales90d.toLocaleString()}
- Total orders: ${totalOrders90d}
- Average conversion rate: ${avgConversionRate.toFixed(1)}%
- High-value customers (Score ≥60): ${highValueCustomers.length}
- Recently inactive (>30 days): ${recentlyInactiveCustomers.length}
- High-conversion customers (>70%): ${highConversionCustomers.length}

Recent Performance (Last 30 days):
- Average visit quality: ${context.performance.avg_quality?.toFixed(1) || 'N/A'}
- Total visits: ${context.performance.total_visits || 0}
- Total sales: ₹${context.performance.total_sales?.toLocaleString() || 0}
- Conversion rate: ${context.performance.conversion_rate?.toFixed(1) || 0}%

CUSTOMER PRIORITIES (Top 15 by tier score):
${topCustomers}

PLANNING CONSTRAINTS:
- Minimum 11 visits per day
- Maximum 15 visits per day  
- At least 40% visits should be NBD-focused (new customers or prospects)
- Visit duration based on tier: Tier 1 (30+ min), Tier 2 (20+ min), Tier 3 (15+ min), Tier 4 (10+ min)
- Maximum travel time: 30% of working day
- Prioritize customers with high churn risk (>30 days since last visit)
- Group geographically close customers (same area_name)
- Focus on high-conversion customers for sales targets

SPECIAL PRIORITIES:
1. Customers with >30 days since last visit (churn prevention)
2. High-value customers (tier_score ≥ 60) for relationship maintenance
3. High-conversion customers (>70% conversion rate) for sales opportunities
4. New prospects for business development

OUTPUT FORMAT (JSON only, no markdown):
{
    "daily_plan": [
        {
            "time_slot": "09:00-09:30",
            "customer_name": "Customer Name",
            "customer_code": "1234567890",
            "customer_type": "Doctor/Retailer",
            "tier_level": "TIER_1_CHAMPION",
            "tier_score": 72.5,
            "area_name": "Area Name",
            "visit_purpose": "Relationship building/Order generation/Sample distribution",
            "expected_duration": 30,
            "priority_reason": "High churn risk / High value / New customer",
            "last_visit_days": 45,
            "conversion_rate": 85.5
        }
    ],
    "plan_summary": {
        "total_customers": 12,
        "tier_1_customers": 3,
        "tier_2_customers": 4,
        "tier_3_customers": 3,
        "tier_4_customers": 2,
        "nbd_focused_visits": 5,
        "churn_prevention_visits": 3,
        "estimated_revenue": 25000,
        "route_efficiency": "High",
        "geographic_clusters": ["Area 1", "Area 2"]
    },
    "key_objectives": [
        "Focus on high-value customers",
        "Address churn risks",
        "Geographic optimization",
        "NBD development"
    ]
}

Generate the optimal tour plan considering all constraints and auto-calculated tier metrics. Return only valid JSON.`;

        return prompt;
    }

    /**
     * Call OpenAI API to generate tour plan
     */
    async callOpenAI(prompt) {
        if (!this.openaiApiKey) {
            throw new Error('OpenAI API key not configured');
        }

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.openaiApiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'system', 
                            content: 'You are an expert pharmaceutical territory planning AI assistant specializing in Ayurvedic products and Indian market dynamics. You have access to real-time customer tier calculations including direct sales scores, visit efficiency, and conversion rates. Always return valid JSON responses only.'
                        },
                        {
                            role: 'user', 
                            content: prompt
                        }
                    ],
                    max_tokens: 3000,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;

        } catch (error) {
            console.error('❌ OpenAI API call failed:', error);
            throw error;
        }
    }

    /**
     * Generate AI-powered tour plan using materialized view
     */
    async generateTourPlan(mrName, date = null) {
        if (!date) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            date = tomorrow.toISOString().split('T')[0];
        }

        try {
            console.log(`🤖 Generating AI tour plan for ${mrName} on ${date}`);

            // Refresh materialized view to get latest data
            await this.refreshMaterializedView();

            // Get territory context
            const context = await this.getTerritoryContext(mrName);
            
            if (!context.customers || context.customers.length === 0) {
                return {
                    success: false,
                    error: 'No active customers found for this MR. Please ensure customer data is available and materialized view is up to date.'
                };
            }

            // Generate AI prompt with materialized view data
            const prompt = this.generateAIPrompt(mrName, context, date);

            // Call OpenAI API
            const aiResponse = await this.callOpenAI(prompt);

            // Parse JSON response
            let planJson;
            try {
                // Clean response (remove markdown if present)
                const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
                planJson = JSON.parse(cleanResponse);
                
                // Validate plan structure
                this.validatePlanStructure(planJson);

            } catch (parseError) {
                console.error('❌ Failed to parse AI response:', parseError);
                return {
                    success: false,
                    error: 'AI response format error. Please try again.',
                    raw_response: aiResponse
                };
            }

            // Save to database
            await this.saveTourPlan(mrName, date, planJson);

            return {
                success: true,
                plan: planJson,
                generated_at: new Date().toISOString(),
                context_summary: {
                    total_customers: context.customers.length,
                    materialized_view_used: true,
                    performance_score: context.performance.avg_quality,
                    conversion_rate: context.performance.conversion_rate,
                    tier_distribution: this.getTierDistribution(context.customers)
                }
            };

        } catch (error) {
            console.error('❌ Tour plan generation failed:', error);
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Refresh materialized view to get latest tier calculations
     */
    async refreshMaterializedView() {
        try {
            console.log('🔄 Refreshing customer tier metrics...');
            
            // Execute refresh command via Supabase RPC
            const { error } = await supabase.rpc('refresh_customer_tier_metrics');
            
            if (error) {
                console.warn('⚠️ Could not refresh materialized view:', error);
                // Don't throw error, continue with existing data
            } else {
                console.log('✅ Customer tier metrics refreshed');
            }
            
        } catch (error) {
            console.warn('⚠️ Materialized view refresh failed:', error);
            // Continue execution with existing data
        }
    }

    /**
     * Validate plan structure
     */
    validatePlanStructure(plan) {
        if (!plan.daily_plan || !Array.isArray(plan.daily_plan)) {
            throw new Error('Invalid plan structure: missing daily_plan array');
        }
        
        if (!plan.plan_summary || typeof plan.plan_summary !== 'object') {
            throw new Error('Invalid plan structure: missing plan_summary object');
        }

        // Validate each visit in daily_plan
        plan.daily_plan.forEach((visit, index) => {
            if (!visit.time_slot || !visit.customer_name) {
                throw new Error(`Invalid visit structure at index ${index}`);
            }
        });
    }

    /**
     * Save generated tour plan to database
     */
    async saveTourPlan(mrName, date, plan) {
        try {
            const { error } = await supabase
                .from('ai_tour_plans')
                .upsert({
                    mr_name: mrName,
                    plan_date: date,
                    plan_json: plan,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    plan_version: 'materialized_view_v1'
                }, {
                    onConflict: 'mr_name,plan_date'
                });

            if (error) {
                console.error('❌ Error saving tour plan:', error);
                throw error;
            }

            console.log(`✅ Tour plan saved for ${mrName} on ${date}`);

        } catch (error) {
            console.error('❌ Failed to save tour plan:', error);
            // Don't throw error here, as the plan was generated successfully
        }
    }

    /**
     * Get saved tour plans for MR
     */
    async getSavedTourPlans(mrName, startDate, endDate) {
        try {
            const { data, error } = await supabase
                .from('ai_tour_plans')
                .select('*')
                .eq('mr_name', mrName)
                .gte('plan_date', startDate)
                .lte('plan_date', endDate)
                .order('plan_date', { ascending: true });

            if (error) {
                console.error('❌ Error fetching saved plans:', error);
                return [];
            }

            return data || [];

        } catch (error) {
            console.error('❌ Failed to fetch saved plans:', error);
            return [];
        }
    }

    /**
     * Utility: Get date N days ago
     */
    getDateDaysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ AI Tour Plan cache cleared');
    }
}

// Export singleton instance
export const aiTourPlanGenerator = new AITourPlanGenerator();
export default AITourPlanGenerator;
