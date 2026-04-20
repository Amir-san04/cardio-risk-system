import os
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

# ==============================
# Пути и константы
# ==============================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "ml", "model.joblib")

# Полный список из 11 признаков (соответствует новому train.py)
FEATURES = [
    "age", "sex", "cp", "trestbps", "cholesterol", 
    "fbs", "restecg", "thalach", "oldpeak", "ca"
]

# ==============================
# Загрузка модели
# ==============================
try:
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Модель не найдена по пути: {MODEL_PATH}")
    
    model = joblib.load(MODEL_PATH)
    coefficients = model.named_steps["model"].coef_[0]
    print(f"✅ Модель успешно загружена. Признаков: {len(FEATURES)}")
except Exception as e:
    print(f"❌ Ошибка загрузки модели: {e}")
    raise RuntimeError(f"Не удалось загрузить модель: {e}")

# ==============================
# FastAPI приложение
# ==============================
app = FastAPI(title="Cardio Risk Prediction Service", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# Модели данных (Pydantic)
# ==============================
class PredictionRequest(BaseModel):
    age: int
    sex: int
    cp: int
    trestbps: int
    cholesterol: int
    fbs: int
    restecg: int
    thalach: int
    oldpeak: float
    ca: float

class FeatureImpact(BaseModel):
    feature: str
    value: float
    coefficient: float
    impact: float

class PredictionResponse(BaseModel):
    risk_level: str
    risk_score: float
    recommendations: List[str]
    feature_impacts: List[FeatureImpact]

# ==============================
# Эндпоинты
# ==============================
@app.get("/")
def read_root():
    return {
        "service": "Cardio Risk Prediction Service",
        "status": "running",
        "features_count": len(FEATURES),
        "features": FEATURES
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/predict", response_model=PredictionResponse)
def predict_risk(data: PredictionRequest):
    try:

        data_dict = data.dict()
        input_df = pd.DataFrame([data_dict])[FEATURES]
        probability = model.predict_proba(input_df)[0][1]
        # 1. Жестко фиксируем список признаков (как в train.py)
        FEATURES_LIST = [
            "age", "sex", "cp", "trestbps", "cholesterol", 
            "fbs", "restecg", "thalach", "oldpeak", "ca"
        ]

        # 2. Извлекаем значения СТРОГО в нужном порядке в виде списка
        # Это гарантирует, что порядок признаков не перепутается
        values = [
            data.age, data.sex, data.cp, data.trestbps, data.cholesterol,
            data.fbs, data.restecg, data.thalach, data.oldpeak, data.ca
        ]

        # 3. Создаем DataFrame, явно указывая значения и имена колонок
        # Это убирает ошибку "Feature names unseen at fit time"
        input_df = pd.DataFrame([values], columns=FEATURES_LIST)

        # 4. Выполняем предсказание через Pipeline
        # (Важно: убедитесь, что переменная 'model' загружена корректно)
        probability = model.predict_proba(input_df)[0][1]

        # --- Дальнейшая логика формирования ответа ---
        level = "low"
        if probability > 0.7: level = "high"
        elif probability > 0.35: level = "medium"

        # Формируем impacts для ответа
        impacts = []
        for i, feature in enumerate(FEATURES_LIST):
            val = float(values[i])
            coef = float(coefficients[i])
            impacts.append(FeatureImpact(
                feature=feature,
                value=val,
                coefficient=round(coef, 4),
                impact=round(val * coef, 4)
            ))

        return PredictionResponse(
            risk_level=level,
            risk_score=round(float(probability), 3),
            recommendations=["Консультация врача", "Соблюдение диеты"],
            feature_impacts=impacts
        )

    except Exception as e:
        # Подробный лог в консоль докера поможет понять, если проблема в другом
        print(f"!!! ОШИБКА МОДЕЛИ: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")

@app.post("/batch-predict")
def batch_predict(patients: List[PredictionRequest]):
    """Обработка списка пациентов одним запросом"""
    results = []
    for patient in patients:
        try:
            res = predict_risk(patient)
            results.append({"input": patient.dict(), "prediction": res.dict()})
        except Exception as e:
            results.append({"input": patient.dict(), "error": str(e)})
    return {"total": len(patients), "results": results}