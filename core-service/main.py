from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import httpx

# Импортируем наши модели
from models import Base, User, UserRole

# Получаем URL базы данных из переменных окружения
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/cardio_db")

# Настраиваем подключение к SQLAlchemy
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Создаем таблицы в базе данных (если их еще нет)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Cardio Risk Core Service")

# Dependency для получения сессии базы данных
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Cardio Risk Core Service is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "connected"}

# Пример эндпоинта для проверки ролей (тестовый)
@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    user_count = db.query(User).count()
    return {"users_in_db": user_count}

# URL сервиса Алидара внутри сети Docker
PREDICTION_SERVICE_URL = "http://prediction-service:8001/predict"

@app.get("/get-prediction-test")
async def get_prediction():
    # Имитируем данные пациента
    test_data = {"age": 45, "cholesterol": 200}
    
    async with httpx.AsyncClient() as client:
        # Core сервис отправляет запрос в Prediction сервис
        response = await client.post(PREDICTION_SERVICE_URL, json=test_data)
        prediction_result = response.json()
        
    return {
        "status": "Core service received result from Prediction service",
        "data_from_alidar": prediction_result
    }