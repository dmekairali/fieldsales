// ================================================================
// MONTHLY PLAN DECOMPRESSION SERVICE V2
// src/services/MonthlyPlanDecompressionService.js
// ================================================================

import { supabase } from '../supabaseClient';

class MonthlyPlanDecompressionService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 15 * 60 * 1000; // 15 minutes
    }

    // ================================================================
    // CORE DECOMPRESSION METHODS
    // ================================================================

    /**
     * Get and decompress monthly plan for dashboard
     */
    async getMonthlyPlanForDashboard(mrName, month, year) {
        const cacheKey = `dashboard_${mrName}_${month}_${year}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            console.log('📋 Using cached dashboard data');
            return cached.data;
        }

        try {
            console.log(`🔍 Loading monthly plan for dashboard: ${mrName} ${month}/${year}`);
            
            const storedPlan = await this.getStoredPlan(mrName, month, year);
            if (!storedPlan) {
                return null;
            }

            const decompressed = this.decompressForDashboard(storedPlan);
            
            // Cache results
            this.cache.set(cacheKey, {
                data: decompressed,
                timestamp: Date.now()
            });

            console.log(`✅ Dashboard data loaded: ${decompressed.summary_metrics.total_customers} customers`);
            return decompressed;

        } catch (error) {
            console.error('❌ Dashboard decompression failed:', error);
            throw error;
        }
    }

    /**
     * Get customer schedule with full details
     */
    async getCustomerSchedule(mrName, month, year, customerCode = null) {
        try {
            console.log(`📅 Loading customer schedule for ${mrName} ${month}/${year}`);
            
            const storedPlan = await this.getStoredPlan(mrName, month, year);
            if (!storedPlan) {
                return null;
            }

            return this.decompressCustomerSchedule(storedPlan, customerCode);

        } catch (error) {
            console.error('❌ Customer schedule decompression failed:', error);
            throw error;
        }
    }

    /**
     * Get daily schedule for calendar view
     */
    async getDailySchedule(mrName, month, year, date = null) {
        try {
            console.log(`📅 Loading daily schedule for ${mrName} ${month}/${year}`);
            
            const storedPlan = await this.getStoredPlan(mrName, month, year);
            if (!storedPlan) {
                return null;
            }

            return this.decompressDailySchedule(storedPlan, date);

        } catch (error) {
            console.error('❌ Daily schedule decompression failed:', error);
            throw error;
        }
    }

    /**
     * Get weekly analysis data
     */
    async getWeeklyAnalysis(mrName, month, year, weekNumber = null) {
        try {
            console.log(`📊 Loading weekly analysis for ${mrName} ${month}/${year}`);
            
            const storedPlan = await this.getStoredPlan(mrName, month, year);
            if (!storedPlan) {
                return null;
            }

            return this.decompressWeeklyAnalysis(storedPlan, weekNumber);

        } catch (error) {
            console.error('❌ Weekly analysis decompression failed:', error);
            throw error;
        }
    }

    /**
     * Get performance comparison data
     */
    async getPerformanceComparison(mrName, month, year) {
        try {
            console.log(`📈 Loading performance comparison for ${mrName} ${month}/${year}`);
            
            const storedPlan = await this.getStoredPlan(mrName, month, year);
            if (!storedPlan) {
                return null;
            }

            return this.decompressForComparison(storedPlan);

        } catch (error) {
            console.error('❌ Performance comparison decompression failed:', error);
            throw error;
        }
    }

    // ================================================================
    // DECOMPRESSION LOGIC
    // ================================================================

    /**
     * Decompress for dashboard viewing
     */
    decompressForDashboard(storedPlan) {
        const plan = storedPlan.original_plan_json;
        
        return {
            // Basic overview
            monthly_overview: {
                mr_name: plan.ai_plan.mo.mr,
                month: plan.ai_plan.mo.m,
                year: plan.ai_plan.mo.y,
                total_visits: plan.ai_plan.mo.tv,
                target_revenue: plan.ai_plan.mo.tr,
                working_days: plan.ai_plan.mo.wd,
                strategy_summary: plan.ai_plan.mo.summary
            },
            
            // Weekly summary for cards
            weekly_summary: Object.entries(plan.ai_plan.ws).map(([week, data]) => ({
                week_number: parseInt(week),
                dates: data.dates,
                customers: data.customers,
                revenue_target: data.revenue_target,
                focus: data.focus,
                expanded_data: plan.expanded_schedule.weekly_schedule[`week_${week}`] || {}
            })),
            
            // Top customers for table (limit for performance)
            customer_summary: Object.entries(plan.expanded_schedule.customer_schedule)
                .slice(0, 50)
                .map(([code, data]) => ({
                    customer_code: code,
                    customer_name: data.customer_name,
                    customer_type: data.customer_type,
                    tier_level: data.tier_level,
                    area_name: data.area_name,
                    total_visits: data.total_visits,
                    visit_dates: data.visit_dates.map(v => v.date),
                    estimated_revenue: data.estimated_revenue,
                    priority_reason: data.priority_reason
                })),
            
            // Analytics
            summary_metrics: plan.analytics_data.summary_metrics,
            
            // Metadata
            metadata: plan.plan_metadata,
            
            // Quick stats for cards
            quick_stats: {
                customers_per_day: Math.round(plan.analytics_data.summary_metrics.total_customers / plan.ai_plan.mo.wd),
                revenue_per_customer: Math.round(plan.ai_plan.mo.tr / plan.analytics_data.summary_metrics.total_customers),
                highest_tier_count: Math.max(...Object.values(plan.analytics_data.summary_metrics.tier_distribution).map(t => t.count)),
                areas_covered: Object.keys(plan.analytics_data.summary_metrics.area_distribution).length
            }
        };
    }

    /**
     * Decompress customer schedule
     */
    decompressCustomerSchedule(storedPlan, customerCode = null) {
        const customerSchedule = storedPlan.original_plan_json.expanded_schedule.customer_schedule;
        const customerMaster = storedPlan.original_plan_json.decompression_data.customer_master;
        
        if (customerCode) {
            const customer = customerSchedule[customerCode];
            if (!customer) return null;
            
            return {
                ...customer,
                master_data: customerMaster[customerCode],
                compressed_data: storedPlan.original_plan_json.decompression_data.compressed_input.customers[customerCode]
            };
        }
        
        // Return all customers with pagination support
        return Object.entries(customerSchedule).map(([code, data]) => ({
            customer_code: code,
            ...data,
            master_data: customerMaster[code]
        }));
    }

    /**
     * Decompress daily schedule
     */
    decompressDailySchedule(storedPlan, date = null) {
        const dailySchedule = storedPlan.original_plan_json.expanded_schedule.daily_schedule;
        
        if (date) {
            return dailySchedule[date] || null;
        }
        
        // Return calendar format
        return Object.entries(dailySchedule).map(([date, data]) => ({
            date: date,
            ...data,
            formatted_date: new Date(date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })
        }));
    }

    /**
     * Decompress weekly analysis
     */
    decompressWeeklyAnalysis(storedPlan, weekNumber = null) {
        const weeklyData = storedPlan.original_plan_json.expanded_schedule.weekly_schedule;
        const aiWeekly = storedPlan.original_plan_json.ai_plan.ws;
        
        if (weekNumber) {
            const weekKey = `week_${weekNumber}`;
            const expanded = weeklyData[weekKey];
            const ai = aiWeekly[weekNumber.toString()];
            
            if (!expanded || !ai) return null;
            
            return {
                week_number: weekNumber,
                ai_strategy: ai,
                expanded_data: expanded,
                performance_potential: this.calculateWeekPerformancePotential(expanded),
                risk_analysis: this.analyzeWeekRisks(expanded)
            };
        }
        
        // Return all weeks
        return Object.entries(weeklyData).map(([weekKey, data]) => {
            const weekNum = parseInt(weekKey.split('_')[1]);
            const ai = aiWeekly[weekNum.toString()];
            
            return {
                week_number: weekNum,
                ai_strategy: ai,
                expanded_data: data,
                performance_potential: this.calculateWeekPerformancePotential(data)
            };
        });
    }

    /**
     * Decompress for performance comparison
     */
    decompressForComparison(storedPlan) {
        const plan = storedPlan.original_plan_json;
        
        return {
            baseline_metrics: plan.analytics_data.performance_baseline,
            planned_targets: plan.analytics_data.summary_metrics,
            customer_expectations: Object.entries(plan.expanded_schedule.customer_schedule).map(([code, data]) => ({
                customer_code: code,
                customer_name: data.customer_name,
                planned_visits: data.total_visits,
                estimated_revenue: data.estimated_revenue,
                tier_level: data.tier_level,
                area_name: data.area_name,
                visit_frequency: data.visit_dates.length,
                priority_score: plan.decompression_data.customer_master[code]?.tier_score || 0
            })),
            territory_benchmarks: {
                total_territory_potential: Object.values(plan.analytics_data.summary_metrics.area_distribution)
                    .reduce((sum, area) => sum + area.revenue, 0),
                high_value_customers: Object.values(plan.expanded_schedule.customer_schedule)
                    .filter(c => c.estimated_revenue > 10000).length,
                coverage_efficiency: this.calculateCoverageEfficiency(plan)
            }
        };
    }

    // ================================================================
    // DATABASE OPERATIONS
    // ================================================================

    /**
     * Get stored plan from database
     */
    async getStoredPlan(mrName, month, year) {
        try {
            const { data, error } = await supabase
                .from('monthly_tour_plans')
                .select('*')
                .eq('mr_name', mrName)
                .eq('plan_month', month)
                .eq('plan_year', year)
                .eq('status', 'ACTIVE')
                .maybeSingle();

            if (error) {
                console.error('❌ Plan fetch error:', error);
                return null;
            }

            return data;

        } catch (error) {
            console.error('❌ Failed to get stored plan:', error);
            return null;
        }
    }

    /**
     * Get plan list for MR
     */
    async getPlanList(mrName, limit = 12) {
        try {
            const { data, error } = await supabase
                .from('monthly_tour_plans')
                .select(`
                    id,
                    mr_name,
                    plan_month,
                    plan_year,
                    total_customers,
                    total_planned_visits,
                    total_revenue_target,
                    current_revision,
                    status,
                    created_at,
                    updated_at,
                    generation_method,
                    data_quality_score
                `)
                .eq('mr_name', mrName)
                .eq('status', 'ACTIVE')
                .order('plan_year', { ascending: false })
                .order('plan_month', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('❌ Plan list fetch error:', error);
                return [];
            }

            return data || [];

        } catch (error) {
            console.error('❌ Failed to get plan list:', error);
            return [];
        }
    }

    /**
     * Search customers in plan
     */
    async searchCustomersInPlan(mrName, month, year, searchTerm) {
        try {
            const storedPlan = await this.getStoredPlan(mrName, month, year);
            if (!storedPlan) return [];

            const customerSchedule = storedPlan.original_plan_json.expanded_schedule.customer_schedule;
            const customerMaster = storedPlan.original_plan_json.decompression_data.customer_master;

            const searchResults = Object.entries(customerSchedule)
                .filter(([code, data]) => {
                    const customer = customerMaster[code];
                    const searchLower = searchTerm.toLowerCase();
                    
                    return (
                        code.toLowerCase().includes(searchLower) ||
                        data.customer_name.toLowerCase().includes(searchLower) ||
                        data.area_name.toLowerCase().includes(searchLower) ||
                        data.customer_type.toLowerCase().includes(searchLower) ||
                        data.tier_level.toLowerCase().includes(searchLower)
                    );
                })
                .map(([code, data]) => ({
                    customer_code: code,
                    ...data,
                    master_data: customerMaster[code]
                }))
                .slice(0, 50); // Limit results

            return searchResults;

        } catch (error) {
            console.error('❌ Customer search failed:', error);
            return [];
        }
    }

    // ================================================================
    // ANALYTICS CALCULATIONS
    // ================================================================

    /**
     * Calculate week performance potential
     */
    calculateWeekPerformancePotential(weekData) {
        const baseScore = weekData.total_visits * 10;
        const revenueScore = weekData.revenue_target / 10000;
        const diversityScore = weekData.area_coverage.length * 5;
        const tierScore = Object.values(weekData.tier_distribution || {})
            .reduce((sum, count) => sum + count, 0) * 2;

        return {
            total_score: Math.round(baseScore + revenueScore + diversityScore + tierScore),
            visit_potential: weekData.total_visits,
            revenue_potential: weekData.revenue_target,
            area_diversity: weekData.area_coverage.length,
            risk_level: weekData.total_visits > 80 ? 'HIGH' : weekData.total_visits > 60 ? 'MEDIUM' : 'LOW'
        };
    }

    /**
     * Analyze week risks
     */
    analyzeWeekRisks(weekData) {
        const risks = [];

        if (weekData.total_visits > 80) {
            risks.push({
                type: 'OVERLOAD',
                severity: 'HIGH',
                message: `${weekData.total_visits} visits may be too many for one week`,
                recommendation: 'Consider redistributing some visits to other weeks'
            });
        }

        if (weekData.area_coverage.length > 6) {
            risks.push({
                type: 'TRAVEL_TIME',
                severity: 'MEDIUM',
                message: `${weekData.area_coverage.length} areas may increase travel time`,
                recommendation: 'Group visits by area to optimize travel'
            });
        }

        if (weekData.revenue_target > 800000) {
            risks.push({
                type: 'HIGH_TARGET',
                severity: 'MEDIUM',
                message: `Revenue target of ₹${weekData.revenue_target.toLocaleString()} is ambitious`,
                recommendation: 'Focus on high-value customers and ensure visit quality'
            });
        }

        return risks;
    }

    /**
     * Calculate coverage efficiency
     */
    calculateCoverageEfficiency(plan) {
        const totalCustomers = plan.analytics_data.summary_metrics.total_customers;
        const totalVisits = plan.analytics_data.summary_metrics.total_planned_visits;
        const workingDays = plan.ai_plan.mo.wd;
        
        const efficiency = {
            customer_coverage_ratio: totalVisits / totalCustomers,
            daily_efficiency: totalVisits / workingDays,
            revenue_per_visit: plan.ai_plan.mo.tr / totalVisits,
            area_utilization: Object.keys(plan.analytics_data.summary_metrics.area_distribution).length / 20 // Assuming max 20 areas
        };

        return efficiency;
    }

    // ================================================================
    // EXPORT & REPORTING FUNCTIONS
    // ================================================================

    /**
     * Export customer schedule to CSV format
     */
    async exportCustomerScheduleCSV(mrName, month, year) {
        try {
            const storedPlan = await this.getStoredPlan(mrName, month, year);
            if (!storedPlan) throw new Error('Plan not found');

            const customerSchedule = storedPlan.original_plan_json.expanded_schedule.customer_schedule;
            const customerMaster = storedPlan.original_plan_json.decompression_data.customer_master;

            const csvData = Object.entries(customerSchedule).map(([code, data]) => {
                const master = customerMaster[code];
                return {
                    customer_code: code,
                    customer_name: data.customer_name,
                    customer_type: data.customer_type,
                    tier_level: data.tier_level,
                    area_name: data.area_name,
                    total_visits: data.total_visits,
                    estimated_revenue: data.estimated_revenue,
                    visit_dates: data.visit_dates.map(v => v.date).join('; '),
                    tier_score: master?.tier_score || 0,
                    days_since_last_visit: master?.days_since_last_visit || 0,
                    priority_reason: data.priority_reason
                };
            });

            return csvData;

        } catch (error) {
            console.error('❌ CSV export failed:', error);
            throw error;
        }
    }

    /**
     * Generate summary report
     */
    async generateSummaryReport(mrName, month, year) {
        try {
            const storedPlan = await this.getStoredPlan(mrName, month, year);
            if (!storedPlan) throw new Error('Plan not found');

            const plan = storedPlan.original_plan_json;
            
            const report = {
                plan_overview: {
                    mr_name: mrName,
                    month: month,
                    year: year,
                    generated_at: plan.plan_metadata.generated_at,
                    total_customers: plan.analytics_data.summary_metrics.total_customers,
                    total_visits: plan.analytics_data.summary_metrics.total_planned_visits,
                    target_revenue: plan.ai_plan.mo.tr,
                    working_days: plan.ai_plan.mo.wd,
                    strategy_summary: plan.ai_plan.mo.summary
                },
                
                tier_analysis: Object.entries(plan.analytics_data.summary_metrics.tier_distribution).map(([tier, data]) => ({
                    tier_level: tier,
                    customer_count: data.count,
                    total_visits: data.visits,
                    total_revenue: data.revenue,
                    avg_visits_per_customer: Math.round((data.visits / data.count) * 100) / 100,
                    avg_revenue_per_customer: Math.round(data.revenue / data.count)
                })),
                
                area_analysis: Object.entries(plan.analytics_data.summary_metrics.area_distribution).map(([area, data]) => ({
                    area_name: area,
                    customer_count: data.customers,
                    total_visits: data.visits,
                    total_revenue: data.revenue,
                    visits_per_customer: Math.round((data.visits / data.customers) * 100) / 100,
                    revenue_per_visit: Math.round(data.revenue / data.visits)
                })),
                
                weekly_breakdown: Object.entries(plan.expanded_schedule.weekly_schedule).map(([weekKey, data]) => ({
                    week: weekKey,
                    start_date: data.start_date,
                    end_date: data.end_date,
                    total_customers: data.total_customers,
                    unique_customers: data.unique_customers,
                    revenue_target: data.revenue_target,
                    focus_strategy: data.focus_strategy,
                    area_coverage: data.area_coverage.join(', '),
                    performance_potential: this.calculateWeekPerformancePotential(data)
                })),
                
                efficiency_metrics: {
                    visits_per_day: plan.analytics_data.summary_metrics.visits_per_day,
                    revenue_per_visit: plan.analytics_data.summary_metrics.revenue_per_visit,
                    customer_coverage_ratio: plan.analytics_data.summary_metrics.average_visits_per_customer,
                    capacity_utilization: plan.analytics_data.performance_baseline.target_vs_capacity.capacity_utilization,
                    data_quality_score: plan.plan_metadata.data_quality_score,
                    compression_ratio: plan.plan_metadata.compression_ratio
                },
                
                recommendations: this.generateRecommendations(plan)
            };

            return report;

        } catch (error) {
            console.error('❌ Summary report generation failed:', error);
            throw error;
        }
    }

    /**
     * Generate recommendations based on plan analysis
     */
    generateRecommendations(plan) {
        const recommendations = [];
        const metrics = plan.analytics_data.summary_metrics;
        
        // Visit frequency recommendations
        if (metrics.visits_per_day > 15) {
            recommendations.push({
                type: 'WORKLOAD',
                priority: 'HIGH',
                title: 'High Daily Visit Load',
                description: `Average ${metrics.visits_per_day} visits per day may be challenging`,
                action: 'Consider reducing visit frequency for lower-tier customers or extending plan duration'
            });
        }
        
        // Revenue efficiency recommendations
        if (metrics.revenue_per_visit < 8000) {
            recommendations.push({
                type: 'REVENUE',
                priority: 'MEDIUM',
                title: 'Low Revenue Per Visit',
                description: `Revenue per visit of ₹${metrics.revenue_per_visit} is below optimal`,
                action: 'Focus more visits on high-value TIER_2 customers and reduce TIER_4 frequency'
            });
        }
        
        // Area coverage recommendations
        const areaCount = Object.keys(metrics.area_distribution).length;
        if (areaCount > 10) {
            recommendations.push({
                type: 'EFFICIENCY',
                priority: 'MEDIUM',
                title: 'Wide Area Coverage',
                description: `${areaCount} areas may increase travel time`,
                action: 'Group visits by area and optimize weekly area focus to reduce travel time'
            });
        }
        
        // Tier balance recommendations
        const tierCounts = Object.values(metrics.tier_distribution).map(t => t.count);
        const tier4Ratio = (metrics.tier_distribution.TIER_4_PROSPECT?.count || 0) / metrics.total_customers;
        
        if (tier4Ratio > 0.4) {
            recommendations.push({
                type: 'STRATEGY',
                priority: 'LOW',
                title: 'High Prospect Ratio',
                description: `${Math.round(tier4Ratio * 100)}% TIER_4 prospects in territory`,
                action: 'Focus on converting prospects to developers through value-added visits'
            });
        }

        return recommendations;
    }

    // ================================================================
    // CACHE MANAGEMENT
    // ================================================================

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Decompression cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            total_items: this.cache.size,
            cache_keys: Array.from(this.cache.keys()),
            memory_usage_estimate: JSON.stringify(Array.from(this.cache.values())).length
        };
    }

    // ================================================================
    // VALIDATION FUNCTIONS
    // ================================================================

    /**
     * Validate plan structure for decompression
     */
    validatePlanStructure(storedPlan) {
        if (!storedPlan || !storedPlan.original_plan_json) {
            throw new Error('Invalid stored plan structure');
        }

        const plan = storedPlan.original_plan_json;
        const required = ['ai_plan', 'decompression_data', 'expanded_schedule', 'analytics_data', 'plan_metadata'];
        
        for (const field of required) {
            if (!plan[field]) {
                throw new Error(`Missing required field in plan: ${field}`);
            }
        }

        return true;
    }

    /**
     * Check data consistency
     */
    checkDataConsistency(storedPlan) {
        const plan = storedPlan.original_plan_json;
        const issues = [];

        // Check customer count consistency
        const aiCustomers = Object.keys(plan.ai_plan.cvs).length;
        const expandedCustomers = Object.keys(plan.expanded_schedule.customer_schedule).length;
        const masterCustomers = Object.keys(plan.decompression_data.customer_master).length;

        if (aiCustomers !== expandedCustomers || expandedCustomers !== masterCustomers) {
            issues.push(`Customer count mismatch: AI(${aiCustomers}), Expanded(${expandedCustomers}), Master(${masterCustomers})`);
        }

        // Check visit count consistency
        const aiTotalVisits = plan.ai_plan.mo.tv;
        const calculatedVisits = Object.values(plan.ai_plan.cvs).reduce((sum, visits) => sum + visits.length, 0);

        if (aiTotalVisits !== calculatedVisits) {
            issues.push(`Visit count mismatch: AI total(${aiTotalVisits}), Calculated(${calculatedVisits})`);
        }

        return {
            is_consistent: issues.length === 0,
            issues: issues,
            checked_at: new Date().toISOString()
        };
    }
}

// ================================================================
// EXPORT
// ================================================================

export default MonthlyPlanDecompressionService;
