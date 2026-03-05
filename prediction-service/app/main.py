import pandas as pd
import joblib

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List


# ==============================
# Загрузка модели
# ==============================

model = joblib.load("ml/model.joblib")

features = ["age", "sex", "cholesterol", "fbs", "restecg"]
coefficients = model.named_steps["model"].coef_[0]


# ==============================
# FastAPI
# ==============================

app = FastAPI(title="Cardio Risk Prediction Service")


# ==============================
# Request модель
# ==============================

class PredictionRequest(BaseModel):
    age: int
    sex: int
    cholesterol: int
    fbs: int
    restecg: int


# ==============================
# Feature impact модель
# ==============================

class FeatureImpact(BaseModel):
    feature: str
    value: float
    coefficient: float
    impact: float


# ==============================
# Response модель
# ==============================

class PredictionResponse(BaseModel):
    risk_level: str
    risk_score: float
    recommendations: List[str]
    feature_impacts: List[FeatureImpact]


# ==============================
# Root endpoint
# ==============================

@app.get("/")
def read_root():
    return {
        "service": "Cardio Risk Prediction Service",
        "status": "running",
        "version": "1.0.0"
    }


# ==============================
# Health check
# ==============================

@app.get("/health")
def health_check():
    return {"status": "healthy"}


# ==============================
# Predict endpoint
# ==============================

@app.post("/predict", response_model=PredictionResponse)
def predict_risk(data: PredictionRequest):

    # превращаем входные данные в DataFrame
    df = pd.DataFrame([data.dict()])

    # вероятность заболевания
    probability = model.predict_proba(df)[0][1]

    # интерпретация риска
    if probability < 0.3:
        level = "low"
        recs = ["Maintain healthy lifestyle"]
    elif probability < 0.7:
        level = "medium"
        recs = [
            "Monitor cholesterol levels",
            "Increase physical activity"
        ]
    else:
        level = "high"
        recs = [
            "Consult cardiologist immediately"
        ]

    # ==============================
    # расчет влияния признаков
    # ==============================

    feature_impacts = []

    for i, feature in enumerate(features):

        value = df.iloc[0][feature]
        coef = coefficients[i]

        impact = value * coef

        feature_impacts.append(
            FeatureImpact(
                feature=feature,
                value=float(value),
                coefficient=float(coef),
                impact=float(impact)
            )
        )

    # ==============================
    # ответ
    # ==============================

    return PredictionResponse(
        risk_level=level,
        risk_score=round(float(probability), 2),
        recommendations=recs,
        feature_impacts=feature_impacts
    )


# ==============================
# Batch predict
# ==============================

@app.post("/batch-predict")
def batch_predict(patients: List[PredictionRequest]):

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