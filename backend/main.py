from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from typing import List, Optional
import jwt
from datetime import datetime, timedelta
import os

from database import engine, Base, get_db
import models, schemas

import random

from sqlalchemy import text

# 서버가 켜질 때, models.py에 그려둔 설계도대로 MySQL 창고 안에 서랍(테이블)들을 만듭니다!
models.Base.metadata.create_all(bind=engine)

# (기존 테이블에 nickname 컬럼이 없다면 추가해주는 마법의 코드!)
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN nickname VARCHAR(50)"))
except Exception:
    pass # 이미 컬럼이 있으면 에러가 나므로 그냥 넘어갑니다.

# (기존 테이블에 is_active 컬럼이 없다면 추가해주는 마법의 코드!)
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT FALSE"))
except Exception:
    pass

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE boards ADD COLUMN is_private BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE boards ADD COLUMN password VARCHAR(255)"))
        conn.execute(text("ALTER TABLE boards ADD COLUMN tags VARCHAR(255)"))
except Exception:
    pass

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE meetings ADD COLUMN details TEXT"))
except Exception:
    pass

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def get_public_api_base_url() -> str:
    """이메일 인증 링크 등에 쓸 공개 API 주소 (.env의 NEXT_PUBLIC_API_URL 사용)."""
    base = (
        os.getenv("PUBLIC_API_URL")
        or os.getenv("NEXT_PUBLIC_API_URL")
        or "http://localhost:8000"
    )
    return base.rstrip("/")


def send_real_email(to_email: str, verify_link: str):
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    smtp_user = os.getenv("SMTP_EMAIL") # 구글 이메일 (.env 파일에 설정)
    smtp_password = os.getenv("SMTP_PASSWORD") # 구글 앱 비밀번호 (.env 파일에 설정)

    # .env 파일에 이메일 설정이 안 되어 있다면, 이전처럼 터미널에만 출력해줍니다!
    if not smtp_user or not smtp_password:
        print("\n" + "="*50)
        print("🚨 [알림] .env 파일에 SMTP_EMAIL 과 SMTP_PASSWORD 가 없어서 진짜 메일을 보낼 수 없습니다!")
        print(f"📧 [{to_email}] 님, 아래 링크를 복사해서 주소창에 붙여넣어 가입 인증을 완료해 주세요.")
        print(f"🔗 인증 링크: {verify_link}")
        print("="*50 + "\n")
        return

    # 진짜 이메일 보내기!
    msg = MIMEMultipart()
    msg['From'] = smtp_user
    msg['To'] = to_email
    msg['Subject'] = "[AI 회의록 마법사] 회원가입 이메일 인증"

    html = f"""
    <html>
        <body style="font-family: sans-serif; padding: 20px;">
            <h2>AI 회의록 마법사에 오신 것을 환영합니다! 🎉</h2>
            <p>아래 버튼을 눌러 이메일 인증을 완료하시면 가입이 끝납니다.</p>
            <a href="{verify_link}" style="display: inline-block; padding: 10px 20px; color: white; background-color: #111827; text-decoration: none; border-radius: 5px; font-weight: bold;">
                이메일 인증하기
            </a>
            <p style="margin-top: 20px; font-size: 12px; color: #888;">
                버튼이 작동하지 않으면 아래 링크를 주소창에 복사해 주세요.<br>
                {verify_link}
            </p>
        </body>
    </html>
    """
    msg.attach(MIMEText(html, 'html'))

    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()
        print(f"✅ [{to_email}] 로 진짜 인증 메일을 발송했습니다!")
    except Exception as e:
        print(f"❌ 메일 발송 에러: {e}")

# FastAPI 앱 만들기
app = FastAPI(
    title="AI 회의록 마법사 API",
    description="AI 회의록 서비스를 위한 백엔드(서버) 메뉴판입니다.",
    version="1.0.0"
)

# CORS 설정 (프론트엔드에서 백엔드로 요청을 보낼 수 있게 허락해주는 설정)
# allow_origins=["*"] 와 allow_credentials=True 를 같이 쓰면
# 브라우저가 응답을 거절할 수 있어서 credentials는 끕니다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프론트엔드 주소 허락!
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 비밀번호를 안전하게 암호화해주는 도구
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT (입장권) 설정
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key-for-ai-meeting") # 이 열쇠로 입장권을 만듭니다!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 입장권 유효기간 (24시간)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")
oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="/api/login", auto_error=False
)

