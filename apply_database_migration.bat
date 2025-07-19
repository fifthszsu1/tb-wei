@echo off
echo ========================================
echo 手动执行数据库迁移
echo ========================================

echo.
echo 正在连接到MySQL容器并执行迁移...
echo.

echo 执行推广费用字段迁移...
docker exec -i ecommerce_mysql mysql -u root -ppassword ecommerce_db < mysql/init/07-add-promotion-fields.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 数据库迁移成功完成！
    echo.
    echo 验证新字段...
    docker exec -it ecommerce_mysql mysql -u root -ppassword -e "DESCRIBE product_data_merge;" ecommerce_db | findstr promotion
    echo.
    echo ========================================
    echo 迁移完成！现在可以测试数据汇总功能了
    echo ========================================
) else (
    echo.
    echo ❌ 数据库迁移失败！
    echo 请检查：
    echo 1. MySQL容器是否正在运行
    echo 2. 数据库连接是否正常
    echo 3. SQL文件是否存在错误
    echo.
    echo 手动连接方式：
    echo docker exec -it ecommerce_mysql mysql -u root -ppassword ecommerce_db
    echo.
)

pause 