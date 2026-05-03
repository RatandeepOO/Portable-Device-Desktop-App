import subprocess
import os
import time
import re
import sys
import json
from pathlib import Path

# Configuration
PROJECT_ROOT = Path(__file__).parent.absolute()
ENV_FILE = PROJECT_ROOT / ".env"
NGROK_DOMAIN = "uncondoling-tenderly-wilfred.ngrok-free.dev"

def update_env(key, value):
    if not ENV_FILE.exists():
        with open(ENV_FILE, "w") as f:
            f.write(f"{key}={value}\n")
        return

    lines = ENV_FILE.read_text().splitlines()
    updated = False
    new_lines = []
    for line in lines:
        if line.startswith(f"{key}="):
            new_lines.append(f"{key}={value}")
            updated = True
        else:
            new_lines.append(line)
    
    if not updated:
        new_lines.append(f"{key}={value}")
    
    ENV_FILE.write_text("\n".join(new_lines) + "\n")
    print(f"Updated .env: {key}={value}")
    
    # Also update mobile app's config.json
    mobile_config = PROJECT_ROOT / "mobile-app-flet" / "config.json"
    with open(mobile_config, "w") as f:
        json.dump({key: value}, f)
    print(f"Updated mobile config.json: {mobile_config}")

def start_backend():
    print("Starting Backend Server...")
    server_dir = PROJECT_ROOT / "server"
    # Use 'npm start' or 'node src/index.js'
    process = subprocess.Popen(
        ["npm", "start"], 
        cwd=server_dir, 
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    # Wait for ready signal
    for line in iter(process.stdout.readline, ""):
        print(f"[Backend] {line.strip()}")
        if "Server running on port" in line:
            print("Backend is ready.")
            break
    return process

def start_ngrok():
    print(f"Starting Ngrok with domain: {NGROK_DOMAIN}...")
    
    # Kill any existing ngrok processes first to avoid "already online" error
    try:
        print("Cleaning up existing ngrok processes...")
        if os.name == 'nt':
            subprocess.run(['taskkill', '/F', '/IM', 'ngrok.exe', '/T'], capture_output=True)
        else:
            subprocess.run(['pkill', '-9', 'ngrok'], capture_output=True)
    except:
        pass

    # Attempt to start ngrok
    # We use the domain provided in the user's previous attempt
    ngrok_cmd = ["ngrok", "http", "8000", "--domain", NGROK_DOMAIN]
    
    # Try to start it in the background
    try:
        # Check if already running first
        import urllib.request
        try:
            with urllib.request.urlopen("http://localhost:4040/api/tunnels") as response:
                tunnels = json.loads(response.read())
                for tunnel in tunnels.get("tunnels", []):
                    if tunnel.get("public_url"):
                        print(f"Ngrok already running: {tunnel['public_url']}")
                        return tunnel['public_url'], None
        except:
            pass

        process = subprocess.Popen(
            ngrok_cmd,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        
        # Give it a few seconds to initialize
        time.sleep(5)
        
        # Query local API for the URL
        try:
            with urllib.request.urlopen("http://localhost:4040/api/tunnels") as response:
                tunnels = json.loads(response.read())
                url = tunnels["tunnels"][0]["public_url"]
                print(f"Ngrok started: {url}")
                return url, process
        except Exception as e:
            print(f"Could not get Ngrok URL from API: {e}")
            # Fallback to the domain
            url = f"https://{NGROK_DOMAIN}"
            print(f"Using fallback URL: {url}")
            return url, process
            
    except Exception as e:
        print(f"Error starting Ngrok: {e}")
        return None, None

def main():
    print("=== Emergency Response System Startup ===")
    
    # 1. Start Backend
    backend_proc = start_backend()
    
    # 2. Start Ngrok
    ngrok_url, ngrok_proc = start_ngrok()
    
    if ngrok_url:
        # 3. Update .env
        update_env("PUBLIC_SERVER_URL", ngrok_url)
        print(f"\nSystem is now online!")
        print(f"Desktop Access: http://localhost:8000")
        print(f"Mobile Access: {ngrok_url}")
        print("\nYou can now build the mobile APK and it will automatically connect to this link.")
    else:
        print("Failed to start Ngrok. Mobile app might not be able to connect over the internet.")

    print("\nPress Ctrl+C to stop all services.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down...")
        if backend_proc: backend_proc.terminate()
        if ngrok_proc: ngrok_proc.terminate()

if __name__ == "__main__":
    main()
