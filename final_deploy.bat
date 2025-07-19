@echo off
echo ============================================
echo 正在部署Merge功能...
echo ============================================
echo.

echo 选择部署方式：
echo 1. 使用Python迁移脚本
echo 2. 使用Docker容器执行SQL
echo 3. 手动执行SQL文件
echo.

set /p choice="请选择 (1-3): "

if "%choice%"=="1" (
    echo.
    echo 方式1: 使用Python迁移脚本
    echo ----------------------------------------
    echo 正在运行Python迁移脚本...
    python migrate_merge_table.py
    if %errorlevel% neq 0 (
        echo Python脚本执行失败，请尝试其他方式
        pause
        exit /b 1
    )
) else if "%choice%"=="2" (
    echo.
    echo 方式2: 使用Docker容器执行SQL
    echo ----------------------------------------
    echo 复制SQL文件到容器...
    docker cp simple_merge_table.sql ecommerce_mysql:/tmp/merge.sql
    
    echo 在容器中执行SQL...
    docker exec ecommerce_mysql mysql -u root -prootpassword ecommerce_data < /tmp/merge.sql
    
    echo 验证表创建...
    docker exec ecommerce_mysql mysql -u root -prootpassword ecommerce_data -e "SHOW TABLES LIKE 'product_data_merge'"
) else if "%choice%"=="3" (
    echo.
    echo 方式3: 手动执行SQL文件
    echo ----------------------------------------
    echo 请手动执行以下步骤：
    echo 1. 连接到数据库
    echo 2. 执行 simple_merge_table.sql 文件
    echo 3. 验证表创建成功
    echo.
    pause
) else (
    echo 无效选择，退出
    pause
    exit /b 1
)

echo.
echo ============================================
echo 重启后端服务...
echo ============================================
docker-compose restart backend

echo.
echo 等待服务启动...
timeout /t 10 /nobreak > nul

echo.
echo 检查服务状态...
docker-compose ps

echo.
echo ============================================
echo 部署完成！
echo ============================================
echo.
echo 功能说明：
echo 1. 创建了 product_data_merge 表
echo 2. 每次上传平台数据后自动生成merge数据
echo 3. 左连接条件：product_data.tmall_product_code = product_list.product_id
echo 4. 同一天重复上传会自动清理旧数据
echo.
echo 新API接口：
echo - GET /api/merge-data
echo - 支持筛选：platform, upload_date, is_matched
echo.
echo 测试步骤：
echo 1. 上传产品总表
echo 2. 上传平台数据
echo 3. 查看merge结果
echo.
pause 