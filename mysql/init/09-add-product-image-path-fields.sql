-- 添加产品总表的链接主图和网盘路径字段
-- 创建时间: 2024-12-21

USE ecommerce_db;

-- 在product_list表中添加链接主图和网盘路径字段
ALTER TABLE product_list 
ADD COLUMN main_image_url TEXT COMMENT '链接主图网络地址' AFTER action_list,
ADD COLUMN network_disk_path TEXT COMMENT '网盘路径' AFTER main_image_url;

-- 创建索引以提高查询效率（可选）
-- CREATE INDEX idx_product_list_main_image ON product_list(main_image_url(100));
-- CREATE INDEX idx_product_list_network_path ON product_list(network_disk_path(100));

-- 显示表结构确认修改成功
DESCRIBE product_list; 