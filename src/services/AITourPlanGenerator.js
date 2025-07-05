// src/services/AITourPlanGenerator.js
import { supabase } from '../supabaseClient';

class AITourPlanGenerator {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
        this.openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY;
        this.requestCount = 0;
        this.successCount = 0;
        this.errorCount = 0;
    }

    async getTerritoryContext(mrName) {
        const startTime = Date.now();
        const cacheKey = `territory_context_${mrName}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            console.log('📋 Using cached territory context');
            return cached.data;
        }

        try {
            console.log(`🔍 Fetching territory context for MR: ${mrName}`);
            this.requestCount++;
            
            // Get customers from pre-calculated tier system
            let customers = [];
            
            // Try RPC function first
            const rpcResult = await supabase.rpc('get_mr_customers_for_ai', { p_mr_name: mrName });
            
            if (rpcResult.error) {
                console.warn('⚠️ RPC failed, using direct query:', rpcResult.error.message);
                
                // Fallback to direct table query
                const directResult = await supabase
                    .from('customers')
                    .select('customer_code, customer_name, customer_type, territory, tier_score, tier_level, recommended_frequency, recommended_visit_duration, days_since_last_visit, conversion_rate_90d, total_sales_90d, score_breakdown')
                    .eq('assigned_mr', mrName)
                    .eq('is_active', true)
                    .not('tier_score', 'is', null)
                    .order('tier_score', { ascending: false })
                    .limit(100);
                
                if (directResult.error) {
                    this.errorCount++;
                    throw new Error('Failed to fetch customer data: ' + directResult.error.message);
                }
                
                customers = directResult.data || [];
                
                // Add urgency scores for direct query results
                customers = customers.map(customer => {
                    const urgencyScore = this.calculateUrgencyScore(
                        customer.tier_score || 0,
                        0,
                        customer.days_since_last_visit || 0
                    );
                    return Object.assign({}, customer, { urgency_score: urgencyScore });
                });
            } else {
                customers = rpcResult.data || [];
            }

            if (!customers || customers.length === 0) {
                console.warn('⚠️ No customers found for MR:', mrName);
                return {
                    customers: [],
                    performance: this.getDefaultPerformanceMetrics(),
                    territories: [],
                    context_meta: {
                        fetch_time_ms: Date.now() - startTime,
                        data_sources: ['customers_table_empty'],
                        mr_name: mrName,
                        total_customers: 0
                    }
                };
            }

            console.log(`✅ Loaded ${customers.length} customers with pre-calculated tiers`);

            // Get performance data
            let performance = [];
            const performanceResult = await supabase
                .from('mr_visits')
                .select('"amountOfSale", "visitTime", "dcrDate"')
                .eq('empName', mrName)
                .gte('dcrDate', this.getDateDaysAgo(30))
                .not('visitTime', 'is', null)
                .limit(200);
            
            if (!performanceResult.error && performanceResult.data) {
                performance = performanceResult.data;
            }

            const performanceMetrics = this.calculatePerformanceMetrics(performance);

            // Get territory data
            let territories = [];
            const territoryResult = await supabase
                .from('mr_visits')
                .select('"visitedArea", "amountOfSale", "areaName"')
                .eq('empName', mrName)
                .gte('dcrDate', this.getDateDaysAgo(30))
                .or('"visitedArea".not.is.null,"areaName".not.is.null')
                .limit(300);
            
            if (!territoryResult.error && territoryResult.data) {
                territories = territoryResult.data;
            }

            const territoryMetrics = this.processTerritoryData(territories);

            const context = {
                customers: customers,
                performance: performanceMetrics,
                territories: territoryMetrics,
                context_meta: {
                    fetch_time_ms: Date.now() - startTime,
                    data_sources: ['customers_pre_calculated', 'mr_visits'],
                    mr_name: mrName,
                    total_customers: customers.length
                }
            };

            // Cache results
            this.cache.set(cacheKey, {
                data: context,
                timestamp: Date.now(),
                fetch_duration: Date.now() - startTime
            });

            this.successCount++;
            console.log(`✅ Territory context loaded: ${customers.length} customers in ${Date.now() - startTime}ms`);
            return context;

        } catch (error) {
            this.errorCount++;
            console.error('❌ Error fetching territory context:', error);
            throw new Error('Territory context fetch failed: ' + error.message);
        }
    }

    calculateUrgencyScore(tierScore, churnRisk, daysSinceVisit) {
        let urgency = (tierScore || 0) * 0.6;
        urgency += (churnRisk || 0) * 30;
        
        if (daysSinceVisit > 60) urgency += 20;
        else if (daysSinceVisit > 45) urgency += 15;
        else if (daysSinceVisit > 30) urgency += 10;
        else if (daysSinceVisit > 14) urgency += 5;
        
        return Math.min(Math.max(urgency, 10), 100);
    }

    calculatePerformanceMetrics(performance) {
        if (!performance || performance.length === 0) {
            return this.getDefaultPerformanceMetrics();
        }

        const totalVisits = performance.length;
        const totalSales = performance.reduce((sum, visit) => sum + (parseFloat(visit.amountOfSale) || 0), 0);
        const convertingVisits = performance.filter(visit => (parseFloat(visit.amountOfSale) || 0) > 0).length;
        
        // Calculate quality based on visit duration
        const avgQuality = performance.reduce((sum, visit) => {
            const visitTime = visit.visitTime || '00:30:00';
            const parts = visitTime.split(':');
            const totalMinutes = (parseInt(parts[0]) * 60) + parseInt(parts[1]);
            const qualityScore = Math.min(Math.max((totalMinutes / 30) * 50, 20), 90);
            return sum + qualityScore;
        }, 0) / totalVisits;

        return {
            avg_quality: Math.round(avgQuality * 10) / 10,
            total_visits: totalVisits,
            total_sales: Math.round(totalSales),
            converting_visits: convertingVisits,
            conversion_rate: Math.round((convertingVisits / totalVisits) * 100 * 10) / 10,
            avg_sales_per_visit: totalVisits > 0 ? Math.round(totalSales / totalVisits) : 0,
            quality_grade: this.getQualityGrade(avgQuality)
        };
    }

    getDefaultPerformanceMetrics() {
        return {
            avg_quality: 0,
            total_visits: 0,
            total_sales: 0,
            converting_visits: 0,
            conversion_rate: 0,
            avg_sales_per_visit: 0,
            quality_grade: 'NO_DATA'
        };
    }

    getQualityGrade(score) {
        if (score >= 80) return 'EXCELLENT';
        if (score >= 60) return 'GOOD';
        if (score >= 40) return 'AVERAGE';
        if (score >= 20) return 'POOR';
        return 'VERY_POOR';
    }

    processTerritoryData(territories) {
        const territoryMap = {};
        
        territories.forEach(visit => {
            const area = visit.visitedArea || visit.areaName;
            if (!area) return;
            
            if (!territoryMap[area]) {
                territoryMap[area] = {
                    area_name: area,
                    visits: 0,
                    sales: 0,
                    converting_visits: 0
                };
            }
            
            const saleAmount = parseFloat(visit.amountOfSale) || 0;
            territoryMap[area].visits++;
            territoryMap[area].sales += saleAmount;
            
            if (saleAmount > 0) {
                territoryMap[area].converting_visits++;
            }
        });

        return Object.values(territoryMap)
            .map(territory => {
                territory.conversion_rate = territory.visits > 0 ? (territory.converting_visits / territory.visits) * 100 : 0;
                territory.avg_sale = territory.visits > 0 ? territory.sales / territory.visits : 0;
                return territory;
            })
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 15);
    }

    generateAIPrompt(mrName, context, date) {
        const customersSummary = `Total customers: ${context.customers.length}`;
        const tierSummary = {};
        
        context.customers.forEach(customer => {
            const tier = customer.tier_level || 'TIER_4_PROSPECT';
            tierSummary[tier] = (tierSummary[tier] || 0) + 1;
        });

        let tierBreakdown = '';
        Object.entries(tierSummary).forEach(([tier, count]) => {
            tierBreakdown += `- ${tier}: ${count} customers\n`;
        });

        const topCustomers = context.customers.slice(0, 15).map((customer, index) => {
            const tierScore = customer.tier_score ? customer.tier_score.toFixed(1) : 'N/A';
            const tierLevel = customer.tier_level || 'TIER_4_PROSPECT';
            const urgencyScore = customer.urgency_score ? customer.urgency_score.toFixed(1) : 'N/A';
            const daysSince = customer.days_since_last_visit || 'Unknown';
            return `${index + 1}. ${customer.customer_name} (${tierLevel}) - Score: ${tierScore}, Urgency: ${urgencyScore}, Days since visit: ${daysSince}`;
        }).join('\n');

        const prompt = `You are an AI Tour Planning Assistant for Kairali Ayurvedic products. Generate an optimal daily tour plan for ${mrName} on ${date}.

TERRITORY CONTEXT:
${customersSummary}
${tierBreakdown}

Recent Performance (Last 30 days):
- Average visit quality: ${context.performance.avg_quality || 'N/A'} (${context.performance.quality_grade || 'N/A'})
- Total visits: ${context.performance.total_visits || 0}
- Total sales: ₹${(context.performance.total_sales || 0).toLocaleString()}
- Conversion rate: ${context.performance.conversion_rate || 0}%

CUSTOMER PRIORITIES (Top 15):
${topCustomers}

CONSTRAINTS:
- Minimum 11 visits per day, Maximum 15 visits per day
- At least 40% visits should be NBD-focused (TIER_3_DEVELOPER and TIER_4_PROSPECT customers)
- Visit duration based on tier: Tier 1 (30+ min), Tier 2 (20+ min), Tier 3 (15+ min), Tier 4 (10+ min)
- Maximum travel time: 30% of working day
- Prioritize customers with high urgency scores (>75)
- Group geographically close customers
- Balance high-value retention with business development

OUTPUT FORMAT (JSON only, no markdown):
{
    "daily_plan": [
        {
            "time_slot": "09:00-09:30",
            "customer_name": "Customer Name",
            "customer_type": "Doctor/Retailer/Stockist",
            "tier_level": "TIER_1_CHAMPION",
            "visit_purpose": "Relationship building/Order generation/Sample distribution",
            "expected_duration": 30,
            "priority_reason": "High tier score/High urgency/Long overdue"
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
        "Address urgent customers",
        "Geographic optimization"
    ]
}

Generate the optimal tour plan. Return only valid JSON.`;

        return prompt;
    }

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
                            content: 'You are an expert pharmaceutical territory planning AI assistant. Always return valid JSON responses only.'
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

    async generateTourPlan(mrName, date = null) {
        const startTime = Date.now();
        
        if (!date) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            date = tomorrow.toISOString().split('T')[0];
        }

        try {
            console.log(`🤖 Generating AI tour plan for ${mrName} on ${date}`);

            if (!mrName || mrName.trim() === '') {
                return {
                    success: false,
                    error: 'MR name is required'
                };
            }

            const context = await this.getTerritoryContext(mrName);
            
            if (!context.customers || context.customers.length === 0) {
                return {
                    success: false,
                    error: `No customers found for MR "${mrName}". Please ensure customer data is available.`
                };
            }

            const prompt = this.generateAIPrompt(mrName, context, date);
            const aiResponse = await this.callOpenAI(prompt);

            let planJson;
            try {
                const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
                planJson = JSON.parse(cleanResponse);
                this.validatePlanStructure(planJson);
            } catch (parseError) {
                console.error('❌ Failed to parse AI response:', parseError);
                return {
                    success: false,
                    error: 'AI response format error. Please try again.',
                    raw_response: aiResponse.substring(0, 500)
                };
            }

            await this.saveTourPlan(mrName, date, planJson);

            return {
                success: true,
                plan: planJson,
                generated_at: new Date().toISOString(),
                generation_time_ms: Date.now() - startTime,
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
                error: error.message,
                generation_time_ms: Date.now() - startTime
            };
        }
    }

    validatePlanStructure(plan) {
        if (!plan || typeof plan !== 'object') {
            throw new Error('Plan must be a valid object');
        }

        if (!plan.daily_plan || !Array.isArray(plan.daily_plan)) {
            throw new Error('Plan must contain a daily_plan array');
        }
        
        if (!plan.plan_summary || typeof plan.plan_summary !== 'object') {
            throw new Error('Plan must contain a plan_summary object');
        }

        plan.daily_plan.forEach((visit, index) => {
            if (!visit.time_slot || !visit.customer_name) {
                throw new Error(`Visit ${index + 1}: missing required fields`);
            }
        });
    }

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
            } else {
                console.log(`✅ Tour plan saved for ${mrName} on ${date}`);
            }
        } catch (error) {
            console.error('❌ Failed to save tour plan:', error);
        }
    }

    async getSavedTourPlans(mrName, startDate, endDate) {
        try {
            const { data, error } = await supabase
                .from('ai_tour_plans')
                .select('*')
                .eq('mr_name', mrName)
                .gte('plan_date', startDate)
                .lte('plan_date', endDate)
                .order('plan_date', { ascending: false });

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

    getServiceStats() {
        return {
            requests: {
                total: this.requestCount,
                successful: this.successCount,
                failed: this.errorCount,
                success_rate: this.requestCount > 0 ? (this.successCount / this.requestCount) * 100 : 0
            },
            cache: {
                items: this.cache.size,
                expiry_minutes: this.cacheExpiry / (60 * 1000)
            },
            openai: {
                configured: !!this.openaiApiKey
            }
        };
    }

    getDateDaysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
    }

    clearCache(pattern = null) {
        if (!pattern) {
            this.cache.clear();
            console.log('🗑️ All cache cleared');
        } else {
            let cleared = 0;
            for (const [key] of this.cache) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                    cleared++;
                }
            }
            console.log(`🗑️ Cleared ${cleared} cache entries`);
        }
    }

    getCacheStats() {
        return {
            total_entries: this.cache.size,
            cache_expiry_minutes: this.cacheExpiry / (60 * 1000)
        };
    }
}

export const aiTourPlanGenerator = new AITourPlanGenerator();
export default AITourPlanGenerator;
