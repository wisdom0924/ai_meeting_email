from fastapi import FastAPI

# FastAPI 앱 만들기 (우리의 새로운 서버 일꾼!)
app = FastAPI(
    title="AI 회의록 마법사 API",
    description="AI 회의록 서비스를 위한 백엔드(서버) 메뉴판입니다.",
    version="1.0.0"
)

# 누군가 서버에 처음 접속했을 때 보여줄 인사말
@app.get("/")
def read_root():
    return {"message": "환영합니다! AI 회의록 백엔드 서버가 아주 잘 돌아가고 있어요! 🎉"}
