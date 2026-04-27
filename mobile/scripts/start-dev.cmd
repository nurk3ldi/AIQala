@echo off
cd /d "%~dp0\.."
set EXPO_NO_TELEMETRY=1
npm.cmd run start:lan
