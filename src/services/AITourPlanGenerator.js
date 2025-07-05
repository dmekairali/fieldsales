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

    /**
     * Get comprehensive territory context for AI planning
     */
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
            
            // OPTIMIZED: Get customers directly and calculate tiers in JavaScript
            // This avoids the slow CROSS JOIN LATERAL in customer_tiers view
            const { data: customers, error: customersError } = await supabase
                .from('customer_master')
                .select(`
                    customer_code,
                    customer_name,
                    customer_type,
                    territory,
                    area_name,
                    city_name,
                    total_visits,
                    total_orders,
                    total_order_value,
                    avg_order_value,
                    days_since_last_visit,
                    days_since_last_order,
                    total_priority_score,
                    churn_risk_score,
                    order_probability,
                    predicted_order_value
                `)
                .eq('mr_name', mrName)
                .eq('status', 'ACTIVE')
                .not('total_priority_score', 'is', null)
                .order('total_priority_score', { ascending: false })
                .limit(100); // Reasonable limit for performance

            if (customersError) {
                console.error('❌ Error fetching customers:', customersError);
                this.errorCount++;
                throw new Error(`Customer data fetch failed: ${customersError.message || 'Unknown database error'}`);
            }

            if (!customers || customers.length === 0) {
                console.warn('⚠️ No customers found for MR:', mrName);
                return {
                    customers: [],
                    performance: this.getDefaultPerformanceMetrics(),
                    territories: [],
                    context_meta: {
                        fetch_time_ms: Date.now() - startTime,
                        data_sources: ['customer_master_direct'],
                        mr_name: mrName,
                        total_customers: 0,
                        optimization: 'direct_query_no_view'
                    }
                };
            }

            // Calculate tiers in JavaScript (fast, no database computation)
            const enrichedCustomers = customers.map(customer => {
                const priorityScore = customer.total_priority_score || 0;
                const churnRisk = customer.churn_risk_score || 0;
                const daysSinceVisit = customer.days_since_last_visit || 0;
                
                // Calculate tier based on priority score
                let tierLevel = 'TIER_4_PROSPECT';
                if (priorityScore >= 80) tierLevel = 'TIER_1_CHAMPION';
                else if (priorityScore >= 60) tierLevel = 'TIER_2_PERFORMER';
                else if (priorityScore >= 40) tierLevel = 'TIER_3_DEVELOPER';
                
                // Calculate urgency score
                let urgencyScore = priorityScore * 0.6;
                urgencyScore += churnRisk * 30;
                if (daysSinceVisit > 60) urgencyScore += 20;
                else if (daysSinceVisit > 45) urgencyScore += 15;
                else if (daysSinceVisit > 30) urgencyScore += 10;
                else if (daysSinceVisit > 14) urgencyScore += 5;
                urgencyScore = Math.min(Math.max(urgencyScore, 10), 100);
                
                return {
                    customer_code: customer.customer_code,
                    customer_name: customer.customer_name,
                    customer_type: customer.customer_type,
                    territory: customer.territory,
                    tier_score: priorityScore,
                    tier_level: tierLevel,
                    recommended_frequency: this.getTierFrequency(tierLevel),
                    urgency_score: urgencyScore,
                    score_breakdown: {
                        total_score: priorityScore,
                        tier_level: tierLevel,
                        direct_sales_score: Math.min((customer.total_order_value || 0) / 20000 * 100, 100),
                        churn_risk: churnRisk,
                        days_since_visit: daysSinceVisit
                    }
                };
            });

            console.log(`✅ Processed ${enrichedCustomers.length} customers with tiers in JavaScript`);

            // Get performance data (keep this part)
            let performance = null;
            let performanceSource = 'none';
            try {
                const performanceResult = await supabase
                    .from('mr_visits')
                    .select('"amountOfSale", "visitTime"')
                    .eq('empName', mrName)
                    .gte('dcrDate', this.getDateDaysAgo(30))
                    .not('visitTime', 'is', null)
                    .limit(100);
                
                if (performanceResult.data) {
                    performance = performanceResult.data;
                    performanceSource = 'mr_visits';
                    console.log(`📊 Performance data loaded: ${performance.length} records`);
                }
            } catch (performanceError) {
                console.warn('⚠️ Performance data error:', performanceError);
                performanceSource = 'error';
            }

            const performanceMetrics = this.calculatePerformanceMetrics(performance || [], performanceSource);

            // Get territory data
            let territories = null;
            let territorySource = 'none';
            try {
                const territoriesResult = await supabase
                    .from('mr_visits')
                    .select('"visitedArea", "amountOfSale", "areaName"')
                    .eq('empName', mrName)
                    .gte('dcrDate', this.getDateDaysAgo(30))
                    .or('"visitedArea".not.is.null,"areaName".not.is.null')
                    .limit(200);
                
                if (territoriesResult.data) {
                    territories = territoriesResult.data;
                    territorySource = 'mr_visits';
                    console.log(`🗺️ Territory data loaded: ${territories.length} records`);
                }
            } catch (territoriesError) {
                console.warn('⚠️ Territory data error:', territoriesError);
                territorySource = 'error';
            }

            const territoryMetrics = this.processTerritoryData(territories || []);

            const context = {
                customers: enrichedCustomers,
                performance: performanceMetrics,
                territories: territoryMetrics,
                context_meta: {
                    fetch_time_ms: Date.now() - startTime,
                    data_sources: ['customer_master_direct', performanceSource, territorySource],
                    mr_name: mrName,
                    total_customers: enrichedCustomers.length,
                    performance_records: performance?.length || 0,
                    territory_records: territories?.length || 0,
                    cache_key: cacheKey,
                    optimization: 'javascript_tier_calculation'
                }
            };

            // Cache results
            this.cache.set(cacheKey, {
                data: context,
                timestamp: Date.now(),
                fetch_duration: Date.now() - startTime
            });

            this.successCount++;
            console.log(`✅ Territory context loaded: ${enrichedCustomers.length} customers in ${Date.now() - startTime}ms`);
            return context;

        } catch (error) {
            this.errorCount++;
            console.error('❌ Error fetching territory context:', error);
            throw new Error(`Territory context fetch failed: ${error.message}`);
        }
    }

    /**
     * Get tier frequency recommendation
     */
    getTierFrequency(tierLevel) {
        switch (tierLevel) {
            case 'TIER_1_CHAMPION': return 'Weekly (4-5 visits/month)';
            case 'TIER_2_PERFORMER': return 'Bi-weekly (2-3 visits/month)';
            case 'TIER_3_DEVELOPER': return 'Monthly (1-2 visits/month)';
            case 'TIER_4_PROSPECT': return 'Quarterly';
            default: return 'Monthly';
        }
    }

            // Get recent performance data with fallback handling
            let performance = null;
            let performanceSource = 'none';
            try {
                const performanceResult = await supabase
                    .from('real_time_visit_quality')
                    .select('quality_score, "amountOfSale"')
                    .eq('empName', mrName)
                    .gte('dcrDate', this.getDateDaysAgo(30))
                    .not('quality_score', 'is', null);
                
                if (performanceResult.data && performanceResult.data.length > 0) {
                    performance = performanceResult.data;
                    performanceSource = 'real_time_visit_quality';
                    console.log(`📊 Performance data loaded: ${performance.length} records`);
                } else {
                    console.warn('⚠️ No performance data in real_time_visit_quality, trying mr_visits');
                    
                    // Fallback to mr_visits for performance data
                    const fallbackResult = await supabase
                        .from('mr_visits')
                        .select('"amountOfSale", "visitTime"')
                        .eq('empName', mrName)
                        .gte('dcrDate', this.getDateDaysAgo(30))
                        .not('visitTime', 'is', null)
                        .limit(100);
                    
                    if (fallbackResult.data) {
                        performance = fallbackResult.data;
                        performanceSource = 'mr_visits_fallback';
                        console.log(`📊 Fallback performance data loaded: ${performance.length} records`);
                    }
                }
            } catch (performanceError) {
                console.warn('⚠️ Performance data error:', performanceError);
                performanceSource = 'error';
            }

            // Calculate performance metrics with source tracking
            const performanceMetrics = this.calculatePerformanceMetrics(performance || [], performanceSource);

            // Get territory efficiency data with comprehensive error handling
            let territories = null;
            let territorySource = 'none';
            try {
                const territoriesResult = await supabase
                    .from('mr_visits')
                    .select('"visitedArea", "amountOfSale", "areaName"')
                    .eq('empName', mrName)
                    .gte('dcrDate', this.getDateDaysAgo(30))
                    .or('"visitedArea".not.is.null,"areaName".not.is.null');
                
                if (territoriesResult.data) {
                    territories = territoriesResult.data;
                    territorySource = 'mr_visits';
                    console.log(`🗺️ Territory data loaded: ${territories.length} records`);
                }
            } catch (territoriesError) {
                console.warn('⚠️ Territory data error:', territoriesError);
                territorySource = 'error';
            }

            // Process territory data with enhanced metrics
            const territoryMetrics = this.processTerritoryData(territories || []);

            const context = {
                customers: customers || [],
                performance: performanceMetrics,
                territories: territoryMetrics,
                context_meta: {
                    fetch_time_ms: Date.now() - startTime,
                    data_sources: ['customer_tiers', performanceSource, territorySource],
                    mr_name: mrName,
                    total_customers: customers?.length || 0,
                    performance_records: performance?.length || 0,
                    territory_records: territories?.length || 0,
                    cache_key: cacheKey
                }
            };

            // Cache results with metadata
            this.cache.set(cacheKey, {
                data: context,
                timestamp: Date.now(),
                fetch_duration: Date.now() - startTime
            });

            this.successCount++;
            console.log(`✅ Territory context loaded: ${customers?.length || 0} customers in ${Date.now() - startTime}ms`);
            return context;

        } catch (error) {
            this.errorCount++;
            console.error('❌ Error fetching territory context:', error);
            throw new Error(`Territory context fetch failed: ${error.message}`);
        }
    }

    /**
     * Calculate performance metrics from raw data with source awareness
     */
    calculatePerformanceMetrics(performance, source = 'unknown') {
        if (!performance || performance.length === 0) {
            return this.getDefaultPerformanceMetrics(source);
        }

        const totalVisits = performance.length;
        const totalSales = performance.reduce((sum, visit) => sum + (parseFloat(visit.amountOfSale) || 0), 0);
        const convertingVisits = performance.filter(visit => (parseFloat(visit.amountOfSale) || 0) > 0).length;
        
        let avgQuality = 0;
        if (source === 'real_time_visit_quality') {
            avgQuality = performance.reduce((sum, visit) => sum + (visit.quality_score || 0), 0) / totalVisits;
        } else if (source === 'mr_visits_fallback') {
            // Calculate quality based on visit duration
            avgQuality = performance.reduce((sum, visit) => {
                const visitTime = visit.visitTime || '00:30:00';
                const [hours, minutes] = visitTime.split(':').map(Number);
                const totalMinutes = (hours * 60) + minutes;
                const qualityScore = Math.min(Math.max((totalMinutes / 30) * 50, 20), 90);
                return sum + qualityScore;
            }, 0) / totalVisits;
        } else {
            avgQuality = 50; // Default moderate quality
        }

        const conversionRate = totalVisits > 0 ? (convertingVisits / totalVisits) * 100 : 0;

        return {
            avg_quality: Math.round(avgQuality * 10) / 10,
            total_visits: totalVisits,
            total_sales: Math.round(totalSales),
            converting_visits: convertingVisits,
            conversion_rate: Math.round(conversionRate * 10) / 10,
            data_source: source,
            avg_sales_per_visit: totalVisits > 0 ? Math.round(totalSales / totalVisits) : 0,
            quality_grade: this.getQualityGrade(avgQuality)
        };
    }

    /**
     * Get default performance metrics when no data available
     */
    getDefaultPerformanceMetrics(source = 'none') {
        return {
            avg_quality: 0,
            total_visits: 0,
            total_sales: 0,
            converting_visits: 0,
            conversion_rate: 0,
            data_source: source,
            avg_sales_per_visit: 0,
            quality_grade: 'NO_DATA'
        };
    }

    /**
     * Get quality grade from score
     */
    getQualityGrade(score) {
        if (score >= 80) return 'EXCELLENT';
        if (score >= 60) return 'GOOD';
        if (score >= 40) return 'AVERAGE';
        if (score >= 20) return 'POOR';
        return 'VERY_POOR';
    }

    /**
     * Process territory data for efficiency metrics with enhanced analysis
     */
    processTerritoryData(territories) {
        const territoryMap = {};
        
        territories.forEach(visit => {
            // Use visitedArea or areaName as fallback
            const area = visit.visitedArea || visit.areaName;
            if (!area) return;
            
            if (!territoryMap[area]) {
                territoryMap[area] = {
                    area_name: area,
                    visits: 0,
                    sales: 0,
                    converting_visits: 0,
                    max_sale: 0,
                    avg_sale: 0
                };
            }
            
            const saleAmount = parseFloat(visit.amountOfSale) || 0;
            territoryMap[area].visits++;
            territoryMap[area].sales += saleAmount;
            
            if (saleAmount > 0) {
                territoryMap[area].converting_visits++;
                territoryMap[area].max_sale = Math.max(territoryMap[area].max_sale, saleAmount);
            }
        });

        // Calculate averages and efficiency metrics
        const processedTerritories = Object.values(territoryMap).map(territory => {
            territory.avg_sale = territory.visits > 0 ? territory.sales / territory.visits : 0;
            territory.conversion_rate = territory.visits > 0 ? (territory.converting_visits / territory.visits) * 100 : 0;
            territory.efficiency_score = territory.conversion_rate * (territory.avg_sale / 1000);
            return territory;
        });

        return processedTerritories
            .sort((a, b) => b.efficiency_score - a.efficiency_score)
            .slice(0, 15); // Top 15 areas
    }

    /**
     * Generate comprehensive AI prompt for tour planning
     */
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
            const tierScore = customer.tier_score?.toFixed(1) || 'N/A';
            const tierLevel = customer.tier_level || 'TIER_4_PROSPECT';
            const urgencyScore = customer.urgency_score?.toFixed(1) || 'N/A';
            const daysSince = customer.days_since_last_visit || 'Unknown';
            return `${index + 1}. ${customer.customer_name} (${tierLevel}) - Score: ${tierScore}, Urgency: ${urgencyScore}, Days since visit: ${daysSince}`;
        }).join('\n');

        // Territory insights from pre-calculated data
        const territoryInsights = context.customers
            .filter(c => c.territory)
            .reduce((acc, customer) => {
                const territory = customer.territory;
                if (!acc[territory]) {
                    acc[territory] = { count: 0, totalScore: 0, totalSales: 0 };
                }
                acc[territory].count++;
                acc[territory].totalScore += customer.tier_score || 0;
                acc[territory].totalSales += customer.total_sales_90d || 0;
                return acc;
            }, {});

        const topTerritories = Object.entries(territoryInsights)
            .map(([territory, data]) => ({
                territory,
                ...data,
                avgScore: data.totalScore / data.count
            }))
            .sort((a, b) => b.avgScore - a.avgScore)
            .slice(0, 5)
            .map(t => `${t.territory}: ${t.count} customers, Avg Score: ${t.avgScore.toFixed(1)}, Total Sales: ₹${t.totalSales.toLocaleString()}`)
            .join('\n');

        // Enhanced performance context
        const performanceContext = `
Recent Performance (Last 30 days):
- Average visit quality: ${context.performance.avg_quality?.toFixed(1) || 'N/A'} (${context.performance.quality_grade || 'N/A'})
- Total visits: ${context.performance.total_visits || 0}
- Total sales: ₹${context.performance.total_sales?.toLocaleString() || 0}
- Conversion rate: ${context.performance.conversion_rate?.toFixed(1) || 0}%
- Average sales per visit: ₹${context.performance.avg_sales_per_visit || 0}

Tier-Based Performance:
- Average tier score: ${(context.customers.reduce((sum, c) => sum + (c.tier_score || 0), 0) / context.customers.length).toFixed(1)}
- High-value customers (Tier 1+2): ${(tierSummary['TIER_1_CHAMPION'] || 0) + (tierSummary['TIER_2_PERFORMER'] || 0)}
- Development opportunities (Tier 3+4): ${(tierSummary['TIER_3_DEVELOPER'] || 0) + (tierSummary['TIER_4_PROSPECT'] || 0)}`;

        const prompt = `You are an AI Tour Planning Assistant for Kairali Ayurvedic products. Generate an optimal daily tour plan for ${mrName} on ${date}.

TERRITORY CONTEXT:
${customersSummary}
${tierBreakdown}

${performanceContext}

TOP PERFORMING TERRITORIES:
${topTerritories || 'No territory data available'}

CUSTOMER PRIORITIES (Top 15 with Intelligence):
${topCustomers}

ADVANCED CONSTRAINTS & INTELLIGENCE:
- Minimum 11 visits per day, Maximum 15 visits per day
- At least 40% visits should be NBD-focused (TIER_3_DEVELOPER and TIER_4_PROSPECT customers)
- Visit duration based on tier: Tier 1 (30+ min), Tier 2 (20+ min), Tier 3 (15+ min), Tier 4 (10+ min)
- Maximum travel time: 30% of working day
- Prioritize customers with high urgency scores (>75)
- Prioritize customers not visited in 30+ days
- Group geographically close customers (same territory/area)
- Balance high-value retention (Tier 1+2) with business development (Tier 3+4)
- Consider conversion rates and sales potential from historical data

TIER-BASED VISIT STRATEGY:
- TIER_1_CHAMPION: Relationship maintenance, upselling, retention focus
- TIER_2_PERFORMER: Order generation, loyalty building, growth opportunities  
- TIER_3_DEVELOPER: Development focus, education, sample distribution, conversion
- TIER_4_PROSPECT: New business development, introduction, market penetration

OUTPUT FORMAT (JSON only, no markdown):
{
    "daily_plan": [
        {
            "time_slot": "09:00-09:30",
            "customer_name": "Customer Name",
            "customer_type": "Doctor/Retailer/Stockist",
            "tier_level": "TIER_1_CHAMPION",
            "visit_purpose": "Relationship building/Order generation/Sample distribution/Market development",
            "expected_duration": 30,
            "priority_reason": "High tier score/High urgency/Long overdue/New business opportunity",
            "expected_outcome": "Order/Relationship/Education/Introduction"
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
        "route_efficiency": "High",
        "avg_tier_score": 65.5,
        "high_urgency_visits": 4
    },
    "key_objectives": [
        "Focus on high-value tier 1 customers for retention",
        "Address high urgency customers to prevent churn", 
        "Develop tier 3 customers for growth",
        "Penetrate new markets with tier 4 prospects",
        "Geographic optimization for efficiency"
    ]
}

Generate the optimal tour plan considering all constraints, tier intelligence, and objectives. Return only valid JSON.`;

        return prompt;
    }

    /**
     * Call OpenAI API with enhanced error handling and retry logic
     */
    async callOpenAI(prompt, retryCount = 0) {
        const maxRetries = 2;
        
        if (!this.openaiApiKey) {
            throw new Error('OpenAI API key not configured. Please set REACT_APP_OPENAI_API_KEY environment variable.');
        }

        try {
            console.log(`🤖 Calling OpenAI API (attempt ${retryCount + 1}/${maxRetries + 1})`);
            
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
                const errorText = await response.text();
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error?.message || errorMessage;
                } catch (parseError) {
                    errorMessage += ` - ${errorText}`;
                }
                
                // Retry on certain errors
                if (response.status === 429 || response.status >= 500) {
                    if (retryCount < maxRetries) {
                        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                        console.log(`⏳ Retrying OpenAI call in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return this.callOpenAI(prompt, retryCount + 1);
                    }
                }
                
                throw new Error(`OpenAI API Error: ${errorMessage}`);
            }

            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid OpenAI API response structure');
            }
            
            console.log('✅ OpenAI API call successful');
            return data.choices[0].message.content;

        } catch (error) {
            if (retryCount < maxRetries && (error.name === 'TypeError' || error.message.includes('fetch'))) {
                console.log(`⏳ Network error, retrying in ${1000 * (retryCount + 1)}ms...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                return this.callOpenAI(prompt, retryCount + 1);
            }
            
            console.error('❌ OpenAI API call failed:', error);
            throw error;
        }
    }

    /**
     * Generate AI-powered tour plan with comprehensive error handling
     */
    async generateTourPlan(mrName, date = null) {
        const startTime = Date.now();
        
        if (!date) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            date = tomorrow.toISOString().split('T')[0];
        }

        try {
            console.log(`🤖 Generating AI tour plan for ${mrName} on ${date}`);

            // Validate inputs
            if (!mrName || mrName.trim() === '') {
                return {
                    success: false,
                    error: 'MR name is required and cannot be empty.'
                };
            }

            // Get territory context
            const context = await this.getTerritoryContext(mrName);
            
            if (!context.customers || context.customers.length === 0) {
                return {
                    success: false,
                    error: `No customers found for MR "${mrName}". Please ensure customer data is available and the MR name is correct.`,
                    context_meta: context.context_meta
                };
            }

            // Generate AI prompt
            const prompt = this.generateAIPrompt(mrName, context, date);
            console.log(`📝 Generated prompt (${prompt.length} characters)`);

            // Call OpenAI API
            const aiResponse = await this.callOpenAI(prompt);

            // Parse and validate JSON response
            let planJson;
            try {
                const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
                planJson = JSON.parse(cleanResponse);
                
                // Enhanced validation
                this.validatePlanStructure(planJson);
                
                // Additional business logic validation
                this.validateBusinessRules(planJson, context);
                
                console.log('✅ AI response parsed and validated successfully');

            } catch (parseError) {
                console.error('❌ Failed to parse AI response:', parseError);
                console.error('Raw AI response:', aiResponse);
                
                return {
                    success: false,
                    error: 'AI response format error. The AI returned invalid JSON. Please try again.',
                    raw_response: aiResponse.substring(0, 500) + '...', // Truncate for security
                    parse_error: parseError.message
                };
            }

            // Save to database
            await this.saveTourPlan(mrName, date, planJson);

            const generationTime = Date.now() - startTime;
            console.log(`✅ Tour plan generated successfully in ${generationTime}ms`);

            return {
                success: true,
                plan: planJson,
                generated_at: new Date().toISOString(),
                generation_time_ms: generationTime,
                context_summary: {
                    total_customers: context.customers.length,
                    performance_score: context.performance.avg_quality,
                    conversion_rate: context.performance.conversion_rate,
                    data_sources: context.context_meta.data_sources,
                    fetch_time_ms: context.context_meta.fetch_time_ms
                }
            };

        } catch (error) {
            const generationTime = Date.now() - startTime;
            console.error(`❌ Tour plan generation failed after ${generationTime}ms:`, error);
            
            return {
                success: false,
                error: error.message,
                generation_time_ms: generationTime,
                error_type: error.constructor.name
            };
        }
    }

    /**
     * Enhanced plan structure validation
     */
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

        if (!plan.key_objectives || !Array.isArray(plan.key_objectives)) {
            throw new Error('Plan must contain a key_objectives array');
        }

        // Validate each visit in daily_plan
        plan.daily_plan.forEach((visit, index) => {
            if (!visit.time_slot || typeof visit.time_slot !== 'string') {
                throw new Error(`Visit ${index + 1}: time_slot is required and must be a string`);
            }
            
            if (!visit.customer_name || typeof visit.customer_name !== 'string') {
                throw new Error(`Visit ${index + 1}: customer_name is required and must be a string`);
            }
            
            if (!visit.tier_level || typeof visit.tier_level !== 'string') {
                throw new Error(`Visit ${index + 1}: tier_level is required and must be a string`);
            }
        });

        // Validate plan_summary structure
        const requiredSummaryFields = ['total_customers', 'estimated_revenue', 'route_efficiency'];
        requiredSummaryFields.forEach(field => {
            if (!(field in plan.plan_summary)) {
                throw new Error(`Plan summary missing required field: ${field}`);
            }
        });
    }

    /**
     * Validate business rules
     */
    validateBusinessRules(plan, context) {
        const totalVisits = plan.daily_plan.length;
        
        // Check minimum visits
        if (totalVisits < 8) {
            console.warn(`⚠️ Plan has only ${totalVisits} visits, which is below recommended minimum of 8`);
        }
        
        // Check maximum visits
        if (totalVisits > 18) {
            console.warn(`⚠️ Plan has ${totalVisits} visits, which exceeds recommended maximum of 18`);
        }
        
        // Validate customer names exist in context
        const availableCustomers = new Set(context.customers.map(c => c.customer_name));
        const invalidCustomers = plan.daily_plan.filter(visit => 
            !availableCustomers.has(visit.customer_name)
        );
        
        if (invalidCustomers.length > 0) {
            console.warn(`⚠️ Plan includes ${invalidCustomers.length} customers not in territory context`);
        }
    }

    /**
     * Save generated tour plan to database with enhanced metadata
     */
    async saveTourPlan(mrName, date, plan) {
        try {
            const planWithMetadata = {
                ...plan,
                generated_by: 'AITourPlanGenerator',
                generation_timestamp: new Date().toISOString(),
                plan_version: '1.0'
            };

            const { error } = await supabase
                .from('ai_tour_plans')
                .upsert({
                    mr_name: mrName,
                    plan_date: date,
                    plan_json: planWithMetadata,
                    context_summary: {
                        total_customers: plan.plan_summary?.total_customers || 0,
                        estimated_revenue: plan.plan_summary?.estimated_revenue || 0,
                        route_efficiency: plan.plan_summary?.route_efficiency || 'Unknown'
                    },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'mr_name,plan_date'
                });

            if (error) {
                console.error('❌ Error saving tour plan:', error);
                throw new Error(`Database save failed: ${error.message}`);
            }

            console.log(`✅ Tour plan saved for ${mrName} on ${date}`);

        } catch (error) {
            console.error('❌ Failed to save tour plan:', error);
            // Don't throw error here as the plan was generated successfully
        }
    }

    /**
     * Get saved tour plans for MR with enhanced filtering
     */
    async getSavedTourPlans(mrName, startDate, endDate) {
        try {
            console.log(`📋 Fetching saved plans for ${mrName} between ${startDate} and ${endDate}`);
            
            const { data, error } = await supabase
                .from('ai_tour_plans')
                .select('*')
                .eq('mr_name', mrName)
                .gte('plan_date', startDate)
                .lte('plan_date', endDate)
                .order('plan_date', { ascending: false }); // Most recent first

            if (error) {
                console.error('❌ Error fetching saved plans:', error);
                return [];
            }

            console.log(`✅ Retrieved ${data?.length || 0} saved plans`);
            return data || [];

        } catch (error) {
            console.error('❌ Failed to fetch saved plans:', error);
            return [];
        }
    }

    /**
     * Get service statistics and performance metrics
     */
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
                expiry_minutes: this.cacheExpiry / (60 * 1000),
                hit_rate: 'Not tracked' // Could be enhanced to track cache hits
            },
            openai: {
                configured: !!this.openaiApiKey,
                api_key_length: this.openaiApiKey ? this.openaiApiKey.length : 0
            }
        };
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
     * Clear cache with optional selective clearing by MR name
     */
    clearCache(pattern = null) {
        if (!pattern) {
            this.cache.clear();
            console.log('🗑️ All AI Tour Plan cache cleared');
        } else {
            let cleared = 0;
            for (const [key] of this.cache) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                    cleared++;
                }
            }
            console.log(`🗑️ Cleared ${cleared} cache entries matching pattern: ${pattern}`);
        }
    }

    /**
     * Get comprehensive cache statistics
     */
    getCacheStats() {
        const entries = Array.from(this.cache.entries());
        const now = Date.now();
        
        return {
            total_entries: this.cache.size,
            cache_expiry_minutes: this.cacheExpiry / (60 * 1000),
            expired_entries: entries.filter(([_, value]) => now - value.timestamp > this.cacheExpiry).length,
            memory_usage_estimate: JSON.stringify(entries).length,
            oldest_entry: entries.length > 0 ? Math.min(...entries.map(([_, value]) => value.timestamp)) : null,
            newest_entry: entries.length > 0 ? Math.max(...entries.map(([_, value]) => value.timestamp)) : null,
            mr_specific_entries: entries.filter(([key]) => key.includes('territory_context_')).length
        };
    }

    /**
     * Initialize or refresh tier system for the application
     */
    async initializeTierSystem() {
        try {
            console.log('🚀 Initializing tier system...');
            
            // Check if system needs initialization
            const health = await this.checkSystemHealth();
            
            if (health.system_health === 'needs_tier_calculation') {
                console.log('⚙️ Tier system needs initialization, triggering global refresh...');
                
                const { data, error } = await supabase.rpc('refresh_all_customer_tiers');
                
                if (error) {
                    console.error('❌ Failed to initialize tier system:', error);
                    return {
                        success: false,
                        error: error.message,
                        recommendation: 'Run tier calculation manually in database'
                    };
                }
                
                console.log(`✅ Initialized tiers for ${data[0]?.total_updated || 0} customers`);
                
                // Clear all cache after initialization
                this.clearCache();
                
                return {
                    success: true,
                    customers_updated: data[0]?.total_updated || 0,
                    processing_time: data[0]?.processing_time,
                    message: 'Tier system initialized successfully'
                };
            } else {
                console.log('✅ Tier system already initialized and healthy');
                return {
                    success: true,
                    message: 'Tier system already initialized',
                    health: health
                };
            }
        } catch (error) {
            console.error('❌ Tier system initialization failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get diagnostic information for troubleshooting
     */
    async getDiagnostics(mrName = null) {
        try {
            const diagnostics = {
                timestamp: new Date().toISOString(),
                service_info: {
                    openai_configured: !!this.openaiApiKey,
                    cache_size: this.cache.size,
                    request_stats: this.getServiceStats()
                }
            };

            // System health check
            diagnostics.system_health = await this.checkSystemHealth();

            // MR-specific diagnostics
            if (mrName) {
                try {
                    // Test customer data fetch
                    const customerTest = await supabase.rpc('get_mr_customers_for_ai', { p_mr_name: mrName });
                    diagnostics.mr_test = {
                        mr_name: mrName,
                        customers_found: customerTest.data?.length || 0,
                        rpc_success: !customerTest.error,
                        error: customerTest.error?.message || null
                    };

                    // Get MR summary
                    const summaryTest = await supabase.rpc('get_mr_tier_summary', { p_mr_name: mrName });
                    diagnostics.mr_summary = summaryTest.data?.[0] || null;
                } catch (mrError) {
                    diagnostics.mr_test = {
                        mr_name: mrName,
                        error: mrError.message
                    };
                }
            }

            // Database connectivity test
            try {
                const dbTest = await supabase.from('customers').select('count').limit(1);
                diagnostics.database = {
                    connected: !dbTest.error,
                    error: dbTest.error?.message || null
                };
            } catch (dbError) {
                diagnostics.database = {
                    connected: false,
                    error: dbError.message
                };
            }

            return diagnostics;
        } catch (error) {
            return {
                timestamp: new Date().toISOString(),
                error: error.message,
                system_health: 'error'
            };
        }
    }
}
}

// Export singleton instance
export const aiTourPlanGenerator = new AITourPlanGenerator();
export default AITourPlanGenerator;
