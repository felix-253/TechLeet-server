from pydantic import BaseModel

class ChatRequest(BaseModel):
    chat_id: str
    user_input: str
    user_id: str
