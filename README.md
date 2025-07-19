# 电商数据管理系统

一个基于Flask+MySQL+Docker的电商数据管理系统，支持导入各大电商平台的Excel数据文件，提供数据展示、过滤、汇总功能。

## 功能特性

### 核心功能
- **多平台数据导入**：支持苏宁、淘宝、拼多多等平台的Excel/CSV文件导入
- **用户权限管理**：区分普通用户和管理员角色，支持角色权限控制
- **数据展示面板**：管理员可查看数据统计图表和仪表盘
- **数据列表管理**：支持数据过滤、分页展示、导出功能
- **响应式设计**：适配PC和移动端，现代化UI界面

### 部署特性
- **一键部署**：Windows、Linux、macOS全平台一键部署脚本
- **多镜像源支持**：自动选择国际或中国镜像源，解决网络问题
- **数据持久化**：MySQL数据库和文件存储完全映射到本地
- **容器化架构**：Docker Compose生产环境方案
- **负载均衡**：Nginx反向代理，支持高并发访问
- **安全优化**：生产环境安全配置，支持SSL证书
- **健康监控**：自动健康检查和服务重启

## 技术栈

### 后端
- Python 3.9
- Flask 2.3.2
- MySQL 8.0
- SQLAlchemy (ORM)
- JWT认证
- Pandas (数据处理)
- PyMySQL (MySQL连接器)

### 前端
- HTML5 + CSS3 + JavaScript
- Bootstrap 5.3.0
- Chart.js (图表)
- Font Awesome (图标)

### 部署 & 生产环境
- Docker & Docker Compose
- Nginx (反向代理、负载均衡)
- 多镜像源支持（国际/中国）
- 健康检查 & 自动重启
- 数据持久化 & 备份
- SSL/HTTPS 支持
- 生产环境安全配置

## 项目结构

```
ecommerce-data-system/
├── backend/
│   └── app.py                          # Flask主应用
├── frontend/
│   ├── index.html                      # 前端主页面
│   └── app.js                          # 前端JavaScript
├── nginx/
│   ├── nginx.prod.conf                 # Nginx生产环境配置
│   └── ssl/                            # SSL证书目录
├── mysql/
│   └── init/
│       └── 01-init.sql                 # MySQL初始化脚本
├── data/                               # 数据持久化目录
│   ├── mysql/                          # MySQL数据文件
│   └── uploads/                        # 上传文件存储
├── docker-compose.yml                  # Docker Compose配置
├── Dockerfile.backend                  # 后端镜像
├── Dockerfile.frontend                 # 前端镜像
├── deploy.sh                           # Linux/Mac部署脚本
├── deploy.bat                          # Windows部署脚本
├── requirements.txt                    # Python依赖
├── env.template                        # 环境变量配置模板
├── DEPLOYMENT.md                       # 详细部署文档
├── TROUBLESHOOTING.md                  # 故障排除指南
└── README.md                           # 项目说明

```

## 快速开始

### 1. 下载项目
```bash
git clone <repository-url>
cd ecommerce-data-system
```

### 2. 一键部署

| 操作系统 | 命令 | 说明 |
|---------|------|------|
| **Windows** | `deploy.bat` | 双击运行或在CMD/PowerShell中执行 |
| **Linux/Mac** | `chmod +x deploy.sh && ./deploy.sh` | 在终端中执行 |

**部署特性：**
- ✅ 自动检测Docker环境
- ✅ 自动创建必要目录  
- ✅ 支持选择镜像源（国际/中国）
- ✅ MySQL 8.0数据库 + 数据持久化
- ✅ Nginx反向代理 + 健康检查
- ✅ 一键启动、停止、重启、备份

### 3. 访问系统

**生产环境模式：**
- **前端界面**：http://localhost
- **后端API**：http://localhost/api
- **MySQL数据库**：localhost:3306 (用户: ecommerce_user, 密码: password)
- **数据目录**：
  - MySQL数据：`./data/mysql/`
  - 上传文件：`./data/uploads/`

### 4. 默认账户
- **管理员**：admin / admin123（完整权限：数据查看、统计分析、用户管理）
- **普通用户**：user / user123（仅限上传文件）

> 🔒 **安全提醒**：生产环境请务必修改默认密码！参考 [DEPLOYMENT.md](DEPLOYMENT.md) 中的安全配置章节。

### 5. 遇到问题？
如果启动过程中遇到网络连接问题、编码问题或其他错误，请查看 **[故障排除指南](TROUBLESHOOTING.md)**

### 6. 生成示例数据（可选）
```bash
# 安装依赖
pip install -r requirements.txt

# 生成示例数据
python create_sample_data.py
```
这将在 `sample_data/` 目录下生成各个平台的示例Excel文件，您可以用来测试数据导入功能。

## 🛠️ 生产环境管理

### 常用管理命令
```bash
# 查看服务状态
docker-compose ps

# 查看日志（所有服务）
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f mysql

# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend

# 停止服务
docker-compose down

# 更新应用（保留数据）
docker-compose pull
docker-compose up -d --build
```

### 数据备份与恢复
```bash
# 备份MySQL数据
docker-compose exec mysql mysqldump -u root -ppassword ecommerce_db > backup_$(date +%Y%m%d).sql

# 备份上传文件
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz data/uploads/

# 恢复MySQL数据
docker-compose exec -T mysql mysql -u root -ppassword ecommerce_db < backup_20240101.sql

# 恢复上传文件  
tar -xzf uploads_backup_20240101.tar.gz
```

### 性能监控
```bash
# 查看容器资源使用情况
docker stats

# 查看磁盘使用情况
du -sh data/mysql data/uploads

# 健康检查
curl -f http://localhost/health
curl -f http://localhost/api/platforms
```

### 镜像源选择
部署脚本会自动询问您选择镜像源：
- **国际镜像源**：适用于海外用户或网络良好的环境
- **中国镜像源**：适用于中国大陆用户，解决网络连接问题

## 使用说明

### 登录系统
1. 访问 http://localhost
2. 使用默认管理员账户登录：admin / admin123

### 上传数据
1. 登录后进入"文件上传"页面
2. 选择数据来源平台（苏宁、淘宝、拼多多等）
3. 上传Excel或CSV文件
4. 系统自动处理并导入数据

### 查看数据（管理员）
1. 进入"数据面板"查看统计图表
2. 进入"数据列表"查看详细数据
3. 支持按平台筛选数据

## 支持的数据格式

### 苏宁平台
- 商品编码
- 商品名称
- 店铺编码、店铺名称
- 品牌
- 类目信息（一级到四级）
- 客单价、销量
- 订购人数、收藏人数、支付人数
- 支付转化率等指标

### 淘宝平台
- 商品编号
- 商品标题
- 店铺名称
- 客单价、销量
- 订单数、转化率

### 拼多多平台
- 商品ID
- 商品名称
- 店铺名称
- 价格、销量
- 订单量

## 数据库表结构

### 用户表 (users)
- id: 主键
- username: 用户名
- email: 邮箱
- password_hash: 密码哈希
- role: 角色 (user/admin)
- created_at: 创建时间

### 商品数据表 (product_data)
- id: 主键
- platform: 平台来源
- product_code: 商品编码
- product_name: 商品名称
- store_code: 店铺编码
- store_name: 店铺名称
- brand: 品牌
- category_1~4: 类目信息
- unit_price: 客单价
- sales_volume: 销量
- order_count: 订购人数
- 其他业务字段...
- created_at: 创建时间
- uploaded_by: 上传用户ID

## API接口

### 认证接口
- POST /api/register - 用户注册
- POST /api/login - 用户登录
- GET /api/user - 获取用户信息

### 数据接口
- POST /api/upload - 文件上传
- GET /api/data - 获取数据列表（管理员）
- GET /api/stats - 获取统计信息（管理员）
- GET /api/platforms - 获取平台列表

## 开发环境搭建

