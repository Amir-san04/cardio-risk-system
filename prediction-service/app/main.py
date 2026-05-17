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
# ==================== ECG IMAGE PREDICTION ====================
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import io
from fastapi import UploadFile, File

# Загрузка ECG модели
def load_ecg_model():
    m = models.efficientnet_b0(weights=None)
    m.classifier[1] = nn.Linear(m.classifier[1].in_features, 2)
    state = torch.load("models/ecg_model.pt", map_location="cpu")
    m.load_state_dict(state)
    m.eval()
    return m

ecg_model = load_ecg_model()
ECG_CLASSES = ["Abnormal", "Normal"]  # порядок как в ImageFolder

ecg_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

@app.post("/predict-ecg")
async def predict_ecg(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    tensor = ecg_transform(image).unsqueeze(0)

    with torch.no_grad():
        probs = torch.softmax(ecg_model(tensor), dim=1)[0]

    abnormal_prob = probs[0].item()  # индекс 0 = Abnormal
    normal_prob   = probs[1].item()

    if abnormal_prob < 0.3:
        risk_level = "low"
    elif abnormal_prob < 0.7:
        risk_level = "medium"
    else:
        risk_level = "high"

    recommendations = {
        "low":    ["ЭКГ в норме. Плановый осмотр через 1 год."],
        "medium": ["Выявлены изменения ЭКГ. Рекомендована консультация кардиолога.", "Рассмотрите Холтер-мониторинг."],
        "high":   ["Критические изменения ЭКГ. Срочная консультация кардиолога!", "Возможна госпитализация."]
    }

    return {
        "ecg_class":       ECG_CLASSES[probs.argmax().item()],
        "normal_prob":     round(normal_prob, 4),
        "abnormal_prob":   round(abnormal_prob, 4),
        "risk_score":      round(abnormal_prob, 4),
        "risk_level":      risk_level,
        "recommendations": recommendations[risk_level],
        "model_type":      "ECG-CNN-EfficientNetB0-v1"
    }
