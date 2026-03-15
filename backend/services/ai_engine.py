import os
from sqlalchemy.orm import Session
from langchain_anthropic import ChatAnthropic
from backend.models import User, ChatHistory, Transaction
from backend.schemas import ChatMessageResponse

# Ensure API key is set in .env
anthropic_api_key = os.getenv("ANTHROPIC_API_KEY", "")

def get_user_context(db: Session, user_id: int) -> str:
    transactions = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(Transaction.date.desc()).limit(50).all()
    if not transactions:
        return "The user has no recorded transactions."
    
    context = "Here are the user's recent transactions:\n"
    for t in transactions:
        context += f"- {t.date.strftime('%Y-%m-%d')}: {t.category.name.capitalize()} - ${t.amount} ({t.description})\n"
    return context

async def handle_chat_message(db: Session, current_user: User, message: str) -> ChatMessageResponse:
    # Save user message
    user_chat = ChatHistory(user_id=current_user.id, message=message, role="user")
    db.add(user_chat)
    db.commit()
    db.refresh(user_chat)
    
    # Build AI context
    user_context = get_user_context(db, current_user.id)
    
    prompt = f"""You are a helpful AI financial advisor.
    User's Data:
    {user_context}
    
    User's Question: {message}
    
    Provide helpful, concise financial advice based on their data.
    """
    
    try:
        if not anthropic_api_key:
            ai_response = "Error: ANTHROPIC_API_KEY is not configured."
        else:
            llm = ChatAnthropic(model="claude-3-haiku-20240307", api_key=anthropic_api_key, max_tokens=512)
            response = llm.invoke(prompt)
            ai_response = response.content
    except Exception as e:
        ai_response = f"I'm sorry, I encountered an error: {str(e)}"
    
    # Save AI response
    ai_chat = ChatHistory(user_id=current_user.id, message=ai_response, role="assistant")
    db.add(ai_chat)
    db.commit()
    db.refresh(ai_chat)
    
    return ChatMessageResponse(
        id=ai_chat.id,
        user_id=ai_chat.user_id,
        role=ai_chat.role,
        message=ai_chat.message,
        timestamp=ai_chat.timestamp
    )
