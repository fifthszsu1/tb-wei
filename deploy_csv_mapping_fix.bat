@echo off
chcp 65001
echo 部署主体报表CSV列名映射修复
echo ===============================================

echo 1. 运行数据库迁移（添加plan_name字段）...
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
echo 主要更新内容：
echo - 改进了CSV列名映射逻辑，支持更多列名变体
echo - 添加了调试信息，便于排查映射问题
echo - 新增了计划名称过滤功能
echo - 支持的关键词更加全面
echo.
echo 过滤规则：
echo - 五更
echo - 希臻  
echo - 谦易律哲
echo.
echo 请查看 CSV_COLUMN_MAPPING.md 了解详细的列名映射规则
echo ===============================================
pause 