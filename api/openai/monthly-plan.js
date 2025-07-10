// /api/openai/monthly-plan.js
// Complete OpenAI Assistant API for Monthly Tour Plan Generation

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
});

// ===== HELPER FUNCTIONS =====

/**
 * Build comprehensive prompt for OpenAI Assistant
 */
function buildPrompt(mrName, month, year, context) {
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[month];
    const daysInMonth = new Date(year, month, 0).getDate();

    // Build customer summary exactly as your template expects
    const customersSummary = `Total active customers: ${context.customers.length}`;
    
    // Build tier breakdown exactly as your template expects
    const tierSummary = {};
    context.customers.forEach(customer => {
        const tier = customer.tier_level || 'TIER_4_PROSPECT';
        tierSummary[tier] = (tierSummary[tier] || 0) + 1;
    });

    let tierBreakdown = '';
    Object.entries(tierSummary).forEach(([tier, count]) => {
        tierBreakdown += `- ${tier}: ${count} customers\n`;
    });

    // Extract all customer names for comprehensive coverage
    const allCustomers = context.customers.map(c => c.customer_name);
    const customerList = allCustomers.slice(0, 50).map((name, index) => `"${name}"`).join(', ');
    
    // Extract all area names
    const allAreas = [...new Set(context.customers.map(c => c.area_name))];
    const areaList = allAreas.slice(0, 15).map(area => `"${area}"`).join(', ');

    // Get sample names for examples (use actual customer/area names)
    const sampleCustomer1 = context.customers[0]?.customer_name || 'Sample Customer 1';
    const sampleCustomer2 = context.customers[1]?.customer_name || 'Sample Customer 2';
    const sampleArea1 = allAreas[0] || 'Sample Area 1';
    const sampleArea2 = allAreas[1] || 'Sample Area 2';

    return `You are an AI Monthly Tour Planning Assistant for Kairali Ayurvedic products. Generate a comprehensive monthly tour plan for ${mrName} for ${monthName} ${year} (${daysInMonth} days).

TERRITORY CONTEXT:
${customersSummary}
${tierBreakdown}

AVAILABLE CUSTOMERS (use these real names):
${customerList}

AVAILABLE AREAS (use these real names):
${areaList}

Previous Month Performance:
- Total visits: ${context.previous_performance?.total_visits || 0}
- Total revenue: ₹${context.previous_performance?.total_revenue?.toLocaleString() || '0'}
- Conversion rate: ${context.previous_performance?.conversion_rate?.toFixed(1) || '0'}%
- Performance grade: ${context.previous_performance?.performance_grade || 'NEW'}
- Average visits per day: ${context.previous_performance?.visits_per_day?.toFixed(1) || '0'}

Seasonal Analysis:
- Month performance trend: ${context.seasonal_patterns?.month_performance_trend || 'STABLE'}
- Seasonal factor: ${context.seasonal_patterns?.seasonal_factor || '1.0'}
- Historical average visits: ${context.seasonal_patterns?.avg_monthly_visits || '250'}
- Historical average revenue: ₹${context.seasonal_patterns?.avg_monthly_revenue?.toLocaleString() || '125,000'}

Territory Metrics:
- Total customers: ${context.territory_metrics?.total_customers || context.customers.length}
- Territory efficiency: ${context.territory_metrics?.territory_efficiency || 'MEDIUM'}
- Coverage analysis: ${context.territory_metrics?.coverage_analysis || 'BALANCED'}

MONTHLY PLANNING CONSTRAINTS:
- Plan for ${daysInMonth} days (excluding Sundays)
- Target 11-15 visits per working day
- Ensure 40% NBD focus throughout month
- Balance tier-wise customer coverage
- Optimize for seasonal factors
- Account for territory efficiency
- Plan for weekly revision cycles

CUSTOMER PRIORITIZATION:
1. TIER_2_PERFORMER: Visit 2-3 times per month
2. TIER_3_DEVELOPER: Visit 1-2 times per month
3. TIER_4_PROSPECT: Visit 1 time per month
4. High churn risk customers: Prioritize early in month
5. Area-wise clustering for efficiency

CRITICAL REQUIREMENTS:
- Generate exactly 4 weeks in weekly_plans array
- Each week must have 5-6 daily_plans (Monday-Saturday)
- Include 40+ customers in customer_visit_frequency
- Include 10+ areas in area_coverage_plan
- Use ONLY real customer names and area names provided above
- Cover all ${context.customers.length} customers across the month

OUTPUT FORMAT (JSON only):
{
    "monthly_overview": {
        "mr_name": "${mrName}",
        "month": ${month},
        "year": ${year},
        "total_working_days": ${Math.floor(daysInMonth * 6/7)},
        "total_planned_visits": 320,
        "target_revenue": 160000,
        "nbd_visits_target": 128,
        "tier_distribution_target": ${JSON.stringify(tierSummary)}
    },
    "weekly_plans": [
        {
            "week_number": 1,
            "start_date": "${year}-${month.toString().padStart(2, '0')}-01",
            "end_date": "${year}-${month.toString().padStart(2, '0')}-07",
            "target_visits": 80,
            "target_revenue": 40000,
            "focus_areas": ["${sampleArea1}", "${sampleArea2}"],
            "priority_customers": ["${sampleCustomer1}", "${sampleCustomer2}"],
            "daily_plans": [
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-01",
                    "day_of_week": "Tuesday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_2_PERFORMER",
                    "target_areas": ["${sampleArea1}"],
                    "estimated_revenue": 6500
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-02",
                    "day_of_week": "Wednesday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_3_DEVELOPER",
                    "target_areas": ["${sampleArea2}"],
                    "estimated_revenue": 6500
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-03",
                    "day_of_week": "Thursday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${sampleArea1}"],
                    "estimated_revenue": 6500
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-04",
                    "day_of_week": "Friday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_3_DEVELOPER",
                    "target_areas": ["${sampleArea2}"],
                    "estimated_revenue": 6500
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-05",
                    "day_of_week": "Saturday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${sampleArea1}"],
                    "estimated_revenue": 6500
                }
            ]
        },
        {
            "week_number": 2,
            "start_date": "${year}-${month.toString().padStart(2, '0')}-08",
            "end_date": "${year}-${month.toString().padStart(2, '0')}-14",
            "target_visits": 80,
            "target_revenue": 40000,
            "focus_areas": ["${sampleArea2}", "${allAreas[2] || sampleArea1}"],
            "priority_customers": ["${context.customers[2]?.customer_name || sampleCustomer1}", "${context.customers[3]?.customer_name || sampleCustomer2}"],
            "daily_plans": [
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-08",
                    "day_of_week": "Tuesday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_3_DEVELOPER",
                    "target_areas": ["${sampleArea2}"],
                    "estimated_revenue": 6500
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-09",
                    "day_of_week": "Wednesday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${allAreas[2] || sampleArea1}"],
                    "estimated_revenue": 6500
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-10",
                    "day_of_week": "Thursday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${sampleArea2}"],
                    "estimated_revenue": 6500
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-11",
                    "day_of_week": "Friday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${allAreas[2] || sampleArea1}"],
                    "estimated_revenue": 6500
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-12",
                    "day_of_week": "Saturday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_2_PERFORMER",
                    "target_areas": ["${sampleArea2}"],
                    "estimated_revenue": 6500
                }
            ]
        },
        {
            "week_number": 3,
            "start_date": "${year}-${month.toString().padStart(2, '0')}-15",
            "end_date": "${year}-${month.toString().padStart(2, '0')}-21",
            "target_visits": 80,
            "target_revenue": 40000,
            "focus_areas": ["${allAreas[3] || sampleArea1}", "${allAreas[4] || sampleArea2}"],
            "priority_customers": ["${context.customers[4]?.customer_name || sampleCustomer1}", "${context.customers[5]?.customer_name || sampleCustomer2}"],
            "daily_plans": [
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-15",
                    "day_of_week": "Tuesday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${allAreas[3] || sampleArea1}"],
                    "estimated_revenue": 6500
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-16",
                    "day_of_week": "Wednesday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${allAreas[4] || sampleArea2}"],
                    "estimated_revenue": 6500
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-17",
                    "day_of_week": "Thursday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${allAreas[3] || sampleArea1}"],
                    "estimated_revenue": 6500
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-18",
                    "day_of_week": "Friday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${allAreas[4] || sampleArea2}"],
                    "estimated_revenue": 6500
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-19",
                    "day_of_week": "Saturday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_3_DEVELOPER",
                    "target_areas": ["${allAreas[3] || sampleArea1}"],
                    "estimated_revenue": 6500
                }
            ]
        },
        {
            "week_number": 4,
            "start_date": "${year}-${month.toString().padStart(2, '0')}-22",
            "end_date": "${year}-${month.toString().padStart(2, '0')}-28",
            "target_visits": 80,
            "target_revenue": 40000,
            "focus_areas": ["${allAreas[5] || sampleArea1}", "${allAreas[6] || sampleArea2}"],
            "priority_customers": ["${context.customers[6]?.customer_name || sampleCustomer1}", "${context.customers[7]?.customer_name || sampleCustomer2}"],
            "daily_plans": [
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-22",
                    "day_of_week": "Tuesday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${allAreas[5] || sampleArea1}"],
                    "estimated_revenue": 6500
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-23",
                    "day_of_week": "Wednesday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${allAreas[6] || sampleArea2}"],
                    "estimated_revenue": 6500
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-24",
                    "day_of_week": "Thursday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_2_PERFORMER",
                    "target_areas": ["${allAreas[5] || sampleArea1}"],
                    "estimated_revenue": 6500
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-25",
                    "day_of_week": "Friday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_3_DEVELOPER",
                    "target_areas": ["${allAreas[6] || sampleArea2}"],
                    "estimated_revenue": 6500
                },
                {
                    "date": "${year}-${month.toString().padStart(2, '0')}-26",
                    "day_of_week": "Saturday",
                    "planned_visits": 13,
                    "focus_tier": "TIER_4_PROSPECT",
                    "target_areas": ["${allAreas[5] || sampleArea1}"],
                    "estimated_revenue": 6500
                }
            ]
        }
    ],
    "customer_visit_frequency": {
        "${sampleCustomer1}": {
            "tier": "TIER_2_PERFORMER",
            "planned_visits": 2,
            "recommended_dates": ["${year}-${month.toString().padStart(2, '0')}-01", "${year}-${month.toString().padStart(2, '0')}-24"],
            "priority_reason": "High value customer with excellent sales potential"
        },
        "${sampleCustomer2}": {
            "tier": "TIER_3_DEVELOPER",
            "planned_visits": 1,
            "recommended_dates": ["${year}-${month.toString().padStart(2, '0')}-02"],
            "priority_reason": "Developing customer from ${sampleArea1}"
        }
        // CRITICAL: Include ALL ${context.customers.length} customers here with proper distribution
        // Continue adding entries for all customers from the provided list
    },
    "area_coverage_plan": {
        "${sampleArea1}": {
            "total_customers": 15,
            "planned_visits": 45,
            "focus_weeks": [1, 3],
            "efficiency_rating": "HIGH"
        },
        "${sampleArea2}": {
            "total_customers": 12,
            "planned_visits": 36,
            "focus_weeks": [2, 4],
            "efficiency_rating": "MEDIUM"
        }
        // CRITICAL: Include all areas from the provided list
    },
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

CRITICAL SUCCESS REQUIREMENTS:
✅ Use ONLY real customer names from the provided list
✅ Use ONLY real area names from the provided list
✅ Generate exactly 4 weeks with 5-6 daily plans each
✅ Include comprehensive customer_visit_frequency covering all ${context.customers.length} customers
✅ Include all areas in area_coverage_plan
✅ Return pure JSON with no markdown formatting
✅ Ensure JSON is valid and complete

Generate a comprehensive monthly plan considering all constraints and context. Return only valid JSON that covers ALL customers and areas provided.`;
}

