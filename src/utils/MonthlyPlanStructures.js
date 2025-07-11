// ================================================================
// ENHANCED MONTHLY TOUR PLAN STORAGE STRUCTURE
// ================================================================

/**
 * Complete structure to store in monthly_tour_plans table
 * for proper decompression and analysis
 */

// 1. ENHANCED AI OUTPUT FORMAT (what AI returns)
const aiOutputFormat = {
  "mo": {
    "mr": "John Doe",
    "m": 7,
    "y": 2025,
    "tv": 280,           // total_visits
    "tr": 2750000,       // target_revenue
    "wd": 26,            // working_days
    "summary": "Focused on TIER_2 relationship building and new prospect development across 8 key areas with balanced weekly coverage"
  },
  "cvs": {
    "CUST001": ["0107", "1507", "2907"],
    "CUST002": ["0207", "1607"],
    "CUST003": ["0507", "1207", "2607"],
    // ... ALL customers with visit dates
  },
  "ws": {
    "1": {
      "dates": ["01-07"],
      "customers": 65,
      "revenue_target": 650000,
      "focus": "TIER_2 relationship strengthening"
    },
    "2": {
      "dates": ["08-14"], 
      "customers": 72,
      "revenue_target": 720000,
      "focus": "New prospect development"
    }
    // ... all weeks
  }
};

