from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import requests
import pandas as pd
import numpy as np
import json
import psycopg2
from psycopg2.extras import Json
import os
from contextlib import asynccontextmanager
from py_eureka_client.eureka_client import EurekaClient  # Eureka import
import socket
import sys
import torch
import torch.nn as nn
from torch.optim import Adam
from torch.utils.data import DataLoader, TensorDataset, random_split
from datetime import datetime, timedelta
from io import StringIO

USERNAME = os.getenv("ADMIN_ACCOUNT")
PASSWORD = os.getenv("ADMIN_PASSWORD")
CONN_STR = os.getenv("SUPABASE_REC_URL")
if not CONN_STR:
    raise ValueError("CONN_STR env var missing—check .env and docker-compose")
# Eureka config (from env)
EUREKA_SERVER_URL = os.getenv("EUREKA_CLIENT_SERVICEURL_DEFAULTZONE")
SERVICE_NAME = os.getenv("SERVICE_NAME", "rec-service")
SERVICE_PORT = 8080
class RecModel(nn.Module):
    def __init__(self, num_users, num_items, emb_dim=32):
        super(RecModel, self).__init__()
        self.user_emb = nn.Embedding(num_users, emb_dim)
        self.item_emb = nn.Embedding(num_items, emb_dim)
        self.fc = nn.Linear(emb_dim * 2, 1)
    def forward(self, user_ids, item_ids):
        user_vecs = self.user_emb(user_ids)
        item_vecs = self.item_emb(item_ids)
        x = torch.cat([user_vecs, item_vecs], dim=-1)
        out = self.fc(x)
        return out.squeeze()
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
        CREATE TABLE IF NOT EXISTS recommendation_artifacts (
            artifact_type VARCHAR(50) PRIMARY KEY,
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
# Global vars (updated on rebuild)
model: RecModel = None
user_map: Dict[int, int] = None
item_map: Dict[int, int] = None
rev_user_map: Dict[int, int] = None
rev_item_map: Dict[int, int] = None
augmented_df: pd.DataFrame = None  # Keep for recs
@asynccontextmanager
async def lifespan(app: FastAPI):
    global eureka_client, model, user_map, item_map, rev_user_map, rev_item_map, augmented_df
    # Startup: Register with Eureka + Load artifacts
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
    # Load artifacts from DB
    print("Loading artifacts from DB...", flush=True)
    try:
        create_table_if_not_exists()
        conn = get_pg_connection()
        cur = conn.cursor()
        
        # Load augmented_df
        cur.execute("SELECT data FROM recommendation_artifacts WHERE artifact_type = %s", ("augmented_df",))
        row = cur.fetchone()
        if row:
            augmented_df = pd.read_json(row[0], orient="split")
        
        # Load user_map
        cur.execute("SELECT data FROM recommendation_artifacts WHERE artifact_type = %s", ("user_map",))
        row = cur.fetchone()
        if row:
            user_map = {int(k): int(v) for k, v in json.loads(row[0]).items()}
            rev_user_map = {v: int(k) for k, v in user_map.items()}
        
        # Load item_map
        cur.execute("SELECT data FROM recommendation_artifacts WHERE artifact_type = %s", ("item_map",))
        row = cur.fetchone()
        if row:
            item_map = {int(k): int(v) for k, v in json.loads(row[0]).items()}
            rev_item_map = {v: int(k) for k, v in item_map.items()}
        
        # FIXED: Load model_state (flat structure: { 'layer.weight': [floats] })
        cur.execute("SELECT data FROM recommendation_artifacts WHERE artifact_type = %s", ("model_state",))
        row = cur.fetchone()
        if row and user_map and item_map:
            try:
                state_serialized = json.loads(row[0])  # { 'user_emb.weight': [[0.1, 0.2, ...], ...] }
                state_dict = {k: torch.tensor(v) for k, v in state_serialized.items()}  # Rebuild tensors
                num_users = len(user_map)
                num_items = len(item_map)
                model = RecModel(num_users, num_items)
                model.load_state_dict(state_dict)
                model.eval()
                print("Model loaded successfully", flush=True)
            except Exception as load_err:
                print(f"Model load error: {load_err}", flush=True)
                model = None  # Fallback
        
        cur.close()
        conn.close()
        
        if model is None or user_map is None or item_map is None or augmented_df is None:
            print("No artifacts in DB; run /rebuild first", flush=True)
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
class RebuildResponse(BaseModel):
    status: str
    num_users: int
    num_items: int
    version: int
class RecRequest(BaseModel):
    customer_id: int
    k: int = 5  # Not used in neural, but keep for compat
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
def fetch_active_products() -> List[int]:
    active_product_url=resolve_service_url("product-service","/internal/active-products")
    r = requests.get(active_product_url)
    r.raise_for_status()
    raw = r.json()
    data_block = raw
    if isinstance(data_block, str):
        data_block = json.loads(data_block)

    products = data_block
    return products


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
def fine_tune_model(fine_tune_df: pd.DataFrame, prev_model=None, prev_user_map=None, prev_item_map=None,
                    num_epochs: int = 5, lr: float = 0.001) -> tuple[RecModel, dict, dict]:
    # Build full maps: prev + new
    all_customers = sorted(set(list(fine_tune_df['customerId'].unique()) + list(prev_user_map.keys() if prev_user_map else [])))
    all_products = sorted(set(list(fine_tune_df['productId'].unique()) + list(prev_item_map.keys() if prev_item_map else [])))
    
    user_map = {cust: idx for idx, cust in enumerate(all_customers)}
    item_map = {prod: idx for idx, prod in enumerate(all_products)}
    num_users = len(all_customers)
    num_items = len(all_products)
    
    # Initialize or load model
    if prev_model is None:
        model = RecModel(num_users, num_items)  # Full train fallback
    else:
        # Expand prev_model embeddings for new users/items
        old_num_users, old_num_items = prev_model.user_emb.weight.shape[0], prev_model.item_emb.weight.shape[0]
        model = RecModel(num_users, num_items)
        
        # Copy old embeddings
        with torch.no_grad():
            model.user_emb.weight[:old_num_users] = prev_model.user_emb.weight
            model.item_emb.weight[:old_num_items] = prev_model.item_emb.weight
        
        # Init new: average of existing for stability
        if num_users > old_num_users:
            avg_user_emb = model.user_emb.weight[:old_num_users].mean(0)
            nn.init.normal_(model.user_emb.weight[old_num_users:], mean=avg_user_emb.mean().item(), std=0.01)
        if num_items > old_num_items:
            avg_item_emb = model.item_emb.weight[:old_num_items].mean(0)
            nn.init.normal_(model.item_emb.weight[old_num_items:], mean=avg_item_emb.mean().item(), std=0.01)
    
    # Prepare data (same as before, but on fine_tune_df)
    train_data = []
    for _, row in fine_tune_df.iterrows():
        u_idx = user_map[row['customerId']]
        i_idx = item_map[row['productId']]
        r_norm = row['final_rating'] / 5.0
        train_data.append((u_idx, i_idx, r_norm))
    
    print(f"Fine-tuning data ready: {len(train_data)} samples")
    
    if len(train_data) == 0:
        raise ValueError("No fine-tuning data available")
    
    # Rest is similar: split, dataloaders, but fewer epochs + lower LR
    optimizer = Adam(model.parameters(), lr=lr)  # Lower LR for fine-tuning
    criterion = nn.MSELoss()
    
    train_size = int(0.9 * len(train_data))
    val_size = len(train_data) - train_size
    train_split, val_split = random_split(train_data, [train_size, val_size])
    
    def build_dataset(split):
        users, items, ratings = zip(*[
            (torch.tensor(u, dtype=torch.long),
             torch.tensor(i, dtype=torch.long),
             torch.tensor(float(r), dtype=torch.float))
            for (u, i, r) in split
        ])
        return TensorDataset(
            torch.stack(users),
            torch.stack(items),
            torch.stack(ratings)
        )
    
    train_dataset = build_dataset(train_split)
    val_dataset = build_dataset(val_split)
    
    batch_size = min(8, len(train_dataset))
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=len(val_dataset), shuffle=False)
    
    best_val_loss = float('inf')
    patience = 2  # Lower patience for fine-tune
    no_improve = 0
    model.train()
    for epoch in range(num_epochs):
        train_loss = 0
        for batch in train_loader:
            users, items, targets = batch
            pred = model(users, items).unsqueeze(1)
            loss = criterion(pred, targets.unsqueeze(1))
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * len(batch[0])
        avg_train_loss = train_loss / len(train_dataset)
        
        model.eval()
        val_loss = 0
        with torch.no_grad():
            for batch in val_loader:
                users, items, targets = batch
                pred = model(users, items).unsqueeze(1)
                val_loss += criterion(pred, targets.unsqueeze(1)).item() * len(batch[0])
        avg_val_loss = val_loss / len(val_dataset)
        model.train()
        
        print(f"Epoch {epoch+1}/{num_epochs}, Train Loss: {avg_train_loss:.4f}, Val Loss: {avg_val_loss:.4f}")
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            no_improve = 0
        else:
            no_improve += 1
            if no_improve >= patience:
                print(f"Early stopping at epoch {epoch+1}")
                break
    
    # Negative sampling (adapted for efficiency)
    print("Adding negative sampling...")
    neg_samples = []
    num_neg = min(len(train_data) * 2, 500)  # Cap for speed
    seen_set = set((u, i) for u, i, _ in train_data)
    for _ in range(num_neg):
        u_idx = np.random.randint(0, num_users)
        i_idx = np.random.randint(0, num_items)
        if (u_idx, i_idx) not in seen_set:
            neg_samples.append((u_idx, i_idx, 0.0))
    
    model.train()
    for u, i, r in neg_samples[:100]:  # Limit for efficiency
        pred = model(torch.tensor([u], dtype=torch.long), torch.tensor([i], dtype=torch.long)).unsqueeze(0)
        loss = criterion(pred, torch.tensor([r], dtype=torch.float))
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
    
    model.eval()
    print("Fine-tuning completed!")
    return model, user_map, item_map

