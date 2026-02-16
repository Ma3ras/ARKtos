#!/usr/bin/env python3
"""
Faster-Whisper Transcription Script
Transcribes audio files using faster-whisper for improved performance
"""

import sys
import os

# Add CUDA libraries to PATH for GPU support
import site
cuda_paths = [
    os.path.join(site.USER_SITE, 'nvidia', 'cublas', 'bin'),
    os.path.join(site.USER_SITE, 'nvidia', 'cudnn', 'bin'),
]
for cuda_path in cuda_paths:
    if os.path.exists(cuda_path):
        os.add_dll_directory(cuda_path)
        print(f"Added CUDA path: {cuda_path}", file=sys.stderr)

from faster_whisper import WhisperModel

def transcribe_audio(audio_file, model_size="small", language="de"):
    """
    Transcribe audio file using faster-whisper
    
    Args:
        audio_file: Path to WAV audio file
        model_size: Model size (tiny, base, small, medium, large)
        language: Language code (de, en, etc.)
    
    Returns:
        Transcribed text
    """
    try:
        print(f"Loading model: {model_size}...", file=sys.stderr)
        
        # Use GPU with CUDA paths configured
        print(f"Attempting GPU (CUDA) acceleration...", file=sys.stderr)
        model = WhisperModel(
            model_size, 
            device="cuda",
            compute_type="float16",  # GPU-optimized precision
            num_workers=1
        )
        print(f"✅ GPU acceleration enabled!", file=sys.stderr)
        
        print(f"Model loaded. Transcribing: {audio_file}", file=sys.stderr)
        
        # Transcribe with optimized settings
        segments, info = model.transcribe(
            audio_file,
            language=language,
            beam_size=1,  # Reduced from 5 for speed (greedy decoding)
            best_of=1,    # No sampling, fastest
            temperature=0,  # Deterministic
            vad_filter=True,  # Voice activity detection
            vad_parameters=dict(
                min_silence_duration_ms=300,  # Reduced from 500
                speech_pad_ms=200  # Padding around speech
            )
        )
        
        print(f"Transcription complete. Processing segments...", file=sys.stderr)
        
        # Combine all segments
        text = " ".join([segment.text for segment in segments])
        
        return text.strip()
        
    except Exception as e:
        print(f"Error during transcription: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return ""

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python faster_whisper_transcribe.py <audio_file> [model_size] [language]", file=sys.stderr)
        sys.exit(1)
    
    audio_file = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "small"
    language = sys.argv[3] if len(sys.argv) > 3 else "de"
    
    if not os.path.exists(audio_file):
        print(f"Error: Audio file not found: {audio_file}", file=sys.stderr)
        sys.exit(1)
    
    # Transcribe
    text = transcribe_audio(audio_file, model_size, language)
    
    # Output result to stdout
    print(text)
