# Route Optimization Algorithm - Fixed for your schema
import numpy as np
from geopy.distance import geodesic
from scipy.optimize import minimize
import asyncpg
import json
import os
from fastapi import FastAPI, HTTPException

class RouteOptimizer:
    def __init__(self, db_url):
        self.db_url = db_url
        
    async def get_customer_data(self, mr_name: str, date: str = None):
        """Fetch customer data for route optimization"""
        conn = await asyncpg.connect(self.db_url)
        try:
            query = """
            SELECT DISTINCT
                c.customer_code,
                c.customer_name,
                c.customer_type,
                c.pin_code,
                c.city_name,
                c.area_name,
                c.latitude,
                c.longitude,
                -- Priority calculation from performance view
                COALESCE(performance.total_priority_score, 30) as priority_score,
                COALESCE(performance.churn_risk_score, 0.5) as churn_risk,
                COALESCE(performance.order_probability, 0.3) as order_probability,
                COALESCE(performance.predicted_order_value, 3000) as predicted_value,
                
                -- Last visit info from mr_visits
                last_visits.last_visit_date,
                last_visits.days_since_visit
                
            FROM customer_master c
            LEFT JOIN customer_performance performance ON c.customer_code = performance.customer_code
            LEFT JOIN (
                SELECT 
                    "clientMobileNo",
                    MAX("dcrDate") as last_visit_date,
                    CURRENT_DATE - MAX("dcrDate") as days_since_visit
                FROM mr_visits 
                WHERE "empName" = $1
                GROUP BY "clientMobileNo"
            ) last_visits ON c.customer_phone = last_visits."clientMobileNo"
            WHERE c.mr_name = $1
                AND c.status = 'ACTIVE'
                AND c.latitude IS NOT NULL 
                AND c.longitude IS NOT NULL
            ORDER BY performance.total_priority_score DESC, performance.churn_risk_score DESC
            """
            
            rows = await conn.fetch(query, mr_name)
            return [dict(row) for row in rows]
        finally:
            await conn.close()
    
    def calculate_travel_matrix(self, customers):
        """Calculate travel time/distance matrix between customers"""
        n = len(customers)
        travel_matrix = np.zeros((n, n))
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    coord1 = (customers[i]['latitude'], customers[i]['longitude'])
                    coord2 = (customers[j]['latitude'], customers[j]['longitude'])
                    distance = geodesic(coord1, coord2).kilometers
                    # Assume 25 km/hr average speed in Indian cities (traffic)
                    travel_time = distance / 25 * 60  # in minutes
                    travel_matrix[i][j] = travel_time
        
        return travel_matrix
    
    def calculate_customer_urgency(self, customer):
        """Calculate urgency score for customer"""
        urgency_score = 0
        
        # High priority customers (0-40 points)
        urgency_score += customer['priority_score'] * 0.4
        
        # Churn risk (0-30 points)
        urgency_score += customer['churn_risk'] * 30
        
        # Days since last visit (0-25 points)
        if customer['days_since_visit']:
            if customer['days_since_visit'] > 30:
                urgency_score += 25
            elif customer['days_since_visit'] > 15:
                urgency_score += 15
            elif customer['days_since_visit'] > 7:
                urgency_score += 10
        
        # Order probability (0-20 points)
        urgency_score += customer['order_probability'] * 20
        
        return min(urgency_score, 100)
    
    def optimize_daily_route(self, customers, max_visits=10, max_travel_time=240):
        """Optimize daily route considering priorities and travel time"""
        
        if len(customers) == 0:
            return {
                'route': [],
                'total_customers': 0,
                'estimated_travel_time': 0,
                'estimated_revenue': 0,
                'route_efficiency': 0
            }
        
        # Calculate urgency scores
        for customer in customers:
            customer['urgency_score'] = self.calculate_customer_urgency(customer)
        
        # Sort by urgency (descending)
        customers_sorted = sorted(customers, key=lambda x: x['urgency_score'], reverse=True)
        
        # Limit customers to consider for optimization
        customers_to_consider = customers_sorted[:max_visits*2]
        
        if len(customers_to_consider) == 0:
            return {
                'route': [],
                'total_customers': 0,
                'estimated_travel_time': 0,
                'estimated_revenue': 0,
                'route_efficiency': 0
            }
        
        # Calculate travel matrix
        travel_matrix = self.calculate_travel_matrix(customers_to_consider)
        
        # Start with highest priority customer
        selected_customers = [customers_to_consider[0]]
        visited_indices = {0}
        current_customer_idx = 0
        total_travel_time = 0
        
        # Greedy selection of remaining customers
        while len(selected_customers) < max_visits and len(visited_indices) < len(customers_to_consider):
            best_score = -1
            next_customer_idx = None
            
            # Find best unvisited customer
            for i, customer in enumerate(customers_to_consider):
                if i not in visited_indices:
                    travel_time = travel_matrix[current_customer_idx][i]
                    
                    # Skip if travel time exceeds limits
                    if total_travel_time + travel_time > max_travel_time:
                        continue
                    
                    # Calculate weighted score (urgency vs travel efficiency)
                    urgency_weight = customer['urgency_score'] / 100  # 0-1
                    travel_penalty = min(travel_time / 60, 1)  # 0-1 (1 hour max penalty)
                    
                    weighted_score = urgency_weight - (travel_penalty * 0.3)
                    
                    if weighted_score > best_score and weighted_score > 0.2:  # Minimum threshold
                        best_score = weighted_score
                        next_customer_idx = i
            
            if next_customer_idx is not None:
                selected_customers.append(customers_to_consider[next_customer_idx])
                visited_indices.add(next_customer_idx)
                total_travel_time += travel_matrix[current_customer_idx][next_customer_idx]
                current_customer_idx = next_customer_idx
            else:
                break
        
        # Calculate estimated revenue
        estimated_revenue = sum(c['predicted_value'] * c['order_probability'] for c in selected_customers)
        
        # Calculate route efficiency
        route_efficiency = len(selected_customers) / max(total_travel_time / 60, 0.1)  # customers per hour
        
        return {
            'route': selected_customers,
            'total_customers': len(selected_customers),
            'estimated_travel_time': round(total_travel_time, 1),
            'estimated_revenue': round(estimated_revenue, 2),
            'route_efficiency': round(route_efficiency, 2),
            'avg_urgency_score': round(sum(c['urgency_score'] for c in selected_customers) / len(selected_customers), 1)
        }
    
    async def generate_weekly_routes(self, mr_name: str):
        """Generate optimized routes for entire week"""
        customers = await self.get_customer_data(mr_name)
        
        if len(customers) == 0:
            return {}
        
        # Classify customers by visit frequency needed
        daily_customers = [c for c in customers if c['churn_risk'] > 0.7 or c['priority_score'] > 80]
        weekly_customers = [c for c in customers if c['priority_score'] > 50 and c not in daily_customers]
        monthly_customers = [c for c in customers if c not in daily_customers and c not in weekly_customers]
        
        weekly_routes = {}
        used_customers = set()
        
        for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
            available_customers = []
            
            # Add daily customers (high priority/churn risk)
            available_customers.extend([c for c in daily_customers if c['customer_code'] not in used_customers])
            
            # Add weekly customers (distribute across week)
            if day in ['Monday', 'Wednesday', 'Friday']:
                available_customers.extend([c for c in weekly_customers if c['customer_code'] not in used_customers])
            
            # Add monthly customers (Mondays only)
            if day == 'Monday':
                available_customers.extend([c for c in monthly_customers[:5] if c['customer_code'] not in used_customers])
            
            # Optimize route for the day
            if available_customers:
                route = self.optimize_daily_route(available_customers)
                weekly_routes[day] = route
                
                # Mark customers as used
                for customer in route['route']:
                    used_customers.add(customer['customer_code'])
        
        return weekly_routes

