# 主体报表功能完整实现

## 🎯 功能概述

新增了主体报表上传功能，支持导入包含销售、成本、推广、流量、库存、评价等综合数据的报表文件。

## ✨ 核心特性

### 1. 智能上传
- 📅 **日期选择** - 支持选择报表对应的日期
- 📄 **多格式支持** - 支持 .xlsx, .xls, .csv 格式
- 🔄 **重复覆盖** - 同一日期重复上传自动提示覆盖
- 🧠 **智能映射** - 自动识别列名并映射到对应字段

### 2. 自动识别
- 📈 **文件名日期提取** - 从文件名自动提取报表日期
- 🏷️ **列名智能匹配** - 根据关键词自动匹配字段
- 🌐 **多编码支持** - 自动检测文件编码

### 3. 丰富数据支持
- 🛍️ **基础信息** - 商品名称、编码、类目、品牌、供应商、店铺
- 💰 **销售数据** - 销售金额、数量、退款、净销售额
- 📊 **成本利润** - 成本、毛利、毛利率
- 🎯 **推广数据** - 推广费用、点击、展现、ROI
- 🌊 **流量数据** - 访客、浏览量、跳出率、转化率
- 📦 **库存数据** - 库存数量、价值、周转率
- ⭐ **评价数据** - 评价数、好评率、评分

## 🗂️ 数据库结构

### 主表：subject_report
```sql
-- 基础信息
platform, report_date, product_name, product_code, category, brand, supplier_name, shop_name

-- 销售数据
sales_amount, sales_quantity, refund_amount, refund_quantity, net_sales_amount, net_sales_quantity

-- 成本和利润
cost_amount, gross_profit, gross_profit_rate

-- 推广数据
promotion_cost, promotion_clicks, promotion_impressions, promotion_ctr, promotion_cpc, 
promotion_conversion_rate, promotion_roi

-- 流量数据
visitor_count, page_views, bounce_rate, avg_visit_duration, conversion_rate

-- 库存数据
stock_quantity, stock_value, stock_turnover

-- 评价数据
review_count, positive_review_rate, avg_rating

-- 元数据
filename, upload_date, created_at, updated_at, uploaded_by
```

### 视图：subject_report_view
- 包含用户名信息的完整视图
- 便于查询和报表生成

## 🔌 API接口

### POST /api/upload-subject-report
上传主体报表文件
- **参数**: `file` (文件), `upload_date` (日期)
- **支持格式**: .xlsx, .xls, .csv
- **返回**: 上传结果和处理数量

### GET /api/subject-report
获取主体报表数据列表
- **筛选参数**: `platform`, `upload_date`, `report_date`, `supplier_name`
- **分页参数**: `page`, `per_page`
- **返回**: 分页的主体报表数据

## 🎨 前端界面

### 新增上传卡片
- 📱 **响应式设计** - 适配不同屏幕尺寸
- 📅 **日期选择器** - 必选报表日期
- 📁 **拖拽上传** - 支持拖拽文件上传
- ⚡ **实时验证** - 文件和日期都选择后才能上传

### 用户体验优化
- 🔄 **加载状态** - 上传时显示加载动画
- ✅ **成功反馈** - 上传成功后显示详细信息
- ⚠️ **错误处理** - 友好的错误提示
- 🔄 **表单重置** - 上传成功后自动重置表单

## 📋 实现文件

### 1. 数据库相关
- `mysql/init/04-subject-report-table.sql` - 表结构定义
- `migrate_subject_report.py` - 数据库迁移脚本

### 2. 后端代码
- `backend/app.py` - 新增内容：
  - `SubjectReport` 模型
  - `/api/upload-subject-report` 接口
  - `/api/subject-report` 接口
  - `process_subject_report_file()` 函数
  - `get_subject_report_column_mapping()` 函数

### 3. 前端代码
- `frontend/index.html` - 新增主体报表上传卡片
- `frontend/app.js` - 新增内容：
  - `handleSubjectReportUpload()` 函数
  - `updateSubjectReportUploadBtn()` 函数
  - 事件监听器设置
  - 文件选择和拖拽处理

### 4. 部署脚本
- `deploy_subject_report.bat` - 一键部署脚本

## 🚀 部署和使用

### 1. 部署步骤
```bash
# 运行部署脚本
deploy_subject_report.bat

# 或手动执行
python migrate_subject_report.py
docker-compose restart backend
```

### 2. 使用流程
1. 登录系统
2. 在主体报表导入卡片中选择报表日期
3. 上传CSV或Excel文件（支持拖拽）
4. 系统自动识别列名并导入数据
5. 同一日期重复上传会提示是否覆盖

### 3. 列名匹配规则
系统会根据以下关键词自动匹配字段：

**基础字段**
- 商品名称/产品名称 → product_name
- 商品编码/产品编码/商品ID → product_code
- 类目/分类 → category
- 品牌 → brand
- 供应商 → supplier_name
- 店铺 → shop_name

**销售数据**
- 销售金额/销售额 → sales_amount
- 销售数量/销量 → sales_quantity
- 退款金额 → refund_amount
- 净销售额 → net_sales_amount

**推广数据**
- 推广费/广告费 → promotion_cost
- 点击量 → promotion_clicks
- 展现 → promotion_impressions
- ROI → promotion_roi

**更多匹配规则详见代码中的 `get_subject_report_column_mapping()` 函数**

## 📊 数据处理特点

### 1. 智能解析
- 自动检测CSV文件编码（UTF-8、GBK、GB2312等）
- 从文件名提取日期（支持YYYYMMDD格式）
- 跳过空行和无效数据

### 2. 数据验证
- 数值字段自动转换类型
- 百分比格式自动处理
- 错误数据跳过并记录日志

### 3. 存储策略
- 按上传日期分组存储
- 同一日期数据支持覆盖更新
- 保留文件名和上传时间等元数据

## 🔧 技术特点

### 1. 后端技术
- **Flask框架** - RESTful API设计
- **SQLAlchemy** - ORM数据库操作
- **Pandas** - 数据处理和解析
- **智能编码检测** - 支持多种文件编码

### 2. 前端技术
- **Bootstrap** - 响应式UI框架
- **原生JavaScript** - 无依赖实现
- **拖拽上传** - HTML5 File API
- **实时验证** - 动态表单状态管理

### 3. 兼容性
- 支持主流浏览器
- 移动端友好设计
- 中文列名完全支持
- 多种文件格式兼容

## 🎯 未来扩展

### 可能的改进方向
1. **数据可视化** - 添加主体报表数据的图表展示
2. **数据导出** - 支持导出处理后的数据
3. **高级筛选** - 更多筛选和搜索功能
4. **数据对比** - 不同时期数据对比分析
5. **自动报告** - 定期生成数据报告

### 扩展API
- 统计分析接口
- 数据导出接口
- 批量操作接口
- 数据校验接口

---

**完成时间**: 2024年
**版本**: v1.0
**状态**: ✅ 完成并测试通过 