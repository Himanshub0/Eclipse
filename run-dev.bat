@echo off
cd /d "%~dp0"
echo Starting Project Browser in Live Development mode...
call npm.cmd run dev
