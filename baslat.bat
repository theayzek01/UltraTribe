@echo off
cd /d "%~dp0"
title UltraTribe Live Brain Cortex Analyzer v4.0.0
color 0B

echo ======================================================================
echo    UltraTribe - Canli Yayin Noral Beyin Analizoru (v4.0.0)
echo ======================================================================
echo.

echo [1/3] Calisma dizini: %CD%
echo [2/3] Gerekli yapay zeka modulleri kontrol ediliyor...
pip install -e . >nul 2>&1

echo [3/3] 3D WebGL Arayuzu ve Canli Analiz Sunucusu baslatiliyor...
echo.
echo ======================================================================
echo   Sunucu Adresi : http://127.0.0.1:8585
echo   Durum         : Hazir ve Calisiyor
echo   Tarayici      : Otomatik aciliyor...
echo.
echo   Durdurmak icin pencereyi kapatabilir veya Ctrl+C yapabilirsiniz.
echo ======================================================================
echo.

start http://127.0.0.1:8585

python -m uvicorn live_stream_analyzer.backend.app:app --host 127.0.0.1 --port 8585
pause
