// /api/openai/monthly-plan-persistent.js
// Complete persistent thread-based monthly planning with hybrid approach

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
        const { 
            mrName, 
            month, 
            year, 
            territoryContext, 
            assistantId,
            action = 'generate',
            threadId = null,
            weekNumber = null,
            actualPerformance = null,
            revisionReason = null
        } = req.body;

        console.log(`🤖 Persistent Planning: ${action} for ${mrName} - ${month}/${year}`);

        let result;
        switch (action) {
            case 'generate':
                result = await generateInitialPlan(assistantId, mrName, month, year, territoryContext);
                break;
            case 'revise_weekly':
                result = await reviseWeeklyPlan(assistantId, threadId, weekNumber, actualPerformance, revisionReason);
                break;
            case 'update_daily':
                result = await updateDailyPlan(assistantId, threadId, actualPerformance);
                break;
            case 'monthly_review':
                result = await monthlyReview(assistantId, threadId, actualPerformance);
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }

        return res.status(200).json({
            success: true,
            ...result,
            action: action,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`❌ Persistent planning ${req.body.action} failed:`, error);
        return res.status(500).json({
            success: false,
            error: error.message,
            action: req.body.action || 'unknown'
        });
    }
}

// ===================================================================
// INITIAL PLAN GENERATION (HYBRID APPROACH FOR ALL SIZES)
// ===================================================================

async function generateInitialPlan(assistantId, mrName, month, year, territoryContext) {
    console.log(`🆕 Creating new planning thread for ${mrName} with ${territoryContext.customers.length} customers`);

    // Create persistent thread
    const thread = await openai.beta.threads.create({
        metadata: {
            mr_name: mrName,
            month: month.toString(),
            year: year.toString(),
            plan_type: 'monthly_tour_plan',
            customer_count: territoryContext.customers.length.toString(),
            created_at: new Date().toISOString()
        }
    });

    console.log('📝 Thread created:', thread.id);

    // Use hybrid approach for ALL customer counts
    const result = await generateHybridPlan(assistantId, thread.id, mrName, month, year, territoryContext);

    return {
        plan: result.plan,
        thread_id: thread.id,
        tokens_used: result.tokens_used,
        generation_method: 'hybrid_persistent',
        customers_processed: Object.keys(result.plan.customer_visit_frequency || {}).length
    };
}

// ===================================================================
// HYBRID PLAN GENERATION
// ===================================================================

async function generateHybridPlan(assistantId, threadId, mrName, month, year, territoryContext) {
    console.log(`🔄 Hybrid: Generating plan for ${territoryContext.customers.length} customers`);

    // STEP 1: Generate strategic framework with AI
    const framework = await generateStrategicFramework(assistantId, threadId, mrName, month, year, territoryContext);
    
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
        tokens_used: framework.tokens_used
    };
}

// ===================================================================
// AI STRATEGIC FRAMEWORK GENERATION
// ===================================================================

async function generateStrategicFramework(assistantId, threadId, mrName, month, year, territoryContext) {
    console.log('🎯 Generating strategic framework with AI');

    // Build lightweight prompt for framework
    const prompt = buildFrameworkPrompt(mrName, month, year, territoryContext);

    // Send message to existing thread
    await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: prompt
    });

    // Run assistant
    const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        additional_instructions: `This is the initial monthly plan generation for ${mrName}. 
        
        REMEMBER this conversation context for future weekly revisions:
        - MR Name: ${mrName}
        - Month/Year: ${month}/${year}
        - Total customers: ${territoryContext.customers.length}
        - Territory areas: ${[...new Set(territoryContext.customers.map(c => c.area_name))].slice(0, 10).join(', ')}
        
        Generate ONLY the strategic framework (no individual customer assignments). I will send weekly performance updates to this same thread for revisions.`
    });

    // Wait for completion with built-in logic
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max
    const pollingIntervalMs = 2000;

    while (attempts < maxAttempts) {
        runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
        console.log(`🔄 Run status: ${runStatus.status} (attempt ${attempts + 1}/${maxAttempts})`);

        if (runStatus.status === 'completed') {
            break;
        }
        if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
            throw new Error(`Assistant run terminated with status: ${runStatus.status}. Details: ${runStatus.last_error?.message || 'No details'}`);
        }
        // Continue polling if status is 'queued', 'running', or 'in_progress'
        if (runStatus.status !== 'queued' && runStatus.status !== 'running' && runStatus.status !== 'in_progress') {
            // Handle unexpected statuses
            console.warn(`Unexpected run status: ${runStatus.status}. Continuing to poll.`);
        }

        await new Promise(resolve => setTimeout(resolve, pollingIntervalMs));
        attempts++;
    }

    if (runStatus.status !== 'completed') {
        if (attempts >= maxAttempts) {
            throw new Error(`Assistant run polling timed out after ${maxAttempts * pollingIntervalMs / 1000} seconds. Last status: ${runStatus.status}`);
        }
        // This case should ideally be caught by the checks inside the loop (failed, cancelled, expired)
        // or if the loop exited for a reason other than completion or maxAttempts.
        throw new Error(`Assistant run did not complete. Final status: ${runStatus.status}`);
    }

    console.log('✅ Assistant run completed');

    // Get response
    const messages = await openai.beta.threads.messages.list(threadId);
    const response = messages.data[0].content[0].text.value;

    // Parse response
    const framework = parseFrameworkResponse(response);
    framework.tokens_used = runStatus.usage?.total_tokens || 0;

    return framework;
}