def train_model(augmented_df: pd.DataFrame, num_epochs: int = 20) -> tuple[RecModel, dict, dict]:
    # Fallback full training if no prev
    unique_customers = sorted(augmented_df['customerId'].unique())
    unique_products = sorted(augmented_df['productId'].unique())
    user_map = {cust: idx for idx, cust in enumerate(unique_customers)}
    item_map = {prod: idx for idx, prod in enumerate(unique_products)}
    num_users = len(unique_customers)
    num_items = len(unique_products)
   
    # Prepare training data
    train_data = []
    for _, row in augmented_df.iterrows():
        u_idx = user_map[row['customerId']]
        i_idx = item_map[row['productId']]
        r_norm = row['final_rating'] / 5.0  # Normalize to [0,1]
        train_data.append((u_idx, i_idx, r_norm))
   
    print(f"Training data ready: {len(train_data)} samples")
   
    if len(train_data) == 0:
        raise ValueError("No training data available")
   
    model = RecModel(num_users, num_items)
    optimizer = Adam(model.parameters(), lr=0.01)
    criterion = nn.MSELoss()
   
    train_size = int(0.9 * len(train_data))
    val_size = len(train_data) - train_size
    train_split, val_split = random_split(train_data, [train_size, val_size])
   
    def build_dataset(split):
        users, items, ratings = zip(*[
            (torch.tensor(u, dtype=torch.long),
             torch.tensor(i, dtype=torch.long),
             torch.tensor(float(r), dtype=torch.float))
            for (u, i, r) in split
        ])
        return TensorDataset(
            torch.stack(users),
            torch.stack(items),
            torch.stack(ratings)
        )
   
    train_dataset = build_dataset(train_split)
    val_dataset = build_dataset(val_split)
   
    batch_size = min(8, len(train_dataset))
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=len(val_dataset), shuffle=False)
   
    best_val_loss = float('inf')
    patience = 3
    no_improve = 0
    model.train()
    for epoch in range(num_epochs):
        train_loss = 0
        for batch in train_loader:
            users, items, targets = batch
            pred = model(users, items).unsqueeze(1)
            loss = criterion(pred, targets.unsqueeze(1))
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * len(batch[0])
        avg_train_loss = train_loss / len(train_dataset)
        
        model.eval()
        val_loss = 0
        with torch.no_grad():
            for batch in val_loader:
                users, items, targets = batch
                pred = model(users, items).unsqueeze(1)
                val_loss += criterion(pred, targets.unsqueeze(1)).item() * len(batch[0])
        avg_val_loss = val_loss / len(val_dataset)
        model.train()
        
        print(f"Epoch {epoch+1}/{num_epochs}, Train Loss: {avg_train_loss:.4f}, Val Loss: {avg_val_loss:.4f}")
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            no_improve = 0
        else:
            no_improve += 1
            if no_improve >= patience:
                print(f"Early stopping at epoch {epoch+1}")
                break
   
    # Negative sampling
    print("Adding negative sampling...")
    neg_samples = []
    num_neg = len(train_data) * 2
    seen_set = set((u, i) for u, i, _ in train_data)
    for _ in range(num_neg):
        u_idx = np.random.randint(0, num_users)
        i_idx = np.random.randint(0, num_items)
        if (u_idx, i_idx) not in seen_set:
            neg_samples.append((u_idx, i_idx, 0.0))
   
    model.train()
    for u, i, r in neg_samples[:100]:  # Limit for efficiency
        pred = model(torch.tensor([u], dtype=torch.long), torch.tensor([i], dtype=torch.long)).unsqueeze(0)
        loss = criterion(pred, torch.tensor([r], dtype=torch.float))
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
   
    model.eval()
    print("Training completed!")
    return model, user_map, item_map
