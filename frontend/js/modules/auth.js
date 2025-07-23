/**
 * 用户认证模块
 * 负责登录、登出、权限验证等功能
 */

// 认证相关的全局变量
let currentUser = null;
let token = localStorage.getItem(AppConfig.STORAGE_KEYS.TOKEN);

// 认证模块对象
const AuthModule = {
    // 暴露给外部访问的变量和函数
    getCurrentUser: () => currentUser,
    getToken: () => token,
    setCurrentUser: (user) => currentUser = user,
    setToken: (newToken) => token = newToken,
    
    // 初始化应用
    initializeApp() {
        if (token) {
            // 验证token有效性
            APIService.verifyUser()
            .then(user => {
                currentUser = user;
                this.updateGlobalReferences();
                this.showMainApp();
            })
            .catch(error => {
                localStorage.removeItem(AppConfig.STORAGE_KEYS.TOKEN);
                token = null;
                currentUser = null;
                this.updateGlobalReferences();
                document.body.classList.add('login-active'); // 添加登录状态类
                this.showLoginPage();
            });
        } else {
            document.body.classList.add('login-active'); // 添加登录状态类
            this.showLoginPage();
        }
    },

    // 处理登录
    handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        showSpinner();
        
        APIService.login(username, password)
        .then(data => {
            hideSpinner();
            
            if (data.access_token) {
                token = data.access_token;
                currentUser = data.user;
                localStorage.setItem(AppConfig.STORAGE_KEYS.TOKEN, token);
                this.updateGlobalReferences();
                this.showMainApp();
            } else {
                showAlert('登录失败：' + data.message, 'danger');
            }
        })
        .catch(error => {
            hideSpinner();
            showAlert('登录失败：' + error.message, 'danger');
        });
    },

    // 显示主应用
    showMainApp() {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.body.classList.remove('login-active'); // 移除登录状态类
        document.getElementById('currentUser').textContent = `${currentUser.username} (${currentUser.role === 'admin' ? '管理员' : '普通用户'})`;
        
        // 根据用户角色显示不同菜单
        if (currentUser.role === 'admin') {
            document.getElementById('dashboardNav').style.display = 'block';
            document.getElementById('dataNav').style.display = 'block';
        } else {
            // 普通用户隐藏管理功能
            document.getElementById('dashboardNav').style.display = 'none';
            document.getElementById('dataNav').style.display = 'none';
            
            // 显示权限提示
            setTimeout(() => {
                showAlert('欢迎！您当前为普通用户，可以上传文件。管理员可查看详细数据统计。', 'info');
            }, 1000);
        }
        
        // 默认显示上传页面
        if (window.RouterModule) {
            RouterModule.showPage('upload');
        } else {
            // 向后兼容
            showPage('upload');
        }
        
        // 通知主应用已登录，需要初始化其他模块
        if (window.setupMainAppEventListeners) {
            window.setupMainAppEventListeners();
        }
        
        // 如果是普通用户，加载用户统计
        if (currentUser.role === 'user') {
            if (window.loadUserStats) {
                window.loadUserStats();
            }
        }
    },

    // 显示登录页面
    showLoginPage() {
        document.getElementById('loginPage').style.display = 'block';
        document.getElementById('mainApp').style.display = 'none';
        document.body.classList.add('login-active'); // 添加登录状态类
    },

    // 退出登录
    logout() {
        localStorage.removeItem(AppConfig.STORAGE_KEYS.TOKEN);
        token = null;
        currentUser = null;
        this.updateGlobalReferences();
        document.body.classList.remove('login-active'); // 移除登录状态类
        this.showLoginPage();
    },

    // 检查用户权限
    checkAdminPermission() {
        if (!currentUser || currentUser.role !== 'admin') {
            showAlert('权限不足，只有管理员可以执行此操作', 'danger');
            return false;
        }
        return true;
    },

    // 检查是否为管理员
    isAdmin() {
        return currentUser && currentUser.role === 'admin';
    },

    // 检查是否为普通用户
    isUser() {
        return currentUser && currentUser.role === 'user';
    },

    // 设置认证相关事件监听器
    setupAuthEventListeners() {
        // 登录表单
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }
};

// 将AuthModule暴露给全局使用
window.AuthModule = AuthModule;

// 暴露更新函数给外部同步状态
window.AuthModule.updateGlobalReferences = function() {
    if (window.updateLocalAuthReferences) {
        window.updateLocalAuthReferences();
    }
}; 