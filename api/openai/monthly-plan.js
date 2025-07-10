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

    // Extract top customers
    const topCustomers = context.customers
        .sort((a, b) => (parseFloat(b.tier_score) || 0) - (parseFloat(a.tier_score) || 0))
        .slice(0, 20)
        .map((customer, index) => {
            const tierScore = parseFloat(customer.tier_score) || 0;
            const salesAmount = parseFloat(customer.total_sales_90d) || 0;
            const daysSinceVisit = parseInt(customer.days_since_last_visit) || 999;
            
            return `${index + 1}. ${customer.customer_name} (${customer.tier_level}) - Area: ${customer.area_name}, Score: ${tierScore.toFixed(1)}, Sales: ₹${salesAmount.toLocaleString()}, Days since visit: ${daysSinceVisit}`;
        }).join('\n');

    // Extract real areas
    const realAreas = [...new Set(context.customers.map(c => c.area_name))].slice(0, 12);

    // Tier distribution
    const tierSummary = {};
    context.customers.forEach(customer => {
        const tier = customer.tier_level || 'TIER_4_PROSPECT';
        tierSummary[tier] = (tierSummary[tier] || 0) + 1;
    });

    return `Generate a comprehensive monthly tour plan for ${mrName} for ${monthName} ${year} (${daysInMonth} days).

TERRITORY CONTEXT:
Total active customers: ${context.customers.length}
Tier Distribution: ${Object.entries(tierSummary).map(([tier, count]) => `${tier}: ${count}`).join(', ')}

TOP CUSTOMERS (USE THESE REAL NAMES):
${topCustomers}

REAL AREA NAMES (USE THESE ACTUAL AREAS):
${realAreas.map(area => `"${area}"`).join(', ')}

PREVIOUS MONTH PERFORMANCE:
- Total visits: ${context.previous_performance?.total_visits || 0}
- Total revenue: ₹${context.previous_performance?.total_revenue?.toLocaleString() || 0}
- Conversion rate: ${context.previous_performance?.conversion_rate?.toFixed(1) || 0}%
- Performance grade: ${context.previous_performance?.performance_grade || 'NEW'}

SEASONAL PATTERNS:
- Monthly trend: ${context.seasonal_patterns?.month_performance_trend || 'STABLE'}
- Seasonal factor: ${context.seasonal_patterns?.seasonal_factor || 1.0}
- Historical avg visits: ${context.seasonal_patterns?.avg_monthly_visits || 250}

TERRITORY METRICS:
- Total customers: ${context.territory_metrics?.total_customers || 0}
- Territory efficiency: ${context.territory_metrics?.territory_efficiency || 'MEDIUM'}
- Coverage analysis: ${context.territory_metrics?.coverage_analysis || 'BALANCED'}

CRITICAL REQUIREMENTS:
1. Generate EXACTLY 4 complete weeks with 6 daily plans each (24 total)
2. Include 60-80 customers in customer_visit_frequency section
3. Use ONLY the real customer names and area names provided above
4. Distribute customers logically across all weeks
5. Return complete JSON structure with all required sections
6. Plan for ${Math.floor(daysInMonth * 6/7)} working days total
7. Target 12-15 visits per working day (300+ total monthly visits)
8. Ensure 40% focus on new business development

WEEKLY DISTRIBUTION STRATEGY:
Week 1: Focus on TIER_2_PERFORMER + top TIER_3_DEVELOPER customers
Week 2: Remaining TIER_3_DEVELOPER + high-scoring TIER_4_PROSPECT
Week 3: Medium-scoring TIER_4_PROSPECT customers  
Week 4: Remaining TIER_4_PROSPECT + follow-up visits

MANDATORY JSON STRUCTURE:
Return complete JSON with these sections:
- monthly_overview: Complete summary with targets and metrics
- weekly_plans: 4 complete weeks with 6 daily plans each (24 total daily plans)
- customer_visit_frequency: 60-80 customers with visit schedules and priority reasons
- area_coverage_plan: Territory area analysis and distribution (8-12 areas)
- revision_checkpoints: Weekly review points (4 checkpoints)
- risk_mitigation: Contingency planning

IMPORTANT: Use ONLY the real customer names and area names provided above. Do NOT use generic names like "Customer1" or "Area1". Return pure JSON without any markdown formatting or explanations.`;
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