// ===================================================================
// WEEKLY REVISION USING EXISTING THREAD
// ===================================================================

async function reviseWeeklyPlan(assistantId, threadId, weekNumber, actualPerformance, revisionReason) {
    console.log(`🔄 Weekly revision: Week ${weekNumber} in thread ${threadId}`);

    const revisionPrompt = buildWeeklyRevisionPrompt(weekNumber, actualPerformance, revisionReason);

    await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: revisionPrompt
    });

    const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        additional_instructions: `This is a weekly revision for Week ${weekNumber}. 
        
        You have the full context of the original monthly plan from our previous conversation.
        Based on the actual performance data provided, revise the remaining weeks of the plan.
        
        Return text recommendations, not JSON.`
    });

    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max
    const pollingIntervalMs = 2000;

    while (attempts < maxAttempts) {
        runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
        console.log(`🔄 Weekly revision run status: ${runStatus.status} (attempt ${attempts + 1}/${maxAttempts})`);

        if (runStatus.status === 'completed') {
            break;
        }
        if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
            throw new Error(`Weekly revision run terminated with status: ${runStatus.status}. Details: ${runStatus.last_error?.message || 'No details'}`);
        }
        if (runStatus.status !== 'queued' && runStatus.status !== 'running' && runStatus.status !== 'in_progress') {
            console.warn(`Weekly revision: Unexpected run status: ${runStatus.status}. Continuing to poll.`);
        }

        await new Promise(resolve => setTimeout(resolve, pollingIntervalMs));
        attempts++;
    }

    if (runStatus.status !== 'completed') {
        if (attempts >= maxAttempts) {
            throw new Error(`Weekly revision polling timed out after ${maxAttempts * pollingIntervalMs / 1000} seconds. Last status: ${runStatus.status}`);
        }
        throw new Error(`Weekly revision run did not complete. Final status: ${runStatus.status}`);
    }

    const messages = await openai.beta.threads.messages.list(threadId);
    const response = messages.data[0].content[0].text.value;

    return {
        revised_recommendations: response,
        week_number: weekNumber,
        thread_id: threadId,
        tokens_used: runStatus.usage?.total_tokens || 0
    };
}

// ===================================================================
// DAILY UPDATES USING EXISTING THREAD
// ===================================================================

async function updateDailyPlan(assistantId, threadId, actualPerformance) {
    console.log(`📅 Daily update in thread ${threadId}`);

    const updatePrompt = buildDailyUpdatePrompt(actualPerformance);

    await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: updatePrompt
    });

    const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        additional_instructions: `This is a daily performance update. Provide brief, actionable recommendations for tomorrow's focus.`
    });

    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max
    const pollingIntervalMs = 2000;

    while (attempts < maxAttempts) {
        runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
        console.log(`🔄 Daily update run status: ${runStatus.status} (attempt ${attempts + 1}/${maxAttempts})`);

        if (runStatus.status === 'completed') {
            break;
        }
        if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
            throw new Error(`Daily update run terminated with status: ${runStatus.status}. Details: ${runStatus.last_error?.message || 'No details'}`);
        }
        if (runStatus.status !== 'queued' && runStatus.status !== 'running' && runStatus.status !== 'in_progress') {
            console.warn(`Daily update: Unexpected run status: ${runStatus.status}. Continuing to poll.`);
        }

        await new Promise(resolve => setTimeout(resolve, pollingIntervalMs));
        attempts++;
    }

    if (runStatus.status !== 'completed') {
        if (attempts >= maxAttempts) {
            throw new Error(`Daily update polling timed out after ${maxAttempts * pollingIntervalMs / 1000} seconds. Last status: ${runStatus.status}`);
        }
        throw new Error(`Daily update run did not complete. Final status: ${runStatus.status}`);
    }

    const messages = await openai.beta.threads.messages.list(threadId);
    const response = messages.data[0].content[0].text.value;

    return {
        daily_recommendations: response,
        thread_id: threadId,
        tokens_used: runStatus.usage?.total_tokens || 0
    };
}

