from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import random

app = FastAPI(title="Cardio Risk Prediction Service")


class PredictionRequest(BaseModel):
    """Схема для запроса предсказания"""
    age: int
    cholesterol: int
    # Добавь другие параметры для твоей ML модели


class PredictionResponse(BaseModel):
    """Схема для ответа с предсказанием"""
    risk_level: str
    risk_score: float
    recommendations: list[str]


@app.get("/")
def read_root():
    """Корневой endpoint"""
    return {
        "service": "Cardio Risk Prediction Service",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    """Проверка здоровья сервиса"""
    return {"status": "healthy"}


@app.post("/predict", response_model=PredictionResponse)
def predict_risk(data: PredictionRequest):
    """
    Предсказание кардиориска
    
    Здесь Алидар должен вставить свою ML модель
    Сейчас это заглушка с рандомными значениями
    """
    
    # ========================================
    # ВРЕМЕННАЯ ЗАГЛУШКА - ЗАМЕНИ НА СВОЮ МОДЕЛЬ!
    # ========================================
    
    # Простая логика для демо
    risk_score = (data.age / 100) + (data.cholesterol / 300)
    risk_score = min(risk_score, 1.0)  # Ограничиваем до 1.0
    
    if risk_score < 0.3:
        risk_level = "low"
        recommendations = [
            "Maintain healthy lifestyle",
            "Regular checkups recommended"
        ]
    elif risk_score < 0.7:
        risk_level = "medium"
        recommendations = [
            "Monitor cholesterol levels",
            "Increase physical activity",
            "Consider dietary changes"
        ]
    else:
        risk_level = "high"
        recommendations = [
            "Consult cardiologist immediately",
            "Strict diet control required",
            "Regular medication may be needed"
        ]
    
    return PredictionResponse(
        risk_level=risk_level,
        risk_score=round(risk_score, 2),
        recommendations=recommendations
    )


@app.post("/batch-predict")
def batch_predict(patients: list[PredictionRequest]):
    """
    Пакетное предсказание для нескольких пациентов
    """
    results = []
    for patient in patients:
        prediction = predict_risk(patient)
        results.append({
            "input": patient.dict(),
            "prediction": prediction.dict()
        })
    
    return {
        "total_patients": len(patients),
        "predictions": results
    }