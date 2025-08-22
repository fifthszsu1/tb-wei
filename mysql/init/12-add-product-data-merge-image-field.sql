USE `ecommerce_db`;

ALTER TABLE `product_data_merge`
ADD COLUMN `product_list_image` VARCHAR(500) DEFAULT NULL COMMENT '产品总表主图链接'
AFTER `product_list_category`;

CREATE INDEX `idx_product_list_image` ON `product_data_merge` (`product_list_image`);

ALTER TABLE `product_data_merge` COMMENT = '产品数据合并表 - 包含产品总表主图信息'; 