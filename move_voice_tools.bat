@echo off
REM Move whisper.cpp and piper to ark-bot directory

echo Moving voice tools to ark-bot directory...
echo.

REM Move whisper.cpp
if exist "d:\ai\whisper.cpp" (
    echo Moving whisper.cpp...
    move "d:\ai\whisper.cpp" "d:\ai\ark-bot\whisper.cpp"
    echo ✅ whisper.cpp moved
) else (
    echo ⚠️ whisper.cpp not found in d:\ai
)

echo.

REM Move piper
if exist "d:\ai\piper" (
    echo Moving piper...
    move "d:\ai\piper" "d:\ai\ark-bot\piper"
    echo ✅ piper moved
) else (
    echo ⚠️ piper not found in d:\ai
)

echo.
echo Done! Tools should now be in d:\ai\ark-bot
echo.
pause