def get_recommendations(model: RecModel, user_map: Dict[int, int], item_map: Dict[int, int], augmented_df: pd.DataFrame, customer_id: int, n: int = 3):
    active_products = fetch_active_products()
    if customer_id not in user_map:
        popular = augmented_df.groupby('productId')['final_rating'].mean().sort_values(ascending=False).head(n)
        return [{'product_id': int(pid), 'score': float(score)} for pid, score in popular.items()]
   
    u_idx = user_map[customer_id]
    seen_products = augmented_df[augmented_df['customerId'] == customer_id]['productId'].unique()
    all_products = list(item_map.keys())
    unseen = [p for p in all_products if p not in seen_products]
    if active_products is not None:
        unseen = [p for p in unseen if p in active_products]
    if not unseen:
        return []
   
    predictions = {}
    model.eval()
    with torch.no_grad():
        for prod in unseen:
            i_idx = item_map[prod]
            pred_norm = model(torch.tensor([u_idx], dtype=torch.long),
                              torch.tensor([i_idx], dtype=torch.long)).item()
            pred_rating = pred_norm * 5.0
            pred_rating = max(1.0, min(5.0, pred_rating))
            predictions[int(prod)] = pred_rating
   
    top_recs = sorted(predictions.items(), key=lambda x: x[1], reverse=True)[:n]
    return [{'product_id': prod, "score": round(score, 2)} for prod, score in top_recs]
