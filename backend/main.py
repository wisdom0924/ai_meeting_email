from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from typing import List

from database import engine, Base, get_db
import models, schemas

# 서버가 켜질 때, models.py에 그려둔 설계도대로 MySQL 창고 안에 서랍(테이블)들을 만듭니다!
models.Base.metadata.create_all(bind=engine)

# FastAPI 앱 만들기
app = FastAPI(
    title="AI 회의록 마법사 API",
    description="AI 회의록 서비스를 위한 백엔드(서버) 메뉴판입니다.",
    version="1.0.0"
)

# 비밀번호를 안전하게 암호화해주는 도구
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@app.get("/")
def read_root():
    return {"message": "환영합니다! AI 회의록 백엔드 서버가 아주 잘 돌아가고 있어요! 🎉"}

# --- [회원가입 API] ---
@app.post("/api/signup", response_model=schemas.UserResponse)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="이미 가입된 이메일입니다.")
    
    hashed_password = pwd_context.hash(user.password)
    new_user = models.User(email=user.email, password_hash=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# --- [로그인 API] ---
@app.post("/api/login")
def login(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not pwd_context.verify(user.password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="이메일이나 비밀번호가 틀렸습니다.")
    return {"message": "로그인 성공!", "user_id": db_user.id, "email": db_user.email}

# --- [회의록 API] ---

# 1. 새 회의록 저장하기
@app.post("/api/users/{user_id}/meetings", response_model=schemas.MeetingResponse)
def create_meeting(user_id: int, meeting: schemas.MeetingCreate, db: Session = Depends(get_db)):
    # 회원이 진짜 있는지 확인
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="회원을 찾을 수 없습니다.")
    
    # 회의록 저장
    new_meeting = models.Meeting(
        user_id=user_id,
        title=meeting.title,
        audio_url=meeting.audio_url,
        transcript=meeting.transcript,
        summary=meeting.summary
    )
    db.add(new_meeting)
    db.commit()
    db.refresh(new_meeting)
    return new_meeting

# 2. 내 회의록 목록 보기
@app.get("/api/users/{user_id}/meetings", response_model=List[schemas.MeetingResponse])
def get_meetings(user_id: int, db: Session = Depends(get_db)):
    meetings = db.query(models.Meeting).filter(models.Meeting.user_id == user_id).all()
    return meetings

# --- [메모 API] ---

# 1. 회의 중에 메모 저장하기
@app.post("/api/memos", response_model=schemas.MemoResponse)
def create_memo(memo: schemas.MemoCreate, db: Session = Depends(get_db)):
    # 회의록이 진짜 있는지 확인
    db_meeting = db.query(models.Meeting).filter(models.Meeting.id == memo.meeting_id).first()
    if not db_meeting:
        raise HTTPException(status_code=404, detail="회의록을 찾을 수 없습니다.")
    
    # 메모 저장
    new_memo = models.Memo(meeting_id=memo.meeting_id, content=memo.content)
    db.add(new_memo)
    db.commit()
    db.refresh(new_memo)
    return new_memo

# 2. 특정 회의의 메모들 불러오기
@app.get("/api/meetings/{meeting_id}/memos", response_model=List[schemas.MemoResponse])
def get_memos(meeting_id: int, db: Session = Depends(get_db)):
    memos = db.query(models.Memo).filter(models.Memo.meeting_id == meeting_id).all()
    return memos

