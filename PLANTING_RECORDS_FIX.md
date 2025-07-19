# 种菜表格多Tab导入修复

## 问题描述
种菜表格导入功能只处理了"覃天龙"工作表，其他工作表如"吴腾飞"、"外包"没有被正确导入。

## 根本原因
原有的行数据验证逻辑过于严格，只检查第一列是否为空来判断是否跳过行。对于"吴腾飞"和"外包"工作表，第一列（数量列）为空，导致所有行都被跳过。

## 修复方案
修改 `backend/app.py` 中的 `process_planting_records_file` 函数的行验证逻辑：

### 原有逻辑
```python
if pd.isna(row.iloc[0]) or str(row.iloc[0]).lower() in ['nan', '数量', '付款时间']:
    continue
```

### 修复后逻辑
```python
# 1. 检查是否整行都为空
if row.isna().all():
    continue

# 2. 检查是否是标题行
if not pd.isna(row.iloc[0]) and str(row.iloc[0]).lower() in ['数量', '付款时间', '序号']:
    continue

# 3. 检查是否有任何关键字段有数据
has_data = False
key_fields = [col_mapping.get('quantity'), col_mapping.get('order_date'), 
              col_mapping.get('wechat_id'), col_mapping.get('product_id'), 
              col_mapping.get('order_number')]
for field in key_fields:
    if field and field in row.index and pd.notna(row[field]):
        has_data = True
        break

if not has_data:
    continue
```

## 修复效果
修复后，所有工作表都能被正确处理：

- **吴腾飞**: 1,222 条记录
- **覃天龙**: 394 条记录  
- **外包**: 279 条记录

**总计**: 1,895 条记录

## 部署方式
运行 `deploy_planting_fix.bat` 脚本来应用修复并重启服务。

## 验证步骤
1. 重新导入种菜表格文件
2. 检查数据库中是否包含所有三个人员的记录
3. 验证总记录数约为 1,895 条

## 修复时间
2025年1月8日 