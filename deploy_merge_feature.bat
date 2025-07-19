@echo off
echo 正在部署merge功能...
echo.

echo 1. 运行数据库迁移，创建merge表...
python migrate_merge_table.py

echo.
echo 2. 重启服务以应用修改...
docker-compose down
docker-compose up -d --build

echo.
echo 3. 等待服务启动...
timeout /t 15 /nobreak > nul

echo.
echo 4. 检查服务状态...
docker-compose ps

echo.
echo ============================================
echo Merge功能部署完成！
echo ============================================
echo.
echo 新功能说明：
echo 1. 创建了 product_data_merge 表
echo 2. 每次上传平台数据后，自动生成merge数据
echo 3. merge数据是 product_data 左连接 product_list 的结果
echo 4. 连接条件：product_data.tmall_product_code = product_list.product_id
echo 5. 同一天重复上传会先清理旧数据
echo.
echo API接口：
echo - GET /api/merge-data - 获取merge数据列表
echo - 支持筛选：platform, upload_date, is_matched
echo.
echo 数据库表：
echo - product_data_merge - 存储merge数据
echo - product_data_merge_view - 方便查询的视图
echo.
echo 现在可以：
echo 1. 上传平台数据测试merge功能
echo 2. 访问 /api/merge-data 查看merge结果
echo 3. 检查 is_matched 字段查看匹配状态
echo.
pause 