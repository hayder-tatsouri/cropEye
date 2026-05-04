# server.py

from mcp.server.fastmcp import FastMCP
from ssh_client import run_script
from config import SCRIPTS

# Create MCP server
mcp = FastMCP("drone")

'''@mcp.tool()
def get_status() -> str:
    """Get current drone telemetry - altitude, speed, attitude, GPS, battery"""
    return run_script(SCRIPTS["status"])
'''
@mcp.tool()
def motor_test() -> str:
    """Run a motor test on all motors , one by one, to confirm they are working and wired correctly - always confirm with user before running"""
    return run_script(SCRIPTS["motor_test"])
@mcp.tool()
def test_connection() -> str:
    """Test SSH connection to drone - returns success or error message"""
    return run_script(SCRIPTS["test_connection"])
@mcp.tool()
def start_telemetry_server() -> str:
    """Start the telemetry server on the drone to stream data back to the ui - run this before connecting the ui telemetry client"""
    return run_script(SCRIPTS["telemetry_server"])

'''@mcp.tool()
def arm() -> str:
    """Arm the drone motors - always confirm with user before running"""
    return run_script(SCRIPTS["arm"])

@mcp.tool()
def takeoff(altitude: float) -> str:
    """Take off to a given altitude in meters - always confirm with user before running"""
    return run_script(SCRIPTS["takeoff"], args=str(altitude))

@mcp.tool()
def land() -> str:
    """Land the drone - always confirm with user before running"""
    return run_script(SCRIPTS["land"])

@mcp.tool()
def set_mode(mode: str) -> str:
    """Set flight mode - e.g STABILIZE, GUIDED, LOITER, RTL"""
    return run_script(SCRIPTS["set_mode"], args=mode)'''

if __name__ == "__main__":
    mcp.run()