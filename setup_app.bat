@echo off
chcp 65001 >nul
title SIPATOKAAN - Dinas Pangan Kota Manado (Setup App)
color 0A

echo ===============================================================================
echo     SISTEM INFORMASI PANGAN KOTA MANADO (SI PATOKAAN)
echo     DINAS PANGAN PEMERINTAH KOTA MANADO
echo     Skrip Otomasi Pemasangan & Konfigurasi Aplikasi (Setup App)
echo ===============================================================================
echo.

:: 1. Pemeriksaan Lingkungan Sistem
echo [*] Memeriksa dependensi sistem...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] PERINGATAN: Node.js tidak ditemukan pada sistem!
    echo     Silakan unduh dan pasang Node.js LTS terlebih dahulu: https://nodejs.org/
    pause
    exit /b
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] PERINGATAN: npm tidak ditemukan pada sistem!
    pause
    exit /b
)

echo [V] Node.js dan npm terdeteksi normal.
echo.

:: 2. Pilihan Menu Operasi
:MENU_UTAMA
echo ===============================================================================
echo   PILIH TINDAKAN SETUP:
echo   [1] Pasang Seluruh Dependensi (Backend, Website, Mobile)
echo   [2] Buat & Inisialisasi Database PostgreSQL Mandiri (sipatokaan_db)
echo   [3] Kompilasi Aset Website (Build Production)
echo   [4] Jalankan Server API Backend Mandiri
echo   [5] Setup Penuh Otomatis (Langkah 1, 2, 3, dan 4)
echo   [0] Keluar
echo ===============================================================================
set /p PILIHAN="Masukkan nomor pilihan [0-5]: "

if "%PILIHAN%"=="1" goto PASANG_DEPENDENSI
if "%PILIHAN%"=="2" goto SETUP_DATABASE
if "%PILIHAN%"=="3" goto BUILD_WEBSITE
if "%PILIHAN%"=="4" goto JALANKAN_BACKEND
if "%PILIHAN%"=="5" goto SETUP_SEMUA
if "%PILIHAN%"=="0" goto KELUAR
goto MENU_UTAMA

:: --- SUBROUTINE: PASANG DEPENDENSI ---
:PASANG_DEPENDENSI
echo.
echo ===============================================================================
echo [*] Memasang dependensi Node.js di folder Backend, Website, dan Mobile...
echo ===============================================================================
echo [1/3] Memasang modul backend...
cd backend && call npm install && cd ..
echo [2/3] Memasang modul website...
cd website && call npm install && cd ..
echo [3/3] Memasang modul mobile...
cd mobile && call npm install && cd ..
echo [V] Pemasangan dependensi selesai.
echo.
if "%PILIHAN%"=="5" goto SETUP_DATABASE
goto MENU_UTAMA

:: --- SUBROUTINE: SETUP DATABASE ---
:SETUP_DATABASE
echo.
echo ===============================================================================
echo [*] Inisialisasi Database PostgreSQL Mandiri...
echo ===============================================================================
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Perintah 'psql' tidak terdeteksi di PATH sistem.
    echo     Jika PostgreSQL terpasang di lokasi standar (misal: C:\Program Files\PostgreSQL\16\bin),
    echo     pastikan folder bin PostgreSQL telah ditambahkan ke Environment PATH.
    echo.
    echo     Alternatif: Anda dapat mengimpor file SQL skema secara manual via pgAdmin 4:
    echo     Berkas: backend\database\setup_postgresql_mandiri.sql
    echo.
    pause
    if "%PILIHAN%"=="5" goto BUILD_WEBSITE
    goto MENU_UTAMA
)

set DB_HOST=localhost
set DB_PORT=5432
set DB_USER=postgres
set DB_NAME=sipatokaan_db

set /p INPUT_USER="Masukkan username PostgreSQL [default: %DB_USER%]: "
if not "%INPUT_USER%"=="" set DB_USER=%INPUT_USER%

set /p INPUT_DB="Masukkan nama basis data [default: %DB_NAME%]: "
if not "%INPUT_DB%"=="" set DB_NAME=%INPUT_DB%

echo [*] Membuat basis data '%DB_NAME%'...
psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -c "CREATE DATABASE \"%DB_NAME%\";" 2>nul
echo [*] Mengimpor skema tabel, akun resmi, dan master data pangan...
psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d "%DB_NAME%" -f "backend\database\setup_postgresql_mandiri.sql"

echo [V] Database PostgreSQL mandiri siap digunakan!
echo.
if "%PILIHAN%"=="5" goto BUILD_WEBSITE
goto MENU_UTAMA

:: --- SUBROUTINE: BUILD WEBSITE ---
:BUILD_WEBSITE
echo.
echo ===============================================================================
echo [*] Mengompilasi Website SIPATOKAAN (Vite Production Build)...
echo ===============================================================================
cd website && call npm run build && cd ..
echo [V] Kompilasi aset website berhasil disimpan di folder 'website\dist'.
echo.
if "%PILIHAN%"=="5" goto JALANKAN_BACKEND
goto MENU_UTAMA

:: --- SUBROUTINE: JALANKAN BACKEND ---
:JALANKAN_BACKEND
echo.
echo ===============================================================================
echo [*] Menjalankan Server API Backend SIPATOKAAN...
echo ===============================================================================
cd backend
if not exist .env (
    echo [*] Membuat berkas konfigurasi .env otomatis...
    (
        echo PORT=5000
        echo JWT_SECRET=sipatokaan_kunci_rahasia_kedinasan_pemerintah_kota_manado_2026
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DB_USER=postgres
        echo DB_NAME=sipatokaan_db
    ) > .env
)
echo [*] Server berjalan pada: http://localhost:5000
echo [*] Tekan Ctrl+C untuk menghentikan server.
echo.
call npm start
cd ..
goto MENU_UTAMA

:: --- SUBROUTINE: SETUP SEMUA ---
:SETUP_SEMUA
goto PASANG_DEPENDENSI

:KELUAR
echo [*] Menutup skrip setup. Semoga sukses dengan penyerahan proyek SIPATOKAAN!
exit /b

