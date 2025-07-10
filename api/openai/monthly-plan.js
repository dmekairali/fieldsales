
// /api/openai/monthly-plan.js
// Simplified version - Hybrid approach for ALL customer counts

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
});

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false,
            error: 'Method not allowed. Use POST.' 
        });
    }

    try {
        console.log('🚀 API: Monthly plan generation request received');
        
        const { mrName, month, year, territoryContext, assistantId } = req.body;

        if (!mrName || !month || !year || !territoryContext || !assistantId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: mrName, month, year, territoryContext, assistantId'
            });
        }

        console.log(`🤖 API: Generating plan for ${mrName} - ${month}/${year}`);
        console.log(`📊 API: Territory context - ${territoryContext.customers.length} customers`);

        // Use hybrid approach for ALL customer counts
        const result = await generateHybridPlan(assistantId, mrName, month, year, territoryContext);

        return res.status(200).json({
            success: true,
            plan: result.plan,
            thread_id: result.thread_id,
            tokens_used: result.tokens_used,
            generation_method: 'hybrid',
            customers_processed: Object.keys(result.plan.customer_visit_frequency || {}).length,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ API: Plan generation failed:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// ===== HYBRID PLAN GENERATION =====
async function generateHybridPlan(assistantId, mrName, month, year, territoryContext) {
    console.log(`🔄 Hybrid: Generating plan for ${territoryContext.customers.length} customers`);

    // STEP 1: Generate strategic framework with AI
    const framework = await generateStrategicFramework(assistantId, mrName, month, year, territoryContext);
    
    // STEP 2: Algorithmically distribute ALL customers
    const customerPlan = distributeAllCustomers(territoryContext.customers, month, year);
    
    // STEP 3: Generate area coverage plan
    const areaPlan = generateAreaCoverage(territoryContext.customers);
    
    // STEP 4: Combine into complete plan
    const completePlan = {
        ...framework,
        customer_visit_frequency: customerPlan,
        area_coverage_plan: areaPlan
    };

    return {
        plan: completePlan,
        thread_id: framework.thread_id,
        tokens_used: framework.tokens_used
    };
}

// ===== AI STRATEGIC FRAMEWORK GENERATION =====
async function generateStrategicFramework(assistantId, mrName, month, year, territoryContext) {
    console.log('🎯 Generating strategic framework with AI');

    // Create thread for this plan
    const thread = await openai.beta.threads.create({
        metadata: {
            mr_name: mrName,
            month: month.toString(),
            year: year.toString(),
            customer_count: territoryContext.customers.length.toString()
        }
    });

    // Build lightweight prompt for framework
    const prompt = buildFrameworkPrompt(mrName, month, year, territoryContext);

    // Send message
    await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: prompt
    });

    // Run assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId,
        additional_instructions: `Generate ONLY the strategic framework. Do not include individual customer assignments - focus on weekly structure, targets, and strategy.`
    });

    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    const maxAttempts = 60;

    while ((runStatus.status === 'running' || runStatus.status === 'queued') && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        attempts++;
    }

    if (runStatus.status !== 'completed') {
        throw new Error(`Assistant run failed with status: ${runStatus.status}`);
    }

    // Get response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const response = messages.data[0].content[0].text.value;

    // Parse response
    const framework = parseFrameworkResponse(response);
    
    // Add thread info
    framework.thread_id = thread.id;
    framework.tokens_used = runStatus.usage?.total_tokens || 0;

    return framework;
}

