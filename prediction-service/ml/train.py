import pandas as pd
import joblib
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# 1. Загрузка данных
df = pd.read_csv("data/heart.csv")

# 2. Предобработка и очистка
# Переименовываем колонки под наш API и стандарт
df = df.rename(columns={"chol": "cholesterol", "num": "target"})

# Заменяем строковые пропуски (если есть) на NaN и заполняем их медианой
df = df.replace('?', np.nan)
df = df.apply(pd.to_numeric, errors='coerce')
df = df.fillna(df.median())

# 3. Выбор признаков (Золотой стандарт кардиологии + твои фичи)
# Мы берем те, что дают максимальный вклад в предсказание
features = [
    "age", 
    "sex", 
    "cp",            # Тип боли в груди (1-4)
    "trestbps",      # Артериальное давление
    "cholesterol",   # Холестерин
    "fbs",           # Сахар натощак
    "restecg",       # ЭКГ в покое
    "thalach",       # Макс. пульс
    "oldpeak",       # Депрессия ST
    "ca",            # Количество крупных сосудов
]

X = df[features]
y = df["target"]

# Если в target значения > 1 (стадии болезни), превращаем в бинарную классификацию (0 - здоров, 1 - болен)
y = (y > 0).astype(int)

# 4. Разделение данных
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# 5. Создание Pipeline с балансировкой весов
# class_weight='balanced' — это то, что поднимет процент риска с 1% до реальных значений
pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("model", LogisticRegression(
        max_iter=1000, 
        class_weight='balanced', 
        C=0.5,           # Небольшая регуляризация для стабильности
        random_state=42
    ))
])

# 6. Обучение
print(f"🚀 Начинаю обучение на {len(features)} признаках...")
pipeline.fit(X_train, y_train)

# 7. Оценка качества
y_pred = pipeline.predict(X_test)
acc = accuracy_score(y_test, y_pred)

print("-" * 30)
print(f"✅ Точность модели (Accuracy): {acc:.2f}")
print("\n📊 Отчет по классификации:")
print(classification_report(y_test, y_pred))

# 8. Анализ важности признаков (Feature Importance)
model = pipeline.named_steps["model"]
importance = pd.DataFrame({
    "Feature": features,
    "Coefficient": model.coef_[0]
})
importance["Impact"] = importance["Coefficient"].apply(lambda x: "↑ Повышает риск" if x > 0 else "↓ Снижает риск")
importance["Absolute_Importance"] = importance["Coefficient"].abs()

print("\n📈 Влияние факторов на результат:")
print(importance.sort_values(by="Absolute_Importance", ascending=False)[["Feature", "Impact", "Coefficient"]])

# 9. Сохранение модели
joblib.dump(pipeline, "model.joblib")
print("-" * 30)
print("💾 Файл model.joblib успешно обновлен!")