/**
 * Clean JSON response from OpenAI Assistant
 */
function cleanJsonResponse(response) {
    // Remove markdown code blocks
    let cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    
    // Remove any text before the first {
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace > 0) {
        cleaned = cleaned.substring(firstBrace);
    }
    
    // Remove any text after the last }
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace >= 0 && lastBrace < cleaned.length - 1) {
        cleaned = cleaned.substring(0, lastBrace + 1);
    }
    
    return cleaned;
}

/**
 * Validate plan structure
 */
function validatePlanStructure(plan) {
    const requiredSections = [
        'monthly_overview',
        'weekly_plans', 
        'customer_visit_frequency',
        'area_coverage_plan',
        'revision_checkpoints'
    ];

    requiredSections.forEach(section => {
        if (!plan[section]) {
            throw new Error(`Missing required section: ${section}`);
        }
    });

    if (!Array.isArray(plan.weekly_plans) || plan.weekly_plans.length < 4) {
        throw new Error(`Insufficient weekly plans generated: ${plan.weekly_plans?.length || 0}`);
    }

    const customerCount = Object.keys(plan.customer_visit_frequency).length;
    if (customerCount < 30) {
        throw new Error(`Insufficient customer coverage: ${customerCount} customers`);
    }

    // Validate each week has daily plans
    plan.weekly_plans.forEach((week, index) => {
        if (!week.daily_plans || !Array.isArray(week.daily_plans) || week.daily_plans.length < 5) {
            throw new Error(`Week ${index + 1} missing daily plans: ${week.daily_plans?.length || 0}`);
        }
    });

    console.log('✅ Plan structure validation passed');
    console.log(`📊 Plan summary:
        - Weeks: ${plan.weekly_plans.length}
        - Daily plans: ${plan.weekly_plans.reduce((sum, week) => sum + (week.daily_plans?.length || 0), 0)}
        - Customers: ${customerCount}
        - Areas: ${Object.keys(plan.area_coverage_plan).length}`);
    
    return true;
}

/**
 * Wait for OpenAI Assistant run completion with timeout
 */
async function waitForRunCompletion(threadId, runId, maxWaitTime = 300000) { // 5 minutes max
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds
    let attempts = 0;
    const maxAttempts = Math.floor(maxWaitTime / pollInterval);

    while (Date.now() - startTime < maxWaitTime && attempts < maxAttempts) {
        try {
            const run = await openai.beta.threads.runs.retrieve(threadId, runId);
            
            console.log(`🔄 Run status: ${run.status} (attempt ${attempts + 1}/${maxAttempts})`);
            
            if (run.status === 'completed') {
                console.log('✅ Assistant run completed successfully');
                return run;
            } else if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
                const errorMessage = run.last_error?.message || 'Unknown error';
                throw new Error(`Assistant run ${run.status}: ${errorMessage}`);
            } else if (run.status === 'requires_action') {
                console.log('🔧 Run requires action - handling...');
                // For now, we'll just wait. You can implement function calling here if needed
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            } else {
                // Still running or queued, wait and check again
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
            
            attempts++;
        } catch (error) {
            if (error.status === 429) {
                // Rate limit, wait longer
                console.log('⏳ Rate limited, waiting...');
                await new Promise(resolve => setTimeout(resolve, pollInterval * 2));
            } else {
                throw error;
            }
        }
    }

    throw new Error('Assistant run timed out after 5 minutes');
}