// ===== BUILD FRAMEWORK PROMPT =====
function buildFrameworkPrompt(mrName, month, year, territoryContext) {
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[month];
    const daysInMonth = new Date(year, month, 0).getDate();

    // Tier summary
    const tierSummary = {};
    territoryContext.customers.forEach(customer => {
        const tier = customer.tier_level || 'TIER_4_PROSPECT';
        tierSummary[tier] = (tierSummary[tier] || 0) + 1;
    });

    // Area summary
    const areas = [...new Set(territoryContext.customers.map(c => c.area_name))];

    return `Generate a strategic monthly tour planning framework for ${mrName} for ${monthName} ${year}.

TERRITORY SUMMARY:
- Total customers: ${territoryContext.customers.length}
- Tier distribution: ${Object.entries(tierSummary).map(([tier, count]) => `${tier}: ${count}`).join(', ')}
- Areas to cover: ${areas.length} areas (${areas.slice(0, 10).join(', ')}${areas.length > 10 ? '...' : ''})
- Previous performance: ${territoryContext.previous_performance?.total_visits || 0} visits, ₹${territoryContext.previous_performance?.total_revenue || 0} revenue

Generate ONLY the strategic framework (no individual customer assignments):

{
    "monthly_overview": {
        "mr_name": "${mrName}",
        "month": ${month},
        "year": ${year},
        "total_working_days": ${Math.floor(daysInMonth * 6/7)},
        "total_planned_visits": ${territoryContext.customers.length * 1.2},
        "target_revenue": ${Math.max((territoryContext.previous_performance?.total_revenue || 150000) * 1.1, 160000)},
        "nbd_visits_target": ${Math.floor(territoryContext.customers.length * 0.4)},
        "tier_distribution_target": ${JSON.stringify(tierSummary)}
    },
    "weekly_plans": [
        {
            "week_number": 1,
            "start_date": "${year}-${month.toString().padStart(2, '0')}-01",
            "end_date": "${year}-${month.toString().padStart(2, '0')}-07",
            "target_visits": ${Math.floor(territoryContext.customers.length * 0.3)},
            "target_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.275)},
            "focus_areas": ["${areas[0] || 'Area1'}", "${areas[1] || 'Area2'}"],
            "priority_customers": ["Focus on TIER_2_PERFORMER", "Top TIER_3_DEVELOPER"],
            "daily_plans": [
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-01",
                    "day_of_week": "Tuesday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.05)},
                    "focus_tier": "TIER_2_PERFORMER",
                    "target_areas": ["${areas[0] || 'Area1'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.04)}
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-02",
                    "day_of_week": "Wednesday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.05)},
                    "focus_tier": "TIER_3_DEVELOPER",
                    "target_areas": ["${areas[1] || 'Area2'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.04)}
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-03",
                    "day_of_week": "Thursday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.05)},
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${areas[0] || 'Area1'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.04)}
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-04",
                    "day_of_week": "Friday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.05)},
                    "focus_tier": "TIER_3_DEVELOPER",
                    "target_areas": ["${areas[1] || 'Area2'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.04)}
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-05",
                    "day_of_week": "Saturday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.05)},
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${areas[0] || 'Area1'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.04)}
                }
            ]
        },
        {
            "week_number": 2,
            "start_date": "${year}-${month.toString().padStart(2, '0')}-08",
            "end_date": "${year}-${month.toString().padStart(2, '0')}-14",
            "target_visits": ${Math.floor(territoryContext.customers.length * 0.3)},
            "target_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.275)},
            "focus_areas": ["${areas[2] || areas[0] || 'Area3'}", "${areas[3] || areas[1] || 'Area4'}"],
            "priority_customers": ["TIER_3_DEVELOPER", "High-scoring TIER_4_PROSPECT"],
            "daily_plans": [
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-08",
                    "day_of_week": "Tuesday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.05)},
                    "focus_tier": "TIER_3_DEVELOPER",
                    "target_areas": ["${areas[2] || areas[0] || 'Area3'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.04)}
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-09",
                    "day_of_week": "Wednesday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.05)},
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${areas[3] || areas[1] || 'Area4'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.04)}
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-10",
                    "day_of_week": "Thursday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.05)},
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${areas[2] || areas[0] || 'Area3'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.04)}
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-11",
                    "day_of_week": "Friday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.05)},
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${areas[3] || areas[1] || 'Area4'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.04)}
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-12",
                    "day_of_week": "Saturday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.05)},
                    "focus_tier": "TIER_2_PERFORMER",
                    "target_areas": ["${areas[2] || areas[0] || 'Area3'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.04)}
                }
            ]
        },
        {
            "week_number": 3,
            "start_date": "${year}-${month.toString().padStart(2, '0')}-15",
            "end_date": "${year}-${month.toString().padStart(2, '0')}-21",
            "target_visits": ${Math.floor(territoryContext.customers.length * 0.25)},
            "target_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.25)},
            "focus_areas": ["${areas[4] || areas[0] || 'Area5'}", "${areas[5] || areas[1] || 'Area6'}"],
            "priority_customers": ["Medium TIER_4_PROSPECT", "Follow-up visits"],
            "daily_plans": [
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-15",
                    "day_of_week": "Tuesday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.04)},
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${areas[4] || areas[0] || 'Area5'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.035)}
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-16",
                    "day_of_week": "Wednesday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.04)},
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${areas[5] || areas[1] || 'Area6'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.035)}
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-17",
                    "day_of_week": "Thursday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.04)},
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${areas[4] || areas[0] || 'Area5'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.035)}
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-18",
                    "day_of_week": "Friday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.04)},
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${areas[5] || areas[1] || 'Area6'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.035)}
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-19",
                    "day_of_week": "Saturday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.04)},
                    "focus_tier": "TIER_3_DEVELOPER",
                    "target_areas": ["${areas[4] || areas[0] || 'Area5'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.035)}
                }
            ]
        },
        {
            "week_number": 4,
            "start_date": "${year}-${month.toString().padStart(2, '0')}-22",
            "end_date": "${year}-${month.toString().padStart(2, '0')}-28",
            "target_visits": ${Math.floor(territoryContext.customers.length * 0.25)},
            "target_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.25)},
            "focus_areas": ["${areas[6] || areas[0] || 'Area7'}", "${areas[7] || areas[1] || 'Area8'}"],
            "priority_customers": ["Remaining TIER_4_PROSPECT", "Follow-up visits"],
            "daily_plans": [
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-22",
                    "day_of_week": "Tuesday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.04)},
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${areas[6] || areas[0] || 'Area7'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.035)}
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-23",
                    "day_of_week": "Wednesday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.04)},
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${areas[7] || areas[1] || 'Area8'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.035)}
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-24",
                    "day_of_week": "Thursday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.04)},
                    "focus_tier": "TIER_2_PERFORMER",
                    "target_areas": ["${areas[6] || areas[0] || 'Area7'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.035)}
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-25",
                    "day_of_week": "Friday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.04)},
                    "focus_tier": "TIER_3_DEVELOPER",
                    "target_areas": ["${areas[7] || areas[1] || 'Area8'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.035)}
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-26",
                    "day_of_week": "Saturday",
                    "planned_visits": ${Math.floor(territoryContext.customers.length * 0.04)},
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${areas[6] || areas[0] || 'Area7'}"],
                    "estimated_revenue": ${Math.floor((territoryContext.previous_performance?.total_revenue || 160000) * 0.035)}
                }
            ]
        }
    ],
    "revision_checkpoints": [
        {
            "date": "${year}-${month.toString().padStart(2, '0')}-07",
            "week": 1,
            "review_focus": "Week 1 performance vs plan",
            "key_metrics": ["visit_completion", "revenue_achievement", "quality_scores"]
        },
        {
            "date": "${year}-${month.toString().padStart(2, '0')}-14",
            "week": 2,
            "review_focus": "Week 2 performance vs plan",
            "key_metrics": ["visit_completion", "revenue_achievement", "quality_scores"]
        },
        {
            "date": "${year}-${month.toString().padStart(2, '0')}-21",
            "week": 3,
            "review_focus": "Week 3 performance vs plan",
            "key_metrics": ["visit_completion", "revenue_achievement", "quality_scores"]
        },
        {
            "date": "${year}-${month.toString().padStart(2, '0')}-28",
            "week": 4,
            "review_focus": "Week 4 performance vs plan",
            "key_metrics": ["visit_completion", "revenue_achievement", "quality_scores"]
        }
    ],
    "risk_mitigation": {
        "weather_contingency": "Indoor customer focus during monsoon",
        "festival_adjustments": "Customer availability considerations",
        "territory_challenges": "Traffic and accessibility planning"
    }
}

Return ONLY this JSON framework. No customer assignments needed.`;
}

