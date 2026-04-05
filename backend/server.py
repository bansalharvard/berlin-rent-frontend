from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Berlin neighborhoods with coordinates
BERLIN_NEIGHBORHOODS = {
    "Kreuzberg": {"lat": 52.4993, "lng": 13.4035},
    "Neukölln": {"lat": 52.4811, "lng": 13.4353},
    "Prenzlauer Berg": {"lat": 52.5422, "lng": 13.4166},
    "Mitte": {"lat": 52.5200, "lng": 13.4050},
    "Friedrichshain": {"lat": 52.5167, "lng": 13.4546},
    "Charlottenburg": {"lat": 52.5177, "lng": 13.3039},
    "Wedding": {"lat": 52.5534, "lng": 13.3663},
    "Moabit": {"lat": 52.5261, "lng": 13.3421},
    "Schöneberg": {"lat": 52.4820, "lng": 13.3527},
    "Tempelhof": {"lat": 52.4703, "lng": 13.3984},
    "Wilmersdorf": {"lat": 52.4869, "lng": 13.3185},
    "Steglitz": {"lat": 52.4571, "lng": 13.3168},
    "Pankow": {"lat": 52.5700, "lng": 13.4050},
    "Lichtenberg": {"lat": 52.5193, "lng": 13.5021},
    "Treptow": {"lat": 52.4907, "lng": 13.4704}
}

# Define Models
class RentalCreate(BaseModel):
    neighborhood: str
    rent_amount: float = Field(ge=0)
    apartment_size: float = Field(ge=1)
    apartment_type: str  # WG room, studio, 1 Zimmer, 2 Zimmer, 3+ Zimmer
    rent_type: str  # warmmiete, kaltmiete
    furnished: Optional[bool] = None
    contract_type: Optional[str] = None  # temporary, permanent
    move_in_year: Optional[int] = None
    building_type: Optional[str] = None  # altbau, neubau

