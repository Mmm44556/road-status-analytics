# FastAPI 後端映像。context 是 repo 根目錄（見 docker-compose.yml），
# 這樣 /app 底下才會有 server/ 這個可被 `uvicorn server.main:app` 匯入的套件。
FROM python:3.13-slim

WORKDIR /app

COPY server/requirements.txt server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

COPY server/ server/

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]
