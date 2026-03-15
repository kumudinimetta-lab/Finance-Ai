from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from backend.database import get_db
from backend.models import User
from backend.schemas import ChatMessageCreate, ChatMessageResponse
from backend.auth import get_current_user
from backend.services.ai_engine import handle_chat_message
from backend.services.analyzer import generate_monthly_report
from backend.services.scenario import simulate_scenario

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/chat", response_model=ChatMessageResponse)
async def chat_with_ai(
    message: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await handle_chat_message(db, current_user, message.message)

@router.get("/report/monthly", response_model=Dict[str, Any])
def get_monthly_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return generate_monthly_report(db, current_user.id)

@router.post("/simulate")
def simulate_financial_scenario(
    request: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return simulate_scenario(db, current_user.id, request)
