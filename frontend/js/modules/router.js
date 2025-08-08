/**
 * 页面路由模块
 * 负责页面切换、侧边栏管理、导航状态管理等功能
 */

// 页面路由模块对象
const RouterModule = {
    // ======================== 侧边栏管理 ========================

    // 切换侧边栏显示/隐藏
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        
        sidebar.classList.toggle('hidden');
        mainContent.classList.toggle('expanded');
    },

    // ======================== 页面切换功能 ========================

    // 显示不同页面
    showPage(pageName, event = null) {
        // 清理之前的图表（如果图表模块存在）
        if (window.ChartsModule && typeof window.ChartsModule.clearAllCharts === 'function') {
            window.ChartsModule.clearAllCharts();
        } else if (typeof window.clearAllCharts === 'function') {
            // 向后兼容：如果图表模块尚未创建，直接调用全局函数
            window.clearAllCharts();
        }
        
        // 隐藏所有页面
        this.hideAllPages();
        
        // 移除所有导航活动状态
        this.clearAllNavActiveStates();
        
        // 显示对应页面
        this.showPageContent(pageName);
        
        // 设置导航活动状态
        this.setNavActiveState(pageName, event);
        
        // 根据页面加载不同数据
        this.loadPageData(pageName);
    },

    // ======================== 页面管理辅助方法 ========================

    // 隐藏所有页面内容
    hideAllPages() {
        document.querySelectorAll('.page-content').forEach(page => {
            page.style.display = 'none';
        });
    },

    // 清除所有导航活动状态
    clearAllNavActiveStates() {
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            link.classList.remove('active');
        });
    },

    // 显示指定页面内容
    showPageContent(pageName) {
        const pageElement = document.getElementById(pageName + 'Page');
        if (pageElement) {
            pageElement.style.display = 'block';
        } else {
            console.error(`页面元素不存在: ${pageName}Page`);
        }
    },

    // 设置导航活动状态
    setNavActiveState(pageName, event = null) {
        // 如果有事件对象，直接设置点击的链接为活动状态
        if (event && event.target) {
            event.target.classList.add('active');
        } else {
            // 如果没有事件对象，根据页面名称查找对应的导航链接
            const navLinks = document.querySelectorAll('.sidebar .nav-link');
            navLinks.forEach(link => {
                const onclick = link.getAttribute('onclick');
                if (onclick && onclick.includes(`'${pageName}'`)) {
                    link.classList.add('active');
                }
            });
        }
    },

    // 根据页面加载对应数据
    loadPageData(pageName) {
        switch(pageName) {
            case 'dashboard':
                // 调用图表模块的加载仪表板功能
                if (window.ChartsModule && typeof window.ChartsModule.loadDashboard === 'function') {
                    window.ChartsModule.loadDashboard();
                } else if (typeof window.loadDashboard === 'function') {
                    // 向后兼容：如果图表模块尚未创建，直接调用全局函数
                    window.loadDashboard();
                }
                break;
            case 'data':
                // 延迟加载，确保DOM元素已经渲染
                setTimeout(() => {
                    if (window.DataModule && typeof window.DataModule.loadDataList === 'function') {
                        window.DataModule.loadDataList();
                    } else if (typeof window.loadDataList === 'function') {
                        window.loadDataList();
                    }
                }, 100);
                break;
            case 'orderData':
                // 延迟加载订单数据列表，确保DOM元素已经渲染
                setTimeout(() => {
                    if (window.OrderDataModule && typeof window.OrderDataModule.initOrderDataPage === 'function') {
                        window.OrderDataModule.initOrderDataPage();
                    }
                }, 100);
                break;
            case 'productTags':
                // 延迟加载产品标签列表，确保DOM元素已经渲染
                setTimeout(() => {
                    if (window.ProductTagsModule && typeof window.ProductTagsModule.initProductTagsPage === 'function') {
                        window.ProductTagsModule.initProductTagsPage();
                    }
                }, 100);
                break;
            case 'summary':
                // 数据汇总页面已在应用初始化时设置事件监听器，无需重复设置
                break;
            case 'planting':
                // 种菜汇总页面已在应用初始化时设置事件监听器，无需重复设置
                break;
            case 'final':
                // 最终汇总页面已在应用初始化时设置事件监听器，无需重复设置
                break;
            case 'upload':
                // 上传页面通常不需要特殊的数据加载
                break;
            default:
                console.log(`页面 ${pageName} 不需要特殊的数据加载逻辑`);
        }
    },

    // ======================== 导航辅助功能 ========================

    // 获取当前活动页面
    getCurrentActivePage() {
        const activeLink = document.querySelector('.sidebar .nav-link.active');
        if (activeLink) {
            const onclick = activeLink.getAttribute('onclick');
            if (onclick) {
                const match = onclick.match(/showPage\('([^']+)'/);
                return match ? match[1] : null;
            }
        }
        return null;
    },

    // 检查页面是否可访问（基于用户权限）
    isPageAccessible(pageName) {
        // 检查认证模块是否存在
        if (!window.AuthModule) {
            return true; // 如果认证模块不存在，默认允许访问
        }

        switch(pageName) {
            case 'dashboard':
            case 'data':
            case 'orderData':
            case 'productTags':
            case 'upload':
            case 'summary':
                // 所有登录用户都可以访问所有页面
                return true;
            default:
                return true;
        }
    },

    // 导航到指定页面（带权限检查）
    navigateToPage(pageName, event = null) {
        if (this.isPageAccessible(pageName)) {
            this.showPage(pageName, event);
        } else {
            showAlert('您没有权限访问此页面', 'warning');
        }
    },

    // 初始化路由（设置默认页面）
    initializeRouting() {
        // 根据用户权限设置默认页面
        let defaultPage = 'upload'; // 默认显示上传页面
        
        if (window.AuthModule && AuthModule.isAdmin()) {
            // 管理员可以选择显示仪表板
            defaultPage = 'upload'; // 仍然显示上传页面作为默认
        }
        
        this.showPage(defaultPage);
    }
};

// 将RouterModule暴露给全局使用
window.RouterModule = RouterModule;

// 暴露兼容性函数给外部调用（保持现有代码兼容）
window.toggleSidebar = () => RouterModule.toggleSidebar();
window.showPage = (pageName, event) => RouterModule.showPage(pageName, event); 