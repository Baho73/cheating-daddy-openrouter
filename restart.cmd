@echo off
chcp 65001 >nul
set LANG=en_US.UTF-8
set PYTHONIOENCODING=utf-8
cd /d "%~dp0"

echo Stopping Cheating Daddy...
taskkill /F /IM "Cheating Daddy.exe" >nul 2>&1

echo Starting WhisperX Docker...
cd /d "D:\Python\whisperX-FastAPI"
docker compose up -d
cd /d "%~dp0"

:: Check if WhisperX is already responding
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel%==0 (
    echo WhisperX already running.
) else (
    echo Waiting for WhisperX to start...
    :wait_loop
    timeout /t 2 /nobreak >nul
    curl -s http://localhost:8000/health >nul 2>&1
    if not %errorlevel%==0 goto wait_loop
    echo WhisperX ready.
)

echo Starting Cheating Daddy...
node_modules\.bin\electron .
