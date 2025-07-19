@echo off
echo 正在重启后端服务以应用商品编码清理修改...
echo.

echo 1. 停止当前服务...
docker-compose down

echo 2. 重新构建并启动服务...
docker-compose up -d --build

echo 3. 等待服务启动...
timeout /t 10 /nobreak > nul

echo 4. 检查服务状态...
docker-compose ps

echo.
echo 重启完成！现在可以测试上传苏宁CSV文件。
echo 使用正则表达式提取纯数字：
echo   ="724913632503" 将被清理为 724913632503
echo   ="743653117925" 将被清理为 743653117925
echo   =12345ABCD67890 将被清理为 1234567890
echo 不管什么格式，都只保留最长的数字部分！
echo.
pause 