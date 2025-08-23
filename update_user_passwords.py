#!/usr/bin/env python3
"""
在阿里云服务器上运行此脚本来生成用户密码更新SQL
"""

from werkzeug.security import generate_password_hash

def main():
    # 要更新的用户密码
    users_to_update = [
        {'username': 'admin', 'password': 'asd123987aZ.'},
        {'username': 'user', 'password': 'Aa99881122..'}
    ]
    
    print("=" * 60)
    print("用户密码更新SQL语句生成器")
    print("=" * 60)
    print()
    
    sql_statements = []
    
    for user_info in users_to_update:
        username = user_info['username']
        password = user_info['password']
        
        # 生成密码哈希（与应用使用相同的方法）
        password_hash = generate_password_hash(password, method='scrypt')
        
        # 生成SQL语句
        sql = f"UPDATE user SET password_hash = '{password_hash}' WHERE username = '{username}';"
        sql_statements.append(sql)
        
        print(f"用户: {username}")
        print(f"新密码: {password}")
        print(f"密码哈希: {password_hash}")
        print(f"SQL语句: {sql}")
        print("-" * 60)
        print()
    
    print("完整的SQL脚本:")
    print("=" * 60)
    print("USE ecommerce_db;")
    print()
    for sql in sql_statements:
        print(sql)
    print()
    print("-- 验证更新结果")
    print("SELECT username, role, created_at FROM user WHERE username IN ('admin', 'user');")
    print()
    print("=" * 60)
    print("复制上面的SQL语句到MySQL中执行即可！")

if __name__ == "__main__":
    main() 