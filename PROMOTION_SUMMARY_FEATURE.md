# 推广费用汇总计算功能

## 功能概述

该功能实现了根据日期自动计算和分配推广费用的汇总逻辑。通过将`product_data_merge`表与`subject_report`表进行左连接，根据场景名称自动分配推广费用到对应的推广类型字段中。

## 数据库更改

### 新增字段

为`product_data_merge`表添加了以下推广费用字段：

```sql
-- 推广费用字段
sitewide_promotion DECIMAL(15,2) DEFAULT NULL COMMENT '全站推广费用'
keyword_promotion DECIMAL(15,2) DEFAULT NULL COMMENT '关键词推广费用'
product_operation DECIMAL(15,2) DEFAULT NULL COMMENT '货品运营费用'
crowd_promotion DECIMAL(15,2) DEFAULT NULL COMMENT '人群推广费用'
super_short_video DECIMAL(15,2) DEFAULT NULL COMMENT '超级短视频费用'
multi_target_direct DECIMAL(15,2) DEFAULT NULL COMMENT '多目标直投费用'
promotion_summary_updated_at DATETIME DEFAULT NULL COMMENT '推广费用汇总更新时间'
```

### 迁移脚本

- 文件：`mysql/init/07-add-promotion-fields.sql`
- 自动在Docker启动时执行
- 包含索引优化和视图更新

## API接口

### 推广费用汇总计算

**接口地址：** `POST /api/calculate-promotion-summary`

**权限要求：** 仅管理员用户可访问

**请求参数：**
```json
{
  "target_date": "YYYY-MM-DD"
}
```

**响应示例：**
```json
{
  "message": "汇总计算完成！处理了 100 条记录，匹配了 80 条记录，更新了 75 条记录",
  "stats": {
    "processed_count": 100,
    "matched_count": 80,
    "updated_count": 75,
    "scene_name_distribution": {
      "全站推广": {
        "count": 25,
        "total_cost": 12500.50
      },
      "关键词推广": {
        "count": 35,
        "total_cost": 18750.25
      }
    },
    "errors": []
  }
}
```

## 业务逻辑

### 计算流程

1. **数据筛选**：根据传入的日期筛选`product_data_merge`表中的记录
2. **左连接匹配**：对每条记录，查找`subject_report`表中匹配的记录
3. **匹配条件**：
   - `product_data_merge.upload_date = 传入日期`
   - `subject_report.report_date = 传入日期` 
   - `product_data_merge.tmall_product_code = subject_report.subject_id`
4. **费用分配**：根据`subject_report.scene_name`将`subject_report.cost`分配到对应字段

### 场景名称映射

| 场景名称 | 对应字段 | 说明 |
|---------|---------|------|
| 全站推广 | sitewide_promotion | 全站推广费用 |
| 关键词推广 | keyword_promotion | 关键词推广费用 |
| 货品运营 | product_operation | 货品运营费用 |
| 人群推广 | crowd_promotion | 人群推广费用 |
| 超级短视频 | super_short_video | 超级短视频费用 |
| 多目标直投 | multi_target_direct | 多目标直投费用 |

### 费用累加规则

- 同一产品的同一推广类型费用会进行累加
- 每次计算前会重置所有推广费用字段为0，避免重复累加
- 更新`promotion_summary_updated_at`字段记录最后计算时间

## 部署和测试

### 部署步骤

1. 运行部署脚本：
   ```bash
   deploy_promotion_summary.bat
   ```

2. 脚本会自动：
   - 停止现有服务
   - 应用数据库迁移
   - 重新构建并启动服务
   - 验证服务状态

### 功能测试

1. **自动测试脚本：**
   ```bash
   python test_promotion_summary.py
   ```

2. **手动API测试：**
   ```bash
   curl -X POST http://localhost:5000/api/calculate-promotion-summary \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"target_date": "2025-01-08"}'
   ```

3. **Web界面查看：**
   - 访问：`http://localhost:8080`
   - 登录后进入"合并数据"页面
   - 查看推广费用字段的计算结果

## 技术实现

### 后端实现

- **框架：** Flask + SQLAlchemy
- **数据库：** MySQL 8.0
- **认证：** JWT Token
- **日志：** Python logging

### 核心代码文件

- `backend/app.py` - API接口实现
- `mysql/init/07-add-promotion-fields.sql` - 数据库迁移
- `test_promotion_summary.py` - 功能测试脚本

### 性能优化

- 添加了数据库索引优化查询性能
- 批量处理减少数据库连接开销
- 事务机制确保数据一致性

## 使用说明

### 前置条件

1. 确保已导入产品数据到`product_data_merge`表
2. 确保已导入主体报表数据到`subject_report`表
3. 两个表的日期字段需要匹配
4. 使用管理员账户进行操作

### 操作流程

1. **准备数据**
   - 导入商品数据（苏宁/天猫等平台数据）
   - 导入主体报表数据（包含推广场景和费用）

2. **执行汇总计算**
   - 调用API或运行测试脚本
   - 指定要计算的日期
   - 系统自动进行数据匹配和费用分配

3. **查看结果**
   - 通过Web界面查看计算结果
   - 或通过API接口获取数据
   - 检查推广费用字段是否正确分配

### 注意事项

- 每次计算会覆盖之前的推广费用数据
- 建议在数据完整后进行计算
- 计算过程中会输出详细的统计信息
- 如有错误会在响应中返回错误列表

## 扩展功能

### 未来可能的增强

1. **批量日期计算**：支持一次性计算多个日期
2. **增量更新**：只更新变化的数据而不是全量重算
3. **计算历史**：保存每次计算的历史记录
4. **数据验证**：增加更多的数据一致性检查
5. **导出功能**：支持将计算结果导出为Excel文件

### 监控和维护

- 定期检查计算结果的准确性
- 监控API响应时间和错误率
- 备份重要的计算结果数据
- 根据业务需求调整场景名称映射规则

## 故障排除

### 常见问题

1. **数据不匹配**
   - 检查日期格式是否正确
   - 验证产品编码是否一致
   - 确认两个表都有对应日期的数据

2. **权限问题**
   - 确保使用管理员账户
   - 检查JWT Token是否有效

3. **计算结果为空**
   - 验证场景名称是否在映射表中
   - 检查cost字段是否有数据
   - 确认匹配条件是否满足

### 日志和调试

- 后端日志会输出详细的处理信息
- API响应包含完整的统计信息
- 测试脚本提供友好的错误提示

---

**版本：** 1.0  
**创建日期：** 2025-01-08  
**最后更新：** 2025-01-08 