// ===================================================================
// MONTHLY REVIEW USING EXISTING THREAD
// ===================================================================

async function monthlyReview(assistantId, threadId, monthlyPerformance) {
    console.log(`📊 Monthly review in thread ${threadId}`);

    const reviewPrompt = buildMonthlyReviewPrompt(monthlyPerformance);

    await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: reviewPrompt
    });

    const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        additional_instructions: `This is the final monthly review. Provide comprehensive analysis and recommendations for next month.`
    });

    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max
    const pollingIntervalMs = 2000;

    while (attempts < maxAttempts) {
        runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
        console.log(`🔄 Monthly review run status: ${runStatus.status} (attempt ${attempts + 1}/${maxAttempts})`);

        if (runStatus.status === 'completed') {
            break;
        }
        if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
            throw new Error(`Monthly review run terminated with status: ${runStatus.status}. Details: ${runStatus.last_error?.message || 'No details'}`);
        }
        if (runStatus.status !== 'queued' && runStatus.status !== 'running' && runStatus.status !== 'in_progress') {
            console.warn(`Monthly review: Unexpected run status: ${runStatus.status}. Continuing to poll.`);
        }

        await new Promise(resolve => setTimeout(resolve, pollingIntervalMs));
        attempts++;
    }

    if (runStatus.status !== 'completed') {
        if (attempts >= maxAttempts) {
            throw new Error(`Monthly review polling timed out after ${maxAttempts * pollingIntervalMs / 1000} seconds. Last status: ${runStatus.status}`);
        }
        throw new Error(`Monthly review run did not complete. Final status: ${runStatus.status}`);
    }

    const messages = await openai.beta.threads.messages.list(threadId);
    const response = messages.data[0].content[0].text.value;

    return {
        monthly_review: response,
        thread_id: threadId,
        tokens_used: runStatus.usage?.total_tokens || 0
    };
}

// ===================================================================
// PROMPT BUILDERS
// ===================================================================

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

    return `I am ${mrName}, and I need a monthly tour plan for ${monthName} ${year}. This will be our planning thread for the entire month - I'll send weekly updates and revisions here.

TERRITORY OVERVIEW:
- Total customers: ${territoryContext.customers.length}
- Tier distribution: ${Object.entries(tierSummary).map(([tier, count]) => `${tier}: ${count}`).join(', ')}
- Key areas: ${areas.slice(0, 10).join(', ')}${areas.length > 10 ? ` (and ${areas.length - 10} more)` : ''}

PERFORMANCE CONTEXT:
- Previous month visits: ${territoryContext.previous_performance?.total_visits || 0}
- Previous month revenue: ₹${territoryContext.previous_performance?.total_revenue?.toLocaleString() || 0}
- Conversion rate: ${territoryContext.previous_performance?.conversion_rate?.toFixed(1) || 0}%

Generate a strategic monthly planning framework focusing on:
1.  **Monthly Overview**: Realistic targets including 'total_planned_visits' (integer) and 'target_revenue' (number, without commas).
2.  **Weekly Plans (as an array called 'weekly_plans')**: A 4-week structure. For each week object in the array, include:
    *   'week_number' (integer, e.g., 1, 2, 3, 4)
    *   'start_date' (string, 'YYYY-MM-DD' format, calculated based on the month and week number)
    *   'end_date' (string, 'YYYY-MM-DD' format)
    *   'target_visits' (integer, overall target visits for this week)
    *   'target_revenue' (number, without commas, overall target revenue for this week)
    *   'focus_areas' (array of strings, key geographical areas for this week)
    *   'priority_customers' (array of strings, key customer names to prioritize this week)
    *   'daily_plans' (array of objects, for detailed daily breakdown - you can keep this high-level for now or provide a basic structure for each day if easy)
3.  **Area-Based Clustering Strategy**: General strategy notes.
4.  **Revision Checkpoints**: Notes on when/how to revise.

I'll handle the detailed customer distribution based on your strategic framework.
Ensure all numeric values like revenue and visits are pure numbers without commas or currency symbols.

Please remember this context - I'll be back with weekly performance updates for plan adjustments.

Generate the strategic monthly planning framework in JSON format.`;
}

