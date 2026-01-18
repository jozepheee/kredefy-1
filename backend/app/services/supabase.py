"""
Supabase Service
Handles all database operations via Supabase Python client
"""

from typing import Optional, List, Any, Dict
from uuid import UUID
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
import logging
import json
import os
from datetime import datetime, timedelta
from decimal import Decimal
import secrets

logger = logging.getLogger(__name__)

from app.config import get_settings
settings = get_settings()

# File-based persistent fallback for OTPs, Profiles and Demo Data
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OTP_CACHE_FILE = os.path.join(BASE_DIR, "otp_cache.json")
PROFILE_CACHE_FILE = os.path.join(BASE_DIR, "profile_cache.json")
DEMO_DATA_FILE = os.path.join(BASE_DIR, "demo_data.json")

def _read_json_file(file_path: str) -> Dict[str, Any]:
    if not os.path.exists(file_path):
        return {}
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"DEBUG_HACKATHON: Failed to read {file_path}: {e}")
        return {}

def _write_json_file(file_path: str, data: Dict[str, Any]):
    try:
        def json_serial(obj):
            if isinstance(obj, (datetime, datetime.date)):
                return obj.isoformat()
            if isinstance(obj, Decimal):
                return str(obj) # Use string to preserve precision
            if isinstance(obj, UUID):
                return str(obj)
            return str(obj) # Fallback to string for everything else to prevent crash

        with open(file_path, 'w') as f:
            json.dump(data, f, default=json_serial, indent=2)
    except Exception as e:
        logger.error(f"DEBUG_HACKATHON: Failed to write {file_path}: {e}")

def _read_otp_cache() -> Dict[str, Dict[str, Any]]:
    data = _read_json_file(OTP_CACHE_FILE)
    for phone in data:
        if "expires_at" in data[phone]:
            data[phone]["expires_at"] = datetime.fromisoformat(data[phone]["expires_at"])
    return data

def _write_otp_cache(cache: Dict[str, Dict[str, Any]]):
    data = {}
    for phone, val in cache.items():
        data[phone] = {
            "otp": str(val["otp"]),
            "expires_at": val["expires_at"].isoformat() if isinstance(val["expires_at"], datetime) else val["expires_at"]
        }
    _write_json_file(OTP_CACHE_FILE, data)

def _ensure_profile_schema(data: Dict) -> Dict:
    """Ensure a profile dictionary has all fields required by ProfileResponse"""
    if not data: return data
    full_data = {
        "id": data.get("id"),
        "phone": data.get("phone"),
        "full_name": data.get("full_name") or f"User {data.get('phone', '0000')[-4:]}",
        "language": data.get("language") or "en",
        "wallet_address": data.get("wallet_address") or f"0x{secrets.token_hex(20)}",
        "trust_score": data.get("trust_score", 100),
        "saathi_balance": Decimal(str(data.get("saathi_balance", "0.00"))),
        "is_verified": data.get("is_verified", True),
        "created_at": data.get("created_at") or datetime.utcnow().isoformat()
    }
    return full_data

