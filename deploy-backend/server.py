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

# Load .env file if it exists (for local development)
ROOT_DIR = Path(__file__).parent
env_file = ROOT_DIR / '.env'
if env_file.exists():
    load_dotenv(env_file)

# MongoDB connection - use .get() with defaults for build time
mongo_url = os.environ.get('MONGO_URL', '')
db_name = os.environ.get('DB_NAME', 'berlin_rent')

# Initialize MongoDB client only if URL is provided
client = None
db = None
if mongo_url:
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

# LLM API Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Try to import emergent integrations (optional)
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    HAS_LLM = True
except ImportError:
    HAS_LLM = False
    LlmChat = None
    UserMessage = None

# Create the main app
app = FastAPI(title="Berlin.rent API", version="1.0.0")

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
class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    author_name: str = "Anonymous"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommentCreate(BaseModel):
    text: str
    author_name: Optional[str] = "Anonymous"

class ListingCreate(BaseModel):
    listing_type: str
    lat: float
    lng: float
    neighborhood: Optional[str] = None
    rent_amount: Optional[float] = None
    apartment_size: Optional[float] = None
    apartment_type: str
    rent_type: str
    furnished: Optional[bool] = None
    building_type: Optional[str] = None
    move_in_date: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

class Listing(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    listing_type: str
    lat: float
    lng: float
    neighborhood: str
    rent_amount: Optional[float] = None
    apartment_size: Optional[float] = None
    apartment_type: str
    rent_type: str
    price_per_sqm: Optional[float] = None
    furnished: Optional[bool] = None
    building_type: Optional[str] = None
    move_in_date: Optional[str] = None
    description: Optional[str] = None
    ai_description: Optional[str] = None
    suggested_price: Optional[float] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    comments: List[dict] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIDescriptionRequest(BaseModel):
    listing_type: str
    neighborhood: str
    apartment_type: str
    apartment_size: Optional[float] = None
    rent_amount: Optional[float] = None
    rent_type: str
    furnished: Optional[bool] = None
    building_type: Optional[str] = None

class AIPriceRequest(BaseModel):
    neighborhood: str
    apartment_type: str
    apartment_size: float
    rent_type: str
    furnished: Optional[bool] = None
    building_type: Optional[str] = None

class NeighborhoodStats(BaseModel):
    neighborhood: str
    avg_price_per_sqm: float
    listing_count: int
    lat: float
    lng: float

# Helper function to find nearest neighborhood
def find_nearest_neighborhood(lat: float, lng: float) -> str:
    min_dist = float('inf')
    nearest = "Mitte"
    for name, coords in BERLIN_NEIGHBORHOODS.items():
        dist = ((lat - coords["lat"])**2 + (lng - coords["lng"])**2)**0.5
        if dist < min_dist:
            min_dist = dist
            nearest = name
    return nearest

# AI Helper Functions
async def generate_ai_description(data: AIDescriptionRequest) -> str:
    if not EMERGENT_LLM_KEY or not HAS_LLM:
        return ""
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"desc-{uuid.uuid4()}",
            system_message="You are a helpful real estate assistant in Berlin. Write concise, friendly listing descriptions in 2-3 sentences."
        ).with_model("openai", "gpt-4o-mini")
        
        listing_type_text = "rental offering" if data.listing_type == "offering" else "apartment search"
        furnished_text = "furnished" if data.furnished else "unfurnished" if data.furnished is False else ""
        building_text = f"{data.building_type} building" if data.building_type else ""
        
        prompt = f"""Write a short, appealing description for a {listing_type_text} in Berlin:
- Location: {data.neighborhood}
- Type: {data.apartment_type}
- Size: {data.apartment_size}m² if specified
- Rent: €{data.rent_amount} {data.rent_type} if specified
- {furnished_text} {building_text}

Keep it under 50 words, friendly and informative."""

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return response.strip()
    except Exception as e:
        logging.error(f"AI description error: {e}")
        return ""

