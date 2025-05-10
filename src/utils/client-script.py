#!/usr/bin/env python3
# DDNS Client Script (Python Implementation)
# This script automatically updates your dynamic DNS record
# Token and server URL will be replaced with actual values when served

import json
import time
import signal
import sys
from datetime import datetime, timedelta
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from urllib.parse import urlparse

TOKEN = '__TOKEN__'
SERVER_URL = '__SERVER_URL__'
UPDATE_INTERVAL = 300  # 5 minutes (in seconds)
DOMAIN = '__DOMAIN__'

def timestamp():
    """Format timestamp for logging [HH:MM:SS]"""
    return f"[{datetime.now().strftime('%H:%M:%S')}]"

def log(level, message):
    """Log with timestamp and prefix"""
    print(f"{timestamp()} {level}: {message}")

def log_error(context, error):
    """Log error with details"""
    log("ERROR", f"{context}: {str(error)}")
    if hasattr(error, 'response') and error.response:
        log("ERROR", f"Server response: {error.response}")
    
    import os
    if hasattr(error, 'traceback') and os.environ.get('DEBUG'):
        log("ERROR", error.traceback)

def make_request(url, method="GET", headers=None, data=None, max_redirects=5):
    """
    Make an HTTP request using Python's urllib
    
    Args:
        url: The URL to request
        method: Request method (GET, POST, etc.)
        headers: Request headers dictionary
        data: Request body data for POST/PUT
        max_redirects: Maximum number of redirects to follow
    
    Returns:
        Parsed JSON response or text response
    """
    redirect_count = 0
    
    while True:
        if headers is None:
            headers = {}
            
        req = Request(url, headers=headers, method=method)
        
        if data:
            if isinstance(data, dict):
                data = json.dumps(data).encode('utf-8')
                if 'Content-Type' not in headers:
                    req.add_header('Content-Type', 'application/json')
            elif isinstance(data, str):
                data = data.encode('utf-8')
                
            req.data = data
        
        try:
            response = urlopen(req)
            
            # Handle redirects
            if 300 <= response.status < 400 and 'Location' in response.headers:
                if redirect_count >= max_redirects:
                    raise Exception("Too many redirects")
                
                redirect_count += 1
                url = response.headers['Location']
                continue
            
            # Get response data
            response_data = response.read().decode('utf-8')
            
            # Try to parse JSON
            if response_data.strip():
                try:
                    return json.loads(response_data)
                except json.JSONDecodeError:
                    return {"data": response_data}
            else:
                return {}
                
        except HTTPError as e:
            # Handle HTTP errors
            error_message = f"Request failed with status {e.code}"
            
            try:
                response_data = e.read().decode('utf-8')
                if response_data.strip():
                    try:
                        error_response = json.loads(response_data)
                    except json.JSONDecodeError:
                        error_response = {"data": response_data}
                else:
                    error_response = {}
            except:
                error_response = {}
                
            e.response = {
                "status": e.code,
                "data": error_response,
                "headers": dict(e.headers)
            }
            
            raise Exception(error_message) from e
            
        except URLError as e:
            raise Exception(f"Request failed: {str(e)}") from e
        
        break

async def get_current_ip():
    """Get current public IP address"""
    try:
        log("INFO", "Detecting public IP address...")
        # Use the server's built-in IP detection endpoint
        response = make_request(f"{SERVER_URL}/api/ip")
        log("INFO", f"Successfully detected IP: {response['ip']}")
        return response["ip"]
    except Exception as error:
        log_error("Failed to detect IP address", error)
        raise Exception("Failed to detect IP address")

async def update_dns(ip):
    """Update DNS record"""
    try:
        log("INFO", f"Updating DNS record for {DOMAIN} to {ip}...")
        headers = {
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json"
        }
        response = make_request(
            f"{SERVER_URL}/api/dns/update",
            method="POST",
            headers=headers,
            data={"ip": ip}
        )

        if response.get("success"):
            result = response.get("result", {})
            if result and result.get("status") == "unchanged":
                log("INFO", f"DNS record is already up-to-date ({ip})")
            else:
                log("INFO", f"DNS record updated successfully to {ip}")

        return response
    except Exception as error:
        log_error("Failed to update DNS record", error)
        raise error

async def check_and_update_ip():
    """Main function to check and update IP"""
    try:
        current_ip = await get_current_ip()
        result = await update_dns(current_ip)

        # Schedule next check
        next_check_time = (datetime.now() + timedelta(seconds=UPDATE_INTERVAL)).strftime("%H:%M:%S")
        log("INFO", f"Next check scheduled at {next_check_time}")
    except Exception as error:
        log("ERROR", f"Update cycle failed: {str(error)}")
        log("INFO", f"Will retry in {UPDATE_INTERVAL/60} minutes")

def handle_signal(signum, frame):
    """Handle termination signal"""
    log("INFO", "Received termination signal. Shutting down...")
    log("INFO", "DDNS client stopped")
    sys.exit(0)

# Register signal handler
signal.signal(signal.SIGINT, handle_signal)
signal.signal(signal.SIGTERM, handle_signal)

if __name__ == "__main__":
    # Print startup information
    log("INFO", "========================================")
    log("INFO", f"DDNS client starting for domain: {DOMAIN}")
    log("INFO", f"Server URL: {SERVER_URL}")
    log("INFO", f"Update interval: {UPDATE_INTERVAL/60} minutes")
    log("INFO", "========================================")

    # Main loop
    try:
        while True:
            try:
                # In Python, we need to use a simple event loop since asyncio
                # isn't as straightforward for this script's purpose
                import asyncio
                asyncio.run(check_and_update_ip())
                time.sleep(UPDATE_INTERVAL)
            except Exception as e:
                log_error("Uncaught exception", e)
                log("ERROR", "An unexpected error occurred. Client will attempt to continue...")
                time.sleep(UPDATE_INTERVAL)
    except KeyboardInterrupt:
        handle_signal(signal.SIGINT, None)