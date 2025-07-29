# MySQL数据库自动备份系统

这是一个专为您的Docker化MySQL数据库设计的自动备份解决方案。

## 🚀 快速开始

### 1. 安装备份系统

```bash
# 确保脚本有执行权限
chmod +x install_backup_cron.sh

# 以root权限运行安装脚本
sudo ./install_backup_cron.sh
```

### 2. 验证安装

```bash
# 查看定时任务
crontab -l

# 查看备份目录
ls -la /root/repo/db_backup

# 查看日志
tail -f /var/log/mysql_backup.log
```

## 📋 系统配置

### 备份计划
- **频率**: 每周五晚上9点
- **Cron表达式**: `0 21 * * 5`
- **备份目录**: `/root/repo/db_backup`
- **日志文件**: `/var/log/mysql_backup.log`

### 数据库配置
- **容器名称**: `ecommerce_mysql`
- **数据库名**: `ecommerce_db`
- **用户名**: `ecommerce_user`
- **密码**: `password`

### 文件保留策略
- **保留时间**: 30天
- **自动清理**: 是
- **压缩格式**: gzip (.sql.gz)

## 🛠️ 管理命令

### 手动执行备份
```bash
sudo ./mysql_backup.sh
```

### 查看备份文件
```bash
ls -la /root/repo/db_backup/
```

### 实时查看备份日志
```bash
tail -f /var/log/mysql_backup.log
```

### 查看定时任务
```bash
crontab -l
```

### 编辑定时任务
```bash
crontab -e
```

### 删除定时任务
```bash
# 编辑定时任务，删除相关行
crontab -e

# 或者完全清空定时任务
crontab -r
```

## 🔧 自定义配置

### 修改备份频率

编辑 `install_backup_cron.sh` 文件中的 `CRON_SCHEDULE` 变量：

```bash
# 每天凌晨2点
CRON_SCHEDULE="0 2 * * *"

# 每周日凌晨3点
CRON_SCHEDULE="0 3 * * 0"

# 每月1号凌晨4点
CRON_SCHEDULE="0 4 1 * *"
```

### 修改备份保留时间

编辑 `mysql_backup.sh` 文件中的清理函数：

```bash
# 保留60天的备份
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "ecommerce_db_backup_*.sql.gz" -mtime +60 2>/dev/null)
```

### 修改备份目录

编辑两个脚本文件中的 `BACKUP_DIR` 变量：

```bash
BACKUP_DIR="/your/custom/backup/path"
```

## 📄 文件结构

```
.
├── mysql_backup.sh           # 主备份脚本
├── install_backup_cron.sh    # 安装和配置脚本
├── DB_BACKUP_README.md       # 本说明文档
└── /root/repo/db_backup/     # 备份文件存储目录
    ├── ecommerce_db_backup_20241201_210001.sql.gz
    ├── ecommerce_db_backup_20241208_210001.sql.gz
    └── ...
```

## 🗄️ 备份文件命名规则

备份文件采用以下命名格式：
```
ecommerce_db_backup_YYYYMMDD_HHMMSS.sql.gz
```

示例：
- `ecommerce_db_backup_20241201_210001.sql.gz` - 2024年12月1日21点00分01秒的备份

## 🔄 数据恢复

### 1. 解压备份文件
```bash
gunzip /root/repo/db_backup/ecommerce_db_backup_20241201_210001.sql.gz
```

### 2. 恢复数据库
```bash
# 方法1: 通过Docker容器恢复
docker exec -i ecommerce_mysql mysql -uecommerce_user -ppassword ecommerce_db < /root/repo/db_backup/ecommerce_db_backup_20241201_210001.sql

# 方法2: 如果备份文件在容器内
docker cp /root/repo/db_backup/ecommerce_db_backup_20241201_210001.sql ecommerce_mysql:/tmp/
docker exec ecommerce_mysql mysql -uecommerce_user -ppassword ecommerce_db -e "source /tmp/ecommerce_db_backup_20241201_210001.sql"
```

## 📊 日志分析

### 查看备份历史
```bash
grep "备份成功" /var/log/mysql_backup.log
```

### 查看错误日志
```bash
grep "ERROR" /var/log/mysql_backup.log
```

### 查看备份文件大小统计
```bash
grep "大小:" /var/log/mysql_backup.log
```

## ⚠️ 故障排除

### 常见问题

1. **容器未运行**
   ```bash
   # 启动Docker服务
   sudo systemctl start docker
   
   # 启动MySQL容器
   docker-compose up -d mysql
   ```

2. **权限不足**
   ```bash
   # 确保脚本有执行权限
   chmod +x mysql_backup.sh
   
   # 确保备份目录权限正确
   sudo chown -R root:root /root/repo/db_backup
   ```

3. **磁盘空间不足**
   ```bash
   # 检查磁盘使用情况
   df -h
   
   # 手动清理旧备份
   find /root/repo/db_backup -name "*.sql.gz" -mtime +7 -delete
   ```

4. **定时任务未执行**
   ```bash
   # 检查cron服务状态
   sudo systemctl status cron
   
   # 启动cron服务
   sudo systemctl start cron
   
   # 查看cron日志
   sudo journalctl -u cron
   ```

## 🔔 监控和通知

脚本已预留通知接口，您可以根据需要添加邮件或其他通知方式：

```bash
# 在send_notification函数中添加
send_notification() {
    local status=$1
    local message=$2
    
    # 邮件通知示例
    echo "$message" | mail -s "MySQL备份状态: $status" admin@example.com
    
    # 企业微信通知示例
    curl -X POST "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY" \
         -H 'Content-Type: application/json' \
         -d "{\"msgtype\": \"text\", \"text\": {\"content\": \"$message\"}}"
}
```

## 📞 技术支持

如果遇到问题，请检查：
1. Docker容器是否正常运行
2. 备份目录权限是否正确
3. 定时任务是否正确配置
4. 系统磁盘空间是否充足

---

**版本**: 1.0  
**更新时间**: 2024年12月01日  
**兼容性**: Linux系统 + Docker环境 