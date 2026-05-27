from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List

# --- [이메일 인증 관련 양식] ---
class SendCodeRequest(BaseModel):
    email: EmailStr

class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str

# --- [회원 관련 양식] ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="비밀번호는 최소 6자 이상이어야 합니다.")

class UserSignUp(UserCreate):
    nickname: str = Field(..., min_length=2, description="닉네임은 최소 2자 이상이어야 합니다.")

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    nickname: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- [회의록 관련 양식] ---
class MeetingCreate(BaseModel):
    title: str
    audio_url: Optional[str] = None
    transcript: Optional[str] = None
    summary: Optional[str] = None

class MeetingResponse(BaseModel):
    id: int
    user_id: int
    title: str
    audio_url: Optional[str]
    transcript: Optional[str]
    summary: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# --- [메모 관련 양식] ---
class MemoCreate(BaseModel):
    meeting_id: int
    content: str

class MemoResponse(BaseModel):
    id: int
    meeting_id: int
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- [게시판 관련 양식] ---
class BoardCreate(BaseModel):
    title: str
    content: str
    meeting_id: Optional[int] = None

class BoardUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    meeting_id: Optional[int] = None

class BoardResponse(BaseModel):
    id: int
    user_id: int
    author_nickname: Optional[str] = None
    title: str
    content: str
    meeting_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    comment_count: int = 0

    class Config:
        from_attributes = True

class BoardListResponse(BaseModel):
    items: List[BoardResponse]
    total: int
    page: int
    size: int

# --- [댓글 관련 양식] ---
class CommentCreate(BaseModel):
    content: str

class CommentUpdate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    id: int
    board_id: int
    user_id: int
    author_nickname: Optional[str] = None
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

