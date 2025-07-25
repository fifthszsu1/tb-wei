-- 订单详情合并表 - 创建脚本
-- 创建时间: 2024
-- 说明: 订单详情数据与产品总表、运营成本价格表的LEFT JOIN合并结果
-- 合并逻辑: 
--   1. order_details LEFT JOIN product_list ON order_details.store_style_code = product_list.tmall_supplier_id
--   2. 结果 LEFT JOIN operation_cost_pricing ON product_list.operator = operation_cost_pricing.operation_staff AND order_details.product_code = operation_cost_pricing.product_code

-- 设置字符集和时区
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET time_zone = '+08:00';

-- 使用数据库
USE `ecommerce_db`;

-- ================================
-- 订单详情合并表
-- ================================
CREATE TABLE IF NOT EXISTS `order_details_merge` (
    `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    
    -- ================================
    -- 来自order_details表的字段
    -- ================================
    `order_details_id` int DEFAULT NULL COMMENT '订单详情表ID',
    
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
    
    -- 订单详情元数据
    `order_details_filename` varchar(255) DEFAULT NULL COMMENT '订单详情源文件名',
    `upload_date` date DEFAULT NULL COMMENT '上传日期',
    `order_details_uploaded_by` int DEFAULT NULL COMMENT '订单详情上传用户ID',
    `order_details_created_at` datetime DEFAULT NULL COMMENT '订单详情创建时间',
    `order_details_updated_at` datetime DEFAULT NULL COMMENT '订单详情更新时间',
    
    -- ================================
    -- 来自product_list表的字段（带前缀）
    -- ================================
    `product_list_product_id` varchar(100) DEFAULT NULL COMMENT '产品总表-产品ID',
    `product_list_product_name` varchar(500) DEFAULT NULL COMMENT '产品总表-产品名称',
    `product_list_listing_time` date DEFAULT NULL COMMENT '产品总表-上架时间',
    `product_list_tmall_supplier_id` varchar(200) DEFAULT NULL COMMENT '产品总表-天猫供销ID',
    `product_list_operator` varchar(100) DEFAULT NULL COMMENT '产品总表-操作人',
    
    -- ================================
    -- 来自operation_cost_pricing表的字段（带前缀）
    -- ================================
    `operation_cost_brand_category` varchar(200) DEFAULT NULL COMMENT '运营成本-适配品牌分类',
    `operation_cost_product_code` varchar(100) DEFAULT NULL COMMENT '运营成本-商品编码',
    `operation_cost_product_name` varchar(500) DEFAULT NULL COMMENT '运营成本-产品名称',
    `operation_cost_supply_price` decimal(10,2) DEFAULT NULL COMMENT '运营成本-供货价',
    `operation_cost_operation_staff` varchar(100) DEFAULT NULL COMMENT '运营成本-运营人员',
    `operation_cost_filename` varchar(255) DEFAULT NULL COMMENT '运营成本-源文件名',
    
    -- ================================
    -- 业务计算字段（类似product_data_merge）
    -- ================================
    
    -- 基础业务指标
    `order_conversion_rate` float DEFAULT NULL COMMENT '订单转化率',
    `order_profit_margin` float DEFAULT NULL COMMENT '订单利润率',
    `avg_order_value` float DEFAULT NULL COMMENT '平均订单价值',
    
    -- 成本计算字段
    `product_cost` float DEFAULT NULL COMMENT '产品成本 (数量 * 运营成本价格)',
    `order_logistics_cost` float DEFAULT NULL COMMENT '订单物流成本 (数量 * 2.5)',
    `order_deduction` float DEFAULT NULL COMMENT '订单扣点 (商品金额 * 0.08)',
    `tax_invoice` float DEFAULT NULL COMMENT '税票 (商品金额 * 0.13)',
    
    -- 利润计算字段
    `gross_profit` float DEFAULT NULL COMMENT '毛利 (商品金额 - 产品成本 - 各项费用)',
    `net_profit` float DEFAULT NULL COMMENT '净利润',
    `profit_per_unit` float DEFAULT NULL COMMENT '单件利润',
    
    -- 汇总更新时间戳
    `cost_summary_updated_at` datetime DEFAULT NULL COMMENT '成本汇总更新时间',
    `profit_summary_updated_at` datetime DEFAULT NULL COMMENT '利润汇总更新时间',
    
    -- ================================
    -- 匹配状态字段
    -- ================================
    `is_product_list_matched` tinyint(1) DEFAULT 0 COMMENT '是否成功匹配到product_list',
    `is_operation_cost_matched` tinyint(1) DEFAULT 0 COMMENT '是否成功匹配到operation_cost_pricing',
    
    -- ================================
    -- 元数据字段
    -- ================================
    `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    PRIMARY KEY (`id`),
    
    -- 外键约束
    KEY `order_details_id` (`order_details_id`),
    KEY `order_details_uploaded_by` (`order_details_uploaded_by`),
    
    -- 业务查询索引
    KEY `idx_upload_date` (`upload_date`),
    KEY `idx_internal_order_number` (`internal_order_number`),
    KEY `idx_online_order_number` (`online_order_number`),
    KEY `idx_store_code` (`store_code`),
    KEY `idx_store_name` (`store_name`),
    KEY `idx_product_code` (`product_code`),
    KEY `idx_store_style_code` (`store_style_code`),
    KEY `idx_order_time` (`order_time`),
    KEY `idx_payment_date` (`payment_date`),
    
    -- 匹配状态索引
    KEY `idx_is_product_list_matched` (`is_product_list_matched`),
    KEY `idx_is_operation_cost_matched` (`is_operation_cost_matched`),
    KEY `idx_match_status` (`is_product_list_matched`, `is_operation_cost_matched`),
    
    -- 组合查询索引
    KEY `idx_upload_date_product_code` (`upload_date`, `product_code`),
    KEY `idx_store_style_code_product_code` (`store_style_code`, `product_code`),
    KEY `idx_operator_product_code` (`product_list_operator`, `product_code`),
    
    -- 汇总更新时间索引
    KEY `idx_cost_summary_updated` (`cost_summary_updated_at`),
    KEY `idx_profit_summary_updated` (`profit_summary_updated_at`),
    
    -- 外键约束
    CONSTRAINT `order_details_merge_ibfk_1` FOREIGN KEY (`order_details_id`) REFERENCES `order_details` (`id`) ON DELETE SET NULL,
    CONSTRAINT `order_details_merge_ibfk_2` FOREIGN KEY (`order_details_uploaded_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单详情合并表 - 包含订单详情、产品总表、运营成本价格的LEFT JOIN结果';

-- 输出执行结果
SELECT '订单详情合并表创建完成' as message;

-- 显示表结构
DESCRIBE `order_details_merge`; 