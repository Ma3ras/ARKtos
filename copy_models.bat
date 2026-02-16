@echo off
REM Suche und kopiere die Modelle

echo Suche nach ggml-medium.bin...
echo.

REM Suche in d:\ai
for /r "d:\ai" %%f in (ggml-medium.bin) do (
    if exist "%%f" (
        echo Gefunden: %%f
        echo Erstelle models Ordner...
        mkdir "d:\ai\ark-bot\whisper.cpp\models" 2>nul
        echo Kopiere Modell...
        copy "%%f" "d:\ai\ark-bot\whisper.cpp\models\ggml-medium.bin"
        echo ✅ Whisper Modell kopiert!
        goto :piper
    )
)

echo ❌ ggml-medium.bin nicht gefunden in d:\ai
echo Bitte gib den Pfad manuell an:
set /p MODEL_PATH="Pfad zu ggml-medium.bin: "
if exist "%MODEL_PATH%" (
    mkdir "d:\ai\ark-bot\whisper.cpp\models" 2>nul
    copy "%MODEL_PATH%" "d:\ai\ark-bot\whisper.cpp\models\ggml-medium.bin"
    echo ✅ Whisper Modell kopiert!
)

:piper
echo.
echo Suche nach piper voices...
echo.

REM Suche nach piper voice
for /r "d:\ai" %%f in (de_DE-thorsten-medium.onnx) do (
    if exist "%%f" (
        echo Gefunden: %%f
        echo Erstelle voices Ordner...
        mkdir "d:\ai\ark-bot\piper\voices" 2>nul
        echo Kopiere Voice-Dateien...
        copy "%%~dpfde_DE-thorsten-medium.onnx" "d:\ai\ark-bot\piper\voices\"
        copy "%%~dpfde_DE-thorsten-medium.onnx.json" "d:\ai\ark-bot\piper\voices\"
        echo ✅ Piper Voice kopiert!
        goto :done
    )
)

echo ❌ Piper voice nicht gefunden in d:\ai

:done
echo.
echo Fertig!
pause
