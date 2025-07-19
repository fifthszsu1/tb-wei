@echo off
echo ========================================
echo 部署和测试数据汇总功能修复
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
echo 前端数据汇总功能修复完成！
echo ========================================
echo.
echo 🔧 修复内容：
echo   ✓ 将事件监听器设置移至 showMainApp() 函数
echo   ✓ 在 showPage('summary') 时重新设置事件监听器
echo   ✓ 添加了详细的调试信息和错误处理
echo   ✓ 防止重复绑定事件监听器
echo   ✓ 确保全局函数正确导出
echo.
echo 🧪 测试步骤：
echo   1. 访问: http://localhost:8080
echo   2. 使用管理员账户登录 (admin/admin123)
echo   3. 点击"数据汇总"TAB
echo   4. 打开浏览器开发者工具查看控制台日志
echo   5. 选择日期并点击"开始计算汇总"按钮
echo   6. 观察控制台是否有相关调试信息
echo.
echo 🔍 调试信息：
echo   - 查看控制台日志确认事件监听器设置成功
echo   - 确认 handleCalculateSummary 函数被正确调用
echo   - 验证API请求是否发出
echo.
echo 🚨 如果仍有问题，请：
echo   1. 清除浏览器缓存并重新加载页面
echo   2. 检查浏览器控制台的错误信息
echo   3. 确认所有DOM元素都正确加载
echo.
echo ========================================

pause 