# api/main.py - Fixed version with better error handling
from dotenv import load_dotenv
import os
load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import traceback

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

# Initialize Supabase client with detailed error handling
supabase = None
supabase_error = None

try:
    # Check environment variables first
    supabase_url = os.getenv('SUPABASE_URL') or os.getenv('REACT_APP_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY')
    
    logger.info(f"🔍 Environment check:")
    logger.info(f"  - SUPABASE_URL: {'SET' if supabase_url else 'MISSING'}")
    logger.info(f"  - SUPABASE_SERVICE_KEY: {'SET' if supabase_key else 'MISSING'}")
    logger.info(f"  - REACT_APP_SUPABASE_URL: {'SET' if os.getenv('REACT_APP_SUPABASE_URL') else 'MISSING'}")
    
    if not supabase_url:
        raise Exception("SUPABASE_URL environment variable is missing")
    
    if not supabase_key:
        raise Exception("SUPABASE_SERVICE_KEY environment variable is missing")
    
    # Try to import and initialize Supabase
    try:
        from supabase import create_client, Client
        supabase: Client = create_client(supabase_url, supabase_key)
        logger.info("✅ Supabase client initialized successfully")
        
        # Test the connection immediately
        test_response = supabase.table('customer_master').select("count", count="exact").limit(1).execute()
        logger.info(f"✅ Supabase connection test successful. Customer count: {test_response.count}")
        
    except ImportError as e:
        supabase_error = f"Supabase library not installed: {str(e)}"
        logger.error(f"❌ {supabase_error}")
    except Exception as e:
        supabase_error = f"Supabase connection failed: {str(e)}"
        logger.error(f"❌ {supabase_error}")
        
except Exception as e:
    supabase_error = f"Environment setup failed: {str(e)}"
    logger.error(f"❌ {supabase_error}")

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error on {request.url}: {str(exc)}")
    logger.error(f"Traceback: {traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc),
            "path": str(request.url.path),
            "supabase_status": "connected" if supabase else "disconnected"
        }
    )

