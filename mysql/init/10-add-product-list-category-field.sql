-- 为产品总表添加类目字段
-- 创建时间: 2025-01-03

USE `ecommerce_db`;

-- 为product_list表添加类目字段
ALTER TABLE `product_list` 
ADD COLUMN `category` VARCHAR(200) DEFAULT NULL COMMENT '产品类目' 
AFTER `operator`;

-- 更新索引
CREATE INDEX `idx_category` ON `product_list` (`category`);

-- 添加注释
ALTER TABLE `product_list` COMMENT = '产品总表 - 包含类目信息'; 