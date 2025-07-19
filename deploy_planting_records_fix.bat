@echo off
echo ========================================
echo 部署种菜表格日期字段修复
echo ========================================

echo.
echo 1. 停止现有服务...
docker-compose down

echo.
echo 2. 重新构建和启动服务...
docker-compose up -d --build

echo.
echo 3. 等待服务启动...
timeout /t 15 /nobreak

echo.
echo 4. 检查服务状态...
docker-compose ps

echo.
echo ========================================
echo 种菜表格日期字段修复完成！
echo ========================================
echo.
echo 🔧 修复内容：
echo   ✓ 修正了日期字段的映射逻辑
echo   ✓ 使用"付款时间/付款日期"作为订单日期
echo   ✓ 正确处理返款日期字段
echo   ✓ 添加了详细的调试日志
echo.
echo 🧪 测试步骤：
echo   1. 访问: http://localhost:8080
echo   2. 使用管理员账户登录 (admin/admin123)
echo   3. 重新上传种菜表格
echo   4. 检查导入的数据中日期字段是否正确
echo.
echo 📋 调试信息：
echo   - 查看后端日志可以看到列名映射信息
echo   - 每个日期字段的解析结果都会输出
echo   - 如果有错误会显示具体原因
echo.
echo 🔍 验证方法：
echo   1. 检查订单日期是否正确（应该是付款时间）
echo   2. 检查返款日期是否正确
echo   3. 确认没有日期字段互相覆盖
echo.
echo ========================================

pause 