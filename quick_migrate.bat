@echo off
echo 正在执行数据库迁移...
echo.

echo 1. 检查Docker服务状态...
docker ps

echo.
echo 2. 复制SQL文件到数据库容器...
docker cp mysql/init/03-merge-table.sql ecommerce_mysql:/tmp/migrate.sql

echo.
echo 3. 在数据库容器中执行SQL...
docker exec ecommerce_mysql mysql -u root -ppassword ecommerce_db -e "source /tmp/migrate.sql"

echo.
echo 4. 验证表是否创建成功...
docker exec ecommerce_mysql mysql -u root -ppassword ecommerce_db -e "SHOW TABLES LIKE 'product_data_merge'"

echo.
echo 5. 显示表结构...
docker exec ecommerce_mysql mysql -u root -ppassword ecommerce_db -e "DESCRIBE product_data_merge"

echo.
echo 6. 重启后端服务应用修改...
docker-compose restart backend

echo.
echo 7. 等待服务启动...
timeout /t 10 /nobreak > nul

echo.
echo 8. 检查服务状态...
docker-compose ps

echo.
echo ============================================
echo 迁移完成！
echo ============================================
echo.
echo 现在您可以：
echo 1. 上传平台数据测试merge功能
echo 2. 使用API /api/merge-data 查看结果
echo 3. 运行 python test_merge_feature.py 进行测试
echo.
pause 