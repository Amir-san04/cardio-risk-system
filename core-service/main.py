from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
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

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/cardio_db")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

PREDICTION_SERVICE_URL = os.getenv("PREDICTION_SERVICE_URL", "http://prediction-service:8001")

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ============================================================================
# НАСТРОЙКА БАЗЫ ДАННЫХ
# ============================================================================

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(
    title="Cardio Risk Core Service",
    description="Основной сервис системы оценки кардиориска",
    version="1.0.0"
)

# ============================================================================
# CORS - КРИТИЧЕСКИ ВАЖНО ДЛЯ GITHUB CODESPACES
# ============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешить ВСЕ origins (для разработки)
    allow_credentials=True,
    allow_methods=["*"],  # GET, POST, PUT, DELETE, OPTIONS
    allow_headers=["*"],  # Content-Type, Authorization, и т.д.
    expose_headers=["*"],
)

# ============================================================================
# ЯВНЫЙ OPTIONS HANDLER ДЛЯ PREFLIGHT
# ============================================================================

@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    """Обработчик preflight запросов для CORS"""
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
    )

# Остальной код остаётся БЕЗ ИЗМЕНЕНИЙ...

# Исключаем OPTIONS из проверки авторизации — чтобы preflight прошёл
@app.options("/{path:path}")
async def options(path: str):
    return {}

# ============================================================================
# НАСТРОЙКА БЕЗОПАСНОСТИ
# ============================================================================

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
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
    email: EmailStr
    password: str
    full_name: str
    role: str = "patient"
    phone: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
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
    email: EmailStr
    password: str


class UserResponse(BaseModel):
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
    age: int
    sex: int
    cholesterol: int
    fbs: int
    restecg: int

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


class ExaminationCreate(BaseModel):
    patient_id: int
    exam_type: str
    complaints: Optional[str] = None

    @validator('exam_type')
    def validate_exam_type(cls, v):
        valid_types = ['MRI Scan', 'Blood Test', 'General Checkup', 'CT Scan', 'ECG', 'X-Ray']
        if v not in valid_types:
            raise ValueError(f'Invalid exam_type. Must be one of: {valid_types}')
        return v


class ExaminationResponse(BaseModel):
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
    id: int
    examination_id: int
    file_url: str
    file_type: str
    file_metadata: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True


class RiskPredictionCreate(BaseModel):
    examination_id: int
    prediction_data: PredictionRequest


class RiskPredictionResponse(BaseModel):
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
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
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
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated")

    return user


def require_role(required_roles: list[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in required_roles]}"
            )
        return current_user
    return role_checker


# ============================================================================
# ПУБЛИЧНЫЕ ENDPOINTS
# ============================================================================

@app.get("/")
def read_root():
    return {
        "message": "Cardio Risk Core Service is running",
        "version": "1.0.0",
        "status": "healthy"
    }


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
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
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

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
    user = db.query(User).filter(User.email == form_data.email).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated")

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
    return current_user


