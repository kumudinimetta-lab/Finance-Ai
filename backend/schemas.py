from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
from backend.models import CategoryEnum

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}

# Transaction schemas
class TransactionBase(BaseModel):
    amount: float
    description: str
    category: CategoryEnum
    date: Optional[datetime] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    user_id: int

    model_config = {"from_attributes": True}

# Chat schemas
class ChatMessageBase(BaseModel):
    message: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageResponse(ChatMessageBase):
    id: int
    user_id: int
    role: str
    timestamp: datetime

    model_config = {"from_attributes": True}
