# Enhanced Route Optimization API with CORS and Error Handling
import numpy as np
from geopy.distance import geodesic
from scipy.optimize import minimize
import asyncpg
import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import logging
from typing import Optional, List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RouteOptimizer:
    def __init__(self, db_url):
        self.db_url = db_url
        logger.info(f"RouteOptimizer initialized with DB URL: {db_url[:50]}...")
        
    async def get_customer_data(self, mr_name: str, date: str = None):
        """Fetch customer data for route optimization with better error handling"""
        if not mr_name or mr_name.strip() == "":
            raise ValueError("MR name is required")
            
        conn = None
        try:
            logger.info(f"Connecting to database for MR: {mr_name}")
            conn = await asyncpg.connect(self.db_url)
            
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
                -- Priority calculation from performance view or fallback
                COALESCE(performance.total_priority_score, 30) as priority_score,
                COALESCE(performance.churn_risk_score, 0.5) as churn_risk,
                COALESCE(performance.order_probability, 0.3) as order_probability,
                COALESCE(performance.predicted_order_value, 3000) as predicted_value,
                
                -- Last visit info from mr_visits
                last_visits.last_visit_date,
                COALESCE(last_visits.days_since_visit, 30) as days_since_visit
                
            FROM customer_master c
            LEFT JOIN customer_performance performance ON c.customer_code = performance.customer_code
            LEFT JOIN (
                SELECT 
                    "clientMobileNo",
                    MAX("dcrDate") as last_visit_date,
                    EXTRACT(DAY FROM (CURRENT_DATE - MAX("dcrDate"))) as days_since_visit
                FROM mr_visits 
                WHERE "empName" = $1
                GROUP BY "clientMobileNo"
            ) last_visits ON c.customer_phone = last_visits."clientMobileNo"
            WHERE c.mr_name = $1
                AND c.status = 'ACTIVE'
                AND c.latitude IS NOT NULL 
                AND c.longitude IS NOT NULL
                AND c.latitude != 0 
                AND c.longitude != 0
            ORDER BY COALESCE(performance.total_priority_score, 30) DESC, 
                     COALESCE(performance.churn_risk_score, 0.5) DESC
            """
            
            logger.info(f"Executing query for MR: {mr_name}")
            rows = await conn.fetch(query, mr_name)
            
            customers = [dict(row) for row in rows]
            logger.info(f"Found {len(customers)} customers for MR: {mr_name}")
            
            if len(customers) == 0:
                logger.warning(f"No customers found for MR: {mr_name}")
                # Try to check if MR exists at all
                check_query = "SELECT COUNT(*) FROM customer_master WHERE mr_name = $1"
                total_count = await conn.fetchval(check_query, mr_name)
                logger.info(f"Total customers for MR {mr_name} (including without coords): {total_count}")
                
            return customers
            
        except asyncpg.PostgresError as e:
            logger.error(f"Database error for MR {mr_name}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error for MR {mr_name}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
        finally:
            if conn:
                await conn.close()
    
    def calculate_travel_matrix(self, customers):
        """Calculate travel time/distance matrix between customers"""
        n = len(customers)
        if n == 0:
            return np.array([])
            
        travel_matrix = np.zeros((n, n))
        
        logger.info(f"Calculating travel matrix for {n} customers")
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    try:
                        coord1 = (customers[i]['latitude'], customers[i]['longitude'])
                        coord2 = (customers[j]['latitude'], customers[j]['longitude'])
                        distance = geodesic(coord1, coord2).kilometers
                        # Assume 25 km/hr average speed in Indian cities (traffic)
                        travel_time = distance / 25 * 60  # in minutes
                        travel_matrix[i][j] = travel_time
                    except Exception as e:
                        logger.warning(f"Error calculating distance between customers {i} and {j}: {e}")
                        travel_matrix[i][j] = 60  # Default 1 hour if calculation fails
        
        return travel_matrix
    
    def calculate_customer_urgency(self, customer):
        """Calculate urgency score for customer with better error handling"""
        try:
            urgency_score = 0
            
            # High priority customers (0-40 points)
            priority_score = customer.get('priority_score', 30)
            urgency_score += priority_score * 0.4
            
            # Churn risk (0-30 points)
            churn_risk = customer.get('churn_risk', 0.5)
            urgency_score += churn_risk * 30
            
            # Days since last visit (0-25 points)
            days_since_visit = customer.get('days_since_visit', 30)
            if days_since_visit:
                if days_since_visit > 30:
                    urgency_score += 25
                elif days_since_visit > 15:
                    urgency_score += 15
                elif days_since_visit > 7:
                    urgency_score += 10
            
            # Order probability (0-20 points)
            order_prob = customer.get('order_probability', 0.3)
            urgency_score += order_prob * 20
            
            return min(urgency_score, 100)
        except Exception as e:
            logger.warning(f"Error calculating urgency for customer {customer.get('customer_name', 'Unknown')}: {e}")
            return 50  # Default urgency score
    
    def optimize_daily_route(self, customers, max_visits=10, max_travel_time=240):
        """Optimize daily route with enhanced error handling"""
        
        if len(customers) == 0:
            logger.warning("No customers provided for route optimization")
            return {
                'route': [],
                'total_customers': 0,
                'estimated_travel_time': 0,
                'estimated_revenue': 0,
                'route_efficiency': 0
            }
        
        try:
            logger.info(f"Starting route optimization for {len(customers)} customers")
            
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
            
            if travel_matrix.size == 0:
                logger.warning("Could not calculate travel matrix")
                return {
                    'route': customers_to_consider[:max_visits],
                    'total_customers': min(len(customers_to_consider), max_visits),
                    'estimated_travel_time': 0,
                    'estimated_revenue': sum(c.get('predicted_value', 3000) * c.get('order_probability', 0.3) 
                                           for c in customers_to_consider[:max_visits]),
                    'route_efficiency': 0
                }
            
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
            estimated_revenue = sum(c.get('predicted_value', 3000) * c.get('order_probability', 0.3) 
                                  for c in selected_customers)
            
            # Calculate route efficiency
            route_efficiency = len(selected_customers) / max(total_travel_time / 60, 0.1)  # customers per hour
            
            logger.info(f"Route optimization completed: {len(selected_customers)} customers, "
                       f"{total_travel_time:.1f} min travel, ₹{estimated_revenue:.0f} revenue")
            
            return {
                'route': selected_customers,
                'total_customers': len(selected_customers),
                'estimated_travel_time': round(total_travel_time, 1),
                'estimated_revenue': round(estimated_revenue, 2),
                'route_efficiency': round(route_efficiency, 2),
                'avg_urgency_score': round(sum(c['urgency_score'] for c in selected_customers) / len(selected_customers), 1) if selected_customers else 0
            }
            
        except Exception as e:
            logger.error(f"Error in route optimization: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Route optimization failed: {str(e)}")
    
    async def generate_weekly_routes(self, mr_name: str):
        """Generate optimized routes for entire week"""
        customers = await self.get_customer_data(mr_name)
        
        if len(customers) == 0:
            logger.warning(f"No customers found for weekly route generation: {mr_name}")
            return {}
        
        try:
            logger.info(f"Generating weekly routes for {mr_name} with {len(customers)} customers")
            
            # Classify customers by visit frequency needed
            daily_customers = [c for c in customers if c.get('churn_risk', 0.5) > 0.7 or c.get('priority_score', 30) > 80]
            weekly_customers = [c for c in customers if c.get('priority_score', 30) > 50 and c not in daily_customers]
            monthly_customers = [c for c in customers if c not in daily_customers and c not in weekly_customers]
            
            logger.info(f"Customer classification: {len(daily_customers)} daily, "
                       f"{len(weekly_customers)} weekly, {len(monthly_customers)} monthly")
            
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
                else:
                    weekly_routes[day] = {
                        'route': [],
                        'total_customers': 0,
                        'estimated_travel_time': 0,
                        'estimated_revenue': 0,
                        'route_efficiency': 0
                    }
            
            return weekly_routes
            
        except Exception as e:
            logger.error(f"Error generating weekly routes for {mr_name}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Weekly route generation failed: {str(e)}")

# FastAPI App Configuration
app = FastAPI(
    title="Route Optimization API", 
    version="2.0.0",
    description="AI-powered route optimization for field sales teams"
)

# Enhanced CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "https://your-domain.vercel.app",
        "https://your-custom-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Gzip compression for better performance
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Initialize optimizer
SUPABASE_DB_URL = os.getenv('SUPABASE_DB_URL')
if not SUPABASE_DB_URL:
    logger.error("SUPABASE_DB_URL environment variable not set")
    raise ValueError("Database URL is required")

optimizer = RouteOptimizer(SUPABASE_DB_URL)

@app.get("/")
async def root():
    return {
        "message": "Route Optimization API", 
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    """Enhanced health check with database connectivity"""
    try:
        # Test database connection
        conn = await asyncpg.connect(SUPABASE_DB_URL)
        await conn.fetchval("SELECT 1")
        await conn.close()
        
        return {
            "status": "healthy", 
            "service": "Route Optimization API",
            "version": "2.0.0",
            "database": "connected",
            "timestamp": "2024-01-01T00:00:00Z"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

@app.get("/api/route/optimize/{mr_name}")
async def optimize_daily_route(mr_name: str, max_visits: int = 10, max_travel_time: int = 240):
    """Optimize daily route for an MR with enhanced validation"""
    try:
        # Validate parameters
        if not mr_name or mr_name.strip() == "":
            raise HTTPException(status_code=400, detail="MR name is required")
        
        if max_visits < 1 or max_visits > 50:
            raise HTTPException(status_code=400, detail="max_visits must be between 1 and 50")
            
        if max_travel_time < 30 or max_travel_time > 600:
            raise HTTPException(status_code=400, detail="max_travel_time must be between 30 and 600 minutes")
        
        logger.info(f"Route optimization request: MR={mr_name}, max_visits={max_visits}, max_travel_time={max_travel_time}")
        
        customers = await optimizer.get_customer_data(mr_name)
        route = optimizer.optimize_daily_route(customers, max_visits, max_travel_time)
        
        return {
            "status": "success",
            "mr_name": mr_name,
            "route_data": route,
            "total_customers_available": len(customers),
            "parameters": {
                "max_visits": max_visits,
                "max_travel_time": max_travel_time
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Route optimization failed for {mr_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Route optimization failed: {str(e)}")

@app.get("/api/route/weekly/{mr_name}")
async def generate_weekly_routes(mr_name: str):
    """Generate optimized routes for entire week"""
    try:
        if not mr_name or mr_name.strip() == "":
            raise HTTPException(status_code=400, detail="MR name is required")
            
        logger.info(f"Weekly route generation request: MR={mr_name}")
        
        routes = await optimizer.generate_weekly_routes(mr_name)
        return {
            "status": "success",
            "mr_name": mr_name,
            "weekly_routes": routes
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Weekly route generation failed for {mr_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Weekly route generation failed: {str(e)}")

@app.get("/api/route/customers/{mr_name}")
async def get_mr_customers(mr_name: str):
    """Get all customers for an MR with their priority scores"""
    try:
        if not mr_name or mr_name.strip() == "":
            raise HTTPException(status_code=400, detail="MR name is required")
            
        logger.info(f"Customer data request: MR={mr_name}")
        
        customers = await optimizer.get_customer_data(mr_name)
        
        # Add urgency scores
        for customer in customers:
            customer['urgency_score'] = optimizer.calculate_customer_urgency(customer)
        
        return {
            "status": "success",
            "mr_name": mr_name,
            "total_customers": len(customers),
            "customers": customers
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch customers for {mr_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch customers: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting Route Optimization API on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
