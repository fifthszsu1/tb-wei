-- 创建支付宝金额表
CREATE TABLE IF NOT EXISTS alipay_amount (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    
    -- 支付宝数据字段
    transaction_date DATE NOT NULL COMMENT '发生时间（仅日期部分）',
    income_amount DECIMAL(10, 2) COMMENT '收入金额（+元）',
    expense_amount DECIMAL(10, 2) COMMENT '支出金额（-元）',
    order_number VARCHAR(100) COMMENT '从备注中提取的订单号',
    raw_remark TEXT COMMENT '原始备注内容',
    
    -- 元数据
    filename VARCHAR(255) NOT NULL COMMENT '源文件名',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    uploaded_by INT COMMENT '上传用户ID',
    
    -- 外键约束
    FOREIGN KEY (uploaded_by) REFERENCES user(id),
    
    -- 索引
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_order_number (order_number),
    INDEX idx_uploaded_by (uploaded_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付宝金额表'; 