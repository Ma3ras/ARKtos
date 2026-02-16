# Voice Tools Setup Guide

## whisper.cpp Setup

### 1. Download Pre-built Binary (Easiest for Windows)

**Option A: Download Release**
1. Go to https://github.com/ggerganov/whisper.cpp/releases
2. Download `whisper-bin-x64.zip` (latest release)
3. Extract to `d:\ai\ark-bot\whisper.cpp\`

**Option B: Build from Source (if you have Visual Studio)**
```cmd
cd d:\ai\ark-bot
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
mkdir build
cd build
cmake ..
cmake --build . --config Release
```

### 2. Download German Model

```cmd
cd d:\ai\ark-bot\whisper.cpp
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin -o models/ggml-medium.bin
```

**Alternative (if curl doesn't work):**
1. Go to https://huggingface.co/ggerganov/whisper.cpp/tree/main
2. Download `ggml-medium.bin` manually
3. Save to `d:\ai\ark-bot\whisper.cpp\models\ggml-medium.bin`

### 3. Test whisper.cpp

```cmd
cd d:\ai\ark-bot\whisper.cpp
.\main.exe -m models\ggml-medium.bin -l de -f samples\jfk.wav
```

If you see transcription output, it's working! ✅

---

## piper TTS Setup

### 1. Download Piper

1. Go to https://github.com/rhasspy/piper/releases
2. Download `piper_windows_amd64.zip` (latest release)
3. Extract to `d:\ai\ark-bot\piper\`

### 2. Download German Voice Model

**Recommended: de_DE-thorsten-medium**

```cmd
cd d:\ai\ark-bot\piper
mkdir voices
cd voices

REM Download model file
curl -L https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx -o de_DE-thorsten-medium.onnx

REM Download config file
curl -L https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx.json -o de_DE-thorsten-medium.onnx.json
```

**Alternative (manual download):**
1. Go to https://huggingface.co/rhasspy/piper-voices/tree/main/de/de_DE/thorsten/medium
2. Download both files:
   - `de_DE-thorsten-medium.onnx`
   - `de_DE-thorsten-medium.onnx.json`
3. Save to `d:\ai\ark-bot\piper\voices\`

### 3. Test piper

```cmd
cd d:\ai\ark-bot\piper
echo "Hallo, ich bin der ARK Bot" | .\piper.exe --model voices\de_DE-thorsten-medium.onnx --output_file test.wav
```

If `test.wav` is created and contains speech, it's working! ✅

---

## Directory Structure

After setup, your directory should look like this:

```
d:\ai\ark-bot\
├── whisper.cpp\
│   ├── main.exe (or main)
│   └── models\
│       └── ggml-medium.bin
├── piper\
│   ├── piper.exe
│   └── voices\
│       ├── de_DE-thorsten-medium.onnx
│       └── de_DE-thorsten-medium.onnx.json
├── index.js
├── package.json
└── ...
```

---

## Troubleshooting

### whisper.cpp Issues

**"main.exe not found"**
- Make sure you extracted the release to the correct folder
- Or build from source if pre-built doesn't work

**"Model not found"**
- Check that `ggml-medium.bin` is in `whisper.cpp/models/`
- File size should be ~1.5 GB

**"CUDA/cuBLAS errors"**
- These are optional GPU acceleration warnings, can be ignored
- whisper.cpp will fall back to CPU

### piper Issues

**"piper.exe not found"**
- Make sure you extracted to `d:\ai\ark-bot\piper\`
- Check that the exe is not blocked (right-click → Properties → Unblock)

**"Model not found"**
- Check that both `.onnx` and `.onnx.json` files are present
- They must be in the same directory

**"No audio output"**
- Make sure you have a media player that can play WAV files
- Try VLC or Windows Media Player

---

## Next Steps

Once both tools are set up and tested, we can proceed with implementing the voice bot modules!
