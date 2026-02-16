# Fehlende Executables - Download-Anleitung

## Problem
Die Modelle sind vorhanden, aber die ausführbaren Dateien fehlen:
- ✅ whisper.cpp/models/ggml-medium.bin (vorhanden)
- ❌ whisper.cpp/main.exe (fehlt!)
- ❌ piper/piper.exe (fehlt!)

## Lösung

### 1. whisper.cpp Executable herunterladen

**Option A: Pre-built Binary (empfohlen)**
1. Gehe zu: https://github.com/ggerganov/whisper.cpp/releases
2. Lade `whisper-bin-x64.zip` herunter (neueste Version)
3. Entpacke die ZIP-Datei
4. Kopiere `main.exe` nach `d:\ai\ark-bot\whisper.cpp\main.exe`

**Option B: Build from Source (wenn du Visual Studio hast)**
```cmd
cd d:\ai\ark-bot\whisper.cpp
cmake -B build
cmake --build build --config Release
copy build\bin\Release\main.exe main.exe
```

### 2. piper Executable herunterladen

1. Gehe zu: https://github.com/rhasspy/piper/releases
2. Lade `piper_windows_amd64.zip` herunter (neueste Version)
3. Entpacke die ZIP-Datei
4. Kopiere `piper.exe` nach `d:\ai\ark-bot\piper\piper.exe`

### 3. Verzeichnisstruktur prüfen

Nach dem Download sollte es so aussehen:

```
d:\ai\ark-bot\
├── whisper.cpp\
│   ├── main.exe          ← MUSS VORHANDEN SEIN
│   └── models\
│       └── ggml-medium.bin  ← ✅ Bereits vorhanden
├── piper\
│   ├── piper.exe         ← MUSS VORHANDEN SEIN
│   └── voices\
│       ├── de_DE-thorsten-medium.onnx      ← Sollte vorhanden sein
│       └── de_DE-thorsten-medium.onnx.json ← Sollte vorhanden sein
```

### 4. Test

Nach dem Download teste, ob die Executables funktionieren:

```cmd
cd d:\ai\ark-bot

REM Test whisper.cpp
whisper.cpp\main.exe --help

REM Test piper
piper\piper.exe --help
```

Wenn beide Befehle Hilfe-Text anzeigen, funktioniert es! ✅

### 5. Bot neu starten

```cmd
node index.js
```

Dann `/join` im Discord testen!

---

## Schnell-Download Links

**whisper.cpp:**
https://github.com/ggerganov/whisper.cpp/releases/latest

**piper:**
https://github.com/rhasspy/piper/releases/latest
