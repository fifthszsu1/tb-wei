-- 订单详情表 - 创建脚本
-- 创建时间: 2024
-- 说明: 存储订单详情数据，按日上传的XLSX文件数据

-- 设置字符集和时区
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET time_zone = '+08:00';

-- 使用数据库
USE `ecommerce_db`;

-- ================================
-- 订单详情表
-- ================================
CREATE TABLE IF NOT EXISTS `order_details` (
    `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    
    -- 订单基本信息
    `internal_order_number` varchar(100) DEFAULT NULL COMMENT '内部订单号',
    `online_order_number` varchar(100) DEFAULT NULL COMMENT '线上订单号',
    `store_code` varchar(50) DEFAULT NULL COMMENT '店铺编号',
    `store_name` varchar(200) DEFAULT NULL COMMENT '店铺名称',
    `order_time` datetime DEFAULT NULL COMMENT '下单时间',
    `payment_date` date DEFAULT NULL COMMENT '付款日期',
    `shipping_date` date DEFAULT NULL COMMENT '发货日期',
    
    -- 金额信息
    `payable_amount` decimal(10,2) DEFAULT NULL COMMENT '应付金额',
    `paid_amount` decimal(10,2) DEFAULT NULL COMMENT '已付金额',
    
    -- 物流信息
    `express_company` varchar(100) DEFAULT NULL COMMENT '快递公司',
    `tracking_number` varchar(100) DEFAULT NULL COMMENT '快递单号',
    `province` varchar(50) DEFAULT NULL COMMENT '省份',
    `city` varchar(50) DEFAULT NULL COMMENT '城市',
    `district` varchar(50) DEFAULT NULL COMMENT '区县',
    
    -- 商品信息
    `product_code` varchar(100) DEFAULT NULL COMMENT '商品编码',
    `product_name` varchar(500) DEFAULT NULL COMMENT '商品名称',
    `quantity` int DEFAULT NULL COMMENT '数量',
    `unit_price` decimal(10,2) DEFAULT NULL COMMENT '商品单价',
    `product_amount` decimal(10,2) DEFAULT NULL COMMENT '商品金额',
    
    -- 其他信息
    `payment_number` varchar(100) DEFAULT NULL COMMENT '支付单号',
    `image_url` text DEFAULT NULL COMMENT '图片地址',
    `store_style_code` varchar(100) DEFAULT NULL COMMENT '店铺款式编码',
    
    -- 元数据
    `filename` varchar(255) NOT NULL COMMENT '源文件名',
    `upload_date` date NOT NULL COMMENT '上传日期',
    `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `uploaded_by` int DEFAULT NULL COMMENT '上传用户ID',
    
    PRIMARY KEY (`id`),
    KEY `uploaded_by` (`uploaded_by`),
    KEY `idx_internal_order_number` (`internal_order_number`),
    KEY `idx_online_order_number` (`online_order_number`),
    KEY `idx_store_code` (`store_code`),
    KEY `idx_store_name` (`store_name`),
    KEY `idx_order_time` (`order_time`),
    KEY `idx_payment_date` (`payment_date`),
    KEY `idx_upload_date` (`upload_date`),
    KEY `idx_product_code` (`product_code`),
    KEY `idx_filename` (`filename`),
    KEY `idx_created_at` (`created_at`),
    
    CONSTRAINT `order_details_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单详情表';

-- 输出执行结果
SELECT '订单详情表创建完成' as message;

-- 显示表结构
DESCRIBE `order_details`; 