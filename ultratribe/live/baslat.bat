@echo off
title UltraTribe Live Brain Cortex Analyzer v4.0.0
color 0B

echo ======================================================================
echo    UltraTribe - Canli Yayin Noral Beyin Analizoru (v4.0.0)
echo ======================================================================
echo.

:: 1. Python Check
echo [1/4] Python calisma ortami kontrol ediliyor...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Python bulunamadi! Lutfen Python 3.11 veya 3.12 kurun ve PATH'e ekleyin.
    pause
    exit /b 1
)

:: 2. Dependencies Check & Auto-Install
echo [2/4] Gerekli yapay zeka ve web modulleri kontrol ediliyor...
pip install -e . fastapi uvicorn pydantic scipy numpy yt-dlp opencv-python websockets pandas einops jinja2 requests >nul 2>&1

:: 3. Test Import
echo [3/4] UltraTribe noral kodlama motoru test ediliyor...
python -c "import ultratribe; from live_stream_analyzer.backend.cortex_engine import LiveCortexEngine; print('UltraTribe Core & Live Engine: OK')"

:: 4. Launch Server & Browser
echo [4/4] 3D WebGL Arayuzu ve Canli WebSocket Sunucusu baslatiliyor...
echo.
echo ======================================================================
echo   Sunucu Adresi : http://127.0.0.1:8080
echo   Durum         : Hazir ve Calisiyor
echo   Tarayici      : Otomatik aciliyor...
echo.
echo   Durdurmak icin pencereyi kapatabilir veya Ctrl+C yapabilirsiniz.
echo ======================================================================
echo.

start http://127.0.0.1:8080

python -m uvicorn live_stream_analyzer.backend.app:app --host 127.0.0.1 --port 8080
pause
