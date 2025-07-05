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
            
            // Get customer tiers
            const { data: customers, error: customersError } = await supabase
                .from('customer_tiers')
                .select(`
                    customer_code,
                    customer_name,
                    customer_type,
                    territory,
                    tier_score,
                    tier_level,
                    recommended_frequency,
                    score_breakdown
                `)
                .eq('mr_name', mrName)
                .order('tier_score', { ascending: false });

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
            return context;

        } catch (error) {
            console.error('❌ Error fetching territory context:', error);
            throw error;
        }
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
     * Generate AI prompt for tour planning
     */
    generateAIPrompt(mrName, context, date) {
        const customersSummary = `Total customers: ${context.customers.length}\n`;
        const tierSummary = {};
        
        context.customers.forEach(customer => {
            const tier = customer.tier_level;
            tierSummary[tier] = (tierSummary[tier] || 0) + 1;
        });

        let tierBreakdown = '';
        Object.entries(tierSummary).forEach(([tier, count]) => {
            tierBreakdown += `- ${tier}: ${count} customers\n`;
        });

        const topCustomers = context.customers.slice(0, 15).map((customer, index) => 
            `${index + 1}. ${customer.customer_name} (${customer.tier_level}) - Score: ${customer.tier_score?.toFixed(1) || 'N/A'}`
        ).join('\n');

        const prompt = `
You are an AI Tour Planning Assistant for Kairali Ayurvedic products. Generate an optimal daily tour plan for ${mrName} on ${date}.

TERRITORY CONTEXT:
${customersSummary}
${tierBreakdown}

Recent Performance (Last 30 days):
- Average visit quality: ${context.performance.avg_quality?.toFixed(1) || 'N/A'}
- Total visits: ${context.performance.total_visits || 0}
- Total sales: ₹${context.performance.total_sales?.toLocaleString() || 0}
- Conversion rate: ${context.performance.conversion_rate?.toFixed(1) || 0}%

CUSTOMER PRIORITIES (Top 15):
${topCustomers}

CONSTRAINTS:
- Minimum 11 visits per day
- Maximum 15 visits per day  
- At least 40% visits should be NBD-focused (new customers or prospects)
- Visit duration: Tier 1 (30+ min), Tier 2 (20+ min), Tier 3 (15+ min), Tier 4 (10+ min)
- Maximum travel time: 30% of working day
- Prioritize high churn risk customers
- Group geographically close customers

OUTPUT FORMAT (JSON only, no markdown):
{
    "daily_plan": [
        {
            "time_slot": "09:00-09:30",
            "customer_name": "Customer Name",
            "customer_type": "Doctor/Retailer",
            "tier_level": "TIER_1_CHAMPION",
            "visit_purpose": "Relationship building/Order generation/Sample distribution",
            "expected_duration": 30,
            "priority_reason": "High churn risk / High value / New customer"
        }
    ],
    "plan_summary": {
        "total_customers": 12,
        "tier_1_customers": 3,
        "tier_2_customers": 4,
        "tier_3_customers": 3,
        "tier_4_customers": 2,
        "nbd_focused_visits": 5,
        "estimated_revenue": 25000,
        "route_efficiency": "High"
    },
    "key_objectives": [
        "Focus on high-value customers",
        "Address churn risks",
        "Geographic optimization"
    ]
}

Generate the optimal tour plan considering all constraints and objectives. Return only valid JSON.`;

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
                            content: 'You are an expert pharmaceutical territory planning AI assistant specializing in Ayurvedic products and Indian market dynamics. Always return valid JSON responses only.'
                        },
                        {
                            role: 'user', 
                            content: prompt
                        }
                    ],
                    max_tokens: 2000,
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
     * Generate AI-powered tour plan
     */
    async generateTourPlan(mrName, date = null) {
        if (!date) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            date = tomorrow.toISOString().split('T')[0];
        }

        try {
            console.log(`🤖 Generating AI tour plan for ${mrName} on ${date}`);

            // Get territory context
            const context = await this.getTerritoryContext(mrName);
            
            if (!context.customers || context.customers.length === 0) {
                return {
                    success: false,
                    error: 'No customers found for this MR. Please ensure customer data is available.'
                };
            }

            // Generate AI prompt
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
                    performance_score: context.performance.avg_quality,
                    conversion_rate: context.performance.conversion_rate
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
                    updated_at: new Date().toISOString()
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
