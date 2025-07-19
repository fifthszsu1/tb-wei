#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库表重构迁移脚本
根据新的业务需求重新创建product_data表
"""

import pymysql
import os
from datetime import datetime

# 数据库配置
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'rootpassword',
    'database': 'ecommerce_data',
    'charset': 'utf8mb4'
}

def backup_existing_data(cursor):
    """备份现有数据"""
    print("正在备份现有数据...")
    
    # 检查表是否存在
    cursor.execute("SHOW TABLES LIKE 'product_data'")
    if cursor.fetchone():
        # 创建备份表
        backup_table = f"product_data_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        cursor.execute(f"CREATE TABLE {backup_table} AS SELECT * FROM product_data")
        print(f"数据已备份到表: {backup_table}")
        return backup_table
    else:
        print("未找到现有的product_data表")
        return None

def create_new_table(cursor):
    """创建新的product_data表"""
    print("正在创建新的product_data表...")
    
    # 删除现有表
    cursor.execute("DROP TABLE IF EXISTS product_data")
    
    # 创建新表
    create_table_sql = """
    CREATE TABLE product_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        platform VARCHAR(50) NOT NULL,
        
        -- 基础字段
        product_name TEXT COMMENT '商品名称',
        tmall_product_code VARCHAR(100) COMMENT '天猫商品编码',
        tmall_supplier_name VARCHAR(200) COMMENT '天猫供应商名称',
        
        -- 流量相关字段
        visitor_count INT COMMENT '访客数',
        page_views INT COMMENT '浏览量',
        search_guided_visitors INT COMMENT '搜索商品引导访客数',
        
        -- 用户行为字段
        add_to_cart_count INT COMMENT '加购件数',
        favorite_count INT COMMENT '收藏人数',
        
        -- 支付相关字段
        payment_amount DECIMAL(15,2) COMMENT '支付金额',
        payment_product_count INT COMMENT '支付商品件数',
        payment_buyer_count INT COMMENT '支付买家数',
        search_guided_payment_buyers INT COMMENT '搜索引导支付买家数',
        
        -- 价值和转化指标
        unit_price DECIMAL(10,2) COMMENT '客单价',
        visitor_average_value DECIMAL(10,2) COMMENT '访客平均价值',
        payment_conversion_rate DECIMAL(8,4) COMMENT '支付转化率',
        order_conversion_rate DECIMAL(8,4) COMMENT '下单转化率',
        
        -- 页面行为指标
        avg_stay_time DECIMAL(10,2) COMMENT '平均停留时长',
        detail_page_bounce_rate DECIMAL(8,4) COMMENT '详情页跳出率',
        order_payment_conversion_rate DECIMAL(8,4) COMMENT '下单支付转化率',
        search_payment_conversion_rate DECIMAL(8,4) COMMENT '搜索支付转化率',
        
        -- 退款相关字段
        refund_amount DECIMAL(15,2) COMMENT '退款金额',
        refund_ratio DECIMAL(8,4) COMMENT '退款占比',
        
        -- 元数据
        filename VARCHAR(255) NOT NULL COMMENT '上传的文件名',
        upload_date DATE NOT NULL COMMENT '用户选择的日期',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '系统创建时间',
        uploaded_by INT COMMENT '上传用户ID',
        
        INDEX idx_platform (platform),
        INDEX idx_upload_date (upload_date),
        INDEX idx_filename (filename),
        INDEX idx_uploaded_by (uploaded_by)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品数据表'
    """
    
    cursor.execute(create_table_sql)
    print("新的product_data表创建成功!")

def show_table_structure(cursor):
    """显示表结构"""
    print("\n新表结构:")
    cursor.execute("DESCRIBE product_data")
    results = cursor.fetchall()
    
    print(f"{'字段名':<30} {'类型':<20} {'说明'}")
    print("-" * 70)
    for row in results:
        field_name = row[0]
        field_type = row[1]
        print(f"{field_name:<30} {field_type:<20}")

def main():
    """主函数"""
    print("开始数据库表重构...")
    print(f"目标数据库: {DB_CONFIG['database']}")
    
    try:
        # 连接数据库
        connection = pymysql.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # 备份现有数据
        backup_table = backup_existing_data(cursor)
        
        # 创建新表
        create_new_table(cursor)
        
        # 提交更改
        connection.commit()
        
        # 显示表结构
        show_table_structure(cursor)
        
        print("\n数据库表重构完成!")
        if backup_table:
            print(f"原有数据已备份到: {backup_table}")
        print("注意: 需要重新上传数据文件以适配新的表结构")
        
    except pymysql.Error as e:
        print(f"数据库操作失败: {e}")
        if 'connection' in locals():
            connection.rollback()
    except Exception as e:
        print(f"执行失败: {e}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()

if __name__ == '__main__':
    main() 