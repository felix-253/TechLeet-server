from app.workflow.nodes.work_flow import FlowGraph
from app.models.chat_request import ChatRequest
from fastapi import HTTPException


flow_graph = FlowGraph()

async def root():
    print(flow_graph.get_graph())
    return { "message": "Hello, World!" }

async def chat(request: ChatRequest):
    try:
        result = flow_graph.run(request)
        return { "data": { "result": result }, "statusCode": 200, "message": "Chat processed successfully" }
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
