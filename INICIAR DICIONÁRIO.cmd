@echo off
title Dicionario Contabil - Grupo Inove
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\servidor-local.ps1"
if errorlevel 1 (
  echo.
  echo Nao foi possivel iniciar o Dicionario Contabil.
  echo Consulte o arquivo README.md para outras formas de execucao.
  echo.
  pause
)
