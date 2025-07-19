@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

REM 电商数据管理系统 - 生产环境部署脚本 (Windows)

echo ===================================
echo   E-commerce Data Management System - Production Deploy
echo ===================================
echo.

REM 检查Docker
echo Checking Docker environment...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Docker not installed, please install Docker first
    echo Installation guide: https://docs.docker.com/get-docker/
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Docker Compose not installed, please install Docker Compose first
    echo Installation guide: https://docs.docker.com/compose/install/
    pause
    exit /b 1
)

echo ✅ Docker environment check passed

REM 检查必要目录
echo Checking data directories...
if not exist "data" mkdir data
if not exist "data\mysql" mkdir data\mysql
if not exist "data\uploads" mkdir data\uploads
if not exist "nginx\ssl" mkdir nginx\ssl
echo ✅ Data directories prepared

REM 停止现有服务
echo Stopping existing services...
docker-compose down --remove-orphans

REM 选择镜像源
echo Please select mirror source:
echo 1) International mirror (docker.io)
echo 2) China mirror (Aliyun)
set /p mirror_choice="Please select (1/2) [default: 1]: "

REM 设置环境变量
if "!mirror_choice!" == "2" (
    echo Using China mirror...
    set USE_CHINA_MIRROR=true
    set MYSQL_IMAGE=registry.cn-hangzhou.aliyuncs.com/library/mysql:8.0
) else (
    echo Using international mirror...
    set USE_CHINA_MIRROR=false
    set MYSQL_IMAGE=mysql:8.0
)

REM 询问是否清理旧镜像
set /p cleanup="Clean up old Docker images? (y/N): "
if /i "!cleanup!" == "y" (
    echo Cleaning up old images...
    docker system prune -f
    docker image prune -f
)

REM 构建并启动服务
echo Building and starting services...
docker-compose build --no-cache
docker-compose up -d

REM 等待服务启动
echo Waiting for services to start...
timeout /t 10 /nobreak > nul

REM 检查服务状态
echo Checking service status...
docker-compose ps

REM 等待MySQL初始化完成
echo Waiting for MySQL initialization...
set attempt=0
set max_attempts=30

:mysql_wait_loop
set /a attempt+=1
docker-compose exec -T mysql mysqladmin ping -h localhost --silent >nul 2>&1
if !errorlevel! == 0 (
    echo ✅ MySQL started successfully
    goto mysql_ready
)
if !attempt! geq !max_attempts! (
    echo ❌ MySQL startup timeout
    pause
    exit /b 1
)
echo ⏳ Waiting for MySQL startup... (!attempt!/!max_attempts!)
timeout /t 2 /nobreak > nul
goto mysql_wait_loop

:mysql_ready

REM 检查应用健康状态
echo Checking application health...
timeout /t 5 /nobreak > nul

REM 检查前端
curl -f http://localhost/health >nul 2>&1
if !errorlevel! == 0 (
    echo ✅ Frontend service is healthy
) else (
    echo ⚠️  Frontend service may not be ready
)

REM 检查后端
curl -f http://localhost/api/platforms >nul 2>&1
if !errorlevel! == 0 (
    echo ✅ Backend service is healthy
) else (
    echo ⚠️  Backend service may not be ready
)

echo.
echo ===================================
echo           Deployment Complete!
echo ===================================
echo.
echo 🌐 Access URLs:
echo    Frontend: http://localhost
echo    Backend API: http://localhost/api
echo    MySQL: localhost:3306
echo.
echo 👤 Default Accounts:
echo    Admin: admin / admin123
echo    User: user / user123
echo.
echo 📁 Data Directories:
echo    MySQL data: .\data\mysql
echo    Upload files: .\data\uploads
echo.
echo 🔧 Common Commands:
echo    View logs: docker-compose logs -f
echo    Stop services: docker-compose down
echo    Restart services: docker-compose restart
echo    Check status: docker-compose ps
echo.
echo 🔒 Security Reminders:
echo    1. Please change default passwords
echo    2. Please change SECRET_KEY in docker-compose.prod.yml
echo    3. Consider configuring SSL certificates for production
echo.
echo ===================================
echo.
pause 