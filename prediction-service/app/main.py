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
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # → .../prediction-service/app

# Модель лежит в prediction-service/ml/model.joblib
MODEL_PATH = os.path.join(BASE_DIR, "..", "ml", "model.joblib")

FEATURES = ["age", "sex", "cholesterol", "fbs", "restecg"]


# ==============================
# Загрузка модели
# ==============================
try:
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Модель не найдена по пути: {MODEL_PATH}")
    
    model = joblib.load(MODEL_PATH)
    coefficients = model.named_steps["model"].coef_[0]
    print(f"✅ Модель успешно загружена из: {MODEL_PATH}")
except Exception as e:
    print(f"❌ Ошибка загрузки модели: {e}")
    raise RuntimeError(f"Не удалось загрузить модель. Проверьте путь:\n{MODEL_PATH}")


# ==============================
# FastAPI приложение
# ==============================
app = FastAPI(
    title="Cardio Risk Prediction Service",
    description="Сервис предсказания риска сердечно-сосудистых заболеваний",
    version="1.0.0"
)


# ==============================
# CORS — обязательно для Codespaces и фронтенда
# ==============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",                                      # для разработки — можно временно
        "https://*.github.dev",
        "https://*.app.github.dev",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# ==============================
# Модели запроса и ответа
# ==============================
class PredictionRequest(BaseModel):
    age: int
    sex: int
    cholesterol: int
    fbs: int
    restecg: int


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
        "version": "1.0.0",
        "features_used": FEATURES
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/predict", response_model=PredictionResponse)
def predict_risk(data: PredictionRequest):
    try:
        # Преобразуем входные данные в DataFrame
        input_df = pd.DataFrame([data.dict()])

        # Проверяем наличие всех нужных колонок
        missing = set(FEATURES) - set(input_df.columns)
        if missing:
            raise HTTPException(status_code=400, detail=f"Отсутствуют признаки: {missing}")

        # Предсказание вероятности
        probability = model.predict_proba(input_df)[0][1]

        # Определение уровня риска и рекомендаций
        if probability < 0.3:
            level = "low"
            recs = ["Поддерживайте здоровый образ жизни", "Регулярно проверяйте давление и холестерин"]
        elif probability < 0.7:
            level = "medium"
            recs = [
                "Контролируйте уровень холестерина",
                "Увеличьте физическую активность",
                "Сократите потребление соли и жирной пищи"
            ]
        else:
            level = "high"
            recs = [
                "Срочно обратитесь к кардиологу",
                "Пройдите полное обследование",
                "Возможно потребуется медикаментозная терапия"
            ]

        # Расчёт влияния признаков
        feature_impacts = []
        for i, feature in enumerate(FEATURES):
            value = float(input_df.iloc[0][feature])
            coef = float(coefficients[i])
            impact = value * coef

            feature_impacts.append(
                FeatureImpact(
                    feature=feature,
                    value=value,
                    coefficient=coef,
                    impact=impact
                )
            )

        return PredictionResponse(
            risk_level=level,
            risk_score=round(float(probability), 3),
            recommendations=recs,
            feature_impacts=feature_impacts
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка предсказания: {str(e)}")


@app.post("/batch-predict")
def batch_predict(patients: List[PredictionRequest]):
    results = []
    for patient in patients:
        try:
            prediction = predict_risk(patient)
            results.append({
                "input": patient.dict(),
                "prediction": prediction.dict()
            })
        except Exception as e:
            results.append({
                "input": patient.dict(),
                "error": str(e)
            })

    return {
        "total_patients": len(patients),
        "predictions": results
    }


# Для запуска: uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload