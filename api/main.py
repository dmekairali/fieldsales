from dotenv import load_dotenv
import os
load_dotenv()

# Optimized API for Vercel using @vercel/python
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import logging
import asyncio
import traceback

# Configure logging for Vercel
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Route Optimization API",
    version="2.0.0",
    description="AI-powered route optimization for field sales teams",
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
            "path": str(request.url.path)
        }
    )

@app.get("/")
async def root():
    """Root endpoint"""
    try:
        return {
            "message": "Route Optimization API",
            "status": "running",
            "version": "2.0.0",
            "environment": "vercel",
            "endpoints": {
                "health": "/health",
                "docs": "/docs",
                "customers": "/api/route/customers/{mr_name}",
                "optimize": "/api/route/optimize/{mr_name}",
                "database_test": "/api/test/database"
            }
        }
    except Exception as e:
        logger.error(f"Root endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        env_status = {
            "SUPABASE_DB_URL": "SET" if os.getenv('SUPABASE_DB_URL') else "MISSING",
            "VERCEL": "SET" if os.getenv('VERCEL') else "NOT_SET",
            "VERCEL_URL": os.getenv('VERCEL_URL', 'NOT_SET')
        }
        
        return {
            "status": "healthy",
            "service": "Route Optimization API",
            "environment": env_status,
            "timestamp": "2024-01-01T00:00:00Z"
        }
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.get("/test")
async def test_endpoint():
    """Simple test endpoint"""
    try:
        return {
            "test": "API is working correctly",
            "working": True,
            "message": "All systems operational"
        }
    except Exception as e:
        logger.error(f"Test endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Database connection test
@app.get("/api/test/database")
async def test_database():
    """Test database connection"""
    try:
        db_url = os.getenv('SUPABASE_DB_URL')
        if not db_url:
            return {
                "status": "error", 
                "message": "SUPABASE_DB_URL environment variable not set"
            }
        
        # Import asyncpg only when needed
        try:
            import asyncpg
        except ImportError:
            return {
                "status": "error",
                "message": "asyncpg not installed - add to requirements.txt"
            }
        
        # Test connection with timeout
        conn = await asyncio.wait_for(
            asyncpg.connect(db_url, statement_cache_size=0),
            timeout=8.0  # 8 second timeout for Vercel
        )
        
        # Test query
        result = await conn.fetchval("SELECT 1 as test")
        
        # Test table access
        try:
            table_test = await conn.fetchval("SELECT COUNT(*) FROM customer_master LIMIT 1")
            tables_accessible = True
        except:
            table_test = "No access"
            tables_accessible = False
        
        await conn.close()
        
        return {
            "status": "success",
            "database": "connected",
            "test_query_result": result,
            "customer_master_accessible": tables_accessible,
            "customer_count_sample": table_test
        }
        
    except asyncio.TimeoutError:
        return {
            "status": "error", 
            "message": "Database connection timeout (>8 seconds)"
        }
    except Exception as e:
        logger.error(f"Database test error: {str(e)}")
        return {
            "status": "error", 
            "message": f"Database error: {str(e)}"
        }

# Lightweight customer data endpoint
@app.get("/api/route/customers/{mr_name}")
async def get_customers(mr_name: str):
    """Get customer data for an MR"""
    try:
        if not mr_name or mr_name.strip() == "":
            raise HTTPException(status_code=400, detail="MR name is required")
        
        # Import database dependencies only when needed
        try:
            import asyncpg
        except ImportError:
            raise HTTPException(status_code=500, detail="Database dependencies not available")
        
        db_url = os.getenv('SUPABASE_DB_URL')
        if not db_url:
            raise HTTPException(status_code=500, detail="Database URL not configured")
        
        # Connect with timeout
        conn = await asyncio.wait_for(
            asyncpg.connect(db_url, statement_cache_size=0),
            timeout=5.0
        )
        
        try:
            # Simple query to get customer data
            query = """
            SELECT 
                customer_code,
                customer_name,
                COALESCE(customer_type, 'Customer') as customer_type,
                area_name,
                city_name,
                latitude,
                longitude,
                50 as priority_score,
                0.5 as churn_risk,
                0.3 as order_probability,
                3000 as predicted_value
            FROM customer_master 
            WHERE mr_name = $1 
              AND status = 'ACTIVE'
              AND latitude IS NOT NULL 
              AND longitude IS NOT NULL
            ORDER BY customer_name
            LIMIT 50
            """
            
            rows = await conn.fetch(query, mr_name)
            customers = [dict(row) for row in rows]
            
            # Add urgency scores
            for customer in customers:
                customer['urgency_score'] = float(customer.get('priority_score', 50)) + 25
                customer['days_since_visit'] = 15  # Default
            
            return {
                "status": "success",
                "mr_name": mr_name,
                "total_customers": len(customers),
                "customers": customers
            }
            
        finally:
            await conn.close()
            
    except asyncio.TimeoutError:
        raise HTTPException(status_code=408, detail="Database query timeout")
    except Exception as e:
        logger.error(f"Customer endpoint error for {mr_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching customers: {str(e)}")

# Simple route optimization
@app.get("/api/route/optimize/{mr_name}")
async def optimize_route(mr_name: str, max_visits: int = 10, max_travel_time: int = 240):
    """Simple route optimization"""
    try:
        if not mr_name:
            raise HTTPException(status_code=400, detail="MR name required")
        
        # Get customers first
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
        
        # Calculate simple metrics
        estimated_revenue = sum(
            c.get('predicted_value', 3000) * c.get('order_probability', 0.3) 
            for c in selected_customers
        )
        
        estimated_travel_time = len(selected_customers) * 30  # 30 min per customer
        route_efficiency = len(selected_customers) / max(estimated_travel_time / 60, 0.1)
        
        return {
            "status": "success",
            "mr_name": mr_name,
            "route_data": {
                "route": selected_customers,
                "total_customers": len(selected_customers),
                "estimated_travel_time": estimated_travel_time,
                "estimated_revenue": round(estimated_revenue, 2),
                "route_efficiency": round(route_efficiency, 2),
                "avg_urgency_score": round(
                    sum(c['urgency_score'] for c in selected_customers) / len(selected_customers), 1
                ) if selected_customers else 0
            },
            "total_customers_available": len(customers)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Route optimization error for {mr_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Optimization error: {str(e)}")

# Weekly routes
@app.get("/api/route/weekly/{mr_name}")
async def generate_weekly_routes(mr_name: str):
    """Generate weekly routes"""
    try:
        # Simple weekly distribution
        daily_route = await optimize_route(mr_name, max_visits=8)
        route_data = daily_route["route_data"]
        
        weekly_routes = {}
        for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
            weekly_routes[day] = {
                "route": route_data["route"][:6],  # 6 customers per day
                "total_customers": min(6, route_data["total_customers"]),
                "estimated_travel_time": route_data["estimated_travel_time"] * 0.8,
                "estimated_revenue": route_data["estimated_revenue"] * 0.8,
                "route_efficiency": route_data["route_efficiency"]
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

# Health check for the app variable (Vercel requirement)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
