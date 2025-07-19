-- 删除现有的主体报表表和视图
DROP VIEW IF EXISTS `subject_report_view`;
DROP TABLE IF EXISTS `subject_report`;

-- 根据实际CSV列名重新创建主体报表表
CREATE TABLE `subject_report` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    
    -- 基础信息
    `platform` VARCHAR(50) NOT NULL DEFAULT '天猫苏宁' COMMENT '平台',
    `report_date` DATE NOT NULL COMMENT '报表日期',
    
    -- CSV实际字段映射
    `date_field` DATE COMMENT '日期',
    `scene_id` VARCHAR(100) COMMENT '场景ID',
    `scene_name` VARCHAR(200) COMMENT '场景名字',
    `original_scene_id` VARCHAR(100) COMMENT '原二级场景ID',
    `original_scene_name` VARCHAR(200) COMMENT '原二级场景名字',
    `plan_id` VARCHAR(100) COMMENT '计划ID',
    `plan_name` VARCHAR(200) COMMENT '计划名字',
    `subject_id` VARCHAR(100) COMMENT '主体ID',
    `subject_type` VARCHAR(100) COMMENT '主体类型',
    `subject_name` VARCHAR(200) COMMENT '主体名称',
    
    -- 展现和点击数据
    `impressions` BIGINT COMMENT '展现量',
    `clicks` BIGINT COMMENT '点击量',
    `cost` DECIMAL(15,2) COMMENT '花费',
    `ctr` DECIMAL(8,4) COMMENT '点击率',
    `avg_cpc` DECIMAL(10,2) COMMENT '平均点击花费',
    `cpm` DECIMAL(10,2) COMMENT '千次展现花费',
    
    -- 预售成交数据
    `total_presale_amount` DECIMAL(15,2) COMMENT '总预售成交金额',
    `total_presale_orders` INT COMMENT '总预售成交笔数',
    `direct_presale_amount` DECIMAL(15,2) COMMENT '直接预售成交金额',
    `direct_presale_orders` INT COMMENT '直接预售成交笔数',
    `indirect_presale_amount` DECIMAL(15,2) COMMENT '间接预售成交金额',
    `indirect_presale_orders` INT COMMENT '间接预售成交笔数',
    
    -- 成交数据
    `direct_transaction_amount` DECIMAL(15,2) COMMENT '直接成交金额',
    `indirect_transaction_amount` DECIMAL(15,2) COMMENT '间接成交金额',
    `total_transaction_amount` DECIMAL(15,2) COMMENT '总成交金额',
    `total_transaction_orders` INT COMMENT '总成交笔数',
    `direct_transaction_orders` INT COMMENT '直接成交笔数',
    `indirect_transaction_orders` INT COMMENT '间接成交笔数',
    
    -- 转化和投入产出
    `click_conversion_rate` DECIMAL(8,4) COMMENT '点击转化率',
    `roas` DECIMAL(8,4) COMMENT '投入产出比',
    `total_transaction_cost` DECIMAL(15,2) COMMENT '总成交成本',
    
    -- 购物车数据
    `total_cart_count` INT COMMENT '总购物车数',
    `direct_cart_count` INT COMMENT '直接购物车数',
    `indirect_cart_count` INT COMMENT '间接购物车数',
    `cart_rate` DECIMAL(8,4) COMMENT '加购率',
    
    -- 收藏数据
    `favorite_product_count` INT COMMENT '收藏宝贝数',
    `favorite_shop_count` INT COMMENT '收藏店铺数',
    `shop_favorite_cost` DECIMAL(15,2) COMMENT '店铺收藏成本',
    `total_favorite_cart_count` INT COMMENT '总收藏加购数',
    `total_favorite_cart_cost` DECIMAL(15,2) COMMENT '总收藏加购成本',
    `product_favorite_cart_count` INT COMMENT '宝贝收藏加购数',
    `product_favorite_cart_cost` DECIMAL(15,2) COMMENT '宝贝收藏加购成本',
    `total_favorite_count` INT COMMENT '总收藏数',
    `product_favorite_cost` DECIMAL(15,2) COMMENT '宝贝收藏成本',
    `product_favorite_rate` DECIMAL(8,4) COMMENT '宝贝收藏率',
    `cart_cost` DECIMAL(15,2) COMMENT '加购成本',
    
    -- 订单数据
    `placed_order_count` INT COMMENT '拍下订单笔数',
    `placed_order_amount` DECIMAL(15,2) COMMENT '拍下订单金额',
    `direct_favorite_product_count` INT COMMENT '直接收藏宝贝数',
    `indirect_favorite_product_count` INT COMMENT '间接收藏宝贝数',
    
    -- 优惠券和充值
    `coupon_claim_count` INT COMMENT '优惠券领取量',
    `shopping_gold_recharge_count` INT COMMENT '购物金充值笔数',
    `shopping_gold_recharge_amount` DECIMAL(15,2) COMMENT '购物金充值金额',
    
    -- 咨询和访问数据
    `wangwang_consultation_count` INT COMMENT '旺旺咨询量',
    `guided_visit_count` INT COMMENT '引导访问量',
    `guided_visitor_count` INT COMMENT '引导访问人数',
    `guided_potential_customer_count` INT COMMENT '引导访问潜客数',
    `guided_potential_customer_rate` DECIMAL(8,4) COMMENT '引导访问潜客占比',
    `membership_rate` DECIMAL(8,4) COMMENT '入会率',
    `membership_count` INT COMMENT '入会量',
    `guided_visit_rate` DECIMAL(8,4) COMMENT '引导访问率',
    `deep_visit_count` INT COMMENT '深度访问量',
    `avg_visit_pages` DECIMAL(8,2) COMMENT '平均访问页面数',
    
    -- 客户数据
    `new_customer_count` INT COMMENT '成交新客数',
    `new_customer_rate` DECIMAL(8,4) COMMENT '成交新客占比',
    `member_first_purchase_count` INT COMMENT '会员首购人数',
    `member_transaction_amount` DECIMAL(15,2) COMMENT '会员成交金额',
    `member_transaction_orders` INT COMMENT '会员成交笔数',
    `transaction_customer_count` INT COMMENT '成交人数',
    `avg_orders_per_customer` DECIMAL(8,2) COMMENT '人均成交笔数',
    `avg_amount_per_customer` DECIMAL(15,2) COMMENT '人均成交金额',
    
    -- 自然流量数据
    `natural_traffic_amount` DECIMAL(15,2) COMMENT '自然流量转化金额',
    `natural_traffic_impressions` BIGINT COMMENT '自然流量曝光量',
    
    -- 平台助推数据
    `platform_boost_total_transaction` DECIMAL(15,2) COMMENT '平台助推总成交',
    `platform_boost_direct_transaction` DECIMAL(15,2) COMMENT '平台助推直接成交',
    `platform_boost_clicks` INT COMMENT '平台助推点击',
    
    -- 优惠券撬动数据
    `product_coupon_discount_amount` DECIMAL(15,2) COMMENT '宝贝优惠券抵扣金额',
    `product_coupon_total_transaction` DECIMAL(15,2) COMMENT '宝贝优惠券撬动总成交',
    `product_coupon_direct_transaction` DECIMAL(15,2) COMMENT '宝贝优惠券撬动直接成交',
    `product_coupon_clicks` INT COMMENT '宝贝优惠券撬动点击',
    
    -- 元数据
    `filename` VARCHAR(255) NOT NULL COMMENT '上传的文件名',
    `upload_date` DATE NOT NULL COMMENT '用户选择的上传日期',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `uploaded_by` INT COMMENT '上传用户ID',
    
    -- 索引
    INDEX `idx_platform` (`platform`),
    INDEX `idx_report_date` (`report_date`),
    INDEX `idx_upload_date` (`upload_date`),
    INDEX `idx_plan_name` (`plan_name`),
    INDEX `idx_plan_id` (`plan_id`),
    INDEX `idx_subject_name` (`subject_name`),
    INDEX `idx_subject_id` (`subject_id`),
    INDEX `idx_filename` (`filename`),
    INDEX `idx_uploaded_by` (`uploaded_by`),
    INDEX `idx_created_at` (`created_at`),
    
    -- 外键约束
    FOREIGN KEY (`uploaded_by`) REFERENCES `user`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主体报表数据';

-- 创建视图，方便查询
CREATE OR REPLACE VIEW `subject_report_view` AS
SELECT 
    sr.*,
    u.username as uploaded_by_name
FROM `subject_report` sr
LEFT JOIN `user` u ON sr.uploaded_by = u.id; 