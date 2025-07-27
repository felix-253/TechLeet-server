from pydantic import BaseModel
from typing import Optional, List

class SearchParams(BaseModel):
    keyword: Optional[List[str]] = None
    max_price: Optional[int] = None
    size: Optional[str] = None
    painting_id: Optional[str] = None
    limit: int = 10
    category: Optional[str] = None