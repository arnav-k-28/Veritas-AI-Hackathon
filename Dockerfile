FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY index.html ./
COPY css ./css
COPY js ./js
COPY data ./data
COPY backend ./backend

ENV PYTHONUNBUFFERED=1
ENV NOVA_HOST=0.0.0.0
EXPOSE 8787

CMD ["python", "backend/translator_server.py"]