> 💡 **推荐使用Docker部署**：更简单快捷！如需手动搭建开发环境，请参考以下步骤。

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 启动数据库（二选一）

#### 选项A：MySQL（推荐，与生产环境一致）
```bash
docker run -d --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=ecommerce_db -e MYSQL_USER=ecommerce_user -e MYSQL_PASSWORD=password mysql:8.0
```

#### 选项B：SQLite（轻量级，默认配置）
```bash
# 无需额外配置，应用会自动创建SQLite数据库文件
```

### 3. 配置环境变量（可选）
```bash
# 使用MySQL时设置
export DATABASE_URL=mysql+pymysql://ecommerce_user:password@localhost:3306/ecommerce_db

# 使用SQLite时（默认）
export DATABASE_URL=sqlite:///ecommerce.db
```

### 4. 启动Flask应用
```bash
cd backend
python app.py
```

### 5. 访问前端
直接打开 frontend/index.html 或使用HTTP服务器：
```bash
cd frontend
python -m http.server 8000
```

## 📖 更多文档

- **[详细部署指南](DEPLOYMENT.md)** - 完整的生产环境部署文档
- **[故障排除指南](TROUBLESHOOTING.md)** - 常见问题解决方案
- **[环境变量配置](env.template)** - 配置参数说明

## 配置说明

### 环境变量
- `DATABASE_URL`: 数据库连接字符串
- `SECRET_KEY`: Flask密钥
- `JWT_SECRET_KEY`: JWT密钥
- `USE_CHINA_MIRROR`: 是否使用中国镜像源
- `MYSQL_IMAGE`: MySQL镜像地址

### 文件上传限制
- 最大文件大小：100MB
- 支持格式：.xlsx, .xls, .csv
- 编码自动检测

## 常见问题

### Q: 部署失败，Docker无法连接
A: 运行部署脚本时选择"中国镜像源"选项

### Q: 上传文件失败
A: 检查文件格式是否支持，文件大小是否超过限制

### Q: 数据导入不完整
A: 确认Excel文件的字段名称与系统预期匹配

### Q: 无法访问数据面板
A: 确认当前用户角色为管理员

### Q: 容器启动失败
A: 检查端口是否被占用，查看日志：`docker-compose logs -f`

## 扩展功能

### 添加新平台支持
1. 在 `get_field_mapping()` 函数中添加新平台的字段映射
2. 在前端平台选择中添加新选项

### 添加新的数据字段
1. 在 `ProductData` 模型中添加新字段
2. 更新字段映射函数
3. 修改前端展示逻辑

## 🎯 系统亮点

### 🚀 一键部署
- **Windows**: 双击 `deploy.bat` 即可完成生产环境部署
- **Linux/Mac**: 运行 `./deploy.sh` 一键部署到生产环境
- **智能检查**: 自动检测Docker环境，创建必要目录
- **健康监控**: 自动等待服务启动，检查服务健康状态

### 💾 数据安全
- **数据持久化**: MySQL数据和上传文件完全映射到本地目录
- **自动备份**: 提供完整的数据备份和恢复方案
- **零数据丢失**: 容器重启、更新不影响数据完整性

### 🌐 跨平台兼容
- **多操作系统**: Windows、Linux、macOS 完全支持
- **网络优化**: 提供国际和中国镜像源版本
- **环境隔离**: 容器化部署，环境完全隔离

### ⚡ 性能优化
- **Nginx反向代理**: 高性能Web服务器，支持负载均衡
- **容器化部署**: 资源隔离，易于扩展和管理
- **缓存优化**: 静态文件缓存，Gzip压缩
- **健康检查**: 自动故障检测和服务重启

### 🔒 安全加固
- **角色权限**: 管理员和普通用户严格权限分离
- **安全头部**: 防XSS、防点击劫持等安全配置
- **SSL支持**: 生产环境HTTPS加密传输
- **密码安全**: BCrypt加密存储，JWT令牌认证

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目！

---

**🎉 享受您的电商数据管理之旅！**
