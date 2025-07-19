#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json
import time

def test_backend_health():
    """测试后端健康检查"""
    try:
        response = requests.get('http://localhost:5000/health', timeout=5)
        print(f"后端健康检查: {response.status_code}")
        print(f"响应内容: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"后端健康检查失败: {e}")
        return False

def test_frontend():
    """测试前端页面"""
    try:
        response = requests.get('http://localhost:80', timeout=5)
        print(f"前端页面: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        print(f"前端页面访问失败: {e}")
        return False

def test_login():
    """测试登录功能"""
    try:
        # 测试登录
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        response = requests.post('http://localhost:5000/api/login', 
                               json=login_data, 
                               timeout=5)
        print(f"登录测试: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token')
            print(f"登录成功，获取到token: {token[:50]}...")
            return token
        else:
            print(f"登录失败: {response.text}")
            return None
    except Exception as e:
        print(f"登录测试失败: {e}")
        return None

def test_data_api(token):
    """测试数据API"""
    try:
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        response = requests.get('http://localhost:5000/api/data', 
                              headers=headers, 
                              timeout=5)
        print(f"数据API测试: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"数据总数: {data.get('total', 0)}")
            return True
        else:
            print(f"数据API失败: {response.text}")
            return False
    except Exception as e:
        print(f"数据API测试失败: {e}")
        return False

def main():
    print("=== 系统状态检查 ===")
    
    # 1. 测试后端健康检查
    print("\n1. 后端健康检查...")
    backend_ok = test_backend_health()
    
    # 2. 测试前端页面
    print("\n2. 前端页面检查...")
    frontend_ok = test_frontend()
    
    # 3. 测试登录
    print("\n3. 登录功能测试...")
    token = test_login()
    
    # 4. 测试数据API
    if token:
        print("\n4. 数据API测试...")
        data_api_ok = test_data_api(token)
    else:
        data_api_ok = False
    
    # 总结
    print("\n=== 测试结果 ===")
    print(f"后端健康检查: {'✓' if backend_ok else '✗'}")
    print(f"前端页面: {'✓' if frontend_ok else '✗'}")
    print(f"登录功能: {'✓' if token else '✗'}")
    print(f"数据API: {'✓' if data_api_ok else '✗'}")
    
    if all([backend_ok, frontend_ok, token, data_api_ok]):
        print("\n✅ 系统运行正常！")
        print("请访问 http://localhost:80 来使用系统")
    else:
        print("\n❌ 系统存在问题，请检查容器状态")

if __name__ == '__main__':
    main() 