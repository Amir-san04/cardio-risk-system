from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pydantic import BaseModel, EmailStr, validator
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, date
import os
import httpx
from typing import Optional, List
import json

# Импортируем наши модели
from models import Base, User, UserRole, Examination, MedicalFile, RiskPrediction, RiskLevel

# ============================================================================
# КОНФИГУРАЦИЯ
# ============================================================================

# Получаем переменные окружения
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/cardio_db")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# URL сервиса предсказаний
PREDICTION_SERVICE_URL = os.getenv("PREDICTION_SERVICE_URL", "http://prediction-service:8001")

# Директория для хранения файлов (в продакшене используй S3/MinIO)
UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ============================================================================
# НАСТРОЙКА БАЗЫ ДАННЫХ
# ============================================================================

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Создаем таблицы в базе данных (в продакшене используй Alembic)
Base.metadata.create_all(bind=engine)

# ============================================================================
# НАСТРОЙКА БЕЗОПАСНОСТИ
# ============================================================================

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

def get_password_hash(password: str) -> str:
    """Хеширует пароль"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверяет пароль"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Создает JWT токен"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ============================================================================
# PYDANTIC СХЕМЫ
# ============================================================================

class UserCreate(BaseModel):
    """Схема для регистрации пользователя"""
    email: EmailStr
    password: str
    full_name: str
    role: str = "patient"
    phone: Optional[str] = None
    
    # Дополнительные поля для пациента
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    
    # Дополнительные поля для врача
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    
    @validator('role')
    def validate_role(cls, v):
        valid_roles = ['admin', 'doctor', 'patient']
        if v not in valid_roles:
            raise ValueError(f'Invalid role. Must be one of: {valid_roles}')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v


class LoginRequest(BaseModel):
    """Схема для входа"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Схема для ответа с данными пользователя"""
    id: int
    email: str
    full_name: str
    role: str
    phone: Optional[str]
    birth_date: Optional[date]
    gender: Optional[str]
    specialization: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class PredictionRequest(BaseModel):
    """Схема для запроса предсказания - параметры для ML модели"""
    age: int
    sex: int  # 0 = female, 1 = male
    cholesterol: int
    fbs: int  # fasting blood sugar > 120 mg/dl (1 = true; 0 = false)
    restecg: int  # resting electrocardiographic results (0, 1, 2)
    
    @validator('sex')
    def validate_sex(cls, v):
        if v not in [0, 1]:
            raise ValueError('sex must be 0 (female) or 1 (male)')
        return v
    
    @validator('fbs')
    def validate_fbs(cls, v):
        if v not in [0, 1]:
            raise ValueError('fbs must be 0 or 1')
        return v
    
    @validator('restecg')
    def validate_restecg(cls, v):
        if v not in [0, 1, 2]:
            raise ValueError('restecg must be 0, 1, or 2')
        return v


# ============================================================================
# НОВЫЕ СХЕМЫ ДЛЯ EXAMINATIONS И FILES
# ============================================================================

class ExaminationCreate(BaseModel):
    """Схема для создания обследования"""
    patient_id: int
    exam_type: str  # "MRI Scan", "Blood Test", "General Checkup", "CT Scan"
    complaints: Optional[str] = None
    
    @validator('exam_type')
    def validate_exam_type(cls, v):
        valid_types = ['MRI Scan', 'Blood Test', 'General Checkup', 'CT Scan', 'ECG', 'X-Ray']
        if v not in valid_types:
            raise ValueError(f'Invalid exam_type. Must be one of: {valid_types}')
        return v


class ExaminationResponse(BaseModel):
    """Схема для ответа с данными обследования"""
    id: int
    doctor_id: int
    patient_id: int
    exam_date: datetime
    exam_type: str
    complaints: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class MedicalFileResponse(BaseModel):
    """Схема для ответа с данными медицинского файла"""
    id: int
    examination_id: int
    file_url: str
    file_type: str
    file_metadata: Optional[dict]
    created_at: datetime
    
    class Config:
        from_attributes = True


class RiskPredictionCreate(BaseModel):
    """Схема для создания прогноза риска"""
    examination_id: int
    prediction_data: PredictionRequest


class RiskPredictionResponse(BaseModel):
    """Схема для ответа с результатами прогноза"""
    id: int
    examination_id: int
    risk_score: float
    risk_level: str
    ml_model_version: str
    explanation: Optional[dict]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# DEPENDENCIES
# ============================================================================

def get_db():
    """Dependency для получения сессии БД"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Получает текущего пользователя из JWT токена"""
    
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    return user


def require_role(required_roles: list[UserRole]):
    """Dependency для проверки роли пользователя"""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in required_roles]}"
            )
        return current_user
    return role_checker


# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(
    title="Cardio Risk Core Service",
    description="Основной сервис системы оценки кардиориска",
    version="1.0.0"
)


# ============================================================================
# ПУБЛИЧНЫЕ ENDPOINTS
# ============================================================================

