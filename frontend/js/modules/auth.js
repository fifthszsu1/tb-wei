// 认证管理模块
const AuthManager = {
    // 当前用户信息
    currentUser: null,
    token: null,

    // 初始化认证管理器
    init() {
        this.token = localStorage.getItem(AppConfig.STORAGE_KEYS.TOKEN);
        this.setupEventListeners();
    },

    // 设置事件监听器
    setupEventListeners() {
        // 登录表单
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    },

    // 验证token有效性
    async validateToken() {
        if (!this.token) {
            return false;
        }

        try {
            const response = await fetch(`${AppConfig.API_BASE}/user`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.currentUser = await response.json();
                return true;
            } else {
                this.clearAuth();
                return false;
            }
        } catch (error) {
            console.error('Token验证失败:', error);
            this.clearAuth();
            return false;
        }
    },

    // 处理登录
    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            UIUtils.showAlert('请输入用户名和密码', 'warning');
            return;
        }

        UIUtils.showSpinner();
        
        try {
            const response = await fetch(`${AppConfig.API_BASE}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (data.access_token) {
                this.setAuth(data.access_token, data.user);
                this.showMainApp();
                UIUtils.showAlert('登录成功', 'success');
            } else {
                UIUtils.showAlert('登录失败：' + data.message, 'danger');
            }
        } catch (error) {
            console.error('登录失败:', error);
            UIUtils.showAlert('登录失败：' + error.message, 'danger');
        } finally {
            UIUtils.hideSpinner();
        }
    },

    // 设置认证信息
    setAuth(token, user) {
        this.token = token;
        this.currentUser = user;
        localStorage.setItem(AppConfig.STORAGE_KEYS.TOKEN, token);
    },

    // 清除认证信息
    clearAuth() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem(AppConfig.STORAGE_KEYS.TOKEN);
    },

    // 退出登录
    logout() {
        this.clearAuth();
        this.showLoginPage();
        UIUtils.showAlert('已退出登录', 'info');
    },

    // 显示登录页面
    showLoginPage() {
        document.getElementById('loginPage').style.display = 'block';
        document.getElementById('mainApp').style.display = 'none';
        document.body.classList.add('login-active');
    },

    // 显示主应用
    showMainApp() {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.body.classList.remove('login-active');
        
        // 更新用户信息显示
        const userDisplay = document.getElementById('currentUser');
        if (userDisplay && this.currentUser) {
            const roleText = this.currentUser.role === AppConfig.USER_ROLES.ADMIN ? '管理员' : '普通用户';
            userDisplay.textContent = `${this.currentUser.username} (${roleText})`;
        }
        
        // 根据用户角色显示不同菜单
        this.updateMenuVisibility();
        
        // 默认显示上传页面
        UIUtils.showPage('upload');
        
        // 如果是普通用户，显示欢迎信息并加载统计
        if (this.currentUser.role === AppConfig.USER_ROLES.USER) {
            setTimeout(() => {
                UIUtils.showAlert('欢迎！您当前为普通用户，可以上传文件。管理员可查看详细数据统计。', 'info');
            }, 1000);
            this.loadUserStats();
        }
    },

    // 更新菜单可见性
    updateMenuVisibility() {
        const isAdmin = this.currentUser && this.currentUser.role === AppConfig.USER_ROLES.ADMIN;
        
        // 管理员菜单
        const dashboardNav = document.getElementById('dashboardNav');
        const dataNav = document.getElementById('dataNav');
        
        if (dashboardNav) {
            dashboardNav.style.display = isAdmin ? 'block' : 'none';
        }
        if (dataNav) {
            dataNav.style.display = isAdmin ? 'block' : 'none';
        }
    },

    // 加载用户统计信息
    async loadUserStats() {
        if (this.currentUser.role !== AppConfig.USER_ROLES.USER) return;
        
        try {
            const response = await fetch(`${AppConfig.API_BASE}/user-stats`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateUserStatsDisplay(data);
            }
        } catch (error) {
            console.error('加载用户统计失败:', error);
        }
    },

    // 更新用户统计显示
    updateUserStatsDisplay(data) {
        const userUploadCount = document.getElementById('userUploadCount');
        const userStats = document.getElementById('userStats');
        
        if (userUploadCount) {
            userUploadCount.textContent = data.upload_count || 0;
        }
        
        if (userStats) {
            userStats.style.display = 'block';
            
            // 如果有上传记录，显示详细信息
            if (data.record_count > 0) {
                userStats.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i> 
                        您已成功上传 <strong>${data.upload_count}</strong> 个文件，
                        共处理 <strong>${data.record_count}</strong> 条数据记录
                    </div>
                `;
            }
        }
    },

    // 检查管理员权限
    isAdmin() {
        return this.currentUser && this.currentUser.role === AppConfig.USER_ROLES.ADMIN;
    },

    // 检查用户权限
    checkPermission(requiredRole = AppConfig.USER_ROLES.USER) {
        if (!this.currentUser) {
            return false;
        }

        if (requiredRole === AppConfig.USER_ROLES.ADMIN) {
            return this.currentUser.role === AppConfig.USER_ROLES.ADMIN;
        }

        return true; // 普通用户权限
    },

    // 权限检查装饰器
    requireAuth(callback) {
        return (...args) => {
            if (!this.token || !this.currentUser) {
                UIUtils.showAlert('请先登录', 'warning');
                this.showLoginPage();
                return;
            }
            return callback.apply(this, args);
        };
    },

    // 管理员权限检查装饰器
    requireAdmin(callback) {
        return (...args) => {
            if (!this.isAdmin()) {
                UIUtils.showAlert('权限不足，需要管理员权限', 'danger');
                return;
            }
            return callback.apply(this, args);
        };
    },

    // 获取认证头
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    },

    // 带认证的fetch请求
    async authenticatedFetch(url, options = {}) {
        const defaultOptions = {
            headers: this.getAuthHeaders()
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, mergedOptions);
            
            // 如果是401未授权，清除认证信息并跳转到登录页
            if (response.status === 401) {
                this.clearAuth();
                this.showLoginPage();
                throw new Error('认证已过期，请重新登录');
            }

            return response;
        } catch (error) {
            console.error('认证请求失败:', error);
            throw error;
        }
    }
};

// 导出到全局
window.AuthManager = AuthManager; 