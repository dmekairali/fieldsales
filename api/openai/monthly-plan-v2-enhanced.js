// /api/openai/monthly-plan-v2-enhanced.js
// Updated to handle both NEW_PLAN and REVISE_PLAN actions

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
       const { action } = req.body;

       if (action === 'generate' || !action) {
           return await handleNewPlan(req, res);
       } else if (action === 'revise_weekly') {
           return await handleRevision(req, res);
       } else {
           return res.status(400).json({ 
               success: false, 
               error: `Unknown action: ${action}. Use 'generate' or 'revise_weekly'` 
           });
       }

   } catch (error) {
       console.error('❌ API Error:', error);
       return res.status(500).json({ 
           success: false, 
           error: error.message 
       });
   }
}

// ===================================================================
// NEW PLAN HANDLER (Existing Logic)
// ===================================================================

async function handleNewPlan(req, res) {
   try {
       const { mrName, month, year, territoryContext, assistantId } = req.body;

       console.log(`🚀 [NEW_PLAN] Generating plan for ${mrName} - ${month}/${year}`);
       console.log(`📊 Territory: ${territoryContext.customers.length} customers`);

       // STEP 1: Create ultra-compressed input
       const compressedInput = createUltraCompressedInput(territoryContext.customers);
       
       // STEP 2: Generate AI plan with new format
       const aiPlan = await generateAICompleteSchedule(assistantId, mrName, month, year, compressedInput);
       
       // STEP 3: Build comprehensive plan structure
       const comprehensivePlan = await buildComprehensivePlan(
            aiPlan.plan, 
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
           plan: aiPlan.plan,
           thread_id: aiPlan.thread_id,
           tokens_used: aiPlan.tokens_used,
           generated_at: new Date().toISOString()
       });

   } catch (error) {
       console.error('❌ New plan generation failed:', error);
       return res.status(500).json({ 
           success: false, 
           error: error.message 
       });
   }
}

// ===================================================================
// REVISION HANDLER (New Logic)
// ===================================================================

async function handleRevision(req, res) {
   try {
       console.log('🔄 [DEBUG] Revision handler called');
       console.log('🔄 [DEBUG] Request body:', JSON.stringify(req.body, null, 2));
       
       const { 
           threadId, 
           weekNumber, 
           actualPerformance, 
           currentPlan, 
           revisionReason, 
           assistantId 
       } = req.body;

       console.log(`🔄 [REVISE_PLAN] Processing revision for Week ${weekNumber}`);
      

       if (!threadId) {
           return res.status(400).json({ 
               success: false, 
               error: 'Thread ID is required for revision' 
           });
       }

       // Create compressed performance data
       const compressedPerformance = createCompressedPerformanceData(actualPerformance, weekNumber);
       
       // Get current plan data for context
       const planContext = {
           mr_name: currentPlan?.mr_name,
           month: currentPlan?.plan_month,
           year: currentPlan?.plan_year,
           current_revision: currentPlan?.current_revision || 0
       };

       // Generate revision using existing thread
       const aiRevision = await generateAIRevision(
           assistantId, 
           threadId, 
           weekNumber, 
           compressedPerformance, 
           revisionReason,
           planContext
       );

       // Return structured revision result
       const revisionResult = {
           success: true,
           revised_plan: aiRevision.plan,
           analysis: {
               week_performance: `Week ${weekNumber} analysis completed`,
               gaps_identified: extractGapsFromPlan(aiRevision.plan),
               opportunities: extractOpportunitiesFromPlan(aiRevision.plan),
               week_dates: getWeekDateRange(planContext.month, planContext.year, weekNumber),
               revision_date: new Date().toISOString(),
               week_number: weekNumber
           },
           recommendations: generateRecommendations(aiRevision.plan, actualPerformance),
           redistribution_summary: calculateRedistribution(actualPerformance, aiRevision.plan),
           tokens_used: aiRevision.tokens_used,
           ai_insights: aiRevision.raw_response,
           thread_id: threadId,
           version: `1.${weekNumber}`
       };

       console.log('✅ Weekly revision completed successfully');
       return res.status(200).json(revisionResult);

   } catch (error) {
       console.error('❌ Weekly revision failed:', error);
       return res.status(500).json({ 
           success: false, 
           error: error.message 
       });
   }
}

