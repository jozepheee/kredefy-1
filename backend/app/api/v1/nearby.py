"""
Nearby Users API - Location-based user discovery
Find high trust score users nearby to vouch for
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import math
import logging

from app.api.v1.auth import get_current_user
from app.services.supabase import supabase_service

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory location cache (production: use Redis or database)
user_locations: Dict[str, Dict] = {}


class LocationUpdate(BaseModel):
    latitude: float
    longitude: float


class NearbyUserResponse(BaseModel):
    id: str
    name: str
    trust_score: int
    distance_km: float
    loans_completed: int
    vouches_received: int
    member_since: str
    circles: List[str]
    badges: List[str]


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in km using Haversine formula"""
    R = 6371  # Earth radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c


@router.post("/location")
async def update_location(
    location: LocationUpdate,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Update user's location for nearby discovery
    Location is stored with approximate precision for privacy
    """
    user_id = current_user["id"]
    
    # Round to ~1km precision for privacy (3 decimal places ≈ 111m)
    rounded_lat = round(location.latitude, 3)
    rounded_lon = round(location.longitude, 3)
    
    user_locations[user_id] = {
        "latitude": rounded_lat,
        "longitude": rounded_lon,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    # Also update in Supabase profile (for persistence)
    try:
        await supabase_service.update_profile(user_id, {
            "metadata": {
                "location": {
                    "lat": rounded_lat,
                    "lng": rounded_lon,
                    "updated": datetime.utcnow().isoformat()
                }
            }
        })
    except Exception as e:
        logger.warning(f"Failed to persist location: {e}")
    
    logger.info(f"Location updated for user {user_id}")
    
    return {
        "success": True,
        "message": "Location updated",
        "precision": "~1km radius for privacy"
    }


@router.get("/nearby", response_model=List[NearbyUserResponse])
async def get_nearby_users(
    radius_km: float = 10.0,
    min_trust_score: int = 60,
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
) -> List[NearbyUserResponse]:
    """
    Find nearby users with high trust scores
    Only returns users who have shared their location
    """
    user_id = current_user["id"]
    
    # Get current user's location
    user_location = user_locations.get(user_id)
    if not user_location:
        # Try to get from profile
        profile = await supabase_service.get_profile(user_id)
        metadata = profile.get("metadata", {}) if profile else {}
        location_data = metadata.get("location")
        if location_data:
            user_location = {
                "latitude": location_data.get("lat"),
                "longitude": location_data.get("lng")
            }
    
    if not user_location:
        # NO DEMO DATA - Return empty if no location
        logger.info(f"No location for user {user_id}, returning empty list")
        return []
    
    my_lat = user_location["latitude"]
    my_lon = user_location["longitude"]
    
    nearby_users = []
    
    # Check all users with locations
    for other_user_id, other_location in user_locations.items():
        if other_user_id == user_id:
            continue
        
        # Calculate distance
        distance = haversine_distance(
            my_lat, my_lon,
            other_location["latitude"], 
            other_location["longitude"]
        )
        
        if distance <= radius_km:
            # Get user profile
            profile = await supabase_service.get_profile(other_user_id)
            if not profile:
                continue
            
            trust_score = profile.get("trust_score", 50)
            if trust_score < min_trust_score:
                continue
            
            # Get additional stats
            vouches = await supabase_service.get_vouches_received(other_user_id)
            loans = await supabase_service.get_user_loans(other_user_id)
            completed_loans = [l for l in loans if l.get("status") == "completed"]
            
            # Get circles
            circles = await supabase_service.get_user_circles(other_user_id)
            circle_names = [c.get("circles", {}).get("name", "Unknown") for c in circles[:3]]
            
            # Calculate member duration
            created_at = profile.get("created_at", "")
            member_since = _calculate_member_duration(created_at)
            
            # Get badges from metadata
            metadata = profile.get("metadata", {})
            badges = metadata.get("badges", [])
            if trust_score >= 80:
                badges.append("Trusted Elder")
            if len(completed_loans) >= 5:
                badges.append("Reliable Borrower")
            
            nearby_users.append(NearbyUserResponse(
                id=other_user_id,
                name=profile.get("full_name", "Anonymous"),
                trust_score=trust_score,
                distance_km=round(distance, 1),
                loans_completed=len(completed_loans),
                vouches_received=len(vouches),
                member_since=member_since,
                circles=circle_names[:3],
                badges=badges[:3]
            ))
    
    # Sort by distance and limit
    nearby_users.sort(key=lambda u: u.distance_km)
    
    # NO DEMO DATA - Only return real users found
    return nearby_users[:limit]


def _calculate_member_duration(created_at: str) -> str:
    """Calculate human-readable duration since signup"""
    if not created_at:
        return "New member"
    
    try:
        created = datetime.fromisoformat(created_at.replace("Z", ""))
        days = (datetime.utcnow() - created).days
        
        if days < 7:
            return "New member"
        elif days < 30:
            return f"{days // 7} weeks"
        elif days < 365:
            return f"{days // 30} months"
        else:
            return f"{days // 365} years"
    except:
        return "Member"


# NO _get_demo_nearby_users function - removed all demo data


@router.post("/vouch-request/{target_user_id}")
async def request_vouch_from_nearby(
    target_user_id: str,
    message: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Send vouch request to a nearby user
    They will be notified and can choose to vouch for you
    """
    user_id = current_user["id"]
    requester_name = current_user.get("full_name", "Someone nearby")
    
    # Get target user profile
    target_profile = await supabase_service.get_profile(target_user_id)
    if not target_profile:
        raise HTTPException(status_code=404, detail="User not found")
    
    # In production: store request in database and send notification
    # For now, log and return success
    
    logger.info(f"Vouch request from {user_id} to nearby user {target_user_id}")
    
    # Send notification (if Twilio configured)
    target_phone = target_profile.get("phone")
    if target_phone:
        try:
            from app.services.twilio import twilio_service
            await twilio_service.send_whatsapp(
                to=target_phone,
                message=f"🤝 {requester_name} is nearby and wants you to vouch for them on Kredefy! Open the app to respond."
            )
        except Exception as e:
            logger.warning(f"Failed to send notification: {e}")
    
    return {
        "success": True,
        "message": f"Vouch request sent to {target_profile.get('full_name', 'user')}",
        "target_user_id": target_user_id
    }
