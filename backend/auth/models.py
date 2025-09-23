from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.ext.declarative import declarative_base

AuthBase = declarative_base()

class Credentials(AuthBase):
    __tablename__ = "credentials"
    __table_args__ = {'schema': 'credentials_users_schema'}
    
    id = Column(Integer, primary_key=True)
    host = Column(String, nullable=False)
    port = Column(String, nullable=False)
    dbname = Column(String, nullable=False)
    user = Column(String, nullable=False)
    password = Column(String, nullable=False)

class User(AuthBase):
    __tablename__ = "users_table"
    __table_args__ = {'schema': 'credentials_users_schema'}
    
    id = Column(Integer, primary_key=True)
    user_name = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    email = Column(String, unique=True, nullable=True)
    contact_number = Column(String, nullable=True)
    provincial_access = Column(String, nullable=True)
    municipal_access = Column(String, nullable=True)

class UserRegistrationRequest(AuthBase):
    __tablename__ = "user_registration_requests"
    __table_args__ = {'schema': 'credentials_users_schema'}
    
    id = Column(Integer, primary_key=True)
    user_name = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    contact_number = Column(String, nullable=True)
    requested_provincial_access = Column(String, nullable=True)
    requested_municipal_access = Column(String, nullable=True)
    status = Column(String, default='pending') 
    request_date = Column(DateTime, server_default=func.now())
    reviewed_by = Column(String, nullable=True)
    review_date = Column(DateTime, nullable=True)
    remarks = Column(String, nullable=True)
    
class Admin(AuthBase):
    __tablename__ = "admin_login"
    __table_args__ = {'schema' : "credentials_users_schema"}
    
    id = Column(Integer, primary_key=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=True)
    contact_number = Column(String, nullable=True)
    user_name = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)