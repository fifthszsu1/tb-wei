# 故障排除指南

## 🚨 常见问题及解决方案

### 1. Docker 网络连接问题

**问题现象**：
```
failed to solve: python:3.9-slim: failed to resolve source metadata
connecting to registry-1.docker.io:443: dial tcp ... connectex: A connection attempt failed
```

**解决方案**：

#### 方案A：使用国内镜像源（推荐）
```bash
# 使用国内镜像源版本
start-china.bat
```

#### 方案B：配置Docker镜像加速器
1. 打开Docker Desktop
2. 点击Settings -> Docker Engine
3. 添加以下配置：
```json
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://registry.cn-hangzhou.aliyuncs.com",
    "https://docker.mirrors.ustc.edu.cn"
  ]
}
```

#### 方案C：使用本地开发模式（最简单）
```bash
# 不使用Docker，直接本地运行
start-local.bat
```

### 2. 中文编码问题

**问题现象**：
```
'存在的容器...' is not recognized as an internal or external command
```

**解决方案**：
已修复编码问题，请使用更新后的脚本。

### 3. Docker Compose 版本警告

**问题现象**：
```
`version` is obsolete
```

**解决方案**：
已修复，移除了过时的version字段。

### 4. PostgreSQL 连接失败

**问题现象**：
```
could not connect to server: Connection refused
```

**解决方案**：

#### 方案A：使用SQLite（推荐新手）
```bash
start-local.bat
```
自动使用SQLite数据库，无需安装PostgreSQL。

#### 方案B：安装PostgreSQL
1. 下载PostgreSQL：https://www.postgresql.org/download/
2. 创建数据库：
```sql
CREATE DATABASE ecommerce_db;
CREATE USER user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE ecommerce_db TO user;
```

### 5. Python依赖安装失败

**问题现象**：
```
ERROR: Could not install packages due to an EnvironmentError
```

**解决方案**：

#### 使用国内pip源
```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

#### 或者配置永久镜像源
```bash
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
```

### 6. 图表显示错误

**问题现象**：
```
window.platformChart.destroy is not a function
加载统计数据失败：window.platformChart.destroy is not a function
```

**解决方案**：
✅ 已修复，更新了前端代码以正确处理图表的创建和销毁。

**如果仍有问题**：
1. 清除浏览器缓存
2. 强制刷新页面（Ctrl+F5）
3. 检查浏览器控制台是否有其他JavaScript错误

## 🛠 不同启动方式对比

| 启动方式 | 优点 | 缺点 | 适用场景 |
|---------|------|------|----------|
| `start.bat` | 完整Docker环境 | 需要网络下载镜像 | 生产环境 |
| `start-china.bat` | 使用国内镜像，速度快 | 仍需Docker | 国内用户 |
| `start-local.bat` | 无需Docker，启动快 | 需要本地Python环境 | 开发测试 |

## 💡 推荐启动顺序

1. **首次使用**：`start-local.bat`（最简单）
2. **如果需要完整环境**：`start-china.bat`（国内用户）
3. **生产部署**：`start.bat`（完整Docker）

## 🔧 手动排查步骤

### 检查Docker状态
```bash
docker --version
docker-compose --version
docker info
```

### 检查端口占用
```bash
netstat -ano | findstr :80
netstat -ano | findstr :5000
netstat -ano | findstr :5432
```

### 查看容器日志
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 重置环境
```bash
# 停止所有容器
docker-compose down

# 删除所有容器和镜像（谨慎使用）
docker system prune -a

# 重新启动
start-china.bat
```

## 🆘 获取帮助

如果以上方案都无法解决问题，请提供以下信息：

1. 操作系统版本
2. Docker版本
3. Python版本
4. 完整的错误日志
5. 使用的启动脚本

联系方式：[在此添加您的联系方式] 