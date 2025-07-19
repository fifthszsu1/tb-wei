-- 简化的merge表创建脚本
USE ecommerce_data;

-- 创建merge表
CREATE TABLE IF NOT EXISTS `product_data_merge` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    
    -- 来自product_data的字段
    `product_data_id` INT,
    `platform` VARCHAR(50) NOT NULL,
    `product_name` TEXT,
    `tmall_product_code` VARCHAR(100),
    `tmall_supplier_name` VARCHAR(200),
    `visitor_count` INT,
    `page_views` INT,
    `search_guided_visitors` INT,
    `add_to_cart_count` INT,
    `favorite_count` INT,
    `payment_amount` DECIMAL(10,2),
    `payment_product_count` INT,
    `payment_buyer_count` INT,
    `search_guided_payment_buyers` INT,
    `unit_price` DECIMAL(10,2),
    `visitor_average_value` DECIMAL(10,2),
    `payment_conversion_rate` DECIMAL(5,4),
    `order_conversion_rate` DECIMAL(5,4),
    `avg_stay_time` DECIMAL(10,2),
    `detail_page_bounce_rate` DECIMAL(5,4),
    `order_payment_conversion_rate` DECIMAL(5,4),
    `search_payment_conversion_rate` DECIMAL(5,4),
    `refund_amount` DECIMAL(10,2),
    `refund_ratio` DECIMAL(5,4),
    `filename` VARCHAR(255) NOT NULL,
    `upload_date` DATE NOT NULL,
    `uploaded_by` INT,
    
    -- 来自product_list的字段
    `product_list_id` INT,
    `product_list_name` VARCHAR(500),
    `listing_time` DATE,
    `product_list_created_at` DATETIME,
    `product_list_updated_at` DATETIME,
    `product_list_uploaded_by` INT,
    
    -- merge表的元数据
    `is_matched` BOOLEAN DEFAULT FALSE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX `idx_tmall_product_code` (`tmall_product_code`),
    INDEX `idx_upload_date` (`upload_date`),
    INDEX `idx_platform` (`platform`),
    INDEX `idx_is_matched` (`is_matched`),
    INDEX `idx_product_data_id` (`product_data_id`),
    INDEX `idx_product_list_id` (`product_list_id`)
);

-- 检查表是否创建成功
SHOW TABLES LIKE 'product_data_merge';

-- 显示表结构
DESCRIBE product_data_merge; 