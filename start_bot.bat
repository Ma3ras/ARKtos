@echo off
REM Start ARK Bot with FFmpeg in PATH

echo Starting ARK Voice Bot...
echo.

REM Add FFmpeg to PATH for this session
set PATH=%PATH%;%~dp0ffmpeg\bin

REM Check if FFmpeg is available
where ffmpeg >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ FFmpeg not found! Please run download_ffmpeg.bat first.
    pause
    exit /b 1
)

echo ✅ FFmpeg found
echo.

REM Start the bot
node index.js
