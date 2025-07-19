@echo off
echo ============================================
echo 正在部署主体报表功能...
echo ============================================
echo.

echo 功能说明:
echo - 新增主体报表上传功能
echo - 支持CSV、Excel文件格式
echo - 支持日期选择
echo - 自动识别列名映射
echo - 同一日期重复上传自动覆盖
echo.

echo 1. 运行数据库迁移，创建主体报表表...
python migrate_subject_report.py

if %errorlevel% neq 0 (
    echo 数据库迁移失败，请检查数据库连接和配置
    pause
    exit /b 1
)

echo.
echo 2. 重启后端服务应用修改...
docker-compose restart backend

echo.
echo 3. 等待服务启动...
timeout /t 15 /nobreak > nul

echo.
echo 4. 检查服务状态...
docker-compose ps

echo.
echo ============================================
echo 主体报表功能部署完成！
echo ============================================
echo.
echo 新增功能说明:
echo 1. ✅ 创建了 subject_report 表
echo 2. ✅ 添加了主体报表上传API接口
echo 3. ✅ 更新了前端界面，新增主体报表上传卡片
echo 4. ✅ 实现了智能列名映射
echo 5. ✅ 支持从文件名自动提取日期
echo.
echo 新API接口:
echo - POST /api/upload-subject-report - 上传主体报表
echo - GET  /api/subject-report        - 获取主体报表数据
echo.
echo 支持的字段:
echo 【基础信息】
echo - 商品名称、商品编码、类目、品牌、供应商、店铺
echo.
echo 【销售数据】  
echo - 销售金额、销售数量、退款金额、退款数量、净销售额
echo.
echo 【成本利润】
echo - 成本金额、毛利、毛利率
echo.
echo 【推广数据】
echo - 推广费用、点击量、展现量、点击率、转化率、ROI
echo.
echo 【流量数据】
echo - 访客数、浏览量、跳出率、访问时长、转化率
echo.
echo 【库存数据】
echo - 库存数量、库存价值、库存周转率
echo.
echo 【评价数据】
echo - 评价数、好评率、平均评分
echo.
echo 使用步骤:
echo 1. 登录系统
echo 2. 在主体报表导入卡片中选择日期
echo 3. 上传CSV或Excel文件
echo 4. 系统自动识别列名并导入数据
echo 5. 同一日期重复上传会提示是否覆盖
echo.
echo 列名匹配规则:
echo - 系统会根据列名中的关键词自动匹配字段
echo - 支持中文列名的模糊匹配
echo - 如果匹配不准确，可以手动调整CSV文件的列名
echo.
pause 