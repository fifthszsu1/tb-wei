from app import app, db
from sqlalchemy import text

def migrate_database():
    with app.app_context():
        print("开始重新创建数据库表...")
        
        # 使用正确的SQLAlchemy 2.x语法
        with db.engine.connect() as conn:
            # 删除现有表
            conn.execute(text("DROP TABLE IF EXISTS product_data"))
            conn.commit()
            print("已删除旧表")
        
        # 创建新表
        db.create_all()
        print("数据库表重新创建完成!")
        
        # 验证表结构
        with db.engine.connect() as conn:
            result = conn.execute(text("DESCRIBE product_data"))
            print("\n新表结构:")
            for row in result:
                print(f"  {row[0]}: {row[1]}")

if __name__ == '__main__':
    migrate_database() 