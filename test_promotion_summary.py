#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
推广费用汇总计算功能测试脚本

使用说明：
1. 确保服务已启动（运行 deploy_promotion_summary.bat）
2. 运行此脚本测试汇总计算功能
3. 默认使用admin用户测试，密码为admin123
"""

import requests
import json
from datetime import datetime, date

# API配置
BASE_URL = "http://localhost:5000"
LOGIN_URL = f"{BASE_URL}/api/login"
CALCULATE_URL = f"{BASE_URL}/api/calculate-promotion-summary"
MERGE_DATA_URL = f"{BASE_URL}/api/merge-data"

def login(username="admin", password="admin123"):
    """登录并获取token"""
    try:
        response = requests.post(LOGIN_URL, json={
            "username": username,
            "password": password
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token')
            print(f"✅ 登录成功，用户: {data.get('user', {}).get('username')}")
            return token
        else:
            print(f"❌ 登录失败: {response.text}")
            return None
    except Exception as e:
        print(f"❌ 登录请求失败: {e}")
        return None

def calculate_promotion_summary(token, target_date):
    """执行推广费用汇总计算"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(CALCULATE_URL, 
                               headers=headers,
                               json={"target_date": target_date})
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 汇总计算成功!")
            print(f"📊 {data.get('message')}")
            
            stats = data.get('stats', {})
            print(f"\n📈 详细统计:")
            print(f"   处理记录数: {stats.get('processed_count', 0)}")
            print(f"   匹配记录数: {stats.get('matched_count', 0)}")
            print(f"   更新记录数: {stats.get('updated_count', 0)}")
            
            scene_distribution = stats.get('scene_name_distribution', {})
            if scene_distribution:
                print(f"\n🎯 场景名称分布:")
                for scene_name, info in scene_distribution.items():
                    print(f"   {scene_name}: {info.get('count', 0)}次, 总费用: ¥{info.get('total_cost', 0)}")
            
            errors = stats.get('errors', [])
            if errors:
                print(f"\n⚠️  错误信息:")
                for error in errors[:5]:  # 只显示前5个错误
                    print(f"   {error}")
                if len(errors) > 5:
                    print(f"   ... 还有 {len(errors) - 5} 个错误")
                    
            return True
        else:
            print(f"❌ 汇总计算失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 汇总计算请求失败: {e}")
        return False

def get_sample_merge_data(token, target_date):
    """获取样本merge数据查看推广费用计算结果"""
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        response = requests.get(f"{MERGE_DATA_URL}?upload_date={target_date}&per_page=5", 
                               headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            items = data.get('data', [])
            
            if items:
                print(f"\n📋 样本数据 (前5条):")
                for item in items:
                    product_code = item.get('tmall_product_code', 'N/A')
                    product_name = item.get('product_name', 'N/A')[:30]  # 截取前30个字符
                    
                    print(f"\n🔸 产品编码: {product_code}")
                    print(f"   产品名称: {product_name}...")
                    
                    # 显示推广费用
                    promotion_fields = [
                        ('全站推广', item.get('sitewide_promotion')),
                        ('关键词推广', item.get('keyword_promotion')),
                        ('货品运营', item.get('product_operation')),
                        ('人群推广', item.get('crowd_promotion')),
                        ('超级短视频', item.get('super_short_video')),
                        ('多目标直投', item.get('multi_target_direct'))
                    ]
                    
                    has_promotion = False
                    for field_name, value in promotion_fields:
                        if value and value > 0:
                            print(f"   {field_name}: ¥{value}")
                            has_promotion = True
                    
                    if not has_promotion:
                        print(f"   推广费用: 暂无")
                    
                    updated_at = item.get('promotion_summary_updated_at')
                    if updated_at:
                        print(f"   更新时间: {updated_at}")
            else:
                print(f"\n📋 未找到日期为 {target_date} 的merge数据")
                
        else:
            print(f"❌ 获取merge数据失败: {response.text}")
    except Exception as e:
        print(f"❌ 获取merge数据请求失败: {e}")

def main():
    """主测试流程"""
    print("🚀 推广费用汇总计算功能测试")
    print("=" * 50)
    
    # 1. 登录
    print("\n1️⃣  用户登录...")
    token = login()
    if not token:
        return
    
    # 2. 获取测试日期
    print("\n2️⃣  选择测试日期...")
    while True:
        date_input = input("请输入要计算的日期 (YYYY-MM-DD，回车使用今天): ").strip()
        
        if not date_input:
            target_date = date.today().strftime('%Y-%m-%d')
            break
        else:
            try:
                datetime.strptime(date_input, '%Y-%m-%d')
                target_date = date_input
                break
            except ValueError:
                print("❌ 日期格式错误，请使用YYYY-MM-DD格式")
    
    print(f"目标日期: {target_date}")
    
    # 3. 执行汇总计算
    print("\n3️⃣  执行推广费用汇总计算...")
    success = calculate_promotion_summary(token, target_date)
    
    if not success:
        return
    
    # 4. 查看计算结果
    print("\n4️⃣  查看计算结果...")
    get_sample_merge_data(token, target_date)
    
    print("\n✅ 测试完成!")
    print("\n💡 提示:")
    print("   - 如需在Web界面查看完整数据，请访问: http://localhost:8080")
    print("   - 可以在合并数据页面查看推广费用计算结果")
    print("   - 推广费用字段包括: 全站推广、关键词推广、货品运营、人群推广、超级短视频、多目标直投")

if __name__ == "__main__":
    main() 