function buildWeeklyRevisionPrompt(weekNumber, actualPerformance, revisionReason) {
    return `Week ${weekNumber} is complete. Here's what actually happened vs our plan:

ACTUAL PERFORMANCE:
- Visits completed: ${actualPerformance.visits_completed}
- Revenue achieved: ₹${actualPerformance.revenue_achieved?.toLocaleString()}
- Customers visited: ${actualPerformance.customers_visited}
- Areas covered: ${actualPerformance.areas_covered?.join(', ')}
- Conversion rate: ${actualPerformance.conversion_rate}%

GAPS & ISSUES:
- Missed visits: ${actualPerformance.missed_visits || 0}
- Missed customers: ${actualPerformance.missed_customers?.join(', ') || 'None'}
- Revenue gap: ₹${actualPerformance.revenue_gap || 0}

REVISION REASON: ${revisionReason}

Based on this performance, please revise the remaining weeks (${weekNumber + 1} to 4) of our monthly plan. 

Focus on:
1. Redistributing missed visits
2. Prioritizing missed customers
3. Adjusting targets to be more realistic
4. Optimizing area coverage for remaining weeks

Provide text recommendations for adjustments.`;
}

function buildDailyUpdatePrompt(actualPerformance) {
    return `Daily update - Today's performance:

VISITS: ${actualPerformance.visits_today}
REVENUE: ₹${actualPerformance.revenue_today}
CUSTOMERS: ${actualPerformance.customers_visited_today?.join(', ')}
AREAS: ${actualPerformance.areas_today?.join(', ')}
ISSUES: ${actualPerformance.issues || 'None'}

Quick recommendations for tomorrow's focus?`;
}

function buildMonthlyReviewPrompt(monthlyPerformance) {
    return `Month completed! Final performance summary:

MONTHLY TOTALS:
- Total visits: ${monthlyPerformance.total_visits} (Target: ${monthlyPerformance.target_visits})
- Total revenue: ₹${monthlyPerformance.total_revenue} (Target: ₹${monthlyPerformance.target_revenue})
- Customers covered: ${monthlyPerformance.unique_customers}
- Areas covered: ${monthlyPerformance.areas_covered}
- Conversion rate: ${monthlyPerformance.conversion_rate}%

WEEK-BY-WEEK PERFORMANCE:
${monthlyPerformance.weekly_breakdown?.map((week, i) => 
    `Week ${i+1}: ${week.visits} visits, ₹${week.revenue} revenue`
).join('\n')}

Based on our month-long planning cycle, what are your key insights and recommendations for next month?`;
}

// ===================================================================
// RESPONSE PARSING
// ===================================================================

function parseFrameworkResponse(response) {
    try {
        let cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
        const firstBrace = cleaned.indexOf('{');
        if (firstBrace > 0) cleaned = cleaned.substring(firstBrace);
        const lastBrace = cleaned.lastIndexOf('}');
        if (lastBrace >= 0 && lastBrace < cleaned.length - 1) {
            cleaned = cleaned.substring(0, lastBrace + 1);
        }

        let parsedJson = JSON.parse(cleaned);

        // Robust parsing for monthly_overview
        if (parsedJson.monthly_overview) {
            parsedJson.monthly_overview.target_revenue = parseFloat(String(parsedJson.monthly_overview.target_revenue).replace(/[^0-9.-]+/g, '')) || 0;
            parsedJson.monthly_overview.total_planned_visits = parseInt(String(parsedJson.monthly_overview.total_planned_visits).replace(/[^0-9-]+/g, '')) || 0;
            parsedJson.monthly_overview.nbd_visits_target = parseInt(String(parsedJson.monthly_overview.nbd_visits_target).replace(/[^0-9-]+/g, '')) || 0;
            parsedJson.monthly_overview.total_working_days = parseInt(String(parsedJson.monthly_overview.total_working_days).replace(/[^0-9-]+/g, '')) || 0;
        } else {
            parsedJson.monthly_overview = { target_revenue: 0, total_planned_visits: 0, nbd_visits_target: 0, total_working_days: 0 };
        }

        // Robust parsing for weekly_plans
        if (parsedJson.weekly_plans && Array.isArray(parsedJson.weekly_plans)) {
            parsedJson.weekly_plans.forEach(week => {
                week.week_number = parseInt(String(week.week_number)) || 0;
                // start_date and end_date are expected as 'YYYY-MM-DD' strings, keep as is if valid, otherwise null/default
                week.start_date = typeof week.start_date === 'string' && week.start_date.match(/^\d{4}-\d{2}-\d{2}$/) ? week.start_date : '';
                week.end_date = typeof week.end_date === 'string' && week.end_date.match(/^\d{4}-\d{2}-\d{2}$/) ? week.end_date : '';
                week.target_visits = parseInt(String(week.target_visits).replace(/[^0-9-]+/g, '')) || 0;
                week.target_revenue = parseFloat(String(week.target_revenue).replace(/[^0-9.-]+/g, '')) || 0;
                week.focus_areas = Array.isArray(week.focus_areas) ? week.focus_areas.map(String) : [];
                week.priority_customers = Array.isArray(week.priority_customers) ? week.priority_customers.map(String) : [];
                // daily_plans can be complex, ensure it's an array
                week.daily_plans = Array.isArray(week.daily_plans) ? week.daily_plans : [];
            });
        } else {
            parsedJson.weekly_plans = []; // Default to empty array if not provided or not an array
        }

        // Ensure other top-level expected structures exist if necessary
        parsedJson.area_coverage_plan = parsedJson.area_coverage_plan || {};
        parsedJson.revision_checkpoints = parsedJson.revision_checkpoints || {};


        return parsedJson;

    } catch (error) {
        console.error('❌ Framework parsing failed:', error);
        console.log('🔍 Response that failed to parse (cleaned preview):', cleaned.substring(0, 1000));
        console.log('🔍 Original response preview:', response.substring(0, 1000));
        // Fallback to a default structure on parsing failure to prevent downstream errors
        return {
            monthly_overview: { target_revenue: 0, total_planned_visits: 0, nbd_visits_target: 0, total_working_days: 0, summary: "Error parsing AI response." },
            weekly_plans: [],
            area_coverage_plan: {},
            revision_checkpoints: {},
            parsing_error: true,
            parsing_error_message: error.message
        };
    }
}

