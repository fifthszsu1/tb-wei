-- 创建主体报表表
CREATE TABLE IF NOT EXISTS `subject_report` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    
    -- 基础信息
    `platform` VARCHAR(50) NOT NULL DEFAULT '天猫苏宁' COMMENT '平台',
    `report_date` DATE NOT NULL COMMENT '报表日期',
    
    -- 主体报表字段（根据实际CSV文件结构调整）
    `product_name` TEXT COMMENT '商品名称',
    `product_code` VARCHAR(100) COMMENT '商品编码',
    `category` VARCHAR(200) COMMENT '类目',
    `brand` VARCHAR(100) COMMENT '品牌',
    `supplier_name` VARCHAR(200) COMMENT '供应商名称',
    `shop_name` VARCHAR(200) COMMENT '店铺名称',
    
    -- 销售数据
    `sales_amount` DECIMAL(15,2) COMMENT '销售金额',
    `sales_quantity` INT COMMENT '销售数量',
    `refund_amount` DECIMAL(15,2) COMMENT '退款金额',
    `refund_quantity` INT COMMENT '退款数量',
    `net_sales_amount` DECIMAL(15,2) COMMENT '净销售额',
    `net_sales_quantity` INT COMMENT '净销售量',
    
    -- 成本和利润
    `cost_amount` DECIMAL(15,2) COMMENT '成本金额',
    `gross_profit` DECIMAL(15,2) COMMENT '毛利',
    `gross_profit_rate` DECIMAL(8,4) COMMENT '毛利率',
    
    -- 推广数据
    `promotion_cost` DECIMAL(15,2) COMMENT '推广费用',
    `promotion_clicks` INT COMMENT '推广点击量',
    `promotion_impressions` INT COMMENT '推广展现量',
    `promotion_ctr` DECIMAL(8,4) COMMENT '推广点击率',
    `promotion_cpc` DECIMAL(10,2) COMMENT '推广点击单价',
    `promotion_conversion_rate` DECIMAL(8,4) COMMENT '推广转化率',
    `promotion_roi` DECIMAL(8,4) COMMENT '推广ROI',
    
    -- 流量数据
    `visitor_count` INT COMMENT '访客数',
    `page_views` INT COMMENT '浏览量',
    `bounce_rate` DECIMAL(8,4) COMMENT '跳出率',
    `avg_visit_duration` DECIMAL(10,2) COMMENT '平均访问时长',
    `conversion_rate` DECIMAL(8,4) COMMENT '转化率',
    
    -- 库存数据
    `stock_quantity` INT COMMENT '库存数量',
    `stock_value` DECIMAL(15,2) COMMENT '库存价值',
    `stock_turnover` DECIMAL(8,4) COMMENT '库存周转率',
    
    -- 评价数据
    `review_count` INT COMMENT '评价数',
    `positive_review_rate` DECIMAL(8,4) COMMENT '好评率',
    `avg_rating` DECIMAL(3,2) COMMENT '平均评分',
    
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
    INDEX `idx_product_code` (`product_code`),
    INDEX `idx_supplier_name` (`supplier_name`),
    INDEX `idx_shop_name` (`shop_name`),
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