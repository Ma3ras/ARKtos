@echo off
REM Test Piper TTS output

echo Testing Piper TTS...
echo.

REM Generate a test audio file
echo Hallo, das ist ein Test. | piper\piper.exe --model piper\voices\de_DE-thorsten-medium.onnx --output_file test_piper_output.wav

echo.
echo ✅ Test audio created: test_piper_output.wav
echo.
echo Now testing FFmpeg conversion...
echo.

REM Convert with FFmpeg
ffmpeg\bin\ffmpeg.exe -i test_piper_output.wav -ar 48000 -ac 2 -f s16le test_converted.raw -y

echo.
echo ✅ Converted audio created: test_converted.raw
echo.
echo Check the file properties of test_piper_output.wav
echo.
pause