// ===== PARSE FRAMEWORK RESPONSE =====
function parseFrameworkResponse(response) {
    try {
        let cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
        const firstBrace = cleaned.indexOf('{');
        if (firstBrace > 0) cleaned = cleaned.substring(firstBrace);
        const lastBrace = cleaned.lastIndexOf('}');
        if (lastBrace >= 0 && lastBrace < cleaned.length - 1) {
            cleaned = cleaned.substring(0, lastBrace + 1);
        }
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('❌ Framework parsing failed:', error);
        throw new Error(`Framework parsing failed: ${error.message}`);
    }
}

// ===== ALGORITHMIC CUSTOMER DISTRIBUTION =====
function distributeAllCustomers(customers, month, year) {
    console.log(`📊 Distributing ${customers.length} customers algorithmically`);
    
    const customerPlan = {};
    
    // Sort by priority
    const sortedCustomers = customers.sort((a, b) => {
        const scoreA = calculateCustomerPriority(a);
        const scoreB = calculateCustomerPriority(b);
        return scoreB - scoreA;
    });

    // Visit frequency by tier
    const getVisitFreq = (tier) => {
        switch (tier) {
            case 'TIER_2_PERFORMER': return 3;
            case 'TIER_3_DEVELOPER': return 2; 
            case 'TIER_4_PROSPECT': return 1;
            default: return 1;
        }
    };

    // Generate dates for the month
    const monthDates = generateMonthDates(month, year);
    let dateIndex = 0;

    sortedCustomers.forEach(customer => {
        const freq = getVisitFreq(customer.tier_level);
        const dates = [];
        
        for (let i = 0; i < freq; i++) {
            if (monthDates[dateIndex]) {
                dates.push(monthDates[dateIndex]);
                dateIndex = (dateIndex + 1) % monthDates.length;
            }
        }

        customerPlan[customer.customer_name] = {
            tier: customer.tier_level || 'TIER_4_PROSPECT',
            planned_visits: freq,
            recommended_dates: dates,
            priority_reason: generatePriorityReason(customer)
        };
    });

    return customerPlan;
}

