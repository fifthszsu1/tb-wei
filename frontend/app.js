// 主应用文件 - 模块化版本
import { API_BASE_URL, STORAGE_KEYS, TABLE_COLUMNS, USER_ROLES } from './js/config.js';
import { UIUtils } from './js/utils/ui.js';
import { AuthManager } from './js/modules/auth.js';
import { UploadManager } from './js/modules/upload.js';
import { DataManager } from './js/modules/data.js';
import { BusinessManager } from './js/modules/business.js';
import { ChartManager } from './js/modules/charts.js';

// 主应用类
class App {
    constructor() {
        // 初始化管理器
        this.authManager = new AuthManager();
        this.uploadManager = new UploadManager();
        this.dataManager = new DataManager();
        this.businessManager = new BusinessManager();
        this.chartManager = new ChartManager();
        
        // 当前页面和状态
        this.currentPage = 'dashboard';
        this.isInitialized = false;
        
        // 绑定方法到window对象以保持兼容性
        this.bindGlobalMethods();
        
        // 初始化应用
        this.init();
    }

    // 绑定全局方法以保持向后兼容
    bindGlobalMethods() {
        window.showPage = (page) => this.showPage(page);
        window.logout = () => this.authManager.logout();
        window.loadProductData = () => this.loadProductData();
        window.loadProductList = () => this.loadProductList();
        window.loadPlantingRecords = () => this.loadPlantingRecords();
        window.loadSubjectReports = () => this.loadSubjectReports();
        window.searchData = (query) => this.searchData(query);
        window.exportData = (type) => this.exportData(type);
        window.currentPage = this.currentPage;
    }

    // 初始化应用
    async init() {
        try {
            console.log('初始化应用...');
            
            // 检查用户认证状态
            if (!this.authManager.isAuthenticated()) {
                this.showLoginPage();
                return;
            }

            // 加载用户信息
            await this.authManager.loadUserInfo();
            
            // 初始化UI
            this.initializeUI();
            
            // 显示默认页面
            this.showPage('dashboard');
            
            // 标记为已初始化
            this.isInitialized = true;
            
            console.log('应用初始化完成');
        } catch (error) {
            console.error('应用初始化失败:', error);
            UIUtils.showAlert('error', '应用初始化失败，请刷新页面重试');
        }
    }

    // 初始化UI组件
    initializeUI() {
        // 设置用户信息显示
        this.updateUserDisplay();
        
        // 初始化导航
        this.initializeNavigation();
        
        // 初始化搜索
        this.initializeSearch();
        
        // 初始化事件监听器
        this.initializeEventListeners();
        
        // 初始化数据分页事件
        this.initializeDataEvents();
    }

