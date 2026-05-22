from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# --- [회원 관련 양식] ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
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