@app.get("/")
def read_root():
    """Корневой endpoint"""
    return {
        "message": "Cardio Risk Core Service is running",
        "version": "1.0.0",
        "status": "healthy"
    }


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Проверка здоровья сервиса"""
    try:
        # Проверяем подключение к БД
        db.execute("SELECT 1")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "database": db_status,
        "timestamp": datetime.utcnow()
    }


# ============================================================================
# AUTH ENDPOINTS
# ============================================================================

@app.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Регистрация нового пользователя"""
    # Проверяем, нет ли уже такого email
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Создаем нового пользователя
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        full_name=user_data.full_name,
        role=UserRole(user_data.role),
        phone=user_data.phone,
        birth_date=user_data.birth_date,
        gender=user_data.gender,
        specialization=user_data.specialization,
        license_number=user_data.license_number
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@app.post("/token")
def login(form_data: LoginRequest, db: Session = Depends(get_db)):
    """Вход в систему (получение JWT токена)"""
    # Ищем пользователя
    user = db.query(User).filter(User.email == form_data.email).first()
    
    # Проверяем пароль
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Проверяем, активен ли пользователь
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    # Создаем токен
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value, "user_id": user.id}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value
        }
    }


@app.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Получить информацию о текущем пользователе"""
    return current_user


# ============================================================================
# USER MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/users")
def get_all_users(
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Получить список всех пользователей (только для админов)"""
    users = db.query(User).all()
    return {
        "total": len(users),
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role.value,
                "is_active": u.is_active,
                "created_at": u.created_at
            }
            for u in users
        ]
    }


@app.get("/doctors")
def get_doctors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить список врачей"""
    doctors = db.query(User).filter(User.role == UserRole.DOCTOR).all()
    return {
        "total": len(doctors),
        "doctors": [
            {
                "id": d.id,
                "full_name": d.full_name,
                "specialization": d.specialization,
                "email": d.email,
                "license_number": d.license_number
            }
            for d in doctors
        ]
    }


@app.get("/patients")
def get_patients(
    current_user: User = Depends(require_role([UserRole.DOCTOR, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Получить список пациентов (только врачи и админы)"""
    patients = db.query(User).filter(User.role == UserRole.PATIENT).all()
    return {
        "total": len(patients),
        "patients": [
            {
                "id": p.id,
                "full_name": p.full_name,
                "email": p.email,
                "birth_date": p.birth_date,
                "gender": p.gender,
                "phone": p.phone
            }
            for p in patients
        ]
    }


# ============================================================================
# EXAMINATION ENDPOINTS (НОВЫЕ!)
# ============================================================================

@app.post("/examinations", response_model=ExaminationResponse, status_code=status.HTTP_201_CREATED)
def create_examination(
    exam_data: ExaminationCreate,
    current_user: User = Depends(require_role([UserRole.DOCTOR])),
    db: Session = Depends(get_db)
):
    """Создать новое обследование (только врачи)"""
    # Проверяем, существует ли пациент
    patient = db.query(User).filter(
        User.id == exam_data.patient_id,
        User.role == UserRole.PATIENT
    ).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Создаем обследование
    new_exam = Examination(
        doctor_id=current_user.id,
        patient_id=exam_data.patient_id,
        exam_type=exam_data.exam_type,
        complaints=exam_data.complaints
    )
    
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    
    return new_exam


@app.get("/examinations", response_model=List[ExaminationResponse])
def get_examinations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить список обследований"""
    # Если врач - показываем его обследования
    # Если пациент - показываем только его обследования
    # Если админ - показываем все
    
    if current_user.role == UserRole.ADMIN:
        examinations = db.query(Examination).all()
    elif current_user.role == UserRole.DOCTOR:
        examinations = db.query(Examination).filter(
            Examination.doctor_id == current_user.id
        ).all()
    else:  # PATIENT
        examinations = db.query(Examination).filter(
            Examination.patient_id == current_user.id
        ).all()
    
    return examinations


@app.get("/examinations/{examination_id}", response_model=ExaminationResponse)
def get_examination(
    examination_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить конкретное обследование"""
    exam = db.query(Examination).filter(Examination.id == examination_id).first()
    
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Examination not found"
        )
    
    # Проверка прав доступа
    if current_user.role == UserRole.PATIENT:
        if exam.patient_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    elif current_user.role == UserRole.DOCTOR:
        if exam.doctor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    return exam


# ============================================================================
# MEDICAL FILE ENDPOINTS (НОВЫЕ!)
# ============================================================================