// ===================================================================
// AI REVISION GENERATOR
// ===================================================================

async function generateAIRevision(assistantId, threadId, weekNumber, compressedPerformance, revisionReason, planContext) {
   try {
       console.log(`🤖 Generating AI revision for Week ${weekNumber}`);

       // Create revision prompt
       const revisionPrompt = `
WEEKLY REVISION REQUEST - Week ${weekNumber}

ACTION: REVISE_PLAN

ACTUAL PERFORMANCE DATA:
${JSON.stringify(compressedPerformance, null, 2)}

PLAN CONTEXT:
- MR: ${planContext.mr_name}
- Month: ${planContext.month}/${planContext.year}
- Current Revision: ${planContext.current_revision}
- Week Being Revised: ${weekNumber}
- Remaining Weeks: ${4 - weekNumber}

REVISION REASON:
${revisionReason || 'Performance analysis and optimization'}

CRITICAL INSTRUCTIONS:
1. SKIP PAST DATES - Only plan for remaining weeks (${weekNumber + 1} to 4)
2. Use ACTUAL customer codes from the original plan (NOT CUST001, CUST002, etc.)
3. Redistribute missed visits to remaining weeks
4. Focus on high-priority customers who were missed
5. Maintain month-end revenue targets
6. Return in EXACT same format: mo, cvs, ws structure
7. NEVER schedule visits on SUNDAYS - Sunday is non-working day
8. Working days: Monday-Saturday only (6 days/week)
9. Calculate working days: Total days - Sundays - holidays
10. Validate: NO visit dates should resolve to Sunday
11. If Sunday detected: Redistribute to nearest weekday immediately

REVISION TASKS:
- Analyze gaps from Week ${weekNumber}
- Redistribute missed opportunities
- Optimize remaining weeks ${weekNumber + 1}-4
- Adjust customer visit frequencies
- Ensure realistic targets

Return the revised plan in the exact same JSON format as the original plan.
`;

       // Create message in existing thread
       const message = await openai.beta.threads.messages.create(threadId, {
           role: "user",
           content: revisionPrompt
       });

       // Run the assistant on the existing thread
       const run = await openai.beta.threads.runs.create(threadId, {
           assistant_id: assistantId
       });

       // Poll for completion
       let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
       
       while (runStatus.status === 'running' || runStatus.status === 'queued' || runStatus.status === 'in_progress') {
       await new Promise(resolve => setTimeout(resolve, 1000));
       runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
       console.log(`🔄 Status: ${runStatus.status}`);
       }
       
       // Add this check after the while loop:
     if (runStatus.status !== 'completed') {
     console.error('❌ Run status:', runStatus.status);
      if (runStatus.status === 'failed') {
        throw new Error(`OpenAI run failed: ${runStatus.last_error?.message}`);
      }
     throw new Error(`Unexpected run status: ${runStatus.status}`);
      }

       if (runStatus.status === 'failed') {
           throw new Error(`AI revision failed: ${runStatus.last_error?.message}`);
       }

       // Get response
       const messages = await openai.beta.threads.messages.list(threadId);
       const assistantMessage = messages.data.find(msg => msg.role === 'assistant');

if (!assistantMessage) {
    console.error('❌ No assistant message found in revision');
    console.log('📋 Available messages:', messages.data.map(m => ({ 
        role: m.role, 
        run_id: m.run_id,
        content_preview: m.content[0]?.text?.value?.substring(0, 100) 
    })));
    throw new Error('No response from AI assistant');
}

const responseContent = assistantMessage.content[0].text.value;

       
       // Parse JSON response
       const parsedPlan = parseAICompleteResponse(responseContent);

       return {
           plan: parsedPlan,
           tokens_used: runStatus.usage?.total_tokens || 0,
           raw_response: responseContent
       };

   } catch (error) {
       console.error('❌ AI revision generation failed:', error);
       throw error;
   }
}

