# backend.py
import os
import json
import anthropic
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv
from mcp_client import get_tools_for_anthropic, call_tool

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change to your frontend URL in production
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are a drone assistant for CropEye, an agricultural drone platform.
You can control a drone via tools over SSH to a Raspberry Pi.
Available tools:
- test_connection: Test SSH connection to the drone
- motor_test: Run motor test on all motors one by one (always confirm with user first)
- start_telemetry_server: Start the telemetry server on the drone

You also assist with crop health questions, disease detection, and drone operations.
Be concise, helpful, and always confirm before running motor tests."""

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

@app.post("/api/chat")
async def chat(request: ChatRequest):
    tools = await get_tools_for_anthropic()

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        tools=tools,
        messages=messages,
    )

    # Agentic loop — keep going while Claude wants to use tools
    while response.stop_reason == "tool_use":
        tool_uses = [b for b in response.content if b.type == "tool_use"]
        tool_results = []

        for tool_use in tool_uses:
            print(f"Tool requested: {tool_use.name}")
            result_text = await call_tool(tool_use.name, tool_use.input)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_use.id,
                "content": result_text,
            })

        # Add Claude's response + tool results to history
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

        # Call Claude again with tool results
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=tools,
            messages=messages,
        )

    # Extract final text response
    final_text = ""
    for block in response.content:
        if hasattr(block, "text"):
            final_text += block.text

    return {"reply": final_text}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
