from sqlalchemy import Column, Integer, String, Date, Enum, DateTime, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
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


class RiskLevel(str, enum.Enum):
    """Уровни риска"""
    LOW = "Low Risk"
    MEDIUM = "Medium Risk"
    HIGH = "High Risk"


class User(Base):
    """Модель пользователя (Базовая таблица для всех ролей)"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.PATIENT, nullable=False)
    
    # Общие поля
    phone = Column(String, nullable=True)
    is_active = Column(Integer, default=1)  # 1 = активен, 0 = деактивирован
    
    # Поля специфичные для Пациента (могут быть NULL для врача)
    birth_date = Column(Date, nullable=True)
    gender = Column(String, nullable=True)  # 'M', 'F'

    # Поля специфичные для Врача (могут быть NULL для пациента)
    specialization = Column(String, nullable=True)  # Например, "Cardiologist"
    license_number = Column(String, nullable=True)  # Номер лицензии
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    examinations_as_doctor = relationship("Examination", foreign_keys="Examination.doctor_id", back_populates="doctor")
    examinations_as_patient = relationship("Examination", foreign_keys="Examination.patient_id", back_populates="patient")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"


class Examination(Base):
    """Модель обследования/визита (Связывает врача и пациента)"""
    __tablename__ = "examinations"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Данные обследования
    exam_date = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    exam_type = Column(String, nullable=False)  # "MRI Scan", "Blood Test", "General Checkup"
    complaints = Column(Text, nullable=True)  # Жалобы пациента (для NLP анализа в будущем)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="examinations_as_doctor")
    patient = relationship("User", foreign_keys=[patient_id], back_populates="examinations_as_patient")
    medical_files = relationship("MedicalFile", back_populates="examination", cascade="all, delete-orphan")
    risk_predictions = relationship("RiskPrediction", back_populates="examination", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Examination(id={self.id}, patient_id={self.patient_id}, exam_type='{self.exam_type}')>"


class MedicalFile(Base):
    """Модель медицинских файлов (DICOM, PDF, JPG)"""
    __tablename__ = "medical_files"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Key
    examination_id = Column(Integer, ForeignKey("examinations.id"), nullable=False)
    
    # Информация о файле
    file_url = Column(String, nullable=False)  # Путь к файлу в S3/MinIO (например, "s3://med-bucket/scan_01.dcm")
    file_type = Column(String, nullable=False)  # "DICOM", "PDF", "JPG"
    
    # ВАЖНО: JSONB для хранения метаданных из DICOM тегов
    file_metadata = Column(JSONB, nullable=True)  # Гибкое хранилище для данных из DICOM
    # Пример: {"PatientName": "John Doe", "StudyDate": "20240101", "Modality": "CT", "ImageSize": "512x512"}
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    examination = relationship("Examination", back_populates="medical_files")

    def __repr__(self):
        return f"<MedicalFile(id={self.id}, examination_id={self.examination_id}, file_type='{self.file_type}')>"


class RiskPrediction(Base):
    """Модель результатов прогнозирования (ML Results)"""
    __tablename__ = "risk_predictions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Key
    examination_id = Column(Integer, ForeignKey("examinations.id"), nullable=False)
    
    # Результаты ML модели
    risk_score = Column(Float, nullable=False)  # Вероятность (0.0 - 1.0)
    risk_level = Column(Enum(RiskLevel), nullable=False)  # "Low Risk", "Medium Risk", "High Risk"
    
    # MLOps: версионирование модели
    ml_model_version = Column(String, nullable=False)  # Например, "v1.2_random_forest"
    
    # Дополнительная информация
    explanation = Column(JSONB, nullable=True)  # Объяснение от нейросети (почему риск высокий?)
    # Пример: {"reason": "High cholesterol", "contributing_factors": ["age > 50", "fbs = 1"]}
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    examination = relationship("Examination", back_populates="risk_predictions")

    def __repr__(self):
        return f"<RiskPrediction(id={self.id}, examination_id={self.examination_id}, risk_level='{self.risk_level}')>"