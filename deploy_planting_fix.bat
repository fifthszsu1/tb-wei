@echo off
echo ========================================
echo 部署种菜表格多Tab处理修复
echo ========================================

echo.
echo 1. 停止现有服务...
docker-compose down

echo.
echo 2. 重新构建和启动服务...
docker-compose up -d --build

echo.
echo 3. 等待服务启动...
timeout /t 10 /nobreak

echo.
echo 4. 检查服务状态...
docker-compose ps

echo.
echo ========================================
echo 修复部署完成！
echo ========================================
echo.
echo 现在可以重新导入种菜表格数据，所有Tab都会被处理：
echo - 吴腾飞: 预计导入 1222 条记录
echo - 覃天龙: 预计导入 394 条记录  
echo - 外包: 预计导入 279 条记录
echo.
echo 访问地址: http://localhost:8080
echo ========================================

pause 