#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
使用Docker容器执行数据库迁移
"""

import subprocess
import os
import sys

def run_sql_in_container(sql_content):
    """在Docker容器中执行SQL"""
    try:
        # 创建临时SQL文件
        temp_sql = "temp_migrate.sql"
        with open(temp_sql, 'w', encoding='utf-8') as f:
            f.write(sql_content)
        
        # 复制SQL文件到容器
        print("复制SQL文件到容器...")
        result = subprocess.run([
            'docker', 'cp', temp_sql, 'tb-db-1:/tmp/migrate.sql'
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"复制文件失败: {result.stderr}")
            return False
        
        # 在容器中执行SQL
        print("在容器中执行SQL...")
        result = subprocess.run([
            'docker', 'exec', 'tb-db-1', 
            'mysql', '-u', 'root', '-ppassword', 'ecommerce_db',
            '-e', 'source /tmp/migrate.sql'
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"SQL执行失败: {result.stderr}")
            return False
        
        print("SQL执行成功!")
        print(result.stdout)
        
        # 清理临时文件
        os.remove(temp_sql)
        
        return True
        
    except Exception as e:
        print(f"迁移过程中出错: {e}")
        return False

def verify_migration():
    """验证迁移是否成功"""
    try:
        # 检查表是否存在
        print("验证表是否创建成功...")
        result = subprocess.run([
            'docker', 'exec', 'tb-db-1',
            'mysql', '-u', 'root', '-ppassword', 'ecommerce_db',
            '-e', "SHOW TABLES LIKE 'product_data_merge'"
        ], capture_output=True, text=True)
        
        if 'product_data_merge' in result.stdout:
            print("✓ product_data_merge 表创建成功")
            
            # 检查表结构
            result = subprocess.run([
                'docker', 'exec', 'tb-db-1',
                'mysql', '-u', 'root', '-ppassword', 'ecommerce_db',
                '-e', "DESCRIBE product_data_merge"
            ], capture_output=True, text=True)
            
            print("\n表结构:")
            print(result.stdout)
            
            return True
        else:
            print("✗ product_data_merge 表创建失败")
            return False
            
    except Exception as e:
        print(f"验证过程中出错: {e}")
        return False

def main():
    print("使用Docker容器执行数据库迁移")
    print("=" * 50)
    
    # 读取SQL文件
    sql_file = 'mysql/init/03-merge-table.sql'
    
    if not os.path.exists(sql_file):
        print(f"SQL文件不存在: {sql_file}")
        return
    
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # 执行迁移
    if run_sql_in_container(sql_content):
        print("\n迁移执行成功!")
        
        # 验证迁移
        if verify_migration():
            print("\n✓ 数据库迁移完成!")
        else:
            print("\n✗ 迁移验证失败")
    else:
        print("\n✗ 迁移执行失败")

if __name__ == "__main__":
    main() 