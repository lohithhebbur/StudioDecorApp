@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-to-studio.ps1"
echo.
pause
