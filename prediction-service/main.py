from fastapi import FastAPI
import random

app = FastAPI(title="Cardio Risk Prediction Service")

@app.get("/")
def home():
    return {"message": "Prediction Service is online"}

@app.post("/predict")
def predict(data: dict):
    # Здесь Алидар потом заменит это на реальную модель
    risk_score = random.uniform(0.1, 0.9)
    return {
        "risk_score": round(risk_score, 2),
        "recommendation": "Consult a doctor" if risk_score > 0.5 else "Keep healthy lifestyle"
    }