// ===================================================================
// EXISTING FUNCTIONS (Keep all existing functions)
// ===================================================================

async function generateAICompleteSchedule(assistantId, mrName, month, year, compressedInput) {
   try {
       console.log(`🤖 Generating AI complete schedule for ${mrName}`);
       
       const prompt = buildCompleteSchedulePrompt(mrName, month, year, compressedInput);
       
       const thread = await openai.beta.threads.create();
       console.log(`🧵 Created thread: ${thread.id}`);
       
       const message = await openai.beta.threads.messages.create(thread.id, {
           role: "user",
           content: prompt
       });
       
       const run = await openai.beta.threads.runs.create(thread.id, {
           assistant_id: assistantId
       });
       
       let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
       console.log(`🏃 Run created: ${run.id}, Status: ${runStatus.status}`);
       
       
       
       while (runStatus.status === 'running' || runStatus.status === 'queued' || runStatus.status === 'in_progress') {
       await new Promise(resolve => setTimeout(resolve, 1000));
       runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
       console.log(`🔄 Status: ${runStatus.status}`);
       }
       
       // Add this check after the while loop:
    if (runStatus.status !== 'completed') {
    console.error('❌ Run status:', runStatus.status);
    if (runStatus.status === 'failed') {
        throw new Error(`OpenAI run failed: ${runStatus.last_error?.message}`);
    }
    throw new Error(`Unexpected run status: ${runStatus.status}`);
    }
       
       if (runStatus.status === 'failed') {
           console.error('❌ Run failed:', runStatus.last_error);
           throw new Error(`OpenAI run failed: ${runStatus.last_error?.message}`);
       }
       
       const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');

if (!assistantMessage) {
    console.error('❌ No assistant message found');
    console.log('📋 Available messages:', messages.data.map(m => ({ 
        role: m.role, 
        run_id: m.run_id,
        content_preview: m.content[0]?.text?.value?.substring(0, 100) 
    })));
    throw new Error('No assistant response found');
}       
      
       const responseContent = assistantMessage.content[0].text.value;
       console.log(`📝 Response length: ${responseContent.length} characters`);
       
       const aiPlan = parseAICompleteResponse(responseContent);
       
       const result = {
           plan: aiPlan,
           thread_id: thread.id,
           tokens_used: runStatus.usage?.total_tokens || 0,
           raw_response: responseContent
       };
       
       console.log(`✅ AI plan generated successfully. Thread: ${thread.id}, Tokens: ${result.tokens_used}`);
       return result;
       
   } catch (error) {
       console.error('❌ AI generation failed:', error);
       throw error;
   }
}

