@echo off
title UltraTribe Live Brain Analyzer v4.0.0
color 0B

echo ======================================================================
echo    UltraTribe - Canli Yayin Beyin Korteks Analizoru (v4.0.0)
echo ======================================================================
echo.
echo [1/3] Python ortami kontrol ediliyor...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Python bulunamadi! Lutfen Python 3.11 veya 3.12 yukleyin.
    pause
    exit /b 1
)

echo [2/3] Gerekli kutuphaneler kontrol ediliyor ve yukleniyor...
pip install -e . >nul 2>&1
pip install fastapi uvicorn pydantic scipy numpy torch >nul 2>&1

echo [3/3] UltraTribe Canli Analiz Sunucusu baslatiliyor...
echo.
echo ======================================================================
echo   Sunucu Calisiyor: http://127.0.0.1:8080
echo   Tarayiciniz otomatik aciliyor...
echo   Durdurmak icin bu pencereyi kapatabilir veya Ctrl+C yapabilirsiniz.
echo ======================================================================
echo.

start http://127.0.0.1:8080

python -m uvicorn live_stream_analyzer.backend.app:app --host 127.0.0.1 --port 8080
pause
