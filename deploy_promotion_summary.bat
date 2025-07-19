@echo off
echo ========================================
echo 部署推广费用汇总计算功能
echo ========================================

echo.
echo 1. 停止现有服务...
docker-compose down

echo.
echo 2. 应用数据库迁移...
echo 正在为product_data_merge表添加推广费用字段...

echo.
echo 3. 重新构建和启动服务...
docker-compose up -d --build

echo.
echo 4. 等待服务启动...
timeout /t 15 /nobreak

echo.
echo 5. 检查服务状态...
docker-compose ps

echo.
echo ========================================
echo 推广费用汇总功能部署完成！
echo ========================================
echo.
echo 新功能说明：
echo - 为product_data_merge表添加了推广费用字段：
echo   * sitewide_promotion (全站推广费用)
echo   * keyword_promotion (关键词推广费用)
echo   * product_operation (货品运营费用)
echo   * crowd_promotion (人群推广费用)
echo   * super_short_video (超级短视频费用)
echo   * multi_target_direct (多目标直投费用)
echo.
echo - 新增API接口：POST /api/calculate-promotion-summary
echo   * 接收参数：{"target_date": "YYYY-MM-DD"}
echo   * 执行汇总计算逻辑，根据场景名称分配推广费用
echo.
echo 访问地址: http://localhost:8080
echo API测试地址: http://localhost:5000/api/calculate-promotion-summary
echo ========================================

pause 