# Rebuild endpoint: Fetch, process, build/train model, store to Supabase PG
@app.post("/rebuild", response_model=RebuildResponse)
async def rebuild_matrices():
    global model, user_map, item_map, rev_user_map, rev_item_map, augmented_df
    try:
        print("=== REBUILD START ===", flush=True)
        create_table_if_not_exists()
        # Fetch data
        print(f"Fetching orders...", flush=True)
        orders_raw = fetch_orders()
        print(f"Orders fetched: {len(orders_raw)}", flush=True)
        print("Fetching reviews...", flush=True)
        reviews_raw = fetch_reviews()
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
        interactions_df['customerId'] = interactions_df['customerId'].astype(int)
        interactions_df['productId'] = interactions_df['productId'].astype(int)
        # Build initial user-item matrix
        user_item_matrix = interactions_df.pivot_table(
            index='customerId',
            columns='productId',
            values='final_rating',
            fill_value=0
        )
        print("User-item matrix shape:", user_item_matrix.shape, flush=True)
        print("Loading previous artifacts...", flush=True)
        prev_aug_str = fetch_artifact("augmented_df")
        prev_aug_df = pd.read_json(StringIO(prev_aug_str), orient="split") if prev_aug_str else pd.DataFrame()
        prev_user_map_str = fetch_artifact("user_map")
        prev_user_map = {int(k): int(v) for k, v in json.loads(prev_user_map_str).items()} if prev_user_map_str else {}
        prev_item_map_str = fetch_artifact("item_map")
        prev_item_map = {int(k): int(v) for k, v in json.loads(prev_item_map_str).items()} if prev_item_map_str else {}
        prev_state_str = fetch_artifact("model_state")
        prev_model = None
        if prev_state_str and prev_user_map and prev_item_map:
            try:
                prev_state_serialized = json.loads(prev_state_str)
                prev_state_dict = {k: torch.tensor(v) for k, v in prev_state_serialized.items()}
                old_num_users = len(prev_user_map)
                old_num_items = len(prev_item_map)
                prev_model = RecModel(old_num_users, old_num_items)
                prev_model.load_state_dict(prev_state_dict)
                print("Previous model loaded for fine-tuning")
            except Exception as load_err:
                print(f"Previous model load error: {load_err}", flush=True)
                prev_model = None

        if len(prev_aug_df) > 0:
            old_sample_size = min(int(0.1 * len(prev_aug_df)), 1000)
            old_sample = prev_aug_df.sample(n=old_sample_size, random_state=42)
            # Exclude pairs in new to avoid overlap
            new_pairs = set(zip(interactions_df['customerId'], interactions_df['productId']))
            old_sample = old_sample[~old_sample[['customerId', 'productId']].apply(tuple, axis=1).isin(new_pairs)]
            fine_tune_df = pd.concat([interactions_df, old_sample], ignore_index=True)
            print(f"Delta size: {len(interactions_df)}, Old sample: {len(old_sample)}, Fine-tune total: {len(fine_tune_df)}")
        else:
            fine_tune_df = interactions_df
            print("No previous data; full training on new interactions")
        # Update full augmented_df: concat new with prev, drop dups (new overrides)
        if len(prev_aug_df) > 0:
            full_augmented = pd.concat([prev_aug_df, interactions_df], ignore_index=True)
            full_augmented = full_augmented.drop_duplicates(subset=['customerId', 'productId'], keep='last')
        else:
            full_augmented = interactions_df
        
        augmented_df = full_augmented.sort_values(['customerId', 'productId']).reset_index(drop=True)
        augmented_df['customerId'] = augmented_df['customerId'].astype(int)
        augmented_df['productId'] = augmented_df['productId'].astype(int)
        print("Updated Augmented DF shape:", augmented_df.shape, flush=True)
        # Fine-tune or train model
        print("Fine-tuning neural model...", flush=True)
        if prev_model is not None and len(prev_aug_df) > 0:
            model, user_map, item_map = fine_tune_model(fine_tune_df, prev_model, prev_user_map, prev_item_map)
        else:
            model, user_map, item_map = train_model(augmented_df)  # Full if no prev
        user_map = {int(k): int(v) for k, v in user_map.items()}
        item_map = {int(k): int(v) for k, v in item_map.items()}
        rev_user_map = {v: k for k, v in user_map.items()}
        rev_item_map = {v: k for k, v in item_map.items()}
        print(f"Model fine-tuned: {len(user_map)} users, {len(item_map)} items")
        # Save augmented_df
        aug_json = augmented_df.to_json(orient="split")
        # Save maps
        user_map_json = json.dumps(user_map)
        item_map_json = json.dumps(item_map)
        # Save model state
        state_dict = model.state_dict()
        state_serialized = {}
        for k, v in state_dict.items():
            if isinstance(v, torch.Tensor):
                state_serialized[k] = v.cpu().tolist()
            else:
                state_serialized[k] = v
        state_json = json.dumps(state_serialized)
        # Save to Supabase PG
        print("Connecting to Postgres...", flush=True)
        conn = get_pg_connection()
        cur = conn.cursor()
        print("Fetching current version...", flush=True)
        cur.execute("SELECT version FROM recommendation_artifacts WHERE artifact_type = %s", ("model_state",))
        version_row = cur.fetchone()
        new_version = 1 if version_row is None else version_row[0] + 1
        print("New version:", new_version, flush=True)
        # Upsert augmented_df
        cur.execute("""
            INSERT INTO recommendation_artifacts (artifact_type, data, version, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (artifact_type) DO UPDATE SET data = EXCLUDED.data, version = EXCLUDED.version, updated_at = NOW()
        """, ("augmented_df", Json(aug_json), new_version))
        # Upsert user_map
        cur.execute("""
            INSERT INTO recommendation_artifacts (artifact_type, data, version, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (artifact_type) DO UPDATE SET data = EXCLUDED.data, version = EXCLUDED.version, updated_at = NOW()
        """, ("user_map", Json(user_map_json), new_version))
        # Upsert item_map
        cur.execute("""
            INSERT INTO recommendation_artifacts (artifact_type, data, version, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (artifact_type) DO UPDATE SET data = EXCLUDED.data, version = EXCLUDED.version, updated_at = NOW()
        """, ("item_map", Json(item_map_json), new_version))
        # Upsert model_state
        cur.execute("""
            INSERT INTO recommendation_artifacts (artifact_type, data, version, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (artifact_type) DO UPDATE SET data = EXCLUDED.data, version = EXCLUDED.version, updated_at = NOW()
        """, ("model_state", Json(state_json), new_version))
        conn.commit()
        cur.close()
        conn.close()
        print("Postgres save complete.", flush=True)
        print("=== REBUILD FINISHED SUCCESSFULLY ===", flush=True)
        return RebuildResponse(
            status="success",
            num_users=len(user_map),
            num_items=len(item_map),
            version=new_version
        )
    except Exception as e:
        print("=== REBUILD ERROR ===", e, flush=True)
        raise HTTPException(status_code=500, detail=f"Rebuild failed: {str(e)}")# Recommendation endpoint
