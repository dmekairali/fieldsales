// Uses same assistant + thread for entire month with weekly revisions

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { 
            mrName, 
            month, 
            year, 
            territoryContext, 
            assistantId,
            action = 'generate', // 'generate', 'revise_weekly', 'update_daily'
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
            action: req.body.action
        });
    }
}

// ===================================================================
// INITIAL PLAN GENERATION WITH THREAD CREATION
// ===================================================================

async function generateInitialPlan(assistantId, mrName, month, year, territoryContext) {
    console.log(`🆕 Creating new planning thread for ${mrName}`);

    // Create persistent thread for this monthly plan
    const thread = await openai.beta.threads.create({
        metadata: {
            mr_name: mrName,
            month: month.toString(),
            year: year.toString(),
            plan_type: 'monthly_tour_plan',
            created_at: new Date().toISOString()
        }
    });

    console.log('📝 Thread created:', thread.id);

    // Build comprehensive initial prompt with context setting
    const initialPrompt = buildInitialPlanPrompt(mrName, month, year, territoryContext);

    // Send initial planning message
    await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: initialPrompt
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId,
        additional_instructions: `This is the initial monthly plan generation for ${mrName}. 
        
        REMEMBER this conversation context for future weekly revisions:
        - MR Name: ${mrName}
        - Month/Year: ${month}/${year}
        - Total customers: ${territoryContext.customers.length}
        - Territory areas: ${[...new Set(territoryContext.customers.map(c => c.area_name))].join(', ')}
        
        Generate the complete initial plan. I will send weekly performance updates to this same thread for revisions.`
    });

    // Wait for completion
    const completedRun = await waitForRunCompletion(thread.id, run.id);
    
    // Get response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data[0];
    const responseText = assistantMessage.content[0].text.value;

    // Parse plan (using smart parsing for large customer bases)
    const plan = await parseAndCompletePlan(responseText, territoryContext, month, year);

    return {
        plan: plan,
        thread_id: thread.id,
        run_id: completedRun.id,
        tokens_used: completedRun.usage?.total_tokens || 0,
        generation_method: 'initial_with_thread'
    };
}

// ===================================================================
// WEEKLY REVISION USING EXISTING THREAD
// ===================================================================

async function reviseWeeklyPlan(assistantId, threadId, weekNumber, actualPerformance, revisionReason) {
    console.log(`🔄 Weekly revision: Week ${weekNumber} in thread ${threadId}`);

    // Build revision prompt with performance data
    const revisionPrompt = buildWeeklyRevisionPrompt(weekNumber, actualPerformance, revisionReason);

    // Add revision message to existing thread
    await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: revisionPrompt
    });

    // Run assistant with revision context
    const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        additional_instructions: `This is a weekly revision for Week ${weekNumber}. 
        
        You have the full context of the original monthly plan from our previous conversation.
        
        Based on the actual performance data provided, revise the remaining weeks of the plan.
        
        Focus on:
        1. Adjusting targets based on actual performance
        2. Redistributing missed visits to remaining weeks
        3. Updating customer priorities based on actual visits
        4. Optimizing remaining schedule for better results
        
        Return the updated plan sections that need changes.`
    });

    const completedRun = await waitForRunCompletion(threadId, run.id);
    
    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessage = messages.data[0];
    const responseText = assistantMessage.content[0].text.value;

    // Parse revision (could be partial plan or full plan)
    const revisionPlan = parseRevisionResponse(responseText);

    return {
        revised_plan: revisionPlan,
        week_number: weekNumber,
        thread_id: threadId,
        run_id: completedRun.id,
        tokens_used: completedRun.usage?.total_tokens || 0,
        generation_method: 'weekly_revision'
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
        additional_instructions: `This is a daily performance update. 
        
        Use this information to:
        1. Track progress against the monthly plan
        2. Identify any immediate adjustments needed
        3. Suggest focus areas for tomorrow
        4. Update customer priorities if needed
        
        Provide brief recommendations, not a full plan revision.`
    });

    const completedRun = await waitForRunCompletion(threadId, run.id);
    
    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessage = messages.data[0];
    const responseText = assistantMessage.content[0].text.value;

    return {
        daily_recommendations: responseText,
        thread_id: threadId,
        run_id: completedRun.id,
        tokens_used: completedRun.usage?.total_tokens || 0,
        generation_method: 'daily_update'
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
        additional_instructions: `This is the final monthly review. 
        
        You have full context of:
        - Original monthly plan
        - Weekly revisions made
        - Daily updates received
        - Final performance results
        
        Provide:
        1. Performance analysis vs original plan
        2. Key learnings from this month
        3. Recommendations for next month's planning
        4. Territory optimization suggestions
        5. Customer relationship insights
        
        This completes our monthly planning cycle.`
    });

    const completedRun = await waitForRunCompletion(threadId, run.id);
    
    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessage = messages.data[0];
    const responseText = assistantMessage.content[0].text.value;

    return {
        monthly_review: responseText,
        thread_id: threadId,
        run_id: completedRun.id,
        tokens_used: completedRun.usage?.total_tokens || 0,
        generation_method: 'monthly_review'
    };
}

// ===================================================================
// PROMPT BUILDERS
// ===================================================================

