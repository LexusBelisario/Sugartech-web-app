from sqlalchemy import Column, Integer, String
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
    provincial_access = Column(String, nullable=True)
    municipal_access = Column(String, nullable=True)
    
    
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
    