// 2. COMPREHENSIVE PLAN STRUCTURE TO STORE IN DATABASE
const completeMonthlyPlan = {
  // === CORE AI OUTPUT ===
  ai_plan: aiOutputFormat,
  
  // === DECOMPRESSION DATA ===
  decompression_data: {
    // Original compressed input for reference
    compressed_input: {
      customers: {
        "CUST001": [1, "A1", 85, "M2", 45000, 15, "D", 12, 78],
        "CUST002": [2, "A2", 72, "Q", 32000, 25, "R", 8, 65]
        // ... all original compressed data
      },
      field_mapping: {
        fields: ["tier_code", "area_name", "tier_score", "frequency", "sales_90d", "days_since_visit", "customer_type", "orders_90d", "conversion_rate"],
        tier_codes: {1: "TIER_2_PERFORMER", 2: "TIER_3_DEVELOPER", 3: "TIER_4_PROSPECT"},
        customer_types: {D: "Doctor", R: "Retailer", S: "Stockist", C: "Clinic", H: "Hospital"},
        frequencies: {Q: "Quarterly", M1: "Monthly (1 visit)", M2: "Monthly (2 visits)", W: "Weekly", F: "Fortnightly"}
      }
    },
    
    // Customer master data for quick lookup
    customer_master: {
      "CUST001": {
        customer_code: "CUST001",
        customer_name: "Dr. Smith Clinic",
        customer_type: "Doctor",
        area_name: "Area 1",
        city_name: "Mumbai",
        tier_level: "TIER_2_PERFORMER",
        tier_score: 85,
        frequency_label: "Monthly (2 visits)",
        recommended_frequency: 2,
        total_sales_90d: 45000,
        days_since_last_visit: 15,
        total_orders_90d: 12,
        conversion_rate_90d: 78
      }
      // ... all customers with full details
    },
    
    // Area mapping for geographical analysis
    area_mapping: {
      "A1": {
        area_code: "A1",
        area_name: "Area 1",
        total_customers: 45,
        tier_distribution: {
          "TIER_2_PERFORMER": 12,
          "TIER_3_DEVELOPER": 18,
          "TIER_4_PROSPECT": 15
        },
        planned_visits: 67,
        target_revenue: 580000
      }
      // ... all areas
    }
  },
  
  // === EXPANDED SCHEDULE DATA ===
  expanded_schedule: {
    // Customer-wise detailed schedule
    customer_schedule: {
      "CUST001": {
        customer_name: "Dr. Smith Clinic",
        customer_type: "Doctor",
        tier_level: "TIER_2_PERFORMER",
        area_name: "Area 1",
        total_visits: 3,
        visit_dates: [
          {
            date: "2025-07-01",
            week: 1,
            day_name: "Tuesday",
            visit_number: 1,
            month_visit_sequence: 1
          },
          {
            date: "2025-07-15", 
            week: 3,
            day_name: "Tuesday",
            visit_number: 2,
            month_visit_sequence: 2
          },
          {
            date: "2025-07-29",
            week: 4,
            day_name: "Tuesday", 
            visit_number: 3,
            month_visit_sequence: 3
          }
        ],
        estimated_revenue: 15000,
        priority_reason: "High tier score with consistent performance"
      }
      // ... all customers
    },
    
    // Date-wise schedule for daily view
    daily_schedule: {
      "2025-07-01": {
        day_name: "Tuesday",
        week: 1,
        planned_customers: [
          {
            customer_code: "CUST001",
            customer_name: "Dr. Smith Clinic",
            customer_type: "Doctor",
            area_name: "Area 1",
            estimated_time: "09:00",
            estimated_revenue: 5000,
            visit_sequence: 1
          }
          // ... all customers for this date
        ],
        total_customers: 12,
        total_revenue_target: 85000,
        focus_areas: ["Area 1", "Area 2"]
      }
      // ... all working dates
    },
    
    // Week-wise aggregated view
    weekly_schedule: {
      "week_1": {
        start_date: "2025-07-01",
        end_date: "2025-07-07", 
        total_customers: 65,
        unique_customers: 58,
        total_visits: 65,
        revenue_target: 650000,
        focus_strategy: "TIER_2 relationship strengthening",
        area_coverage: ["Area 1", "Area 2", "Area 3"],
        tier_distribution: {
          "TIER_2_PERFORMER": 25,
          "TIER_3_DEVELOPER": 28,
          "TIER_4_PROSPECT": 12
        },
        daily_breakdown: {
          "2025-07-01": {customers: 12, revenue: 85000},
          "2025-07-02": {customers: 11, revenue: 92000}
          // ... all days in week
        }
      }
      // ... all weeks
    }
  },
  
  // === ANALYSIS & TRACKING DATA ===
  analytics_data: {
    // Summary metrics for dashboard
    summary_metrics: {
      total_customers: 250,
      total_planned_visits: 280,
      total_revenue_target: 2750000,
      average_visits_per_customer: 1.12,
      working_days: 26,
      visits_per_day: 10.77,
      revenue_per_visit: 9821,
      tier_distribution: {
        "TIER_2_PERFORMER": {count: 45, visits: 135, revenue: 1350000},
        "TIER_3_DEVELOPER": {count: 120, visits: 120, revenue: 960000},
        "TIER_4_PROSPECT": {count: 85, visits: 25, revenue: 440000}
      },
      area_distribution: {
        "Area 1": {customers: 35, visits: 42, revenue: 420000},
        "Area 2": {customers: 28, visits: 35, revenue: 315000}
        // ... all areas
      }
    },
    
    // Performance baselines for comparison
    performance_baseline: {
      previous_month_comparison: {
        visits_variance: "+12%",
        revenue_variance: "+8%",
        customer_coverage_variance: "+5%"
      },
      target_vs_capacity: {
        max_possible_visits: 520,
        planned_visits: 280,
        capacity_utilization: "53.8%",
        efficiency_score: "High"
      }
    }
  },
  
  // === METADATA ===
  plan_metadata: {
    generated_at: "2025-07-11T10:30:00Z",
    generated_by: "ai_monthly_planner_v2",
    generation_method: "ai_complete",
    tokens_used: 15420,
    thread_id: "thread_abc123",
    plan_version: "1.0",
    compression_ratio: "82%",
    data_quality_score: 0.96,
    input_customer_count: 250,
    output_visit_count: 280,
    validation_status: "passed",
    revision_count: 0,
    last_revised_at: null,
    status: "active"
  }
};

// ================================================================
// ENHANCED SAVE FUNCTION 
// ================================================================

async function saveEnhancedMonthlyPlan(mrName, month, year, aiResponse, compressedInput, customerMasterData) {
  try {
    console.log(`💾 [Enhanced] Saving comprehensive monthly plan for ${mrName}`);
    
    // Build comprehensive plan structure
    const comprehensivePlan = await buildComprehensivePlan(
      aiResponse, 
      compressedInput, 
      customerMasterData,
      mrName,
      month,
      year
    );
    
    // Save to database
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
      thread_id: comprehensivePlan.plan_metadata.thread_id,
      
      // Additional metadata columns for quick queries
      total_customers: comprehensivePlan.analytics_data.summary_metrics.total_customers,
      total_planned_visits: comprehensivePlan.analytics_data.summary_metrics.total_planned_visits,
      total_revenue_target: comprehensivePlan.analytics_data.summary_metrics.total_revenue_target,
      generation_method: 'ai_complete_v2',
      tokens_used: comprehensivePlan.plan_metadata.tokens_used,
      data_quality_score: comprehensivePlan.plan_metadata.data_quality_score
    };
    
    // Upsert to database
    const { data, error } = await supabase
      .from('monthly_tour_plans')
      .upsert(planData, {
        onConflict: 'mr_name,plan_month,plan_year'
      })
      .select()
      .single();
      
    if (error) throw error;
    
    console.log(`✅ Enhanced plan saved with ID: ${data.id}`);
    return data;
    
  } catch (error) {
    console.error('❌ Failed to save enhanced plan:', error);
    throw error;
  }
}

