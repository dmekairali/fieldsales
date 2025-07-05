// src/services/RouteOptimizer.js - Updated with Strict Validation
import { supabase } from '../supabaseClient';

class RouteOptimizer {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    }

    // STRICT DATA VALIDATION - No fallbacks, clear errors
    validateCustomerData(customer, mrName) {
        const errors = [];
        
        // Check for required fields
        if (!customer.customer_code) errors.push('Missing customer_code');
        if (!customer.customer_name) errors.push('Missing customer_name');
        
        // Check coordinates - must be valid numbers
        if (customer.latitude === null || customer.latitude === undefined) {
            errors.push('latitude is null/undefined');
        } else {
            const lat = parseFloat(customer.latitude);
            if (isNaN(lat) || lat === 0) errors.push(`Invalid latitude: ${customer.latitude}`);
            if (lat < -90 || lat > 90) errors.push(`Latitude out of range: ${lat}`);
        }
        
        if (customer.longitude === null || customer.longitude === undefined) {
            errors.push('longitude is null/undefined');
        } else {
            const lng = parseFloat(customer.longitude);
            if (isNaN(lng) || lng === 0) errors.push(`Invalid longitude: ${customer.longitude}`);
            if (lng < -180 || lng > 180) errors.push(`Longitude out of range: ${lng}`);
        }
        
        // Check performance metrics - must be valid numbers
        if (customer.total_priority_score === null || customer.total_priority_score === undefined) {
            errors.push('total_priority_score is null/undefined');
        } else {
            const priority = parseFloat(customer.total_priority_score);
            if (isNaN(priority)) errors.push(`Invalid total_priority_score: ${customer.total_priority_score}`);
            if (priority < 0 || priority > 100) errors.push(`Priority score out of range: ${priority}`);
        }
        
        if (customer.churn_risk_score === null || customer.churn_risk_score === undefined) {
            errors.push('churn_risk_score is null/undefined');
        } else {
            const churn = parseFloat(customer.churn_risk_score);
            if (isNaN(churn)) errors.push(`Invalid churn_risk_score: ${customer.churn_risk_score}`);
            if (churn < 0 || churn > 1) errors.push(`Churn risk out of range: ${churn}`);
        }
        
        if (customer.order_probability === null || customer.order_probability === undefined) {
            errors.push('order_probability is null/undefined');
        } else {
            const prob = parseFloat(customer.order_probability);
            if (isNaN(prob)) errors.push(`Invalid order_probability: ${customer.order_probability}`);
            if (prob < 0 || prob > 1) errors.push(`Order probability out of range: ${prob}`);
        }
        
        if (customer.predicted_order_value === null || customer.predicted_order_value === undefined) {
            errors.push('predicted_order_value is null/undefined');
        } else {
            const value = parseFloat(customer.predicted_order_value);
            if (isNaN(value)) errors.push(`Invalid predicted_order_value: ${customer.predicted_order_value}`);
            if (value < 0) errors.push(`Negative predicted value: ${value}`);
        }
        
        // Check visit data
        if (customer.days_since_last_visit === null || customer.days_since_last_visit === undefined) {
            errors.push('days_since_last_visit is null/undefined');
        } else {
            const days = parseInt(customer.days_since_last_visit);
            if (isNaN(days)) errors.push(`Invalid days_since_last_visit: ${customer.days_since_last_visit}`);
            if (days < 0) errors.push(`Negative days since visit: ${days}`);
        }
        
        if (errors.length > 0) {
            console.error(`❌ DATA VALIDATION FAILED for ${mrName} - Customer: ${customer.customer_name} (${customer.customer_code})`);
            console.error(`🔍 Data Issues:`, errors);
            console.error(`📊 Raw Data:`, {
                latitude: customer.latitude,
                longitude: customer.longitude,
                total_priority_score: customer.total_priority_score,
                churn_risk_score: customer.churn_risk_score,
                order_probability: customer.order_probability,
                predicted_order_value: customer.predicted_order_value,
                days_since_last_visit: customer.days_since_last_visit
            });
            
            throw new Error(`DATA VALIDATION FAILED for MR: ${mrName}, Customer: ${customer.customer_name}. Issues: ${errors.join(', ')}`);
        }
        
        return true;
    }

    // Generate data quality report
    generateDataQualityReport(customers, mrName) {
        const report = {
            mr_name: mrName,
            total_customers: customers.length,
            data_issues: [],
            summary: {}
        };
        
        let validCustomers = 0;
        let coordinateIssues = 0;
        let performanceIssues = 0;
        
        customers.forEach(customer => {
            try {
                this.validateCustomerData(customer, mrName);
                validCustomers++;
            } catch (error) {
                const issue = {
                    customer_code: customer.customer_code,
                    customer_name: customer.customer_name,
                    error: error.message
                };
                
                if (error.message.includes('latitude') || error.message.includes('longitude')) {
                    coordinateIssues++;
                } else {
                    performanceIssues++;
                }
                
                report.data_issues.push(issue);
            }
        });
        
        report.summary = {
            valid_customers: validCustomers,
            coordinate_issues: coordinateIssues,
            performance_metric_issues: performanceIssues,
            data_quality_percentage: ((validCustomers / customers.length) * 100).toFixed(2)
        };
        
        console.log(`📊 DATA QUALITY REPORT for ${mrName}:`, report);
        return report;
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
                console.error('❌ Database error:', error);
                throw new Error(`Database error: ${error.message}`);
            }

            if (!customers || customers.length === 0) {
                console.log('📋 No customers found with performance data');
                return [];
            }

            // Generate data quality report
            const qualityReport = this.generateDataQualityReport(customers, mrName);
            
            // If data quality is below 95%, throw error
            if (qualityReport.summary.data_quality_percentage < 95) {
                throw new Error(`DATA QUALITY TOO LOW for ${mrName}: ${qualityReport.summary.data_quality_percentage}% valid. Fix database first.`);
            }

            // Enrich with calculated urgency scores - STRICT VALIDATION
            const enrichedCustomers = customers.map(customer => {
                // STRICT VALIDATION - No fallbacks, fail fast
                this.validateCustomerData(customer, mrName);
                
                // Convert to numbers - throw error if conversion fails
                const priorityScore = parseFloat(customer.total_priority_score);
                const churnRisk = parseFloat(customer.churn_risk_score);
                const orderProbability = parseFloat(customer.order_probability);
                const predictedValue = parseFloat(customer.predicted_order_value);
                const daysSinceVisit = parseInt(customer.days_since_last_visit);
                const latitude = parseFloat(customer.latitude);
                const longitude = parseFloat(customer.longitude);
                
                // Double-check conversions succeeded
                if (isNaN(priorityScore) || isNaN(churnRisk) || isNaN(orderProbability) || 
                    isNaN(predictedValue) || isNaN(daysSinceVisit) || isNaN(latitude) || isNaN(longitude)) {
                    throw new Error(`CONVERSION FAILED for ${customer.customer_name}: Some values could not be converted to numbers`);
                }
                
                const urgencyScore = this.calculateUrgencyScore(priorityScore, churnRisk, daysSinceVisit);
                
                console.log(`✅ Validated ${customer.customer_name}: P=${priorityScore}, C=${churnRisk}, U=${urgencyScore}`);

                return {
                    ...customer,
                    priority_score: priorityScore,
                    churn_risk: churnRisk,
                    order_probability: orderProbability,
                    predicted_value: predictedValue,
                    predicted_order_value: predictedValue,
                    urgency_score: urgencyScore,
                    latitude: latitude,
                    longitude: longitude,
                    days_since_last_visit: daysSinceVisit,
                    route_position: null,
                    visited_in_route: false
                };
            });

            // Cache results
            this.cache.set(cacheKey, {
                data: enrichedCustomers,
                timestamp: Date.now()
            });

            console.log(`✅ Loaded ${enrichedCustomers.length} VALIDATED customers for ${mrName}`);
            return enrichedCustomers;

        } catch (error) {
            console.error('❌ STRICT VALIDATION FAILED:', error);
            throw error; // Re-throw to force fixing the issue
        }
    }

    // Calculate urgency score - STRICT VERSION
    calculateUrgencyScore(priorityScore, churnRisk, daysSinceVisit) {
        // No fallbacks - values must be valid numbers
        if (typeof priorityScore !== 'number' || isNaN(priorityScore)) {
            throw new Error(`Invalid priorityScore for urgency calculation: ${priorityScore}`);
        }
        if (typeof churnRisk !== 'number' || isNaN(churnRisk)) {
            throw new Error(`Invalid churnRisk for urgency calculation: ${churnRisk}`);
        }
        if (typeof daysSinceVisit !== 'number' || isNaN(daysSinceVisit)) {
            throw new Error(`Invalid daysSinceVisit for urgency calculation: ${daysSinceVisit}`);
        }
        
        let urgency = priorityScore * 0.6;
        urgency += churnRisk * 30;
        
        if (daysSinceVisit > 60) urgency += 20;
        else if (daysSinceVisit > 45) urgency += 15;
        else if (daysSinceVisit > 30) urgency += 10;
        else if (daysSinceVisit > 14) urgency += 5;
        
        const finalScore = Math.min(Math.max(urgency, 10), 100);
        return finalScore;
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

        // Validate customers have required fields for routing
        const validCustomers = customers.filter(c => 
            c.latitude && c.longitude && 
            c.priority_score !== undefined &&
            c.urgency_score !== undefined &&
            !isNaN(parseFloat(c.latitude)) && !isNaN(parseFloat(c.longitude))
        );

        console.log(`📊 Valid customers for routing: ${validCustomers.length}/${customers.length}`);

        if (validCustomers.length === 0) {
            console.warn(`⚠️ No valid customers found for routing`);
            return this.createEmptyRoute();
        }

        // Select optimal customers
        const selectedCustomers = this.selectOptimalCustomers(validCustomers, maxVisits);
        
        if (selectedCustomers.length === 0) {
            console.warn(`⚠️ No customers selected after optimization`);
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

    // Select optimal customers using performance metrics - WITH DETAILED LOGGING
    selectOptimalCustomers(customers, maxVisits) {
        console.log(`🔍 Selecting customers from ${customers.length} available`);
        
        const highPriority = customers.filter(c => {
            const passes = c.priority_score >= 80;
            if (passes) console.log(`✅ ${c.customer_name} in HIGH PRIORITY: ${c.priority_score}`);
            return passes;
        });
        
        const mediumUrgent = customers.filter(c => {
            const passes = c.priority_score >= 60 && c.priority_score < 80 && c.urgency_score >= 70;
            if (c.priority_score >= 60 && c.priority_score < 80) {
                if (passes) {
                    console.log(`✅ ${c.customer_name} in MEDIUM URGENT: P=${c.priority_score}, U=${c.urgency_score}`);
                } else {
                    console.log(`❌ ${c.customer_name} failed medium urgent: urgency=${c.urgency_score} < 70`);
                }
            }
            return passes;
        });
        
        const highChurnRisk = customers.filter(c => {
            const passes = c.churn_risk > 0.7 && c.priority_score >= 40;
            if (passes) console.log(`✅ ${c.customer_name} in HIGH CHURN: ${c.churn_risk}`);
            return passes;
        });
        
        const highRevenue = customers.filter(c => {
            const passes = c.predicted_value > 10000 && c.order_probability > 0.2;
            if (passes) console.log(`✅ ${c.customer_name} in HIGH REVENUE: ₹${c.predicted_value}, ${c.order_probability}`);
            return passes;
        });

        console.log(`📊 Customer categories:`, {
            total: customers.length,
            highPriority: highPriority.length,
            mediumUrgent: mediumUrgent.length,
            highChurnRisk: highChurnRisk.length,
            highRevenue: highRevenue.length
        });

        const selected = [];
        const selectedCodes = new Set();

        // Add customers by priority with detailed logging
        const groups = [
            { name: 'HIGH_PRIORITY', customers: highPriority },
            { name: 'MEDIUM_URGENT', customers: mediumUrgent },
            { name: 'HIGH_CHURN_RISK', customers: highChurnRisk },
            { name: 'HIGH_REVENUE', customers: highRevenue }
        ];

        groups.forEach(group => {
            console.log(`🎯 Processing ${group.name}: ${group.customers.length} customers`);
            group.customers.forEach(customer => {
                if (selected.length < maxVisits && !selectedCodes.has(customer.customer_code)) {
                    selected.push(customer);
                    selectedCodes.add(customer.customer_code);
                    console.log(`✅ Added ${customer.customer_name} from ${group.name}`);
                }
            });
        });

        // Fill remaining slots by urgency
        if (selected.length < maxVisits) {
            const remaining = customers.filter(c => !selectedCodes.has(c.customer_code))
                .sort((a, b) => b.urgency_score - a.urgency_score);
            
            console.log(`🔄 Filling remaining slots: ${remaining.length} candidates available`);
            
            remaining.forEach(customer => {
                if (selected.length < maxVisits) {
                    selected.push(customer);
                    selectedCodes.add(customer.customer_code);
                    console.log(`✅ Added ${customer.customer_name} by urgency: ${customer.urgency_score}`);
                }
            });
        }

        console.log(`🎯 Final selection: ${selected.length} customers chosen`);
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

    // Calculate route metrics with proper distance summation and debugging
    calculateRouteMetrics(route, startLocation, includeReturnTime) {
        if (!route || route.length === 0) {
            return this.createEmptyRoute();
        }

        let totalTravelTime = 0;
        let totalRevenue = 0;
        let totalDistance = 0;
        let totalVisitTime = 0;

        console.log('🔍 Calculating route metrics:');
        
        // Sum up the actual travel distances and times from the route
        route.forEach((customer, index) => {
            const distance = customer.distance_from_previous || 0;
            const travelTime = customer.travel_time_from_previous || 0;
            const visitTime = customer.estimated_visit_time || 35;
            
            console.log(`  Customer ${index + 1}: ${distance.toFixed(2)}km, ${travelTime.toFixed(0)}min`);
            
            totalDistance += distance;
            totalTravelTime += travelTime;
            totalRevenue += customer.expected_revenue || 0;
            totalVisitTime += visitTime;
        });

        // Add return journey if requested
        let returnDistance = 0;
        let returnTime = 0;
        if (includeReturnTime && startLocation && route.length > 0) {
            const lastCustomer = route[route.length - 1];
            returnDistance = this.calculateDistance(
                lastCustomer.latitude, lastCustomer.longitude,
                startLocation.latitude, startLocation.longitude
            );
            returnTime = this.calculateTravelTime(returnDistance);
            totalDistance += returnDistance;
            totalTravelTime += returnTime;
            console.log(`  Return journey: ${returnDistance.toFixed(2)}km, ${returnTime.toFixed(0)}min`);
        }

        console.log(`📊 Total calculated: ${totalDistance.toFixed(2)}km, ${totalTravelTime.toFixed(0)}min`);

        const avgPriority = route.reduce((sum, c) => sum + c.priority_score, 0) / route.length;
        const avgUrgency = route.reduce((sum, c) => sum + c.urgency_score, 0) / route.length;
        const avgChurnRisk = route.reduce((sum, c) => sum + c.churn_risk, 0) / route.length;
        const avgOrderProb = route.reduce((sum, c) => sum + c.order_probability, 0) / route.length;

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
            return_distance: returnDistance,
            return_time: returnTime,
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
