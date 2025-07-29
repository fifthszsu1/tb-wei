#!/bin/bash

# MySQL备份定时任务安装脚本
# 设置每周五晚上9点执行备份

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
BACKUP_SCRIPT="$SCRIPT_DIR/mysql_backup.sh"
CRON_SCHEDULE="0 21 * * 5"  # 每周五晚上9点
BACKUP_DIR="/root/repo/db_backup"
LOG_FILE="/var/log/mysql_backup.log"

echo "========== MySQL数据库备份定时任务安装程序 =========="

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then
    echo "错误: 请以root权限运行此脚本"
    echo "使用命令: sudo $0"
    exit 1
fi

# 检查备份脚本是否存在
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "错误: 备份脚本不存在: $BACKUP_SCRIPT"
    exit 1
fi

# 设置脚本权限
echo "设置备份脚本执行权限..."
chmod +x "$BACKUP_SCRIPT"
if [ $? -eq 0 ]; then
    echo "✓ 脚本权限设置成功"
else
    echo "✗ 脚本权限设置失败"
    exit 1
fi

# 创建备份目录
echo "创建备份目录..."
mkdir -p "$BACKUP_DIR"
if [ $? -eq 0 ]; then
    echo "✓ 备份目录创建成功: $BACKUP_DIR"
else
    echo "✗ 备份目录创建失败"
    exit 1
fi

# 创建日志文件
echo "初始化日志文件..."
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"
if [ $? -eq 0 ]; then
    echo "✓ 日志文件初始化成功: $LOG_FILE"
else
    echo "✗ 日志文件初始化失败"
fi

# 检查Docker是否安装
echo "检查Docker环境..."
if ! command -v docker &> /dev/null; then
    echo "✗ Docker未安装或不在PATH中"
    exit 1
else
    echo "✓ Docker环境检查通过"
fi

# 检查MySQL容器是否存在
CONTAINER_NAME="ecommerce_mysql"
if ! docker ps -a | grep -q "$CONTAINER_NAME"; then
    echo "⚠️  警告: MySQL容器 '$CONTAINER_NAME' 未找到"
    echo "   请确保docker-compose服务正在运行"
else
    echo "✓ MySQL容器检查通过"
fi

# 添加定时任务
echo "配置定时任务..."

# 检查是否已存在相同的定时任务
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
    echo "⚠️  定时任务已存在，正在更新..."
    # 删除旧的定时任务
    crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab -
fi

# 添加新的定时任务
(crontab -l 2>/dev/null; echo "$CRON_SCHEDULE $BACKUP_SCRIPT >> $LOG_FILE 2>&1") | crontab -

if [ $? -eq 0 ]; then
    echo "✓ 定时任务设置成功"
    echo "  计划: 每周五晚上9点执行数据库备份"
    echo "  命令: $CRON_SCHEDULE $BACKUP_SCRIPT"
else
    echo "✗ 定时任务设置失败"
    exit 1
fi

# 显示当前的定时任务
echo ""
echo "当前的定时任务列表:"
echo "===================="
crontab -l | grep -E "(mysql_backup|CRON|#)"

# 测试备份脚本
echo ""
echo "是否现在测试备份脚本? (y/n): "
read -r test_choice

if [[ "$test_choice" =~ ^[Yy]$ ]]; then
    echo "执行测试备份..."
    echo "===================="
    "$BACKUP_SCRIPT"
    
    if [ $? -eq 0 ]; then
        echo "✓ 测试备份执行成功"
        
        # 显示备份文件
        if [ -d "$BACKUP_DIR" ]; then
            echo ""
            echo "备份文件列表:"
            ls -la "$BACKUP_DIR"
        fi
    else
        echo "✗ 测试备份执行失败，请检查日志: $LOG_FILE"
    fi
fi

echo ""
echo "========== 安装完成 =========="
echo "📋 配置摘要:"
echo "   • 备份脚本: $BACKUP_SCRIPT"
echo "   • 执行时间: 每周五晚上9点"
echo "   • 备份目录: $BACKUP_DIR"
echo "   • 日志文件: $LOG_FILE"
echo "   • 数据保留: 30天"
echo ""
echo "🔧 管理命令:"
echo "   • 查看定时任务: crontab -l"
echo "   • 手动备份: $BACKUP_SCRIPT"
echo "   • 查看日志: tail -f $LOG_FILE"
echo "   • 删除定时任务: crontab -e (手动删除相关行)"
echo ""
echo "📝 注意事项:"
echo "   • 确保Docker服务始终运行"
echo "   • 定期检查备份日志"
echo "   • 根据需要调整备份保留天数" 