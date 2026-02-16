@echo off
REM Korrigiertes Move-Skript für whisper.cpp

echo Verschiebe whisper.cpp korrekt...
echo.

REM Prüfe ob whisper.cpp in d:\ai existiert
if exist "d:\ai\whisper.cpp" (
    echo whisper.cpp gefunden in d:\ai
    
    REM Wenn bereits in ark-bot, lösche zuerst
    if exist "d:\ai\ark-bot\whisper.cpp" (
        echo Lösche alte whisper.cpp in ark-bot...
        rmdir /s /q "d:\ai\ark-bot\whisper.cpp"
    )
    
    REM Verschiebe komplett
    echo Verschiebe whisper.cpp nach ark-bot...
    move "d:\ai\whisper.cpp" "d:\ai\ark-bot\whisper.cpp"
    echo ✅ whisper.cpp verschoben
) else (
    echo ⚠️ whisper.cpp nicht in d:\ai gefunden
    echo Prüfe ob bereits in ark-bot...
    if exist "d:\ai\ark-bot\whisper.cpp" (
        echo ✅ whisper.cpp ist bereits in ark-bot
    ) else (
        echo ❌ whisper.cpp nicht gefunden!
    )
)

echo.

REM Prüfe ob piper in d:\ai existiert  
if exist "d:\ai\piper" (
    echo piper gefunden in d:\ai
    
    REM Wenn bereits in ark-bot, lösche zuerst
    if exist "d:\ai\ark-bot\piper" (
        echo Lösche alte piper in ark-bot...
        rmdir /s /q "d:\ai\ark-bot\piper"
    )
    
    REM Verschiebe komplett
    echo Verschiebe piper nach ark-bot...
    move "d:\ai\piper" "d:\ai\ark-bot\piper"
    echo ✅ piper verschoben
) else (
    echo ⚠️ piper nicht in d:\ai gefunden
    echo Prüfe ob bereits in ark-bot...
    if exist "d:\ai\ark-bot\piper" (
        echo ✅ piper ist bereits in ark-bot
    ) else (
        echo ❌ piper nicht gefunden!
    )
)

echo.
echo Fertig!
echo.
pause
