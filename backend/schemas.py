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

