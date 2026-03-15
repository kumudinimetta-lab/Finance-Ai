from typing import Dict, Any
from sqlalchemy.orm import Session

def simulate_scenario(db: Session, user_id: int, setup: Dict[str, Any]) -> Dict[str, Any]:
    try:
        monthly_savings = float(setup.get("monthly_savings", 0))
        months = int(setup.get("months", 12))
        annual_interest = float(setup.get("annual_interest_rate", 0.05))
        
        monthly_interest = annual_interest / 12
        future_value = 0.0
        
        for _ in range(months):
            future_value = (future_value + monthly_savings) * (1 + monthly_interest)
            
        return {
            "status": "success",
            "scenario": setup,
            "projected_savings": round(future_value, 2)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
