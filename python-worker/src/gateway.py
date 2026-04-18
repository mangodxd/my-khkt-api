"""Gateway communication module for API and WebSocket interactions."""

import os
import time
import json
import requests
import websocket
from src.utils import FancyText


def get_api_url() -> str:
    """
    Get API Gateway URL from environment variable.
    
    Returns:
        str: API Gateway base URL
    """
    return os.getenv('API_GATEWAY_URL', '')


def safe_post(path: str, payload: dict) -> dict:
    """
    Send HTTP POST request with error handling.
    
    Args:
        path (str): API endpoint path
        payload (dict): Request payload
        
    Returns:
        dict: API response or empty dict if request fails
    """
    base_url = get_api_url()
    if not base_url:
        FancyText.error('API_GATEWAY_URL not configured.')
        return {}
    
    url = f"{base_url.rstrip('/')}{path}"
    try:
        resp = requests.post(url, json=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if not data.get('success', True):
            FancyText.warning(f'API returned error: {data}')
        return data
    except Exception as e:
        FancyText.error(f'HTTP POST error at {path}: {e}')
        return {}


def post_attendance(payload: dict) -> dict:
    """
    Send attendance check-in data to Gateway.
    
    Args:
        payload (dict): Attendance data
        
    Returns:
        dict: API response
    """
    return safe_post('/api/attendance', payload)


def upload_image(attendance_id: int, image_b64: str, is_primary: int):
    """
    Upload image for attendance session.
    
    Args:
        attendance_id (int): Attendance session ID
        image_b64 (str): Base64-encoded image
        is_primary (int): 1 if primary image, 0 if secondary
    """
    payload = {
        'attendance_id': attendance_id,
        'image': image_b64,
        'is_primary': is_primary
    }
    safe_post('/api/attendance/upload_image', payload)


def post_ack(command_id: str, status: str, detail: dict = None):
    """
    Send command acknowledgment to Gateway.
    
    Args:
        command_id (str): Command ID
        status (str): Processing status
        detail (dict): Additional details
    """
    payload = {'id': command_id, 'status': status, 'detail': detail or {}}
    safe_post('/api/command/ack', payload)


def connect_websocket(on_message_callback):
    """
    Connect to WebSocket and maintain connection with auto-reconnect.
    
    Establishes persistent WebSocket connection to receive commands from Gateway.
    Automatically attempts to reconnect on disconnection.
    
    Args:
        on_message_callback (callable): Callback function to handle messages
    """
    base_url = get_api_url()
    if not base_url:
        FancyText.error('API_GATEWAY_URL not configured, skipping WebSocket.')
        return

    # Convert HTTP URL to WebSocket URL and add worker type parameter
    ws_url = base_url.replace('http', 'ws').replace('https', 'wss').rstrip('/') + '/?type=worker'

    def on_message(ws, message):
        """Handle incoming WebSocket message."""
        try:
            data = json.loads(message)
            on_message_callback(data)
        except Exception as e:
            FancyText.error(f'WebSocket message processing error: {e}')

    def on_error(ws, error):
        """Handle WebSocket error."""
        FancyText.error(f'WebSocket error: {error}')

    def on_close(ws, close_status_code, close_msg):
        """Handle WebSocket close event."""
        FancyText.warning('WebSocket connection closed.')

    def on_open(ws):
        """Handle WebSocket open event."""
        FancyText.success('WebSocket connected to Gateway (Worker)!')

    while True:
        try:
            FancyText.info(f'Connecting to WebSocket: {ws_url}')
            ws = websocket.WebSocketApp(
                ws_url,
                on_open=on_open,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close
            )
            ws.run_forever()
        except Exception as e:
            FancyText.error(f'WebSocket connection failed: {e}')
        
        FancyText.info('Attempting WebSocket reconnect in 5 seconds...')
        time.sleep(5)