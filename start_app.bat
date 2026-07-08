@echo off
chcp 65001 >nul
title FanPulse - Uygulama Baslatiliyor...

echo ============================================
echo    FanPulse Uygulamasi Baslatiliyor...
echo ============================================
echo.

:: Backend baslat (Python Flask)
echo [1/2] Backend sunucusu baslatiliyor...
cd /d "%~dp0backend"
start "FanPulse Backend" cmd /k "..\.venv\Scripts\python.exe app.py"

:: Frontend'in baslamasi icin biraz bekle
echo [2/2] Frontend baslatiliyor...
ping -n 4 127.0.0.1 >nul
cd /d "%~dp0frontend"
start "FanPulse Frontend" cmd /k "npx expo start --web --no-dev"

echo.
echo ============================================
echo    Uygulama basariyla baslatildi!
echo    Backend:  http://localhost:5000
echo    Frontend: http://localhost:8081
echo ============================================
echo.
echo Bu pencereyi kapatabilirsiniz.
ping -n 4 127.0.0.1 >nul
exit
