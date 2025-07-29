#!/bin/bash

# MySQL数据库备份脚本
# 作者: System Admin
# 创建时间: $(date '+%Y-%m-%d')

# 配置变量
DOCKER_CONTAINER="ecommerce_mysql"
DATABASE_NAME="ecommerce_db"
DATABASE_USER="ecommerce_user"
DATABASE_PASSWORD="password"
BACKUP_DIR="/root/repo/db_backup"
LOG_FILE="/var/log/mysql_backup.log"

# 备份文件名（包含时间戳）
BACKUP_FILENAME="ecommerce_db_backup_$(date '+%Y%m%d_%H%M%S').sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

# 日志函数
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 创建备份目录
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        if [ $? -eq 0 ]; then
            log_message "INFO: 备份目录创建成功: $BACKUP_DIR"
        else
            log_message "ERROR: 无法创建备份目录: $BACKUP_DIR"
            exit 1
        fi
    fi
}

# 检查Docker容器是否运行
check_container() {
    if ! docker ps | grep -q "$DOCKER_CONTAINER"; then
        log_message "ERROR: MySQL容器 $DOCKER_CONTAINER 未运行"
        exit 1
    fi
    log_message "INFO: MySQL容器状态正常"
}

# 执行数据库备份
backup_database() {
    log_message "INFO: 开始备份数据库 $DATABASE_NAME"
    
    # 使用docker exec执行mysqldump
    docker exec "$DOCKER_CONTAINER" mysqldump \
        -u"$DATABASE_USER" \
        -p"$DATABASE_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --hex-blob \
        --opt \
        "$DATABASE_NAME" > "$BACKUP_PATH"
    
    if [ $? -eq 0 ]; then
        # 检查备份文件大小
        BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
        log_message "INFO: 数据库备份成功! 文件: $BACKUP_FILENAME (大小: $BACKUP_SIZE)"
        
        # 压缩备份文件
        gzip "$BACKUP_PATH"
        if [ $? -eq 0 ]; then
            log_message "INFO: 备份文件压缩成功: ${BACKUP_FILENAME}.gz"
        else
            log_message "WARNING: 备份文件压缩失败，但备份本身成功"
        fi
    else
        log_message "ERROR: 数据库备份失败!"
        exit 1
    fi
}

# 清理旧备份文件（保留最近30天的备份）
cleanup_old_backups() {
    log_message "INFO: 开始清理超过30天的旧备份文件"
    
    OLD_BACKUPS=$(find "$BACKUP_DIR" -name "ecommerce_db_backup_*.sql.gz" -mtime +30 2>/dev/null)
    
    if [ -n "$OLD_BACKUPS" ]; then
        echo "$OLD_BACKUPS" | while read -r old_file; do
            rm -f "$old_file"
            log_message "INFO: 已删除旧备份文件: $(basename "$old_file")"
        done
    else
        log_message "INFO: 没有需要清理的旧备份文件"
    fi
}

# 发送备份状态通知（可选）
send_notification() {
    local status=$1
    local message=$2
    
    # 这里可以添加邮件通知或其他通知方式
    # 例如: echo "$message" | mail -s "MySQL备份状态: $status" admin@example.com
    log_message "NOTIFICATION: [$status] $message"
}

# 主执行流程
main() {
    log_message "========== MySQL数据库备份开始 =========="
    
    # 创建备份目录
    create_backup_dir
    
    # 检查容器状态
    check_container
    
    # 执行备份
    backup_database
    
    # 清理旧备份
    cleanup_old_backups
    
    # 发送成功通知
    send_notification "SUCCESS" "数据库备份完成: $BACKUP_FILENAME"
    
    log_message "========== MySQL数据库备份结束 =========="
}

# 错误处理
trap 'log_message "ERROR: 脚本执行过程中发生错误"; send_notification "FAILED" "数据库备份失败"; exit 1' ERR

# 执行主函数
main "$@" 