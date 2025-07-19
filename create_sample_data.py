#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建示例数据脚本
用于生成测试数据，方便演示系统功能
"""

import pandas as pd
import random
from faker import Faker
import os

# 创建Faker实例，设置中文
fake = Faker('zh_CN')

def create_suning_sample_data():
    """创建苏宁平台示例数据"""
    print("正在创建苏宁平台示例数据...")
    
    data = []
    brands = ['飞利浦', '欧乐B', '小米', '华为', '美的', 'oral-B', 'usmile', '松下', '海尔', '格力']
    categories_1 = ['家用电器', '3C数码', '个护清洁', '食品饮料', '母婴用品']
    categories_2 = ['生活电器', '厨房电器', '口腔护理', '个人护理', '手机通讯', '电脑办公']
    
    for i in range(100):
        brand = random.choice(brands)
        cat1 = random.choice(categories_1)
        cat2 = random.choice(categories_2)
        
        product_data = {
            '商品编码': f"SN{random.randint(100000000, 999999999)}",
            '商品名称': f"{brand}{fake.word()}电动牙刷{fake.word()}替换刷头",
            '店铺编码': f"store{random.randint(1000, 9999)}",
            '店铺名称': f"{brand}官方旗舰店",
            '品牌': brand,
            '一级类目': cat1,
            '二级类目': cat2,
            '三级类目': '电动牙刷',
            '四级类目': '刷头配件',
            '客单价': round(random.uniform(29.9, 199.9), 2),
            '销量': random.randint(10, 1000),
            '商品销售数量': random.randint(50, 2000),
            '订购人数': random.randint(20, 500),
            '收藏人数': random.randint(5, 200),
            '支付人数': random.randint(15, 400),
            '支付转化率': f"{random.uniform(10, 80):.2f}%",
            '点击转化率': f"{random.uniform(5, 30):.2f}%",
            '平均停留时间': round(random.uniform(10, 120), 2),
            '页面浏览量': random.randint(100, 5000),
        }
        data.append(product_data)
    
    df = pd.DataFrame(data)
    
    # 确保sample_data目录存在
    os.makedirs('sample_data', exist_ok=True)
    
    # 保存为CSV和Excel格式
    df.to_csv('sample_data/苏宁商品数据样例.csv', index=False, encoding='utf-8-sig')
    df.to_excel('sample_data/苏宁商品数据样例.xlsx', index=False)
    print("苏宁数据已保存到 sample_data/苏宁商品数据样例.csv 和 .xlsx")

def create_taobao_sample_data():
    """创建淘宝平台示例数据"""
    print("正在创建淘宝平台示例数据...")
    
    data = []
    brands = ['小米', '华为', '苹果', '三星', '一加', 'vivo', 'oppo', '魅族']
    
    for i in range(80):
        brand = random.choice(brands)
        
        product_data = {
            '商品编号': f"TB{random.randint(1000000000, 9999999999)}",
            '商品标题': f"{brand} {fake.word()} 智能手机 {random.randint(64, 512)}GB",
            '店铺名称': f"{brand}官方旗舰店",
            '客单价': round(random.uniform(1299, 5999), 2),
            '销量': random.randint(50, 2000),
            '订单数': random.randint(30, 1500),
            '转化率': f"{random.uniform(5, 25):.2f}%",
            '点击量': random.randint(1000, 20000),
            '收藏数': random.randint(100, 5000),
        }
        data.append(product_data)
    
    df = pd.DataFrame(data)
    
    # 保存为CSV和Excel格式
    df.to_csv('sample_data/淘宝商品数据样例.csv', index=False, encoding='utf-8-sig')
    df.to_excel('sample_data/淘宝商品数据样例.xlsx', index=False)
    print("淘宝数据已保存到 sample_data/淘宝商品数据样例.csv 和 .xlsx")

def create_pinduoduo_sample_data():
    """创建拼多多平台示例数据"""
    print("正在创建拼多多平台示例数据...")
    
    data = []
    categories = ['家居用品', '服装鞋包', '食品饮料', '美妆个护', '母婴用品', '数码电器']
    
    for i in range(60):
        category = random.choice(categories)
        
        product_data = {
            '商品ID': f"PDD{random.randint(100000000, 999999999)}",
            '商品名称': f"{fake.word()}{category}{fake.word()}",
            '店铺名称': f"{fake.company()}",
            '价格': round(random.uniform(9.9, 299.9), 2),
            '销量': random.randint(100, 5000),
            '订单量': random.randint(80, 4000),
            '好评率': f"{random.uniform(85, 99):.1f}%",
            '浏览量': random.randint(5000, 50000),
        }
        data.append(product_data)
    
    df = pd.DataFrame(data)
    
    # 保存为CSV和Excel格式
    df.to_csv('sample_data/拼多多商品数据样例.csv', index=False, encoding='utf-8-sig')
    df.to_excel('sample_data/拼多多商品数据样例.xlsx', index=False)
    print("拼多多数据已保存到 sample_data/拼多多商品数据样例.csv 和 .xlsx")

def main():
    """主函数"""
    print("==========================================")
    print("    电商数据管理系统 - 示例数据生成器")
    print("==========================================")
    print()
    
    try:
        create_suning_sample_data()
        create_taobao_sample_data()
        create_pinduoduo_sample_data()
        
        print()
        print("==========================================")
        print("示例数据生成完成！")
        print()
        print("生成的文件：")
        print("  - sample_data/苏宁商品数据样例.csv")
        print("  - sample_data/苏宁商品数据样例.xlsx")
        print("  - sample_data/淘宝商品数据样例.csv")
        print("  - sample_data/淘宝商品数据样例.xlsx")
        print("  - sample_data/拼多多商品数据样例.csv")
        print("  - sample_data/拼多多商品数据样例.xlsx")
        print()
        print("您可以使用这些文件来测试系统的数据导入功能。")
        print("==========================================")
        
    except Exception as e:
        print(f"生成示例数据时出错: {e}")
        print("请确保已安装必要的依赖包：")
        print("  pip install pandas faker openpyxl")

if __name__ == "__main__":
    main() 