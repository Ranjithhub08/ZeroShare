FROM python:3.11-slim

WORKDIR /ml-service

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# Model weights directory (persisted via Docker volume)
RUN mkdir -p /ml-service/model

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