// ===================================================================
// ALGORITHMIC CUSTOMER DISTRIBUTION (NO TOKEN LIMITS)
// ===================================================================

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

    // Generate working dates for the month
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

    console.log(`✅ Distributed ${Object.keys(customerPlan).length} customers`);
    return customerPlan;
}

function calculateCustomerPriority(customer) {
    let score = 0;
    
    // Tier priority
    switch (customer.tier_level) {
        case 'TIER_2_PERFORMER': score += 100; break;
        case 'TIER_3_DEVELOPER': score += 75; break;
        case 'TIER_4_PROSPECT': score += 50; break;
    }
    
    // Tier score
    score += parseFloat(customer.tier_score) || 0;
    
    // Days since last visit
    const daysSince = parseInt(customer.days_since_last_visit) || 0;
    if (daysSince > 30) score += 20;
    else if (daysSince > 14) score += 10;
    
    // Sales potential
    score += (parseFloat(customer.total_sales_90d) || 0) / 1000;
    
    return score;
}

function generatePriorityReason(customer) {
    const tier = customer.tier_level;
    const daysSince = parseInt(customer.days_since_last_visit) || 0;
    const sales = parseFloat(customer.total_sales_90d) || 0;
    
    if (tier === 'TIER_2_PERFORMER') return 'High-value performer requiring regular attention';
    if (tier === 'TIER_3_DEVELOPER' && sales > 10000) return 'Growing customer with strong potential';
    if (daysSince > 30) return 'Long overdue visit - relationship maintenance';
    if (sales > 5000) return 'Active customer with good sales volume';
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

// ===================================================================
// AREA COVERAGE GENERATION
// ===================================================================

function generateAreaCoverage(customers) {
    const areaCoverage = {};
    
    // Group customers by area
    const customersByArea = {};
    customers.forEach(customer => {
        const area = customer.area_name;
        if (!customersByArea[area]) customersByArea[area] = [];
        customersByArea[area].push(customer);
    });

    // Calculate coverage for each area
    Object.entries(customersByArea).forEach(([area, areaCustomers]) => {
        const totalVisits = areaCustomers.reduce((sum, customer) => {
            const freq = customer.tier_level === 'TIER_2_PERFORMER' ? 3 :
                        customer.tier_level === 'TIER_3_DEVELOPER' ? 2 : 1;
            return sum + freq;
        }, 0);

        areaCoverage[area] = {
            total_customers: areaCustomers.length,
            planned_visits: totalVisits,
            focus_weeks: [1, 2, 3, 4], // Distribute across all weeks
            efficiency_rating: areaCustomers.length >= 15 ? 'HIGH' : 
                              areaCustomers.length >= 8 ? 'MEDIUM' : 'LOW'
        };
    });

    return areaCoverage;
}
