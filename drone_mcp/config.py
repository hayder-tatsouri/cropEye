# config.py

SSH_CONFIG = {
    "host": "192.168.0.111",     # Your Pi Zero static IP
    "port": 22,
    "username": "hayder",
    "password": "Hayder1920",   # Or use key below
    "key_path": None,             # e.g "C:/Users/you/.ssh/id_rsa" or None
    "timeout": 10
}
VENV_ACTIVATE = "/home/hayder/drone_env/bin/activate"
SCRIPTS = {
   "motor_test": "/home/hayder/drone/motor_test.py",
    #"arm":        "/home/pi/drone/arm.py",
    #"takeoff":    "/home/pi/drone/takeoff.py",
    #"land":       "/home/pi/drone/land.py",
    #"set_mode":   "/home/pi/drone/set_mode.py",
    "status":     "/home/hayder/drone/status.py"
}