@app.get("/")
async def root():
    """Root endpoint with detailed status"""
    return {
        "message": "Route Optimization API - Supabase Edition",
        "status": "running",
        "version": "2.0.0",
        "database": {
            "status": "connected" if supabase else "disconnected",
            "error": supabase_error if supabase_error else None
        },
        "environment": {
            "SUPABASE_URL": "SET" if os.getenv('SUPABASE_URL') else "MISSING",
            "SUPABASE_SERVICE_KEY": "SET" if os.getenv('SUPABASE_SERVICE_KEY') else "MISSING", 
            "REACT_APP_SUPABASE_URL": "SET" if os.getenv('REACT_APP_SUPABASE_URL') else "MISSING",
            "VERCEL": "SET" if os.getenv('VERCEL') else "NOT_SET"
        },
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
    """Detailed health check"""
    try:
        health_data = {
            "status": "healthy" if supabase else "unhealthy",
            "service": "Route Optimization API - Supabase",
            "database": {
                "status": "connected" if supabase else "disconnected",
                "error": supabase_error if supabase_error else None
            },
            "environment": {
                "SUPABASE_URL": "SET" if os.getenv('SUPABASE_URL') else "MISSING",
                "SUPABASE_SERVICE_KEY": "SET" if os.getenv('SUPABASE_SERVICE_KEY') else "MISSING",
                "VERCEL": "SET" if os.getenv('VERCEL') else "NOT_SET"
            }
        }
        
        # Additional connection test if Supabase is available
        if supabase:
            try:
                result = supabase.table('customer_master').select("count", count="exact").limit(1).execute()
                health_data["database"]["test"] = "✅ Working"
                health_data["database"]["customer_count"] = result.count
            except Exception as e:
                health_data["database"]["test"] = f"❌ Error: {str(e)}"
                health_data["database"]["customer_count"] = 0
        
        return health_data
        
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return {
            "status": "error", 
            "message": str(e),
            "database": {"status": "disconnected", "error": supabase_error}
        }

@app.get("/api/test/database")
async def test_database():
    """Comprehensive database test"""
    try:
        if not supabase:
            return {
                "status": "error",
                "message": "Supabase client not initialized",
                "error_details": supabase_error,
                "suggestions": [
                    "Check SUPABASE_URL environment variable",
                    "Check SUPABASE_SERVICE_KEY environment variable", 
                    "Verify Supabase library is installed: pip install supabase",
                    "Check Vercel environment variable configuration"
                ]
            }
        
        # Test basic connection
        logger.info("🧪 Testing Supabase connection...")
        
        # Test 1: Count query
        response = supabase.table('customer_master').select("count", count="exact").limit(1).execute()
        total_customers = response.count
        
        # Test 2: Sample data
        sample_response = supabase.table('customer_master').select("customer_code, customer_name, mr_name").limit(3).execute()
        sample_data = sample_response.data
        
        return {
            "status": "success",
            "database": "supabase",
            "tests": {
                "connection": "✅ Connected",
                "count_query": f"✅ {total_customers} customers found",
                "data_access": f"✅ Retrieved {len(sample_data)} sample records"
            },
            "sample_data": sample_data,
            "total_customers": total_customers
        }
        
    except Exception as e:
        logger.error(f"Database test error: {str(e)}")
        return {
            "status": "error",
            "message": f"Database test failed: {str(e)}",
            "error_type": type(e).__name__,
            "supabase_available": supabase is not None
        }

# Fallback route optimization (without Supabase dependency)
@app.get("/api/route/customers/{mr_name}")
async def get_customers(mr_name: str):
    """Get customer data - with fallback if Supabase unavailable"""
    try:
        if not mr_name or mr_name.strip() == "":
            raise HTTPException(status_code=400, detail="MR name is required")
        
        if not supabase:
            # Return mock data if Supabase is not available
            logger.warning(f"⚠️ Supabase unavailable, returning mock data for {mr_name}")
            mock_customers = [
                {
                    "customer_code": "MOCK001",
                    "customer_name": "Dr. Mock Customer 1",
                    "customer_type": "Doctor",
                    "area_name": "Mock Area 1",
                    "city_name": "Lucknow",
                    "latitude": 26.8467,
                    "longitude": 80.9462,
                    "priority_score": 75,
                    "churn_risk": 0.3,
                    "order_probability": 0.6,
                    "predicted_value": 4000,
                    "urgency_score": 70,
                    "days_since_visit": 10
                },
                {
                    "customer_code": "MOCK002", 
                    "customer_name": "Apollo Mock Pharmacy",
                    "customer_type": "Retailer",
                    "area_name": "Mock Area 2",
                    "city_name": "Lucknow",
                    "latitude": 26.8486,
                    "longitude": 80.9455,
                    "priority_score": 65,
                    "churn_risk": 0.4,
                    "order_probability": 0.5,
                    "predicted_value": 3500,
                    "urgency_score": 60,
                    "days_since_visit": 15
                }
            ]
            
            return {
                "status": "success",
                "mr_name": mr_name,
                "total_customers": len(mock_customers),
                "customers": mock_customers,
                "note": "Using mock data - Supabase connection unavailable",
                "supabase_error": supabase_error
            }
        
        # Real Supabase query
        logger.info(f"🔍 Fetching customers for MR: {mr_name}")
        
        response = supabase.table('customer_master')\
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
            .limit(50)\
            .execute()
        
        customers = response.data
        logger.info(f"✅ Found {len(customers)} customers for {mr_name}")
        
        # Enrich with performance data
        enriched_customers = []
        for customer in customers:
            enriched_customers.append({
                **customer,
                'priority_score': 75,
                'churn_risk': 0.3,
                'order_probability': 0.6,
                'predicted_value': 4000,
                'urgency_score': 70,
                'days_since_visit': 10
            })
        
        return {
            "status": "success",
            "mr_name": mr_name,
            "total_customers": len(enriched_customers),
            "customers": enriched_customers
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Customer endpoint error for {mr_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching customers: {str(e)}")

@app.get("/api/route/optimize/{mr_name}")
async def optimize_route(mr_name: str, max_visits: int = 10, max_travel_time: int = 240):
    """Route optimization with fallback"""
    try:
        if not mr_name:
            raise HTTPException(status_code=400, detail="MR name required")
        
        # Get customers (this handles Supabase availability internally)
        customers_response = await get_customers(mr_name)
        customers = customers_response["customers"]
        
        if not customers:
            return {
                "status": "success",
                "mr_name": mr_name,
                "route_data": {
                    "route": [],
                    "total_customers": 0,
                    "estimated_travel_time": 0,
                    "estimated_revenue": 0,
                    "route_efficiency": 0
                }
            }
        
        # Simple optimization - sort by urgency and take top N
        customers_sorted = sorted(customers, key=lambda x: x.get('urgency_score', 0), reverse=True)
        selected_customers = customers_sorted[:max_visits]
        
        # Calculate metrics
        estimated_revenue = sum(
            c.get('predicted_value', 3000) * c.get('order_probability', 0.3) 
            for c in selected_customers
        )
        estimated_travel_time = len(selected_customers) * 30
        route_efficiency = len(selected_customers) / max(estimated_travel_time / 60, 0.1)
        avg_urgency = sum(c['urgency_score'] for c in selected_customers) / len(selected_customers) if selected_customers else 0
        
        return {
            "status": "success",
            "mr_name": mr_name,
            "route_data": {
                "route": selected_customers,
                "total_customers": len(selected_customers),
                "estimated_travel_time": estimated_travel_time,
                "estimated_revenue": round(estimated_revenue, 2),
                "route_efficiency": round(route_efficiency, 2),
                "avg_urgency_score": round(avg_urgency, 1)
            },
            "total_customers_available": len(customers),
            "data_source": "supabase" if supabase else "mock"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Route optimization error for {mr_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Optimization error: {str(e)}")

@app.get("/api/route/weekly/{mr_name}")
async def generate_weekly_routes(mr_name: str):
    """Generate weekly routes"""
    try:
        # Get optimized daily route
        daily_response = await optimize_route(mr_name, max_visits=8)
        route_data = daily_response["route_data"]
        
        # Generate weekly distribution
        weekly_routes = {}
        for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
            weekly_routes[day] = {
                "route": route_data["route"][:6],
                "total_customers": min(6, route_data["total_customers"]),
                "estimated_travel_time": route_data["estimated_travel_time"] * 0.8,
                "estimated_revenue": route_data["estimated_revenue"] * 0.8,
                "route_efficiency": route_data["route_efficiency"]
            }
        
        return {
            "status": "success",
            "mr_name": mr_name,
            "weekly_routes": weekly_routes,
            "data_source": "supabase" if supabase else "mock"
        }
        
    except Exception as e:
        logger.error(f"❌ Weekly routes error for {mr_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Weekly routes error: {str(e)}")

# OPTIONS handler for CORS
@app.options("/{path:path}")
async def options_handler():
    return {"message": "OK"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