# 입장권(토큰)을 만들어주는 함수
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# 입장권(토큰)을 검사해서 진짜 회원인지 확인해주는 함수 (경비원 역할)
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="입장권(토큰)이 유효하지 않습니다. 다시 로그인해 주세요.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db),
):
    """로그인하지 않아도 되는 API용 — 토큰이 없거나 만료되면 None"""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None:
            return None
    except jwt.PyJWTError:
        return None
    return db.query(models.User).filter(models.User.email == email).first()

@app.get("/")
def read_root():
    return {"message": "환영합니다! AI 회의록 백엔드 서버가 아주 잘 돌아가고 있어요! 🎉"}

# --- [이메일 인증 API] ---
from fastapi.responses import HTMLResponse

@app.get("/api/verify-email", response_class=HTMLResponse)
def verify_email(token: str, db: Session = Depends(get_db)):
    # 1. 창고에서 토큰으로 인증 정보 찾기
    verification = db.query(models.EmailVerification).filter(models.EmailVerification.code == token).first()
    
    if not verification:
        return """
        <html>
            <head><meta charset="utf-8"></head>
            <body style="text-align: center; padding: 50px; font-family: sans-serif;">
                <h1>인증 실패 ❌</h1>
                <p>유효하지 않거나 만료된 인증 링크입니다.</p>
            </body>
        </html>
        """

    # 3. 맞으면 "인증 완료" 도장 찍기
    verification.is_verified = True
    
    # 4. 사용자 계정도 "사용 가능(is_active=True)"으로 바꿔주기!
    db_user = db.query(models.User).filter(models.User.email == verification.email).first()
    if db_user:
        db_user.is_active = True
        
    db.commit()
    
    # 5. 인증 성공 화면 보여주기 (3초 뒤 자동 닫힘)
    return """
    <html>
        <head><meta charset="utf-8"></head>
        <body style="text-align: center; padding: 50px; font-family: sans-serif;">
            <h1 style="color: #4ade80;">이메일 인증 성공! ✅</h1>
            <p>이메일 인증이 완료되었습니다. 원래 화면으로 돌아가시면 로그인 화면으로 자동 전환되어 있을 거예요!</p>
            <p style="color: #888; font-size: 14px;">(이 창은 3초 뒤에 자동으로 닫힙니다)</p>
            <script>
                setTimeout(function() {
                    window.close();
                }, 3000);
            </script>
        </body>
    </html>
    """

