# api/main.py - Refactored to use Supabase client
from dotenv import load_dotenv
import os
load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from supabase import create_client, Client
from typing import Optional, List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Route Optimization API",
    version="2.0.0",
    description="AI-powered route optimization using Supabase",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "https://*.vercel.app",
        "https://*.netlify.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Initialize Supabase client
supabase_url = os.getenv('REACT_APP_SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY')  # Use service key for backend

if not supabase_url or not supabase_key:
    logger.error("Missing Supabase credentials!")
    supabase: Optional[Client] = None
else:
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        logger.info("✅ Supabase client initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Supabase client: {e}")
        supabase = None

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error on {request.url}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc),
            "path": str(request.url.path)
        }
    )

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Route Optimization API - Supabase Edition",
        "status": "running",
        "version": "2.0.0",
        "database": "supabase" if supabase else "disconnected",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "customers": "/api/route/customers/{mr_name}",
            "optimize": "/api/route/optimize/{mr_name}",
            "database_test": "/api/test/database"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        db_status = "connected" if supabase else "disconnected"
        
        # Test Supabase connection
        if supabase:
            try:
                # Simple query to test connection
                result = supabase.table('customer_master').select("count", count="exact").limit(1).execute()
                db_test = "✅ Working"
                customer_count = result.count
            except Exception as e:
                db_test = f"❌ Error: {str(e)}"
                customer_count = 0
        else:
            db_test = "❌ No connection"
            customer_count = 0
        
        return {
            "status": "healthy",
            "service": "Route Optimization API - Supabase",
            "database_status": db_status,
            "database_test": db_test,
            "customer_count": customer_count,
            "environment": {
                "SUPABASE_URL": "SET" if supabase_url else "MISSING",
                "SUPABASE_KEY": "SET" if supabase_key else "MISSING",
                "VERCEL": "SET" if os.getenv('VERCEL') else "NOT_SET"
            }
        }
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.get("/api/test/database")
async def test_database():
    """Test database connection using Supabase"""
    try:
        if not supabase:
            return {
                "status": "error",
                "message": "Supabase client not initialized"
            }
        
        # Test basic connection
        response = supabase.table('customer_master').select("customer_code, customer_name").limit(5).execute()
        
        return {
            "status": "success",
            "database": "supabase",
            "test_query": "customer_master sample",
            "sample_data": response.data,
            "record_count": len(response.data)
        }
        
    except Exception as e:
        logger.error(f"Database test error: {str(e)}")
        return {
            "status": "error",
            "message": f"Database error: {str(e)}"
        }

