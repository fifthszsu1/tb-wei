-- 新增表结构：产品总表和种菜表格登记

-- 设置字符集
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 使用数据库
USE ecommerce_db;

-- 创建产品总表
CREATE TABLE IF NOT EXISTS product_list (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(100) NOT NULL COMMENT '产品ID/链接ID',
    product_name VARCHAR(500) NOT NULL COMMENT '商品名称',
    listing_time DATE COMMENT '上架时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    uploaded_by INT,
    INDEX idx_product_id (product_id),
    INDEX idx_product_name (product_name(100)),
    INDEX idx_listing_time (listing_time),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (uploaded_by) REFERENCES user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品总表';

-- 创建种菜表格登记表
CREATE TABLE IF NOT EXISTS planting_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_name VARCHAR(100) NOT NULL COMMENT '人员名称（对应Excel的tab名）',
    quantity INT COMMENT '数量',
    order_date DATE COMMENT '订单日期',
    wechat_id VARCHAR(100) COMMENT '微信号',
    product_id VARCHAR(100) COMMENT '产品ID',
    keyword VARCHAR(200) COMMENT '关键词',
    wangwang_id VARCHAR(100) COMMENT '旺旺号',
    order_wechat VARCHAR(100) COMMENT '做单微信',
    order_number VARCHAR(100) COMMENT '订单号',
    amount DECIMAL(10,2) COMMENT '金额',
    gift_commission DECIMAL(10,2) COMMENT '赠送/佣金',
    refund_status VARCHAR(50) COMMENT '返款状态',
    refund_amount DECIMAL(10,2) COMMENT '返款金额',
    refund_wechat VARCHAR(100) COMMENT '返款微信',
    refund_date DATE COMMENT '返款日期',
    store_name VARCHAR(200) COMMENT '店铺名称',
    internal_order_number VARCHAR(100) COMMENT '内部订单号',
    remarks TEXT COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    uploaded_by INT,
    INDEX idx_staff_name (staff_name),
    INDEX idx_order_date (order_date),
    INDEX idx_product_id (product_id),
    INDEX idx_store_name (store_name),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (uploaded_by) REFERENCES user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='种菜表格登记';

COMMIT;

-- 显示表创建完成信息
SELECT 'New tables created successfully!' as message; 