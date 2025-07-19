# 🐳 电商数据管理系统 - 生产环境部署指南

## 📋 系统要求

### 硬件要求
- **CPU**: 2核心或以�?
- **内存**: 4GB RAM 或以�?(推荐8GB)
- **存储**: 20GB 可用空间或以�?
- **网络**: 稳定的互联网连接

### 软件要求
- **Docker**: 20.10.0 或以上版�?
- **Docker Compose**: 2.0.0 或以上版�?
- **操作系统**: 
  - Linux (Ubuntu 18.04+, CentOS 7+, Debian 10+)
  - macOS 10.15+
  - Windows 10/11 (启用WSL2)

## 🚀 快速部�?

### Windows 用户
```bash
# 1. 克隆或下载项目到本地
# 2. 打开 PowerShell �?CMD，进入项目目�?
cd path\to\project

# 3. 运行部署脚本
deploy.bat

# 运行时可选择镜像源（国际或中国镜像）
```

### Linux/Mac 用户
```bash
# 1. 克隆或下载项目到本地
# 2. 打开终端，进入项目目�?
cd /path/to/project

# 3. 给脚本添加执行权限并运行
chmod +x deploy.sh
./deploy.sh

# 运行时可选择镜像源（国际或中国镜像）
```

## 📂 项目结构

```
项目根目�?
├── docker-compose.prod.yml          # 生产环境配置（国际版�?
├── docker-compose.prod.china.yml    # 生产环境配置（中国镜像版�?
├── Dockerfile.backend.prod          # 后端生产环境镜像（国际版�?
├── Dockerfile.backend.prod.china    # 后端生产环境镜像（中国镜像版�?
├── Dockerfile.frontend.prod         # 前端生产环境镜像（国际版�?
├── Dockerfile.frontend.prod.china   # 前端生产环境镜像（中国镜像版�?
├── deploy.sh                        # Linux/Mac 部署脚本
├── deploy.bat                       # Windows 部署脚本
├── nginx/
�?  ├── nginx.prod.conf              # Nginx 生产环境配置
�?  └── ssl/                         # SSL 证书目录（可选）
├── mysql/
�?  └── init/
�?      └── 01-init.sql              # MySQL 初始化脚�?
├── data/                            # 数据持久化目�?
�?  ├── mysql/                       # MySQL 数据文件
�?  └── uploads/                     # 上传文件存储
├── backend/                         # Flask 后端代码
├── frontend/                        # 前端静态文�?
└── requirements.txt                 # Python 依赖
```

## 🔧 手动部署步骤

### 1. 准备环境
```bash
# 创建必要目录
mkdir -p data/mysql data/uploads nginx/ssl

# 设置目录权限（Linux/Mac�?
chmod 755 data data/mysql data/uploads
```

### 2. 启动服务
```bash
# 使用国际镜像版本
USE_CHINA_MIRROR=false MYSQL_IMAGE=mysql:8.0 docker-compose up -d --build

# 或使用中国镜像版本（网络不佳时）
USE_CHINA_MIRROR=true MYSQL_IMAGE=registry.cn-hangzhou.aliyuncs.com/library/mysql:8.0 docker-compose up -d --build
```

### 3. 检查服务状�?
```bash
# 查看服务状�?
docker-compose ps

# 查看服务日志
docker-compose logs -f

# 检查健康状�?
curl -f http://localhost/health
curl -f http://localhost/api/platforms
```

## 🌐 服务访问

### 主要服务
- **前端界面**: http://localhost
- **后端API**: http://localhost/api
- **MySQL数据�?*: localhost:3306

### 默认账户
- **管理�?*: 
  - 用户�? `admin`
  - 密码: `admin123`
  - 权限: 查看所有数据、管理用户、系统统�?

- **普通用�?*:
  - 用户�? `user`
  - 密码: `user123`
  - 权限: 仅上传文�?

## 🔒 安全配置