function buildInitialPlanPrompt(mrName, month, year, territoryContext) {
    // Use hybrid approach for large customer bases
    const customerCount = territoryContext.customers.length;
    
    if (customerCount > 100) {
        return buildHybridInitialPrompt(mrName, month, year, territoryContext);
    } else {
        return buildStandardInitialPrompt(mrName, month, year, territoryContext);
    }
}

function buildHybridInitialPrompt(mrName, month, year, territoryContext) {
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[month];

    // Tier summary
    const tierSummary = {};
    territoryContext.customers.forEach(customer => {
        const tier = customer.tier_level || 'TIER_4_PROSPECT';
        tierSummary[tier] = (tierSummary[tier] || 0) + 1;
    });

    // Top customers by priority
    const topCustomers = territoryContext.customers
        .sort((a, b) => (parseFloat(b.tier_score) || 0) - (parseFloat(a.tier_score) || 0))
        .slice(0, 30)
        .map(c => c.customer_name);

    // Areas
    const uniqueAreas = [...new Set(territoryContext.customers.map(c => c.area_name))];

    return `I am ${mrName}, and I need a monthly tour plan for ${monthName} ${year}. This will be our planning thread for the entire month - I'll send weekly updates and revisions here.

TERRITORY OVERVIEW:
- Total customers: ${territoryContext.customers.length}
- Tier distribution: ${Object.entries(tierSummary).map(([tier, count]) => `${tier}: ${count}`).join(', ')}
- Key areas: ${uniqueAreas.join(', ')}
- Top priority customers: ${topCustomers.slice(0, 10).join(', ')}

PERFORMANCE CONTEXT:
- Previous month visits: ${territoryContext.previous_performance?.total_visits || 0}
- Previous month revenue: ₹${territoryContext.previous_performance?.total_revenue?.toLocaleString() || 0}
- Conversion rate: ${territoryContext.previous_performance?.conversion_rate?.toFixed(1) || 0}%

Since I have ${territoryContext.customers.length} customers, please generate a strategic framework plan focusing on:

1. Monthly overview with realistic targets
2. 4-week structure with daily plans
3. Area-based clustering strategy
4. Tier-based visit frequency guidelines
5. Weekly revision checkpoints

I'll handle the detailed customer distribution based on your strategic framework. 

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

Return the updated plan sections that need changes.`;
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
// SMART PARSING FOR LARGE CUSTOMER BASES
// ===================================================================

async function parseAndCompletePlan(responseText, territoryContext, month, year) {
    try {
        // Try to parse as complete JSON first
        const cleaned = cleanJsonResponse(responseText);
        const parsedPlan = JSON.parse(cleaned);
        
        // Check if customer_visit_frequency is complete
        const customerFreqCount = Object.keys(parsedPlan.customer_visit_frequency || {}).length;
        const totalCustomers = territoryContext.customers.length;
        
        if (customerFreqCount < totalCustomers * 0.5) { // Less than 50% coverage
            console.log(`🔧 Completing customer distribution: ${customerFreqCount}/${totalCustomers} customers`);
            
            // Complete the customer distribution algorithmically
            parsedPlan.customer_visit_frequency = await completeCustomerDistribution(
                parsedPlan.customer_visit_frequency || {},
                territoryContext.customers,
                month,
                year
            );
        }

        return parsedPlan;

    } catch (error) {
        console.log('🔧 JSON parsing failed, using hybrid completion');
        
        // Fallback: Extract framework and complete algorithmically
        return await createHybridPlan(responseText, territoryContext, month, year);
    }
}

// Complete customer distribution for large customer bases
async function completeCustomerDistribution(existingPlan, allCustomers, month, year) {
    const completePlan = { ...existingPlan };
    const existingCustomers = new Set(Object.keys(existingPlan));
    
    // Add missing customers
    allCustomers.forEach(customer => {
        if (!existingCustomers.has(customer.customer_name)) {
            const visitFreq = getVisitFrequency(customer.tier_level);
            const dates = generateVisitDates(month, year, visitFreq);
            
            completePlan[customer.customer_name] = {
                tier: customer.tier_level || 'TIER_4_PROSPECT',
                planned_visits: visitFreq,
                recommended_dates: dates,
                priority_reason: generatePriorityReason(customer)
            };
        }
    });

    return completePlan;
}

function getVisitFrequency(tier) {
    switch (tier) {
        case 'TIER_2_PERFORMER': return 3;
        case 'TIER_3_DEVELOPER': return 2;
        case 'TIER_4_PROSPECT': return 1;
        default: return 1;
    }
}

function generateVisitDates(month, year, frequency) {
    const dates = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const interval = Math.floor(daysInMonth / frequency);
    
    for (let i = 0; i < frequency; i++) {
        const day = Math.min(1 + (i * interval), daysInMonth);
        dates.push(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
    }
    
    return dates;
}

function generatePriorityReason(customer) {
    const tier = customer.tier_level;
    const sales = parseFloat(customer.total_sales_90d) || 0;
    
    if (tier === 'TIER_2_PERFORMER') return 'High-value performer requiring regular attention';
    if (tier === 'TIER_3_DEVELOPER') return 'Growing customer with development potential';
    if (sales > 5000) return 'Active customer with good sales volume';
    return 'Territory coverage and relationship building';
}
