-- 为product_data_merge表添加推广费用字段
-- 用于存储从subject_report计算出来的推广费用

USE ecommerce_db;

-- 添加推广费用字段到product_data_merge表
ALTER TABLE `product_data_merge` 
ADD COLUMN `sitewide_promotion` DECIMAL(15,2) DEFAULT NULL COMMENT '全站推广费用',
ADD COLUMN `keyword_promotion` DECIMAL(15,2) DEFAULT NULL COMMENT '关键词推广费用',
ADD COLUMN `product_operation` DECIMAL(15,2) DEFAULT NULL COMMENT '货品运营费用',
ADD COLUMN `crowd_promotion` DECIMAL(15,2) DEFAULT NULL COMMENT '人群推广费用',
ADD COLUMN `super_short_video` DECIMAL(15,2) DEFAULT NULL COMMENT '超级短视频费用',
ADD COLUMN `multi_target_direct` DECIMAL(15,2) DEFAULT NULL COMMENT '多目标直投费用',
ADD COLUMN `promotion_summary_updated_at` DATETIME DEFAULT NULL COMMENT '推广费用汇总更新时间';

-- 添加索引用于优化查询性能
ALTER TABLE `product_data_merge` 
ADD INDEX `idx_promotion_summary_updated` (`promotion_summary_updated_at`);

-- 更新merge视图以包含新的推广字段
DROP VIEW IF EXISTS `product_data_merge_view`;
CREATE OR REPLACE VIEW `product_data_merge_view` AS
SELECT 
    m.*,
    u1.username as uploaded_by_name,
    u2.username as product_list_uploaded_by_name
FROM `product_data_merge` m
LEFT JOIN `user` u1 ON m.uploaded_by = u1.id
LEFT JOIN `user` u2 ON m.product_list_uploaded_by = u2.id;

-- 显示添加完成信息
SELECT 'Promotion fields added to product_data_merge table successfully!' as message;

COMMIT; 