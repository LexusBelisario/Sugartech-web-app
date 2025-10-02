from typing import List, Dict
from auth.models import User
from fastapi import HTTPException, status


class AccessControl:
    @staticmethod
    def check_user_access(user: User) -> Dict:
        """
        Check user's access level and return status + allowed schemas (for users only).
        """

        # 🚫 Case 1: No provincial & no municipal
        if not user.provincial_access and not user.municipal_access:
            return {
                "status": "pending_approval",
                "message": "Your account needs admin approval. Please contact the administrator to assign your provincial and municipal access.",
                "allowed_schemas": []
            }

        # 🚫 Case 2: Provincial access but no municipal access → BLOCK LOGIN
        if user.provincial_access and not user.municipal_access:
            return {
                "status": "pending_approval",
                "message": f"You have provincial access to {user.provincial_access}, but no municipal access assigned. Please contact the administrator to enable municipal access.",
                "allowed_schemas": []
            }

        # ✅ Case 3: Both provincial + municipal access → allow
        return {
            "status": "approved",
            "message": "Access granted",
            "allowed_schemas": AccessControl.get_allowed_schemas(user)
        }

    @staticmethod
    def filter_schemas_by_access(all_schemas: List[str], user: User) -> List[str]:
        """
        Filter available schemas (all_schemas) based on user's PSGC codes.
        """
        if not user.provincial_access or not user.municipal_access:
            return []

        # Special case: "ALL" → allow all municipalities under this province
        if user.municipal_access.strip().lower() == "all":
            return sorted([s for s in all_schemas if s.startswith(user.provincial_access)])

        # Otherwise, check exact PSGC match
        wanted = {user.municipal_access}
        matched = [s for s in all_schemas if s in wanted]
        return sorted(matched)

    @staticmethod
    def validate_schema_access(schema: str, user: User) -> bool:
        """
        Check if user can access the given schema.
        """
        if not user.provincial_access or not user.municipal_access:
            return False

        # "ALL" → check province prefix
        if user.municipal_access.strip().lower() == "all":
            return schema.startswith(user.provincial_access)

        return schema == user.municipal_access

    @staticmethod
    def get_access_description(user: User) -> str:
        if not user.provincial_access and not user.municipal_access:
            return "No access assigned"

        if user.provincial_access and not user.municipal_access:
            return f"Provincial access {user.provincial_access} only (no municipal access)"

        if user.municipal_access and user.municipal_access.strip().lower() == "all":
            return f"Full access to all municipalities under {user.provincial_access}"

        if user.municipal_access:
            return f"Access limited to municipality {user.municipal_access}"

        return "Invalid access configuration"

    @staticmethod
    def get_allowed_schemas(user: User) -> List[str]:
        """
        Return a list of schemas this user is allowed to access.
        """
        if not user.provincial_access or not user.municipal_access:
            return []

        if user.municipal_access.strip().lower() == "all":
            # Wildcard notation → will be expanded later
            return [f"{user.provincial_access}*"]

        return [user.municipal_access]
