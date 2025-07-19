# Merge功能实现总结

## 功能概述

新增了一个merge表功能，用于将`product_data`表和`product_list`表进行左连接，连接条件为：
```sql
product_data.tmall_product_code = product_list.product_id
```

## 核心特性

### 1. 自动触发
- 每次上传平台数据成功后，自动处理merge数据
- 无需手动操作，完全自动化

### 2. 数据清理逻辑
- 如果当天重复上传平台数据，会先删除当天的merge数据
- 确保数据一致性，避免重复数据

### 3. 左连接逻辑
- 所有product_data记录都会被包含在merge表中
- 如果找到匹配的product_list记录，会填充相关字段
- 如果没有找到匹配，product_list相关字段为null
- 使用`is_matched`字段标记是否成功匹配

## 数据库结构

### 主表：product_data_merge
```sql
-- 来自product_data的所有字段
product_data_id, platform, product_name, tmall_product_code, tmall_supplier_name,
visitor_count, page_views, search_guided_visitors, add_to_cart_count, favorite_count,
payment_amount, payment_product_count, payment_buyer_count, search_guided_payment_buyers,
unit_price, visitor_average_value, payment_conversion_rate, order_conversion_rate,
avg_stay_time, detail_page_bounce_rate, order_payment_conversion_rate, 
search_payment_conversion_rate, refund_amount, refund_ratio,
filename, upload_date, uploaded_by,

-- 来自product_list的字段
product_list_id, product_list_name, listing_time, 
product_list_created_at, product_list_updated_at, product_list_uploaded_by,

-- 元数据
is_matched, created_at, updated_at
```

### 视图：product_data_merge_view
- 包含用户名信息的完整视图
- 便于查询和报表生成

## API接口

### GET /api/merge-data
获取merge数据列表，支持以下参数：
- `page`: 页码
- `per_page`: 每页数量
- `platform`: 平台筛选
- `upload_date`: 上传日期筛选
- `is_matched`: 匹配状态筛选（true/false）

返回数据包含：
- 完整的product_data字段
- 匹配的product_list字段
- 匹配状态和元数据

## 实现文件

### 1. 数据库相关
- `mysql/init/03-merge-table.sql` - 表结构定义
- `migrate_merge_table.py` - 数据库迁移脚本

### 2. 后端代码
- `backend/app.py` - 新增模型和API
  - `ProductDataMerge` 模型
  - `process_product_data_merge()` 函数
  - `/api/merge-data` 接口
  - 修改了`process_uploaded_file()`函数

### 3. 部署和测试
- `deploy_merge_feature.bat` - 一键部署脚本
- `test_merge_feature.py` - 功能测试脚本

## 使用流程

### 1. 部署
```bash
# 运行部署脚本
deploy_merge_feature.bat
```

### 2. 使用
1. 上传产品总表（product_list）
2. 上传平台数据（product_data）
3. 系统自动生成merge数据
4. 通过API查看merge结果

### 3. 测试
```bash
# 运行测试脚本
python test_merge_feature.py
```

## 关键逻辑

### 1. 数据处理流程
```
上传平台数据 → 写入product_data → 触发merge处理 → 生成merge数据
```

### 2. 重复上传处理
```
检查当天是否有merge数据 → 删除旧数据 → 生成新数据
```

### 3. 匹配逻辑
```
遍历product_data → 查找匹配的product_list → 创建merge记录 → 标记匹配状态
```

## 数据统计

merge数据提供以下统计信息：
- 总数据量
- 匹配数据量
- 未匹配数据量
- 按平台分组统计
- 按日期分组统计

## 注意事项

1. **数据一致性**：确保product_data.tmall_product_code字段已经清理（去除=和双引号）
2. **性能考虑**：merge处理在单独的事务中进行，失败不影响主数据上传
3. **匹配率优化**：建议先上传产品总表，再上传平台数据
4. **数据清理**：同一天重复上传会自动清理旧数据

## 监控和维护

- 通过日志查看merge处理状态
- 使用`is_matched`字段监控匹配率
- 定期检查未匹配数据，优化product_list数据完整性 