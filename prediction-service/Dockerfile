FROM python:3.10-slim

WORKDIR /app

# Копируем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код сервиса
COPY . .

# Запускаем на порту 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]