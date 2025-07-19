from app import app, db

def migrate_database():
    with app.app_context():
        print("开始重新创建数据库表...")
        db.drop_all()
        db.create_all()
        print("数据库表重新创建完成!")

if __name__ == '__main__':
    migrate_database() 