class Rental(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    neighborhood: str
    rent_amount: float
    apartment_size: float
    apartment_type: str
    rent_type: str
    price_per_sqm: float
    furnished: Optional[bool] = None
    contract_type: Optional[str] = None
    move_in_year: Optional[int] = None
    building_type: Optional[str] = None
    lat: float
    lng: float
    upvotes: int = 0
    downvotes: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VoteRequest(BaseModel):
    vote_type: str  # upvote, downvote

class OverpayingRequest(BaseModel):
    neighborhood: str
    rent_amount: float
    apartment_size: float
    apartment_type: str
    rent_type: str

class OverpayingResponse(BaseModel):
    your_price_per_sqm: float
    average_price_per_sqm: float
    median_price_per_sqm: float
    difference_percent: float
    status: str  # good_deal, fair, overpaying
    similar_listings_count: int

class NeighborhoodStats(BaseModel):
    neighborhood: str
    avg_price_per_sqm: float
    listing_count: int
    lat: float
    lng: float

# Helper function to add jitter to coordinates
import random
def add_jitter(lat: float, lng: float) -> tuple:
    """Add small random offset to prevent pin overlap"""
    jitter_lat = random.uniform(-0.005, 0.005)
    jitter_lng = random.uniform(-0.008, 0.008)
    return lat + jitter_lat, lng + jitter_lng

# Add your routes to the router
@api_router.get("/")
async def root():
    return {"message": "Berlin.rent API"}

@api_router.get("/neighborhoods")
async def get_neighborhoods():
    """Get all Berlin neighborhoods with coordinates"""
    return [
        {"name": name, "lat": coords["lat"], "lng": coords["lng"]}
        for name, coords in BERLIN_NEIGHBORHOODS.items()
    ]

@api_router.post("/rentals", response_model=Rental)
async def create_rental(rental_data: RentalCreate):
    """Create a new anonymous rental listing"""
    if rental_data.neighborhood not in BERLIN_NEIGHBORHOODS:
        raise HTTPException(status_code=400, detail=f"Unknown neighborhood: {rental_data.neighborhood}")
    
    coords = BERLIN_NEIGHBORHOODS[rental_data.neighborhood]
    lat, lng = add_jitter(coords["lat"], coords["lng"])
    
    price_per_sqm = round(rental_data.rent_amount / rental_data.apartment_size, 2)
    
    rental = Rental(
        neighborhood=rental_data.neighborhood,
        rent_amount=rental_data.rent_amount,
        apartment_size=rental_data.apartment_size,
        apartment_type=rental_data.apartment_type,
        rent_type=rental_data.rent_type,
        price_per_sqm=price_per_sqm,
        furnished=rental_data.furnished,
        contract_type=rental_data.contract_type,
        move_in_year=rental_data.move_in_year,
        building_type=rental_data.building_type,
        lat=lat,
        lng=lng
    )
    
    doc = rental.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.rentals.insert_one(doc)
    return rental

@api_router.get("/rentals", response_model=List[Rental])
async def get_rentals(
    neighborhood: Optional[str] = None,
    min_rent: Optional[float] = None,
    max_rent: Optional[float] = None,
    min_size: Optional[float] = None,
    max_size: Optional[float] = None,
    apartment_type: Optional[str] = None,
    rent_type: Optional[str] = None,
    furnished: Optional[bool] = None,
    limit: int = Query(default=100, le=500)
):
    """Get rental listings with optional filters"""
    query = {}
    
    if neighborhood:
        query["neighborhood"] = neighborhood
    if apartment_type:
        query["apartment_type"] = apartment_type
    if rent_type:
        query["rent_type"] = rent_type
    if furnished is not None:
        query["furnished"] = furnished
    
    if min_rent is not None or max_rent is not None:
        query["rent_amount"] = {}
        if min_rent is not None:
            query["rent_amount"]["$gte"] = min_rent
        if max_rent is not None:
            query["rent_amount"]["$lte"] = max_rent
        if not query["rent_amount"]:
            del query["rent_amount"]
    
    if min_size is not None or max_size is not None:
        query["apartment_size"] = {}
        if min_size is not None:
            query["apartment_size"]["$gte"] = min_size
        if max_size is not None:
            query["apartment_size"]["$lte"] = max_size
        if not query["apartment_size"]:
            del query["apartment_size"]
    
    rentals = await db.rentals.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    for rental in rentals:
        if isinstance(rental.get('created_at'), str):
            rental['created_at'] = datetime.fromisoformat(rental['created_at'])
    
    return rentals

@api_router.post("/rentals/{rental_id}/vote")
async def vote_rental(rental_id: str, vote: VoteRequest):
    """Upvote or downvote a rental listing"""
    if vote.vote_type not in ["upvote", "downvote"]:
        raise HTTPException(status_code=400, detail="vote_type must be 'upvote' or 'downvote'")
    
    field = "upvotes" if vote.vote_type == "upvote" else "downvotes"
    result = await db.rentals.update_one(
        {"id": rental_id},
        {"$inc": {field: 1}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rental not found")
    
    return {"success": True, "vote_type": vote.vote_type}

@api_router.post("/check-overpaying", response_model=OverpayingResponse)
async def check_overpaying(data: OverpayingRequest):
    """Check if user is overpaying compared to similar listings"""
    your_price_per_sqm = data.rent_amount / data.apartment_size
    
    # Find similar listings (same neighborhood, type, rent_type)
    query = {
        "neighborhood": data.neighborhood,
        "apartment_type": data.apartment_type,
        "rent_type": data.rent_type
    }
    
    similar = await db.rentals.find(query, {"_id": 0, "price_per_sqm": 1}).to_list(500)
    
    if not similar:
        # Fall back to just neighborhood
        query = {"neighborhood": data.neighborhood, "rent_type": data.rent_type}
        similar = await db.rentals.find(query, {"_id": 0, "price_per_sqm": 1}).to_list(500)
    
    if not similar:
        # Use all data of same rent type
        query = {"rent_type": data.rent_type}
        similar = await db.rentals.find(query, {"_id": 0, "price_per_sqm": 1}).to_list(500)
    
    if not similar:
        raise HTTPException(status_code=404, detail="Not enough data to compare")
    
    prices = sorted([s["price_per_sqm"] for s in similar])
    avg_price = sum(prices) / len(prices)
    median_price = prices[len(prices) // 2]
    
    diff_percent = ((your_price_per_sqm - avg_price) / avg_price) * 100
    
    if diff_percent < -10:
        status = "good_deal"
    elif diff_percent <= 10:
        status = "fair"
    else:
        status = "overpaying"
    
    return OverpayingResponse(
        your_price_per_sqm=round(your_price_per_sqm, 2),
        average_price_per_sqm=round(avg_price, 2),
        median_price_per_sqm=round(median_price, 2),
        difference_percent=round(diff_percent, 1),
        status=status,
        similar_listings_count=len(similar)
    )

@api_router.get("/stats/neighborhoods", response_model=List[NeighborhoodStats])
async def get_neighborhood_stats():
    """Get average price per sqm for each neighborhood"""
    pipeline = [
        {"$group": {
            "_id": "$neighborhood",
            "avg_price_per_sqm": {"$avg": "$price_per_sqm"},
            "listing_count": {"$sum": 1}
        }}
    ]
    
    results = await db.rentals.aggregate(pipeline).to_list(100)
    
    stats = []
    for r in results:
        neighborhood = r["_id"]
        if neighborhood in BERLIN_NEIGHBORHOODS:
            coords = BERLIN_NEIGHBORHOODS[neighborhood]
            stats.append(NeighborhoodStats(
                neighborhood=neighborhood,
                avg_price_per_sqm=round(r["avg_price_per_sqm"], 2),
                listing_count=r["listing_count"],
                lat=coords["lat"],
                lng=coords["lng"]
            ))
    
    return sorted(stats, key=lambda x: x.avg_price_per_sqm, reverse=True)

@api_router.post("/seed")
async def seed_data():
    """Seed the database with sample Berlin rental data"""
    # Check if data already exists
    count = await db.rentals.count_documents({})
    if count > 0:
        return {"message": f"Database already has {count} listings", "seeded": False}
    
    sample_data = [
        # Kreuzberg - trendy, mid-high prices
        {"neighborhood": "Kreuzberg", "rent_amount": 850, "apartment_size": 45, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2023},
        {"neighborhood": "Kreuzberg", "rent_amount": 1200, "apartment_size": 65, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": True, "building_type": "altbau", "move_in_year": 2024},
        {"neighborhood": "Kreuzberg", "rent_amount": 650, "apartment_size": 55, "apartment_type": "2 Zimmer", "rent_type": "kaltmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2022},
        {"neighborhood": "Kreuzberg", "rent_amount": 550, "apartment_size": 18, "apartment_type": "WG room", "rent_type": "warmmiete", "furnished": True, "building_type": "altbau", "move_in_year": 2024},
        {"neighborhood": "Kreuzberg", "rent_amount": 1450, "apartment_size": 80, "apartment_type": "3+ Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2023},
        
        # Neukölln - more affordable
        {"neighborhood": "Neukölln", "rent_amount": 700, "apartment_size": 50, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2024},
        {"neighborhood": "Neukölln", "rent_amount": 950, "apartment_size": 70, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2023},
        {"neighborhood": "Neukölln", "rent_amount": 450, "apartment_size": 15, "apartment_type": "WG room", "rent_type": "warmmiete", "furnished": True, "building_type": "altbau", "move_in_year": 2024},
        {"neighborhood": "Neukölln", "rent_amount": 520, "apartment_size": 45, "apartment_type": "1 Zimmer", "rent_type": "kaltmiete", "furnished": False, "building_type": "neubau", "move_in_year": 2022},
        
        # Prenzlauer Berg - family-friendly, higher prices
        {"neighborhood": "Prenzlauer Berg", "rent_amount": 1100, "apartment_size": 55, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2023},
        {"neighborhood": "Prenzlauer Berg", "rent_amount": 1600, "apartment_size": 90, "apartment_type": "3+ Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2024},
        {"neighborhood": "Prenzlauer Berg", "rent_amount": 900, "apartment_size": 40, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": True, "building_type": "neubau", "move_in_year": 2024},
        {"neighborhood": "Prenzlauer Berg", "rent_amount": 600, "apartment_size": 20, "apartment_type": "WG room", "rent_type": "warmmiete", "furnished": True, "building_type": "altbau", "move_in_year": 2023},
        
        # Mitte - central, expensive
        {"neighborhood": "Mitte", "rent_amount": 1300, "apartment_size": 50, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": True, "building_type": "neubau", "move_in_year": 2024},
        {"neighborhood": "Mitte", "rent_amount": 1800, "apartment_size": 75, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2023},
        {"neighborhood": "Mitte", "rent_amount": 2200, "apartment_size": 100, "apartment_type": "3+ Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "neubau", "move_in_year": 2024},
        {"neighborhood": "Mitte", "rent_amount": 700, "apartment_size": 22, "apartment_type": "WG room", "rent_type": "warmmiete", "furnished": True, "building_type": "altbau", "move_in_year": 2024},
        
        # Friedrichshain - young, moderate prices
        {"neighborhood": "Friedrichshain", "rent_amount": 800, "apartment_size": 45, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2023},
        {"neighborhood": "Friedrichshain", "rent_amount": 1100, "apartment_size": 60, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": True, "building_type": "altbau", "move_in_year": 2024},
        {"neighborhood": "Friedrichshain", "rent_amount": 500, "apartment_size": 17, "apartment_type": "WG room", "rent_type": "warmmiete", "furnished": True, "building_type": "altbau", "move_in_year": 2024},
        {"neighborhood": "Friedrichshain", "rent_amount": 580, "apartment_size": 50, "apartment_type": "2 Zimmer", "rent_type": "kaltmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2022},
        
        # Charlottenburg - upscale, expensive
        {"neighborhood": "Charlottenburg", "rent_amount": 1400, "apartment_size": 70, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2023},
        {"neighborhood": "Charlottenburg", "rent_amount": 1900, "apartment_size": 95, "apartment_type": "3+ Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2024},
        {"neighborhood": "Charlottenburg", "rent_amount": 950, "apartment_size": 35, "apartment_type": "studio", "rent_type": "warmmiete", "furnished": True, "building_type": "neubau", "move_in_year": 2024},
        
        # Wedding - affordable
        {"neighborhood": "Wedding", "rent_amount": 650, "apartment_size": 55, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2023},
        {"neighborhood": "Wedding", "rent_amount": 500, "apartment_size": 40, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2024},
        {"neighborhood": "Wedding", "rent_amount": 380, "apartment_size": 14, "apartment_type": "WG room", "rent_type": "warmmiete", "furnished": True, "building_type": "altbau", "move_in_year": 2024},
        {"neighborhood": "Wedding", "rent_amount": 850, "apartment_size": 75, "apartment_type": "3+ Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2022},
        
        # Schöneberg - moderate-high
        {"neighborhood": "Schöneberg", "rent_amount": 1000, "apartment_size": 55, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2023},
        {"neighborhood": "Schöneberg", "rent_amount": 750, "apartment_size": 38, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": True, "building_type": "altbau", "move_in_year": 2024},
        {"neighborhood": "Schöneberg", "rent_amount": 1350, "apartment_size": 85, "apartment_type": "3+ Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2024},
        
        # Tempelhof - moderate
        {"neighborhood": "Tempelhof", "rent_amount": 800, "apartment_size": 60, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2023},
        {"neighborhood": "Tempelhof", "rent_amount": 600, "apartment_size": 45, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "neubau", "move_in_year": 2024},
        {"neighborhood": "Tempelhof", "rent_amount": 420, "apartment_size": 16, "apartment_type": "WG room", "rent_type": "warmmiete", "furnished": True, "building_type": "altbau", "move_in_year": 2024},
        
        # Moabit - affordable
        {"neighborhood": "Moabit", "rent_amount": 700, "apartment_size": 50, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2023},
        {"neighborhood": "Moabit", "rent_amount": 900, "apartment_size": 65, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2024},
        {"neighborhood": "Moabit", "rent_amount": 450, "apartment_size": 15, "apartment_type": "WG room", "rent_type": "warmmiete", "furnished": True, "building_type": "altbau", "move_in_year": 2024},
        
        # Pankow - family friendly, moderate
        {"neighborhood": "Pankow", "rent_amount": 950, "apartment_size": 70, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "neubau", "move_in_year": 2024},
        {"neighborhood": "Pankow", "rent_amount": 1200, "apartment_size": 90, "apartment_type": "3+ Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "neubau", "move_in_year": 2023},
        {"neighborhood": "Pankow", "rent_amount": 650, "apartment_size": 45, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2024},
        
        # Lichtenberg - affordable
        {"neighborhood": "Lichtenberg", "rent_amount": 580, "apartment_size": 50, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2023},
        {"neighborhood": "Lichtenberg", "rent_amount": 450, "apartment_size": 35, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2024},
        {"neighborhood": "Lichtenberg", "rent_amount": 750, "apartment_size": 70, "apartment_type": "3+ Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2022},
        
        # Wilmersdorf - upscale
        {"neighborhood": "Wilmersdorf", "rent_amount": 1100, "apartment_size": 55, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2023},
        {"neighborhood": "Wilmersdorf", "rent_amount": 850, "apartment_size": 40, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": True, "building_type": "altbau", "move_in_year": 2024},
        
        # Steglitz - moderate
        {"neighborhood": "Steglitz", "rent_amount": 900, "apartment_size": 65, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2023},
        {"neighborhood": "Steglitz", "rent_amount": 700, "apartment_size": 50, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "neubau", "move_in_year": 2024},
        
        # Treptow - moderate-affordable
        {"neighborhood": "Treptow", "rent_amount": 750, "apartment_size": 55, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2024},
        {"neighborhood": "Treptow", "rent_amount": 550, "apartment_size": 40, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "move_in_year": 2023},
    ]
    
    for data in sample_data:
        rental_create = RentalCreate(**data)
        coords = BERLIN_NEIGHBORHOODS[data["neighborhood"]]
        lat, lng = add_jitter(coords["lat"], coords["lng"])
        
        rental = Rental(
            neighborhood=data["neighborhood"],
            rent_amount=data["rent_amount"],
            apartment_size=data["apartment_size"],
            apartment_type=data["apartment_type"],
            rent_type=data["rent_type"],
            price_per_sqm=round(data["rent_amount"] / data["apartment_size"], 2),
            furnished=data.get("furnished"),
            contract_type=data.get("contract_type"),
            move_in_year=data.get("move_in_year"),
            building_type=data.get("building_type"),
            lat=lat,
            lng=lng
        )
        
        doc = rental.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.rentals.insert_one(doc)
    
    return {"message": f"Seeded {len(sample_data)} rental listings", "seeded": True}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
