-- 为产品数据合并表添加product_list_category字段
-- 创建时间: 2025-01-03

USE `ecommerce_db`;

-- 为product_data_merge表添加product_list_category字段
ALTER TABLE `product_data_merge` 
ADD COLUMN `product_list_category` VARCHAR(200) DEFAULT NULL COMMENT '产品总表类目' 
AFTER `product_list_operator`;

-- 添加索引
CREATE INDEX `idx_product_list_category` ON `product_data_merge` (`product_list_category`);

-- 添加注释
ALTER TABLE `product_data_merge` COMMENT = '产品数据合并表 - 包含产品总表类目信息'; 