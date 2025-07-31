-- 为产品标签功能添加字段到product_list表
-- 添加时间：2024-01-15

USE `ecommerce_db`;

-- 为product_list表添加新字段
ALTER TABLE `product_list` 
ADD COLUMN `tmall_supplier_id` varchar(200) DEFAULT NULL COMMENT '天猫供销ID' AFTER `listing_time`,
ADD COLUMN `operator` varchar(100) DEFAULT NULL COMMENT '操作人' AFTER `tmall_supplier_id`,
ADD COLUMN `action_list` JSON DEFAULT NULL COMMENT '活动列表，存储活动名称和周期' AFTER `operator`;

-- 添加索引提高查询性能
ALTER TABLE `product_list` 
ADD INDEX `idx_tmall_supplier_id` (`tmall_supplier_id`),
ADD INDEX `idx_operator` (`operator`); 