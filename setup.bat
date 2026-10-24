@echo off
setlocal enabledelayedexpansion
title YouTube247 - Setup ^& Environment Configurator
color 0C

echo ==============================================================================
echo                 __     __            _____           _           ___  _  _   _____ 
echo                 \ \   / /           |_   _|         | |         |__ \| || | |___  ^|
echo                  \ \_/ /___  _   _    | |  _   _ ___| |_ ___  _ __ ) | || |_   / / 
echo                   \   // _ \| | | |   | | | | | / __| __/ _ \| '__/ /|__   _| / /  
echo                    ^| ^|^| (_) ^| ^|_^| ^|   ^| ^| ^| ^|_^| \__ \ ^|^| (_) ^| ^|  / /_   ^| ^|  / /   
echo                    ^|_^| \___/ \__,_^|   ^|_^|  \__,_^|___/\__\___/^|_^| ^|____^|  ^|_^| /_/    
echo ==============================================================================
echo                Continuous 24/7 YouTube Live Streaming Engine
echo ==============================================================================
echo.

:: 1. Check for Node.js
echo [*] Checking for Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is NOT installed or not found in system PATH.
    echo Please install Node.js (v18+) from: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js is installed.
echo.

:: 2. Check for FFmpeg
echo [*] Checking for FFmpeg...
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] FFmpeg was not detected in PATH.
    echo Attempting to check if winget is available to install FFmpeg...
    winget --version >nul 2>&1
    if %errorlevel% equ 0 (
        set /p installFfmpeg="Would you like to auto-install FFmpeg via winget? (y/n): "
        if /i "!installFfmpeg!"=="y" (
            winget install -e --id Gyan.FFmpeg
            echo [!] Please restart this script after FFmpeg installation finishes.
            pause
            exit /b 0
        )
    )
    echo [!] Note: On a Linux VPS, FFmpeg is installed with: sudo apt install -y ffmpeg
) else (
    echo [OK] FFmpeg is installed and ready.
)
echo.

:: 3. Install Node.js dependencies
echo [*] Installing NPM dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install npm dependencies.
    pause
    exit /b 1
)
echo [OK] Dependencies installed successfully.
echo.

:: 4. Configure .env file
echo ==============================================================================
echo                     YOUTUBE STREAM CONFIGURATION (.env)
echo ==============================================================================

set "RECONFIGURE=y"
if exist ".env" (
    echo [.env file already exists]
    set /p reconf="Do you want to re-enter your YouTube Stream Key? (y/n, default: n): "
    if /i "!reconf!" neq "y" (
        set "RECONFIGURE=n"
    )
)

if /i "%RECONFIGURE%"=="y" (
    echo.
    echo Get your stream key from YouTube Studio:
    echo   https://studio.youtube.com -> Go Live -> Stream
    echo.
    set /p streamKey="Enter your YouTube Stream Key: "
    
    if "!streamKey!"=="" (
        echo [ERROR] Stream key cannot be empty!
        pause
        exit /b 1
    )

    echo.
    echo Ingest Server URL options:
    echo   1. Primary (Default): rtmp://a.rtmp.youtube.com/live2
    echo   2. Backup / Mobile:   rtmp://x.rtmp.youtube.com/live2
    set /p urlChoice="Select option (1 or 2, default: 1): "
    
    set "streamUrl=rtmp://a.rtmp.youtube.com/live2"
    if "!urlChoice!"=="2" (
        set "streamUrl=rtmp://x.rtmp.youtube.com/live2"
    )

    echo.
    echo Select Stream Resolution Profile:
    echo   1. vertical-720p  (720x1280 - YouTube Shorts 9:16 Vertical, VPS-Friendly)
    echo   2. vertical-1080p (1080x1920 - Full HD YouTube Shorts 9:16 Vertical)
    echo   3. 720p           (1280x720 - Standard Horizontal)
    echo   4. 1080p          (1920x1080 - Full HD Horizontal)
    set /p profChoice="Select profile (1-4, default: 1): "

    set "profileName=vertical-720p"
    if "!profChoice!"=="2" set "profileName=vertical-1080p"
    if "!profChoice!"=="3" set "profileName=720p"
    if "!profChoice!"=="4" set "profileName=1080p"

    :: Write .env
    (
        echo # YouTube 24/7 Live Engine Configuration ^(LOCAL - DO NOT COMMIT TO GIT^)
        echo YOUTUBE_STREAM_URL=!streamUrl!
        echo YOUTUBE_STREAM_KEY=!streamKey!
        echo STREAM_PROFILE=!profileName!
        echo MEDIA_DIR=./media
        echo SHUFFLE_PLAYLIST=false
        echo RECONNECT_DELAY_MS=3000
    ) > .env

    echo.
    echo [OK] .env configuration saved successfully!
)

echo.
echo [*] Running Diagnostics Check...
call npm run doctor

echo.
echo ==============================================================================
echo                        SETUP COMPLETE!
echo ==============================================================================
echo - To download videos:    npm run download ^<youtube-url^>
echo - To normalize videos:   npm run normalize
echo - To launch 24/7 stream: npm start (or double-click start.bat)
echo ==============================================================================
echo.

set /p launchNow="Would you like to start the stream now? (y/n, default: y): "
if /i "!launchNow!"=="" set "launchNow=y"
if /i "!launchNow!"=="y" (
    call npm start
)

pause