async def suggest_ai_price(data: AIPriceRequest) -> Optional[float]:
    if not db:
        return None
        
    query = {"neighborhood": data.neighborhood, "rent_type": data.rent_type, "listing_type": "offering"}
    similar = await db.listings.find(query, {"_id": 0, "price_per_sqm": 1}).to_list(50)
    
    if similar and len(similar) >= 3:
        prices = [s["price_per_sqm"] for s in similar if s.get("price_per_sqm")]
        if prices:
            avg_price_per_sqm = sum(prices) / len(prices)
            multiplier = 1.0
            if data.furnished:
                multiplier += 0.15
            if data.building_type == "neubau":
                multiplier += 0.10
            elif data.building_type == "altbau":
                multiplier -= 0.05
            
            suggested = round(avg_price_per_sqm * multiplier * data.apartment_size)
            return suggested
    
    if EMERGENT_LLM_KEY and HAS_LLM:
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"price-{uuid.uuid4()}",
                system_message="You are a Berlin rental market expert. Provide realistic rent estimates. Respond with ONLY a number, no text."
            ).with_model("openai", "gpt-4o-mini")
            
            prompt = f"""Estimate monthly {data.rent_type} rent in EUR for:
- Berlin {data.neighborhood}
- {data.apartment_type}, {data.apartment_size}m²
- {"Furnished" if data.furnished else "Unfurnished"}
- {data.building_type or "Unknown"} building

Reply with ONLY the number (e.g., 850)."""

            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            price = float(''.join(filter(lambda x: x.isdigit() or x == '.', response)))
            return round(price)
        except Exception as e:
            logging.error(f"AI price error: {e}")
    
    return None

# Routes
@api_router.get("/")
async def root():
    return {"message": "Berlin.rent Marketplace API", "database": "MongoDB Atlas", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "db_connected": db is not None}

@api_router.get("/neighborhoods")
async def get_neighborhoods():
    return [
        {"name": name, "lat": coords["lat"], "lng": coords["lng"]}
        for name, coords in BERLIN_NEIGHBORHOODS.items()
    ]

@api_router.post("/listings", response_model=Listing)
async def create_listing(data: ListingCreate):
    if not db:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    neighborhood = data.neighborhood or find_nearest_neighborhood(data.lat, data.lng)
    
    price_per_sqm = None
    if data.rent_amount and data.apartment_size:
        price_per_sqm = round(data.rent_amount / data.apartment_size, 2)
    
    ai_description = None
    if not data.description:
        ai_desc_request = AIDescriptionRequest(
            listing_type=data.listing_type,
            neighborhood=neighborhood,
            apartment_type=data.apartment_type,
            apartment_size=data.apartment_size,
            rent_amount=data.rent_amount,
            rent_type=data.rent_type,
            furnished=data.furnished,
            building_type=data.building_type
        )
        ai_description = await generate_ai_description(ai_desc_request)
    
    suggested_price = None
    if data.listing_type == "looking" or not data.rent_amount:
        if data.apartment_size:
            price_request = AIPriceRequest(
                neighborhood=neighborhood,
                apartment_type=data.apartment_type,
                apartment_size=data.apartment_size,
                rent_type=data.rent_type,
                furnished=data.furnished,
                building_type=data.building_type
            )
            suggested_price = await suggest_ai_price(price_request)
    
    listing = Listing(
        listing_type=data.listing_type,
        lat=data.lat,
        lng=data.lng,
        neighborhood=neighborhood,
        rent_amount=data.rent_amount,
        apartment_size=data.apartment_size,
        apartment_type=data.apartment_type,
        rent_type=data.rent_type,
        price_per_sqm=price_per_sqm,
        furnished=data.furnished,
        building_type=data.building_type,
        move_in_date=data.move_in_date,
        description=data.description,
        ai_description=ai_description,
        suggested_price=suggested_price,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone
    )
    
    doc = listing.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.listings.insert_one(doc)
    return listing

@api_router.get("/listings", response_model=List[Listing])
async def get_listings(
    listing_type: Optional[str] = None,
    neighborhood: Optional[str] = None,
    min_rent: Optional[float] = None,
    max_rent: Optional[float] = None,
    apartment_type: Optional[str] = None,
    rent_type: Optional[str] = None,
    furnished: Optional[bool] = None,
    limit: int = Query(default=100, le=500)
):
    if not db:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    query = {}
    
    if listing_type:
        query["listing_type"] = listing_type
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
    
    listings = await db.listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    for listing in listings:
        if isinstance(listing.get('created_at'), str):
            listing['created_at'] = datetime.fromisoformat(listing['created_at'])
    
    return listings

@api_router.get("/listings/{listing_id}", response_model=Listing)
async def get_listing(listing_id: str):
    if not db:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if isinstance(listing.get('created_at'), str):
        listing['created_at'] = datetime.fromisoformat(listing['created_at'])
    
    return listing