// ===== MAIN API HANDLER =====

export default async function handler(req, res) {
    // Set CORS headers for browser requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false,
            error: 'Method not allowed. Use POST.' 
        });
    }

    try {
        console.log('🚀 API: Monthly plan generation request received');
        
        // Validate request body
        const { mrName, month, year, territoryContext, assistantId } = req.body;

        if (!mrName || !month || !year || !territoryContext || !assistantId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: mrName, month, year, territoryContext, assistantId'
            });
        }

        if (!territoryContext.customers || !Array.isArray(territoryContext.customers)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid territoryContext: customers array is required'
            });
        }

        console.log(`🤖 API: Generating monthly plan for ${mrName} - ${month}/${year}`);
        console.log(`📊 API: Territory context - ${territoryContext.customers.length} customers`);

        // Create thread
        const thread = await openai.beta.threads.create();
        console.log('📝 API: Thread created:', thread.id);

        // Build comprehensive prompt
        const prompt = buildPrompt(mrName, month, year, territoryContext);
        console.log('📝 API: Prompt built, length:', prompt.length);

        // Send message to thread
        await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: prompt
        });

        console.log('💬 API: Message sent to thread');

        // Run assistant
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistantId,
            additional_instructions: `Generate a complete monthly plan for ${mrName} covering ${month}/${year}. 
            
            CRITICAL: Return the complete JSON structure with ALL sections:
            - monthly_overview
            - weekly_plans (4 complete weeks with 6 daily plans each)
            - customer_visit_frequency (60+ customers)
            - area_coverage_plan
            - revision_checkpoints
            - risk_mitigation
            
            Do NOT truncate any sections. Use only real customer names and area names from the provided data.`
        });

        console.log('🏃 API: Assistant run started:', run.id);

        // Wait for completion with robust error handling
        const completedRun = await waitForRunCompletion(thread.id, run.id);
        
        // Get the response
        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
        
        if (!assistantMessage || !assistantMessage.content[0]?.text) {
            throw new Error('No response content from assistant');
        }

        const responseText = assistantMessage.content[0].text.value;
        console.log('📊 API: Response received, length:', responseText.length);
        console.log('🔍 API: Response preview:', responseText.substring(0, 300));

        // Clean and parse JSON response
        const cleanedJSON = cleanJsonResponse(responseText);
        console.log('🧹 API: JSON cleaned, length:', cleanedJSON.length);

        let planJson;
        try {
            planJson = JSON.parse(cleanedJSON);
        } catch (parseError) {
            console.error('❌ API: JSON Parse Error:', parseError);
            console.log('🔍 API: Problematic JSON (first 1000 chars):', cleanedJSON.substring(0, 1000));
            throw new Error(`JSON parsing failed: ${parseError.message}`);
        }

        // Validate plan structure
        validatePlanStructure(planJson);

        console.log('✅ API: Monthly plan generated successfully');
        console.log(`📈 API: Token usage: ${completedRun.usage?.total_tokens || 0}`);

        // Return successful response
        return res.status(200).json({
            success: true,
            plan: planJson,
            thread_id: thread.id,
            run_id: completedRun.id,
            tokens_used: completedRun.usage?.total_tokens || 0,
            generated_at: new Date().toISOString(),
            mr_name: mrName,
            month: month,
            year: year
        });

    } catch (error) {
        console.error('❌ API: Assistant error:', error);
        
        // Return detailed error response
        return res.status(500).json({
            success: false,
            error: error.message,
            error_type: error.constructor.name,
            timestamp: new Date().toISOString()
        });
    }
}