### 1. 修改默认密码
```bash
# 进入后端容器
docker-compose exec backend bash

# 使用Python修改密码
python -c "
from app import app, db, User
from werkzeug.security import generate_password_hash
with app.app_context():
    admin = User.query.filter_by(username='admin').first()
    admin.password_hash = generate_password_hash('your-new-password')
    db.session.commit()
    print('Password updated successfully')
"
```

### 2. 修改密钥
编辑 `docker-compose.yml`�?
```yaml
environment:
  - SECRET_KEY=your-production-secret-key-change-this-to-random-string
  - JWT_SECRET_KEY=your-production-jwt-secret-change-this-to-random-string
```

### 3. 配置SSL证书（可选）
1. 将SSL证书文件放入 `nginx/ssl/` 目录
2. 编辑 `nginx/nginx.prod.conf`，取消HTTPS配置注释
3. 重启前端服务�?
```bash
docker-compose restart frontend
```

## 📊 数据管理

### 数据备份
```bash
# 备份MySQL数据
docker-compose exec mysql mysqldump -u root -ppassword ecommerce_db > backup_$(date +%Y%m%d).sql

# 备份上传文件
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz data/uploads/
```

### 数据恢复
```bash
# 恢复MySQL数据
docker-compose exec -T mysql mysql -u root -ppassword ecommerce_db < backup_20240101.sql

# 恢复上传文件
tar -xzf uploads_backup_20240101.tar.gz
```

### 数据迁移
```bash
# 从旧版本迁移（如果有SQLite数据�?
# 1. 导出SQLite数据为SQL
# 2. 修改SQL语法适配MySQL
# 3. 导入到MySQL
```

## 🔍 故障排除

### 常见问题

#### 1. Docker镜像拉取失败
```bash
# 问题：网络连接超�?
# 解决：使用中国镜像版�?
docker-compose -f docker-compose.prod.china.yml up -d --build
```

#### 2. MySQL启动失败
```bash
# 检查日�?
docker-compose logs mysql

# 可能原因：端口占用，数据目录权限问题
# 解决�?
sudo netstat -tlnp | grep :3306  # 检查端口占�?
sudo chown -R 999:999 data/mysql  # 修正MySQL数据目录权限
```

#### 3. 前端无法访问后端
```bash
# 检查网络连�?
docker-compose exec frontend ping backend

# 检查后端服�?
docker-compose logs backend
```

#### 4. 文件上传失败
```bash
# 检查上传目录权�?
ls -la data/uploads/
sudo chown -R 1000:1000 data/uploads/
```

### 日志查看
```bash
# 查看所有服务日�?
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql
```

### 性能监控
```bash
# 查看资源使用情况
docker stats

# 查看服务健康状�?
docker-compose ps
```

## 📈 扩展配置

### 1. 负载均衡
可以配置多个后端实例�?
```yaml
# �?docker-compose.prod.yml 中添�?
backend2:
  # 复制backend配置，修改container_name和端�?
```

### 2. 数据库集�?
配置MySQL主从复制或使用外部数据库服务�?

### 3. 缓存优化
添加Redis缓存服务�?
```yaml
redis:
  image: redis:alpine
  container_name: ecommerce_redis
  ports:
    - "6379:6379"
```

## 🛠�?常用维护命令

```bash
# 重启所有服�?
docker-compose restart

# 重启特定服务
docker-compose restart backend

# 更新应用（无数据丢失�?
docker-compose pull
docker-compose up -d --build

# 清理无用的镜像和容器
docker system prune -f

# 进入容器调试
docker-compose exec backend bash
docker-compose exec mysql mysql -u root -p

# 停止所有服�?
docker-compose down

# 停止并删除数据卷（⚠�?会丢失数据）
docker-compose down -v
```

## 📞 技术支�?

如果遇到问题，请�?

1. 查看本文档的故障排除部分
2. 检查服务日志： `docker-compose logs -f`
3. 确认系统要求是否满足
4. 检查网络连接和防火墙设�?

---

**祝您部署成功�?* 🎉 
