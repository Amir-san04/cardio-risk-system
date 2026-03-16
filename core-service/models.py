from sqlalchemy import Column, Integer, String, Date, Enum, DateTime, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime
import enum

Base = declarative_base()

class UserRole(str, enum.Enum):
    """Роли пользователей — в нижнем регистре для удобства API"""
    ADMIN = "admin"
    DOCTOR = "doctor"
    PATIENT = "patient"

class RiskLevel(str, enum.Enum):
    """
    Уровни риска. 
    Изменено на строчные значения, чтобы напрямую принимать данные из ML-модели.
    """
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.PATIENT, nullable=False)
    
    phone = Column(String, nullable=True)
    is_active = Column(Integer, default=1) 
    
    birth_date = Column(Date, nullable=True)
    gender = Column(String, nullable=True) 

    specialization = Column(String, nullable=True)
    license_number = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    examinations_as_doctor = relationship("Examination", foreign_keys="Examination.doctor_id", back_populates="doctor")
    examinations_as_patient = relationship("Examination", foreign_keys="Examination.patient_id", back_populates="patient")

class Examination(Base):
    __tablename__ = "examinations"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    exam_date = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    exam_type = Column(String, nullable=False) 
    complaints = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="examinations_as_doctor")
    patient = relationship("User", foreign_keys=[patient_id], back_populates="examinations_as_patient")
    medical_files = relationship("MedicalFile", back_populates="examination", cascade="all, delete-orphan")
    risk_predictions = relationship("RiskPrediction", back_populates="examination", cascade="all, delete-orphan")

class MedicalFile(Base):
    __tablename__ = "medical_files"

    id = Column(Integer, primary_key=True, index=True)
    examination_id = Column(Integer, ForeignKey("examinations.id"), nullable=False)
    file_url = Column(String, nullable=False)
    file_type = Column(String, nullable=False) 
    file_metadata = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    examination = relationship("Examination", back_populates="medical_files")

class RiskPrediction(Base):
    __tablename__ = "risk_predictions"

    id = Column(Integer, primary_key=True, index=True)
    examination_id = Column(Integer, ForeignKey("examinations.id"), nullable=False)
    
    risk_score = Column(Float, nullable=False)
    # Используем обновленный Enum
    risk_level = Column(Enum(RiskLevel), nullable=False) 
    
    ml_model_version = Column(String, nullable=False)
    explanation = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    examination = relationship("Examination", back_populates="risk_predictions")