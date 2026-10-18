@echo off
cd /d "%~dp0"
echo Starting Eclipse Browser in Live Development mode...
call npm.cmd run dev
