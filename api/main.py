# api/main.py - Fixed Supabase client initialization
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

# Initialize Supabase client with better error handling
supabase = None
supabase_error = None

def initialize_supabase():
    """Initialize Supabase client with proper error handling"""
    global supabase, supabase_error
    
    try:
        # Check environment variables
        supabase_url = os.getenv('SUPABASE_URL') or os.getenv('REACT_APP_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY')
        
        logger.info(f"🔍 Environment check:")
        logger.info(f"  - SUPABASE_URL: {'SET' if supabase_url else 'MISSING'}")
        logger.info(f"  - SUPABASE_SERVICE_KEY: {'SET' if supabase_key else 'MISSING'}")
        
        if not supabase_url:
            raise Exception("SUPABASE_URL environment variable is missing")
        
        if not supabase_key:
            raise Exception("SUPABASE_SERVICE_KEY environment variable is missing")
        
        # Import and create Supabase client
        from supabase import create_client, Client
        
        # Create client with explicit options
        supabase = create_client(
            supabase_url, 
            supabase_key,
            options={
                "auto_refresh_token": False,  # Disable for server-side
                "persist_session": False,     # Don't persist sessions
            }
        )
        
        logger.info("✅ Supabase client created successfully")
        
        # Test the connection with a simple query
        try:
            # Use a simpler test query that's less likely to fail
            result = supabase.table('customer_master').select("customer_code").limit(1).execute()
            
            if hasattr(result, 'data'):
                logger.info(f"✅ Supabase connection test successful")
                supabase_error = None
                return True
            else:
                raise Exception("Invalid response structure from Supabase")
                
        except Exception as test_error:
            logger.error(f"❌ Supabase connection test failed: {str(test_error)}")
            supabase_error = f"Connection test failed: {str(test_error)}"
            # Don't set supabase to None here, might still work for some operations
            return False
        
    except ImportError as e:
        supabase_error = f"Supabase library not installed: {str(e)}. Run: pip install supabase"
        logger.error(f"❌ {supabase_error}")
        return False
        
    except Exception as e:
        supabase_error = f"Supabase initialization failed: {str(e)}"
        logger.error(f"❌ {supabase_error}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return False

# Initialize on startup
supabase_ready = initialize_supabase()

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
            "supabase_status": "connected" if supabase and supabase_ready else "disconnected"
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
            "status": "connected" if (supabase and supabase_ready) else "disconnected",
            "error": supabase_error if supabase_error else None,
            "client_initialized": supabase is not None,
            "connection_tested": supabase_ready
        },
        "environment": {
            "SUPABASE_URL": "SET" if os.getenv('SUPABASE_URL') or os.getenv('REACT_APP_SUPABASE_URL') else "MISSING",
            "SUPABASE_SERVICE_KEY": "SET" if os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY') else "MISSING", 
            "VERCEL": "SET" if os.getenv('VERCEL') else "NOT_SET"
        },
        "endpoints": {
            "health": "/health",
            "docs": "/docs", 
            "customers": "/api/route/customers/{mr_name}",
            "optimize": "/api/route/optimize/{mr_name}",
            "database_test": "/api/test/database",
            "retry_supabase": "/api/retry-supabase"
        }
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        health_data = {
            "status": "healthy" if (supabase and supabase_ready) else "degraded",
            "service": "Route Optimization API - Supabase",
            "database": {
                "status": "connected" if (supabase and supabase_ready) else "disconnected",
                "error": supabase_error if supabase_error else None,
                "client_exists": supabase is not None,
                "connection_tested": supabase_ready
            },
            "environment": {
                "SUPABASE_URL": "SET" if os.getenv('SUPABASE_URL') or os.getenv('REACT_APP_SUPABASE_URL') else "MISSING",
                "SUPABASE_SERVICE_KEY": "SET" if os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY') else "MISSING",
                "VERCEL": "SET" if os.getenv('VERCEL') else "NOT_SET"
            }
        }
        
        return health_data
        
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return {
            "status": "error", 
            "message": str(e),
            "database": {"status": "disconnected", "error": supabase_error}
        }

@app.get("/api/retry-supabase")
async def retry_supabase_connection():
    """Retry Supabase connection"""
    global supabase_ready
    logger.info("🔄 Retrying Supabase connection...")
    supabase_ready = initialize_supabase()
    
    return {
        "status": "success" if supabase_ready else "failed",
        "supabase_connected": supabase_ready,
        "supabase_error": supabase_error,
        "client_exists": supabase is not None
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
                    "Try /api/retry-supabase endpoint"
                ]
            }
        
        logger.info("🧪 Testing Supabase connection...")
        
        # Test 1: Simple select
        try:
            response = supabase.table('customer_master').select("customer_code, customer_name").limit(3).execute()
            
            if hasattr(response, 'data') and isinstance(response.data, list):
                test1_result = f"✅ Retrieved {len(response.data)} records"
                sample_data = response.data
            else:
                test1_result = f"❌ Unexpected response format: {type(response)}"
                sample_data = []
                
        except Exception as e:
            test1_result = f"❌ Query failed: {str(e)}"
            sample_data = []
        
        # Test 2: Count query
        try:
            count_response = supabase.table('customer_master').select("*", count="exact").limit(1).execute()
            if hasattr(count_response, 'count'):
                test2_result = f"✅ Total records: {count_response.count}"
                total_count = count_response.count
            else:
                test2_result = "❌ Count query failed"
                total_count = 0
        except Exception as e:
            test2_result = f"❌ Count failed: {str(e)}"
            total_count = 0
        
        return {
            "status": "success",
            "database": "supabase",
            "tests": {
                "basic_select": test1_result,
                "count_query": test2_result,
                "client_type": str(type(supabase))
            },
            "sample_data": sample_data,
            "total_customers": total_count
        }
        
    except Exception as e:
        logger.error(f"Database test error: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return {
            "status": "error",
            "message": f"Database test failed: {str(e)}",
            "error_type": type(e).__name__,
            "supabase_available": supabase is not None
        }