    // 更新用户显示
    updateUserDisplay() {
        const userInfo = this.authManager.getCurrentUser();
        if (userInfo) {
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = userInfo.username || '用户';
            }
            
            const userRoleElement = document.getElementById('userRole');
            if (userRoleElement) {
                userRoleElement.textContent = userInfo.role || '普通用户';
            }
        }
    }

    // 初始化导航
    initializeNavigation() {
        const navLinks = document.querySelectorAll('[data-page]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.getAttribute('data-page') || e.target.closest('[data-page]').getAttribute('data-page');
                if (page) {
                    this.showPage(page);
                }
            });
        });
    }

    // 初始化搜索
    initializeSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchData(e.target.value);
                }, 300);
            });
        }

        const searchButton = document.getElementById('searchButton');
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    this.searchData(searchInput.value);
                }
            });
        }
    }

    // 初始化事件监听器
    initializeEventListeners() {
        // 导出按钮
        const exportButtons = document.querySelectorAll('[data-export]');
        exportButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const exportType = e.target.getAttribute('data-export');
                this.exportData(exportType);
            });
        });

        // 刷新按钮
        const refreshButtons = document.querySelectorAll('[data-refresh]');
        refreshButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.refreshCurrentPage();
            });
        });

        // 窗口大小改变时重置图表
        window.addEventListener('resize', () => {
            this.chartManager.resizeAllCharts();
        });
    }

    // 初始化数据事件
    initializeDataEvents() {
        // 监听分页变化事件
        window.addEventListener('dataPageChanged', (e) => {
            this.handleDataPageChanged(e.detail);
        });
    }

    // 显示登录页面
    showLoginPage() {
        const loginSection = document.getElementById('loginSection');
        const mainSection = document.getElementById('mainSection');
        
        if (loginSection) loginSection.style.display = 'block';
        if (mainSection) mainSection.style.display = 'none';
    }

    // 显示主页面
    showMainPage() {
        const loginSection = document.getElementById('loginSection');
        const mainSection = document.getElementById('mainSection');
        
        if (loginSection) loginSection.style.display = 'none';
        if (mainSection) mainSection.style.display = 'block';
    }

    // 显示指定页面
    async showPage(page) {
        console.log(`显示页面: ${page}`);
        
        // 更新当前页面
        this.currentPage = page;
        window.currentPage = page;
        
        // 隐藏所有页面
        const pages = document.querySelectorAll('.page-content');
        pages.forEach(p => p.style.display = 'none');
        
        // 显示目标页面
        const targetPage = document.getElementById(page);
        if (targetPage) {
            targetPage.style.display = 'block';
        }
        
        // 更新导航状态
        this.updateNavigation(page);
        
        // 根据页面类型加载数据
        try {
            await this.loadPageData(page);
        } catch (error) {
            console.error(`加载页面数据失败 (${page}):`, error);
            UIUtils.showAlert('error', `页面数据加载失败: ${error.message}`);
        }
    }

    // 更新导航状态
    updateNavigation(activePage) {
        const navLinks = document.querySelectorAll('[data-page]');
        navLinks.forEach(link => {
            const page = link.getAttribute('data-page');
            if (page === activePage) {
                link.classList.add('active');
                link.closest('li')?.classList.add('active');
            } else {
                link.classList.remove('active');
                link.closest('li')?.classList.remove('active');
            }
        });
    }

    // 加载页面数据
    async loadPageData(page) {
        switch (page) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'productData':
                await this.loadProductData();
                break;
            case 'productList':
                await this.loadProductList();
                break;
            case 'plantingRecords':
                await this.loadPlantingRecords();
                break;
            case 'subjectReports':
                await this.loadSubjectReports();
                break;
            case 'promotionSummary':
                await this.loadPromotionSummary();
                break;
            case 'plantingSummary':
                await this.loadPlantingSummary();
                break;
            case 'finalSummary':
                await this.loadFinalSummary();
                break;
            default:
                console.log(`未知页面: ${page}`);
        }
    }

    // 加载仪表板
    async loadDashboard() {
        try {
            // 加载统计数据
            const [platformInfo, supplierInfo, businessMetrics] = await Promise.all([
                this.dataManager.getPlatformInfo().catch(() => null),
                this.dataManager.getSupplierInfo().catch(() => null),
                this.businessManager.getBusinessMetrics().catch(() => null)
            ]);

            // 更新统计卡片
            this.updateDashboardStats(platformInfo, supplierInfo, businessMetrics);
            
            // 创建图表
            if (businessMetrics && businessMetrics.sales_trend) {
                this.chartManager.createSalesTrendChart('salesTrendChart', businessMetrics.sales_trend);
            }
            
            if (platformInfo && platformInfo.platform_distribution) {
                this.chartManager.createPlatformDistributionChart('platformChart', platformInfo.platform_distribution);
            }
        } catch (error) {
            console.error('仪表板加载失败:', error);
        }
    }

    // 更新仪表板统计
    updateDashboardStats(platformInfo, supplierInfo, businessMetrics) {
        // 更新统计卡片
        if (businessMetrics) {
            this.updateStatCard('totalSales', businessMetrics.total_sales);
            this.updateStatCard('totalOrders', businessMetrics.total_orders);
            this.updateStatCard('totalProducts', businessMetrics.total_products);
            this.updateStatCard('totalCustomers', businessMetrics.total_customers);
        }
    }

    // 更新统计卡片
    updateStatCard(cardId, value) {
        const element = document.getElementById(cardId);
        if (element) {
            if (typeof value === 'number') {
                element.textContent = value.toLocaleString();
            } else {
                element.textContent = value || '-';
            }
        }
    }

    // 加载产品数据
    async loadProductData() {
        try {
            const result = await this.dataManager.loadProductData();
            const data = this.dataManager.getPaginatedData();
            
            // 渲染表格
            this.dataManager.renderTable(data, 'productDataTable', TABLE_COLUMNS.PRODUCT_DATA);
            
            // 渲染分页
            this.dataManager.renderPagination('productDataPagination');
            
            // 更新数据状态显示
            this.updateDataStatus();
        } catch (error) {
            console.error('产品数据加载失败:', error);
        }
    }

    // 加载产品清单
    async loadProductList() {
        try {
            const result = await this.dataManager.loadProductList();
            const data = this.dataManager.getPaginatedData();
            
            this.dataManager.renderTable(data, 'productListTable', TABLE_COLUMNS.PRODUCT_LIST);
            this.dataManager.renderPagination('productListPagination');
            this.updateDataStatus();
        } catch (error) {
            console.error('产品清单加载失败:', error);
        }
    }

    // 加载种植记录
    async loadPlantingRecords() {
        try {
            const result = await this.dataManager.loadPlantingRecords();
            const data = this.dataManager.getPaginatedData();
            
            this.dataManager.renderTable(data, 'plantingRecordsTable', TABLE_COLUMNS.PLANTING_RECORDS);
            this.dataManager.renderPagination('plantingRecordsPagination');
            this.updateDataStatus();
        } catch (error) {
            console.error('种植记录加载失败:', error);
        }
    }

    // 加载主体报告
    async loadSubjectReports() {
        try {
            const result = await this.dataManager.loadSubjectReports();
            const data = this.dataManager.getPaginatedData();
            
            this.dataManager.renderTable(data, 'subjectReportsTable', TABLE_COLUMNS.SUBJECT_REPORTS);
            this.dataManager.renderPagination('subjectReportsPagination');
            this.updateDataStatus();
        } catch (error) {
            console.error('主体报告加载失败:', error);
        }
    }

    // 加载推广汇总
    async loadPromotionSummary() {
        try {
            const summary = await this.businessManager.getPromotionSummary();
            this.businessManager.displayPromotionSummary(summary);
        } catch (error) {
            console.error('推广汇总加载失败:', error);
        }
    }

    // 加载种植汇总
    async loadPlantingSummary() {
        try {
            const summary = await this.businessManager.getPlantingSummary();
            this.businessManager.displayPlantingSummary(summary);
        } catch (error) {
            console.error('种植汇总加载失败:', error);
        }
    }

    // 加载最终汇总
    async loadFinalSummary() {
        try {
            const businessMetrics = await this.businessManager.getBusinessMetrics();
            this.businessManager.displayFinalSummary(businessMetrics);
        } catch (error) {
            console.error('最终汇总加载失败:', error);
        }
    }

    // 搜索数据
    async searchData(query) {
        if (!query.trim()) {
            // 如果搜索为空，重新加载当前页面数据
            await this.loadPageData(this.currentPage);
            return;
        }

        try {
            // 根据当前页面确定搜索列
            let searchColumns = [];
            switch (this.currentPage) {
                case 'productData':
                    searchColumns = ['product_name', 'supplier', 'platform'];
                    break;
                case 'productList':
                    searchColumns = ['product_name', 'category'];
                    break;
                case 'plantingRecords':
                    searchColumns = ['crop_name', 'location'];
                    break;
                case 'subjectReports':
                    searchColumns = ['subject_name', 'report_type'];
                    break;
            }

            // 执行搜索
            const filteredData = this.dataManager.searchData(query, searchColumns);
            const paginatedData = this.dataManager.getPaginatedData();
            
            // 更新显示
            this.updateCurrentPageDisplay(paginatedData);
            this.updateDataStatus();
        } catch (error) {
            console.error('搜索失败:', error);
            UIUtils.showAlert('error', `搜索失败: ${error.message}`);
        }
    }

    // 导出数据
    async exportData(type) {
        const exportMap = {
            'productData': { endpoint: '/export_product_data', filename: 'product_data.csv' },
            'productList': { endpoint: '/export_product_list', filename: 'product_list.csv' },
            'plantingRecords': { endpoint: '/export_planting_records', filename: 'planting_records.csv' },
            'subjectReports': { endpoint: '/export_subject_reports', filename: 'subject_reports.csv' }
        };

        const config = exportMap[type];
        if (!config) {
            UIUtils.showAlert('error', '未知的导出类型');
            return;
        }

        try {
            await this.dataManager.exportData(config.endpoint, {}, config.filename);
        } catch (error) {
            console.error('导出失败:', error);
        }
    }

    // 刷新当前页面
    async refreshCurrentPage() {
        UIUtils.showSpinner();
        try {
            this.dataManager.clearData();
            await this.loadPageData(this.currentPage);
            UIUtils.showAlert('success', '页面刷新成功');
        } catch (error) {
            console.error('页面刷新失败:', error);
            UIUtils.showAlert('error', `页面刷新失败: ${error.message}`);
        } finally {
            UIUtils.hideSpinner();
        }
    }

    // 处理数据分页变化
    handleDataPageChanged(detail) {
        this.updateCurrentPageDisplay(detail.data);
        this.updateDataStatus();
    }

    // 更新当前页面显示
    updateCurrentPageDisplay(data) {
        const tableMap = {
            'productData': { tableId: 'productDataTable', columns: TABLE_COLUMNS.PRODUCT_DATA },
            'productList': { tableId: 'productListTable', columns: TABLE_COLUMNS.PRODUCT_LIST },
            'plantingRecords': { tableId: 'plantingRecordsTable', columns: TABLE_COLUMNS.PLANTING_RECORDS },
            'subjectReports': { tableId: 'subjectReportsTable', columns: TABLE_COLUMNS.SUBJECT_REPORTS }
        };

        const config = tableMap[this.currentPage];
        if (config) {
            this.dataManager.renderTable(data, config.tableId, config.columns);
        }
    }

    // 更新数据状态显示
    updateDataStatus() {
        const state = this.dataManager.getDataState();
        const statusElement = document.getElementById('dataStatus');
        
        if (statusElement) {
            statusElement.innerHTML = `
                显示 ${state.currentPage}/${state.totalPages} 页，
                共 ${state.filteredItems} 条记录
                ${state.filteredItems !== state.totalItems ? `(从 ${state.totalItems} 条中筛选)` : ''}
            `;
        }
    }

    // 获取应用状态
    getAppState() {
        return {
            currentPage: this.currentPage,
            isInitialized: this.isInitialized,
            userInfo: this.authManager.getCurrentUser(),
            dataState: this.dataManager.getDataState()
        };
    }
}

// 等待DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化应用...');
    window.app = new App();
});

// 导出应用类供外部使用
window.App = App;