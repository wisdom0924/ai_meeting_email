# 백엔드(FastAPI) 포장 설명서
FROM python:3.9-slim

# 작업할 폴더 만들기
WORKDIR /app

# 필요한 도구 목록 복사하고 설치하기
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 나머지 코드 모두 복사하기
COPY . .

# 서버 실행하기
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