# FastAPI Routes
app = FastAPI(title="Route Optimization API", version="1.0.0")

# Initialize optimizer (you need to set SUPABASE_DB_URL environment variable)
optimizer = RouteOptimizer(os.getenv('SUPABASE_DB_URL'))

@app.get("/api/route/optimize/{mr_name}")
async def optimize_daily_route(mr_name: str, max_visits: int = 10, max_travel_time: int = 240):
    """Optimize daily route for an MR"""
    try:
        customers = await optimizer.get_customer_data(mr_name)
        route = optimizer.optimize_daily_route(customers, max_visits, max_travel_time)
        return {
            "status": "success",
            "mr_name": mr_name,
            "route_data": route,
            "total_customers_available": len(customers)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Route optimization failed: {str(e)}")

@app.get("/api/route/weekly/{mr_name}")
async def generate_weekly_routes(mr_name: str):
    """Generate optimized routes for entire week"""
    try:
        routes = await optimizer.generate_weekly_routes(mr_name)
        return {
            "status": "success",
            "mr_name": mr_name,
            "weekly_routes": routes
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Weekly route generation failed: {str(e)}")

@app.get("/api/route/customers/{mr_name}")
async def get_mr_customers(mr_name: str):
    """Get all customers for an MR with their priority scores"""
    try:
        customers = await optimizer.get_customer_data(mr_name)
        for customer in customers:
            customer['urgency_score'] = optimizer.calculate_customer_urgency(customer)
        
        return {
            "status": "success",
            "mr_name": mr_name,
            "total_customers": len(customers),
            "customers": customers
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch customers: {str(e)}")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Route Optimization API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
