// ================================================================
// API/OPENAI/MONTHLY-PLAN-V2.JS - ENHANCED VERSION
// ================================================================

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
});

const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { mrName, month, year, territoryContext, assistantId } = req.body;

        console.log(`🚀 [V2 Enhanced] Generating plan for ${mrName} - ${month}/${year}`);
        console.log(`📊 Territory: ${territoryContext.customers.length} customers`);

        // STEP 1: Create ultra-compressed input
        const compressedInput = createUltraCompressedInput(territoryContext.customers);
        
        // STEP 2: Generate AI plan with new format
        const aiPlan = await generateAICompleteSchedule(assistantId, mrName, month, year, compressedInput);
        
        // STEP 3: Build comprehensive plan structure
        const comprehensivePlan = await buildComprehensivePlan(
            aiPlan, 
            compressedInput, 
            territoryContext.customers,
            mrName, 
            month, 
            year
        );
        
        // STEP 4: Save enhanced plan to database
        const savedPlan = await saveEnhancedPlan(mrName, month, year, comprehensivePlan, aiPlan.thread_id);

        return res.status(200).json({
            success: true,
            plan_id: savedPlan.id,
            plan: comprehensivePlan.ai_plan, // Return compressed AI plan for UI
            thread_id: aiPlan.thread_id,
            tokens_used: aiPlan.tokens_used,
            generation_method: 'ai_complete_v2_enhanced',
            customers_processed: territoryContext.customers.length,
            generated_at: new Date().toISOString(),
            storage_summary: {
                total_customers: comprehensivePlan.analytics_data.summary_metrics.total_customers,
                total_visits: comprehensivePlan.analytics_data.summary_metrics.total_planned_visits,
                compression_ratio: comprehensivePlan.plan_metadata.compression_ratio,
                data_quality_score: comprehensivePlan.plan_metadata.data_quality_score
            }
        });

    } catch (error) {
        console.error('❌ Enhanced API failed:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// ================================================================
// ULTRA-COMPRESSED INPUT CREATION
// ================================================================

function createUltraCompressedInput(customers) {
    console.log(`📊 Creating ultra-compressed input for ${customers.length} customers`);
    
    const compressed = {};
    const typeMap = { "Doctor": "D", "Retailer": "R", "Stockist": "S", "Clinic": "C", "Hospital": "H" };
    const tierMap = { "TIER_2_PERFORMER": 1, "TIER_3_DEVELOPER": 2, "TIER_4_PROSPECT": 3 };
    const freqMap = { 
        1: "M1", 2: "M2", 3: "M3", 4: "W", 
        "Quarterly": "Q", "Monthly": "M1", "Fortnightly": "F", "Weekly": "W" 
    };

    customers.forEach(customer => {
        const customerCode = customer.customer_code;
        const frequency = freqMap[customer.recommended_frequency] || freqMap[customer.frequency_label] || "M1";
        
        compressed[customerCode] = [
            tierMap[customer.tier_level] || 3,           // tier_code
            customer.area_name || 'Unknown',             // area_name (FULL NAME)
            Math.round(customer.tier_score || 0),        // tier_score
            frequency,                                    // frequency code
            Math.round(customer.total_sales_90d || 0),   // sales_90d
            customer.days_since_last_visit || 0,         // days_since_visit
            typeMap[customer.customer_type] || 'D',      // customer_type code
            customer.total_orders_90d || 0,              // orders_90d
            Math.round(customer.conversion_rate_90d || 0) // conversion_rate
        ];
    });

    return {
        customers: compressed,
        field_mapping: {
            fields: ["tier_code", "area_name", "tier_score", "frequency", "sales_90d", "days_since_visit", "customer_type", "orders_90d", "conversion_rate"],
            tier_codes: {1: "TIER_2_PERFORMER", 2: "TIER_3_DEVELOPER", 3: "TIER_4_PROSPECT"},
            customer_types: {D: "Doctor", R: "Retailer", S: "Stockist", C: "Clinic", H: "Hospital"},
            frequencies: {Q: "Quarterly", M1: "Monthly (1 visit)", M2: "Monthly (2 visits)", M3: "Monthly (3 visits)", W: "Weekly", F: "Fortnightly"}
        }
    };
}

// ================================================================
// AI COMPLETE SCHEDULE GENERATION
// ================================================================

async function generateAICompleteSchedule(assistantId, mrName, month, year, compressedInput) {
    console.log(`🤖 Generating complete AI schedule for ${mrName}`);
    
    // Create persistent thread
    const thread = await openai.beta.threads.create({
        metadata: {
            mr_name: mrName,
            month: month.toString(),
            year: year.toString(),
            plan_type: 'monthly_complete_v2',
            customer_count: Object.keys(compressedInput.customers).length.toString(),
            created_at: new Date().toISOString()
        }
    });

    // Build enhanced prompt for complete schedule
    const prompt = buildCompleteSchedulePrompt(mrName, month, year, compressedInput);

    // Create assistant run
    const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId,
        instructions: prompt
    });

    // Wait for completion with timeout
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    const maxAttempts = 120;

    while ((runStatus.status === 'running' || runStatus.status === 'queued' || runStatus.status === 'in_progress') && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        attempts++;
        
        if (attempts % 10 === 0) {
            console.log(`⏳ AI generating complete schedule... ${attempts}/120s`);
        }
    }

    if (runStatus.status !== 'completed') {
        throw new Error(`AI schedule generation failed: ${runStatus.status}`);
    }

    // Get AI response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const response = messages.data[0].content[0].text.value;

    // Parse AI response
    const aiPlan = parseAICompleteResponse(response);
    aiPlan.tokens_used = runStatus.usage?.total_tokens || 0;
    aiPlan.thread_id = thread.id;

    console.log(`✅ Complete AI schedule generated. Tokens: ${aiPlan.tokens_used}`);
    return aiPlan;
}

// ================================================================
// ENHANCED PROMPT FOR COMPLETE SCHEDULE
// ================================================================

function buildCompleteSchedulePrompt(mrName, month, year, compressedInput) {
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[month];
    const daysInMonth = new Date(year, month, 0).getDate();
    const workingDays = Math.floor(daysInMonth * 6/7);
    
    const customerCount = Object.keys(compressedInput.customers).length;
    const areas = [...new Set(Object.values(compressedInput.customers).map(c => c[1]))];
    
    // Calculate tier distribution
    const tierDistribution = {};
    Object.values(compressedInput.customers).forEach(customerData => {
        const tierCode = customerData[0];
        const tierName = compressedInput.field_mapping.tier_codes[tierCode];
        tierDistribution[tierName] = (tierDistribution[tierName] || 0) + 1;
    });

    return `Generate a COMPLETE monthly visit schedule for ${mrName} for ${monthName} ${year}.

ULTRA-COMPRESSED CUSTOMER DATA:
${JSON.stringify(compressedInput.customers)}

FIELD MAPPING:
${JSON.stringify(compressedInput.field_mapping)}

TERRITORY SUMMARY:
- Total customers: ${customerCount}
- Working days: ${workingDays}
- Areas: ${areas.join(', ')}
- Tier distribution: ${Object.entries(tierDistribution).map(([tier, count]) => `${tier}: ${count}`).join(', ')}

VISIT FREQUENCY RULES:
- Q (Quarterly): 1 visit in the month
- M1 (Monthly 1): 1 visit in the month  
- M2 (Monthly 2): 2 visits in the month
- M3 (Monthly 3): 3 visits in the month
- F (Fortnightly): 2 visits in the month
- W (Weekly): 4 visits in the month

REQUIREMENTS:
1. Create visit schedule for ALL ${customerCount} customers
2. Use frequency codes to determine visits per customer
3. Distribute visits evenly across ${workingDays} working days
4. Prioritize by tier_score and days_since_last_visit
5. Balance weekly workload (target: ~${Math.floor(customerCount/4)} customers per week)
6. Format dates as DDMM (e.g., "0107" for July 1st)
7. Provide strategic weekly focus

EXACT OUTPUT FORMAT REQUIRED:
{
  "mo": {
    "mr": "${mrName}",
    "m": ${month},
    "y": ${year},
    "tv": <total_planned_visits>,
    "tr": <target_revenue_estimate>,
    "wd": ${workingDays},
    "summary": "<2-sentence strategy summary>"
  },
  "cvs": {
    "CUST001": ["0107", "1507"],
    "CUST002": ["0307"],
    "CUST003": ["0507", "1207", "2607"]
    // ... ALL customers with their visit dates
  },
  "ws": {
    "1": {
      "dates": ["01-07"],
      "customers": <count>,
      "revenue_target": <amount>,
      "focus": "<strategy>"
    },
    "2": {
      "dates": ["08-14"],
      "customers": <count>,
      "revenue_target": <amount>,
      "focus": "<strategy>"
    },
    "3": {
      "dates": ["15-21"],
      "customers": <count>,
      "revenue_target": <amount>,
      "focus": "<strategy>"
    },
    "4": {
      "dates": ["22-${daysInMonth.toString().padStart(2, '0')}"],
      "customers": <count>,
      "revenue_target": <amount>,
      "focus": "<strategy>"
    }
  }
}

CRITICAL: 
- Include ALL ${customerCount} customers in cvs section
- Use FULL area names from the data
- Base visit count on frequency codes
- Return ONLY the JSON format above
- NO additional text or explanations`;
}

