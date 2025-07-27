from app.models.chat_request import ChatRequest
from app.models.chat_response import ResponseModel
from app.services.chat_service import root, chat
from fastapi import APIRouter

chat_router = APIRouter()

@chat_router.get("/")
async def graph():
    return await root()

@chat_router.post("/chat")
async def chat_endpoint(chat_request: ChatRequest):
    chat_result = await chat(chat_request)
    return ResponseModel(
        data=chat_result["data"],
        statusCode=chat_result["statusCode"],
        message=chat_result["message"]
    )
