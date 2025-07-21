-- 电商数据管理系统 - 完整数据库初始化脚本
-- 合并了所有数据库变更，以app_old.py的模型定义为准

-- 设置字符集和时区
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET time_zone = '+08:00';

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `ecommerce_db` 
    DEFAULT CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE `ecommerce_db`;

-- ================================
-- 用户表
-- ================================
CREATE TABLE IF NOT EXISTS `user` (
    `id` int NOT NULL AUTO_INCREMENT,
    `username` varchar(80) NOT NULL,
    `email` varchar(120) NOT NULL,
    `password_hash` varchar(200) NOT NULL,
    `role` varchar(20) NOT NULL DEFAULT 'user',
    `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `username` (`username`),
    UNIQUE KEY `email` (`email`),
    INDEX `idx_username` (`username`),
    INDEX `idx_email` (`email`),
    INDEX `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- 产品数据表 (以app_old.py为准)
-- ================================
CREATE TABLE IF NOT EXISTS `product_data` (
    `id` int NOT NULL AUTO_INCREMENT,
    `platform` varchar(50) NOT NULL,
    `product_name` text,
    `tmall_product_code` varchar(100) DEFAULT NULL,
    `tmall_supplier_name` varchar(200) DEFAULT NULL,
    `visitor_count` int DEFAULT NULL,
    `page_views` int DEFAULT NULL,
    `search_guided_visitors` int DEFAULT NULL,
    `add_to_cart_count` int DEFAULT NULL,
    `favorite_count` int DEFAULT NULL,
    `payment_amount` float DEFAULT NULL,
    `payment_product_count` int DEFAULT NULL,
    `payment_buyer_count` int DEFAULT NULL,
    `search_guided_payment_buyers` int DEFAULT NULL,
    `unit_price` float DEFAULT NULL,
    `visitor_average_value` float DEFAULT NULL,
    `payment_conversion_rate` float DEFAULT NULL,
    `order_conversion_rate` float DEFAULT NULL,
    `avg_stay_time` float DEFAULT NULL,
    `detail_page_bounce_rate` float DEFAULT NULL,
    `order_payment_conversion_rate` float DEFAULT NULL,
    `search_payment_conversion_rate` float DEFAULT NULL,
    `refund_amount` float DEFAULT NULL,
    `refund_ratio` float DEFAULT NULL,
    `filename` varchar(255) NOT NULL,
    `upload_date` date NOT NULL,
    `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
    `uploaded_by` int DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `uploaded_by` (`uploaded_by`),
    KEY `idx_platform` (`platform`),
    KEY `idx_tmall_product_code` (`tmall_product_code`),
    KEY `idx_upload_date` (`upload_date`),
    KEY `idx_filename` (`filename`),
    KEY `idx_created_at` (`created_at`),
    CONSTRAINT `product_data_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- 产品总表 (以app_old.py为准)
-- ================================
CREATE TABLE IF NOT EXISTS `product_list` (
    `id` int NOT NULL AUTO_INCREMENT,
    `product_id` varchar(100) NOT NULL COMMENT '产品ID/链接ID',
    `product_name` varchar(500) NOT NULL COMMENT '商品名称',
    `listing_time` date DEFAULT NULL COMMENT '上架时间',
    `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `uploaded_by` int DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `uploaded_by` (`uploaded_by`),
    KEY `idx_product_id` (`product_id`),
    KEY `idx_product_name` (`product_name`(100)),
    KEY `idx_listing_time` (`listing_time`),
    KEY `idx_created_at` (`created_at`),
    CONSTRAINT `product_list_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品总表';

-- ================================
-- 种菜表格登记表 (以app_old.py为准)
-- ================================
CREATE TABLE IF NOT EXISTS `planting_records` (
    `id` int NOT NULL AUTO_INCREMENT,
    `staff_name` varchar(100) NOT NULL,
    `quantity` int DEFAULT NULL,
    `order_date` date DEFAULT NULL,
    `wechat_id` varchar(100) DEFAULT NULL,
    `product_id` varchar(100) DEFAULT NULL,
    `keyword` varchar(200) DEFAULT NULL,
    `wangwang_id` varchar(100) DEFAULT NULL,
    `order_wechat` varchar(100) DEFAULT NULL,
    `order_number` varchar(100) DEFAULT NULL,
    `amount` float DEFAULT NULL,
    `gift_commission` float DEFAULT NULL,
    `refund_status` varchar(50) DEFAULT NULL,
    `refund_amount` float DEFAULT NULL,
    `refund_wechat` varchar(100) DEFAULT NULL,
    `refund_date` date DEFAULT NULL,
    `store_name` varchar(200) DEFAULT NULL,
    `internal_order_number` varchar(100) DEFAULT NULL,
    `remarks` text,
    `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `uploaded_by` int DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `uploaded_by` (`uploaded_by`),
    KEY `idx_planting_records_matching` (`order_date`,`product_id`),
    KEY `idx_staff_name` (`staff_name`),
    KEY `idx_order_date` (`order_date`),
    KEY `idx_product_id` (`product_id`),
    KEY `idx_store_name` (`store_name`),
    KEY `idx_created_at` (`created_at`),
    CONSTRAINT `planting_records_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='种菜表格登记';

-- ================================
-- 产品数据合并表 (以app_old.py为准)
-- ================================
CREATE TABLE IF NOT EXISTS `product_data_merge` (
    `id` int NOT NULL AUTO_INCREMENT,
    
    -- 来自product_data的字段
    `product_data_id` int DEFAULT NULL,
    `platform` varchar(50) NOT NULL,
    `product_name` text COMMENT '产品',
    `tmall_product_code` varchar(100) DEFAULT NULL COMMENT '天猫ID',
    `tmall_supplier_name` varchar(200) DEFAULT NULL,
    `visitor_count` int DEFAULT NULL COMMENT '访客数',
    `page_views` int DEFAULT NULL,
    `search_guided_visitors` int DEFAULT NULL COMMENT '自然搜索',
    `add_to_cart_count` int DEFAULT NULL COMMENT '加购',
    `favorite_count` int DEFAULT NULL COMMENT '收藏',
    `payment_amount` float DEFAULT NULL COMMENT '前台成交金额',
    `payment_product_count` int DEFAULT NULL COMMENT '支付件数',
    `payment_buyer_count` int DEFAULT NULL COMMENT '前台订单笔数',
    `search_guided_payment_buyers` int DEFAULT NULL,
    `unit_price` float DEFAULT NULL,
    `visitor_average_value` float DEFAULT NULL,
    `payment_conversion_rate` float DEFAULT NULL,
    `order_conversion_rate` float DEFAULT NULL,
    `avg_stay_time` float DEFAULT NULL,
    `detail_page_bounce_rate` float DEFAULT NULL,
    `order_payment_conversion_rate` float DEFAULT NULL,
    `search_payment_conversion_rate` float DEFAULT NULL,
    `refund_amount` float DEFAULT NULL COMMENT '退款金额',
    `refund_ratio` float DEFAULT NULL,
    `filename` varchar(255) NOT NULL,
    `upload_date` date NOT NULL COMMENT '日期',
    `uploaded_by` int DEFAULT NULL,
    
    -- 来自product_list的字段
    `product_list_id` int DEFAULT NULL,
    `product_list_name` varchar(500) DEFAULT NULL,
    `listing_time` date DEFAULT NULL COMMENT '上架时间',
    `product_list_created_at` datetime DEFAULT NULL,
    `product_list_updated_at` datetime DEFAULT NULL,
    `product_list_uploaded_by` int DEFAULT NULL,
    
    -- 推广费用字段
    `sitewide_promotion` float DEFAULT NULL COMMENT '全站推广费用',
    `keyword_promotion` float DEFAULT NULL COMMENT '关键词推广费用',
    `product_operation` float DEFAULT NULL COMMENT '货品运营费用',
    `crowd_promotion` float DEFAULT NULL COMMENT '人群推广费用',
    `super_short_video` float DEFAULT NULL COMMENT '超级短视频费用',
    `multi_target_direct` float DEFAULT NULL COMMENT '多目标直投费用',
    `promotion_summary_updated_at` datetime DEFAULT NULL COMMENT '推广费用汇总更新时间',
    
    -- 种菜表格汇总字段
    `planting_orders` int DEFAULT NULL COMMENT '匹配到的种菜订单数量',
    `planting_amount` float DEFAULT NULL COMMENT '种菜订单总金额',
    `planting_cost` float DEFAULT NULL COMMENT '种菜佣金总额',
    `planting_logistics_cost` float DEFAULT NULL COMMENT '物流成本 (订单数 * 2.5)',
    `planting_deduction` float DEFAULT NULL COMMENT '扣款金额 (总金额 * 0.08)',
    `planting_summary_updated_at` datetime DEFAULT NULL COMMENT '种菜汇总更新时间',
    
    -- 转化率和业务指标字段
    `conversion_rate` float DEFAULT NULL COMMENT '支付转化率',
    `favorite_rate` float DEFAULT NULL COMMENT '收藏率',
    `cart_rate` float DEFAULT NULL COMMENT '加购率',
    `uv_value` float DEFAULT NULL COMMENT 'UV价值',
    `real_conversion_rate` float DEFAULT NULL COMMENT '真实转化率',
    `real_amount` float DEFAULT NULL COMMENT '真实金额',
    `real_buyer_count` int DEFAULT NULL COMMENT '真实买家数',
    `real_product_count` int DEFAULT NULL COMMENT '真实件数',
    `product_cost` float DEFAULT NULL COMMENT '产品成本',
    `real_order_deduction` float DEFAULT NULL COMMENT '真实订单扣点',
    `tax_invoice` float DEFAULT NULL COMMENT '税票',
    `real_order_logistics_cost` float DEFAULT NULL COMMENT '真实订单物流成本',
    `gross_profit` float DEFAULT NULL COMMENT '毛利',
    
    -- merge表的元数据
    `is_matched` tinyint(1) DEFAULT 0 COMMENT '是否成功匹配到product_list',
    `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`id`),
    KEY `product_data_id` (`product_data_id`),
    KEY `product_list_id` (`product_list_id`),
    KEY `uploaded_by` (`uploaded_by`),
    KEY `product_list_uploaded_by` (`product_list_uploaded_by`),
    KEY `idx_product_data_merge_upload_date` (`upload_date`),
    KEY `idx_product_data_merge_tmall_product_code` (`tmall_product_code`),
    KEY `idx_product_data_merge_product_data_id` (`product_data_id`),
    KEY `idx_product_data_merge_product_list_id` (`product_list_id`),
    KEY `idx_product_data_merge_is_matched` (`is_matched`),
    KEY `idx_promotion_summary_updated` (`promotion_summary_updated_at`),
    KEY `idx_product_data_merge_planting_summary` (`upload_date`, `tmall_product_code`),
    CONSTRAINT `product_data_merge_ibfk_1` FOREIGN KEY (`product_data_id`) REFERENCES `product_data` (`id`) ON DELETE SET NULL,
    CONSTRAINT `product_data_merge_ibfk_2` FOREIGN KEY (`product_list_id`) REFERENCES `product_list` (`id`) ON DELETE SET NULL,
    CONSTRAINT `product_data_merge_ibfk_3` FOREIGN KEY (`uploaded_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
    CONSTRAINT `product_data_merge_ibfk_4` FOREIGN KEY (`product_list_uploaded_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- 主体报表表 (以app_old.py为准)
-- ================================
CREATE TABLE IF NOT EXISTS `subject_report` (
    `id` int NOT NULL AUTO_INCREMENT,
    
    -- 基础信息
    `platform` varchar(50) NOT NULL DEFAULT '天猫苏宁' COMMENT '平台',
    `report_date` date NOT NULL COMMENT '报表日期',
    
    -- CSV实际字段映射
    `date_field` date DEFAULT NULL COMMENT '日期',
    `scene_id` varchar(100) DEFAULT NULL COMMENT '场景ID',
    `scene_name` varchar(200) DEFAULT NULL COMMENT '场景名字',
    `original_scene_id` varchar(100) DEFAULT NULL COMMENT '原二级场景ID',
    `original_scene_name` varchar(200) DEFAULT NULL COMMENT '原二级场景名字',
    `plan_id` varchar(100) DEFAULT NULL COMMENT '计划ID',
    `plan_name` varchar(200) DEFAULT NULL COMMENT '计划名字',
    `subject_id` varchar(100) DEFAULT NULL COMMENT '主体ID',
    `subject_type` varchar(100) DEFAULT NULL COMMENT '主体类型',
    `subject_name` varchar(200) DEFAULT NULL COMMENT '主体名称',
    
    -- 展现和点击数据
    `impressions` bigint DEFAULT NULL COMMENT '展现量',
    `clicks` bigint DEFAULT NULL COMMENT '点击量',
    `cost` float DEFAULT NULL COMMENT '花费',
    `ctr` float DEFAULT NULL COMMENT '点击率',
    `avg_cpc` float DEFAULT NULL COMMENT '平均点击花费',
    `cpm` float DEFAULT NULL COMMENT '千次展现花费',
    
    -- 预售成交数据
    `total_presale_amount` float DEFAULT NULL COMMENT '总预售成交金额',
    `total_presale_orders` int DEFAULT NULL COMMENT '总预售成交笔数',
    `direct_presale_amount` float DEFAULT NULL COMMENT '直接预售成交金额',
    `direct_presale_orders` int DEFAULT NULL COMMENT '直接预售成交笔数',
    `indirect_presale_amount` float DEFAULT NULL COMMENT '间接预售成交金额',
    `indirect_presale_orders` int DEFAULT NULL COMMENT '间接预售成交笔数',
    
    -- 成交数据
    `direct_transaction_amount` float DEFAULT NULL COMMENT '直接成交金额',
    `indirect_transaction_amount` float DEFAULT NULL COMMENT '间接成交金额',
    `total_transaction_amount` float DEFAULT NULL COMMENT '总成交金额',
    `total_transaction_orders` int DEFAULT NULL COMMENT '总成交笔数',
    `direct_transaction_orders` int DEFAULT NULL COMMENT '直接成交笔数',
    `indirect_transaction_orders` int DEFAULT NULL COMMENT '间接成交笔数',
    
    -- 转化和投入产出
    `click_conversion_rate` float DEFAULT NULL COMMENT '点击转化率',
    `roas` float DEFAULT NULL COMMENT '投入产出比',
    `total_transaction_cost` float DEFAULT NULL COMMENT '总成交成本',
    
    -- 购物车数据
    `total_cart_count` int DEFAULT NULL COMMENT '总购物车数',
    `direct_cart_count` int DEFAULT NULL COMMENT '直接购物车数',
    `indirect_cart_count` int DEFAULT NULL COMMENT '间接购物车数',
    `cart_rate` float DEFAULT NULL COMMENT '加购率',
    
    -- 收藏数据
    `favorite_product_count` int DEFAULT NULL COMMENT '收藏宝贝数',
    `favorite_shop_count` int DEFAULT NULL COMMENT '收藏店铺数',
    `shop_favorite_cost` float DEFAULT NULL COMMENT '店铺收藏成本',
    `total_favorite_cart_count` int DEFAULT NULL COMMENT '总收藏加购数',
    `total_favorite_cart_cost` float DEFAULT NULL COMMENT '总收藏加购成本',
    `product_favorite_cart_count` int DEFAULT NULL COMMENT '宝贝收藏加购数',
    `product_favorite_cart_cost` float DEFAULT NULL COMMENT '宝贝收藏加购成本',
    `total_favorite_count` int DEFAULT NULL COMMENT '总收藏数',
    `product_favorite_cost` float DEFAULT NULL COMMENT '宝贝收藏成本',
    `product_favorite_rate` float DEFAULT NULL COMMENT '宝贝收藏率',
    `cart_cost` float DEFAULT NULL COMMENT '加购成本',
    
    -- 订单数据
    `placed_order_count` int DEFAULT NULL COMMENT '拍下订单笔数',
    `placed_order_amount` float DEFAULT NULL COMMENT '拍下订单金额',
    `direct_favorite_product_count` int DEFAULT NULL COMMENT '直接收藏宝贝数',
    `indirect_favorite_product_count` int DEFAULT NULL COMMENT '间接收藏宝贝数',
    
    -- 优惠券和充值
    `coupon_claim_count` int DEFAULT NULL COMMENT '优惠券领取量',
    `shopping_gold_recharge_count` int DEFAULT NULL COMMENT '购物金充值笔数',
    `shopping_gold_recharge_amount` float DEFAULT NULL COMMENT '购物金充值金额',
    
    -- 咨询和访问数据
    `wangwang_consultation_count` int DEFAULT NULL COMMENT '旺旺咨询量',
    `guided_visit_count` int DEFAULT NULL COMMENT '引导访问量',
    `guided_visitor_count` int DEFAULT NULL COMMENT '引导访问人数',
    `guided_potential_customer_count` int DEFAULT NULL COMMENT '引导访问潜客数',
    `guided_potential_customer_rate` float DEFAULT NULL COMMENT '引导访问潜客占比',
    `membership_rate` float DEFAULT NULL COMMENT '入会率',
    `membership_count` int DEFAULT NULL COMMENT '入会量',
    `guided_visit_rate` float DEFAULT NULL COMMENT '引导访问率',
    `deep_visit_count` int DEFAULT NULL COMMENT '深度访问量',
    `avg_visit_pages` float DEFAULT NULL COMMENT '平均访问页面数',
    
    -- 客户数据
    `new_customer_count` int DEFAULT NULL COMMENT '成交新客数',
    `new_customer_rate` float DEFAULT NULL COMMENT '成交新客占比',
    `member_first_purchase_count` int DEFAULT NULL COMMENT '会员首购人数',
    `member_transaction_amount` float DEFAULT NULL COMMENT '会员成交金额',
    `member_transaction_orders` int DEFAULT NULL COMMENT '会员成交笔数',
    `transaction_customer_count` int DEFAULT NULL COMMENT '成交人数',
    `avg_orders_per_customer` float DEFAULT NULL COMMENT '人均成交笔数',
    `avg_amount_per_customer` float DEFAULT NULL COMMENT '人均成交金额',
    
    -- 自然流量数据
    `natural_traffic_amount` float DEFAULT NULL COMMENT '自然流量转化金额',
    `natural_traffic_impressions` bigint DEFAULT NULL COMMENT '自然流量曝光量',
    
    -- 平台助推数据
    `platform_boost_total_transaction` float DEFAULT NULL COMMENT '平台助推总成交',
    `platform_boost_direct_transaction` float DEFAULT NULL COMMENT '平台助推直接成交',
    `platform_boost_clicks` int DEFAULT NULL COMMENT '平台助推点击',
    
    -- 优惠券撬动数据
    `product_coupon_discount_amount` float DEFAULT NULL COMMENT '宝贝优惠券抵扣金额',
    `product_coupon_total_transaction` float DEFAULT NULL COMMENT '宝贝优惠券撬动总成交',
    `product_coupon_direct_transaction` float DEFAULT NULL COMMENT '宝贝优惠券撬动直接成交',
    `product_coupon_clicks` int DEFAULT NULL COMMENT '宝贝优惠券撬动点击',
    
    -- 元数据
    `filename` varchar(255) NOT NULL COMMENT '上传的文件名',
    `upload_date` date NOT NULL COMMENT '用户选择的上传日期',
    `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `uploaded_by` int DEFAULT NULL COMMENT '上传用户ID',
    
    PRIMARY KEY (`id`),
    KEY `idx_platform` (`platform`),
    KEY `idx_report_date` (`report_date`),
    KEY `idx_upload_date` (`upload_date`),
    KEY `idx_plan_name` (`plan_name`),
    KEY `idx_plan_id` (`plan_id`),
    KEY `idx_subject_name` (`subject_name`),
    KEY `idx_subject_id` (`subject_id`),
    KEY `idx_filename` (`filename`),
    KEY `idx_uploaded_by` (`uploaded_by`),
    KEY `idx_created_at` (`created_at`),
    CONSTRAINT `subject_report_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主体报表数据';

-- ================================
-- 创建视图
-- ================================

-- 平台统计视图
CREATE OR REPLACE VIEW `platform_stats` AS
SELECT 
    platform,
    COUNT(*) as total_records,
    COUNT(DISTINCT tmall_supplier_name) as supplier_count,
    AVG(unit_price) as avg_price,
    SUM(payment_amount) as total_sales
FROM product_data 
WHERE platform IS NOT NULL
GROUP BY platform;

-- 品牌统计视图  
CREATE OR REPLACE VIEW `brand_stats` AS
SELECT 
    tmall_supplier_name as brand,
    COUNT(*) as product_count,
    COUNT(DISTINCT platform) as platform_count,
    AVG(unit_price) as avg_price,
    SUM(payment_amount) as total_sales
FROM product_data 
WHERE tmall_supplier_name IS NOT NULL AND tmall_supplier_name != ''
GROUP BY tmall_supplier_name
ORDER BY product_count DESC;

-- 用户上传统计视图
CREATE OR REPLACE VIEW `user_upload_stats` AS
SELECT 
    u.username,
    u.role,
    COUNT(DISTINCT DATE(pd.created_at)) as upload_days,
    COUNT(*) as total_records,
    COUNT(DISTINCT pd.platform) as platforms_used,
    MIN(pd.created_at) as first_upload,
    MAX(pd.created_at) as last_upload
FROM user u
LEFT JOIN product_data pd ON u.id = pd.uploaded_by
GROUP BY u.id, u.username, u.role;

-- 产品数据合并视图
CREATE OR REPLACE VIEW `product_data_merge_view` AS
SELECT 
    m.*,
    u1.username as uploaded_by_name,
    u2.username as product_list_uploaded_by_name
FROM `product_data_merge` m
LEFT JOIN `user` u1 ON m.uploaded_by = u1.id
LEFT JOIN `user` u2 ON m.product_list_uploaded_by = u2.id;

-- 主体报表视图
CREATE OR REPLACE VIEW `subject_report_view` AS
SELECT 
    sr.*,
    u.username as uploaded_by_name
FROM `subject_report` sr
LEFT JOIN `user` u ON sr.uploaded_by = u.id;

-- ================================
-- 插入默认用户数据
-- ================================

-- 插入默认管理员用户 (密码: admin123)
INSERT IGNORE INTO `user` (`id`, `username`, `email`, `password_hash`, `role`, `created_at`) 
VALUES (1, 'admin', 'admin@example.com', 'scrypt:32768:8:1$QTIv10vrjTatCWdY$68ea9e40306b038f5f52a8c232e4f85133ff27aa23ff150e09f41341d486a709e2f7266b98cf0ad2735f08c14ab0c280d868a90eab482928e0fde775afc47919', 'admin', NOW());

-- 插入默认普通用户 (密码: user123)  
INSERT IGNORE INTO `user` (`id`, `username`, `email`, `password_hash`, `role`, `created_at`) 
VALUES (2, 'user', 'user@example.com', 'scrypt:32768:8:1$YoPzXFeyhQDX6PSI$13eac2f1048c2625c8b3b80498d22e74e195e07b1fb555799b913d2392143c87fbb47fe6303dac10973ceabb3157ed774105831ce48be716e1d1ff23252c0c98', 'user', NOW());

-- ================================
-- 提交事务
-- ================================
COMMIT;

-- 显示初始化完成信息
SELECT 'Complete database initialization finished successfully!' as message,
       NOW() as completed_at;