-- 添加种菜汇总相关字段
ALTER TABLE product_data_merge
ADD COLUMN planting_orders INT DEFAULT NULL COMMENT '匹配到的种菜订单数量',
ADD COLUMN planting_amount DECIMAL(10,2) DEFAULT NULL COMMENT '种菜订单总金额',
ADD COLUMN planting_cost DECIMAL(10,2) DEFAULT NULL COMMENT '种菜佣金总额',
ADD COLUMN planting_logistics_cost DECIMAL(10,2) DEFAULT NULL COMMENT '物流成本 (订单数 * 2.5)',
ADD COLUMN planting_deduction DECIMAL(10,2) DEFAULT NULL COMMENT '扣款金额 (总金额 * 0.08)',
ADD COLUMN planting_summary_updated_at DATETIME DEFAULT NULL COMMENT '种菜汇总更新时间';

-- 添加索引以提高查询性能
CREATE INDEX idx_product_data_merge_planting_summary ON product_data_merge (upload_date, tmall_product_code);
CREATE INDEX idx_planting_records_matching ON planting_records (order_date, product_id); 