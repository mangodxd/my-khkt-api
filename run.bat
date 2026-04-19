@echo off


cd /d D:\Users\Admin\Desktop\SMART MUSTER CAMERA 100


REM Start Python Worker in new window
echo [1/2] Starting Python Worker...
start "Python Worker" cmd /k "cd python-worker && python worker.py"

REM Wait a moment before starting next service
timeout /t 2 /nobreak

REM Start Web HTTP Server in another new window
echo [2/2] Starting Web UI Server (http://localhost:8000)...
start "Web UI Server" cmd /k "cd web-ui && python -m http.server"

echo.
echo            Services Started Successfully
echo.
pause
