@echo off
chcp 65001 >nul
title 三国：新霸王大陆 - 一键启动

echo ==========================================
echo 三国：新霸王大陆 - 一键启动
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo 未检测到 Node.js。
  echo 请先安装 Node.js 后再双击 start.bat。
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo 未检测到 npm。
  echo 请检查 Node.js 是否正确安装。
  pause
  exit /b 1
)

if not exist node_modules (
  echo 未发现 node_modules，正在执行 npm install...
  echo 如果下载较慢，请确认 .npmrc 已使用 npmmirror 国内镜像。
  npm install
  if errorlevel 1 (
    echo.
    echo npm install 失败。
    echo 请检查：1. Node.js 是否已安装；2. 网络是否正常；3. npm 镜像源是否可用。
    echo 可尝试执行：npm config set registry https://registry.npmmirror.com
    pause
    exit /b 1
  )
)

echo.
echo 依赖已就绪，正在启动游戏...
echo 请在浏览器打开终端提示的本地地址。
npm run dev
pause
