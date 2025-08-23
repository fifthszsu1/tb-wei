USE `ecommerce_db`;

ALTER TABLE `product_data_merge`
ADD COLUMN `product_list_image` VARCHAR(500) DEFAULT NULL COMMENT '产品总表主图链接'
AFTER `product_list_category`;

CREATE INDEX `idx_product_list_image` ON `product_data_merge` (`product_list_image`);

ALTER TABLE `product_data_merge` COMMENT = '产品数据合并表 - 包含产品总表主图信息'; 

UPDATE user SET password_hash = 'scrypt:32768:8:1$6b7Op0zVTtL4yd7G$d8a2df6e1f368e0e5c1dfaa0fd9fb534c97b1bec8c3a9d87b8b7d82f355c4e4df30a4b92f42370c856ea3ea665fdfc907f9d6aa66e235584779f9377f4ccb69f' WHERE username = 'admin';
UPDATE user SET password_hash = 'scrypt:32768:8:1$J4P4BgaxKYXUa0e9$00ac6b1f18b86aac576e126cf2dd319b7482acca0c66fda103095eae024865ec949700bdf56e246384bca5e2cc22578680eda30efa9833b472ff1f58b9ebeeae' WHERE username = 'user';