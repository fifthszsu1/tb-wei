// 引用认证模块的状态（保持兼容性）
// 注意：不再声明全局变量，直接使用AuthModule提供的访问方法

// 更新本地引用（向后兼容）
function updateLocalAuthReferences() {
    // 为了向后兼容，创建全局引用
    window.currentUser = AuthModule.getCurrentUser();
    window.token = AuthModule.getToken();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    AuthModule.initializeApp();
    setupEventListeners();
    
    // 定期同步认证状态
    setInterval(updateLocalAuthReferences, 100);
});



// 设置事件监听器
function setupEventListeners() {
    // 设置认证模块事件监听器
    AuthModule.setupAuthEventListeners();
    
    // 侧边栏切换
    document.getElementById('sidebarToggle').addEventListener('click', RouterModule.toggleSidebar);
    
    // 设置默认日期为今天
    const uploadDateInput = document.getElementById('uploadDate');
    if (uploadDateInput) {
        const today = new Date().toISOString().split('T')[0];
        uploadDateInput.value = today;
        console.log('日期选择器初始化:', today); // 调试日志
    }
    
    // 加载列设置
    DataModule.loadColumnSettings();
    
    // 加载列宽设置  
    DataModule.loadColumnWidths();
    
    // 设置基础上传事件监听器
    UploadModule.setupBaseUploadEventListeners();
    
    // 设置新的上传功能事件监听器（包括支付宝上传）
    UploadModule.setupNewUploadEventListeners();
    
    // 日期筛选
    const uploadDateFilter = document.getElementById('uploadDateFilter');
    
    // 天猫ID筛选
    const tmallProductCodeFilter = document.getElementById('tmallProductCodeFilter');
    
    // 产品名称筛选
    const productNameFilter = document.getElementById('productNameFilter');
    
    // 店铺名筛选
    const tmallSupplierNameFilter = document.getElementById('tmallSupplierNameFilter');
    
    // 所有过滤器添加Enter键支持
    [uploadDateFilter, tmallProductCodeFilter, productNameFilter, tmallSupplierNameFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    DataModule.searchData();
                }
            });
            
            // 添加输入事件监听器
            filter.addEventListener('input', function() {
                // 如果是日期筛选器，只在值改变时触发
                if (filter === uploadDateFilter && !filter.value) {
                    return;
                }
                // 其他筛选器，在输入长度大于2时触发
                if (filter !== uploadDateFilter && filter.value.length < 2) {
                    return;
                }
                DataModule.searchData();
            });
        }
    });
    
    // 页大小选择器事件监听
    const pageSizeSelector = document.getElementById('pageSizeSelector');
    if (pageSizeSelector) {
        pageSizeSelector.addEventListener('change', function() {
            DataModule.onPageSizeChange();
        });
    }
}







// 设置主应用事件监听器（在用户登录后调用）
window.setupMainAppEventListeners = function() {
    // 同步认证状态
    updateLocalAuthReferences();
    
    // 设置新的上传功能事件监听器
    UploadModule.setupNewUploadEventListeners();
    
    // 设置数据汇总功能事件监听器
    if (window.SummaryModule) {
        SummaryModule.setupSummaryEventListeners();
    } else {
        // 向后兼容
        setupSummaryEventListeners();
    }
    
    // 设置种菜汇总功能事件监听器
    if (window.PlantingModule) {
        PlantingModule.setupPlantingSummaryEventListeners();
    } else {
        // 向后兼容
        setupPlantingSummaryEventListeners();
    }
    
    // 设置最终汇总功能事件监听器
    if (window.FinalModule) {
        FinalModule.setupFinalSummaryEventListeners();
    } else {
        // 向后兼容
        setupFinalSummaryEventListeners();
    }
    
    // 设置订单详情汇总功能事件监听器
    if (window.OrderDetailsModule) {
        OrderDetailsModule.setupOrderDetailsSummaryEventListeners();
    } else {
        // 向后兼容
        setupOrderDetailsSummaryEventListeners();
    }
}

// 暴露loadUserStats函数给AuthModule使用
window.loadUserStats = loadUserStats;

// 页面路由功能已迁移到 RouterModule







// 图表功能已迁移到 ChartsModule

// 数据管理功能已迁移到 DataModule
// 列宽调整功能已迁移到 DataModule

// 用户统计功能和列选择器功能已迁移到 DataModule









// ======================== 数据汇总功能 ========================

// 数据汇总功能已迁移到 SummaryModule

// 种菜汇总功能已迁移到 PlantingModule

// 最终汇总功能已迁移到 FinalModule

// 表格渲染功能已迁移到 DataModule