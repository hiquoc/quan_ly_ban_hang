# --------------------------------------------------------------
# GET DATA – ONLY customerId (no userId)
# --------------------------------------------------------------
import requests
import pandas as pd
import json
from typing import List, Dict, Any

# ========================== CONFIG ==========================
AUTH_URL    = "http://localhost:8080/auth/public/login"
ORDERS_API  = "http://localhost:8080/orders/secure/recommend"
PRODUCT_API = "http://localhost:8080/product/public/recommend"
USERNAME    = "admin"
PASSWORD    = "123456"

# ----- OPTIONAL DATE FILTERS (ISO format) -----
START_DATE = None          # e.g. "2025-11-01"
END_DATE   = None          # e.g. "2025-11-07"

# ========================== 1. GET TOKEN ==========================
def get_token() -> str:
    r = requests.post(AUTH_URL, json={"username": USERNAME, "password": PASSWORD})
    r.raise_for_status()
    token = r.json().get("token") or r.json().get("accessToken")
    if not token:
        raise ValueError("Token missing")
    print("Token OK")
    return token

token   = get_token()
headers = {"Authorization": f"Bearer {token}"}

# ========================== 2. FETCH ORDERS ==========================
def fetch_orders() -> List[Dict[str, Any]]:
    params = {"status": "DELIVERED"}
    if START_DATE:
        params["startDate"] = START_DATE
    if END_DATE:
        params["endDate"] = END_DATE

    r = requests.get(ORDERS_API, headers=headers, params=params)
    r.raise_for_status()
    raw = r.json()

    # New shape: {"data": {"content": [ {...}, {...} ]}}
    data_block = raw["data"]
    # In case the backend still returns a stringified list
    if isinstance(data_block, str):
        data_block = json.loads(data_block)

    orders = data_block["content"]
    print(orders.head())
    return orders

orders_raw = fetch_orders()

# ========================== 3. FETCH PRODUCT RATINGS ==========================
def fetch_ratings() -> List[Dict[str, Any]]:
    r = requests.get(PRODUCT_API, headers=headers)
    r.raise_for_status()
    raw = r.json()
    print(raw)
    data_block = raw
    if isinstance(data_block, str):
        data_block = json.loads(data_block)

    # Ratings may be a plain list or also have "content"
    ratings = data_block
    print(f"Ratings fetched: {len(ratings)} records")
    return ratings

ratings_raw = fetch_ratings()
print("\n--- SAMPLE RATINGS (first 3) ---")
print(ratings_raw[:3])

# ========================== 4. BUILD INTERACTION TABLE ==========================
def build_interactions() -> pd.DataFrame:
    # ---- Purchases → rating 5.0 (use customerId) ----
    purchase_rows = []
    for o in orders_raw:
        customer_id = o["customerId"]                     # <-- ONLY THIS FIELD
        for item in o.get("items", []):
            purchase_rows.append({
                "customer_id":    customer_id,
                "product_id": item["productId"],
                "rating":     0
            })

    # ---- Product ratings (no user → dummy user 0) ----
    rating_rows = []
    for r in ratings_raw:
        rating_rows.append({
            "customer_id":    0,                         # dummy
            "product_id": r["product_id"],
            "rating":     float(r["rating"])
        })

    # ---- Combine & clean ----
    df_p = pd.DataFrame(purchase_rows)
    df_r = pd.DataFrame(rating_rows)
    df   = pd.concat([df_p, df_r], ignore_index=True)
    df   = df.dropna(subset=["customer_id", "product_id", "rating"])
    df["customer_id"]    = df["customer_id"].astype(int)
    df["product_id"] = df["product_id"].astype(int)

    # Keep the highest rating for the same user+product
    df = df.sort_values("rating", ascending=False) \
           .drop_duplicates(subset=["customer_id", "product_id"], keep="first")

    print("\n=== FINAL INTERACTION TABLE (first 10 rows) ===")
    print(df.head(10))
    print(f"\nTotal interactions: {len(df)}")
    return df

interactions_df = build_interactions()

# ========================== SAVE ==========================
interactions_df.to_csv("interactions.csv", index=False)
print("\nData saved to interactions.csv")