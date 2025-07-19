@echo off
echo ========================================
echo 部署数据汇总功能（前端+后端完整版）
echo ========================================

echo.
echo 1. 停止现有服务...
docker-compose down

echo.
echo 2. 应用数据库迁移...
echo 正在添加推广费用汇总字段到数据库...

echo.
echo 3. 重新构建和启动服务...
docker-compose up -d --build

echo.
echo 4. 等待服务启动...
timeout /t 20 /nobreak

echo.
echo 5. 检查服务状态...
docker-compose ps

echo.
echo ========================================
echo 数据汇总功能部署完成！
echo ========================================
echo.
echo 🎉 新功能特性：
echo.
echo 📊 前端界面：
echo   ✓ 新增"数据汇总"TAB菜单
echo   ✓ 日期选择器和汇总计算按钮  
echo   ✓ 实时计算结果显示
echo   ✓ 场景费用分布统计表格
echo   ✓ 详细的错误信息展示
echo.
echo 🔧 后端功能：
echo   ✓ 数据存在性检查（智能提醒用户上传对应数据）
echo   ✓ product_data_merge LEFT JOIN subject_report
echo   ✓ 根据场景名称自动分配推广费用：
echo     - 全站推广 → sitewide_promotion
echo     - 关键词推广 → keyword_promotion  
echo     - 货品运营 → product_operation
echo     - 人群推广 → crowd_promotion
echo     - 超级短视频 → super_short_video
echo     - 多目标直投 → multi_target_direct
echo.
echo 🚨 智能数据检查：
echo   - 如果缺少商品数据 → 提示上传商品排行日报
echo   - 如果缺少主体报表 → 提示上传主体报表数据
echo   - 匹配条件：相同日期 + 相同产品编码
echo.
echo 🔗 访问地址：
echo   主系统: http://localhost:8080
echo   API接口: http://localhost:5000/api/calculate-promotion-summary
echo.
echo 👤 权限说明：
echo   - 只有管理员用户可以执行数据汇总计算
echo   - 普通用户可以查看但无法执行汇总操作
echo.
echo 📝 使用说明：
echo   1. 确保已上传商品排行数据（苏宁/天猫等平台数据）
echo   2. 确保已上传对应日期的主体报表数据
echo   3. 使用管理员账户登录系统
echo   4. 点击"数据汇总"TAB，选择日期并执行计算
echo   5. 查看计算结果和费用分布统计
echo.
echo ========================================

pause 