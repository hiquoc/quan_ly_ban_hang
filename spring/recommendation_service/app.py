from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import requests
import pandas as pd
import numpy as np
import json
import psycopg2
from psycopg2.extras import Json
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler
import os
from contextlib import asynccontextmanager
from py_eureka_client.eureka_client import EurekaClient  # Eureka import
import socket
import sys


# # Config (use env vars for prod)
# AUTH_URL = resolve_service_url("auth-service", "/auth/public/login")
# ORDERS_API = resolve_service_url("order-service", "/orders/secure/recommend")
# PRODUCT_API = resolve_service_url("product-service", "/product/public/recommend")

USERNAME = os.getenv("ADMIN_ACCOUNT")
PASSWORD = os.getenv("ADMIN_PASSWORD")
CONN_STR = os.getenv("SUPABASE_REC_URL")
if not CONN_STR:
    raise ValueError("CONN_STR env var missing—check .env and docker-compose")


# Eureka config (from env)
EUREKA_SERVER_URL = os.getenv("EUREKA_CLIENT_SERVICEURL_DEFAULTZONE")
SERVICE_NAME = os.getenv("SERVICE_NAME", "rec-service")
SERVICE_PORT = 8080

def get_pg_connection():
    """Create PostgreSQL connection with forced IPv4 resolution"""
    try:
        # Parse connection string
        conn_params = psycopg2.extensions.parse_dsn(CONN_STR)
        
        # If host is present, resolve to IPv4 only
        if 'host' in conn_params:
            hostname = conn_params['host']
            try:
                # Force IPv4 resolution
                ipv4_addr = socket.getaddrinfo(
                    hostname, 
                    None, 
                    socket.AF_INET,  # Force IPv4
                    socket.SOCK_STREAM
                )[0][4][0]
                print(f"Resolved {hostname} to IPv4: {ipv4_addr}", flush=True)
                conn_params['host'] = ipv4_addr
            except (socket.gaierror, IndexError) as e:
                print(f"IPv4 resolution failed for {hostname}: {e}", flush=True)
        
        return psycopg2.connect(**conn_params)
    except Exception as e:
        print(f"PostgreSQL connection error: {e}", flush=True)
        raise

