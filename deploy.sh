#!/bin/bash

# 电商数据管理系统 - 生产环境部署脚本 (Linux/Mac)

set -e

echo "==================================="
echo "  电商数据管理系统 - 生产部署"
echo "==================================="
echo

# 检查Docker和Docker Compose
echo "检查Docker环境..."
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: Docker未安装，请先安装Docker"
    echo "安装指南: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误: Docker Compose未安装，请先安装Docker Compose"
    echo "安装指南: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker环境检查通过"

# 检查必要目录
echo "检查数据目录..."
mkdir -p data/mysql data/uploads nginx/ssl

# 设置目录权限
chmod 755 data data/mysql data/uploads
echo "✅ 数据目录准备完成"

# 停止现有服务
echo "停止现有服务..."
docker-compose down --remove-orphans

# 选择镜像源
echo "请选择镜像源："
echo "1) 国际镜像源 (docker.io)"
echo "2) 中国镜像源 (阿里云)"
read -p "请输入选择 (1/2) [默认: 1]: " mirror_choice

# 设置环境变量
if [[ $mirror_choice == "2" ]]; then
    echo "使用中国镜像源..."
    export USE_CHINA_MIRROR=true
    export MYSQL_IMAGE=registry.cn-hangzhou.aliyuncs.com/library/mysql:8.0
else
    echo "使用国际镜像源..."
    export USE_CHINA_MIRROR=false
    export MYSQL_IMAGE=mysql:8.0
fi

# 清理旧镜像（可选）
read -p "是否清理旧的Docker镜像? (y/N): " cleanup
if [[ $cleanup =~ ^[Yy]$ ]]; then
    echo "清理旧镜像..."
    docker system prune -f
    docker image prune -f
fi

# 构建并启动服务
echo "构建并启动服务..."
docker-compose build --no-cache
docker-compose up -d

# 等待服务启动
echo "等待服务启动..."
sleep 10

# 检查服务状态
echo "检查服务状态..."
docker-compose ps

# 等待MySQL初始化完成
echo "等待MySQL初始化..."
attempt=0
max_attempts=30
while [ $attempt -lt $max_attempts ]; do
    if docker-compose exec -T mysql mysqladmin ping -h localhost --silent; then
        echo "✅ MySQL启动成功"
        break
    fi
    echo "⏳ 等待MySQL启动... ($((attempt+1))/$max_attempts)"
    sleep 2
    attempt=$((attempt+1))
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ MySQL启动超时"
    exit 1
fi

# 检查应用健康状态
echo "检查应用健康状态..."
sleep 5

# 检查前端
if curl -f http://localhost/health &> /dev/null; then
    echo "✅ 前端服务正常"
else
    echo "⚠️  前端服务可能未就绪"
fi

# 检查后端
if curl -f http://localhost/api/platforms &> /dev/null; then
    echo "✅ 后端服务正常"
else
    echo "⚠️  后端服务可能未就绪"
fi

echo
echo "==================================="
echo "           部署完成！"
echo "==================================="
echo
echo "🌐 访问地址："
echo "   前端: http://localhost"
echo "   后端API: http://localhost/api"
echo "   MySQL: localhost:3306"
echo
echo "👤 默认账户："
echo "   管理员: admin / admin123"
echo "   普通用户: user / user123"
echo
echo "📁 数据目录："
echo "   MySQL数据: ./data/mysql"
echo "   上传文件: ./data/uploads"
echo
echo "🔧 常用命令："
echo "   查看日志: docker-compose logs -f"
echo "   停止服务: docker-compose down"
echo "   重启服务: docker-compose restart"
echo "   查看状态: docker-compose ps"
echo
echo "🔒 安全提醒："
echo "   1. 请修改默认密码"
echo "   2. 请修改docker-compose.prod.yml中的SECRET_KEY"
echo "   3. 生产环境建议配置SSL证书"
echo
echo "===================================" 