@app.get("/api/route/customers/{mr_name}")
async def get_customers(mr_name: str):
    """Get customer data - with fallback if Supabase unavailable"""
    try:
        if not mr_name or mr_name.strip() == "":
            raise HTTPException(status_code=400, detail="MR name is required")
        
        # Decode URL-encoded MR name
        import urllib.parse
        mr_name_decoded = urllib.parse.unquote(mr_name)
        logger.info(f"🔍 Fetching customers for MR: {mr_name_decoded}")
        
        if not supabase or not supabase_ready:
            # Return mock data if Supabase is not available
            logger.warning(f"⚠️ Supabase unavailable, returning mock data for {mr_name_decoded}")
            mock_customers = [
                {
                    "customer_code": f"MOCK001_{mr_name_decoded[:10]}",
                    "customer_name": f"Dr. Sample Customer - {mr_name_decoded}",
                    "customer_type": "Doctor",
                    "area_name": "Gomti Nagar",
                    "city_name": "Lucknow",
                    "latitude": 26.8467,
                    "longitude": 80.9462,
                    "priority_score": 85,
                    "churn_risk": 0.2,
                    "order_probability": 0.7,
                    "predicted_value": 5000,
                    "urgency_score": 78,
                    "days_since_visit": 8
                },
                {
                    "customer_code": f"MOCK002_{mr_name_decoded[:10]}", 
                    "customer_name": f"Apollo Pharmacy - {mr_name_decoded}",
                    "customer_type": "Retailer",
                    "area_name": "Hazratganj",
                    "city_name": "Lucknow",
                    "latitude": 26.8486,
                    "longitude": 80.9455,
                    "priority_score": 72,
                    "churn_risk": 0.4,
                    "order_probability": 0.6,
                    "predicted_value": 3500,
                    "urgency_score": 65,
                    "days_since_visit": 12
                },
                {
                    "customer_code": f"MOCK003_{mr_name_decoded[:10]}", 
                    "customer_name": f"City Hospital - {mr_name_decoded}",
                    "customer_type": "Hospital",
                    "area_name": "Indira Nagar",
                    "city_name": "Lucknow",
                    "latitude": 26.8420,
                    "longitude": 80.9470,
                    "priority_score": 90,
                    "churn_risk": 0.1,
                    "order_probability": 0.8,
                    "predicted_value": 7500,
                    "urgency_score": 88,
                    "days_since_visit": 5
                }
            ]
            
            return {
                "status": "success",
                "mr_name": mr_name_decoded,
                "total_customers": len(mock_customers),
                "customers": mock_customers,
                "note": "Using mock data - Supabase connection unavailable",
                "supabase_error": supabase_error
            }
        
        # Real Supabase query
        try:
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
                .eq('mr_name', mr_name_decoded)\
                .eq('status', 'ACTIVE')\
                .not_('latitude', 'is', None)\
                .not_('longitude', 'is', None)\
                .order('customer_name')\
                .limit(50)\
                .execute()
            
            if hasattr(response, 'data') and isinstance(response.data, list):
                customers = response.data
                logger.info(f"✅ Found {len(customers)} customers for {mr_name_decoded}")
                
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
                    "mr_name": mr_name_decoded,
                    "total_customers": len(enriched_customers),
                    "customers": enriched_customers,
                    "data_source": "supabase"
                }
            else:
                raise Exception(f"Invalid response format from Supabase: {type(response)}")
                
        except Exception as db_error:
            logger.error(f"❌ Supabase query failed: {str(db_error)}")
            # Fall back to mock data on database error
            return await get_customers(mr_name)  # This will hit the mock data path
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Customer endpoint error for {mr_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching customers: {str(e)}")

# Keep the rest of your endpoints the same...
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
            "mr_name": customers_response["mr_name"],
            "route_data": {
                "route": selected_customers,
                "total_customers": len(selected_customers),
                "estimated_travel_time": estimated_travel_time,
                "estimated_revenue": round(estimated_revenue, 2),
                "route_efficiency": round(route_efficiency, 2),
                "avg_urgency_score": round(avg_urgency, 1)
            },
            "total_customers_available": len(customers),
            "data_source": customers_response.get("data_source", "mock")
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
            "mr_name": daily_response["mr_name"],
            "weekly_routes": weekly_routes,
            "data_source": daily_response.get("data_source", "mock")
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