// ================================================================
// COMPREHENSIVE PLAN BUILDER
// ================================================================

async function buildComprehensivePlan(aiPlan, compressedInput, originalCustomerData, mrName, month, year) {
    console.log(`🔧 Building comprehensive plan structure`);
    
    // Build customer master lookup
    const customerMaster = {};
    originalCustomerData.forEach(customer => {
        customerMaster[customer.customer_code] = {
            customer_code: customer.customer_code,
            customer_name: customer.customer_name,
            customer_type: customer.customer_type,
            area_name: customer.area_name,
            city_name: customer.city_name,
            tier_level: customer.tier_level,
            tier_score: customer.tier_score || 0,
            frequency_label: getFrequencyLabel(customer.recommended_frequency),
            recommended_frequency: customer.recommended_frequency || 1,
            total_sales_90d: customer.total_sales_90d || 0,
            days_since_last_visit: customer.days_since_last_visit || 0,
            total_orders_90d: customer.total_orders_90d || 0,
            conversion_rate_90d: customer.conversion_rate_90d || 0
        };
    });
    
    // Build expanded schedule
    const expandedSchedule = buildExpandedSchedule(aiPlan, customerMaster, month, year);
    
    // Build analytics data
    const analyticsData = buildAnalyticsData(aiPlan, customerMaster, expandedSchedule);
    
    // Build area mapping
    const areaMapping = buildAreaMapping(customerMaster, aiPlan);
    
    const comprehensivePlan = {
        ai_plan: aiPlan,
        decompression_data: {
            compressed_input: compressedInput,
            customer_master: customerMaster,
            area_mapping: areaMapping
        },
        expanded_schedule: expandedSchedule,
        analytics_data: analyticsData,
        plan_metadata: {
            generated_at: new Date().toISOString(),
            generated_by: "ai_monthly_planner_v2_enhanced",
            generation_method: "ai_complete",
            tokens_used: aiPlan.tokens_used,
            thread_id: aiPlan.thread_id,
            plan_version: "2.0",
            compression_ratio: `${Math.round((1 - (JSON.stringify(compressedInput).length / JSON.stringify(originalCustomerData).length)) * 100)}%`,
            data_quality_score: calculateDataQuality(originalCustomerData),
            input_customer_count: originalCustomerData.length,
            output_visit_count: aiPlan.mo.tv,
            validation_status: "passed",
            revision_count: 0,
            last_revised_at: null,
            status: "active"
        }
    };
    
    // Validate comprehensive plan
    validateComprehensivePlan(comprehensivePlan);
    
    console.log(`✅ Comprehensive plan built successfully`);
    return comprehensivePlan;
}

// ================================================================
// EXPANDED SCHEDULE BUILDER
// ================================================================

