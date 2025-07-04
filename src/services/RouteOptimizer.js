// src/services/RouteOptimizer.js - Clean production version
import { supabase } from '../supabaseClient';

class RouteOptimizer {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    }

    // Get customers with performance metrics from customer_master table
    async getCustomersForMR(mrName) {
        const cacheKey = `customers_${mrName}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            console.log('📋 Using cached customer data');
            return cached.data;
        }

        try {
            console.log(`🔍 Fetching customers for MR: ${mrName}`);
            
            const { data: customers, error } = await supabase
                .from('customer_master')
                .select(`
                    customer_code,
                    customer_name,
                    customer_type,
                    customer_segment,
                    area_name,
                    city_name,
                    latitude,
                    longitude,
                    total_visits,
                    total_orders,
                    total_order_value,
                    avg_order_value,
                    days_since_last_visit,
                    days_since_last_order,
                    last_visit_date,
                    last_order_date,
                    total_priority_score,
                    churn_risk_score,
                    order_probability,
                    predicted_order_value
                `)
                .eq('mr_name', mrName)
                .eq('status', 'ACTIVE')
                .not('latitude', 'is', null)
                .not('longitude', 'is', null)
                .not('total_priority_score', 'is', null);

            if (error) {
                console.error('❌ Error fetching customers:', error);
                return [];
            }

            if (!customers || customers.length === 0) {
                console.log('📋 No customers found with performance data');
                return [];
            }

            // Enrich with calculated urgency scores
            const enrichedCustomers = customers.map(customer => {
                const urgencyScore = this.calculateUrgencyScore(
                    customer.total_priority_score,
                    customer.churn_risk_score,
                    customer.days_since_last_visit
                );

                return {
                    ...customer,
                    priority_score: customer.total_priority_score,
                    churn_risk: customer.churn_risk_score,
                    order_probability: customer.order_probability,
                    predicted_value: customer.predicted_order_value,
                    urgency_score: urgencyScore,
                    route_position: null,
                    visited_in_route: false
                };
            });

            // Cache results
            this.cache.set(cacheKey, {
                data: enrichedCustomers,
                timestamp: Date.now()
            });

            console.log(`✅ Loaded ${enrichedCustomers.length} customers for ${mrName}`);
            return enrichedCustomers;

        } catch (error) {
            console.error('❌ Database error:', error);
            return [];
        }
    }

    // Calculate urgency score
    calculateUrgencyScore(priorityScore, churnRisk, daysSinceVisit) {
        let urgency = priorityScore * 0.6;
        urgency += churnRisk * 30;
        
        if (daysSinceVisit > 60) urgency += 20;
        else if (daysSinceVisit > 45) urgency += 15;
        else if (daysSinceVisit > 30) urgency += 10;
        else if (daysSinceVisit > 14) urgency += 5;
        
        return Math.min(Math.max(urgency, 10), 100);
    }

    // Distance calculation using Haversine formula
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    calculateTravelTime(distance) {
        const avgSpeedKmh = 22; // Delhi traffic
        return (distance / avgSpeedKmh) * 60; // minutes
    }

    // Daily route optimization
    optimizeDailyRoute(customers, options = {}) {
        const {
            maxVisits = 10,
            maxTravelTime = 240,
            startLocation = { latitude: 28.6285, longitude: 77.0594 },
            prioritizeUrgency = true,
            includeReturnTime = true
        } = options;

        console.log(`🎯 Optimizing route for ${customers.length} customers`);

        if (!customers || customers.length === 0) {
            return this.createEmptyRoute();
        }

        // Validate customers
        const validCustomers = customers.filter(c => 
            c.latitude && c.longitude && 
            c.priority_score !== undefined &&
            c.urgency_score !== undefined &&
            !isNaN(parseFloat(c.latitude)) && !isNaN(parseFloat(c.longitude))
        );

        if (validCustomers.length === 0) {
            return this.createEmptyRoute();
        }

        // Select optimal customers
        const selectedCustomers = this.selectOptimalCustomers(validCustomers, maxVisits);
        
        if (selectedCustomers.length === 0) {
            return this.createEmptyRoute();
        }

        // Optimize route order
        const optimizedRoute = this.optimizeRouteOrder(selectedCustomers, startLocation, maxTravelTime);
        
        // Calculate metrics
        const metrics = this.calculateRouteMetrics(optimizedRoute, startLocation, includeReturnTime);

        return {
            route: optimizedRoute,
            ...metrics,
            algorithm_used: 'performance_based_optimization',
            optimization_score: this.calculateOptimizationScore(optimizedRoute, metrics)
        };
    }

    // Select optimal customers using performance metrics
    selectOptimalCustomers(customers, maxVisits) {
        const highPriority = customers.filter(c => c.priority_score >= 80)
            .sort((a, b) => b.urgency_score - a.urgency_score);
        
        const mediumUrgent = customers.filter(c => 
            c.priority_score >= 60 && c.priority_score < 80 && c.urgency_score >= 70
        ).sort((a, b) => b.urgency_score - a.urgency_score);
        
        const highChurnRisk = customers.filter(c => 
            c.churn_risk > 0.7 && c.priority_score >= 40
        ).sort((a, b) => b.urgency_score - a.urgency_score);
        
        const highRevenue = customers.filter(c => 
            c.predicted_value > 10000 && c.order_probability > 0.2
        ).sort((a, b) => (b.predicted_value * b.order_probability) - (a.predicted_value * a.order_probability));

        const selected = [];
        const selectedCodes = new Set();

        // Add customers by priority
        [highPriority, mediumUrgent, highChurnRisk, highRevenue].forEach(group => {
            group.forEach(customer => {
                if (selected.length < maxVisits && !selectedCodes.has(customer.customer_code)) {
                    selected.push(customer);
                    selectedCodes.add(customer.customer_code);
                }
            });
        });

        // Fill remaining slots by urgency
        if (selected.length < maxVisits) {
            const remaining = customers.filter(c => !selectedCodes.has(c.customer_code))
                .sort((a, b) => b.urgency_score - a.urgency_score);
            
            remaining.forEach(customer => {
                if (selected.length < maxVisits) {
                    selected.push(customer);
                    selectedCodes.add(customer.customer_code);
                }
            });
        }

        return selected;
    }

    // Optimize route order using nearest neighbor
    optimizeRouteOrder(customers, startLocation, maxTravelTime) {
        if (customers.length <= 1) return customers;

        const route = [];
        const unvisited = [...customers];
        let currentLocation = startLocation;
        let totalTravelTime = 0;

        while (unvisited.length > 0 && totalTravelTime < maxTravelTime) {
            let bestCustomer = null;
            let bestScore = -Infinity;
            let bestIndex = -1;

            unvisited.forEach((customer, index) => {
                const distance = this.calculateDistance(
                    currentLocation.latitude, currentLocation.longitude,
                    customer.latitude, customer.longitude
                );
                const travelTime = this.calculateTravelTime(distance);
                
                if (totalTravelTime + travelTime > maxTravelTime) return;

                const revenueScore = customer.predicted_value * customer.order_probability;
                const performanceScore = (customer.urgency_score * 0.7) + (revenueScore / 1000 * 0.3);
                const efficiencyScore = performanceScore / Math.max(distance, 0.1);
                
                if (efficiencyScore > bestScore) {
                    bestScore = efficiencyScore;
                    bestCustomer = customer;
                    bestIndex = index;
                }
            });

            if (bestCustomer) {
                const distance = this.calculateDistance(
                    currentLocation.latitude, currentLocation.longitude,
                    bestCustomer.latitude, bestCustomer.longitude
                );
                const travelTime = this.calculateTravelTime(distance);

                route.push({
                    ...bestCustomer,
                    route_position: route.length + 1,
                    travel_time_from_previous: travelTime,
                    distance_from_previous: distance,
                    cumulative_travel_time: totalTravelTime + travelTime,
                    expected_revenue: Math.round(bestCustomer.predicted_value * bestCustomer.order_probability)
                });

                totalTravelTime += travelTime;
                currentLocation = { latitude: bestCustomer.latitude, longitude: bestCustomer.longitude };
                unvisited.splice(bestIndex, 1);
            } else {
                break;
            }
        }

        return route;
    }

    // Calculate route metrics
    calculateRouteMetrics(route, startLocation, includeReturnTime) {
        if (!route || route.length === 0) {
            return this.createEmptyRoute();
        }

        let totalTravelTime = 0;
        let totalRevenue = 0;
        let totalDistance = 0;

        route.forEach(customer => {
            totalDistance += customer.distance_from_previous || 0;
            totalTravelTime += customer.travel_time_from_previous || 0;
            totalRevenue += customer.expected_revenue || 0;
        });

        if (includeReturnTime && startLocation && route.length > 0) {
            const lastCustomer = route[route.length - 1];
            const returnDistance = this.calculateDistance(
                lastCustomer.latitude, lastCustomer.longitude,
                startLocation.latitude, startLocation.longitude
            );
            totalDistance += returnDistance;
            totalTravelTime += this.calculateTravelTime(returnDistance);
        }

        const avgPriority = route.reduce((sum, c) => sum + c.priority_score, 0) / route.length;
        const avgUrgency = route.reduce((sum, c) => sum + c.urgency_score, 0) / route.length;
        const avgChurnRisk = route.reduce((sum, c) => sum + c.churn_risk, 0) / route.length;
        const avgOrderProb = route.reduce((sum, c) => sum + c.order_probability, 0) / route.length;
        const totalVisitTime = route.length * 35;

        return {
            total_customers: route.length,
            total_distance: Math.round(totalDistance * 100) / 100,
            total_travel_time: Math.round(totalTravelTime),
            total_visit_time: totalVisitTime,
            total_day_time: Math.round(totalTravelTime + totalVisitTime),
            estimated_revenue: Math.round(totalRevenue),
            avg_priority_score: Math.round(avgPriority * 10) / 10,
            avg_urgency_score: Math.round(avgUrgency * 10) / 10,
            avg_churn_risk: Math.round(avgChurnRisk * 100) / 100,
            avg_order_probability: Math.round(avgOrderProb * 100) / 100,
            route_efficiency: route.length / Math.max(totalTravelTime / 60, 0.1),
            revenue_per_hour: Math.round(totalRevenue / Math.max((totalTravelTime + totalVisitTime) / 60, 0.1)),
            route: route
        };
    }

    calculateOptimizationScore(route, metrics) {
        if (!route || route.length === 0) return 0;

        const efficiencyScore = Math.min(metrics.route_efficiency * 7, 30);
        const priorityScore = (metrics.avg_priority_score / 100) * 25;
        const revenueScore = Math.min(metrics.estimated_revenue / 8000, 25);
        const urgencyScore = (metrics.avg_urgency_score / 100) * 20;

        return Math.round(efficiencyScore + priorityScore + revenueScore + urgencyScore);
    }

    createEmptyRoute() {
        return {
            route: [],
            total_customers: 0,
            total_distance: 0,
            total_travel_time: 0,
            total_visit_time: 0,
            total_day_time: 0,
            estimated_revenue: 0,
            avg_priority_score: 0,
            avg_urgency_score: 0,
            avg_churn_risk: 0,
            avg_order_probability: 0,
            route_efficiency: 0,
            revenue_per_hour: 0,
            optimization_score: 0
        };
    }

    // Weekly route generation - 6 days (Monday-Saturday)
    async generateWeeklyRoutes(mrName, options = {}) {
        const customers = await this.getCustomersForMR(mrName);
        
        if (!customers || customers.length === 0) {
            return this.createEmptyWeeklyRoutes();
        }

        console.log(`📅 Generating weekly routes for ${customers.length} customers`);

        // Categorize customers
        const categories = {
            critical: customers.filter(c => c.priority_score >= 80),
            urgent: customers.filter(c => c.urgency_score >= 75 && c.priority_score >= 60 && c.priority_score < 80),
            highChurn: customers.filter(c => c.churn_risk > 0.7 && c.priority_score >= 40),
            mediumPriority: customers.filter(c => c.priority_score >= 60 && c.priority_score < 80 && c.urgency_score < 75),
            regular: customers.filter(c => c.priority_score >= 40 && c.priority_score < 60),
            prospects: customers.filter(c => c.priority_score < 40 && c.churn_risk <= 0.7)
        };

        const weeklyRoutes = {};
        const usedCustomers = new Set();
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        days.forEach((day, dayIndex) => {
            const availableCustomers = [];

            // Critical customers: Mon, Wed, Fri, Sat
            if ([0, 2, 4, 5].includes(dayIndex)) {
                const criticalAvailable = categories.critical.filter(c => !usedCustomers.has(c.customer_code));
                availableCustomers.push(...criticalAvailable.slice(0, 6));
            }

            // Urgent customers: All days
            const urgentAvailable = categories.urgent.filter(c => !usedCustomers.has(c.customer_code));
            const urgentPerDay = Math.ceil(urgentAvailable.length / 6);
            const urgentToAdd = urgentAvailable.slice(dayIndex * urgentPerDay, (dayIndex + 1) * urgentPerDay);
            availableCustomers.push(...urgentToAdd);

            // High churn: Mon-Fri + some Saturday
            if (dayIndex < 5) {
                const churnAvailable = categories.highChurn.filter(c => !usedCustomers.has(c.customer_code));
                const churnToAdd = churnAvailable.slice(dayIndex * 6, (dayIndex + 1) * 6);
                availableCustomers.push(...churnToAdd);
            } else if (dayIndex === 5) {
                const churnAvailable = categories.highChurn.filter(c => !usedCustomers.has(c.customer_code));
                availableCustomers.push(...churnAvailable.slice(0, 4));
            }

            // Medium priority: Mon-Sat
            if (dayIndex < 6) {
                const mediumAvailable = categories.mediumPriority.filter(c => !usedCustomers.has(c.customer_code));
                const mediumToAdd = mediumAvailable.slice(Math.floor(dayIndex / 2) * 4, (Math.floor(dayIndex / 2) + 1) * 4);
                availableCustomers.push(...mediumToAdd);
            }

            // Regular: Mon-Sat
            if (dayIndex < 6) {
                const regularAvailable = categories.regular.filter(c => !usedCustomers.has(c.customer_code));
                const regularToAdd = regularAvailable.slice(Math.floor(dayIndex / 2) * 5, (Math.floor(dayIndex / 2) + 1) * 5);
                availableCustomers.push(...regularToAdd);
            }

            // Prospects: Mon-Wed
            if (dayIndex < 3) {
                const prospectsAvailable = categories.prospects.filter(c => !usedCustomers.has(c.customer_code));
                const prospectsToAdd = prospectsAvailable.slice(dayIndex * 2, (dayIndex + 1) * 2);
                availableCustomers.push(...prospectsToAdd);
            }

            console.log(`🗓️ ${day}: ${availableCustomers.length} customers available`);

            if (availableCustomers.length > 0) {
                const maxVisitsForDay = dayIndex === 5 ? 8 : 11; // Saturday: 8, Weekdays: 11
                const maxTravelForDay = dayIndex === 5 ? 180 : 220; // Saturday shorter

                const dailyRoute = this.optimizeDailyRoute(availableCustomers, {
                    maxVisits: maxVisitsForDay,
                    maxTravelTime: maxTravelForDay,
                    prioritizeUrgency: true
                });

                weeklyRoutes[day] = {
                    ...dailyRoute,
                    day: day,
                    planned_date: this.getNextWeekday(dayIndex)
                };

                // Mark non-critical customers as used
                dailyRoute.route.forEach(customer => {
                    if (customer.priority_score < 80) {
                        usedCustomers.add(customer.customer_code);
                    }
                });

                console.log(`✅ ${day}: ${dailyRoute.total_customers} customers, ₹${dailyRoute.estimated_revenue} revenue`);
            } else {
                weeklyRoutes[day] = {
                    ...this.createEmptyRoute(),
                    day: day,
                    planned_date: this.getNextWeekday(dayIndex)
                };
            }
        });

        return {
            status: 'success',
            mr_name: mrName,
            total_customers_available: customers.length,
            weekly_routes: weeklyRoutes,
            weekly_summary: this.calculateWeeklySummary(weeklyRoutes),
            performance_distribution: categories,
            generated_at: new Date().toISOString()
        };
    }

    getNextWeekday(dayIndex) {
        const today = new Date();
        const daysUntilMonday = (1 + 7 - today.getDay()) % 7;
        const nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + daysUntilMonday);
        nextMonday.setDate(nextMonday.getDate() + dayIndex);
        return nextMonday.toISOString().split('T')[0];
    }

    calculateWeeklySummary(weeklyRoutes) {
        const days = Object.keys(weeklyRoutes);
        const totalCustomers = days.reduce((sum, day) => sum + weeklyRoutes[day].total_customers, 0);
        const totalRevenue = days.reduce((sum, day) => sum + weeklyRoutes[day].estimated_revenue, 0);
        const totalTravelTime = days.reduce((sum, day) => sum + weeklyRoutes[day].total_travel_time, 0);
        const totalDistance = days.reduce((sum, day) => sum + weeklyRoutes[day].total_distance, 0);
        
        const avgPriority = days.reduce((sum, day) => sum + (weeklyRoutes[day].avg_priority_score || 0), 0) / days.length;
        const avgUrgency = days.reduce((sum, day) => sum + (weeklyRoutes[day].avg_urgency_score || 0), 0) / days.length;

        return {
            total_customers_week: totalCustomers,
            total_estimated_revenue: Math.round(totalRevenue),
            total_travel_time: Math.round(totalTravelTime),
            total_distance: Math.round(totalDistance * 100) / 100,
            avg_customers_per_day: Math.round((totalCustomers / days.length) * 10) / 10,
            avg_revenue_per_day: Math.round(totalRevenue / days.length),
            avg_priority_score: Math.round(avgPriority * 10) / 10,
            avg_urgency_score: Math.round(avgUrgency * 10) / 10,
            efficiency_score: totalCustomers > 0 ? Math.round((totalRevenue / totalTravelTime) * 10) / 10 : 0
        };
    }

    createEmptyWeeklyRoutes() {
        const weeklyRoutes = {};
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        days.forEach((day, index) => {
            weeklyRoutes[day] = {
                ...this.createEmptyRoute(),
                day: day,
                planned_date: this.getNextWeekday(index)
            };
        });

        return {
            status: 'success',
            mr_name: 'Unknown',
            total_customers_available: 0,
            weekly_routes: weeklyRoutes,
            weekly_summary: this.calculateWeeklySummary(weeklyRoutes),
            generated_at: new Date().toISOString()
        };
    }

    clearCache() {
        this.cache.clear();
        console.log('🗑️ Route optimizer cache cleared');
    }

    getCacheStats() {
        return {
            cached_items: this.cache.size,
            cache_expiry_minutes: this.cacheExpiry / (60 * 1000)
        };
    }
}

// Export singleton instance
export const routeOptimizer = new RouteOptimizer();
export default RouteOptimizer;