# Helper to create table if not exists
def create_table_if_not_exists():
    conn = get_pg_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS recommendation_matrices (
            matrix_type VARCHAR(50) PRIMARY KEY,
            data JSONB,
            version INTEGER DEFAULT 1,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    conn.commit()
    cur.close()
    conn.close()

# Global Eureka client
eureka_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global eureka_client, augmented_matrix, sim_df
    # Startup: Register with Eureka + Load matrices
    print("Starting up: Registering with Eureka...", flush=True)
    try:
        hostname = socket.gethostname()
        instance_ip = socket.gethostbyname(hostname)
        
        eureka_client = EurekaClient(
            eureka_server=EUREKA_SERVER_URL,
            app_name=SERVICE_NAME,
            instance_port=SERVICE_PORT,
            instance_ip=instance_ip,
            instance_host=hostname,
            home_page_url=f"http://{hostname}:{SERVICE_PORT}/docs",
            health_check_url=f"http://{hostname}:{SERVICE_PORT}/health" 
        )
        await eureka_client.start()
        print(f"Registered {SERVICE_NAME} ({hostname}:{instance_ip}:{SERVICE_PORT}) with Eureka at {EUREKA_SERVER_URL}", flush=True)
    except Exception as e:
        print(f"Eureka registration failed: {e}", flush=True)
    sys.stdout.flush()
    # Load matrices from DB
    print("Loading matrices from DB...", flush=True)
    try:
        create_table_if_not_exists()
        conn = get_pg_connection()
        cur = conn.cursor()
        
        # Load augmented
        cur.execute("SELECT data FROM recommendation_matrices WHERE matrix_type = %s", ("augmented",))
        row = cur.fetchone()
        if row:
            augmented_matrix = pd.read_json(row[0], orient="split")
        
        # Load similarity
        cur.execute("SELECT data FROM recommendation_matrices WHERE matrix_type = %s", ("similarity",))
        row = cur.fetchone()
        if row:
            sim_df = pd.read_json(row[0], orient="split")
        
        cur.close()
        conn.close()
        
        if augmented_matrix is None or sim_df is None:
            print("No matrices in DB; run /rebuild first", flush=True)
    except Exception as e:
        print(f"Load failed: {e}", flush=True)
    yield  # App runs here
    # Shutdown: Deregister Eureka
    print("Shutting down: Deregistering from Eureka...", flush=True)
    if eureka_client:
        try:
            await eureka_client.stop()
        except Exception as e:
            print(f"Eureka deregistration failed: {e}", flush=True)
    sys.stdout.flush()

app = FastAPI(title="Recommendation Service", lifespan=lifespan)

# Global vars (updated on rebuild)
augmented_matrix: pd.DataFrame = None
sim_df: pd.DataFrame = None

class RebuildResponse(BaseModel):
    status: str
    matrix_shape: tuple
    sparsity: float
    version: int

class RecRequest(BaseModel):
    customer_id: int
    k: int = 5
    n: int = 3

class RecResponse(BaseModel):
    recommendations: List[Dict[str, Any]]

def resolve_service_url(service_name: str, path: str = "") -> str:
    """
    Find a running instance of a service registered in Eureka.
    Returns full URL with the path appended.
    """
    if not eureka_client or not hasattr(eureka_client, "applications"):
        raise RuntimeError("Eureka client not initialized or invalid")

    # apps is a list in this version
    apps_list = eureka_client.applications.applications  # this is a list
    app = next((a for a in apps_list if a.name.upper() == service_name.upper()), None)
    
    if not app or not app.instances:
        raise RuntimeError(f"No instances found for service {service_name}")
    
    # Pick the first healthy instance
    inst = app.instances[0]
    host = inst.ipAddr or inst.hostName
    port = inst.port.port if inst.port else 80
    scheme = "http"  # assuming HTTP
    return f"{scheme}://{host}:{port}{path}"

def get_token() -> str:
    print("=== get_token() ===", flush=True)
    
    auth_url = resolve_service_url("auth-service", "/public/login")
    r = requests.post(auth_url, json={"username": USERNAME, "password": PASSWORD})
    
    print("Auth status:", r.status_code, flush=True)
    print("Auth response text (first 300 chars):", r.text[:300], flush=True)

    try:
        raw_json = r.json()
        print("Auth JSON OK:", raw_json, flush=True)
    except Exception as e:
        print("Auth JSON ERROR:", e, flush=True)
        raise ValueError("Auth returned non-JSON response")

    token = raw_json.get("token")
    if not token:
        raise ValueError("Token missing in auth response")

    print("Token OK:", token[:10] + "...", flush=True)
    return token


def fetch_orders(start_date: str = None, end_date: str = None) -> List[Dict[str, Any]]:
    print("=== fetch_orders() ===", flush=True)

    # token = get_token()
    # headers = {"Authorization": f"Bearer {token}"}
    params = {"status": "DELIVERED"}
    if start_date:
        params["startDate"] = start_date
    if end_date:
        params["endDate"] = end_date

    orders_url = resolve_service_url("order-service", "/internal/recommend")
    print("Calling ORDERS_API:", orders_url, flush=True)
    print("Params:", params, flush=True)

    # r = requests.get(orders_url, headers=headers, params=params)
    r = requests.get(orders_url, params=params)

    print("Orders status:", r.status_code, flush=True)
    print("Orders response text (first 500 chars):", r.text[:500], flush=True)

    if r.status_code != 200:
        raise Exception(f"Orders API failed: {r.status_code}")

    raw = r.json()
    data_block = raw.get("data")
    if isinstance(data_block, str):
        data_block = json.loads(data_block)

    if "content" not in data_block:
        raise Exception("Orders API missing 'data.content' field")

    orders = data_block["content"]
    orders_filtered = [
        {
            "orderId": order["id"],
            "customerId": order.get("customerId"),
            "totalAmount": order.get("totalAmount"),
            "items": [
                {
                    "variantId": item.get("variantId"),
                    "productId": item.get("productId"),
                    "quantity": item.get("quantity"),
                    "unitPrice": item.get("unitPrice"),
                    "variantName": item.get("variantName"),
                }
                for item in order.get("items", [])
            ],
        }
        for order in orders
    ]
    print("Orders filtered:", len(orders_filtered), flush=True)
    return orders_filtered


def fetch_reviews(start_date: str = None, end_date: str = None) -> List[Dict[str, Any]]:
    print("=== fetch_reviews() ===", flush=True)

    # token = get_token()
    # headers = {"Authorization": f"Bearer {token}"}
    params = {}
    if start_date:
        params["startDate"] = start_date
    if end_date:
        params["endDate"] = end_date

    reviews_url = resolve_service_url("product-service", "/internal/reviews/recommend")
    print("Calling PRODUCT_API:", reviews_url, flush=True)
    print("Params:", params, flush=True)

    # r = requests.get(reviews_url, headers=headers, params=params)
    r = requests.get(reviews_url, params=params)
    print("Reviews status:", r.status_code, flush=True)
    print("Reviews response text (first 500 chars):", r.text[:500], flush=True)

    if r.status_code != 200:
        raise Exception(f"Reviews API failed: {r.status_code}")

    raw = r.json()
    if not isinstance(raw, list):
        raise Exception("Reviews API expected LIST of reviews")

    reviews_filtered = [
        {
            "reviewId": review["id"],
            "orderId": review.get("orderId"),
            "productId": review.get("productId"),
            "variantId": review.get("variantId"),
            "customerId": review.get("customerId"),
            "rating": review.get("rating"),
        }
        for review in raw
    ]
    print("Reviews filtered:", len(reviews_filtered), flush=True)
    return reviews_filtered



# Process functions (from your code)
def process_orders(orders: List[Dict[str, Any]]) -> pd.DataFrame:
    df = pd.DataFrame(orders)
    if 'items' in df.columns:
        df = df.explode('items').reset_index(drop=True)
        items_df = pd.json_normalize(df['items'])
        df = pd.concat([df.drop(columns=['items']), items_df], axis=1)
    orders_agg = df.groupby(['customerId', 'productId']).agg({'quantity': 'sum'}).reset_index()
    orders_agg['implicit_rating'] = np.minimum(orders_agg['quantity'] * 2.5, 5.0)
    orders_agg['source'] = 'order'
    return orders_agg

def process_reviews(reviews: List[Dict[str, Any]]) -> pd.DataFrame:
    df = pd.DataFrame(reviews)
    reviews_agg = df.groupby(['customerId', 'productId']).agg({'rating': 'mean'}).reset_index()
    reviews_agg['source'] = 'review'
    return reviews_agg

# Rebuild endpoint: Fetch, process, build matrices, store to Supabase PG
@app.post("/rebuild", response_model=RebuildResponse)
async def rebuild_matrices(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    global augmented_matrix, sim_df

    try:
        print("=== REBUILD START ===", flush=True)

        # Create table
        create_table_if_not_exists()

        # Fetch data
        print("Fetching orders...", flush=True)
        orders_raw = fetch_orders(start_date, end_date)
        print(f"Orders fetched: {len(orders_raw)}", flush=True)

        print("Fetching reviews...", flush=True)
        reviews_raw = fetch_reviews(start_date, end_date)
        print(f"Reviews fetched: {len(reviews_raw)}", flush=True)

        # Process orders & reviews
        print("Processing orders...", flush=True)
        orders_agg = process_orders(orders_raw)
        print("Orders agg shape:", orders_agg.shape, flush=True)

        print("Processing reviews...", flush=True)
        reviews_agg = process_reviews(reviews_raw)
        print("Reviews agg shape:", reviews_agg.shape, flush=True)

        # Merge datasets
        print("Merging datasets...", flush=True)
        merged = pd.merge(orders_agg, reviews_agg, on=['customerId', 'productId'], how='outer')
        merged['final_rating'] = np.where(merged['rating'].notna(), merged['rating'], merged['implicit_rating'])
        merged['source'] = merged['source_y'].fillna(merged['source_x'])
        interactions_df = merged[['customerId', 'productId', 'final_rating', 'source', 'quantity']].copy()
        interactions_df = interactions_df.dropna(subset=['final_rating'])
        print("Interactions shape:", interactions_df.shape, flush=True)

        # Build initial user-item matrix
        user_item_matrix = interactions_df.pivot_table(
            index='customerId',
            columns='productId',
            values='final_rating',
            fill_value=0
        )
        print("User-item matrix shape:", user_item_matrix.shape, flush=True)

        # Fake data
        print("Generating synthetic data...", flush=True)
        np.random.seed(44)
        products = user_item_matrix.columns.tolist()
        real_avg_ratings = interactions_df.groupby('productId')['final_rating'].mean().to_dict()

        fake_ids = np.arange(5, 20)
        fake_data = []
        for cust_id in fake_ids:
            num_interactions = np.random.randint(2, 5)
            if len(products) == 0:
                continue
            selected_products = np.random.choice(products, size=num_interactions, replace=False)
            for prod_id in selected_products:
                real_avg = real_avg_ratings.get(prod_id, 3.0)
                rating = np.clip(np.random.normal(real_avg, 1.0), 1, 5)
                quantity = np.random.randint(1, 2)
                fake_data.append({
                    'customerId': cust_id,
                    'productId': prod_id,
                    'final_rating': round(rating, 1),
                    'source': 'synthetic',
                    'quantity': quantity
                })

        fake_df = pd.DataFrame(fake_data)
        print("Fake data shape:", fake_df.shape, flush=True)

        augmented_df = pd.concat([interactions_df, fake_df], ignore_index=True)
        augmented_df = augmented_df.drop_duplicates(subset=['customerId', 'productId'], keep='last')
        augmented_df = augmented_df.sort_values(['customerId', 'productId']).reset_index(drop=True)
        print("Augmented DF shape:", augmented_df.shape, flush=True)

        # Build augmented matrix
        augmented_matrix = augmented_df.pivot_table(
            index='customerId',
            columns='productId',
            values='final_rating',
            fill_value=0
        )
        print("Augmented matrix shape:", augmented_matrix.shape, flush=True)

        if augmented_matrix.empty:
            raise Exception("Augmented matrix is empty — no interactions.")

        # Debug NaN counts
        print("NaN in augmented matrix:", augmented_matrix.isna().sum().sum(), flush=True)

        # Compute similarity
        print("Normalizing matrix...", flush=True)
        scaler = MinMaxScaler()
        normalized_matrix = scaler.fit_transform(augmented_matrix)

        normalized_df = pd.DataFrame(normalized_matrix, index=augmented_matrix.index, columns=augmented_matrix.columns)
        print("Normalized matrix ready", flush=True)

        print("Computing cosine similarity...", flush=True)
        norm_array = normalized_df.values
        similarity_matrix = cosine_similarity(norm_array)

        sim_df = pd.DataFrame(similarity_matrix, index=augmented_matrix.index, columns=augmented_matrix.index)
        print("Similarity matrix shape:", sim_df.shape, flush=True)

        # Debug JSON conversion
        print("Testing JSON conversion...", flush=True)
        try:
            aug_json = augmented_matrix.to_json(orient="split")
            print("Aug JSON OK (first 200 chars):", aug_json[:200], flush=True)
        except Exception as e:
            print("Augmented matrix JSON error:", e, flush=True)
            raise

        try:
            sim_json = sim_df.to_json(orient="split")
            print("Sim JSON OK (first 200 chars):", sim_json[:200], flush=True)
        except Exception as e:
            print("Similarity matrix JSON error:", e, flush=True)
            raise

        # Save to Supabase PG
        print("Connecting to Postgres...", flush=True)
        conn = get_pg_connection()
        cur = conn.cursor()

        print("Fetching current version...", flush=True)
        cur.execute("SELECT version FROM recommendation_matrices WHERE matrix_type = %s", ("augmented",))
        version_row = cur.fetchone()
        new_version = 1 if version_row is None else version_row[0] + 1
        print("New version:", new_version, flush=True)

        print("Upserting augmented matrix...", flush=True)
        cur.execute("""
            INSERT INTO recommendation_matrices (matrix_type, data, version, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (matrix_type) DO UPDATE SET data = EXCLUDED.data, version = EXCLUDED.version, updated_at = NOW()
        """, ("augmented", Json(aug_json), new_version))

        print("Upserting similarity matrix...", flush=True)
        cur.execute("""
            INSERT INTO recommendation_matrices (matrix_type, data, version, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (matrix_type) DO UPDATE SET data = EXCLUDED.data, version = EXCLUDED.version, updated_at = NOW()
        """, ("similarity", Json(sim_json), new_version))

        conn.commit()
        cur.close()
        conn.close()

        print("Postgres save complete.", flush=True)

        # Sparsity
        sparsity = 1.0 - (augmented_matrix > 0).sum().sum() / (augmented_matrix.shape[0] * augmented_matrix.shape[1])
        print(f"Sparsity: {sparsity*100:.1f}%", flush=True)

        print("=== REBUILD FINISHED SUCCESSFULLY ===", flush=True)

        return RebuildResponse(
            status="success",
            matrix_shape=augmented_matrix.shape,
            sparsity=sparsity,
            version=new_version
        )

    except Exception as e:
        print("=== REBUILD ERROR ===", e, flush=True)
        raise HTTPException(status_code=500, detail=f"Rebuild failed: {str(e)}")

# Recommendation endpoint (as before, using globals)
@app.post("/recommendations", response_model=RecResponse)
async def get_recommendations(request: RecRequest):
    if augmented_matrix is None or sim_df is None:
        raise HTTPException(status_code=503, detail="Matrices not loaded; run /rebuild")
   
    if request.customer_id is None or request.customer_id not in augmented_matrix.index:
        popular = augmented_matrix.mean().sort_values(ascending=False).head(request.n).to_dict()
        return RecResponse(recommendations=[
            {"product_id": int(prod), "score": float(score)}
            for prod, score in popular.items()
        ])
    customer_id = request.customer_id
    # if customer_id not in augmented_matrix.index:
    #     popular = augmented_matrix.mean().sort_values(ascending=False).head(request.n).to_dict()
    #     return RecResponse(recommendations=[{"product_id": int(prod), "score": float(score)} for prod, score in popular.items()])

   
    similar_custs = sim_df.loc[customer_id].sort_values(ascending=False).iloc[1:request.k+1].index.tolist()
    print(f"Top {request.k} similar to {customer_id}: {similar_custs}")
    customer_ratings = augmented_matrix.loc[customer_id]
    unseen = customer_ratings[customer_ratings == 0].index.tolist()
    if not unseen:
        raise HTTPException(status_code=400, detail="No new recommendations")
   
    predictions = {}
    for prod in unseen:
        weighted_sum = 0
        sim_sum = 0
        for sim_cust in similar_custs:
            if augmented_matrix.loc[sim_cust, prod] > 0:
                sim_score = sim_df.loc[customer_id, sim_cust]
                rating = augmented_matrix.loc[sim_cust, prod]
                weighted_sum += sim_score * rating
                sim_sum += sim_score
        predictions[int(prod)] = weighted_sum / sim_sum if sim_sum > 0 else 0
   
    recs = sorted(predictions.items(), key=lambda x: x[1], reverse=True)[:request.n]
    return RecResponse(recommendations=[{"product_id": prod, "score": round(score, 2)} for prod, score in recs])

# Health check
@app.get("/health")
def health():
    return {"status": "healthy", "matrices_loaded": augmented_matrix is not None}