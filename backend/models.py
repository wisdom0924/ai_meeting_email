from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

# 1. 회원 정보 설계도
class User(Base):
    __tablename__ = "users" # 창고 안의 'users'라는 이름의 표(테이블)
    
    id = Column(Integer, primary_key=True, index=True) # 회원 번호 (1, 2, 3...)
    email = Column(String(255), unique=True, index=True) # 이메일 주소
    nickname = Column(String(50), nullable=True) # 닉네임 (새로 추가!)
    is_active = Column(Boolean, default=False) # 가입 승인 여부 (이메일 인증 전에는 False)
    password_hash = Column(String(255)) # 암호화된 비밀번호
    created_at = Column(DateTime(timezone=True), server_default=func.now()) # 가입한 시간

# 2. 회의록 정보 설계도
class Meeting(Base):
    __tablename__ = "meetings" # 창고 안의 'meetings'라는 이름의 표
    
    id = Column(Integer, primary_key=True, index=True) # 회의록 번호
    user_id = Column(Integer, ForeignKey("users.id")) # 이 회의록의 주인(회원 번호)
    title = Column(String(255)) # 회의 제목
    audio_url = Column(String(255), nullable=True) # 녹음 파일이 저장된 주소
    transcript = Column(Text, nullable=True) # 전체 대화 내용 (글자)
    summary = Column(Text, nullable=True) # AI가 요약한 내용
    details = Column(Text, nullable=True) # 상세 회의록
    created_at = Column(DateTime(timezone=True), server_default=func.now()) # 회의록 만든 시간

# 3. 메모 정보 설계도
class Memo(Base):
    __tablename__ = "memos" # 창고 안의 'memos'라는 이름의 표
    
    id = Column(Integer, primary_key=True, index=True) # 메모 번호
    meeting_id = Column(Integer, ForeignKey("meetings.id")) # 어떤 회의의 메모인지(회의록 번호)
    content = Column(Text) # 메모 내용
    created_at = Column(DateTime(timezone=True), server_default=func.now()) # 메모 적은 시간

# 4. 이메일 인증 설계도 (새로 추가!)
class EmailVerification(Base):
    __tablename__ = "email_verifications" # 창고 안의 'email_verifications'라는 이름의 표
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True) # 인증할 이메일
    code = Column(String(10)) # 6자리 인증번호
    is_verified = Column(Boolean, default=False) # 인증 성공했는지 여부 (처음엔 False)
    created_at = Column(DateTime(timezone=True), server_default=func.now()) # 인증번호 만든 시간

# 5. 게시판 정보 설계도 (새로 추가!)
class Board(Base):
    __tablename__ = "boards"
    
    id = Column(Integer, primary_key=True, index=True) # 게시글 번호
    user_id = Column(Integer, ForeignKey("users.id")) # 작성자 번호
    title = Column(String(255)) # 게시글 제목
    content = Column(Text) # 게시글 내용
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=True) # (선택) 첨부된 회의록 번호
    is_private = Column(Boolean, default=False) # 비밀글 여부 (새로 추가!)
    password = Column(String(255), nullable=True) # 비밀글 비밀번호 (새로 추가!)
    tags = Column(String(255), nullable=True) # 태그 (쉼표로 구분, 새로 추가!)
    created_at = Column(DateTime(timezone=True), server_default=func.now()) # 작성 시간
    updated_at = Column(DateTime(timezone=True), onupdate=func.now()) # 수정 시간

    user = relationship("User") # 사용자 정보와 연결

# 6. 댓글 정보 설계도 (새로 추가!)
class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True) # 댓글 번호
    board_id = Column(Integer, ForeignKey("boards.id")) # 어느 게시글의 댓글인지
    user_id = Column(Integer, ForeignKey("users.id")) # 작성자 번호
    content = Column(Text) # 댓글 내용
    created_at = Column(DateTime(timezone=True), server_default=func.now()) # 작성 시간
    updated_at = Column(DateTime(timezone=True), onupdate=func.now()) # 수정 시간

    user = relationship("User") # 사용자 정보와 연결

# 7. AI 프롬프트 설정 (사용자별 요약·상세 지시문)
class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    name = Column(String(255))
    summary_prompt = Column(Text)
    details_prompt = Column(Text)
    source = Column(String(20), default="user")  # seed | user | recording_end
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")
