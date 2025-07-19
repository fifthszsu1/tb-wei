@echo off
echo ========================================
echo 重建数据库（包含所有迁移）
echo ========================================

echo.
echo ⚠️  警告：此操作将删除所有现有数据！
echo.
set /p confirm="确定要继续吗？输入 YES 继续，其他任意键取消: "

if /i "%confirm%" NEQ "YES" (
    echo 操作已取消
    pause
    exit /b
)

echo.
echo 1. 停止服务...
docker-compose down

echo.
echo 2. 删除数据库数据卷...
docker volume ls | findstr ecommerce
if exist "data\mysql" (
    echo 删除本地数据目录...
    rmdir /s /q "data\mysql"
)

echo.
echo 3. 重新创建并启动服务...
docker-compose up -d --build

echo.
echo 4. 等待数据库初始化（这可能需要几分钟）...
timeout /t 30 /nobreak

echo.
echo 5. 检查服务状态...
docker-compose ps

echo.
echo 6. 验证数据库表结构...
docker exec -it ecommerce_mysql mysql -u root -ppassword -e "SHOW TABLES;" ecommerce_db
echo.
docker exec -it ecommerce_mysql mysql -u root -ppassword -e "DESCRIBE product_data_merge;" ecommerce_db | findstr promotion

echo.
echo ========================================
echo 数据库重建完成！
echo ========================================
echo.
echo 📋 重建内容：
echo   ✓ 删除了所有旧数据
echo   ✓ 重新执行了所有初始化脚本
echo   ✓ 包含了最新的推广费用字段
echo.
echo 🎯 下一步：
echo   1. 重新上传你的数据文件
echo   2. 测试数据汇总功能
echo.

pause 