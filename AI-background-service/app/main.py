from fastapi import FastAPI
from dotenv import load_dotenv
import os
from app.api.chat import chat_router
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Climbing Rose Chatbot API",
    description="API for climbing rose chatbot using LangChain and Gemini AI",
    version="1.0.0",
    docs_url="/docs",           # <== Đổi URL Swagger UI
    redoc_url=None,                             # (tuỳ chọn) tắt Redoc nếu không dùng
    openapi_url="/openapi.json", # <== Đổi URL OpenAPI schema,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Hoặc ghi cụ thể domain, ví dụ ["http://localhost:1210"]
    allow_credentials=True,
    allow_methods=["*"],   # Cho phép mọi method
    allow_headers=["*"],   # Cho phép mọi header
)


@app.on_event("startup")
async def start_up_event():
    # await register_to_eureka()
    print("Starting up the application...")


app.include_router(chat_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=1210, reload=True) 

# uvicorn app.main:app --reload --port 1210