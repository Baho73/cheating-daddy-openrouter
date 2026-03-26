@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Stopping Cheating Daddy...
taskkill /F /IM "Cheating Daddy.exe" >nul 2>&1
taskkill /F /IM "electron.exe" >nul 2>&1

echo Restoring audio output to Realtek...
tools\svcl.exe /SetDefault "Realtek High Definition Audio" all

echo Done. Audio restored to speakers.
pause