# --- [인증 상태 확인 API (프론트엔드 자동 업데이트용)] ---
@app.get("/api/check-verification")
def check_verification(email: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if user and user.is_active:
        return {"is_verified": True}
    return {"is_verified": False}

# --- [회원가입 API] ---
@app.post("/api/signup")
def signup(user: schemas.UserSignUp, db: Session = Depends(get_db)):
    # 1. 이미 가입된 이메일인지 확인
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    
    # 이미 가입되어 있고, 인증까지 완료된 회원이면 거절!
    if db_user and db_user.is_active:
        raise HTTPException(status_code=400, detail="이미 가입된 이메일입니다. 로그인해 주세요.")

    # 비밀번호 암호화
    hashed_password = pwd_context.hash(user.password)

    if db_user and not db_user.is_active:
        # 가입은 했는데 아직 이메일 인증을 안 한 경우 -> 정보 업데이트
        db_user.nickname = user.nickname
        db_user.password_hash = hashed_password
    else:
        # 2. 아예 처음 가입하는 경우 -> 아직 인증 전이므로 is_active=False로 저장
        db_user = models.User(email=user.email, nickname=user.nickname, password_hash=hashed_password, is_active=False)
        db.add(db_user)
    
    # 3. 10자리 랜덤 인증 토큰 만들기
    import string
    import random
    token = ''.join(random.choices(string.ascii_letters + string.digits, k=10))

    # 4. 창고(DB)에 인증번호(토큰) 저장하기
    verification = db.query(models.EmailVerification).filter(models.EmailVerification.email == user.email).first()
    if verification:
        verification.code = token
        verification.is_verified = False # 다시 인증받아야 함
    else:
        verification = models.EmailVerification(email=user.email, code=token)
        db.add(verification)
        
    db.commit()

    # 5. 진짜 이메일 보내기! (또는 터미널 출력)
    verify_link = f"{get_public_api_base_url()}/api/verify-email?token={token}"
    send_real_email(user.email, verify_link)

    return {"message": "가입하신 이메일로 인증 메일을 보냈어요! 메일함을 확인해 주세요."}

# --- [로그인 API] ---
@app.post("/api/login")
def login(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not pwd_context.verify(user.password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="이메일이나 비밀번호가 틀렸습니다.")
    
    if not db_user.is_active:
        raise HTTPException(status_code=400, detail="이메일 인증이 아직 완료되지 않았습니다. 메일함을 확인해주세요!")
    
    # 로그인 성공 시 입장권(JWT 토큰) 발급!
    access_token = create_access_token(data={"sub": db_user.email})
    
    return {
        "message": "로그인 성공!", 
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": db_user.id, 
        "email": db_user.email,
        "nickname": db_user.nickname
    }


@app.get("/api/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    """쿠키/토큰만 있을 때 헤더에 닉네임을 다시 채우기 위한 내 정보 API"""
    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "nickname": current_user.nickname,
    }


# --- [회의록 API (인증 필요)] ---

# 1. 새 회의록 저장하기
@app.post("/api/users/{user_id}/meetings", response_model=schemas.MeetingResponse)
def create_meeting(user_id: int, meeting: schemas.MeetingCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 내 회의록만 만들 수 있도록 확인
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="다른 사람의 회의록을 만들 수 없습니다.")
    
    # 회의록 저장
    new_meeting = models.Meeting(
        user_id=user_id,
        title=meeting.title,
        audio_url=meeting.audio_url,
        transcript=meeting.transcript,
        summary=meeting.summary,
        details=meeting.details
    )
    db.add(new_meeting)
    db.commit()
    db.refresh(new_meeting)
    return new_meeting

# 2. 내 회의록 목록 보기
@app.get("/api/users/{user_id}/meetings", response_model=List[schemas.MeetingResponse])
def get_meetings(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 내 회의록만 볼 수 있도록 확인
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="다른 사람의 회의록을 볼 수 없습니다.")
        
    meetings = db.query(models.Meeting).filter(models.Meeting.user_id == user_id).all()
    return meetings

# 3. 내 회의록 삭제하기
@app.delete("/api/users/{user_id}/meetings/{meeting_id}")
def delete_meeting(user_id: int, meeting_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 내 회의록만 삭제할 수 있도록 확인
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="다른 사람의 회의록을 삭제할 수 없습니다.")
        
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id, models.Meeting.user_id == user_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="회의록을 찾을 수 없습니다.")
        
    try:
        # 연관된 메모 삭제
        db.query(models.Memo).filter(models.Memo.meeting_id == meeting_id).delete()
        
        # 연관된 게시판 글의 meeting_id를 NULL로 변경 (게시글은 유지)
        db.query(models.Board).filter(models.Board.meeting_id == meeting_id).update({"meeting_id": None})
        
        db.delete(meeting)
        db.commit()
        return {"message": "회의록이 삭제되었습니다."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"회의록 삭제 중 오류가 발생했습니다: {str(e)}")

# --- [메모 API (인증 필요)] ---

# 1. 회의 중에 메모 저장하기
@app.post("/api/memos", response_model=schemas.MemoResponse)
def create_memo(memo: schemas.MemoCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 회의록이 진짜 있는지, 그리고 내 회의록인지 확인
    db_meeting = db.query(models.Meeting).filter(models.Meeting.id == memo.meeting_id).first()
    if not db_meeting:
        raise HTTPException(status_code=404, detail="회의록을 찾을 수 없습니다.")
    if db_meeting.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="내 회의록에만 메모를 남길 수 있습니다.")
    
    # 메모 저장
    new_memo = models.Memo(meeting_id=memo.meeting_id, content=memo.content)
    db.add(new_memo)
    db.commit()
    db.refresh(new_memo)
    return new_memo

# 2. 특정 회의의 메모들 불러오기
@app.get("/api/meetings/{meeting_id}/memos", response_model=List[schemas.MemoResponse])
def get_memos(meeting_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 회의록이 진짜 있는지, 그리고 내 회의록인지 확인
    db_meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not db_meeting:
        raise HTTPException(status_code=404, detail="회의록을 찾을 수 없습니다.")
    if db_meeting.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="내 회의록의 메모만 볼 수 있습니다.")

    memos = db.query(models.Memo).filter(models.Memo.meeting_id == meeting_id).all()
    return memos


# --- [게시판 API (인증 필요)] ---

@app.post("/api/boards", response_model=schemas.BoardResponse)
def create_board(board: schemas.BoardCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 비밀글 설정 처리
    board_password = None
    if board.is_private and board.password:
        board_password = pwd_context.hash(board.password)

    new_board = models.Board(
        user_id=current_user.id,
        title=board.title,
        content=board.content,
        meeting_id=board.meeting_id,
        is_private=board.is_private,
        password=board_password,
        tags=board.tags
    )
    db.add(new_board)
    db.commit()
    db.refresh(new_board)
    
    # 응답에 닉네임 포함
    setattr(new_board, 'author_nickname', current_user.nickname)
    return new_board

@app.get("/api/boards", response_model=schemas.BoardListResponse)
def get_boards(page: int = 1, size: int = 10, keyword: Optional[str] = None, tag: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Board)
    
    # 검색 기능
    if keyword:
        query = query.filter(models.Board.title.contains(keyword) | models.Board.content.contains(keyword))
    if tag:
        query = query.filter(models.Board.tags.contains(tag))
        
    # 최신 글이 먼저 오도록 내림차순 정렬
    query = query.order_by(models.Board.created_at.desc())
    total = query.count()
    boards = query.offset((page - 1) * size).limit(size).all()
    
    for board in boards:
        setattr(board, 'author_nickname', board.user.nickname if board.user else None)
        comment_count = db.query(models.Comment).filter(models.Comment.board_id == board.id).count()
        setattr(board, 'comment_count', comment_count)
        
        # 목록에서는 비밀글의 내용을 숨김
        if board.is_private:
            board.content = "비밀글입니다."
    
    return {
        "items": boards,
        "total": total,
        "page": page,
        "size": size
    }

@app.get("/api/boards/{board_id}", response_model=schemas.BoardResponse)
def get_board(
    board_id: int,
    password: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_user),
):
    user_id = current_user.id if current_user else None

    board = db.query(models.Board).filter(models.Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    
    # 비밀글 권한 체크
    if board.is_private and board.user_id != user_id:
        if not password or not pwd_context.verify(password, board.password):
            raise HTTPException(status_code=403, detail="비밀번호가 일치하지 않습니다.")
            
    setattr(board, 'author_nickname', board.user.nickname if board.user else None)
    return board

@app.put("/api/boards/{board_id}", response_model=schemas.BoardResponse)
def update_board(board_id: int, board_update: schemas.BoardUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    board = db.query(models.Board).filter(models.Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    if board.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="본인이 작성한 글만 수정할 수 있습니다.")
    
    if board_update.title is not None:
        board.title = board_update.title
    if board_update.content is not None:
        board.content = board_update.content
    if board_update.meeting_id is not None:
        board.meeting_id = board_update.meeting_id
    if board_update.is_private is not None:
        board.is_private = board_update.is_private
    if board_update.password is not None:
        if board_update.password: # 새 비밀번호가 있으면 해시해서 저장
            board.password = pwd_context.hash(board_update.password)
        else:
            board.password = None
    if board_update.tags is not None:
        board.tags = board_update.tags
        
    db.commit()
    db.refresh(board)
    
    setattr(board, 'author_nickname', current_user.nickname)
    return board

@app.delete("/api/boards/{board_id}")
def delete_board(board_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    board = db.query(models.Board).filter(models.Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    if board.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="본인이 작성한 글만 삭제할 수 있습니다.")
        
    # 관련된 댓글들도 삭제해야 할 수 있지만, DB 외래키 설정에 따라 다름. 여기서는 단순 삭제.
    db.delete(board)
    db.commit()
    return {"message": "게시글이 삭제되었습니다."}


# --- [댓글 API (인증 필요)] ---

@app.post("/api/boards/{board_id}/comments", response_model=schemas.CommentResponse)
def create_comment(board_id: int, comment: schemas.CommentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    board = db.query(models.Board).filter(models.Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
        
    new_comment = models.Comment(
        board_id=board_id,
        user_id=current_user.id,
        content=comment.content
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    setattr(new_comment, 'author_nickname', current_user.nickname)
    return new_comment

@app.get("/api/boards/{board_id}/comments", response_model=List[schemas.CommentResponse])
def get_comments(board_id: int, db: Session = Depends(get_db)):
    comments = db.query(models.Comment).filter(models.Comment.board_id == board_id).order_by(models.Comment.created_at.asc()).all()
    for comment in comments:
        setattr(comment, 'author_nickname', comment.user.nickname if comment.user else None)
    return comments

@app.delete("/api/comments/{comment_id}")
def delete_comment(comment_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다.")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="본인이 작성한 댓글만 삭제할 수 있습니다.")
        
    db.delete(comment)
    db.commit()
    return {"message": "댓글이 삭제되었습니다."}

@app.put("/api/comments/{comment_id}", response_model=schemas.CommentResponse)
def update_comment(comment_id: int, comment_update: schemas.CommentUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다.")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="본인이 작성한 댓글만 수정할 수 있습니다.")
        
    comment.content = comment_update.content
    db.commit()
    db.refresh(comment)
    
    setattr(comment, 'author_nickname', current_user.nickname)
    return comment


# --- [AI 프롬프트 API (인증 필요)] ---

DEFAULT_SUMMARY_PROMPT = (
    "회의 내용을 500자 내외로 자연스럽게 요약한 줄글 텍스트. "
    "(중요한 논의 사항, 결정된 사항, 액션 아이템 중심)"
)
DEFAULT_DETAILS_PROMPT = (
    "회의의 전체적인 흐름과 안건별 세부 논의 사항을 상세하게 정리한 텍스트."
)


def verify_prompt_client_key(client_key: str, current_user: models.User) -> None:
    if str(current_user.id) != str(client_key):
        raise HTTPException(
            status_code=403,
            detail="client_key가 로그인 사용자와 일치하지 않습니다.",
        )


def prompt_to_response(row: models.Prompt) -> schemas.PromptResponse:
    updated = row.updated_at or row.created_at
    return schemas.PromptResponse(
        id=str(row.id),
        created_at=row.created_at,
        updated_at=updated,
        name=row.name,
        summary_prompt=row.summary_prompt,
        details_prompt=row.details_prompt,
        client_key=str(row.user_id),
        source=row.source or "user",
    )


def ensure_seed_prompt(db: Session, user_id: int) -> models.Prompt:
    seed = (
        db.query(models.Prompt)
        .filter(models.Prompt.user_id == user_id, models.Prompt.source == "seed")
        .first()
    )
    if seed:
        return seed
    seed = models.Prompt(
        user_id=user_id,
        name="기본 프롬프트",
        summary_prompt=DEFAULT_SUMMARY_PROMPT,
        details_prompt=DEFAULT_DETAILS_PROMPT,
        source="seed",
    )
    db.add(seed)
    db.commit()
    db.refresh(seed)
    return seed


@app.get("/api/prompts", response_model=schemas.PromptListResponse)
def list_prompts(
    client_key: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    verify_prompt_client_key(client_key, current_user)
    ensure_seed_prompt(db, current_user.id)
    rows = (
        db.query(models.Prompt)
        .filter(models.Prompt.user_id == current_user.id)
        .order_by(models.Prompt.created_at.desc())
        .all()
    )
    return schemas.PromptListResponse(prompts=[prompt_to_response(r) for r in rows])


@app.post("/api/prompts", response_model=dict)
def create_prompt(
    body: schemas.PromptCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    verify_prompt_client_key(body.client_key, current_user)
    source = body.source if body.source in ("seed", "user", "recording_end") else "user"
    if source == "seed":
        source = "user"
    row = models.Prompt(
        user_id=current_user.id,
        name=body.name.strip() or "이름 없음",
        summary_prompt=body.summary_prompt,
        details_prompt=body.details_prompt,
        source=source,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"prompt": prompt_to_response(row)}


@app.patch("/api/prompts/{prompt_id}", response_model=dict)
def update_prompt(
    prompt_id: int,
    body: schemas.PromptUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    verify_prompt_client_key(body.client_key, current_user)
    row = (
        db.query(models.Prompt)
        .filter(models.Prompt.id == prompt_id, models.Prompt.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="프롬프트를 찾을 수 없습니다.")
    if body.name is not None:
        row.name = body.name.strip() or row.name
    if body.summary_prompt is not None:
        row.summary_prompt = body.summary_prompt
    if body.details_prompt is not None:
        row.details_prompt = body.details_prompt
    db.commit()
    db.refresh(row)
    return {"prompt": prompt_to_response(row)}


@app.delete("/api/prompts/{prompt_id}")
def delete_prompt(
    prompt_id: int,
    client_key: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    verify_prompt_client_key(client_key, current_user)
    row = (
        db.query(models.Prompt)
        .filter(models.Prompt.id == prompt_id, models.Prompt.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="프롬프트를 찾을 수 없습니다.")
    if row.source == "seed":
        raise HTTPException(status_code=400, detail="기본 프롬프트는 삭제할 수 없습니다.")
    db.delete(row)
    db.commit()
    return {"ok": True}


