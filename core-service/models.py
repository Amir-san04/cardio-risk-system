from sqlalchemy import Column, Integer, String, Date, Enum, DateTime
from sqlalchemy.ext.declarative import declarative_base
import datetime
import enum

Base = declarative_base()

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    DOCTOR = "doctor"
    PATIENT = "patient"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default=UserRole.PATIENT) # Роль здесь

    # Поля для пациента
    birth_date = Column(Date, nullable=True)
    gender = Column(String, nullable=True)

    # Поля для врача
    specialization = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)