function calculateCustomerPriority(customer) {
    let score = 0;
    switch (customer.tier_level) {
        case 'TIER_2_PERFORMER': score += 100; break;
        case 'TIER_3_DEVELOPER': score += 75; break;
        case 'TIER_4_PROSPECT': score += 50; break;
    }
    score += parseFloat(customer.tier_score) || 0;
    const daysSince = parseInt(customer.days_since_last_visit) || 0;
    if (daysSince > 30) score += 20;
    return score;
}

function generatePriorityReason(customer) {
    const tier = customer.tier_level;
    const daysSince = parseInt(customer.days_since_last_visit) || 0;
    
    if (tier === 'TIER_2_PERFORMER') return 'High-value performer requiring regular attention';
    if (tier === 'TIER_3_DEVELOPER') return 'Growing customer with development potential';
    if (daysSince > 30) return 'Long overdue visit - relationship maintenance';
    return 'Territory coverage and relationship building';
}

function generateMonthDates(month, year) {
    const dates = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        
        // Skip Sundays (0)
        if (dayOfWeek !== 0) {
            dates.push(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
        }
    }
    
    return dates;
}

// ===== AREA COVERAGE GENERATION =====
function generateAreaCoverage(customers) {
    const areaCoverage = {};
    
    const customersByArea = {};
    customers.forEach(customer => {
        const area = customer.area_name;
        if (!customersByArea[area]) customersByArea[area] = [];
        customersByArea[area].push(customer);
    });

    Object.entries(customersByArea).forEach(([area, areaCustomers]) => {
        const totalVisits = areaCustomers.reduce((sum, customer) => {
            const freq = customer.tier_level === 'TIER_2_PERFORMER' ? 3 :
                        customer.tier_level === 'TIER_3_DEVELOPER' ? 2 : 1;
            return sum + freq;
        }, 0);

        areaCoverage[area] = {
            total_customers: areaCustomers.length,
            planned_visits: totalVisits,
            focus_weeks: [1, 2, 3, 4],
            efficiency_rating: areaCustomers.length >= 15 ? 'HIGH' : 
                              areaCustomers.length >= 8 ? 'MEDIUM' : 'LOW'
        };
    });

    return areaCoverage;
}
