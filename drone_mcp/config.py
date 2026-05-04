# config.py

SSH_CONFIG = {
    "host": "192.168.0.179",     # Your Pi 4 static IP
    "port": 22,
    "username": "mehdi",
    "password": "mehdi",   # Or use key below
    "key_path": None,             # e.g "C:/Users/you/.ssh/id_rsa" or None
    "timeout": 10
}
VENV_ACTIVATE = "/home/mehdi/drone_project/venv/bin/activate"
SCRIPTS = {
    "motor_test":       "/home/mehdi/drone_project/mavlink/motor_test.py",
    "test_connection":  "/home/mehdi/drone_project/test_connection.py",
    #"arm":             "/home/mehdi/drone_project/mavlink/arm.py",
    #"takeoff":         "/home/mehdi/drone_project/mavlink/takeoff.py",
    #"land":            "/home/mehdi/drone_project/mavlink/land.py",
    #"set_mode":        "/home/mehdi/drone_project/mavlink/set_mode.py",
    #"status":           "/home/mehdi/drone_project/mavlink/status.py",
    "telemetry_server": "/home/mehdi/drone_project/server/telemetry_server.py",
}