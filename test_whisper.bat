@echo off
REM Test whisper.cpp with a simple command

echo Testing whisper.cpp...
echo.

REM Check if main.exe exists
if not exist "whisper.cpp\main.exe" (
    echo ❌ whisper.cpp\main.exe not found!
    pause
    exit /b 1
)

REM Check if model exists
if not exist "whisper.cpp\models\ggml-medium.bin" (
    echo ❌ Model not found!
    pause
    exit /b 1
)

echo ✅ Files found
echo.
echo Running whisper.cpp --help...
echo.

whisper.cpp\main.exe --help

echo.
echo If you see help text above, whisper.cpp works!
echo.
pause
