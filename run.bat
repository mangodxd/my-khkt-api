@echo off
REM ═══════════════════════════════════════════════════════════
REM SMART MUSTER CAMERA - Start All Services
REM ═══════════════════════════════════════════════════════════

cd /d D:\Users\Admin\Desktop\SMART MUSTER CAMERA 100

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║       SMART MUSTER CAMERA - Starting Services         ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Start Python Worker in new window
echo [1/2] Starting Python Worker...
start "Python Worker" cmd /k "cd python-worker && python worker.py"

REM Wait a moment before starting next service
timeout /t 2 /nobreak

REM Start Web HTTP Server in another new window
echo [2/2] Starting Web UI Server (http://localhost:8000)...
start "Web UI Server" cmd /k "cd web-ui && python -m http.server"

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║             Services Started Successfully             ║
echo ╠════════════════════════════════════════════════════════╣
echo ║ Python Worker:   python-worker/worker.py              ║
echo ║ Web UI Server:   http://localhost:8000                ║
echo ║ API Gateway:     https://my-khkt-api-production...    ║
echo ╚════════════════════════════════════════════════════════╝
echo.
pause
