from http.server import BaseHTTPRequestHandler
import json
import urllib.parse
import asyncio
import asyncpg
import os
from geopy.distance import geodesic

class RouteOptimizer:
    def __init__(self, db_url):
        self.db_url = db_url
    
    async def get_customer_data(self, mr_name: str):
        conn = await asyncpg.connect(self.db_url)
        try:
            query = """
            SELECT DISTINCT
                c.customer_code,
                c.customer_name,
                c.customer_type,
                c.latitude,
                c.longitude,
                COALESCE(performance.total_priority_score, 30) as priority_score,
                COALESCE(performance.churn_risk_score, 0.5) as churn_risk,
                COALESCE(performance.order_probability, 0.3) as order_probability,
                COALESCE(performance.predicted_order_value, 3000) as predicted_value
            FROM customer_master c
            LEFT JOIN customer_performance performance ON c.customer_code = performance.customer_code
            WHERE c.mr_name = $1
                AND c.status = 'ACTIVE'
                AND c.latitude IS NOT NULL 
                AND c.longitude IS NOT NULL
            ORDER BY performance.total_priority_score DESC
            """
            rows = await conn.fetch(query, mr_name)
            return [dict(row) for row in rows]
        finally:
            await conn.close()
    
    def optimize_daily_route(self, customers, max_visits=10):
        if len(customers) == 0:
            return {"route": [], "total_customers": 0, "estimated_travel_time": 0}
        
        # Simple route optimization
        selected = customers[:max_visits]
        total_time = len(selected) * 30  # 30 min per customer
        
        return {
            "route": selected,
            "total_customers": len(selected),
            "estimated_travel_time": total_time,
            "estimated_revenue": sum(c.get('predicted_value', 0) for c in selected)
        }

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            path = self.path
            parsed = urllib.parse.urlparse(path)
            path_parts = parsed.path.strip('/').split('/')
            
            if len(path_parts) >= 4 and path_parts[0] == 'api' and path_parts[1] == 'route':
                action = path_parts[2]  # optimize or customers
                mr_name = urllib.parse.unquote(path_parts[3])
                
                optimizer = RouteOptimizer(os.getenv('SUPABASE_DB_URL'))
                
                if action == 'optimize':
                    result = asyncio.run(self.optimize_route(optimizer, mr_name))
                elif action == 'customers':
                    result = asyncio.run(self.get_customers(optimizer, mr_name))
                else:
                    result = {"error": "Invalid action"}
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())
            else:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b'Not found')
                
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
    
    async def optimize_route(self, optimizer, mr_name):
        customers = await optimizer.get_customer_data(mr_name)
        route = optimizer.optimize_daily_route(customers)
        return {
            "status": "success",
            "mr_name": mr_name,
            "route_data": route,
            "total_customers_available": len(customers)
        }
    
    async def get_customers(self, optimizer, mr_name):
        customers = await optimizer.get_customer_data(mr_name)
        return {
            "status": "success",
            "mr_name": mr_name,
            "total_customers": len(customers),
            "customers": customers
        }
