@echo off
setlocal
py -3 -c "import sys" >nul 2>&1
if not errorlevel 1 goto use_py
python -c "import sys" >nul 2>&1
if not errorlevel 1 goto use_python
echo Error: install Python 3.11 or newer and add it to PATH. 1>&2
exit /b 1

:use_py
py -3 "%~dp0start.py" %*
exit /b %errorlevel%

:use_python
python "%~dp0start.py" %*
exit /b %errorlevel%
