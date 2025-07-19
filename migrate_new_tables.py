#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
数据库迁移脚本 - 创建新表结构
"""

import pymysql
import os

def create_connection():
    """创建数据库连接"""
    try:
        # 尝试连接到MySQL数据库
        connection = pymysql.connect(
            host='localhost',
            port=3306,
            user='root',
            password='password',
            database='ecommerce_db',
            charset='utf8mb4'
        )
        
        print("成功连接到MySQL数据库")
        return connection
            
    except Exception as e:
        print(f"连接数据库失败: {e}")
        return None

def execute_sql_file(connection, file_path):
    """执行SQL文件"""
    try:
        cursor = connection.cursor()
        
        with open(file_path, 'r', encoding='utf-8') as file:
            sql_script = file.read()
            
        # 分割SQL语句
        sql_statements = sql_script.split(';')
        
        for statement in sql_statements:
            statement = statement.strip()
            if statement:
                print(f"执行SQL: {statement[:50]}...")
                cursor.execute(statement)
                
        connection.commit()
        print(f"成功执行SQL文件: {file_path}")
        
    except Exception as e:
        print(f"执行SQL文件失败: {e}")
        connection.rollback()
        raise e
    finally:
        if cursor:
            cursor.close()

def main():
    """主函数"""
    print("开始数据库迁移...")
    
    # 创建数据库连接
    connection = create_connection()
    if not connection:
        print("无法连接到数据库，请确保MySQL服务已启动")
        return
    
    try:
        # 执行新表创建SQL
        sql_file_path = os.path.join('mysql', 'init', '02-new-tables.sql')
        if os.path.exists(sql_file_path):
            execute_sql_file(connection, sql_file_path)
            print("新表创建成功！")
        else:
            print(f"SQL文件不存在: {sql_file_path}")
            
        # 验证表是否创建成功
        cursor = connection.cursor()
        cursor.execute("SHOW TABLES LIKE 'product_list'")
        result = cursor.fetchone()
        if result:
            print("产品总表(product_list)创建成功")
        else:
            print("产品总表(product_list)创建失败")
            
        cursor.execute("SHOW TABLES LIKE 'planting_records'")
        result = cursor.fetchone()
        if result:
            print("种菜表格登记表(planting_records)创建成功")
        else:
            print("种菜表格登记表(planting_records)创建失败")
            
    except Exception as e:
        print(f"迁移过程中发生错误: {e}")
    finally:
        if connection:
            connection.close()
            print("数据库连接已关闭")

if __name__ == "__main__":
    main() 