// ===== CONFIGURATION NOTES =====

/*
ENVIRONMENT VARIABLES REQUIRED:
- OPENAI_API_KEY: Your OpenAI API key (backend only, no REACT_APP_ prefix)

VERCEL DEPLOYMENT:
1. Add OPENAI_API_KEY to Vercel environment variables
2. Deploy to Vercel
3. API will be available at: https://your-domain.vercel.app/api/openai/monthly-plan

LOCAL DEVELOPMENT:
1. Add OPENAI_API_KEY to .env.local file
2. Run: npm run dev
3. API will be available at: http://localhost:3000/api/openai/monthly-plan

FRONTEND USAGE:
const response = await fetch('/api/openai/monthly-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        mrName: 'Himanshu Kumar',
        month: 7,
        year: 2025,
        territoryContext: { customers: [...], previous_performance: {...}, ... },
        assistantId: 'asst_your_assistant_id'
    })
});

ERROR HANDLING:
- Returns 400 for missing/invalid request data
- Returns 405 for non-POST methods
- Returns 500 for OpenAI API errors or processing failures
- All responses include success boolean and detailed error messages

FEATURES:
- Comprehensive prompt building with real customer data
- Robust JSON cleaning and parsing
- Plan structure validation
- Timeout handling (5 minutes max)
- Rate limit handling
- CORS support for browser requests
- Detailed logging for debugging
*/
