# ssh_client.py

import paramiko
from config import SSH_CONFIG, VENV_ACTIVATE

def run_script(script_path, args=""):
    """
    SSH into Pi and run a python script with the drone venv
    Returns the output as a string
    """
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        # Connect to Pi
        client.connect(
            hostname=SSH_CONFIG["host"],
            port=SSH_CONFIG["port"],
            username=SSH_CONFIG["username"],
            password=SSH_CONFIG["password"],
            key_filename=SSH_CONFIG["key_path"],
            timeout=SSH_CONFIG["timeout"]
        )

        # Build command — activate venv then run script
        command = f"source {VENV_ACTIVATE} && python3 {script_path} {args}"

        # Execute
        stdin, stdout, stderr = client.exec_command(command, get_pty=True)

        # Capture output
        output = stdout.read().decode("utf-8")
        errors = stderr.read().decode("utf-8")

        if errors:
            return f"Output:\n{output}\nErrors:\n{errors}"
        return output

    except Exception as e:
        return f"SSH Connection failed: {str(e)}"

    finally:
        client.close()
