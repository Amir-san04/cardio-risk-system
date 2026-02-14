from sqlalchemy import Column, Integer, String, Date, Enum, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime
import enum

Base = declarative_base()


class UserRole(str, enum.Enum):
    """Роли пользователей в системе"""
    ADMIN = "admin"
    DOCTOR = "doctor"
    PATIENT = "patient"


class User(Base):
    """Модель пользователя"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.PATIENT, nullable=False)

    # Общие поля
    phone = Column(String, nullable=True)
    is_active = Column(Integer, default=1)  # 1 = активен, 0 = деактивирован
    
    # Поля для пациента
    birth_date = Column(Date, nullable=True)
    gender = Column(String, nullable=True)  # male/female/other

    # Поля для врача
    specialization = Column(String, nullable=True)
    license_number = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"