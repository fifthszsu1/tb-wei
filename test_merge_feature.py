#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试merge功能的脚本
"""

import requests
import json
from datetime import datetime

def test_merge_api():
    """测试merge API接口"""
    base_url = "http://localhost:5000"
    
    # 测试用的登录凭证（需要管理员账号）
    login_data = {
        "username": "admin",
        "password": "password"
    }
    
    try:
        # 1. 登录获取token
        print("1. 登录获取token...")
        response = requests.post(f"{base_url}/api/login", json=login_data)
        
        if response.status_code == 200:
            token = response.json()['access_token']
            print("   ✓ 登录成功")
        else:
            print(f"   ✗ 登录失败: {response.text}")
            return
        
        # 2. 测试merge数据API
        print("\n2. 测试merge数据API...")
        headers = {'Authorization': f'Bearer {token}'}
        
        # 测试基本查询
        response = requests.get(f"{base_url}/api/merge-data", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ 获取merge数据成功")
            print(f"   总数据量: {data['total']}")
            print(f"   当前页数据: {len(data['data'])}")
            
            # 显示前几条数据的关键信息
            if data['data']:
                print("\n   前3条数据概览:")
                for i, item in enumerate(data['data'][:3]):
                    print(f"   {i+1}. ID: {item['id']}")
                    print(f"      平台: {item['platform']}")
                    print(f"      商品编码: {item['tmall_product_code']}")
                    print(f"      是否匹配: {item['is_matched']}")
                    print(f"      产品名称: {item['product_name'][:50]}..." if item['product_name'] else "      产品名称: None")
                    print(f"      匹配的产品总表名称: {item['product_list_name'][:50]}..." if item['product_list_name'] else "      匹配的产品总表名称: None")
                    print()
        else:
            print(f"   ✗ 获取merge数据失败: {response.text}")
            return
        
        # 3. 测试筛选功能
        print("3. 测试筛选功能...")
        
        # 测试按平台筛选
        response = requests.get(f"{base_url}/api/merge-data?platform=苏宁", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ 按平台筛选成功，苏宁数据: {data['total']} 条")
        else:
            print(f"   ✗ 按平台筛选失败: {response.text}")
        
        # 测试按匹配状态筛选
        response = requests.get(f"{base_url}/api/merge-data?is_matched=true", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ 按匹配状态筛选成功，已匹配数据: {data['total']} 条")
        else:
            print(f"   ✗ 按匹配状态筛选失败: {response.text}")
        
        response = requests.get(f"{base_url}/api/merge-data?is_matched=false", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ 按匹配状态筛选成功，未匹配数据: {data['total']} 条")
        else:
            print(f"   ✗ 按匹配状态筛选失败: {response.text}")
        
        # 4. 测试按日期筛选
        print("\n4. 测试按日期筛选...")
        today = datetime.now().strftime('%Y-%m-%d')
        response = requests.get(f"{base_url}/api/merge-data?upload_date={today}", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ 按日期筛选成功，今日数据: {data['total']} 条")
        else:
            print(f"   ✗ 按日期筛选失败: {response.text}")
        
        print("\n" + "="*50)
        print("测试完成!")
        print("="*50)
        
    except requests.exceptions.ConnectionError:
        print("连接失败，请确保服务已启动")
    except Exception as e:
        print(f"测试过程中出错: {e}")

def check_database_tables():
    """检查数据库表是否存在"""
    import mysql.connector
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    try:
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', 'password'),
            database=os.getenv('DB_NAME', 'ecommerce_db'),
            charset='utf8mb4'
        )
        cursor = conn.cursor()
        
        print("检查数据库表...")
        
        # 检查product_data_merge表
        cursor.execute("SHOW TABLES LIKE 'product_data_merge'")
        result = cursor.fetchone()
        
        if result:
            print("✓ product_data_merge 表存在")
            
            # 检查数据量
            cursor.execute("SELECT COUNT(*) FROM product_data_merge")
            count = cursor.fetchone()[0]
            print(f"  数据量: {count} 条")
            
            # 检查匹配状态统计
            cursor.execute("SELECT is_matched, COUNT(*) FROM product_data_merge GROUP BY is_matched")
            stats = cursor.fetchall()
            for stat in stats:
                status = "已匹配" if stat[0] else "未匹配"
                print(f"  {status}: {stat[1]} 条")
        else:
            print("✗ product_data_merge 表不存在")
        
        # 检查视图
        cursor.execute("SHOW TABLES LIKE 'product_data_merge_view'")
        result = cursor.fetchone()
        
        if result:
            print("✓ product_data_merge_view 视图存在")
        else:
            print("✗ product_data_merge_view 视图不存在")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"数据库检查出错: {e}")

def main():
    print("Merge功能测试脚本")
    print("="*50)
    
    print("\n第一部分：数据库表检查")
    check_database_tables()
    
    print("\n第二部分：API接口测试")
    test_merge_api()
    
    print("\n测试说明：")
    print("1. 如果看到数据量为0，说明还没有上传过数据")
    print("2. 请先上传一些平台数据，然后再运行此测试")
    print("3. 匹配状态取决于product_data.tmall_product_code是否在product_list.product_id中存在")
    print("4. 建议先上传产品总表，再上传平台数据，这样匹配率会更高")

if __name__ == "__main__":
    main() 