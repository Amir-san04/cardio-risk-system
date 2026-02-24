import pandas as pd
import joblib

from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split


# 1. Load dataset
df = pd.read_csv("data/heart.csv")

# 2. Rename column for API consistency
df = df.rename(columns={"chol": "cholesterol"})
df.rename(columns={"num": "target"}, inplace=True)

# 3. Select features
features = ["age", "sex", "cholesterol", "fbs", "restecg"]
X = df[features]
y = df["target"]

# 4. Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 5. Pipeline
pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("model", LogisticRegression(max_iter=1000))
])

# 6. Train
pipeline.fit(X_train, y_train)

# 7. Save model
joblib.dump(pipeline, "model.joblib")

print("✅ Model trained with features:", features)