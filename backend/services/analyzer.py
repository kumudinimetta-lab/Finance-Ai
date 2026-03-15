import pandas as pd
from sqlalchemy.orm import Session
from typing import Dict, Any
from backend.models import Transaction
from datetime import datetime

def generate_monthly_report(db: Session, user_id: int) -> Dict[str, Any]:
    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)
    
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.date >= start_of_month
    ).all()
    
    if not transactions:
        return {
            "total_spent": 0,
            "total_income": 0,
            "category_breakdown": {},
            "message": "No transactions found for the current month."
        }
        
    data = [{"amount": t.amount, "category": t.category.value, "date": t.date} for t in transactions]
    df = pd.DataFrame(data)
    
    income_df = df[df['category'] == 'salary']
    expense_df = df[df['category'] != 'salary']
    
    total_income = income_df['amount'].sum() if not income_df.empty else 0.0
    total_spent = expense_df['amount'].sum() if not expense_df.empty else 0.0
    
    category_breakdown = {}
    if not expense_df.empty:
        grouped = expense_df.groupby('category')['amount'].sum()
        category_breakdown = grouped.to_dict()
        
    return {
        "total_spent": float(total_spent),
        "total_income": float(total_income),
        "category_breakdown": category_breakdown,
        "month": now.strftime("%B %Y")
    }
