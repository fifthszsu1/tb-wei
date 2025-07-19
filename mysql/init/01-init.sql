-- 电商数据管理系统数据库初始化脚本

-- 设置字符集
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS ecommerce_db 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE ecommerce_db;

-- 设置时区
SET time_zone = '+08:00';

-- 创建用户表
CREATE TABLE IF NOT EXISTS user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(200) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建商品数据表
CREATE TABLE IF NOT EXISTS product_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    product_code VARCHAR(100),
    product_name TEXT,
    store_code VARCHAR(100),
    store_name VARCHAR(200),
    brand VARCHAR(100),
    category_1 VARCHAR(100),
    category_2 VARCHAR(100),
    category_3 VARCHAR(100),
    category_4 VARCHAR(100),
    unit_price DECIMAL(10,2),
    sales_volume INT,
    product_sales_count INT,
    order_count INT,
    favorite_count INT,
    payment_count INT,
    payment_conversion_rate DECIMAL(5,4),
    click_conversion_rate DECIMAL(5,4),
    avg_stay_time DECIMAL(8,2),
    page_views INT,
    new_payment_conversion DECIMAL(5,4),
    total_payment_conversion DECIMAL(5,4),
    traffic_ratio DECIMAL(5,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INT,
    INDEX idx_platform (platform),
    INDEX idx_product_code (product_code),
    INDEX idx_store_name (store_name),
    INDEX idx_brand (brand),
    INDEX idx_created_at (created_at),
    INDEX idx_uploaded_by (uploaded_by),
    FOREIGN KEY (uploaded_by) REFERENCES user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认管理员用户
-- 密码: admin123 (bcrypt hash)
INSERT IGNORE INTO user (username, email, password_hash, role) VALUES 
('admin', 'admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeVMstg6CZZ1W6X4K', 'admin');

-- 插入默认普通用户
-- 密码: user123 (bcrypt hash)  
INSERT IGNORE INTO user (username, email, password_hash, role) VALUES 
('user', 'user@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeVMstg6CZZ1W6X4K', 'user');

-- 创建视图：平台统计
CREATE OR REPLACE VIEW platform_stats AS
SELECT 
    platform,
    COUNT(*) as total_records,
    COUNT(DISTINCT store_name) as store_count,
    COUNT(DISTINCT brand) as brand_count,
    AVG(unit_price) as avg_price,
    SUM(sales_volume) as total_sales
FROM product_data 
GROUP BY platform;

-- 创建视图：品牌统计  
CREATE OR REPLACE VIEW brand_stats AS
SELECT 
    brand,
    COUNT(*) as product_count,
    COUNT(DISTINCT platform) as platform_count,
    AVG(unit_price) as avg_price,
    SUM(sales_volume) as total_sales
FROM product_data 
WHERE brand IS NOT NULL AND brand != ''
GROUP BY brand
ORDER BY product_count DESC;

-- 创建视图：用户上传统计
CREATE OR REPLACE VIEW user_upload_stats AS
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

COMMIT;

-- 显示初始化完成信息
SELECT 'Database initialization completed successfully!' as message; 