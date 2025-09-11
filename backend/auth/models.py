
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

AuthBase = declarative_base()

class Credentials(AuthBase):
    __tablename__ = "credentials"
    __table_args__ = {'schema': 'credentials_users_schema'}
    
    cred_number = Column(Integer, primary_key=True)
    host = Column(String, nullable=False)
    port = Column(String, nullable=False)
    dbname = Column(String, nullable=False)
    user = Column(String, nullable=False)
    password = Column(String, nullable=False)
    
    # Relationship
    users = relationship("User", back_populates="credentials")

class User(AuthBase):
    __tablename__ = "users_table"
    __table_args__ = {'schema': 'credentials_users_schema'}
    
    id = Column(Integer, primary_key=True)
    user_name = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False) 
    cred_number = Column(Integer, ForeignKey('credentials_users_schema.credentials.cred_number'))
    
    # Relationship
    credentials = relationship("Credentials", back_populates="users")