@api_router.delete("/listings/{listing_id}")
async def delete_listing(listing_id: str):
    if not db:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    result = await db.listings.delete_one({"id": listing_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"success": True, "message": "Listing deleted"}

@api_router.post("/listings/{listing_id}/comments")
async def add_comment(listing_id: str, comment: CommentCreate):
    if not db:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    comment_doc = {
        "id": str(uuid.uuid4()),
        "text": comment.text,
        "author_name": comment.author_name or "Anonymous",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.listings.update_one(
        {"id": listing_id},
        {"$push": {"comments": comment_doc}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    return {"success": True, "comment": comment_doc}

@api_router.get("/listings/{listing_id}/comments")
async def get_comments(listing_id: str):
    if not db:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    listing = await db.listings.find_one({"id": listing_id}, {"_id": 0, "comments": 1})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing.get("comments", [])

@api_router.get("/stats/dashboard")
async def get_dashboard_stats():
    if not db:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    all_listings = await db.listings.find(
        {"rent_amount": {"$exists": True, "$ne": None}},
        {"_id": 0}
    ).to_list(500)
    
    if not all_listings:
        return {"error": "No data available"}
    
    sorted_by_rent = sorted([l for l in all_listings if l.get("rent_amount")], key=lambda x: x["rent_amount"])
    
    neighborhood_stats = {}
    for listing in all_listings:
        if listing.get("rent_amount") and listing.get("neighborhood"):
            hood = listing["neighborhood"]
            if hood not in neighborhood_stats:
                neighborhood_stats[hood] = {"total": 0, "count": 0}
            neighborhood_stats[hood]["total"] += listing["rent_amount"]
            neighborhood_stats[hood]["count"] += 1
    
    avg_by_neighborhood = [
        {"neighborhood": k, "avg_rent": round(v["total"] / v["count"]), "count": v["count"]}
        for k, v in neighborhood_stats.items()
    ]
    avg_by_neighborhood.sort(key=lambda x: x["avg_rent"], reverse=True)
    
    type_stats = {}
    for listing in all_listings:
        if listing.get("rent_amount") and listing.get("apartment_type"):
            apt_type = listing["apartment_type"]
            if apt_type not in type_stats:
                type_stats[apt_type] = {"total": 0, "count": 0}
            type_stats[apt_type]["total"] += listing["rent_amount"]
            type_stats[apt_type]["count"] += 1
    
    avg_by_type = [
        {"type": k, "avg_rent": round(v["total"] / v["count"]), "count": v["count"]}
        for k, v in type_stats.items()
    ]
    avg_by_type.sort(key=lambda x: x["avg_rent"], reverse=True)
    
    sqm_prices = [l["price_per_sqm"] for l in all_listings if l.get("price_per_sqm")]
    avg_price_sqm = round(sum(sqm_prices) / len(sqm_prices), 2) if sqm_prices else 0
    
    return {
        "total_listings": len(all_listings),
        "highest_rent": sorted_by_rent[-1] if sorted_by_rent else None,
        "lowest_rent": sorted_by_rent[0] if sorted_by_rent else None,
        "avg_by_neighborhood": avg_by_neighborhood,
        "avg_by_type": avg_by_type,
        "avg_price_per_sqm": avg_price_sqm,
        "price_range": {
            "min": sorted_by_rent[0]["rent_amount"] if sorted_by_rent else 0,
            "max": sorted_by_rent[-1]["rent_amount"] if sorted_by_rent else 0
        }
    }

@api_router.get("/stats/neighborhoods", response_model=List[NeighborhoodStats])
async def get_neighborhood_stats():
    if not db:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    pipeline = [
        {"$match": {"listing_type": "offering", "price_per_sqm": {"$exists": True, "$ne": None}}},
        {"$group": {
            "_id": "$neighborhood",
            "avg_price_per_sqm": {"$avg": "$price_per_sqm"},
            "listing_count": {"$sum": 1}
        }}
    ]
    
    results = await db.listings.aggregate(pipeline).to_list(100)
    
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

@api_router.post("/ai/generate-description")
async def generate_description(data: AIDescriptionRequest):
    description = await generate_ai_description(data)
    if not description:
        raise HTTPException(status_code=503, detail="AI service unavailable")
    return {"description": description}

@api_router.post("/ai/suggest-price")
async def suggest_price(data: AIPriceRequest):
    price = await suggest_ai_price(data)
    if price is None:
        raise HTTPException(status_code=503, detail="Could not generate price suggestion")
    return {"suggested_price": price}

@api_router.post("/seed")
async def seed_data():
    if not db:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    count = await db.listings.count_documents({})
    if count > 0:
        return {"message": f"Database already has {count} listings", "seeded": False}
    
    import random
    
    sample_offerings = [
        {"neighborhood": "Kreuzberg", "rent_amount": 850, "apartment_size": 45, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau", "description": "Cozy altbau apartment in vibrant Kreuzberg."},
        {"neighborhood": "Kreuzberg", "rent_amount": 1200, "apartment_size": 65, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": True, "building_type": "altbau", "contact_email": "landlord@example.com"},
        {"neighborhood": "Neukölln", "rent_amount": 700, "apartment_size": 50, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau"},
        {"neighborhood": "Neukölln", "rent_amount": 550, "apartment_size": 18, "apartment_type": "WG room", "rent_type": "warmmiete", "furnished": True, "building_type": "altbau", "contact_phone": "+49 170 1234567"},
        {"neighborhood": "Prenzlauer Berg", "rent_amount": 1100, "apartment_size": 55, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau"},
        {"neighborhood": "Mitte", "rent_amount": 1300, "apartment_size": 50, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": True, "building_type": "neubau"},
        {"neighborhood": "Friedrichshain", "rent_amount": 800, "apartment_size": 45, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau"},
        {"neighborhood": "Charlottenburg", "rent_amount": 1400, "apartment_size": 70, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau"},
        {"neighborhood": "Wedding", "rent_amount": 650, "apartment_size": 55, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau"},
        {"neighborhood": "Schöneberg", "rent_amount": 1000, "apartment_size": 55, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": False, "building_type": "altbau"},
    ]
    
    sample_looking = [
        {"neighborhood": "Kreuzberg", "apartment_size": 40, "apartment_type": "1 Zimmer", "rent_type": "warmmiete", "furnished": False, "description": "Student looking for a quiet place.", "contact_email": "student@example.com"},
        {"neighborhood": "Neukölln", "apartment_size": 60, "apartment_type": "2 Zimmer", "rent_type": "warmmiete", "furnished": False, "description": "Young couple searching for their first apartment."},
        {"neighborhood": "Mitte", "apartment_size": 20, "apartment_type": "WG room", "rent_type": "warmmiete", "furnished": True, "description": "Expat looking for a furnished room."},
    ]
    
    for data in sample_offerings:
        coords = BERLIN_NEIGHBORHOODS[data["neighborhood"]]
        lat = coords["lat"] + random.uniform(-0.005, 0.005)
        lng = coords["lng"] + random.uniform(-0.008, 0.008)
        
        listing = Listing(
            listing_type="offering",
            lat=lat,
            lng=lng,
            neighborhood=data["neighborhood"],
            rent_amount=data["rent_amount"],
            apartment_size=data["apartment_size"],
            apartment_type=data["apartment_type"],
            rent_type=data["rent_type"],
            price_per_sqm=round(data["rent_amount"] / data["apartment_size"], 2),
            furnished=data.get("furnished"),
            building_type=data.get("building_type"),
            description=data.get("description"),
            contact_email=data.get("contact_email"),
            contact_phone=data.get("contact_phone")
        )
        
        doc = listing.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.listings.insert_one(doc)
    
    for data in sample_looking:
        coords = BERLIN_NEIGHBORHOODS[data["neighborhood"]]
        lat = coords["lat"] + random.uniform(-0.005, 0.005)
        lng = coords["lng"] + random.uniform(-0.008, 0.008)
        
        listing = Listing(
            listing_type="looking",
            lat=lat,
            lng=lng,
            neighborhood=data["neighborhood"],
            apartment_size=data.get("apartment_size"),
            apartment_type=data["apartment_type"],
            rent_type=data["rent_type"],
            furnished=data.get("furnished"),
            description=data.get("description"),
            contact_email=data.get("contact_email")
        )
        
        doc = listing.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.listings.insert_one(doc)
    
    return {"message": f"Seeded {len(sample_offerings) + len(sample_looking)} listings", "seeded": True}

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
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
    if client:
        client.close()
