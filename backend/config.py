import os
from datetime import timedelta

class Config:
    """应用配置类"""
    
    # 基础配置
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-here')
    
    # 数据库配置
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        'mysql+pymysql://root:password@localhost:3306/ecommerce_db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # SQLAlchemy 引擎配置 - 解决MySQL连接超时问题
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 20,                    # 连接池大小
        'pool_timeout': 20,                 # 获取连接的超时时间
        'pool_recycle': 3600,              # 连接回收时间（1小时）
        'pool_pre_ping': True,             # 连接前ping测试
        'max_overflow': 30,                # 最大溢出连接数
        'connect_args': {
            'connect_timeout': 60,         # 连接超时
            'read_timeout': 60,            # 读取超时  
            'write_timeout': 60,           # 写入超时
            'charset': 'utf8mb4',          # 字符集
            'autocommit': True,            # 自动提交
        }
    }
    
    # JWT配置
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-string')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # 文件上传配置
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB
    
    # 订单详情处理配置
    ENABLE_SUPPLIER_FILTER = True  # 是否启用供应商过滤（只处理包含"供应商"的店铺）
    
    # CORS配置
    CORS_ORIGINS = ["http://localhost", "http://localhost:80"]
    
    # 日志配置
    LOG_LEVEL = 'INFO'
    
    @staticmethod
    def init_app(app):
        """初始化应用配置"""
        # 创建上传目录
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True

class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False

class TestingConfig(Config):
    """测试环境配置"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

# 配置字典
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
} 