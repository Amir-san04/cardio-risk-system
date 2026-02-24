import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import random

app = FastAPI(title="Cardio Risk Prediction Service")



class PredictionRequest(BaseModel):
    age: int
    sex: int
    cholesterol: int
    fbs: int
    restecg: int


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


    # 1️⃣ Превращаем вход в DataFrame
    df = pd.DataFrame([data.dict()])

    # 2️⃣ Получаем вероятность (класс = 1)
    probability = model.predict_proba(df)[0][1]

    # 3️⃣ Логика интерпретации риска
    if probability < 0.3:
        level = "low"
        recs = ["Maintain healthy lifestyle"]
    elif probability < 0.7:
        level = "medium"
        recs = ["Monitor cholesterol", "Increase activity"]
    else:
        level = "high"
        recs = ["Consult cardiologist immediately"]

    # 4️⃣ Ответ
    return PredictionResponse(
        risk_level=level,
        risk_score=round(float(probability), 2),
        recommendations=recs
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