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

### 数据库恢复
```bash
# 查看可用备份文件
sudo ./mysql_restore.sh

# 恢复到指定备份
sudo ./mysql_restore.sh ecommerce_db_backup_20250729_091459.sql.gz

# 非交互式恢复
echo -e "y\nyes\ny" | sudo ./mysql_restore.sh backup_filename.sql.gz
```

### 查看恢复日志
```bash
tail -f /var/log/mysql_restore.log
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
├── mysql_restore.sh          # 数据库恢复脚本
├── install_backup_cron.sh    # 安装和配置脚本
├── DB_BACKUP_README.md       # 本说明文档
└── /root/repo/db_backup/     # 备份文件存储目录
    ├── ecommerce_db_backup_20241201_210001.sql.gz
    ├── ecommerce_db_backup_20241208_210001.sql.gz
    ├── safety_backup_before_restore_20241201_153005.sql.gz  # 恢复前安全备份
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

### 使用恢复脚本（推荐）

#### 1. 设置脚本权限
```bash
chmod +x mysql_restore.sh
```

#### 2. 查看可用备份文件
```bash
sudo ./mysql_restore.sh
# 或者直接查看备份目录
ls -la /root/repo/db_backup/
```

#### 3. 执行数据库恢复
```bash
# 使用具体的备份文件名
sudo ./mysql_restore.sh ecommerce_db_backup_20250729_091459.sql.gz
```

#### 4. 恢复过程交互
恢复脚本会依次询问：
1. **是否停止应用服务？** 建议选择 `y`
2. **确认删除现有数据库？** 输入 `yes` 确认（完整单词）
3. **是否重启应用服务？** 完成后选择 `y`

### 恢复脚本特性

#### 🛡️ 安全特性
- **自动安全备份**: 恢复前自动备份当前数据库
- **多重确认**: 防止误操作的多层确认机制
- **容器状态检查**: 确保MySQL容器正常运行
- **文件完整性检查**: 验证备份文件存在且可读

#### 📊 自动验证
- **表数量统计**: 恢复后显示数据库表数量
- **数据统计**: 显示各表记录数和大小
- **连接测试**: 验证数据库连接正常

#### 📝 详细日志
- **操作记录**: 所有操作记录到 `/var/log/mysql_restore.log`
- **错误追踪**: 详细的错误信息和建议
- **时间戳**: 精确的操作时间记录

### 恢复示例输出

```bash
========== MySQL数据库恢复开始 ==========
[2024-12-01 15:30:01] INFO: 找到备份文件: /root/repo/db_backup/ecommerce_db_backup_20250729_091459.sql.gz
[2024-12-01 15:30:02] INFO: MySQL容器状态正常
[2024-12-01 15:30:03] INFO: 创建当前数据库的安全备份...
[2024-12-01 15:30:05] INFO: 安全备份创建成功: safety_backup_before_restore_20241201_153005.sql.gz

⚠️  建议在恢复前停止相关应用服务以避免数据冲突
是否停止后端服务? (y/n): y

[2024-12-01 15:30:10] INFO: 停止后端服务...
[2024-12-01 15:30:12] INFO: 解压备份文件...
[2024-12-01 15:30:13] INFO: 备份文件解压成功

⚠️  即将删除现有数据库并恢复到备份状态
确认继续? (yes/no): yes

[2024-12-01 15:30:20] INFO: 数据库恢复成功!
[2024-12-01 15:30:21] INFO: 数据库验证成功，共有 15 个表

📊 数据库恢复统计:
====================
表名              记录数    大小(MB)
users            1250      2.5
orders           892       5.2
products         156       1.8

是否重启应用服务? (y/n): y
[2024-12-01 15:30:30] INFO: 重启应用服务...

✅ 数据库恢复完成!

📋 后续建议:
   • 测试应用程序功能是否正常
   • 检查数据完整性
   • 如有问题，可使用安全备份恢复
   • 查看详细日志: tail -f /var/log/mysql_restore.log
```

### 高级恢复选项

#### 非交互式恢复
如果要自动执行所有确认步骤：
```bash
echo -e "y\nyes\ny" | sudo ./mysql_restore.sh ecommerce_db_backup_20250729_091459.sql.gz
```

#### 仅创建安全备份而不恢复
```bash
# 手动创建当前数据库备份
sudo ./mysql_backup.sh
```

#### 手动恢复（传统方法）

如果需要手动控制恢复过程：

##### 1. 解压备份文件
```bash
gunzip /root/repo/db_backup/ecommerce_db_backup_20241201_210001.sql.gz
```

##### 2. 停止应用服务
```bash
docker-compose stop backend frontend
```

##### 3. 恢复数据库
```bash
# 方法1: 通过Docker容器恢复
docker exec -i ecommerce_mysql mysql -uecommerce_user -ppassword ecommerce_db < /root/repo/db_backup/ecommerce_db_backup_20241201_210001.sql

# 方法2: 如果备份文件在容器内
docker cp /root/repo/db_backup/ecommerce_db_backup_20241201_210001.sql ecommerce_mysql:/tmp/
docker exec ecommerce_mysql mysql -uecommerce_user -ppassword ecommerce_db -e "source /tmp/ecommerce_db_backup_20241201_210001.sql"
```

##### 4. 重启服务
```bash
docker-compose up -d
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

### 查看恢复历史
```bash
grep "恢复成功" /var/log/mysql_restore.log
```

### 查看恢复错误日志
```bash
grep "ERROR" /var/log/mysql_restore.log
```

### 查看安全备份记录
```bash
grep "安全备份" /var/log/mysql_restore.log
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

5. **恢复脚本执行失败**
   ```bash
   # 确保恢复脚本有执行权限
   chmod +x mysql_restore.sh
   
   # 检查备份文件是否存在和完整
   ls -la /root/repo/db_backup/
   gzip -t /root/repo/db_backup/backup_file.sql.gz
   
   # 查看详细错误日志
   tail -f /var/log/mysql_restore.log
   ```

6. **恢复后数据异常**
   ```bash
   # 使用安全备份回滚
   sudo ./mysql_restore.sh safety_backup_before_restore_YYYYMMDD_HHMMSS.sql.gz
   
   # 验证数据库完整性
   docker exec ecommerce_mysql mysql -uecommerce_user -ppassword ecommerce_db -e "CHECK TABLE table_name;"
   
   # 重建索引（如需要）
   docker exec ecommerce_mysql mysql -uecommerce_user -ppassword ecommerce_db -e "OPTIMIZE TABLE table_name;"
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

### 备份问题排查清单
如果遇到备份问题，请检查：
1. Docker容器是否正常运行
2. 备份目录权限是否正确
3. 定时任务是否正确配置
4. 系统磁盘空间是否充足

### 恢复问题排查清单
如果遇到恢复问题，请检查：
1. 恢复脚本是否有执行权限
2. 备份文件是否存在且完整
3. MySQL容器是否正常运行
4. 是否有足够权限操作数据库
5. 备份文件格式是否正确（.sql.gz）
6. 系统是否有足够的临时空间解压文件

### 紧急恢复流程
如果自动恢复失败，可以尝试：
1. 使用安全备份回滚到恢复前状态
2. 手动解压备份文件并检查内容
3. 逐步执行恢复命令排查问题
4. 查看详细日志定位错误原因

---

**版本**: 1.1  
**更新时间**: 2024年12月01日  
**新增功能**: 自动化数据库恢复脚本  
**兼容性**: Linux系统 + Docker环境 