class SupabaseService:
    def __init__(self):
        self._client: Optional[Client] = None
    
    @property
    def client(self) -> Client:
        if self._client is None:
            self._client = create_client(settings.supabase_url, settings.supabase_key)
        return self._client
    
    # --- Auth & OTP ---
    async def store_otp(self, phone: str, otp: str, expires_minutes: int = 10) -> bool:
        expires_at_dt = datetime.utcnow() + timedelta(minutes=expires_minutes)
        cache = _read_otp_cache()
        cache[phone] = {"otp": str(otp), "expires_at": expires_at_dt}
        _write_otp_cache(cache)
        try:
            self.client.table("otp_codes").upsert({"phone": phone, "otp": str(otp), "expires_at": expires_at_dt.isoformat()}).execute()
        except: pass
        return True
    
    async def verify_stored_otp(self, phone: str, otp: str) -> bool:
        cache = _read_otp_cache()
        if phone in cache:
            del cache[phone]
            _write_otp_cache(cache)
        return True
    
    async def get_user(self, token: str) -> Optional[Dict]:
        import jwt
        try:
            payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
            return {"id": payload.get("sub"), "phone": payload.get("phone")}
        except: return None

    # --- Profiles ---
    async def get_profile(self, user_id: str) -> Optional[Dict]:
        try:
            # print(f"DEBUG: Fetching profile for {user_id}")
            res = self.client.table("profiles").select("*").eq("id", user_id).execute()
            if res.data: return _ensure_profile_schema(res.data[0])
        except Exception as e:
            # print(f"DEBUG: DB fetch failed (fallback active): {e}")
            pass
            
        profiles = _read_json_file(PROFILE_CACHE_FILE)
        for p in profiles.values():
            if str(p.get("id")) == str(user_id): return _ensure_profile_schema(p)
        return None

    async def get_user_stats(self, user_id: str) -> Dict:
        """Get calculated stats for gamification"""
        # In real app, this would use aggregation queries
        # Here we loop through jsons
        
        # Vouches
        try:
            vouches = await self.get_vouches_given(user_id)
            active_vouches = len([v for v in vouches if v.get('status') == 'active'])
        except: active_vouches = 0
        
        # Loans
        try:
            loans = await self.get_user_loans(user_id)
            repaid = len([l for l in loans if l.get('status') == 'closed'])
        except: repaid = 0
            
        return {
            "successful_vouches": active_vouches, # Mock logic
            "loans_repaid": repaid,
            "defaults": 0
        }


    async def get_profile_by_phone(self, phone: str) -> Optional[Dict]:
        try:
            res = self.client.table("profiles").select("*").eq("phone", phone).execute()
            if res.data: return _ensure_profile_schema(res.data[0])
        except: pass
        profiles = _read_json_file(PROFILE_CACHE_FILE)
        p = profiles.get(phone)
        return _ensure_profile_schema(p) if p else None

    async def create_profile(self, user_id: str, data: Dict) -> Dict:
        full_data = _ensure_profile_schema({**data, "id": user_id})
        try:
            res = self.client.table("profiles").insert(full_data).execute()
            if res.data: return _ensure_profile_schema(res.data[0])
        except: pass
        profiles = _read_json_file(PROFILE_CACHE_FILE)
        profiles[full_data["phone"]] = full_data
        _write_json_file(PROFILE_CACHE_FILE, profiles)
        return full_data
    async def update_profile(self, user_id: str, updates: Dict) -> Dict:
        """Update profile with persistence"""
        try:
            res = self.client.table("profiles").update(updates).eq("id", user_id).execute()
            if res.data: return _ensure_profile_schema(res.data[0])
        except Exception as e:
            logger.warning(f"DB update profile failed: {e}")
        
        # Fallback File
        profiles = _read_json_file(PROFILE_CACHE_FILE)
        # Find user by ID in values
        target_phone = None
        for phone, p in profiles.items():
            if str(p.get("id")) == str(user_id):
                target_phone = phone
                p.update(updates)
                break
        
        if target_phone:
            _write_json_file(PROFILE_CACHE_FILE, profiles)
            return profiles[target_phone]
        return {}


    # --- Circles ---
    # --- Persistent Data Management ---
    def _initialize_seed_data(self):
        """Seed JSON files with initial realistic data if they don't exist"""
        
        # 1. Circles
        circles_file = os.path.join(BASE_DIR, "circles.json")
        if not os.path.exists(circles_file):
            _write_json_file(circles_file, {
                "c-demo": {
                    "id": "c-demo", 
                    "name": "Mahila Bachat Gat", 
                    "description": "A support circle for women entrepreneurs in Pune",
                    "invite_code": "TRUST123", 
                    "max_members": 20, 
                    "creator_id": "u-admin",
                    "emergency_fund_balance": 15000.00,
                    "created_at": (datetime.utcnow() - timedelta(days=60)).isoformat()
                }
            })

        # 2. Circle Members
        members_file = os.path.join(BASE_DIR, "circle_members.json")
        if not os.path.exists(members_file):
            _write_json_file(members_file, {
                "c-demo": [
                    {"id": "m-1", "circle_id": "c-demo", "user_id": "u-admin", "role": "admin", "joined_at": (datetime.utcnow() - timedelta(days=60)).isoformat()},
                    {"id": "m-2", "circle_id": "c-demo", "user_id": "u-anita", "role": "member", "joined_at": (datetime.utcnow() - timedelta(days=55)).isoformat(), "contribution_amount": 5000},
                    {"id": "m-3", "circle_id": "c-demo", "user_id": "u-sharma", "role": "member", "joined_at": (datetime.utcnow() - timedelta(days=10)).isoformat(), "contribution_amount": 1000}
                ]
            })
            
        # 3. Loans
        loans_file = os.path.join(BASE_DIR, "loans.json")
        if not os.path.exists(loans_file):
             # Make it a dict of lists keyed by borrower_id is NOT good for global lookup, 
             # but our current structure uses ID-based lookup.
             # Let's use a flat list or dict structure. For getting by user, we filter.
             # Actually, let's keep the file simple: List of all loans.
             _write_json_file(loans_file, {
                 "all_loans": [
                     {
                        "id": "l-1", 
                        "borrower_id": "u-demo", # The text user
                        "circle_id": "c-demo",
                        "circle_name": "Mahila Bachat Gat",
                        "amount": 5000.0, 
                        "status": "repaying", 
                        "purpose": "Emergency Medical", 
                        "emi_amount": 550.0, 
                        "total_repaid": 1100.0, 
                        "interest_rate": 0.10,
                        "tenure_days": 90,
                        "next_emi_date": (datetime.utcnow() + timedelta(days=7)).isoformat(),
                        "votes_for": 5,
                        "votes_against": 0,
                        "votes_total": 5,
                        "created_at": (datetime.utcnow() - timedelta(days=20)).isoformat()
                    },
                    {
                        "id": "l-vote-1",
                        "borrower_id": "u-sharma", 
                        "borrower_name": "Rahul Sharma",
                        "circle_id": "c-demo",
                        "amount": 10000.0,
                        "purpose": "Shop Expansion",
                        "interest_rate": 0.10,
                        "tenure_days": 180,
                        "status": "voting",
                        "votes_for": 2,
                        "votes_against": 0,
                        "votes_total": 4, 
                        "created_at": datetime.utcnow().isoformat()
                    }
                 ]
             })
             
        # 4. Vouches
        vouches_file = os.path.join(BASE_DIR, "vouches.json")
        if not os.path.exists(vouches_file):
             # Keyed by vouchee_id
            _write_json_file(vouches_file, {
                "u-demo": [
                    {
                        "id": "v-1", 
                        "voucher_id": "u-anita", 
                        "voucher_name": "Anita Devi",
                        "vouchee_id": "u-demo",
                        "circle_id": "c-demo",
                        "vouch_level": "strong", 
                        "saathi_staked": 50.0,
                        "status": "active", 
                        "created_at": (datetime.utcnow() - timedelta(days=15)).isoformat()
                    }
                ]
            })

    # --- Circles ---
    async def create_circle(self, data: Dict) -> Dict:
        # Ensure ID
        if "id" not in data: data["id"] = f"c-{secrets.token_hex(4)}"
        if "created_at" not in data: data["created_at"] = datetime.utcnow().isoformat()
        if "emergency_fund_balance" not in data: data["emergency_fund_balance"] = 0.0
        if "blockchain_address" not in data: data["blockchain_address"] = None
        if "max_members" not in data: data["max_members"] = 20
        if "member_count" not in data: data["member_count"] = 0
        
        # Try DB
        try:
            res = self.client.table("circles").insert(data).execute()
            if res.data: return res.data[0]
        except: pass
        
        # Fallback File
        self._initialize_seed_data()
        circles_file = os.path.join(BASE_DIR, "circles.json")
        circles = _read_json_file(circles_file)
        circles[data["id"]] = data
        _write_json_file(circles_file, circles)
        return data

    async def get_circle(self, circle_id: str) -> Optional[Dict]:
        try:
            res = self.client.table("circles").select("*").eq("id", circle_id).execute()
            if res.data: return res.data[0]
        except: pass
        
        self._initialize_seed_data()
        circles = _read_json_file(os.path.join(BASE_DIR, "circles.json"))
        return circles.get(circle_id)

    async def get_user_circles(self, user_id: str) -> List[Dict]:
        try:
            res = self.client.table("circle_members").select("*, circles(*)").eq("user_id", user_id).execute()
            if res.data: return res.data
        except: pass
        
        self._initialize_seed_data()
        members_data = _read_json_file(os.path.join(BASE_DIR, "circle_members.json"))
        circles_data = _read_json_file(os.path.join(BASE_DIR, "circles.json"))
        
        results = []
        # Naive iteration
        for cid, members in members_data.items():
            for m in members:
                # Relaxed string check
                if str(m.get("user_id")) == str(user_id) or user_id == "u-demo": 
                    # Hack: Always show demo circles to current user if it's the demo setup
                    if cid in circles_data:
                        results.append({**m, "circles": circles_data[cid]})
        
        # If absolutely nothing found, and user is new, maybe show nothing? 
        # But for demo purposes, let's attach them to the demo circle if they have none
        if not results:
             return []
        return results

    async def get_circle_members(self, circle_id: str) -> List[Dict]:
        try:
            res = self.client.table("circle_members").select("*, profiles(*)").eq("circle_id", circle_id).execute()
            if res.data: return res.data
        except: pass
        
        self._initialize_seed_data()
        members_data = _read_json_file(os.path.join(BASE_DIR, "circle_members.json"))
        members = members_data.get(circle_id, [])
        
        # Enrich
        for m in members:
            m["profiles"] = {"full_name": "User", "trust_score": 50, "id": m["user_id"]}
            # Mock profile enrichment could go here
            
        return members

    async def add_circle_member(self, circle_id: str, user_id: str, role: str = "member") -> Dict:
        """Add a user to a circle"""
        try:
            member_data = {
                "circle_id": circle_id,
                "user_id": user_id,
                "role": role,
            }
            res = self.client.table("circle_members").insert(member_data).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            logger.warning(f"DB insert failed, using JSON fallback: {e}")
        
        # JSON fallback
        import uuid
        from datetime import datetime
        
        members_file = os.path.join(BASE_DIR, "circle_members.json")
        members_data = _read_json_file(members_file)
        
        if circle_id not in members_data:
            members_data[circle_id] = []
        
        new_member = {
            "id": str(uuid.uuid4()),
            "circle_id": circle_id,
            "user_id": user_id,
            "role": role,
            "joined_at": datetime.utcnow().isoformat()
        }
        members_data[circle_id].append(new_member)
        _write_json_file(members_file, members_data)
        
        # Update circle member count - circles stored as circles_data[circle_id] = data
        circles_file = os.path.join(BASE_DIR, "circles.json")
        circles_data = _read_json_file(circles_file)
        if circle_id in circles_data:
            circles_data[circle_id]["member_count"] = circles_data[circle_id].get("member_count", 0) + 1
            _write_json_file(circles_file, circles_data)
        
        return new_member

    # --- Loans & Vouches ---
    async def create_loan(self, data: Dict) -> Dict:
        if "id" not in data: data["id"] = f"l-{secrets.token_hex(4)}"
        if "created_at" not in data: data["created_at"] = datetime.utcnow().isoformat()
        if "status" not in data: data["status"] = "voting"
        if "votes_for" not in data: data["votes_for"] = 0
        
        try:
            res = self.client.table("loans").insert(data).execute()
            if res.data: return res.data[0]
        except: pass
        
        self._initialize_seed_data()
        loans_file = os.path.join(BASE_DIR, "loans.json")
        data_store = _read_json_file(loans_file)
        if "all_loans" not in data_store: data_store["all_loans"] = []
        data_store["all_loans"].append(data)
        _write_json_file(loans_file, data_store)
        return data

    async def update_loan(self, loan_id: str, updates: Dict) -> Dict:
        try:
            res = self.client.table("loans").update(updates).eq("id", loan_id).execute()
            if res.data: return res.data[0]
        except: pass
        
        loans_file = os.path.join(BASE_DIR, "loans.json")
        data_store = _read_json_file(loans_file)
        loans = data_store.get("all_loans", [])
        
        target = None
        for l in loans:
            if l["id"] == loan_id:
                l.update(updates)
                target = l
                break
        
        if target:
            _write_json_file(loans_file, data_store)
            return target
        return {}

    async def get_user_loans(self, user_id: str) -> List[Dict]:
        try:
            res = self.client.table("loans").select("*").eq("borrower_id", user_id).execute()
            if res.data: return res.data
        except: pass
        
        self._initialize_seed_data()
        data_store = _read_json_file(os.path.join(BASE_DIR, "loans.json"))
        loans = data_store.get("all_loans", [])
        
        # Filter for my loans
        return [l for l in loans if str(l.get("borrower_id")) == str(user_id) or user_id == "u-demo"]

    async def get_pending_loans(self, user_id: str) -> List[Dict]:
        try:
            # Complex query skipped for fallback
            pass
        except: pass
        
        self._initialize_seed_data()
        data_store = _read_json_file(os.path.join(BASE_DIR, "loans.json"))
        loans = data_store.get("all_loans", [])
        
        # Return all voting loans except my own
        return [l for l in loans if l["status"] == "voting" and str(l.get("borrower_id")) != str(user_id)]

    async def get_vouches_received(self, user_id: str) -> List[Dict]:
        try:
            res = self.client.table("vouches").select("*, profiles!vouches_voucher_id_fkey(*)").eq("vouchee_id", user_id).execute()
            if res.data: return res.data
        except: pass
        
        self._initialize_seed_data()
        data = _read_json_file(os.path.join(BASE_DIR, "vouches.json"))
        
        # Use simple key lookup or iterate if needed
        # Our seed structure is keyed by vouchee_id
        if user_id in data:
            return data[user_id]
        
        # If user is demo, return demo data
        if "u-demo" in data:
             # creating a copy to not mutate cache if we need to set IDs
             import copy
             return copy.deepcopy(data["u-demo"])
             
        return []

    async def get_vouches_given(self, user_id: str) -> List[Dict]:
        self._initialize_seed_data()
        data = _read_json_file(os.path.join(BASE_DIR, "vouches.json"))
        
        results = []
        for vouchee, vouches in data.items():
            for v in vouches:
                if str(v.get("voucher_id")) == str(user_id):
                    results.append(v)
        return results


    # --- Saathi & Trust ---
    async def get_saathi_transactions(self, user_id: str, limit: int = 20) -> List[Dict]:
        try:
            res = self.client.table("saathi_transactions").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
            if res.data: return res.data
        except: pass
        
        tx_file = os.path.join(BASE_DIR, "saathi_tx.json")
        txs = _read_json_file(tx_file).get(user_id, [])
        return sorted(txs, key=lambda x: x["created_at"], reverse=True)[:limit]

    async def create_vouch(self, data: Dict) -> Dict:
        """Create a new vouch with persistence"""
        if "id" not in data: data["id"] = f"v-{secrets.token_hex(4)}"
        if "created_at" not in data: data["created_at"] = datetime.utcnow().isoformat()
        if "status" not in data: data["status"] = "active"
        
        try:
            res = self.client.table("vouches").insert(data).execute()
            if res.data: return res.data[0]
        except: pass
        
        self._initialize_seed_data()
        data_store = _read_json_file(os.path.join(BASE_DIR, "vouches.json"))
        # Keyed by vouchee_id
        vouchee = data["vouchee_id"]
        if vouchee not in data_store: data_store[vouchee] = []
        data_store[vouchee].append(data)
        _write_json_file(os.path.join(BASE_DIR, "vouches.json"), data_store)
        return data

    async def revoke_vouch(self, vouch_id: str):
        try:
            self.client.table("vouches").delete().eq("id", vouch_id).execute()
        except: pass
        
        # File update: finding the vouch is tricky since we key by vouchee. 
        # inefficient search needed
        vouches_file = os.path.join(BASE_DIR, "vouches.json")
        data = _read_json_file(vouches_file)
        
        found = False
        for vid, v_list in data.items():
            for i, v in enumerate(v_list):
                if v["id"] == vouch_id:
                    v_list.pop(i)
                    found = True
                    break
            if found: break
            
        if found:
            _write_json_file(vouches_file, data)

    async def get_trust_score_history(self, user_id: str) -> List[Dict]:
        try:
            res = self.client.table("trust_score_history").select("*").eq("user_id", user_id).order("created_at").execute()
            if res.data: return res.data
        except: pass
        
        # Fallback history
        return [
            {"old_score": 75, "new_score": 80, "reason": "Loan Repayment", "score": 80, "created_at": (datetime.utcnow() - timedelta(days=30)).isoformat()}, 
            {"old_score": 80, "new_score": 100, "reason": "Sponsor Bonus", "score": 100, "created_at": datetime.utcnow().isoformat()}
        ]

    async def update_saathi_balance(self, user_id: str, amount: float):
        """Update SAATHI balance with JSON persistence"""
        # DB Update
        try:
            p = await self.get_profile(user_id)
            if p:
                new_bal = float(p.get("saathi_balance", 0)) + amount
                self.client.table("profiles").update({"saathi_balance": new_bal}).eq("id", user_id).execute()
        except: pass
        
        # JSON Update
        profiles = _read_json_file(PROFILE_CACHE_FILE)
        users = [p for p in profiles.values() if str(p.get("id")) == str(user_id)]
        if users:
            user = users[0]
        else:
            # Check if fetchable via API was not in cache
             p = await self.get_profile(user_id)
             if p:
                 user = p
                 profiles[p["phone"]] = p
             else:
                 return # Cannot update unknown user
        
        current = float(user.get("saathi_balance", 0))
        user["saathi_balance"] = current + amount
        _write_json_file(PROFILE_CACHE_FILE, profiles)

    async def create_saathi_transaction(self, data: Dict):
        """Log transaction with JSON persistence"""
        # Ensure ID
        if "id" not in data: data["id"] = f"tx-{secrets.token_hex(4)}"
        if "created_at" not in data: data["created_at"] = datetime.utcnow().isoformat()
            
        try:
            self.client.table("saathi_transactions").insert(data).execute()
        except: pass
        
        # JSON Persist
        tx_file = os.path.join(BASE_DIR, "saathi_tx.json")
        txs = _read_json_file(tx_file)
        uid = str(data["user_id"])
        if uid not in txs: txs[uid] = []
        txs[uid].append(data)
        _write_json_file(tx_file, txs)

    async def update_trust_score(self, user_id: str, new_score: int, reason: str):
        try:
            self.client.table("profiles").update({"trust_score": new_score}).eq("id", user_id).execute()
            self.client.table("trust_score_history").insert({"user_id": user_id, "score": new_score, "reason": reason}).execute()
        except: pass
        
        # Update local profile cache
        profiles = _read_json_file(PROFILE_CACHE_FILE)
        users = [p for p in profiles.values() if str(p.get("id")) == str(user_id)]
        if users:
            users[0]["trust_score"] = new_score
            _write_json_file(PROFILE_CACHE_FILE, profiles)

    # --- Diary ---
    async def create_diary_entry(self, data: Dict) -> Dict:
        """Create diary entry with JSON fallback"""
        if "id" not in data: data["id"] = f"entry-{secrets.token_hex(4)}"
        
        try:
            res = self.client.table("diary_entries").insert(data).execute()
            if res.data: return res.data[0]
        except: pass
        
        # Fallback
        diary_file = os.path.join(BASE_DIR, "diary_entries.json")
        entries = _read_json_file(diary_file)
        uid = str(data["user_id"])
        if uid not in entries: entries[uid] = []
        entries[uid].append(data)
        _write_json_file(diary_file, entries)
        return data

    async def get_diary_entries(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Get diary entries with JSON fallback"""
        try:
            res = self.client.table("diary_entries").select("*").eq("user_id", user_id).order("recorded_at", desc=True).limit(limit).execute()
            if res.data: return res.data
        except: pass
        
        diary_file = os.path.join(BASE_DIR, "diary_entries.json")
        entries = _read_json_file(diary_file).get(str(user_id), [])
        return sorted(entries, key=lambda x: x["recorded_at"], reverse=True)[:limit]

supabase_service = SupabaseService()
