-- 06-add-order-status-field.sql
-- 为order_details和order_details_merge表添加order_status字段

-- 为order_details表添加order_status字段
ALTER TABLE order_details 
ADD COLUMN order_status VARCHAR(50) COMMENT '子订单状态';

-- 为order_details_merge表添加order_status字段
ALTER TABLE order_details_merge 
ADD COLUMN order_status VARCHAR(50) COMMENT '子订单状态';

-- 创建索引以提高查询性能
CREATE INDEX idx_order_details_status ON order_details(order_status);
CREATE INDEX idx_order_details_merge_status ON order_details_merge(order_status); 