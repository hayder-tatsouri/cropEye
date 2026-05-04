# mcp_client.py
import os
import json
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

MCP_SERVER_PATH = os.path.join(os.path.dirname(__file__), "server.py")

def _server_params():
    return StdioServerParameters(
        command="python",
        args=[MCP_SERVER_PATH],
    )

async def get_tools_for_anthropic():
    async with stdio_client(_server_params()) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools_response = await session.list_tools()
            return [
                {
                    "name": t.name,
                    "description": t.description,
                    "input_schema": t.inputSchema if hasattr(t, "inputSchema")
                                    else {"type": "object", "properties": {}}
                }
                for t in tools_response.tools
            ]

async def call_tool(tool_name: str, args: dict):
    async with stdio_client(_server_params()) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            print(f"Calling: {tool_name} | args: {args}")
            result = await session.call_tool(tool_name, args)
            print(f"Done: {tool_name}")
            content = result.content
            if isinstance(content, list):
                return "\n".join(
                    item.text if hasattr(item, "text") else str(item)
                    for item in content
                )
            return str(content)
