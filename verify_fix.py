#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
验证商品编码清理修改是否正确
"""

import sys
import os

def check_backend_code():
    """检查后端代码是否包含正确的修改"""
    backend_file = "backend/app.py"
    
    if not os.path.exists(backend_file):
        print(f"错误: 找不到文件 {backend_file}")
        return False
    
    with open(backend_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查关键函数是否存在
    checks = [
        ('clean_product_code_by_index', '通过列索引清理商品编码的函数'),
        ('safe_get_value_by_index', '通过列索引获取值的函数'),
        ('safe_get_int_by_index', '通过列索引获取整数的函数'),
        ('safe_get_float_by_index', '通过列索引获取浮点数的函数'),
        ('use_column_index = platform == \'苏宁\' and filepath.endswith(\'.csv\')', '苏宁CSV特殊处理逻辑'),
        ('encodings_to_try = [\'utf-8\', \'gbk\', \'gb2312\', \'utf-8-sig\', \'latin-1\']', '多编码支持'),
    ]
    
    print("检查后端代码修改:")
    print("=" * 50)
    
    all_passed = True
    for check_text, description in checks:
        if check_text in content:
            print(f"✓ {description}")
        else:
            print(f"✗ {description} - 缺失")
            all_passed = False
    
    return all_passed

def simulate_clean_function():
    """模拟清理函数的工作"""
    print("\n模拟商品编码清理功能:")
    print("=" * 50)
    
    test_cases = [
        '="724913632503"',  # 您的问题格式
        '="743653117925"',  # 标准格式
        '="123456789"',     # 另一个标准格式
        '=743653117925',    # 只有等号
        '"743653117925"',   # 只有双引号
        '743653117925',     # 正常格式
        '="ABCD123456"',    # 包含字母
        'abc123def456ghi',  # 多个数字段
        '="12345ABCD67890"', # 中间有字母的编码
    ]
    
    def clean_product_code_simulation(value_str):
        """模拟清理函数 - 使用正则表达式提取数字"""
        import re
        if value_str:
            # 使用正则表达式提取所有数字
            numbers = re.findall(r'\d+', str(value_str))
            if numbers:
                # 返回最长的数字字符串（通常是商品编码）
                return max(numbers, key=len)
        return None
    
    for test_case in test_cases:
        result = clean_product_code_simulation(test_case)
        print(f"输入: {test_case:20} -> 输出: {result}")
    
    print("\n预期结果: 使用正则表达式提取最长的数字部分")
    print("- 不管什么格式，都只保留纯数字")
    print("- 能处理各种符号包围和中文编码问题")

def main():
    print("验证商品编码清理修改")
    print("=" * 60)
    
    # 检查后端代码
    code_ok = check_backend_code()
    
    # 模拟清理功能
    simulate_clean_function()
    
    print("\n" + "=" * 60)
    if code_ok:
        print("✓ 代码修改检查通过")
        print("\n下一步:")
        print("1. 运行 restart_and_test.bat 重启服务")
        print("2. 测试上传苏宁CSV文件")
        print("3. 检查数据库中的商品编码是否已被清理")
    else:
        print("✗ 代码修改检查失败")
        print("请检查 backend/app.py 文件中的修改是否正确应用")

if __name__ == "__main__":
    main() 