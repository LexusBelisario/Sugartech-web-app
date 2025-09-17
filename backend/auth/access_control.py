# access_control.py
from typing import List, Optional, Dict, Set
from auth.models import User
from fastapi import HTTPException, status
import re

def _norm(s: Optional[str]) -> str:
    """
    Normalize a token for case/space-insensitive compares.
    Lowercase, trim, and convert internal spaces to underscores.
    """
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", "_", s)
    return s

def _split_tokens(raw: Optional[str]) -> List[str]:
    """
    Split a municipal_access string into tokens.
    Supports comma/semicolon/pipe/newline separated values.
    """
    if not raw:
        return []
    parts = re.split(r"[;,|\n]+", raw)
    return [p.strip() for p in parts if p and p.strip()]

def _token_to_schema(token: str, default_province_norm: str) -> str:
    """
    Convert a token into a full schema name.
    Accepts:
      - "Calauan"                       -> "calauan_laguna" (using default province)
      - "Calauan_Laguna"                -> "calauan_laguna"
      - "Pagsanjan, Laguna"             -> "pagsanjan_laguna" (province from token)
    """
    t = token.strip()
    if ", " in t:
        # "Municipality, Province"
        parts = t.split(", ")
        if len(parts) == 2:
            muni_norm = _norm(parts[0])
            prov_norm = _norm(parts[1])
            return f"{muni_norm}_{prov_norm}"
    t_norm = _norm(t)
    if "_" in t_norm:
        return t_norm
    return f"{t_norm}_{default_province_norm}"

class AccessControl:
    @staticmethod
    def check_user_access(user: User) -> Dict:
        """
        Check user's access level and return status.
        """
        if user.provincial_access is None and user.municipal_access is None:
            return {
                "status": "pending_approval",
                "message": "Your account needs admin approval. Please contact the administrator to assign your provincial and municipal access.",
                "allowed_schemas": []
            }

        if user.provincial_access and user.municipal_access is None:
            return {
                "status": "approved",
                "message": f"You have provincial access to {user.provincial_access}, but no municipal access assigned. You can view the map but cannot access specific schemas.",
                "allowed_schemas": []
            }

        return {
            "status": "approved",
            "message": "Access granted",
            "allowed_schemas": []
        }

    @staticmethod
    def filter_schemas_by_access(all_schemas: List[str], user: User) -> List[str]:
        """
        Filter schemas based on user's access rights.
        Accepts tokens in formats:
          - Underscore: "calauan_laguna"
          - Municipality only: "Calauan" (province inferred from user)
          - Comma format: "Pagsanjan, Laguna"
          - "All": every schema ending with _{province}
        """
        if not user.provincial_access:
            return []

        all_map = {s.lower(): s for s in all_schemas}
        province_norm = _norm(user.provincial_access)

        if user.municipal_access is None:
            return []

        if user.municipal_access.strip().lower() == "all":
            out = [orig for lower, orig in all_map.items() if lower.endswith(f"_{province_norm}")]
            return sorted(out)

        tokens = _split_tokens(user.municipal_access)
        wanted: Set[str] = set(_token_to_schema(t, province_norm) for t in tokens)

        matched = [all_map[name] for name in wanted if name in all_map]
        return sorted(matched)

    @staticmethod
    def validate_schema_access(schema: str, user: User) -> bool:
        """
        Validate if user has access to a specific schema.
        """
        if not user.provincial_access:
            return False
        if user.municipal_access is None:
            return False

        province_norm = _norm(user.provincial_access)
        schema_norm = _norm(schema)

        if user.municipal_access.strip().lower() == "all":
            return schema_norm.endswith(f"_{province_norm}")

        tokens = _split_tokens(user.municipal_access)
        for t in tokens:
            if schema_norm == _token_to_schema(t, province_norm):
                return True
        return False

    @staticmethod
    def get_access_description(user: User) -> str:
        """
        Human-readable description of user's access.
        """
        if not user.provincial_access and not user.municipal_access:
            return "No access assigned"

        if user.provincial_access and user.municipal_access is None:
            return f"Provincial access to {user.provincial_access} only (no municipal access)"

        if user.municipal_access and user.municipal_access.strip().lower() == "all":
            return f"Full access to all municipalities in {user.provincial_access}"

        if user.municipal_access:
            return f"Access limited to {user.municipal_access}"

        return "Invalid access configuration"

    # Optional convenience (not used by view.py, but kept for completeness)
    @staticmethod
    def get_allowed_schemas(user: User) -> List[str]:
        """
        Returns normalized schema names or patterns based on user's access.
        """
        if not user.provincial_access or not user.municipal_access:
            return []
        province_norm = _norm(user.provincial_access)
        if user.municipal_access.strip().lower() == "all":
            return [f"*_{province_norm}"]
        tokens = _split_tokens(user.municipal_access)
        return [_token_to_schema(t, province_norm) for t in tokens]
