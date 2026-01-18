"""
Trust Graph API - Real network visualization data
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.api.v1.auth import get_current_user
from app.services.supabase import supabase_service
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/network/{user_id}")
async def get_trust_network(
    user_id: str,
    depth: int = 2,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get trust network graph for visualization
    Returns nodes (users) and edges (vouches)
    """
    try:
        nodes = []
        edges = []
        visited = set()
        
        async def build_network(uid: str, current_depth: int, x: float, y: float):
            if current_depth > depth or uid in visited:
                return
            visited.add(uid)
            
            # Get user profile
            profile = await supabase_service.get_profile(uid)
            if not profile:
                return
            
            # Add node
            nodes.append({
                "id": uid,
                "name": profile.get("full_name", "User")[:10],
                "trustScore": profile.get("trust_score", 50),
                "x": x,
                "y": y,
                "isCenter": current_depth == 0
            })
            
            # Get vouches given
            vouches_given = await supabase_service.get_vouches_given(uid)
            for i, vouch in enumerate(vouches_given[:5]):  # Limit connections
                if vouch["status"] == "active":
                    edges.append({
                        "from": uid,
                        "to": vouch["vouchee_id"],
                        "strength": vouch.get("saathi_staked", 10)
                    })
                    
                    # Position child nodes in a circle
                    import math
                    angle = (i / 5) * 2 * math.pi
                    child_x = x + 120 * math.cos(angle)
                    child_y = y + 120 * math.sin(angle)
                    
                    await build_network(vouch["vouchee_id"], current_depth + 1, child_x, child_y)
            
            # Get vouches received
            vouches_received = await supabase_service.get_vouches_received(uid)
            for i, vouch in enumerate(vouches_received[:5]):
                if vouch["status"] == "active" and vouch["voucher_id"] not in visited:
                    edges.append({
                        "from": vouch["voucher_id"],
                        "to": uid,
                        "strength": vouch.get("saathi_staked", 10)
                    })
        
        # Start building from the requested user
        await build_network(user_id, 0, 200, 150)
        
        return {
            "nodes": nodes,
            "edges": edges,
            "center_user": user_id,
            "total_connections": len(edges)
        }
        
    except Exception as e:
        logger.error(f"Trust graph failed: {e}")
        # Return demo data on failure
        return {
            "nodes": [
                {"id": user_id, "name": "You", "trustScore": 78, "x": 200, "y": 150, "isCenter": True},
                {"id": "2", "name": "Lakshmi", "trustScore": 85, "x": 80, "y": 80, "isCenter": False},
                {"id": "3", "name": "Ravi", "trustScore": 72, "x": 320, "y": 80, "isCenter": False},
            ],
            "edges": [
                {"from": user_id, "to": "2", "strength": 50},
                {"from": user_id, "to": "3", "strength": 30},
            ],
            "center_user": user_id,
            "total_connections": 2,
            "is_demo": True
        }


@router.get("/stats/{user_id}")
async def get_trust_stats(
    user_id: str,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get trust network statistics"""
    profile = await supabase_service.get_profile(user_id)
    vouches_given = await supabase_service.get_vouches_given(user_id)
    vouches_received = await supabase_service.get_vouches_received(user_id)
    
    active_given = [v for v in vouches_given if v["status"] == "active"]
    active_received = [v for v in vouches_received if v["status"] == "active"]
    
    total_staked = sum(v.get("saathi_staked", 0) for v in active_given)
    total_backing = sum(v.get("saathi_staked", 0) for v in active_received)
    
    return {
        "trust_score": profile.get("trust_score", 50) if profile else 50,
        "vouches_given": len(active_given),
        "vouches_received": len(active_received),
        "total_staked": total_staked,
        "total_backing": total_backing,
        "network_strength": min(100, (len(active_given) + len(active_received)) * 10)
    }