function createUltraCompressedInput(customers) {
   console.log(`🗜️ Compressing ${customers.length} customers`);
   
   const tierMapping = {
       'TIER_1_CHAMPION': 1,
       'TIER_2_PERFORMER': 2, 
       'TIER_3_DEVELOPER': 3,
       'TIER_4_PROSPECT': 4
   };
   
   const typeMapping = {
       'Doctor': 'D',
       'Retailer': 'R',
       'Stockist': 'S',
       'Clinic': 'C',
       'Hospital': 'H'
   };
   
   const frequencyMapping = {
       'TIER_1_CHAMPION': 'M3',
       'TIER_2_PERFORMER': 'M2',
       'TIER_3_DEVELOPER': 'M1',
       'TIER_4_PROSPECT': 'Q'
   };
   
   const compressedCustomers = {};
   
   customers.forEach(customer => {
       const customerCode = customer.customer_code || customer.customerCode;
       const tierCode = tierMapping[customer.tier_level] || 3;
       const areaName = customer.area_name || customer.areaName || 'Area';
       const tierScore = Math.round((customer.monthly_revenue || 0) / 1000);
       const frequency = frequencyMapping[customer.tier_level] || 'M1';
       const sales90d = customer.monthly_revenue || 0;
       const daysSinceVisit = customer.days_since_last_visit || 30;
       const customerType = typeMapping[customer.customer_type] || 'D';
       const orders90d = customer.orders_count || 1;
       const conversionRate = customer.conversion_rate || 70;
       
       compressedCustomers[customerCode] = [
           tierCode,
           areaName, 
           tierScore,
           frequency,
           sales90d,
           daysSinceVisit,
           customerType,
           orders90d,
           conversionRate
       ];
   });
   
   const result = {
       customers: compressedCustomers,
       field_mapping: {
           fields: ["tier_code", "area_name", "tier_score", "frequency", "sales_90d", "days_since_visit", "customer_type", "orders_90d", "conversion_rate"],
           tier_codes: {1: "TIER_1_CHAMPION", 2: "TIER_2_PERFORMER", 3: "TIER_3_DEVELOPER", 4: "TIER_4_PROSPECT"},
           customer_types: {D: "Doctor", R: "Retailer", S: "Stockist", C: "Clinic", H: "Hospital"},
           frequencies: {Q: "Quarterly", M1: "Monthly (1 visit)", M2: "Monthly (2 visits)", M3: "Monthly (3 visits)", F: "Fortnightly", W: "Weekly"}
       }
   };
   
   console.log(`✅ Compressed to ${Object.keys(compressedCustomers).length} customers`);
   return result;
}

function buildCompleteSchedulePrompt(mrName, month, year, compressedInput) {
   const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
   const monthName = monthNames[month];
   const daysInMonth = new Date(year, month, 0).getDate();
   const workingDays = Math.floor(daysInMonth * 6/7);
   
   const customerCount = Object.keys(compressedInput.customers).length;
   const areas = [...new Set(Object.values(compressedInput.customers).map(c => c[1]))];
   
   return `Generate a COMPLETE monthly visit schedule for ${mrName} for ${monthName} ${year}.

ULTRA-COMPRESSED CUSTOMER DATA:
${JSON.stringify(compressedInput.customers)}

FIELD MAPPING:
${JSON.stringify(compressedInput.field_mapping)}

TERRITORY SUMMARY:
- Total customers: ${customerCount}
- Working days: ${workingDays}
- Areas: ${areas.join(', ')}

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
8. NEVER schedule visits on SUNDAYS - Sunday is non-working day
9. Working days: Monday-Saturday only (6 days/week)
10. Calculate working days: Total days - Sundays - holidays
11. Validate: NO visit dates should resolve to Sunday
12. If Sunday detected: Redistribute to nearest weekday immediately

EXACT OUTPUT FORMAT REQUIRED - Use this structure exactly:
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
   "CUSTOMER_CODE_1": ["0107", "1507"],
   "CUSTOMER_CODE_2": ["0307"],
   "CUSTOMER_CODE_3": ["0507", "1207", "2607"]
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
- Use ACTUAL customer codes from the compressed data
- Return ONLY the JSON format above
- NO additional text or explanations`;
}

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
       
       if (!parsed.mo || !parsed.cvs || !parsed.ws) {
           throw new Error('Invalid AI response structure');
       }
       
       return parsed;
   } catch (error) {
       console.error('❌ AI response parsing failed:', error);
       throw new Error(`AI response parsing failed: ${error.message}`);
   }
}

// ===================================================================
// UTILITY FUNCTIONS FOR REVISIONS
// ===================================================================

function createCompressedPerformanceData(actualPerformance, weekNumber) {
   const today = new Date();
   const currentDay = today.getDate();
   
   return {
       week_performance: `${weekNumber}|${actualPerformance.total_visits}|${actualPerformance.total_revenue}|${actualPerformance.unique_customers}|${actualPerformance.conversion_rate}`,
       areas_covered: actualPerformance.areas_covered?.join(',') || '',
       visit_details: actualPerformance.visit_details?.map(v => 
           `${v.customer}|${v.area}|${v.revenue}`
       ).join(';') || '',
       current_day: currentDay,
       completed_weeks: weekNumber,
       remaining_weeks: 4 - weekNumber
   };
}

