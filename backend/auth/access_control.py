# Updated access_control.py
from typing import List, Optional, Dict
from auth.models import User
from fastapi import HTTPException, status

class AccessControl:
    @staticmethod
    def check_user_access(user: User) -> Dict:
        """
        Check user's access level and return status
        """
        # Case 1: Both NULL - need admin approval
        if user.provincial_access is None and user.municipal_access is None:
            return {
                'status': 'pending_approval',
                'message': 'Your account needs admin approval. Please contact the administrator to assign your provincial and municipal access.',
                'allowed_schemas': []
            }
        
        # Case 2: Provincial exists but municipal is NULL - limited access (can view map but no schemas)
        if user.provincial_access and user.municipal_access is None:
            return {
                'status': 'approved',
                'message': f'You have provincial access to {user.provincial_access}, but no municipal access assigned. You can view the map but cannot access specific schemas.',
                'allowed_schemas': []
            }
        
        # Case 3: Both have values - full access
        return {
            'status': 'approved',
            'message': 'Access granted',
            'allowed_schemas': []  # This will be populated by filter_schemas_by_access
        }
    
    @staticmethod
    def get_allowed_schemas(user: User) -> List[str]:
        """
        Get list of allowed schemas based on user's access
        This returns patterns or specific schema names
        """
        if not user.provincial_access or not user.municipal_access:
            return []
        
        allowed_schemas = []
        
        # If municipal_access is "All", return pattern for all municipalities in province
        if user.municipal_access.upper() == "ALL":
            # Pattern: all schemas ending with _provincename
            province_lower = user.provincial_access.lower()
            allowed_schemas.append(f"*_{province_lower}")
        else:
            # Specific municipal access - return exact schema name
            allowed_schemas.append(user.municipal_access)
        
        return allowed_schemas
    
    @staticmethod
    def filter_schemas_by_access(all_schemas: List[str], user: User) -> List[str]:
        """
        Filter schemas based on user's access rights
        Handles both formats:
        - underscore format: calauan_laguna
        - comma format: Pagsanjan, Laguna
        """
        if not user.provincial_access:
            return []
        
        # If municipal_access is NULL, return empty list (can see map but no schemas)
        if user.municipal_access is None:
            return []
        
        # Case 1: "All" municipal access - return all schemas for the province
        if user.municipal_access.upper() == "ALL":
            province = user.provincial_access
            province_lower = province.lower()
            
            filtered_schemas = []
            for schema in all_schemas:
                schema_lower = schema.lower()
                
                # Check for underscore format (e.g., calauan_laguna)
                if schema_lower.endswith(f"_{province_lower}"):
                    filtered_schemas.append(schema)
                    print(f"  ✓ Matched underscore format: {schema}")
                
                # Check for comma format (e.g., Pagsanjan, Laguna)
                elif ", " in schema:
                    parts = schema.split(", ")
                    if len(parts) == 2 and parts[1].lower() == province_lower:
                        filtered_schemas.append(schema)
                        print(f"  ✓ Matched comma format: {schema}")
            
            print(f"User {user.user_name} with 'All' access to {user.provincial_access} can access: {filtered_schemas}")
            return filtered_schemas
        
        # Case 2: Specific municipal access
        else:
            municipal_lower = user.municipal_access.lower()
            province_lower = user.provincial_access.lower()
            
            matched_schemas = []
            
            for schema in all_schemas:
                schema_lower = schema.lower()
                
                # Check underscore format
                if schema_lower == f"{municipal_lower}_{province_lower}":
                    matched_schemas.append(schema)
                
                # Check comma format
                elif ", " in schema:
                    parts = schema.split(", ")
                    if len(parts) == 2:
                        if parts[0].lower() == municipal_lower and parts[1].lower() == province_lower:
                            matched_schemas.append(schema)
            
            return matched_schemas

    @staticmethod
    def validate_schema_access(schema: str, user: User) -> bool:
        """
        Validate if user has access to a specific schema
        Handles both formats:
        - underscore format: calauan_laguna
        - comma format: Pagsanjan, Laguna
        """
        if not user.provincial_access:
            return False
        
        if user.municipal_access is None:
            return False
        
        province = user.provincial_access
        province_lower = province.lower()
        schema_lower = schema.lower()
        
        # If user has "All" access for the province
        if user.municipal_access.upper() == "ALL":
            # Check underscore format
            if schema_lower.endswith(f"_{province_lower}"):
                return True
            
            # Check comma format
            if ", " in schema:
                parts = schema.split(", ")
                if len(parts) == 2 and parts[1].lower() == province_lower:
                    return True
            
            return False
        
        # If user has specific municipal access
        else:
            municipal_lower = user.municipal_access.lower()
            
            # Check underscore format
            if schema_lower == f"{municipal_lower}_{province_lower}":
                return True
            
            # Check comma format
            if ", " in schema:
                parts = schema.split(", ")
                if len(parts) == 2:
                    if parts[0].lower() == municipal_lower and parts[1].lower() == province_lower:
                        return True
            
            return False
    
    @staticmethod
    def get_access_description(user: User) -> str:
        """
        Get human-readable description of user's access
        """
        if not user.provincial_access and not user.municipal_access:
            return "No access assigned"
        
        if user.provincial_access and user.municipal_access is None:
            return f"Provincial access to {user.provincial_access} only (no municipal access)"
        
        if user.municipal_access and user.municipal_access.upper() == "ALL":
            return f"Full access to all municipalities in {user.provincial_access}"
        elif user.municipal_access:
            return f"Access limited to {user.municipal_access}"
        
        return "Invalid access configuration"