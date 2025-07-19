#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
数据库迁移脚本：为主体报表添加计划名称字段
"""

import pymysql
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

def migrate_plan_name_field():
    """为主体报表添加计划名称字段"""
    try:
        # 连接数据库
        connection = pymysql.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'ecommerce_db'),
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        
        with connection.cursor() as cursor:
            # 检查字段是否已存在
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM information_schema.columns 
                WHERE table_name = 'subject_report' 
                AND column_name = 'plan_name'
                AND table_schema = %s
            """, (os.getenv('DB_NAME', 'ecommerce_db'),))
            
            result = cursor.fetchone()
            
            if result['count'] == 0:
                # 添加 plan_name 字段
                cursor.execute("""
                    ALTER TABLE subject_report 
                    ADD COLUMN plan_name VARCHAR(200) AFTER shop_name
                """)
                
                print("✓ 已成功为 subject_report 表添加 plan_name 字段")
            else:
                print("✓ plan_name 字段已存在，无需添加")
            
            # 提交更改
            connection.commit()
            
    except Exception as e:
        print(f"✗ 迁移失败: {e}")
        return False
    finally:
        if 'connection' in locals():
            connection.close()
    
    return True

if __name__ == '__main__':
    print("开始数据库迁移：添加计划名称字段")
    print("=" * 50)
    
    if migrate_plan_name_field():
        print("=" * 50)
        print("✓ 数据库迁移完成")
        print("\n现在主体报表数据导入时会过滤计划名称，只保留包含以下关键字的记录：")
        print("- 五更")
        print("- 希臻")
        print("- 谦易律哲")
    else:
        print("=" * 50)
        print("✗ 数据库迁移失败")
        exit(1) 