function getWeekDateRange(month, year, weekNumber) {
   const firstDay = new Date(year, month - 1, 1);
   const startDate = new Date(firstDay);
   startDate.setDate(firstDay.getDate() + (weekNumber - 1) * 7);
   
   const endDate = new Date(startDate);
   endDate.setDate(startDate.getDate() + 6);

   return {
       start: startDate.toISOString().split('T')[0],
       end: endDate.toISOString().split('T')[0]
   };
}

function extractGapsFromPlan(plan) {
   return [
       'Customer visit frequency adjustments needed',
       'Revenue distribution optimization required'
   ];
}

function extractOpportunitiesFromPlan(plan) {
   return [
       'High-performing customers show additional visit potential',
       'Territory coverage can be optimized for better efficiency'
   ];
}

function generateRecommendations(plan, actualPerformance) {
   return [
       {
           priority: 'HIGH',
           category: 'VISITS',
           recommendation: 'Focus on missed high-priority customers',
           action: 'Redistribute visits to remaining weeks'
       },
       {
           priority: 'MEDIUM', 
           category: 'REVENUE',
           recommendation: 'Increase focus on proven revenue generators',
           action: 'Schedule additional visits with top performers'
       }
   ];
}

function calculateRedistribution(actualPerformance, revisedPlan) {
   const plannedTotal = revisedPlan.mo?.tv || 0;
   const actualTotal = actualPerformance.total_visits || 0;
   
   return {
       missed_visits: Math.max(0, plannedTotal - actualTotal),
       redistributed_visits: revisedPlan.mo?.tv || 0,
       revenue_adjustment: (revisedPlan.mo?.tr || 0) - (actualPerformance.total_revenue || 0)
   };
}

// ================================================================
// COMPREHENSIVE PLAN BUILDER
// ================================================================

async function buildComprehensivePlan(aiPlan, compressedInput, originalCustomerData, mrName, month, year) {
   console.log(`🔧 Building comprehensive plan structure`);
   
   // Sanitize AI plan data first
   const sanitizedAiPlan = sanitizeAiPlan(aiPlan);
   
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
   const expandedSchedule = buildExpandedSchedule(sanitizedAiPlan, customerMaster, month, year);
   
   // Build analytics data
   const analyticsData = buildAnalyticsData(sanitizedAiPlan, customerMaster, expandedSchedule);
   
   // Build area mapping
   const areaMapping = buildAreaMapping(customerMaster, sanitizedAiPlan);
   
   const comprehensivePlan = {
       ai_plan: sanitizedAiPlan,
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
           output_visit_count: sanitizedAiPlan.mo.tv,
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
// DATA SANITIZATION
// ================================================================

function sanitizeAiPlan(aiPlan) {
   const sanitized = JSON.parse(JSON.stringify(aiPlan));
   
   // Sanitize monetary values
   if (sanitized.mo) {
       if (typeof sanitized.mo.tr === 'string') {
           sanitized.mo.tr = 2000000; // Default 20 lakh
       }
       sanitized.mo.tv = parseInt(sanitized.mo.tv) || 0;
       sanitized.mo.wd = parseInt(sanitized.mo.wd) || 0;
       sanitized.mo.m = parseInt(sanitized.mo.m) || 1;
       sanitized.mo.y = parseInt(sanitized.mo.y) || new Date().getFullYear();
   }
   
   // Sanitize weekly revenue targets
   if (sanitized.ws) {
       Object.keys(sanitized.ws).forEach(week => {
           if (typeof sanitized.ws[week].revenue_target === 'string') {
               sanitized.ws[week].revenue_target = Math.round(2000000 / 4); // 5 lakh per week
           }
           sanitized.ws[week].customers = parseInt(sanitized.ws[week].customers) || 0;
       });
   }
   
   return sanitized;
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

