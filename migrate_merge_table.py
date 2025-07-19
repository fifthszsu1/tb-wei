#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
数据库迁移脚本：创建merge表
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

def execute_sql_file(cursor, file_path):
    """执行SQL文件"""
    with open(file_path, 'r', encoding='utf-8') as file:
        sql_content = file.read()
    
    # 分割SQL语句（处理多个语句）
    statements = sql_content.split(';')
    
    for statement in statements:
        statement = statement.strip()
        if statement:
            try:
                cursor.execute(statement)
                print(f"执行成功: {statement[:50]}...")
            except pymysql.Error as err:
                print(f"执行失败: {err}")
                print(f"SQL: {statement}")

def main():
    """主函数"""
    print("开始创建merge表...")
    print(f"目标数据库: {DB_CONFIG['database']}")
    
    try:
        # 连接数据库
        connection = pymysql.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        print("数据库连接成功!")
        
        # 执行SQL文件
        sql_file = 'mysql/init/03-merge-table.sql'
        if os.path.exists(sql_file):
            execute_sql_file(cursor, sql_file)
        else:
            print(f"SQL文件不存在: {sql_file}")
            return
        
        # 提交事务
        connection.commit()
        
        # 验证表是否创建成功
        cursor.execute("SHOW TABLES LIKE 'product_data_merge'")
        result = cursor.fetchone()
        
        if result:
            print("✓ product_data_merge 表创建成功")
            
            # 显示表结构
            cursor.execute("DESCRIBE product_data_merge")
            columns = cursor.fetchall()
            print("\n表结构:")
            print(f"{'字段名':<30} {'类型':<20} {'说明'}")
            print("-" * 70)
            for column in columns:
                print(f"{column[0]:<30} {column[1]:<20}")
        else:
            print("✗ product_data_merge 表创建失败")
        
        # 检查视图是否创建成功
        cursor.execute("SHOW TABLES LIKE 'product_data_merge_view'")
        result = cursor.fetchone()
        
        if result:
            print("✓ product_data_merge_view 视图创建成功")
        else:
            print("✗ product_data_merge_view 视图创建失败")
        
        print("\n迁移完成!")
        
    except pymysql.Error as err:
        print(f"数据库错误: {err}")
        if 'connection' in locals():
            connection.rollback()
    except Exception as e:
        print(f"其他错误: {e}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    main() 