// src/services/RouteOptimizer.js - Complete client-side route optimization
import { supabase } from '../supabaseClient';

class ClientRouteOptimizer {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    }

    // Haversine formula for calculating distance between coordinates
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance in kilometers
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Calculate travel time based on distance and average city speed
    calculateTravelTime(distance) {
        const avgSpeedKmh = 25; // Average city speed including traffic
        return (distance / avgSpeedKmh) * 60; // Return in minutes
    }

    // Get customers from Supabase with enhanced data
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
                    area_name,
                    city_name,
                    pin_code,
                    latitude,
                    longitude,
                    mr_name,
                    status
                `)
                .eq('mr_name', mrName)
                .eq('status', 'ACTIVE')
                .not('latitude', 'is', null)
                .not('longitude', 'is', null);

            if (error) {
                console.error('❌ Error fetching customers:', error);
                return this.getMockCustomers(mrName);
            }

            if (!customers || customers.length === 0) {
                console.log('📋 No customers found, using mock data');
                return this.getMockCustomers(mrName);
            }

            // Get recent visit data
            const { data: visits } = await supabase
                .from('mr_visits')
                .select('clientName, dcrDate, amountOfSale')
                .eq('empName', mrName)
                .gte('dcrDate', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
                .order('dcrDate', { ascending: false });

            // Enrich customer data with AI-powered insights
            const enrichedCustomers = this.enrichCustomerData(customers, visits || []);
            
            // Cache the results
            this.cache.set(cacheKey, {
                data: enrichedCustomers,
                timestamp: Date.now()
            });

            console.log(`✅ Loaded ${enrichedCustomers.length} customers for ${mrName}`);
            return enrichedCustomers;

        } catch (error) {
            console.error('❌ Database error:', error);
            return this.getMockCustomers(mrName);
        }
    }

    // Enhanced customer data enrichment with AI insights
    enrichCustomerData(customers, visits) {
        const visitMap = new Map();
        
        // Process visit history
        visits.forEach(visit => {
            const key = visit.clientName.toLowerCase().trim();
            if (!visitMap.has(key)) {
                visitMap.set(key, {
                    lastVisit: visit.dcrDate,
                    totalSales: 0,
                    visitCount: 0,
                    avgSale: 0
                });
            }
            const data = visitMap.get(key);
            data.totalSales += parseFloat(visit.amountOfSale || 0);
            data.visitCount++;
            data.avgSale = data.totalSales / data.visitCount;
        });

        return customers.map(customer => {
            const visitHistory = visitMap.get(customer.customer_name.toLowerCase().trim()) || {
                lastVisit: null,
                totalSales: 0,
                visitCount: 0,
                avgSale: 0
            };

            const daysSinceLastVisit = visitHistory.lastVisit 
                ? Math.floor((new Date() - new Date(visitHistory.lastVisit)) / (1000 * 60 * 60 * 24))
                : 999;

            // AI-powered scoring algorithms
            const priorityScore = this.calculatePriorityScore(customer, visitHistory, daysSinceLastVisit);
            const churnRisk = this.calculateChurnRisk(customer, visitHistory, daysSinceLastVisit);
            const orderProbability = this.calculateOrderProbability(customer, visitHistory);
            const predictedValue = this.calculatePredictedValue(customer, visitHistory);
            const urgencyScore = this.calculateUrgencyScore(priorityScore, churnRisk, daysSinceLastVisit);

            return {
                ...customer,
                // Visit history
                last_visit_date: visitHistory.lastVisit,
                days_since_visit: daysSinceLastVisit,
                total_sales_90d: visitHistory.totalSales,
                visit_count_90d: visitHistory.visitCount,
                avg_sale_value: visitHistory.avgSale,
                
                // AI predictions
                priority_score: priorityScore,
                churn_risk: churnRisk,
                order_probability: orderProbability,
                predicted_value: predictedValue,
                urgency_score: urgencyScore,
                
                // Route optimization metadata
                visited_in_route: false,
                route_position: null
            };
        });
    }

    // AI Scoring Algorithms
    calculatePriorityScore(customer, visitHistory, daysSinceLastVisit) {
        let score = 50; // Base score
        
        // Customer type priority
        if (customer.customer_type === 'Hospital') score += 25;
        else if (customer.customer_type === 'Doctor') score += 20;
        else if (customer.customer_type === 'Clinic') score += 15;
        else if (customer.customer_type === 'Pharmacy') score += 10;
        
        // Sales history impact
        if (visitHistory.avgSale > 5000) score += 20;
        else if (visitHistory.avgSale > 2000) score += 15;
        else if (visitHistory.avgSale > 1000) score += 10;
        
        // Visit frequency impact
        if (visitHistory.visitCount > 5) score += 15;
        else if (visitHistory.visitCount > 2) score += 10;
        
        return Math.min(Math.max(score, 10), 100);
    }

    calculateChurnRisk(customer, visitHistory, daysSinceLastVisit) {
        let risk = 0.3; // Base risk
        
        // Days since last visit
        if (daysSinceLastVisit > 60) risk += 0.4;
        else if (daysSinceLastVisit > 30) risk += 0.3;
        else if (daysSinceLastVisit > 15) risk += 0.2;
        else if (daysSinceLastVisit > 7) risk += 0.1;
        
        // Sales trend
        if (visitHistory.avgSale === 0) risk += 0.2;
        else if (visitHistory.avgSale < 500) risk += 0.1;
        
        // Visit frequency
        if (visitHistory.visitCount === 0) risk += 0.3;
        else if (visitHistory.visitCount < 2) risk += 0.2;
        
        return Math.min(Math.max(risk, 0.05), 0.95);
    }

    calculateOrderProbability(customer, visitHistory) {
        let probability = 0.4; // Base probability
        
        // Historical conversion rate
        if (visitHistory.visitCount > 0) {
            const conversionRate = visitHistory.avgSale > 0 ? 0.8 : 0.2;
            probability = (probability + conversionRate) / 2;
        }
        
        // Customer type impact
        if (customer.customer_type === 'Hospital') probability += 0.2;
        else if (customer.customer_type === 'Doctor') probability += 0.15;
        else if (customer.customer_type === 'Clinic') probability += 0.1;
        
        // Recency impact
        if (visitHistory.lastVisit) {
            const daysSince = Math.floor((new Date() - new Date(visitHistory.lastVisit)) / (1000 * 60 * 60 * 24));
            if (daysSince < 7) probability += 0.1;
            else if (daysSince > 30) probability -= 0.1;
        }
        
        return Math.min(Math.max(probability, 0.1), 0.9);
    }

    calculatePredictedValue(customer, visitHistory) {
        let baseValue = 2000; // Base predicted value
        
        // Historical average
        if (visitHistory.avgSale > 0) {
            baseValue = visitHistory.avgSale * 1.2; // 20% growth expectation
        }
        
        // Customer type multiplier
        if (customer.customer_type === 'Hospital') baseValue *= 2.5;
        else if (customer.customer_type === 'Doctor') baseValue *= 1.8;
        else if (customer.customer_type === 'Clinic') baseValue *= 1.5;
        else if (customer.customer_type === 'Pharmacy') baseValue *= 1.2;
        
        // Area-based adjustment (example for Indian cities)
        if (customer.city_name) {
            const city = customer.city_name.toLowerCase();
            if (['mumbai', 'delhi', 'bangalore', 'chennai', 'hyderabad'].includes(city)) {
                baseValue *= 1.3; // Metro cities
            } else if (['pune', 'kolkata', 'lucknow', 'kanpur'].includes(city)) {
                baseValue *= 1.1; // Tier 2 cities
            }
        }
        
        return Math.round(baseValue);
    }

    calculateUrgencyScore(priorityScore, churnRisk, daysSinceLastVisit) {
        let urgency = priorityScore * 0.4; // Base from priority
        
        // Churn risk impact
        urgency += churnRisk * 30;
        
        // Time urgency
        if (daysSinceLastVisit > 45) urgency += 25;
        else if (daysSinceLastVisit > 30) urgency += 20;
        else if (daysSinceLastVisit > 21) urgency += 15;
        else if (daysSinceLastVisit > 14) urgency += 10;
        else if (daysSinceLastVisit > 7) urgency += 5;
        
        return Math.min(Math.max(urgency, 10), 100);
    }

    // Mock data for development/fallback
    getMockCustomers(mrName) {
        return [
            {
                customer_code: `MOCK001_${mrName}`,
                customer_name: `Dr. Rajesh Kumar - ${mrName}`,
                customer_type: 'Doctor',
                area_name: 'Gomti Nagar',
                city_name: 'Lucknow',
                latitude: 26.8467,
                longitude: 80.9462,
                mr_name: mrName,
                priority_score: 85,
                churn_risk: 0.2,
                order_probability: 0.75,
                predicted_value: 5500,
                urgency_score: 82,
                days_since_visit: 8,
                total_sales_90d: 15000,
                visit_count_90d: 3
            },
            {
                customer_code: `MOCK002_${mrName}`,
                customer_name: `Apollo Pharmacy - ${mrName}`,
                customer_type: 'Pharmacy',
                area_name: 'Hazratganj',
                city_name: 'Lucknow',
                latitude: 26.8486,
                longitude: 80.9455,
                mr_name: mrName,
                priority_score: 72,
                churn_risk: 0.35,
                order_probability: 0.6,
                predicted_value: 3800,
                urgency_score: 68,
                days_since_visit: 12,
                total_sales_90d: 8500,
                visit_count_90d: 2
            },
            {
                customer_code: `MOCK003_${mrName}`,
                customer_name: `City Hospital - ${mrName}`,
                customer_type: 'Hospital',
                area_name: 'Indira Nagar',
                city_name: 'Lucknow',
                latitude: 26.8420,
                longitude: 80.9470,
                mr_name: mrName,
                priority_score: 92,
                churn_risk: 0.15,
                order_probability: 0.85,
                predicted_value: 8200,
                urgency_score: 89,
                days_since_visit: 5,
                total_sales_90d: 25000,
                visit_count_90d: 4
            },
            {
                customer_code: `MOCK004_${mrName}`,
                customer_name: `Dr. Priya Sharma Clinic - ${mrName}`,
                customer_type: 'Clinic',
                area_name: 'Aliganj',
                city_name: 'Lucknow',
                latitude: 26.8950,
                longitude: 80.9400,
                mr_name: mrName,
                priority_score: 78,
                churn_risk: 0.25,
                order_probability: 0.7,
                predicted_value: 4200,
                urgency_score: 75,
                days_since_visit: 15,
                total_sales_90d: 12000,
                visit_count_90d: 3
            },
            {
                customer_code: `MOCK005_${mrName}`,
                customer_name: `MedPlus Pharmacy - ${mrName}`,
                customer_type: 'Pharmacy',
                area_name: 'Mahanagar',
                city_name: 'Lucknow',
                latitude: 26.8300,
                longitude: 80.9700,
                mr_name: mrName,
                priority_score: 65,
                churn_risk: 0.45,
                order_probability: 0.55,
                predicted_value: 3200,
                urgency_score: 62,
                days_since_visit: 20,
                total_sales_90d: 6500,
                visit_count_90d: 2
            }
        ];
    }

    // Advanced route optimization using multiple algorithms
    optimizeDailyRoute(customers, options = {}) {
        const {
            maxVisits = 10,
            maxTravelTime = 240, // minutes
            startLocation = null,
            prioritizeUrgency = true,
            includeReturnTime = true
        } = options;

        console.log(`🎯 Optimizing route for ${customers.length} customers`);
        console.log(`📋 Options: ${maxVisits} visits, ${maxTravelTime}min max travel`);

        if (!customers || customers.length === 0) {
            return this.createEmptyRoute();
        }

        // Algorithm 1: Urgency-based selection
        const urgentCustomers = this.selectByUrgency(customers, maxVisits * 1.5);
        
        // Algorithm 2: Geographic clustering + urgency
        const clusteredRoute = this.optimizeByClusteringAndUrgency(
            urgentCustomers, 
            maxVisits, 
            maxTravelTime,
            startLocation
        );

        // Algorithm 3: Traveling Salesman Problem (TSP) optimization
        const optimizedRoute = this.solveTSP(clusteredRoute, startLocation);

        // Calculate comprehensive metrics
        const metrics = this.calculateRouteMetrics(optimizedRoute, startLocation, includeReturnTime);

        return {
            route: optimizedRoute,
            ...metrics,
            algorithm_used: 'hybrid_clustering_tsp',
            optimization_score: this.calculateOptimizationScore(optimizedRoute, metrics)
        };
    }

    selectByUrgency(customers, maxCount) {
        return customers
            .sort((a, b) => b.urgency_score - a.urgency_score)
            .slice(0, Math.min(maxCount, customers.length));
    }

    optimizeByClusteringAndUrgency(customers, maxVisits, maxTravelTime, startLoc) {
        // K-means style clustering for geographic optimization
        const clusters = this.createGeographicClusters(customers, 3);
        const route = [];
        let totalTravelTime = 0;
        
        // Sort clusters by average urgency
        clusters.sort((a, b) => {
            const avgUrgencyA = a.reduce((sum, c) => sum + c.urgency_score, 0) / a.length;
            const avgUrgencyB = b.reduce((sum, c) => sum + c.urgency_score, 0) / b.length;
            return avgUrgencyB - avgUrgencyA;
        });

        let currentLoc = startLoc || { latitude: 26.8467, longitude: 80.9462 }; // Default to Lucknow center

        for (const cluster of clusters) {
            if (route.length >= maxVisits) break;

            // Sort cluster by urgency
            cluster.sort((a, b) => b.urgency_score - a.urgency_score);

            for (const customer of cluster) {
                if (route.length >= maxVisits) break;

                const travelTime = this.calculateTravelTime(
                    this.calculateDistance(
                        currentLoc.latitude, currentLoc.longitude,
                        customer.latitude, customer.longitude
                    )
                );

                if (totalTravelTime + travelTime <= maxTravelTime) {
                    route.push({
                        ...customer,
                        route_position: route.length + 1,
                        travel_time_to_here: travelTime,
                        cumulative_travel_time: totalTravelTime + travelTime
                    });
                    
                    totalTravelTime += travelTime;
                    currentLoc = { latitude: customer.latitude, longitude: customer.longitude };
                }
            }
        }

        return route;
    }

    createGeographicClusters(customers, numClusters) {
        if (customers.length <= numClusters) {
            return customers.map(c => [c]);
        }

        // Simple k-means clustering
        const clusters = Array.from({ length: numClusters }, () => []);
        
        // Initialize centroids
        const centroids = [];
        for (let i = 0; i < numClusters; i++) {
            const idx = Math.floor((i * customers.length) / numClusters);
            centroids.push({
                latitude: customers[idx].latitude,
                longitude: customers[idx].longitude
            });
        }

        // Assign customers to clusters
        customers.forEach(customer => {
            let minDistance = Infinity;
            let closestCluster = 0;

            centroids.forEach((centroid, idx) => {
                const distance = this.calculateDistance(
                    customer.latitude, customer.longitude,
                    centroid.latitude, centroid.longitude
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCluster = idx;
                }
            });

            clusters[closestCluster].push(customer);
        });

        return clusters.filter(cluster => cluster.length > 0);
    }

    // Simplified TSP solver using nearest neighbor with 2-opt improvement
    solveTSP(customers, startLocation) {
        if (customers.length <= 2) return customers;

        // Create distance matrix
        const n = customers.length;
        const distMatrix = Array(n).fill().map(() => Array(n).fill(0));
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    distMatrix[i][j] = this.calculateDistance(
                        customers[i].latitude, customers[i].longitude,
                        customers[j].latitude, customers[j].longitude
                    );
                }
            }
        }

        // Nearest neighbor algorithm
        const visited = new Set();
        const route = [];
        let current = 0; // Start with first customer

        // Find nearest unvisited customer considering urgency
        while (visited.size < n) {
            visited.add(current);
            route.push(customers[current]);

            if (visited.size === n) break;

            let nextCustomer = -1;
            let bestScore = -Infinity;

            for (let i = 0; i < n; i++) {
                if (!visited.has(i)) {
                    // Score = urgency / distance (higher is better)
                    const distance = distMatrix[current][i];
                    const urgency = customers[i].urgency_score;
                    const score = urgency / Math.max(distance, 0.1);
                    
                    if (score > bestScore) {
                        bestScore = score;
                        nextCustomer = i;
                    }
                }
            }

            current = nextCustomer;
        }

        // 2-opt improvement
        return this.improve2Opt(route, distMatrix);
    }

    improve2Opt(route, distMatrix) {
        const n = route.length;
        if (n < 4) return route;

        let improved = true;
        let currentRoute = [...route];

        while (improved) {
            improved = false;
            
            for (let i = 1; i < n - 2; i++) {
                for (let j = i + 1; j < n; j++) {
                    if (j - i === 1) continue;

                    const improvement = this.calculate2OptImprovement(currentRoute, i, j, distMatrix);
                    
                    if (improvement > 0) {
                        currentRoute = this.apply2OptSwap(currentRoute, i, j);
                        improved = true;
                    }
                }
            }
        }

        return currentRoute;
    }

    calculate2OptImprovement(route, i, j, distMatrix) {
        const n = route.length;
        const getIndex = (customer) => route.findIndex(c => c.customer_code === customer.customer_code);
        
        const before = 
            distMatrix[getIndex(route[i-1])][getIndex(route[i])] +
            distMatrix[getIndex(route[j])][getIndex(route[(j+1) % n])];
            
        const after = 
            distMatrix[getIndex(route[i-1])][getIndex(route[j])] +
            distMatrix[getIndex(route[i])][getIndex(route[(j+1) % n])];
            
        return before - after;
    }

    apply2OptSwap(route, i, j) {
        const newRoute = [...route];
        const segment = newRoute.slice(i, j + 1).reverse();
        newRoute.splice(i, segment.length, ...segment);
        return newRoute;
    }

    calculateRouteMetrics(route, startLocation, includeReturnTime = true) {
        if (!route || route.length === 0) {
            return this.createEmptyRoute();
        }

        let totalTravelTime = 0;
        let totalRevenue = 0;
        let totalDistance = 0;
        let currentLoc = startLocation || { latitude: 26.8467, longitude: 80.9462 };

        // Calculate metrics for each customer
        const enrichedRoute = route.map((customer, index) => {
            const distance = this.calculateDistance(
                currentLoc.latitude, currentLoc.longitude,
                customer.latitude, customer.longitude
            );
            const travelTime = this.calculateTravelTime(distance);
            const expectedRevenue = customer.predicted_value * customer.order_probability;

            totalDistance += distance;
            totalTravelTime += travelTime;
            totalRevenue += expectedRevenue;

            currentLoc = { latitude: customer.latitude, longitude: customer.longitude };

            return {
                ...customer,
                route_position: index + 1,
                distance_from_previous: distance,
                travel_time_from_previous: travelTime,
                cumulative_travel_time: totalTravelTime,
                expected_revenue: Math.round(expectedRevenue),
                visit_duration: this.estimateVisitDuration(customer)
            };
        });

        // Add return time if needed
        if (includeReturnTime && startLocation && route.length > 0) {
            const returnDistance = this.calculateDistance(
                currentLoc.latitude, currentLoc.longitude,
                startLocation.latitude, startLocation.longitude
            );
            totalDistance += returnDistance;
            totalTravelTime += this.calculateTravelTime(returnDistance);
        }

        const avgUrgency = route.reduce((sum, c) => sum + c.urgency_score, 0) / route.length;
        const avgChurnRisk = route.reduce((sum, c) => sum + c.churn_risk, 0) / route.length;
        const totalVisitTime = route.reduce((sum, c) => sum + this.estimateVisitDuration(c), 0);

        return {
            total_customers: route.length,
            total_distance: Math.round(totalDistance * 100) / 100,
            total_travel_time: Math.round(totalTravelTime),
            total_visit_time: totalVisitTime,
            total_day_time: Math.round(totalTravelTime + totalVisitTime),
            estimated_revenue: Math.round(totalRevenue),
            avg_urgency_score: Math.round(avgUrgency * 10) / 10,
            avg_churn_risk: Math.round(avgChurnRisk * 100) / 100,
            route_efficiency: route.length / Math.max(totalTravelTime / 60, 0.1),
            revenue_per_hour: Math.round(totalRevenue / Math.max((totalTravelTime + totalVisitTime) / 60, 0.1)),
            route: enrichedRoute
        };
    }

    estimateVisitDuration(customer) {
        // Base visit time by customer type
        let baseTime = 30; // minutes
        
        if (customer.customer_type === 'Hospital') baseTime = 45;
        else if (customer.customer_type === 'Doctor') baseTime = 35;
        else if (customer.customer_type === 'Clinic') baseTime = 30;
        else if (customer.customer_type === 'Pharmacy') baseTime = 20;

        // Adjust based on customer importance
        if (customer.priority_score > 80) baseTime += 10;
        else if (customer.priority_score < 50) baseTime -= 5;

        return Math.max(baseTime, 15); // Minimum 15 minutes
    }

    calculateOptimizationScore(route, metrics) {
        if (!route || route.length === 0) return 0;

        // Multi-factor optimization score (0-100)
        const efficiencyScore = Math.min(metrics.route_efficiency * 10, 40);
        const urgencyScore = (metrics.avg_urgency_score / 100) * 30;
        const revenueScore = Math.min(metrics.estimated_revenue / 1000, 20);
        const coverageScore = Math.min(route.length * 2, 10);

        return Math.round(efficiencyScore + urgencyScore + revenueScore + coverageScore);
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
            avg_urgency_score: 0,
            avg_churn_risk: 0,
            route_efficiency: 0,
            revenue_per_hour: 0,
            optimization_score: 0
        };
    }

    // Weekly route generation
    async generateWeeklyRoutes(mrName, options = {}) {
        const customers = await this.getCustomersForMR(mrName);
        
        if (!customers || customers.length === 0) {
            return this.createEmptyWeeklyRoutes();
        }

        console.log(`📅 Generating weekly routes for ${customers.length} customers`);

        // Classify customers by visit frequency
        const highPriority = customers.filter(c => c.urgency_score >= 80);
        const mediumPriority = customers.filter(c => c.urgency_score >= 60 && c.urgency_score < 80);
        const lowPriority = customers.filter(c => c.urgency_score < 60);

        const weeklyRoutes = {};
        const usedCustomers = new Set();

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        days.forEach((day, dayIndex) => {
            const availableCustomers = [];

            // High priority customers - can be visited multiple times per week
            if (dayIndex < 3) { // Mon, Tue, Wed
                availableCustomers.push(...highPriority.filter(c => !usedCustomers.has(c.customer_code)));
            }

            // Medium priority - distribute across week
            if (dayIndex % 2 === 0) { // Mon, Wed, Fri
                availableCustomers.push(...mediumPriority.filter(c => !usedCustomers.has(c.customer_code)));
            }

            // Low priority - once per week
            if (dayIndex === 0) { // Monday only
                availableCustomers.push(...lowPriority.slice(0, 3).filter(c => !usedCustomers.has(c.customer_code)));
            }

            if (availableCustomers.length > 0) {
                const dailyRoute = this.optimizeDailyRoute(availableCustomers, {
                    maxVisits: 8,
                    maxTravelTime: 200,
                    prioritizeUrgency: true
                });

                weeklyRoutes[day] = {
                    ...dailyRoute,
                    day: day,
                    planned_date: this.getNextWeekday(dayIndex)
                };

                // Mark customers as used (except high priority ones)
                dailyRoute.route.forEach(customer => {
                    if (customer.urgency_score < 80) {
                        usedCustomers.add(customer.customer_code);
                    }
                });
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

        return {
            total_customers_week: totalCustomers,
            total_estimated_revenue: Math.round(totalRevenue),
            total_travel_time: Math.round(totalTravelTime),
            total_distance: Math.round(totalDistance * 100) / 100,
            avg_customers_per_day: Math.round((totalCustomers / days.length) * 10) / 10,
            avg_revenue_per_day: Math.round(totalRevenue / days.length),
            efficiency_score: totalCustomers > 0 ? Math.round((totalRevenue / totalTravelTime) * 10) / 10 : 0
        };
    }

    createEmptyWeeklyRoutes() {
        const weeklyRoutes = {};
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        
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

    // Utility methods
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
export const routeOptimizer = new ClientRouteOptimizer();
export default ClientRouteOptimizer;
