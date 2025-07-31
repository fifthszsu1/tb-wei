from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import logging
from logging.handlers import RotatingFileHandler
import os
import sys
import time



# 导入配置和模型
from config import config
from models import db, User

# 导入路由模块
from routes.auth import auth_bp
from routes.upload import upload_bp
from routes.data import data_bp
from routes.business import business_bp

def create_app(config_name=None):
    """创建Flask应用工厂函数"""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'default')
    
    app = Flask(__name__)
    
    # 加载配置
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)
    
    # 初始化扩展
    db.init_app(app)
    jwt = JWTManager(app)
    
    # 配置CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": app.config['CORS_ORIGINS'],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "Accept"],
            "supports_credentials": True
        }
    })
    
    # 配置日志
    setup_logging(app)
    
    # 注册蓝图
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(upload_bp, url_prefix='/api')
    app.register_blueprint(data_bp, url_prefix='/api')
    app.register_blueprint(business_bp, url_prefix='/api')
    
    # 健康检查端点
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'healthy', 'timestamp': time.time()}), 200
    
    return app

def setup_logging(app):
    """设置日志配置"""
    # 配置根logger，让所有子logger都能输出到控制台
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

def init_database(app):
    """初始化数据库，带重试机制"""
    from sqlalchemy import text
    max_retries = 30  # 最多重试30次
    retry_delay = 2   # 每次重试间隔2秒
    
    for attempt in range(max_retries):
        try:
            with app.app_context():
                # 测试数据库连接
                with db.engine.connect() as conn:
                    conn.execute(text('SELECT 1'))
                print(f"数据库连接成功！")
                
                # 创建所有表
                db.create_all()
                print("数据库表创建成功！")
                
                # 创建默认管理员用户
                admin = User.query.filter_by(username='admin').first()
                if not admin:
                    admin = User(
                        username='admin',
                        email='admin@example.com',
                        role='admin'
                    )
                    admin.set_password('admin123')
                    db.session.add(admin)
                    db.session.commit()
                    print("创建管理员账户: admin / admin123")
                
                # 创建默认普通用户
                user = User.query.filter_by(username='user').first()
                if not user:
                    user = User(
                        username='user',
                        email='user@example.com',
                        role='user'
                    )
                    user.set_password('user123')
                    db.session.add(user)
                    db.session.commit()
                    print("创建普通用户账户: user / user123")
                
                print("数据库初始化完成！")
                return True
                
        except Exception as e:
            print(f"数据库连接失败 (尝试 {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                print(f"等待 {retry_delay} 秒后重试...")
                time.sleep(retry_delay)
            else:
                print("数据库连接失败，已达到最大重试次数")
                return False

# 创建应用实例
app = create_app()

if __name__ == '__main__':
    # 确保日志目录存在
    os.makedirs('logs', exist_ok=True)
    
    # 初始化数据库
    if init_database(app):
        # 启动Flask应用
        app.run(host='0.0.0.0', port=5000, debug=True)
    else:
        print("应用启动失败：无法连接数据库")
        exit(1) 