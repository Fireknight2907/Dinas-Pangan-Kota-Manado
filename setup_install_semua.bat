@echo off
chcp 65001 >nul
title Setup & Instalasi Dependensi - SI PATOKAAN Dinas Pangan Manado
cls

echo ===============================================================================
echo        SISTEM INFORMASI KETERSEDIAAN DAN KETAHANAN PANGAN (SI PATOKAAN)
echo                           DINAS PANGAN KOTA MANADO
echo ===============================================================================
echo.
echo Sedang menyiapkan instalasi seluruh dependensi proyek:
echo  1. Backend API Server (Node.js & Express)
echo  2. Website Portal Publik & Dashboard Petugas (React.js & Vite)
echo  3. Aplikasi Mobile Petugas & Warga (Vue 3, Ionic & Capacitor)
echo.
echo ===============================================================================
echo.

:: 1. Pemeriksaan Ketersediaan Node.js dan NPM
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js tidak ditemukan di sistem ini!
    echo Silakan install Node.js (versi 18 LTS atau 20 LTS) terlebih dahulu dari https://nodejs.org
    echo.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] NPM (Node Package Manager) tidak ditemukan!
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js terdeteksi: 
node -v
echo [OK] NPM terdeteksi: 
call npm -v
echo.
echo -------------------------------------------------------------------------------
echo [LANGKAH 1/3] Menginstal dependensi Backend (Node.js + Express)...
echo -------------------------------------------------------------------------------
if exist "backend\package.json" (
    cd backend
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [PERINGATAN] Terjadi kendala saat menginstal dependensi backend.
    ) else (
        echo [SUKSES] Dependensi backend berhasil diinstal!
    )
    cd ..
) else (
    echo [LEWATI] Direktori backend\package.json tidak ditemukan.
)

echo.
echo -------------------------------------------------------------------------------
echo [LANGKAH 2/3] Menginstal dependensi Website Portal (React + Vite)...
echo -------------------------------------------------------------------------------
if exist "website\package.json" (
    cd website
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [PERINGATAN] Terjadi kendala saat menginstal dependensi website.
    ) else (
        echo [SUKSES] Dependensi website berhasil diinstal!
    )
    cd ..
) else (
    echo [LEWATI] Direktori website\package.json tidak ditemukan.
)

echo.
echo -------------------------------------------------------------------------------
echo [LANGKAH 3/3] Menginstal dependensi Aplikasi Mobile (Vue 3 + Ionic + Capacitor)...
echo -------------------------------------------------------------------------------
if exist "mobile\package.json" (
    cd mobile
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [PERINGATAN] Terjadi kendala saat menginstal dependensi mobile.
    ) else (
        echo [SUKSES] Dependensi aplikasi mobile berhasil diinstal!
    )
    cd ..
) else (
    echo [LEWATI] Direktori mobile\package.json tidak ditemukan.
)

echo.
echo ===============================================================================
echo [SELESAI] Seluruh dependensi SI PATOKAAN telah selesai diinstal!
echo.
echo Perintah Menjalankan Aplikasi:
echo  - Menjalankan Backend : cd backend ^&^& npm start
echo  - Menjalankan Website : cd website ^&^& npm run dev
echo  - Menjalankan Mobile  : cd mobile ^&^& npm run dev
echo ===============================================================================
echo.
pause