# ============================================================================
# USER MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/users")
def get_all_users(
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
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
# EXAMINATION ENDPOINTS
# ============================================================================

@app.post("/examinations", response_model=ExaminationResponse, status_code=status.HTTP_201_CREATED)
def create_examination(
    exam_data: ExaminationCreate,
    current_user: User = Depends(require_role([UserRole.DOCTOR])),
    db: Session = Depends(get_db)
):
    patient = db.query(User).filter(
        User.id == exam_data.patient_id,
        User.role == UserRole.PATIENT
    ).first()

    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

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
    if current_user.role == UserRole.ADMIN:
        examinations = db.query(Examination).all()
    elif current_user.role == UserRole.DOCTOR:
        examinations = db.query(Examination).filter(Examination.doctor_id == current_user.id).all()
    else:  # PATIENT
        examinations = db.query(Examination).filter(Examination.patient_id == current_user.id).all()

    return examinations


@app.get("/examinations/{examination_id}", response_model=ExaminationResponse)
def get_examination(
    examination_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    exam = db.query(Examination).filter(Examination.id == examination_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Examination not found")

    if current_user.role == UserRole.PATIENT and exam.patient_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if current_user.role == UserRole.DOCTOR and exam.doctor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return exam


# ============================================================================
# MEDICAL FILE ENDPOINTS
# ============================================================================
@app.post("/examinations/{examination_id}/upload-file")
async def upload_medical_file(
    examination_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role([UserRole.DOCTOR])),
    db: Session = Depends(get_db)
):
    exam = db.query(Examination).filter(Examination.id == examination_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Examination not found")

    if exam.doctor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    file_extension = file.filename.split('.')[-1].lower()
    if file_extension == 'dcm':
        file_type = 'DICOM'
    elif file_extension == 'pdf':
        file_type = 'PDF'
    elif file_extension in ['jpg', 'jpeg', 'png']:
        file_type = 'JPG'
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

    content = await file.read()
    temp_file_path = os.path.join(UPLOAD_DIR, f"temp_{file.filename}")

    with open(temp_file_path, "wb") as f:
        f.write(content)

    object_name = f"patient_{exam.patient_id}/exam_{examination_id}/{file.filename}"

    try:
        from minio_storage import get_storage
        storage = get_storage()

        content_type_map = {
            'DICOM': 'application/dicom',
            'PDF': 'application/pdf',
            'JPG': 'image/jpeg'
        }
        content_type = content_type_map.get(file_type, 'application/octet-stream')

        file_url = storage.upload_bytes(content, object_name, content_type)

        if not file_url:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload file")

    except Exception as e:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Storage error: {str(e)}")

    file_metadata = {
        "original_filename": file.filename,
        "size_bytes": len(content)
    }

    if file_type == 'DICOM':
        try:
            from dicom_parser import parse_dicom_file
            dicom_metadata = parse_dicom_file(temp_file_path)
            if dicom_metadata:
                file_metadata.update(dicom_metadata)
        except Exception as e:
            print(f"Error parsing DICOM: {str(e)}")

    if os.path.exists(temp_file_path):
        os.remove(temp_file_path)

    new_file = MedicalFile(
        examination_id=examination_id,
        file_url=file_url,
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
        "file_url": file_url,
        "size_bytes": len(content)
    }


@app.get("/examinations/{examination_id}/files", response_model=List[MedicalFileResponse])
def get_examination_files(
    examination_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    exam = db.query(Examination).filter(Examination.id == examination_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Examination not found")

    if current_user.role == UserRole.PATIENT and exam.patient_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if current_user.role == UserRole.DOCTOR and exam.doctor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    files = db.query(MedicalFile).filter(MedicalFile.examination_id == examination_id).all()
    return files


# ============================================================================
# ML PREDICTION ENDPOINTS
# ============================================================================

@app.post("/examinations/{examination_id}/predict", response_model=RiskPredictionResponse)
async def create_risk_prediction(
    examination_id: int,
    prediction_data: PredictionRequest,
    current_user: User = Depends(require_role([UserRole.DOCTOR, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    # 1. Проверка существования обследования
    exam = db.query(Examination).filter(Examination.id == examination_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Examination not found")

    try:
        # 2. Запрос к твоему ML-сервису
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{PREDICTION_SERVICE_URL}/predict",
                json=prediction_data.dict()
            )
            # Если твой сервис вернет ошибку (400, 500), это вызовет исключение здесь
            response.raise_for_status()
            prediction_result = response.json()

        # --- ОТЛАДКА: Амир увидит это в логах докера ---
        print(f"DEBUG: ML Service raw response: {prediction_result}")

        # 3. Безопасное определение RiskLevel
        # Важно: Приводим к нижнему регистру и проверяем наличие в Enum
        raw_risk_val = str(prediction_result.get('risk_level', 'low')).lower()
        try:
            valid_risk_level = RiskLevel(raw_risk_val)
        except ValueError:
            print(f"WARNING: Unknown risk_level '{raw_risk_val}'. Falling back to 'low'")
            valid_risk_level = RiskLevel.low

        # 4. Создание записи в БД
        new_prediction = RiskPrediction(
            examination_id=examination_id,
            risk_score=float(prediction_result.get('risk_score', 0.0)),
            risk_level=valid_risk_level,
            ml_model_version=prediction_result.get('model_version', "v1.0"),
            # Оборачиваем всё в словарь, чтобы SQLAlchemy сожрала это как JSONB
            explanation={
                "recommendations": prediction_result.get('recommendations', []),
                "feature_impacts": prediction_result.get('feature_impacts', {}),
                "generated_at": datetime.utcnow().isoformat()
            }
        )

        db.add(new_prediction)
        db.commit()
        db.refresh(new_prediction)

        return new_prediction

    except httpx.HTTPStatusError as e:
        print(f"ERR: ML Service returned {e.response.status_code}: {e.response.text}")
        raise HTTPException(status_code=502, detail="ML Service Error")
    except Exception as e:
        # ПЕЧАТАЕМ ПОЛНУЮ ОШИБКУ В КОНСОЛЬ
        print("!!! CRITICAL ERROR IN CORE SERVICE !!!")
        import traceback
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=f"Database or Core Error: {str(e)}")


@app.get("/examinations/{examination_id}/predictions", response_model=List[RiskPredictionResponse])
def get_examination_predictions(
    examination_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    exam = db.query(Examination).filter(Examination.id == examination_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Examination not found")

    if current_user.role == UserRole.PATIENT and exam.patient_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if current_user.role == UserRole.DOCTOR and exam.doctor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    predictions = db.query(RiskPrediction).filter(
        RiskPrediction.examination_id == examination_id
    ).all()

    return predictions


@app.get("/predict-test")
async def get_prediction_test():
    test_data = {
        "age": 45,
        "sex": 1,
        "cholesterol": 200,
        "fbs": 0,
        "restecg": 0
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
    return {
        "total_users": db.query(User).count(),
        "admins": db.query(User).filter(User.role == UserRole.ADMIN).count(),
        "doctors": db.query(User).filter(User.role == UserRole.DOCTOR).count(),
        "patients": db.query(User).filter(User.role == UserRole.PATIENT).count(),
        "examinations": db.query(Examination).count(),
        "medical_files": db.query(MedicalFile).count(),
        "risk_predictions": db.query(RiskPrediction).count()
    }