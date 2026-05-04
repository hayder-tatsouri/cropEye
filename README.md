# CropEye - Agricultural Drone Assistant

CropEye is an advanced agricultural drone platform powered by AI. It combines drone telemetry, crop health detection, and intelligent assistance to help farmers monitor and manage their crops effectively.

## Features

- **Drone Control**: SSH-based communication with Raspberry Pi drone for motor testing and telemetry
- **Crop Health Detection**: YOLO-based object detection for identifying healthy and damaged crops
- **AI Assistant**: Claude-powered chatbot for drone operations and crop health questions
- **Live Streaming**: Real-time video feed from drone camera
- **Web Dashboard**: Modern React UI for monitoring and control
- **REST API**: FastAPI backend for seamless integration

## Project Structure

```
CropEye/
├── drone_mcp/                 # Drone MCP Server
│   ├── server.py             # MCP server with drone tools
│   ├── ssh_client.py         # SSH communication with drone
│   ├── config.py             # Configuration settings
│   └── backend.py            # FastAPI backend with Claude integration
├── model_server/              # YOLO Model Server
│   ├── local_server.py       # Flask server for model inference
│   └── best_yolov8n_int8_320.onnx  # YOLOv8 model (quantized)
├── ui/                        # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── routes/           # Page routes
│   │   ├── lib/              # Utilities & API client
│   │   └── hooks/            # Custom React hooks
│   ├── package.json
│   └── vite.config.ts
├── requirement.txt           # Python dependencies
├── .env                      # Environment variables (not in git)
└── .gitignore               # Git ignore rules
```

## Prerequisites

- Python 3.8 or higher
- Node.js 18+ (for UI)
- Anthropic API key (for Claude integration)
- SSH access to drone (Raspberry Pi)

## Installation

### 1. Backend Setup (Python)

```bash
# Navigate to project root
cd CropEye

# Create and activate virtual environment
python -m venv venv

# Activate venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirement.txt
```

### 2. Frontend Setup (Node.js)

```bash
cd ui

# Install dependencies
npm install

# Or if using bun (as per bun.lockb)
bun install
```

### 3. Environment Configuration

Create a `.env` file in the project root:

```env
# Anthropic API Key for Claude AI
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

**Important**: The `.env` file is listed in `.gitignore` and should never be committed to Git.

## Running the Application

### Start Model Server (YOLO Detection)

```bash
cd model_server
python local_server.py
# Server runs on http://localhost:5000
```

### Start Backend (FastAPI + Claude)

```bash
# From project root with venv activated
cd drone_mcp
python backend.py
# Backend runs on http://localhost:8000
```

### Start Frontend (React UI)

```bash
cd ui

# Development server
npm run dev
# Frontend runs on http://localhost:5173

# Production build
npm run build
```

## API Endpoints

### Chat API
- **POST** `/api/chat` - Send message to Claude assistant with drone tools

### Model Detection
- **POST** `/detect` - Send image for crop health detection
- **POST** `/stream` - Real-time video stream detection

### Drone Commands
- `test_connection` - Test SSH connection to drone
- `motor_test` - Run motor test on all motors (confirm first)
- `start_telemetry_server` - Start telemetry streaming from drone

## Configuration

### Drone Settings (drone_mcp/config.py)
- SSH credentials
- Script paths on drone
- Connection settings

### Model Settings (model_server/local_server.py)
- Model path: `best_yolov8n_int8_320.onnx`
- Input size: 320x320
- Confidence threshold: 0.25
- IOU threshold: 0.45
- Classes: healthy, damaged

### Backend Settings (drone_mcp/backend.py)
- Claude model: `claude-sonnet-4-20250514`
- Max tokens: 1024
- CORS settings for frontend communication

## Dependencies

### Python Packages
- **fastmcp** - MCP framework
- **mcp** - Model Context Protocol
- **flask** - Web framework
- **flask-cors** - CORS support
- **opencv-python** - Computer vision
- **numpy** - Numerical computing
- **onnxruntime** - YOLO model inference
- **paramiko** - SSH communication
- **python-dotenv** - Environment variables
- **anthropic** - Claude AI API

### Frontend Dependencies
See `ui/package.json` for complete list

## Development

### Adding New Drone Commands

1. Add script in drone config
2. Add tool function in `drone_mcp/server.py`
3. MCP server automatically exposes it to Claude

### Extending Detection

1. Replace `best_yolov8n_int8_320.onnx` with new model
2. Update class names in `model_server/local_server.py`
3. Adjust thresholds as needed

## Troubleshooting

### Virtual Environment Issues
- Ensure you're in the correct venv: `pip list` should show project packages
- On Windows, use `.\venv\Scripts\activate` not `source`

### API Key Issues
- Check `.env` file exists in project root
- Verify `ANTHROPIC_API_KEY` is set correctly
- Never commit `.env` to Git

### Model Loading Issues
- Ensure `best_yolov8n_int8_320.onnx` is in `model_server/` folder
- Check ONNX runtime is installed: `python -c "import onnxruntime"`

### SSH Connection Issues
- Verify drone IP and credentials in `drone_mcp/config.py`
- Test with: `python drone_mcp/ssh_client.py`

## Security Notes

- **Never commit `.env` file** - API keys will be exposed
- Validate all inputs before sending to drone
- Use HTTPS in production for frontend-backend communication
- Restrict CORS origins in production

## Contributing

When contributing:
1. Activate venv before development
2. Keep API key secure - use `.env` file
3. Test locally before pushing
4. Update README for significant changes

## License

See `license.txt` for project license.

## Support

For issues or questions, please check:
- `PROJECT_CONTEXT.md` for project details
- Individual component documentation
- Error logs in terminal output