// ================================================================
// DECOMPRESSION FUNCTIONS FOR VIEWING/ANALYSIS
// ================================================================

class MonthlyPlanDecompressor {
  
  /**
   * Decompress plan for dashboard viewing
   */
  static decompressForDashboard(storedPlan) {
    const plan = storedPlan.original_plan_json;
    
    return {
      monthly_overview: plan.ai_plan.mo,
      weekly_summary: plan.expanded_schedule.weekly_schedule,
      customer_summary: Object.values(plan.expanded_schedule.customer_schedule).slice(0, 50), // First 50 for performance
      summary_metrics: plan.analytics_data.summary_metrics,
      metadata: plan.plan_metadata
    };
  }
  
  /**
   * Decompress customer schedule for detailed view
   */
  static decompressCustomerSchedule(storedPlan, customerCode = null) {
    const customerSchedule = storedPlan.original_plan_json.expanded_schedule.customer_schedule;
    
    if (customerCode) {
      return customerSchedule[customerCode] || null;
    }
    
    return customerSchedule;
  }
  
  /**
   * Decompress daily schedule for calendar view
   */
  static decompressDailySchedule(storedPlan, date = null) {
    const dailySchedule = storedPlan.original_plan_json.expanded_schedule.daily_schedule;
    
    if (date) {
      return dailySchedule[date] || null;
    }
    
    return dailySchedule;
  }
  
  /**
   * Decompress for weekly analysis
   */
  static decompressWeeklyAnalysis(storedPlan, weekNumber = null) {
    const weeklyData = storedPlan.original_plan_json.expanded_schedule.weekly_schedule;
    
    if (weekNumber) {
      return weeklyData[`week_${weekNumber}`] || null;
    }
    
    return weeklyData;
  }
  
  /**
   * Get customer master data for validation
   */
  static getCustomerMasterData(storedPlan, customerCode = null) {
    const customerMaster = storedPlan.original_plan_json.decompression_data.customer_master;
    
    if (customerCode) {
      return customerMaster[customerCode] || null;
    }
    
    return customerMaster;
  }
  
  /**
   * Decompress for performance comparison
   */
  static decompressForComparison(storedPlan) {
    const plan = storedPlan.original_plan_json;
    
    return {
      baseline_metrics: plan.analytics_data.performance_baseline,
      planned_targets: plan.analytics_data.summary_metrics,
      customer_expectations: Object.entries(plan.expanded_schedule.customer_schedule).map(([code, data]) => ({
        customer_code: code,
        customer_name: data.customer_name,
        planned_visits: data.total_visits,
        estimated_revenue: data.estimated_revenue,
        tier_level: data.tier_level
      }))
    };
  }
}

// ================================================================
// VALIDATION FUNCTIONS
// ================================================================

function validateComprehensivePlan(plan) {
  const required = [
    'ai_plan',
    'decompression_data', 
    'expanded_schedule',
    'analytics_data',
    'plan_metadata'
  ];
  
  for (const field of required) {
    if (!plan[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Validate customer consistency
  const aiCustomers = Object.keys(plan.ai_plan.cvs);
  const expandedCustomers = Object.keys(plan.expanded_schedule.customer_schedule);
  const masterCustomers = Object.keys(plan.decompression_data.customer_master);
  
  if (aiCustomers.length !== expandedCustomers.length || 
      expandedCustomers.length !== masterCustomers.length) {
    throw new Error('Customer count mismatch between plan sections');
  }
  
  console.log('✅ Comprehensive plan validation passed');
  return true;
}

export {
  completeMonthlyPlan,
  saveEnhancedMonthlyPlan,
  MonthlyPlanDecompressor,
  validateComprehensivePlan
};
