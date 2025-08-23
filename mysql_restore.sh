#!/bin/bash

# MySQL数据库恢复脚本
# 用于从备份文件恢复数据库

# 配置变量
DOCKER_CONTAINER="ecommerce_mysql"
DATABASE_NAME="ecommerce_db"
DATABASE_USER="ecommerce_user"
DATABASE_PASSWORD="password"
# Root用户用于数据库管理操作
ROOT_USER="root"
ROOT_PASSWORD="Meseum@2025"
BACKUP_DIR="/root/repo/db_backup"
LOG_FILE="/var/log/mysql_restore.log"

# 检查参数
if [ $# -eq 0 ]; then
    echo "用法: $0 <备份文件名>"
    echo "示例: $0 ecommerce_db_backup_20250729_091459.sql.gz"
    echo ""
    echo "可用的备份文件:"
    ls -la "$BACKUP_DIR"/*.sql.gz 2>/dev/null | awk '{print $9}' | xargs -n1 basename 2>/dev/null || echo "  没有找到备份文件"
    exit 1
fi

BACKUP_FILENAME="$1"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILENAME"

# 日志函数
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 检查备份文件是否存在
check_backup_file() {
    if [ ! -f "$BACKUP_PATH" ]; then
        log_message "ERROR: 备份文件不存在: $BACKUP_PATH"
        echo ""
        echo "可用的备份文件:"
        ls -la "$BACKUP_DIR"/*.sql.gz 2>/dev/null | awk '{print $9}' | xargs -n1 basename 2>/dev/null || echo "  没有找到备份文件"
        exit 1
    fi
    
    log_message "INFO: 找到备份文件: $BACKUP_PATH"
}

# 检查Docker容器状态
check_container() {
    if ! docker ps | grep -q "$DOCKER_CONTAINER"; then
        log_message "ERROR: MySQL容器 $DOCKER_CONTAINER 未运行"
        echo "请先启动MySQL容器: docker-compose up -d mysql"
        exit 1
    fi
    log_message "INFO: MySQL容器状态正常"
}

# 创建当前数据库备份（以防恢复失败）
create_current_backup() {
    log_message "INFO: 创建当前数据库的安全备份..."
    
    SAFETY_BACKUP="$BACKUP_DIR/safety_backup_before_restore_$(date '+%Y%m%d_%H%M%S').sql"
    
    docker exec "$DOCKER_CONTAINER" mysqldump \
        -u"$DATABASE_USER" \
        -p"$DATABASE_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --hex-blob \
        --opt \
        "$DATABASE_NAME" > "$SAFETY_BACKUP"
    
    if [ $? -eq 0 ]; then
        gzip "$SAFETY_BACKUP"
        log_message "INFO: 安全备份创建成功: $(basename "$SAFETY_BACKUP").gz"
    else
        log_message "WARNING: 安全备份创建失败，但恢复将继续"
    fi
}

# 解压备份文件
extract_backup() {
    log_message "INFO: 解压备份文件..."
    
    TEMP_SQL_FILE="/tmp/restore_$(basename "$BACKUP_FILENAME" .gz)"
    
    # 解压到临时文件
    gunzip -c "$BACKUP_PATH" > "$TEMP_SQL_FILE"
    
    if [ $? -eq 0 ]; then
        log_message "INFO: 备份文件解压成功"
        echo "$TEMP_SQL_FILE"
    else
        log_message "ERROR: 备份文件解压失败"
        exit 1
    fi
}

# 停止相关服务（可选）
stop_services() {
    echo ""
    echo "⚠️  建议在恢复前停止相关应用服务以避免数据冲突"
    echo "是否停止后端服务? (y/n): "
    read -r stop_choice
    
    if [[ "$stop_choice" =~ ^[Yy]$ ]]; then
        log_message "INFO: 停止后端服务..."
        docker-compose stop backend frontend 2>/dev/null || log_message "WARNING: 无法停止服务，请手动检查"
    fi
}

# 执行数据库恢复
restore_database() {
    local sql_file="$1"
    
    log_message "INFO: 开始恢复数据库 $DATABASE_NAME"
    log_message "INFO: 使用备份文件: $BACKUP_FILENAME"
    
    # 首先删除并重新创建数据库
    echo ""
    echo "⚠️  即将删除现有数据库并恢复到备份状态"
    echo "确认继续? (yes/no): "
    read -r confirm
    
    if [ "$confirm" != "yes" ]; then
        log_message "INFO: 用户取消恢复操作"
        rm -f "$sql_file"
        exit 0
    fi
    
    # 删除并重新创建数据库（使用root用户权限）
    docker exec "$DOCKER_CONTAINER" mysql \
        -u"$ROOT_USER" \
        -p"$ROOT_PASSWORD" \
        -e "DROP DATABASE IF EXISTS $DATABASE_NAME; CREATE DATABASE $DATABASE_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    
    if [ $? -ne 0 ]; then
        log_message "ERROR: 无法重新创建数据库"
        rm -f "$sql_file"
        exit 1
    fi
    
    # 执行恢复
    docker exec -i "$DOCKER_CONTAINER" mysql \
        -u"$DATABASE_USER" \
        -p"$DATABASE_PASSWORD" \
        "$DATABASE_NAME" < "$sql_file"
    
    if [ $? -eq 0 ]; then
        log_message "INFO: 数据库恢复成功!"
    else
        log_message "ERROR: 数据库恢复失败!"
        rm -f "$sql_file"
        exit 1
    fi
    
    # 清理临时文件
    rm -f "$sql_file"
}

# 验证恢复结果
verify_restore() {
    log_message "INFO: 验证数据库恢复结果..."
    
    # 检查数据库连接
    TABLE_COUNT=$(docker exec "$DOCKER_CONTAINER" mysql \
        -u"$DATABASE_USER" \
        -p"$DATABASE_PASSWORD" \
        -s -N \
        -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DATABASE_NAME';" \
        2>/dev/null)
    
    if [ -n "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -gt 0 ]; then
        log_message "INFO: 数据库验证成功，共有 $TABLE_COUNT 个表"
        
        # 显示一些基本统计信息
        echo ""
        echo "📊 数据库恢复统计:"
        echo "===================="
        docker exec "$DOCKER_CONTAINER" mysql \
            -u"$DATABASE_USER" \
            -p"$DATABASE_PASSWORD" \
            -e "SELECT 
                table_name as '表名',
                table_rows as '记录数',
                ROUND(((data_length + index_length) / 1024 / 1024), 2) as '大小(MB)'
                FROM information_schema.tables 
                WHERE table_schema='$DATABASE_NAME' 
                ORDER BY table_rows DESC;" \
            2>/dev/null || log_message "WARNING: 无法获取表统计信息"
    else
        log_message "WARNING: 数据库验证异常，请手动检查"
    fi
}

# 重启服务
restart_services() {
    echo ""
    echo "是否重启应用服务? (y/n): "
    read -r restart_choice
    
    if [[ "$restart_choice" =~ ^[Yy]$ ]]; then
        log_message "INFO: 重启应用服务..."
        docker-compose up -d 2>/dev/null || log_message "WARNING: 无法重启服务，请手动检查"
    fi
}

# 主执行流程
main() {
    log_message "========== MySQL数据库恢复开始 =========="
    log_message "INFO: 恢复文件: $BACKUP_FILENAME"
    
    # 检查备份文件
    check_backup_file
    
    # 检查容器状态
    check_container
    
    # 创建安全备份
    create_current_backup
    
    # 停止服务
    stop_services
    
    # 解压备份文件
    sql_file=$(extract_backup)
    
    # 执行恢复
    restore_database "$sql_file"
    
    # 验证恢复结果
    verify_restore
    
    # 重启服务
    restart_services
    
    log_message "========== MySQL数据库恢复完成 =========="
    
    echo ""
    echo "✅ 数据库恢复完成!"
    echo ""
    echo "📋 后续建议:"
    echo "   • 测试应用程序功能是否正常"
    echo "   • 检查数据完整性"
    echo "   • 如有问题，可使用安全备份恢复"
    echo "   • 查看详细日志: tail -f $LOG_FILE"
}

# 错误处理
trap 'log_message "ERROR: 恢复过程中发生错误"; exit 1' ERR

# 执行主函数
main "$@" 