-- 产品总表字段增强 - 添加天猫供销ID和操作人字段
-- 创建时间: 2024
-- 说明: 为product_list表和product_data_merge表添加天猫供销ID和操作人字段

-- 设置字符集和时区
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET time_zone = '+08:00';

-- 使用数据库
USE `ecommerce_db`;

-- ================================
-- 为 product_list 表添加新字段
-- ================================

-- 添加天猫供销ID字段
ALTER TABLE `product_list` 
ADD COLUMN `tmall_supplier_id` varchar(200) DEFAULT NULL COMMENT '天猫供销ID' 
AFTER `listing_time`;

-- 添加操作人字段
ALTER TABLE `product_list` 
ADD COLUMN `operator` varchar(100) DEFAULT NULL COMMENT '操作人' 
AFTER `tmall_supplier_id`;

-- 为新字段添加索引
ALTER TABLE `product_list` 
ADD INDEX `idx_tmall_supplier_id` (`tmall_supplier_id`);

ALTER TABLE `product_list` 
ADD INDEX `idx_operator` (`operator`);

-- ================================
-- 为 product_data_merge 表添加新字段
-- ================================

-- 添加天猫供销ID字段（来自product_list）
ALTER TABLE `product_data_merge` 
ADD COLUMN `product_list_tmall_supplier_id` varchar(200) DEFAULT NULL COMMENT '产品总表-天猫供销ID' 
AFTER `listing_time`;

-- 添加操作人字段（来自product_list）
ALTER TABLE `product_data_merge` 
ADD COLUMN `product_list_operator` varchar(100) DEFAULT NULL COMMENT '产品总表-操作人' 
AFTER `product_list_tmall_supplier_id`;

-- 为新字段添加索引
ALTER TABLE `product_data_merge` 
ADD INDEX `idx_product_list_tmall_supplier_id` (`product_list_tmall_supplier_id`);

ALTER TABLE `product_data_merge` 
ADD INDEX `idx_product_list_operator` (`product_list_operator`);
