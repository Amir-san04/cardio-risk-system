# Cardio Risk System

## Milestone 1: Frontend + ML Prediction Service Integration

**Сделано:**
- React + Vite + Tailwind CSS фронтенд
- Компоненты: PatientsTable, RiskResultCard
- Страницы: Dashboard, RiskAssessment
- Сервис api.js с функцией predictRisk (axios)
- FastAPI prediction-service с /predict, /health, /batch-predict
- Загрузка модели (joblib), расчёт feature impacts
- Решены проблемы: CORS, dynamic baseURL для GitHub Codespaces, BASE_URL ReferenceError
- End-to-end: форма ввода → запрос к ML → отображение риска и рекомендаций

**Как запустить локально / в Codespaces:**
- Фронтенд: `cd frontend && npm install && npm run dev`
- Prediction-service: `cd prediction-service && source .venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload`