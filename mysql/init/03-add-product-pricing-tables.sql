-- 产品定价表 - 创建脚本
-- 创建时间: 2024
-- 说明: 创建公司成本价格表和运营成本价格表

-- 设置字符集和时区
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET time_zone = '+08:00';

-- 使用数据库
USE `ecommerce_db`;

-- ================================
-- 公司成本价格表
-- ================================
CREATE TABLE IF NOT EXISTS `company_cost_pricing` (
    `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    
    -- 产品基本信息
    `brand_category` varchar(200) DEFAULT NULL COMMENT '适配品牌分类',
    `product_code` varchar(100) NOT NULL COMMENT '商品编码',
    `product_name` varchar(500) DEFAULT NULL COMMENT '产品名称',
    
    -- 价格信息
    `actual_supply_price` decimal(10,2) DEFAULT NULL COMMENT '实际供货价',
    `supplier` varchar(200) DEFAULT NULL COMMENT '供应商',
    
    -- 元数据
    `filename` varchar(255) NOT NULL COMMENT '源文件名',
    `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `uploaded_by` int DEFAULT NULL COMMENT '上传用户ID',
    
    PRIMARY KEY (`id`),
    KEY `uploaded_by` (`uploaded_by`),
    KEY `idx_brand_category` (`brand_category`),
    KEY `idx_product_code` (`product_code`),
    KEY `idx_product_name` (`product_name`(100)),
    KEY `idx_supplier` (`supplier`),
    KEY `idx_filename` (`filename`),
    KEY `idx_created_at` (`created_at`),
    
    CONSTRAINT `company_cost_pricing_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公司成本价格表';

-- ================================
-- 运营成本价格表
-- ================================
CREATE TABLE IF NOT EXISTS `operation_cost_pricing` (
    `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    
    -- 产品基本信息
    `brand_category` varchar(200) DEFAULT NULL COMMENT '适配品牌分类',
    `product_code` varchar(100) NOT NULL COMMENT '商品编码',
    `product_name` varchar(500) DEFAULT NULL COMMENT '产品名称',
    
    -- 价格信息
    `supply_price` decimal(10,2) DEFAULT NULL COMMENT '供货价',
    `operation_staff` varchar(100) DEFAULT NULL COMMENT '运营人员',
    
    -- 元数据
    `filename` varchar(255) NOT NULL COMMENT '源文件名',
    `tab_name` varchar(100) DEFAULT NULL COMMENT '来源Tab名称',
    `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `uploaded_by` int DEFAULT NULL COMMENT '上传用户ID',
    
    PRIMARY KEY (`id`),
    KEY `uploaded_by` (`uploaded_by`),
    KEY `idx_brand_category` (`brand_category`),
    KEY `idx_product_code` (`product_code`),
    KEY `idx_product_name` (`product_name`(100)),
    KEY `idx_operation_staff` (`operation_staff`),
    KEY `idx_tab_name` (`tab_name`),
    KEY `idx_filename` (`filename`),
    KEY `idx_created_at` (`created_at`),
    
    CONSTRAINT `operation_cost_pricing_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='运营成本价格表';

-- 输出执行结果
SELECT '产品定价表创建完成' as message;

-- 显示表结构
DESCRIBE `company_cost_pricing`;
DESCRIBE `operation_cost_pricing`; 