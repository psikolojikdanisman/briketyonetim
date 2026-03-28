@echo off
chcp 65001
REM ===============================
REM Tek tıkla Git commit + push
REM ===============================

REM Proje dizininde çalışıyor olmalı
cd /d %~dp0

REM Değişiklikleri ekle
git add .

REM Commit mesajı sor
set /p msg="Commit mesajını girin: "

REM Commit yap
git commit -m "%msg%"

REM Push
git push

echo.
echo ✅ Push tamamlandı.
pause