function buildExpandedSchedule(aiPlan, customerMaster, month, year) {
    console.log(`📅 Building expanded schedule structure`);
    
    const customerSchedule = {};
    const dailySchedule = {};
    const weeklySchedule = {};
    
    // Build customer schedule with full details
    Object.entries(aiPlan.cvs).forEach(([customerCode, visitDates]) => {
        const customer = customerMaster[customerCode];
        if (!customer) {
            console.warn(`⚠️ Customer ${customerCode} not found in master data`);
            return;
        }
        
        const visitDetails = visitDates.map((dateStr, index) => {
            const day = parseInt(dateStr.substring(0, 2));
            const fullDate = `${year}-${month.toString().padStart(2, '0')}-${dateStr.substring(0, 2)}`;
            const week = Math.ceil(day / 7);
            const dayName = new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long' });
            
            return {
                date: fullDate,
                week: week,
                day_name: dayName,
                visit_number: index + 1,
                month_visit_sequence: index + 1
            };
        });
        
        customerSchedule[customerCode] = {
            customer_name: customer.customer_name,
            customer_type: customer.customer_type,
            tier_level: customer.tier_level,
            area_name: customer.area_name,
            total_visits: visitDates.length,
            visit_dates: visitDetails,
            estimated_revenue: Math.round((customer.total_sales_90d / 3) * visitDates.length) || 5000,
            priority_reason: getPriorityReason(customer)
        };
    });
    
    // Build daily schedule
    Object.entries(customerSchedule).forEach(([customerCode, schedule]) => {
        schedule.visit_dates.forEach((visit, index) => {
            if (!dailySchedule[visit.date]) {
                dailySchedule[visit.date] = {
                    day_name: visit.day_name,
                    week: visit.week,
                    planned_customers: [],
                    total_customers: 0,
                    total_revenue_target: 0,
                    focus_areas: new Set()
                };
            }
            
            const customer = customerMaster[customerCode];
            dailySchedule[visit.date].planned_customers.push({
                customer_code: customerCode,
                customer_name: schedule.customer_name,
                customer_type: schedule.customer_type,
                area_name: schedule.area_name,
                estimated_time: getEstimatedTime(index),
                estimated_revenue: Math.round(schedule.estimated_revenue / schedule.total_visits),
                visit_sequence: index + 1
            });
            
            dailySchedule[visit.date].total_customers++;
            dailySchedule[visit.date].total_revenue_target += Math.round(schedule.estimated_revenue / schedule.total_visits);
            dailySchedule[visit.date].focus_areas.add(schedule.area_name);
        });
    });
    
    // Convert focus_areas Set to Array
    Object.values(dailySchedule).forEach(day => {
        day.focus_areas = Array.from(day.focus_areas);
    });
    
    // Build weekly schedule
    for (let week = 1; week <= 4; week++) {
        const weekKey = `week_${week}`;
        const weekData = aiPlan.ws[week.toString()];
        
        if (weekData) {
            weeklySchedule[weekKey] = {
                start_date: `${year}-${month.toString().padStart(2, '0')}-${weekData.dates[0].split('-')[0]}`,
                end_date: `${year}-${month.toString().padStart(2, '0')}-${weekData.dates[0].split('-')[1]}`,
                total_customers: weekData.customers,
                unique_customers: getUniqueCustomersInWeek(customerSchedule, week),
                total_visits: weekData.customers,
                revenue_target: weekData.revenue_target,
                focus_strategy: weekData.focus,
                area_coverage: getAreasForWeek(customerSchedule, week),
                tier_distribution: getTierDistributionForWeek(customerSchedule, customerMaster, week),
                daily_breakdown: getDailyBreakdownForWeek(dailySchedule, week, month, year)
            };
        }
    }
    
    return {
        customer_schedule: customerSchedule,
        daily_schedule: dailySchedule,
        weekly_schedule: weeklySchedule
    };
}

// ================================================================
// ANALYTICS DATA BUILDER
// ================================================================

