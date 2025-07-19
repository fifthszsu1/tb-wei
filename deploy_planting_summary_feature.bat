@echo off
echo ========================================
echo 部署种菜汇总功能
echo ========================================

echo.
echo 1. 停止现有服务...
docker-compose down

echo.
echo 2. 应用数据库迁移...
docker-compose up -d mysql
timeout /t 10 /nobreak
docker cp mysql/init/08-add-planting-summary-fields.sql tb_mysql:/tmp/
docker exec tb_mysql mysql -u root -ppassword ecommerce_db -e "source /tmp/08-add-planting-summary-fields.sql"

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
echo 种菜汇总功能部署完成！
echo ========================================
echo.
echo 🔧 新增功能：
echo   ✓ 添加了种菜汇总计算API
echo   ✓ 添加了新的数据库字段
echo   ✓ 添加了性能优化索引
echo.
echo 🧪 测试步骤：
echo   1. 访问: http://localhost:8080
echo   2. 使用管理员账户登录
echo   3. 上传种菜表格和商品排行日报
echo   4. 使用汇总功能计算数据
echo.
echo 📋 数据库更改：
echo   - planting_orders: 匹配订单数
echo   - planting_amount: 订单总金额
echo   - planting_cost: 佣金总额
echo   - planting_logistics_cost: 物流成本
echo   - planting_deduction: 扣款金额
echo.
echo 🔍 验证方法：
echo   1. 检查数据库中的新字段是否正确添加
echo   2. 验证汇总计算结果是否正确
echo   3. 确认日期验证逻辑是否正常工作
echo.
echo ========================================

pause 