@app.post("/examinations/{examination_id}/upload-file")
async def upload_medical_file(
    examination_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role([UserRole.DOCTOR])),
    db: Session = Depends(get_db)
):
    """Загрузить медицинский файл к обследованию"""
    # Проверяем, существует ли обследование
    exam = db.query(Examination).filter(Examination.id == examination_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Examination not found"
        )
    
    # Проверяем права (только врач этого обследования)
    if exam.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Определяем тип файла
    file_extension = file.filename.split('.')[-1].lower()
    if file_extension == 'dcm':
        file_type = 'DICOM'
    elif file_extension == 'pdf':
        file_type = 'PDF'
    elif file_extension in ['jpg', 'jpeg', 'png']:
        file_type = 'JPG'
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Allowed: .dcm, .pdf, .jpg, .png"
        )
    
    # Сохраняем файл
    file_path = os.path.join(UPLOAD_DIR, f"exam_{examination_id}_{file.filename}")
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # TODO: Здесь Амир должен добавить парсинг DICOM тегов с помощью pydicom
    file_metadata = {"original_filename": file.filename, "size_bytes": len(content)}
    
    # Создаем запись в БД
    new_file = MedicalFile(
        examination_id=examination_id,
        file_url=file_path,
        file_type=file_type,
        file_metadata=file_metadata
    )
    
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    
    return {
        "message": "File uploaded successfully",
        "file_id": new_file.id,
        "file_type": file_type,
        "file_url": file_path
    }


@app.get("/examinations/{examination_id}/files", response_model=List[MedicalFileResponse])
def get_examination_files(
    examination_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить все файлы обследования"""
    # Проверяем права доступа к обследованию
    exam = db.query(Examination).filter(Examination.id == examination_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Examination not found"
        )
    
    if current_user.role == UserRole.PATIENT:
        if exam.patient_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif current_user.role == UserRole.DOCTOR:
        if exam.doctor_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    files = db.query(MedicalFile).filter(MedicalFile.examination_id == examination_id).all()
    return files


# ============================================================================
# ML PREDICTION ENDPOINTS (ОБНОВЛЁННЫЕ!)
# ============================================================================

@app.post("/examinations/{examination_id}/predict", response_model=RiskPredictionResponse)
async def create_risk_prediction(
    examination_id: int,
    prediction_data: PredictionRequest,
    current_user: User = Depends(require_role([UserRole.DOCTOR, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Получить предсказание риска для обследования (только врачи и админы)"""
    # Проверяем обследование
    exam = db.query(Examination).filter(Examination.id == examination_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Examination not found"
        )
    
    # Отправляем данные в ML сервис
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{PREDICTION_SERVICE_URL}/predict",
                json=prediction_data.dict()
            )
            response.raise_for_status()
            prediction_result = response.json()
        
        # Сохраняем результат в БД
        new_prediction = RiskPrediction(
            examination_id=examination_id,
            risk_score=prediction_result['risk_score'],
            risk_level=RiskLevel(prediction_result['risk_level']),
            ml_model_version="v1.0",  # TODO: получать из ML сервиса
            explanation={"recommendations": prediction_result.get('recommendations', [])}
        )
        
        db.add(new_prediction)
        db.commit()
        db.refresh(new_prediction)
        
        return new_prediction
    
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Prediction service error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@app.get("/examinations/{examination_id}/predictions", response_model=List[RiskPredictionResponse])
def get_examination_predictions(
    examination_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить все прогнозы для обследования"""
    # Проверяем права доступа
    exam = db.query(Examination).filter(Examination.id == examination_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Examination not found")
    
    if current_user.role == UserRole.PATIENT:
        if exam.patient_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif current_user.role == UserRole.DOCTOR:
        if exam.doctor_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    predictions = db.query(RiskPrediction).filter(
        RiskPrediction.examination_id == examination_id
    ).all()
    
    return predictions


@app.get("/predict-test")
async def get_prediction_test():
    """Тестовый endpoint для проверки связи с ML сервисом"""
    test_data = {
        "age": 45,
        "sex": 1,  # male
        "cholesterol": 200,
        "fbs": 0,  # normal
        "restecg": 0  # normal
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{PREDICTION_SERVICE_URL}/predict",
                json=test_data
            )
            response.raise_for_status()
            prediction_result = response.json()
        
        return {
            "status": "Connection successful",
            "test_data": test_data,
            "prediction_result": prediction_result
        }
    
    except httpx.HTTPError as e:
        return {
            "status": "Connection failed",
            "error": str(e),
            "prediction_service_url": PREDICTION_SERVICE_URL
        }


# ============================================================================
# DEBUG ENDPOINTS (удали в продакшене)
# ============================================================================

@app.get("/debug/db-stats")
def debug_db_stats(db: Session = Depends(get_db)):
    """Статистика базы данных"""
    return {
        "total_users": db.query(User).count(),
        "admins": db.query(User).filter(User.role == UserRole.ADMIN).count(),
        "doctors": db.query(User).filter(User.role == UserRole.DOCTOR).count(),
        "patients": db.query(User).filter(User.role == UserRole.PATIENT).count(),
        "examinations": db.query(Examination).count(),
        "medical_files": db.query(MedicalFile).count(),
        "risk_predictions": db.query(RiskPrediction).count()
    }