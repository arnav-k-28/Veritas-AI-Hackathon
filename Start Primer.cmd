@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0backend\start_primer.ps1"
if errorlevel 1 pause