class RouteOptimizer:
    """Route optimization using Supabase client"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
    
    async def get_customer_data(self, mr_name: str) -> List[Dict[str, Any]]:
        """Fetch customer data using Supabase"""
        try:
            # Get customer data with performance metrics
            response = self.supabase.table('customer_master')\
                .select("""
                    customer_code,
                    customer_name,
                    customer_type,
                    area_name,
                    city_name,
                    latitude,
                    longitude,
                    pin_code
                """)\
                .eq('mr_name', mr_name)\
                .eq('status', 'ACTIVE')\
                .not_('latitude', 'is', None)\
                .not_('longitude', 'is', None)\
                .order('customer_name')\
                .limit(100)\
                .execute()
            
            customers = response.data
            
            # Enrich with performance data (using defaults for now)
            enriched_customers = []
            for customer in customers:
                enriched_customers.append({
                    **customer,
                    'priority_score': 75,  # Default values
                    'churn_risk': 0.3,
                    'order_probability': 0.6,
                    'predicted_value': 4000,
                    'urgency_score': 70,
                    'days_since_visit': 10
                })
            
            return enriched_customers
            
        except Exception as e:
            logger.error(f"Error fetching customer data: {e}")
            raise e
    
    def calculate_urgency_score(self, customer: Dict[str, Any]) -> float:
        """Calculate customer urgency score"""
        score = 0
        score += customer.get('priority_score', 50) * 0.4
        score += customer.get('churn_risk', 0.5) * 30
        score += customer.get('order_probability', 0.3) * 20
        
        # Days since visit bonus
        days = customer.get('days_since_visit', 7)
        if days > 30:
            score += 25
        elif days > 15:
            score += 15
        elif days > 7:
            score += 10
            
        return min(score, 100)
    
    def optimize_daily_route(self, customers: List[Dict], max_visits: int = 10, max_travel_time: int = 240) -> Dict[str, Any]:
        """Simple route optimization"""
        if not customers:
            return {
                'route': [],
                'total_customers': 0,
                'estimated_travel_time': 0,
                'estimated_revenue': 0,
                'route_efficiency': 0,
                'avg_urgency_score': 0
            }
        
        # Calculate urgency scores
        for customer in customers:
            customer['urgency_score'] = self.calculate_urgency_score(customer)
        
        # Sort by urgency and take top customers
        customers_sorted = sorted(customers, key=lambda x: x['urgency_score'], reverse=True)
        selected_customers = customers_sorted[:max_visits]
        
        # Calculate metrics
        estimated_revenue = sum(
            c.get('predicted_value', 3000) * c.get('order_probability', 0.3) 
            for c in selected_customers
        )
        estimated_travel_time = len(selected_customers) * 25  # 25 min per customer
        route_efficiency = len(selected_customers) / max(estimated_travel_time / 60, 0.1)
        avg_urgency = sum(c['urgency_score'] for c in selected_customers) / len(selected_customers) if selected_customers else 0
        
        return {
            'route': selected_customers,
            'total_customers': len(selected_customers),
            'estimated_travel_time': estimated_travel_time,
            'estimated_revenue': round(estimated_revenue, 2),
            'route_efficiency': round(route_efficiency, 2),
            'avg_urgency_score': round(avg_urgency, 1)
        }

# Initialize optimizer
optimizer = RouteOptimizer(supabase) if supabase else None

@app.get("/api/route/customers/{mr_name}")
async def get_customers(mr_name: str):
    """Get customer data for an MR using Supabase"""
    try:
        if not optimizer:
            raise HTTPException(status_code=500, detail="Supabase client not available")
        
        if not mr_name or mr_name.strip() == "":
            raise HTTPException(status_code=400, detail="MR name is required")
        
        customers = await optimizer.get_customer_data(mr_name)
        
        return {
            "status": "success",
            "mr_name": mr_name,
            "total_customers": len(customers),
            "customers": customers
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Customer endpoint error for {mr_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching customers: {str(e)}")

@app.get("/api/route/optimize/{mr_name}")
async def optimize_route(mr_name: str, max_visits: int = 10, max_travel_time: int = 240):
    """Optimize route using Supabase data"""
    try:
        if not optimizer:
            raise HTTPException(status_code=500, detail="Route optimizer not available")
        
        if not mr_name:
            raise HTTPException(status_code=400, detail="MR name required")
        
        # Get customers
        customers = await optimizer.get_customer_data(mr_name)
        
        # Optimize route
        route_data = optimizer.optimize_daily_route(customers, max_visits, max_travel_time)
        
        return {
            "status": "success",
            "mr_name": mr_name,
            "route_data": route_data,
            "total_customers_available": len(customers)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Route optimization error for {mr_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Optimization error: {str(e)}")

@app.get("/api/route/weekly/{mr_name}")
async def generate_weekly_routes(mr_name: str):
    """Generate weekly routes using Supabase"""
    try:
        if not optimizer:
            raise HTTPException(status_code=500, detail="Route optimizer not available")
        
        # Get base route
        customers = await optimizer.get_customer_data(mr_name)
        daily_route = optimizer.optimize_daily_route(customers, max_visits=8)
        
        # Generate weekly distribution
        weekly_routes = {}
        for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
            weekly_routes[day] = {
                "route": daily_route["route"][:6],  # 6 customers per day
                "total_customers": min(6, daily_route["total_customers"]),
                "estimated_travel_time": daily_route["estimated_travel_time"] * 0.8,
                "estimated_revenue": daily_route["estimated_revenue"] * 0.8,
                "route_efficiency": daily_route["route_efficiency"]
            }
        
        return {
            "status": "success",
            "mr_name": mr_name,
            "weekly_routes": weekly_routes
        }
        
    except Exception as e:
        logger.error(f"Weekly routes error for {mr_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Weekly routes error: {str(e)}")

# OPTIONS handler for CORS
@app.options("/{path:path}")
async def options_handler():
    return {"message": "OK"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
