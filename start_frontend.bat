@echo off
title Zoom Clone Frontend
cd /d %~dp0frontend
if not exist node_modules (npm install)
npm run dev
pause