function buildAnalyticsData(aiPlan, customerMaster, expandedSchedule) {
    console.log(`📊 Building analytics data`);
    
    const totalCustomers = Object.keys(customerMaster).length;
    const totalPlannedVisits = aiPlan.mo.tv;
    const totalRevenueTarget = aiPlan.mo.tr;
    
    // Calculate tier distribution
    const tierDistribution = {};
    Object.values(expandedSchedule.customer_schedule).forEach(customer => {
        const tier = customer.tier_level;
        if (!tierDistribution[tier]) {
            tierDistribution[tier] = { count: 0, visits: 0, revenue: 0 };
        }
        tierDistribution[tier].count++;
        tierDistribution[tier].visits += customer.total_visits;
        tierDistribution[tier].revenue += customer.estimated_revenue;
    });
    
    // Calculate area distribution
    const areaDistribution = {};
    Object.values(expandedSchedule.customer_schedule).forEach(customer => {
        const area = customer.area_name;
        if (!areaDistribution[area]) {
            areaDistribution[area] = { customers: 0, visits: 0, revenue: 0 };
        }
        areaDistribution[area].customers++;
        areaDistribution[area].visits += customer.total_visits;
        areaDistribution[area].revenue += customer.estimated_revenue;
    });
    
    return {
        summary_metrics: {
            total_customers: totalCustomers,
            total_planned_visits: totalPlannedVisits,
            total_revenue_target: totalRevenueTarget,
            average_visits_per_customer: parseFloat((totalPlannedVisits / totalCustomers).toFixed(2)),
            working_days: aiPlan.mo.wd,
            visits_per_day: parseFloat((totalPlannedVisits / aiPlan.mo.wd).toFixed(2)),
            revenue_per_visit: Math.round(totalRevenueTarget / totalPlannedVisits),
            tier_distribution: tierDistribution,
            area_distribution: areaDistribution
        },
        performance_baseline: {
            previous_month_comparison: {
                visits_variance: "N/A",
                revenue_variance: "N/A", 
                customer_coverage_variance: "N/A"
            },
            target_vs_capacity: {
                max_possible_visits: aiPlan.mo.wd * 20, // Assuming 20 visits per day max
                planned_visits: totalPlannedVisits,
                capacity_utilization: `${Math.round((totalPlannedVisits / (aiPlan.mo.wd * 20)) * 100)}%`,
                efficiency_score: totalPlannedVisits > (aiPlan.mo.wd * 15) ? "High" : "Medium"
            }
        }
    };
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function buildAreaMapping(customerMaster, aiPlan) {
    const areaMapping = {};
    
    Object.values(customerMaster).forEach(customer => {
        const area = customer.area_name;
        if (!areaMapping[area]) {
            areaMapping[area] = {
                area_name: area,
                total_customers: 0,
                tier_distribution: {},
                planned_visits: 0,
                target_revenue: 0
            };
        }
        
        areaMapping[area].total_customers++;
        
        const tier = customer.tier_level;
        areaMapping[area].tier_distribution[tier] = (areaMapping[area].tier_distribution[tier] || 0) + 1;
    });
    
    // Calculate planned visits and revenue per area from AI plan
    Object.entries(aiPlan.cvs).forEach(([customerCode, visits]) => {
        const customer = customerMaster[customerCode];
        if (customer) {
            const area = customer.area_name;
            if (areaMapping[area]) {
                areaMapping[area].planned_visits += visits.length;
                areaMapping[area].target_revenue += Math.round((customer.total_sales_90d / 3) * visits.length) || 5000;
            }
        }
    });
    
    return areaMapping;
}

function getFrequencyLabel(frequency) {
    const labels = {
        1: "Monthly (1 visit)",
        2: "Monthly (2 visits)", 
        3: "Monthly (3 visits)",
        4: "Weekly"
    };
    return labels[frequency] || "Monthly (1 visit)";
}

function getPriorityReason(customer) {
    if (customer.tier_score >= 80) return "High tier score with excellent performance";
    if (customer.days_since_last_visit > 30) return "Long overdue for visit";
    if (customer.total_sales_90d > 50000) return "High value customer";
    if (customer.conversion_rate_90d > 70) return "High conversion rate";
    return "Regular scheduled visit";
}

function getEstimatedTime(visitIndex) {
    const times = ["09:00", "10:30", "12:00", "14:00", "15:30"];
    return times[visitIndex % times.length];
}

function getUniqueCustomersInWeek(customerSchedule, week) {
    const uniqueCustomers = new Set();
    Object.values(customerSchedule).forEach(schedule => {
        const hasVisitInWeek = schedule.visit_dates.some(visit => visit.week === week);
        if (hasVisitInWeek) uniqueCustomers.add(schedule.customer_name);
    });
    return uniqueCustomers.size;
}

function getAreasForWeek(customerSchedule, week) {
    const areas = new Set();
    Object.values(customerSchedule).forEach(schedule => {
        const hasVisitInWeek = schedule.visit_dates.some(visit => visit.week === week);
        if (hasVisitInWeek) areas.add(schedule.area_name);
    });
    return Array.from(areas);
}

function getTierDistributionForWeek(customerSchedule, customerMaster, week) {
    const tierDistribution = {};
    Object.entries(customerSchedule).forEach(([customerCode, schedule]) => {
        const hasVisitInWeek = schedule.visit_dates.some(visit => visit.week === week);
        if (hasVisitInWeek) {
            const tier = schedule.tier_level;
            tierDistribution[tier] = (tierDistribution[tier] || 0) + 1;
        }
    });
    return tierDistribution;
}

function getDailyBreakdownForWeek(dailySchedule, week, month, year) {
    const breakdown = {};
    Object.entries(dailySchedule).forEach(([date, dayData]) => {
        if (dayData.week === week) {
            breakdown[date] = {
                customers: dayData.total_customers,
                revenue: dayData.total_revenue_target
            };
        }
    });
    return breakdown;
}

function calculateDataQuality(customerData) {
    let qualityScore = 0;
    let totalChecks = 0;
    
    customerData.forEach(customer => {
        totalChecks += 5;
        if (customer.customer_code) qualityScore++;
        if (customer.customer_name) qualityScore++;
        if (customer.tier_level) qualityScore++;
        if (customer.area_name) qualityScore++;
        if (customer.tier_score !== null && customer.tier_score !== undefined) qualityScore++;
    });
    
    return parseFloat((qualityScore / totalChecks).toFixed(2));
}

function validateComprehensivePlan(plan) {
    const required = ['ai_plan', 'decompression_data', 'expanded_schedule', 'analytics_data', 'plan_metadata'];
    
    for (const field of required) {
        if (!plan[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    }
    
    // Validate customer consistency
    const aiCustomers = Object.keys(plan.ai_plan.cvs);
    const expandedCustomers = Object.keys(plan.expanded_schedule.customer_schedule);
    const masterCustomers = Object.keys(plan.decompression_data.customer_master);
    
    if (aiCustomers.length !== expandedCustomers.length || expandedCustomers.length !== masterCustomers.length) {
        throw new Error('Customer count mismatch between plan sections');
    }
    
    console.log('✅ Comprehensive plan validation passed');
    return true;
}

// ================================================================
// ENHANCED SAVE FUNCTION
// ================================================================

async function saveEnhancedPlan(mrName, month, year, comprehensivePlan, threadId) {
    try {
        console.log(`💾 [Enhanced] Saving comprehensive plan for ${mrName}`);
        
        const planData = {
            mr_name: mrName,
            plan_month: month,
            plan_year: year,
            original_plan_json: comprehensivePlan,
            current_plan_json: comprehensivePlan,
            current_revision: 0,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            thread_id: threadId,
            
            // Metadata for quick queries
            total_customers: comprehensivePlan.analytics_data.summary_metrics.total_customers,
            total_planned_visits: comprehensivePlan.analytics_data.summary_metrics.total_planned_visits,
            total_revenue_target: comprehensivePlan.analytics_data.summary_metrics.total_revenue_target,
            generation_method: 'ai_complete_v2_enhanced',
            tokens_used: comprehensivePlan.plan_metadata.tokens_used,
            data_quality_score: comprehensivePlan.plan_metadata.data_quality_score
        };
        
        // Check for existing plan
        const { data: existingPlan } = await supabase
            .from('monthly_tour_plans')
            .select('id')
            .eq('mr_name', mrName)
            .eq('plan_month', month)
            .eq('plan_year', year)
            .single();
        
        let savedPlan;
        if (existingPlan) {
            const { data, error } = await supabase
                .from('monthly_tour_plans')
                .update(planData)
                .eq('id', existingPlan.id)
                .select()
                .single();
            if (error) throw error;
            savedPlan = data;
            console.log(`✅ Updated existing plan ID: ${savedPlan.id}`);
        } else {
            const { data, error } = await supabase
                .from('monthly_tour_plans')
                .insert(planData)
                .select()
                .single();
            if (error) throw error;
            savedPlan = data;
            console.log(`✅ Created new plan ID: ${savedPlan.id}`);
        }
        
        return savedPlan;
        
    } catch (error) {
        console.error('❌ Enhanced plan save failed:', error);
        throw error;
    }
}

// ================================================================
// AI RESPONSE PARSER
// ================================================================

function parseAICompleteResponse(response) {
    try {
        let cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
        const firstBrace = cleaned.indexOf('{');
        if (firstBrace > 0) cleaned = cleaned.substring(firstBrace);
        const lastBrace = cleaned.lastIndexOf('}');
        if (lastBrace >= 0 && lastBrace < cleaned.length - 1) {
            cleaned = cleaned.substring(0, lastBrace + 1);
        }
        
        const parsed = JSON.parse(cleaned);
        
        // Validate required structure
        if (!parsed.mo || !parsed.cvs || !parsed.ws) {
            throw new Error('Invalid AI response structure');
        }
        
        return parsed;
    } catch (error) {
        console.error('❌ AI response parsing failed:', error);
        console.log('🔍 Response that failed:', response.substring(0, 1000));
        throw new Error(`AI response parsing failed: ${error.message}`);
    }
}
