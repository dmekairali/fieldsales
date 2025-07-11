// src/services/WeeklyRevisionService.js
// Complete backend integration for weekly revision system

import { supabase } from '../supabaseClient';

class WeeklyRevisionService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
        this.assistantId = process.env.REACT_APP_OPENAI_ASSISTANT_ID;
    }

    // ===================================================================
    // AI-POWERED WEEKLY REVISION
    // ===================================================================

    /**
     * Perform AI-powered weekly revision
     * Fetches actual data and lets AI decide revisions
     */
    async performWeeklyRevision(revisionData) {
        try {
            console.log(`📊 [WeeklyRevision] Starting AI revision for Week ${revisionData.week_number}`);
            console.log('📋 Revision Data:', {
                thread_id: revisionData.thread_id,
                week_number: revisionData.week_number,
                mr_name: revisionData.mr_name,
                has_context: !!revisionData.additional_context
            });

            // Step 1: Fetch actual visit data from database
            const actualData = await this.fetchActualVisitData(
                revisionData.mr_name, 
                revisionData.month, 
                revisionData.year, 
                revisionData.week_number
            );

            console.log('📈 Actual visit data fetched:', {
                total_visits: actualData.total_visits,
                total_revenue: actualData.total_revenue,
                unique_customers: actualData.unique_customers,
                areas_covered: actualData.areas_covered?.length || 0
            });

            // Step 2: Get current monthly plan
            const currentPlan = await this.getCurrentMonthlyPlan(
                revisionData.mr_name, 
                revisionData.month, 
                revisionData.year
            );

            if (!currentPlan) {
                throw new Error('No active monthly plan found for revision');
            }

            // Step 3: Call AI revision API with complete context
            const aiRevisionResult = await this.callAIRevisionAPI({
                thread_id: revisionData.thread_id,
                week_number: revisionData.week_number,
                actual_performance: actualData,
                current_plan: currentPlan,
                additional_context: revisionData.additional_context || ''
            });

            // Step 4: Save revision to database
            const savedRevision = await this.saveWeeklyRevision(
                currentPlan.id,
                revisionData.week_number,
                aiRevisionResult.revised_plan,
                aiRevisionResult.analysis,
                revisionData.additional_context
            );

            // Step 5: Update current plan in monthly_tour_plans
            await this.updateCurrentPlan(
                currentPlan.id,
                aiRevisionResult.revised_plan,
                savedRevision.version
            );

            console.log('✅ Weekly revision completed successfully');
            return {
                success: true,
                revision_id: savedRevision.id,
                version: savedRevision.version,
                analysis: aiRevisionResult.analysis,
                revised_plan: aiRevisionResult.revised_plan,
                actual_data: actualData,
                ai_recommendations: aiRevisionResult.recommendations
            };

        } catch (error) {
            console.error('❌ Weekly revision failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Fetch actual visit data from database for specific week
     */
    async fetchActualVisitData(mrName, month, year, weekNumber) {
        try {
            // Calculate week date range
            const weekDates = this.getWeekDateRange(month, year, weekNumber);
            
            console.log(`📅 Fetching visits for Week ${weekNumber}:`, weekDates);

            const { data: visits, error } = await supabase
                .from('mr_visits')
                .select(`
                    "visitId",
                    "clientName",
                    "amountOfSale",
                    "visitTime",
                    "dcrDate",
                    "areaName",
                    "sampleGiven",
                    "visitType"
                `)
                .eq('empName', mrName)
                .gte('dcrDate', weekDates.start)
                .lte('dcrDate', weekDates.end)
                .order('dcrDate');

            if (error) {
                console.error('❌ Database error fetching visits:', error);
                throw new Error(`Failed to fetch visit data: ${error.message}`);
            }

            // Process and analyze the visit data
            return this.processActualVisitData(visits || [], weekDates);

        } catch (error) {
            console.error('❌ Error fetching actual visit data:', error);
            throw error;
        }
    }

    /**
     * Process actual visit data into performance metrics
     */
    processActualVisitData(visits, weekDates) {
        const uniqueCustomers = new Set();
        const areaBreakdown = {};
        const dailyBreakdown = {};
        let totalRevenue = 0;
        let convertingVisits = 0;

        visits.forEach(visit => {
            // Customer tracking
            uniqueCustomers.add(visit.clientName);
            
            // Revenue calculation
            const revenue = parseFloat(visit.amountOfSale) || 0;
            totalRevenue += revenue;
            
            // Conversion tracking
            if (revenue > 0) convertingVisits++;
            
            // Area breakdown
            const area = visit.areaName || 'Unknown';
            if (!areaBreakdown[area]) {
                areaBreakdown[area] = { visits: 0, revenue: 0 };
            }
            areaBreakdown[area].visits++;
            areaBreakdown[area].revenue += revenue;
            
            // Daily breakdown
            const date = visit.dcrDate;
            if (!dailyBreakdown[date]) {
                dailyBreakdown[date] = { visits: 0, revenue: 0 };
            }
            dailyBreakdown[date].visits++;
            dailyBreakdown[date].revenue += revenue;
        });

        return {
            week_dates: weekDates,
            total_visits: visits.length,
            total_revenue: Math.round(totalRevenue),
            unique_customers: uniqueCustomers.size,
            conversion_rate: visits.length > 0 ? Math.round((convertingVisits / visits.length) * 100) : 0,
            avg_revenue_per_visit: visits.length > 0 ? Math.round(totalRevenue / visits.length) : 0,
            areas_covered: Object.keys(areaBreakdown),
            area_breakdown: areaBreakdown,
            daily_breakdown: dailyBreakdown,
            sample_distribution: visits.filter(v => v.sampleGiven).length,
            visit_details: visits.map(v => ({
                customer: v.clientName,
                area: v.areaName,
                date: v.dcrDate,
                revenue: parseFloat(v.amountOfSale) || 0,
                sample_given: v.sampleGiven
            }))
        };
    }

    /**
     * Get current monthly plan
     */
    async getCurrentMonthlyPlan(mrName, month, year) {
        try {
            const { data, error } = await supabase
                .from('monthly_tour_plans')
                .select('*')
                .eq('mr_name', mrName)
                .eq('plan_month', month)
                .eq('plan_year', year)
                .eq('status', 'ACTIVE')
                .single();

            if (error) {
                console.error('❌ Error fetching monthly plan:', error);
                return null;
            }

            return data;

        } catch (error) {
            console.error('❌ Failed to get current monthly plan:', error);
            return null;
        }
    }

    /**
     * Call AI revision API
     */
    async callAIRevisionAPI(revisionPayload) {
        try {
            console.log('🤖 Calling AI revision API...');
            
            const response = await fetch('/api/openai/monthly-plan-persistent', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'revise_weekly',
                    threadId: revisionPayload.thread_id,
                    weekNumber: revisionPayload.week_number,
                    actualPerformance: revisionPayload.actual_performance,
                    currentPlan: revisionPayload.current_plan,
                    revisionReason: revisionPayload.additional_context,
                    assistantId: this.assistantId
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`AI API call failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'AI revision failed');
            }

            console.log('✅ AI revision completed');
            console.log('📊 AI Results Summary:', {
                has_revised_plan: !!result.revised_plan,
                has_analysis: !!result.analysis,
                recommendations_count: result.recommendations?.length || 0,
                tokens_used: result.tokens_used || 0
            });

            return {
                revised_plan: result.revised_plan,
                analysis: result.analysis,
                recommendations: result.recommendations || [],
                tokens_used: result.tokens_used || 0,
                ai_insights: result.ai_insights || ''
            };

        } catch (error) {
            console.error('❌ AI revision API call failed:', error);
            throw new Error(`AI revision failed: ${error.message}`);
        }
    }

    /**
     * Save weekly revision to database
     */
    async saveWeeklyRevision(monthlyPlanId, weekNumber, revisedPlan, analysis, additionalContext) {
        try {
            const version = `1.${weekNumber}`;
            
            const { data, error } = await supabase
                .from('weekly_plan_revisions')
                .insert({
                    monthly_plan_id: monthlyPlanId,
                    week_number: weekNumber,
                    revision_date: new Date().toISOString(),
                    revised_plan_json: revisedPlan,
                    performance_analysis: analysis,
                    version: version,
                    revision_reason: additionalContext || `Week ${weekNumber} AI-powered revision`,
                    week_start_date: analysis.week_dates?.start,
                    week_end_date: analysis.week_dates?.end,
                    created_by: 'AI_SYSTEM'
                })
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to save revision: ${error.message}`);
            }

            console.log(`✅ Weekly revision saved with ID: ${data.id}`);
            return data;

        } catch (error) {
            console.error('❌ Failed to save weekly revision:', error);
            throw error;
        }
    }

    /**
     * Update current plan in monthly_tour_plans table
     */
    async updateCurrentPlan(planId, revisedPlan, version) {
        try {
            const { data, error } = await supabase
                .from('monthly_tour_plans')
                .update({
                    current_plan_json: revisedPlan,
                    current_revision: parseInt(version.split('.')[1]),
                    updated_at: new Date().toISOString()
                })
                .eq('id', planId)
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to update plan: ${error.message}`);
            }

            console.log('✅ Monthly plan updated with revision');
            return data;

        } catch (error) {
            console.error('❌ Failed to update current plan:', error);
            throw error;
        }
    }

    // ===================================================================
    // DATA FETCHING FOR DASHBOARD
    // ===================================================================

    /**
     * Get weekly revisions for a monthly plan
     */
    async getWeeklyRevisions(monthlyPlanId) {
        try {
            const { data, error } = await supabase
                .from('weekly_plan_revisions')
                .select('*')
                .eq('monthly_plan_id', monthlyPlanId)
                .order('week_number');

            if (error) {
                console.error('❌ Error fetching weekly revisions:', error);
                return [];
            }

            return data || [];

        } catch (error) {
            console.error('❌ Failed to get weekly revisions:', error);
            return [];
        }
    }

    /**
     * Get dashboard data for weekly revision interface
     */
    async getDashboardData(mrName, month, year) {
        try {
            // Get monthly plan
            const monthlyPlan = await this.getCurrentMonthlyPlan(mrName, month, year);
            if (!monthlyPlan) return null;

            // Get weekly revisions
            const weeklyRevisions = await this.getWeeklyRevisions(monthlyPlan.id);

            // Process weekly data for each week
            const weeklyData = {};
            for (let week = 1; week <= 4; week++) {
                const actualData = await this.fetchActualVisitData(mrName, month, year, week);
                const plannedData = this.extractPlannedDataForWeek(monthlyPlan.current_plan_json, week);
                
                weeklyData[`week${week}`] = {
                    planned: plannedData,
                    actual: actualData,
                    status: this.determineWeekStatus(actualData, week),
                    revision: weeklyRevisions.find(r => r.week_number === week)
                };
            }

            return {
                monthlyPlan,
                weeklyRevisions,
                weeklyData
            };

        } catch (error) {
            console.error('❌ Error fetching dashboard data:', error);
            throw error;
        }
    }

    // ===================================================================
    // UTILITY FUNCTIONS
    // ===================================================================

    /**
     * Calculate week date range
     */
    getWeekDateRange(month, year, weekNumber) {
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

    /**
     * Extract planned data for specific week from monthly plan
     */
    extractPlannedDataForWeek(planJson, weekNumber) {
        try {
            const weekPlan = planJson.weekly_plans?.find(w => w.week_number === weekNumber);
            if (!weekPlan) {
                return {
                    visits: 0,
                    revenue: 0,
                    customers: 0,
                    areas: []
                };
            }

            return {
                visits: weekPlan.target_visits || 0,
                revenue: weekPlan.target_revenue || 0,
                customers: weekPlan.planned_customers?.length || 0,
                areas: weekPlan.focus_areas || []
            };

        } catch (error) {
            console.error('❌ Error extracting planned data:', error);
            return { visits: 0, revenue: 0, customers: 0, areas: [] };
        }
    }

    /**
     * Determine week status based on actual data and current date
     */
    determineWeekStatus(actualData, weekNumber) {
        const today = new Date();
        const currentWeek = Math.ceil(today.getDate() / 7);
        
        if (actualData.total_visits > 0) return 'completed';
        if (weekNumber === currentWeek) return 'in_progress';
        if (weekNumber < currentWeek) return 'missed';
        return 'planned';
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Weekly revision cache cleared');
    }
}

// Export singleton instance
export const weeklyRevisionService = new WeeklyRevisionService();
export default WeeklyRevisionService;
