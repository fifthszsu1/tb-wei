-- 创建商品数据合并表
CREATE TABLE IF NOT EXISTS product_data_merge (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- 来自product_data的字段
    product_data_id INT,
    product_name TEXT COMMENT '产品',
    tmall_product_code VARCHAR(100) COMMENT '天猫ID',
    visitor_count INT COMMENT '访客数',
    page_views INT,
    search_guided_visitors INT COMMENT '自然搜索',
    add_to_cart_count INT COMMENT '加购',
    favorite_count INT COMMENT '收藏',
    payment_amount DECIMAL(10,2) COMMENT '前台成交金额',
    payment_product_count INT COMMENT '支付件数',
    payment_buyer_count INT COMMENT '前台订单笔数',
    search_guided_payment_buyers INT,
    unit_price DECIMAL(10,2),
    visitor_average_value DECIMAL(10,2),
    payment_conversion_rate DECIMAL(10,2),
    order_conversion_rate DECIMAL(10,2),
    avg_stay_time DECIMAL(10,2),
    detail_page_bounce_rate DECIMAL(10,2),
    order_payment_conversion_rate DECIMAL(10,2),
    search_payment_conversion_rate DECIMAL(10,2),
    refund_amount DECIMAL(10,2) COMMENT '退款金额',
    refund_ratio DECIMAL(10,2),
    filename VARCHAR(255) NOT NULL,
    upload_date DATE NOT NULL COMMENT '日期',
    uploaded_by INT,
    
    -- 来自product_list的字段
    product_list_id INT,
    product_list_name VARCHAR(500),
    listing_time DATE COMMENT '上架时间',
    product_list_created_at DATETIME,
    product_list_updated_at DATETIME,
    product_list_uploaded_by INT,
    
    -- 推广费用字段
    sitewide_promotion DECIMAL(10,2) COMMENT '全站推广费用',
    keyword_promotion DECIMAL(10,2) COMMENT '关键词推广费用',
    product_operation DECIMAL(10,2) COMMENT '货品运营费用',
    crowd_promotion DECIMAL(10,2) COMMENT '人群推广费用',
    super_short_video DECIMAL(10,2) COMMENT '超级短视频费用',
    multi_target_direct DECIMAL(10,2) COMMENT '多目标直投费用',
    promotion_summary_updated_at DATETIME COMMENT '推广费用汇总更新时间',
    
    -- 种菜表格汇总字段
    planting_orders INT COMMENT '匹配到的种菜订单数量',
    planting_amount DECIMAL(10,2) COMMENT '种菜订单总金额',
    planting_cost DECIMAL(10,2) COMMENT '种菜佣金总额',
    planting_logistics_cost DECIMAL(10,2) COMMENT '物流成本 (订单数 * 2.5)',
    planting_deduction DECIMAL(10,2) COMMENT '扣款金额 (总金额 * 0.08)',
    planting_summary_updated_at DATETIME COMMENT '种菜汇总更新时间',
    
    -- 转化率和业务指标字段
    conversion_rate DECIMAL(10,2) COMMENT '支付转化率',
    favorite_rate DECIMAL(10,2) COMMENT '收藏率',
    cart_rate DECIMAL(10,2) COMMENT '加购率',
    uv_value DECIMAL(10,2) COMMENT 'UV价值',
    real_conversion_rate DECIMAL(10,2) COMMENT '真实转化率',
    real_amount DECIMAL(10,2) COMMENT '真实金额',
    real_buyer_count INT COMMENT '真实买家数',
    real_product_count INT COMMENT '真实件数',
    product_cost DECIMAL(10,2) COMMENT '产品成本',
    real_order_deduction DECIMAL(10,2) COMMENT '真实订单扣点',
    tax_invoice DECIMAL(10,2) COMMENT '税票',
    real_order_logistics_cost DECIMAL(10,2) COMMENT '真实订单物流成本',
    gross_profit DECIMAL(10,2) COMMENT '毛利',
    
    -- merge表的元数据
    is_matched BOOLEAN DEFAULT FALSE COMMENT '是否成功匹配到product_list',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 外键约束
    FOREIGN KEY (product_data_id) REFERENCES product_data(id),
    FOREIGN KEY (product_list_id) REFERENCES product_list(id),
    FOREIGN KEY (uploaded_by) REFERENCES user(id),
    FOREIGN KEY (product_list_uploaded_by) REFERENCES user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 添加索引以提高查询性能
CREATE INDEX idx_product_data_merge_upload_date ON product_data_merge (upload_date);
CREATE INDEX idx_product_data_merge_tmall_product_code ON product_data_merge (tmall_product_code);
CREATE INDEX idx_product_data_merge_product_data_id ON product_data_merge (product_data_id);
CREATE INDEX idx_product_data_merge_product_list_id ON product_data_merge (product_list_id);
CREATE INDEX idx_product_data_merge_is_matched ON product_data_merge (is_matched);

-- 创建视图，方便查询完整的merge数据
CREATE OR REPLACE VIEW `product_data_merge_view` AS
SELECT 
    m.*,
    u1.username as uploaded_by_name,
    u2.username as product_list_uploaded_by_name
FROM `product_data_merge` m
LEFT JOIN `user` u1 ON m.uploaded_by = u1.id
LEFT JOIN `user` u2 ON m.product_list_uploaded_by = u2.id; 