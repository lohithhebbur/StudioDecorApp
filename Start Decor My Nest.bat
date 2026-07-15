@echo off
setlocal EnableDelayedExpansion
set "APPDIR=%~dp0"
set "NODE=C:\Users\lohit\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if not exist "%NODE%" (
  for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE_FOUND set "NODE_FOUND=%%N"
  set "NODE=!NODE_FOUND!"
)

if not defined NODE (
  echo Node.js could not be found.
  echo Please open index.html for manual measurements.
  pause
  exit /b 1
)

start "Decor My Nest Measurement Server" /min "%NODE%" "%APPDIR%server.js"
timeout /t 2 /nobreak >nul

set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

if exist "%EDGE%" (
  start "" "%EDGE%" "http://127.0.0.1:4173"
) else (
  start "" "http://127.0.0.1:4173"
)

endlocal