@app.post("/recommendations", response_model=RecResponse)
async def get_recs(request: RecRequest):
    if model is None or user_map is None or item_map is None or augmented_df is None:
        raise HTTPException(status_code=503, detail="Model not loaded; run /rebuild")
   
    recs = get_recommendations(model, user_map, item_map, augmented_df, request.customer_id, request.n)
    print(f"Top {request.n} products recommended for customer {request.customer_id}:")
    print(recs)
    return RecResponse(recommendations=recs)
# Health check
@app.get("/health")
def health():
    return {"status": "healthy", "model_loaded": model is not None}
def fetch_artifact(artifact_type: str):
    conn = get_pg_connection()
    cur = conn.cursor()
    cur.execute("SELECT data FROM recommendation_artifacts WHERE artifact_type = %s ORDER BY version DESC LIMIT 1", (artifact_type,))
    result = cur.fetchone()
    cur.close()
    conn.close()
    return result[0] if result else None

@app.post("/rebuildAll", response_model=RebuildResponse)
async def rebuildAll_matrices():
    global model, user_map, item_map, rev_user_map, rev_item_map, augmented_df
    try:
        print("=== REBUILDALL START ===", flush=True)
        create_table_if_not_exists()
        
        # Calculate dates for last 90 days
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=90)
        start_date_str = start_date.strftime("%Y-%m-%d")
        end_date_str = end_date.strftime("%Y-%m-%d")
        
        print(f"Fetching orders from {start_date_str} to {end_date_str}...", flush=True)
        orders_raw = fetch_orders(start_date=start_date_str, end_date=end_date_str)
        print(f"Orders fetched: {len(orders_raw)}", flush=True)
        
        print(f"Fetching reviews from {start_date_str} to {end_date_str}...", flush=True)
        reviews_raw = fetch_reviews(start_date=start_date_str, end_date=end_date_str)
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
        interactions_df['customerId'] = interactions_df['customerId'].astype(int)
        interactions_df['productId'] = interactions_df['productId'].astype(int)
        
        # Build initial user-item matrix
        user_item_matrix = interactions_df.pivot_table(
            index='customerId',
            columns='productId',
            values='final_rating',
            fill_value=0
        )
        print("User-item matrix shape:", user_item_matrix.shape, flush=True)
        
        print("Loading previous artifacts...", flush=True)
        prev_aug_str = fetch_artifact("augmented_df")
        prev_aug_df = pd.read_json(StringIO(prev_aug_str), orient="split") if prev_aug_str else pd.DataFrame()
        prev_user_map_str = fetch_artifact("user_map")
        prev_user_map = {int(k): int(v) for k, v in json.loads(prev_user_map_str).items()} if prev_user_map_str else {}
        prev_item_map_str = fetch_artifact("item_map")
        prev_item_map = {int(k): int(v) for k, v in json.loads(prev_item_map_str).items()} if prev_item_map_str else {}
        prev_state_str = fetch_artifact("model_state")
        prev_model = None
        if prev_state_str and prev_user_map and prev_item_map:
            try:
                prev_state_serialized = json.loads(prev_state_str)
                prev_state_dict = {k: torch.tensor(v) for k, v in prev_state_serialized.items()}
                old_num_users = len(prev_user_map)
                old_num_items = len(prev_item_map)
                prev_model = RecModel(old_num_users, old_num_items)
                prev_model.load_state_dict(prev_state_dict)
                print("Previous model loaded for fine-tuning")
            except Exception as load_err:
                print(f"Previous model load error: {load_err}", flush=True)
                prev_model = None
        
        if len(prev_aug_df) > 0:
            old_sample_size = min(int(0.1 * len(prev_aug_df)), 1000)
            old_sample = prev_aug_df.sample(n=old_sample_size, random_state=42)
            # Exclude pairs in new to avoid overlap
            new_pairs = set(zip(interactions_df['customerId'], interactions_df['productId']))
            old_sample = old_sample[~old_sample[['customerId', 'productId']].apply(tuple, axis=1).isin(new_pairs)]
            fine_tune_df = pd.concat([interactions_df, old_sample], ignore_index=True)
            print(f"Delta size: {len(interactions_df)}, Old sample: {len(old_sample)}, Fine-tune total: {len(fine_tune_df)}")
        else:
            fine_tune_df = interactions_df
            print("No previous data; full training on new interactions")
        
        # Update full augmented_df: concat new with prev, drop dups (new overrides)
        if len(prev_aug_df) > 0:
            full_augmented = pd.concat([prev_aug_df, interactions_df], ignore_index=True)
            full_augmented = full_augmented.drop_duplicates(subset=['customerId', 'productId'], keep='last')
        else:
            full_augmented = interactions_df
        
        augmented_df = full_augmented.sort_values(['customerId', 'productId']).reset_index(drop=True)
        augmented_df['customerId'] = augmented_df['customerId'].astype(int)
        augmented_df['productId'] = augmented_df['productId'].astype(int)
        print("Updated Augmented DF shape:", augmented_df.shape, flush=True)
        
        # Fine-tune or train model
        print("Fine-tuning neural model...", flush=True)
        if prev_model is not None and len(prev_aug_df) > 0:
            model, user_map, item_map = fine_tune_model(fine_tune_df, prev_model, prev_user_map, prev_item_map)
        else:
            model, user_map, item_map = train_model(augmented_df)  # Full if no prev
        user_map = {int(k): int(v) for k, v in user_map.items()}
        item_map = {int(k): int(v) for k, v in item_map.items()}
        rev_user_map = {v: k for k, v in user_map.items()}
        rev_item_map = {v: k for k, v in item_map.items()}
        print(f"Model fine-tuned: {len(user_map)} users, {len(item_map)} items")
        
        # Save augmented_df
        aug_json = augmented_df.to_json(orient="split")
        # Save maps
        user_map_json = json.dumps(user_map)
        item_map_json = json.dumps(item_map)
        # Save model state
        state_dict = model.state_dict()
        state_serialized = {}
        for k, v in state_dict.items():
            if isinstance(v, torch.Tensor):
                state_serialized[k] = v.cpu().tolist()
            else:
                state_serialized[k] = v
        state_json = json.dumps(state_serialized)
        
        # Save to Supabase PG
        print("Connecting to Postgres...", flush=True)
        conn = get_pg_connection()
        cur = conn.cursor()
        print("Fetching current version...", flush=True)
        cur.execute("SELECT version FROM recommendation_artifacts WHERE artifact_type = %s", ("model_state",))
        version_row = cur.fetchone()
        new_version = 1 if version_row is None else version_row[0] + 1
        print("New version:", new_version, flush=True)
        
        # Upsert augmented_df
        cur.execute("""
            INSERT INTO recommendation_artifacts (artifact_type, data, version, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (artifact_type) DO UPDATE SET data = EXCLUDED.data, version = EXCLUDED.version, updated_at = NOW()
        """, ("augmented_df", Json(aug_json), new_version))
        # Upsert user_map
        cur.execute("""
            INSERT INTO recommendation_artifacts (artifact_type, data, version, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (artifact_type) DO UPDATE SET data = EXCLUDED.data, version = EXCLUDED.version, updated_at = NOW()
        """, ("user_map", Json(user_map_json), new_version))
        # Upsert item_map
        cur.execute("""
            INSERT INTO recommendation_artifacts (artifact_type, data, version, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (artifact_type) DO UPDATE SET data = EXCLUDED.data, version = EXCLUDED.version, updated_at = NOW()
        """, ("item_map", Json(item_map_json), new_version))
        # Upsert model_state
        cur.execute("""
            INSERT INTO recommendation_artifacts (artifact_type, data, version, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (artifact_type) DO UPDATE SET data = EXCLUDED.data, version = EXCLUDED.version, updated_at = NOW()
        """, ("model_state", Json(state_json), new_version))
        conn.commit()
        cur.close()
        conn.close()
        print("Postgres save complete.", flush=True)
        print("=== REBUILDALL FINISHED SUCCESSFULLY ===", flush=True)
        return RebuildResponse(
            status="success",
            num_users=len(user_map),
            num_items=len(item_map),
            version=new_version
        )
    except Exception as e:
        print("=== REBUILDALL ERROR ===", e, flush=True)
        raise HTTPException(status_code=500, detail=f"RebuildAll failed: {str(e)}")
