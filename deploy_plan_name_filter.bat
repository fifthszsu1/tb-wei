@echo off
chcp 65001
echo 部署主体报表计划名称过滤功能
echo ===============================================

echo 1. 运行数据库迁移...
python migrate_plan_name.py

if %errorlevel% neq 0 (
    echo 数据库迁移失败！
    pause
    exit /b 1
)

echo.
echo 2. 重启后端服务...
docker-compose restart backend

if %errorlevel% neq 0 (
    echo 后端服务重启失败！
    pause
    exit /b 1
)

echo.
echo ===============================================
echo ✓ 部署完成！
echo.
echo 主体报表数据导入现在会自动过滤计划名称，只保留包含以下关键字的记录：
echo - 五更
echo - 希臻  
echo - 谦易律哲
echo.
echo 如果没有找到计划名称列，将导入所有数据
echo ===============================================
pause 