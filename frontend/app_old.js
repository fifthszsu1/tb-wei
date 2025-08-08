// 全局变量
let currentUser = null;
let token = localStorage.getItem('token');

// 根据环境设置API基础路径
const API_BASE = window.location.port === '80' || window.location.port === '' ? '/api' : 'http://localhost:5000/api';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// 初始化应用
function initializeApp() {
    if (token) {
        // 验证token有效性
        fetch(`${API_BASE}/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Token invalid');
        })
        .then(user => {
            currentUser = user;
            showMainApp();
        })
        .catch(error => {
            localStorage.removeItem('token');
            token = null;
            currentUser = null;
            document.body.classList.add('login-active'); // 添加登录状态类
            showLoginPage();
        });
    } else {
        document.body.classList.add('login-active'); // 添加登录状态类
        showLoginPage();
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 登录表单
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // 侧边栏切换
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // 设置默认日期为今天
    const uploadDateInput = document.getElementById('uploadDate');
    if (uploadDateInput) {
        const today = new Date().toISOString().split('T')[0];
        uploadDateInput.value = today;
        console.log('日期选择器初始化:', today); // 调试日志
    }
    
    // 加载列设置
    loadColumnSettings();
    
    // 加载列宽设置  
    loadColumnWidths();
    
    // 文件上传
    const fileInput = document.getElementById('fileInput');
    const uploadZone = document.getElementById('uploadZone');
    const uploadBtn = document.getElementById('uploadBtn');
    
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);
    
    fileInput.addEventListener('change', handleFileSelect);
    uploadBtn.addEventListener('click', handleFileUpload);
    

    
    // 日期筛选
    const uploadDateFilter = document.getElementById('uploadDateFilter');
    
    // 天猫ID筛选
    const tmallProductCodeFilter = document.getElementById('tmallProductCodeFilter');
    
    // 产品名称筛选
    const productNameFilter = document.getElementById('productNameFilter');
    
    // 所有过滤器添加Enter键支持
    [uploadDateFilter, tmallProductCodeFilter, productNameFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    searchData();
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
                searchData();
            });
        }
    });
}

// 处理登录
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    showSpinner();
    
    fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        hideSpinner();
        
        if (data.access_token) {
            token = data.access_token;
            currentUser = data.user;
            localStorage.setItem('token', token);
            showMainApp();
        } else {
            showAlert('登录失败：' + data.message, 'danger');
        }
    })
    .catch(error => {
        hideSpinner();
        showAlert('登录失败：' + error.message, 'danger');
    });
}

// 显示主应用
function showMainApp() {
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
    showPage('upload');
    
    // 设置新的上传功能事件监听器
    setupNewUploadEventListeners();
    
    // 设置数据汇总功能事件监听器
    setupSummaryEventListeners();
    
    // 设置种菜汇总功能事件监听器
    setupPlantingSummaryEventListeners();
    
    // 设置最终汇总功能事件监听器
    setupFinalSummaryEventListeners();
    
    // 如果是普通用户，加载用户统计
    if (currentUser.role === 'user') {
        loadUserStats();
    }
}

// 设置新的上传功能事件监听器
function setupNewUploadEventListeners() {
    // 产品总表上传
    const productListUploadZone = document.getElementById('productListUploadZone');
    const productListFileInput = document.getElementById('productListFileInput');
    const productListUploadBtn = document.getElementById('productListUploadBtn');
    
    if (productListUploadZone && productListFileInput && productListUploadBtn) {
        productListUploadZone.addEventListener('click', () => productListFileInput.click());
        productListUploadZone.addEventListener('dragover', handleDragOver);
        productListUploadZone.addEventListener('dragleave', handleDragLeave);
        productListUploadZone.addEventListener('drop', (e) => handleDrop(e, productListFileInput));
        productListFileInput.addEventListener('change', (e) => handleFileSelect(e, 'productList'));
        productListUploadBtn.addEventListener('click', handleProductListUpload);
        console.log('产品总表上传事件监听器已设置');
    } else {
        console.error('产品总表上传元素未找到:', {
            productListUploadZone: !!productListUploadZone,
            productListFileInput: !!productListFileInput,
            productListUploadBtn: !!productListUploadBtn
        });
    }
    
    // 种菜表格登记上传
    const plantingRecordsUploadZone = document.getElementById('plantingRecordsUploadZone');
    const plantingRecordsFileInput = document.getElementById('plantingRecordsFileInput');
    const plantingRecordsUploadBtn = document.getElementById('plantingRecordsUploadBtn');
    
    if (plantingRecordsUploadZone && plantingRecordsFileInput && plantingRecordsUploadBtn) {
        plantingRecordsUploadZone.addEventListener('click', () => plantingRecordsFileInput.click());
        plantingRecordsUploadZone.addEventListener('dragover', handleDragOver);
        plantingRecordsUploadZone.addEventListener('dragleave', handleDragLeave);
        plantingRecordsUploadZone.addEventListener('drop', (e) => handleDrop(e, plantingRecordsFileInput));
        plantingRecordsFileInput.addEventListener('change', (e) => handleFileSelect(e, 'plantingRecords'));
        plantingRecordsUploadBtn.addEventListener('click', handlePlantingRecordsUpload);
        console.log('种菜表格登记上传事件监听器已设置');
    } else {
        console.error('种菜表格登记上传元素未找到:', {
            plantingRecordsUploadZone: !!plantingRecordsUploadZone,
            plantingRecordsFileInput: !!plantingRecordsFileInput,
            plantingRecordsUploadBtn: !!plantingRecordsUploadBtn
        });
    }
    
    // 主体报表上传
    const subjectReportUploadZone = document.getElementById('subjectReportUploadZone');
    const subjectReportFileInput = document.getElementById('subjectReportFileInput');
    const subjectReportUploadBtn = document.getElementById('subjectReportUploadBtn');
    const subjectReportDate = document.getElementById('subjectReportDate');
    
    console.log('主体报表元素检查:', {
        subjectReportUploadZone: !!subjectReportUploadZone,
        subjectReportFileInput: !!subjectReportFileInput,
        subjectReportUploadBtn: !!subjectReportUploadBtn,
        subjectReportDate: !!subjectReportDate
    });
    
    if (subjectReportUploadZone && subjectReportFileInput && subjectReportUploadBtn) {
        // 设置点击事件监听器
        subjectReportUploadZone.addEventListener('click', () => {
            console.log('点击了主体报表上传区域');
            subjectReportFileInput.click();
        });
        
        // 设置拖拽事件监听器
        subjectReportUploadZone.addEventListener('dragover', handleDragOver);
        subjectReportUploadZone.addEventListener('dragleave', handleDragLeave);
        subjectReportUploadZone.addEventListener('drop', (e) => handleDrop(e, subjectReportFileInput));
        
        // 设置文件选择事件监听器
        subjectReportFileInput.addEventListener('change', (e) => {
            console.log('主体报表文件选择发生变化');
            handleFileSelect(e, 'subjectReport');
            updateSubjectReportUploadBtn();
        });
        
        // 设置日期选择事件监听器（如果存在）
        if (subjectReportDate) {
            subjectReportDate.addEventListener('change', updateSubjectReportUploadBtn);
        }
        
        // 设置上传按钮事件监听器
        subjectReportUploadBtn.addEventListener('click', handleSubjectReportUpload);
        
        console.log('主体报表上传事件监听器已设置');
    } else {
        console.error('主体报表上传元素未找到:', {
            subjectReportUploadZone: !!subjectReportUploadZone,
            subjectReportFileInput: !!subjectReportFileInput,
            subjectReportUploadBtn: !!subjectReportUploadBtn,
            subjectReportDate: !!subjectReportDate
        });
    }
}

// 显示登录页面
function showLoginPage() {
    document.getElementById('loginPage').style.display = 'block';
    document.getElementById('mainApp').style.display = 'none';
    document.body.classList.add('login-active'); // 添加登录状态类
}

// 退出登录
function logout() {
    localStorage.removeItem('token');
    token = null;
    currentUser = null;
    document.body.classList.remove('login-active'); // 移除登录状态类
    showLoginPage();
}

// 切换侧边栏
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    sidebar.classList.toggle('hidden');
    mainContent.classList.toggle('expanded');
}

// 显示不同页面
function showPage(pageName, event = null) {
    // 清理之前的图表
    clearAllCharts();
    
    // 隐藏所有页面
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });
    
    // 移除所有导航活动状态
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // 显示对应页面
    document.getElementById(pageName + 'Page').style.display = 'block';
    
    // 设置导航活动状态（如果有事件对象）
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // 如果没有事件对象，根据页面名称设置活动状态
        const navLinks = document.querySelectorAll('.sidebar .nav-link');
        navLinks.forEach(link => {
            if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(`'${pageName}'`)) {
                link.classList.add('active');
            }
        });
    }
    
    // 根据页面加载不同数据
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'data':
            // 延迟加载，确保DOM元素已经渲染
            setTimeout(() => {
                loadDataList();
            }, 100);
            break;
        case 'summary':
            // 确保数据汇总页面的事件监听器正确设置
            setupSummaryEventListeners();
            break;
    }
}

// 文件拖拽处理
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('dragover');
}

function handleDrop(e, fileInput = null) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const targetFileInput = fileInput || document.getElementById('fileInput');
        targetFileInput.files = files;
        
        // 根据文件输入类型调用对应的处理函数
        if (targetFileInput.id === 'productListFileInput') {
            handleFileSelect(null, 'productList');
        } else if (targetFileInput.id === 'plantingRecordsFileInput') {
            handleFileSelect(null, 'plantingRecords');
        } else if (targetFileInput.id === 'subjectReportFileInput') {
            handleFileSelect(null, 'subjectReport');
            updateSubjectReportUploadBtn();
        } else {
            handleFileSelect();
        }
    }
}

// 文件选择处理
function handleFileSelect(event = null, uploadType = 'platform') {
    let fileInput, uploadBtn, buttonText;
    
    if (uploadType === 'productList') {
        fileInput = document.getElementById('productListFileInput');
        uploadBtn = document.getElementById('productListUploadBtn');
        buttonText = '导入产品总表';
    } else if (uploadType === 'plantingRecords') {
        fileInput = document.getElementById('plantingRecordsFileInput');
        uploadBtn = document.getElementById('plantingRecordsUploadBtn');
        buttonText = '导入种菜表格';
    } else if (uploadType === 'subjectReport') {
        fileInput = document.getElementById('subjectReportFileInput');
        uploadBtn = document.getElementById('subjectReportUploadBtn');
        buttonText = '导入主体报表';
    } else {
        fileInput = document.getElementById('fileInput');
        uploadBtn = document.getElementById('uploadBtn');
        buttonText = '上传平台数据';
    }
    
    if (fileInput.files.length > 0) {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = `<i class="fas fa-upload"></i> ${buttonText} (${fileInput.files[0].name})`;
    } else {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = `<i class="fas fa-upload"></i> ${buttonText}`;
    }
}

// 文件上传处理
function handleFileUpload(forceOverwrite = false) {
    const fileInput = document.getElementById('fileInput');
    const platform = document.getElementById('platform').value;
    const uploadDateElement = document.getElementById('uploadDate');
    const uploadDate = uploadDateElement ? uploadDateElement.value : '';
    
    console.log('上传日期元素:', uploadDateElement); // 调试日志
    console.log('上传日期值:', uploadDate); // 调试日志
    
    if (!fileInput.files[0]) {
        showAlert('请选择文件', 'warning');
        return;
    }
    
    if (!uploadDate || uploadDate.trim() === '') {
        showAlert('请选择日期', 'warning');
        console.log('日期验证失败:', uploadDate); // 调试日志
        return;
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('platform', platform);
    formData.append('upload_date', uploadDate);
    formData.append('force_overwrite', forceOverwrite.toString());
    
    showSpinner();
    
    fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        hideSpinner();
        
        // 处理重复文件确认
        if (data.requires_confirmation) {
            showConfirmDialog(
                '文件重复确认',
                `文件"${fileInput.files[0].name}"在${uploadDate}已存在 ${data.existing_count} 条记录。是否要替换现有数据？`,
                () => {
                    // 用户确认，强制覆盖
                    handleFileUpload(true);
                }
            );
            return;
        }
        
        if (data.message) {
            showAlert(data.message, data.count ? 'success' : 'danger');
            
            if (data.count) {
                // 重置上传表单
                fileInput.value = '';
                handleFileSelect();
                
                // 如果是普通用户，更新统计信息
                if (currentUser.role === 'user') {
                    loadUserStats();
                }
            }
        }
    })
    .catch(error => {
        hideSpinner();
        showAlert('上传失败：' + error.message, 'danger');
    });
}

// 加载仪表板数据
function loadDashboard() {
    // 移除权限检查，允许所有用户加载数据
    // if (currentUser.role !== 'admin') return;
    
    fetch(`${API_BASE}/stats`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        // 更新统计数字
        document.getElementById('totalRecords').textContent = data.total_records || 0;
        document.getElementById('platformCount').textContent = (data.platform_stats || []).length;
        document.getElementById('brandCount').textContent = (data.brand_stats || []).length;
        
        // 创建图表（检查数据是否存在）
        if (data.platform_stats && data.platform_stats.length > 0) {
            createPlatformChart(data.platform_stats);
        } else {
            // 如果没有数据，显示空状态
            showEmptyChart('platformChart', '暂无平台数据');
        }
        
        if (data.brand_stats && data.brand_stats.length > 0) {
            createBrandChart(data.brand_stats);
        } else {
            // 如果没有数据，显示空状态
            showEmptyChart('brandChart', '暂无品牌数据');
        }
    })
    .catch(error => {
        console.error('Dashboard loading error:', error);
        showAlert('加载统计数据失败：' + error.message, 'danger');
    });
}

// 显示空图表状态
function showEmptyChart(chartId, message) {
    const canvas = document.getElementById(chartId);
    if (!canvas) {
        console.error(`图表容器 ${chartId} 不存在`);
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制空状态
    ctx.fillStyle = '#6c757d';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

// 清理所有图表
function clearAllCharts() {
    // 清理平台图表
    if (window.platformChart && typeof window.platformChart.destroy === 'function') {
        window.platformChart.destroy();
        window.platformChart = null;
    }
    
    // 清理品牌图表
    if (window.brandChart && typeof window.brandChart.destroy === 'function') {
        window.brandChart.destroy();
        window.brandChart = null;
    }
}

// 创建平台分布图表
function createPlatformChart(platformStats) {
    try {
        const ctx = document.getElementById('platformChart').getContext('2d');
        
        // 销毁旧图表
        if (window.platformChart && typeof window.platformChart.destroy === 'function') {
            window.platformChart.destroy();
        }
        
        window.platformChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: platformStats.map(p => p.platform),
                datasets: [{
                    data: platformStats.map(p => p.count),
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    } catch (error) {
        console.error('创建平台图表失败:', error);
        showEmptyChart('platformChart', '图表加载失败');
    }
}

// 创建品牌排行图表
function createBrandChart(brandStats) {
    try {
        const ctx = document.getElementById('brandChart').getContext('2d');
        
        // 销毁旧图表
        if (window.brandChart && typeof window.brandChart.destroy === 'function') {
            window.brandChart.destroy();
        }
        
        window.brandChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: brandStats.map(b => b.brand),
                datasets: [{
                    label: '商品数量',
                    data: brandStats.map(b => b.count),
                    backgroundColor: '#36A2EB'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (error) {
        console.error('创建品牌图表失败:', error);
        showEmptyChart('brandChart', '图表加载失败');
    }
}

// 加载数据列表
function loadDataList(page = 1) {
    // 移除权限检查，允许所有用户加载数据
    // if (currentUser.role !== 'admin') return;
    
    const uploadDateElement = document.getElementById('uploadDateFilter');
    const tmallProductCodeElement = document.getElementById('tmallProductCodeFilter');
    const productNameElement = document.getElementById('productNameFilter');
    
    const uploadDate = uploadDateElement ? uploadDateElement.value : '';
    const tmallProductCode = tmallProductCodeElement ? tmallProductCodeElement.value : '';
    const productName = productNameElement ? productNameElement.value : '';
    
    console.log('loadDataList被调用，参数:', { // 调试日志
        page: page,
        uploadDate: uploadDate,
        tmallProductCode: tmallProductCode,
        productName: productName
    });
    
    let url = `${API_BASE}/data?page=${page}`;
    
    if (uploadDate) {
        url += `&upload_date=${uploadDate}`;
    }
    
    if (tmallProductCode) {
        url += `&tmall_product_code=${encodeURIComponent(tmallProductCode)}`;
    }
    
    if (productName) {
        url += `&product_name=${encodeURIComponent(productName)}`;
    }
    
    console.log('请求URL:', url); // 调试日志
    
    fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('接收到数据:', data.total, '条记录'); // 调试日志
        renderDataTable(data.data);
        renderPagination(data.current_page, data.pages);
    })
    .catch(error => {
        console.error('加载数据失败:', error); // 调试日志
        showAlert('加载数据失败：' + error.message, 'danger');
    });
}

// 搜索数据
function searchData() {
    loadDataList(1);
}

// 清空过滤器
function clearFilters() {
    console.log('clearFilters函数被调用'); // 调试日志
    
    try {
        const uploadDateFilter = document.getElementById('uploadDateFilter');
        const tmallProductCodeFilter = document.getElementById('tmallProductCodeFilter');
        const productNameFilter = document.getElementById('productNameFilter');
        
        if (uploadDateFilter) uploadDateFilter.value = '';
        if (tmallProductCodeFilter) tmallProductCodeFilter.value = '';
        if (productNameFilter) productNameFilter.value = '';
        
        console.log('过滤器已清空，重新加载数据');
        
        // 重新加载数据
        loadDataList();
    } catch (error) {
        console.error('清空过滤器时出错:', error);
        showAlert('清空过滤器失败', 'danger');
    }
}

// 导出数据到Excel
function exportDataToExcel() {
    if (currentUser.role !== 'admin') {
        showAlert('权限不足', 'danger');
        return;
    }
    
    try {
        // 显示加载状态
        const exportButton = document.querySelector('button[onclick="exportDataToExcel()"]');
        const originalText = exportButton.innerHTML;
        exportButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 导出中...';
        exportButton.disabled = true;
        
        // 获取当前的过滤条件
        const uploadDateElement = document.getElementById('uploadDateFilter');
        const tmallProductCodeElement = document.getElementById('tmallProductCodeFilter');
        const productNameElement = document.getElementById('productNameFilter');
        
        const uploadDate = uploadDateElement ? uploadDateElement.value : '';
        const tmallProductCode = tmallProductCodeElement ? tmallProductCodeElement.value : '';
        const productName = productNameElement ? productNameElement.value : '';
        
        // 构建URL参数
        let url = `${API_BASE}/export-data`;
        const params = new URLSearchParams();
        
        if (uploadDate) {
            params.append('upload_date', uploadDate);
        }
        if (tmallProductCode) {
            params.append('tmall_product_code', tmallProductCode);
        }
        if (productName) {
            params.append('product_name', productName);
        }
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        console.log('导出URL:', url);
        
        // 创建隐藏的下载链接
        const link = document.createElement('a');
        link.href = url;
        link.style.display = 'none';
        
        // 添加认证头信息 - 通过URL参数传递token（因为文件下载无法使用fetch的headers）
        // 但是由于安全考虑，我们使用fetch来处理下载
        fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`导出失败: ${response.status}`);
            }
            return response.blob();
        })
        .then(blob => {
            // 创建下载链接
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // 从响应头中获取文件名，如果没有则使用默认名称
            const currentTime = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
            link.download = `数据列表_${currentTime}.xlsx`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            showAlert('导出成功！文件已开始下载', 'success');
        })
        .catch(error => {
            console.error('导出失败:', error);
            showAlert(`导出失败: ${error.message}`, 'danger');
        })
        .finally(() => {
            // 恢复按钮状态
            exportButton.innerHTML = originalText;
            exportButton.disabled = false;
        });
        
    } catch (error) {
        console.error('导出数据时出错:', error);
        showAlert('导出失败', 'danger');
    }
}

// 确保函数在全局作用域中可用
window.searchData = searchData;
window.clearFilters = clearFilters;
window.exportDataToExcel = exportDataToExcel;

// 显示提示信息
function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    // 自动删除
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 5000);
}

// 显示加载动画
function showSpinner() {
    document.getElementById('loadingSpinner').style.display = 'block';
}

// 隐藏加载动画
function hideSpinner() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

// 截断文本
function truncateText(text, maxLength) {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
}

// 列宽调整功能
let isResizing = false;
let currentColumn = null;
let startX = 0;
let startWidth = 0;

function handleColumnResize(e) {
    // 只有在右边缘附近点击才触发调整
    const rect = e.target.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const columnWidth = rect.width;
    
    // 检查是否在右边缘6px范围内
    if (offsetX < columnWidth - 6) {
        return;
    }
    
    e.preventDefault();
    
    isResizing = true;
    currentColumn = e.target;
    startX = e.clientX;
    startWidth = currentColumn.offsetWidth;
    
    currentColumn.classList.add('resizing');
    
    // 添加全局事件监听器
    document.addEventListener('mousemove', onColumnResize);
    document.addEventListener('mouseup', stopColumnResize);
    
    // 禁用文本选择
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
}

function onColumnResize(e) {
    if (!isResizing || !currentColumn) return;
    
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(80, startWidth + deltaX);
    
    currentColumn.style.width = newWidth + 'px';
    
    // 更新对应列的宽度配置
    const columnKey = currentColumn.getAttribute('data-column');
    const columnIndex = tableColumns.findIndex(col => col.key === columnKey);
    if (columnIndex !== -1) {
        tableColumns[columnIndex].width = newWidth + 'px';
    }
    
    // 更新表格主体中对应列的宽度
    updateTableBodyColumnWidth(columnKey, newWidth);
}

function stopColumnResize() {
    if (!isResizing) return;
    
    isResizing = false;
    
    if (currentColumn) {
        currentColumn.classList.remove('resizing');
        currentColumn = null;
    }
    
    // 移除全局事件监听器
    document.removeEventListener('mousemove', onColumnResize);
    document.removeEventListener('mouseup', stopColumnResize);
    
    // 恢复文本选择
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    
    // 保存列宽设置
    saveColumnWidths();
}

function updateTableBodyColumnWidth(columnKey, width) {
    const tableBody = document.getElementById('dataTableBody');
    const columnIndex = visibleColumns.indexOf(columnKey);
    
    if (columnIndex !== -1) {
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const cell = row.cells[columnIndex];
            if (cell) {
                cell.style.width = width + 'px';
                cell.style.maxWidth = width + 'px';
            }
        });
    }
}

function saveColumnWidths() {
    const widths = {};
    tableColumns.forEach(column => {
        widths[column.key] = column.width;
    });
    localStorage.setItem('columnWidths', JSON.stringify(widths));
}

function loadColumnWidths() {
    const savedWidths = localStorage.getItem('columnWidths');
    if (savedWidths) {
        try {
            const widths = JSON.parse(savedWidths);
            tableColumns.forEach(column => {
                if (widths[column.key]) {
                    column.width = widths[column.key];
                }
            });
        } catch (e) {
            console.error('加载列宽设置失败:', e);
        }
    }
}

// 加载用户上传统计
function loadUserStats() {
    if (currentUser.role !== 'user') return;
    
    fetch(`${API_BASE}/user-stats`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('userUploadCount').textContent = data.upload_count || 0;
        document.getElementById('userStats').style.display = 'block';
        
        // 如果有上传记录，显示详细信息
        if (data.record_count > 0) {
            document.getElementById('userStats').innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> 
                    您已成功上传 <strong>${data.upload_count}</strong> 个文件，
                    共处理 <strong>${data.record_count}</strong> 条数据记录
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('加载用户统计失败:', error);
    });
}

// 确认对话框
function showConfirmDialog(title, message, onConfirm, onCancel = null) {
    // 创建模态框HTML
    const modalHtml = `
        <div class="modal fade" id="confirmModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        ${message}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="confirmBtn">确认</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 移除已存在的模态框
    const existingModal = document.getElementById('confirmModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 添加模态框到页面
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.getElementById('confirmModal');
    const confirmBtn = document.getElementById('confirmBtn');
    
    // 绑定确认按钮事件
    confirmBtn.addEventListener('click', () => {
        if (onConfirm) onConfirm();
        const modalInstance = bootstrap.Modal.getInstance(modal);
        modalInstance.hide();
    });
    
    // 绑定取消事件
    modal.addEventListener('hidden.bs.modal', () => {
        if (onCancel) onCancel();
        modal.remove();
    });
    
    // 显示模态框
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

// 列选择器功能
function showColumnSelector() {
    const selector = document.getElementById('columnSelector');
    const checkboxContainer = document.getElementById('columnCheckboxes');
    
    checkboxContainer.innerHTML = '';
    
    tableColumns.forEach(column => {
        const colDiv = document.createElement('div');
        colDiv.className = 'col-md-3 mb-2';
        
        const checkDiv = document.createElement('div');
        checkDiv.className = 'form-check';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input';
        checkbox.id = `col-${column.key}`;
        checkbox.checked = visibleColumns.includes(column.key);
        
        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = `col-${column.key}`;
        label.textContent = column.name;
        label.style.fontSize = '0.875rem';
        
        checkDiv.appendChild(checkbox);
        checkDiv.appendChild(label);
        colDiv.appendChild(checkDiv);
        checkboxContainer.appendChild(colDiv);
    });
    
    selector.style.display = 'block';
}

function hideColumnSelector() {
    document.getElementById('columnSelector').style.display = 'none';
}

function applyColumnSettings() {
    visibleColumns = [];
    
    tableColumns.forEach(column => {
        const checkbox = document.getElementById(`col-${column.key}`);
        if (checkbox && checkbox.checked) {
            visibleColumns.push(column.key);
        }
    });
    
    // 至少显示一列
    if (visibleColumns.length === 0) {
        visibleColumns = ['product_code'];
        showAlert('至少需要选择一列进行显示', 'warning');
    }
    
    // 重新渲染表格
    loadDataList();
    hideColumnSelector();
    
    // 保存设置到localStorage
    localStorage.setItem('visibleColumns', JSON.stringify(visibleColumns));
    
    showAlert('列设置已应用', 'success');
}

function selectAllColumns() {
    tableColumns.forEach(column => {
        const checkbox = document.getElementById(`col-${column.key}`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
}

function resetColumns() {
    tableColumns.forEach(column => {
        const checkbox = document.getElementById(`col-${column.key}`);
        if (checkbox) {
            checkbox.checked = column.defaultVisible;
        }
    });
}

// 页面加载时恢复列设置
function loadColumnSettings() {
    const saved = localStorage.getItem('visibleColumns');
    if (saved) {
        try {
            const savedColumns = JSON.parse(saved);
            // 验证保存的列是否有效
            const validColumns = savedColumns.filter(col => 
                tableColumns.some(tableCol => tableCol.key === col)
            );
            if (validColumns.length > 0) {
                visibleColumns = validColumns;
            }
        } catch (e) {
            console.log('恢复列设置失败，使用默认设置');
        }
    }
}



// 产品总表上传处理
function handleProductListUpload(forceOverwrite = false) {
    console.log('产品总表上传处理函数被调用');
    
    const fileInput = document.getElementById('productListFileInput');
    
    if (fileInput.files.length === 0) {
        showAlert('请选择要上传的产品总表文件', 'warning');
        return;
    }
    
    console.log('开始上传产品总表文件:', fileInput.files[0].name);
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    if (forceOverwrite) {
        formData.append('force_overwrite', 'true');
    }
    
    showSpinner();
    
    fetch(`${API_BASE}/upload-product-list`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        hideSpinner();
        
        // 处理重复文件确认
        if (data.requires_confirmation) {
            showConfirmDialog(
                '文件重复确认',
                `产品总表文件已存在 ${data.existing_count} 条记录。是否要替换现有数据？`,
                () => {
                    // 用户确认，强制覆盖
                    handleProductListUpload(true);
                }
            );
            return;
        }
        
        if (data.message) {
            showAlert(data.message, data.count ? 'success' : 'danger');
            
            if (data.count) {
                // 重置上传表单
                fileInput.value = '';
                handleFileSelect(null, 'productList');
                
                // 如果是普通用户，更新统计信息
                if (currentUser.role === 'user') {
                    loadUserStats();
                }
            }
        }
    })
    .catch(error => {
        hideSpinner();
        showAlert('产品总表上传失败：' + error.message, 'danger');
    });
}

// 种菜表格登记上传处理
function handlePlantingRecordsUpload(forceOverwrite = false) {
    console.log('种菜表格登记上传处理函数被调用');
    
    const fileInput = document.getElementById('plantingRecordsFileInput');
    
    if (fileInput.files.length === 0) {
        showAlert('请选择要上传的种菜表格登记文件', 'warning');
        return;
    }
    
    console.log('开始上传种菜表格登记文件:', fileInput.files[0].name);
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    if (forceOverwrite) {
        formData.append('force_overwrite', 'true');
    }
    
    showSpinner();
    
    fetch(`${API_BASE}/upload-planting-records`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        hideSpinner();
        
        // 处理重复文件确认
        if (data.requires_confirmation) {
            showConfirmDialog(
                '文件重复确认',
                `种菜表格登记文件已存在 ${data.existing_count} 条记录。是否要替换现有数据？`,
                () => {
                    // 用户确认，强制覆盖
                    handlePlantingRecordsUpload(true);
                }
            );
            return;
        }
        
        if (data.message) {
            showAlert(data.message, data.count ? 'success' : 'danger');
            
            if (data.count) {
                // 重置上传表单
                fileInput.value = '';
                handleFileSelect(null, 'plantingRecords');
                
                // 如果是普通用户，更新统计信息
                if (currentUser.role === 'user') {
                    loadUserStats();
                }
            }
        }
    })
    .catch(error => {
        hideSpinner();
        showAlert('种菜表格登记上传失败：' + error.message, 'danger');
    });
}

// 主体报表上传处理
function handleSubjectReportUpload(forceOverwrite = false) {
    console.log('主体报表上传处理函数被调用');
    
    const fileInput = document.getElementById('subjectReportFileInput');
    const dateInput = document.getElementById('subjectReportDate');
    
    if (fileInput.files.length === 0) {
        showAlert('请选择要上传的主体报表文件', 'warning');
        return;
    }
    
    if (!dateInput.value) {
        showAlert('请选择报表日期', 'warning');
        return;
    }
    
    console.log('开始上传主体报表文件:', fileInput.files[0].name, '日期:', dateInput.value);
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('upload_date', dateInput.value);
    if (forceOverwrite) {
        formData.append('force_overwrite', 'true');
    }
    
    showSpinner();
    
    fetch(`${API_BASE}/upload-subject-report`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        hideSpinner();
        
        // 处理重复文件确认
        if (data.requires_confirmation) {
            showConfirmDialog(
                '文件重复确认',
                `该日期已存在主体报表数据 ${data.existing_count} 条记录。是否要替换现有数据？`,
                () => {
                    // 用户确认，强制覆盖
                    handleSubjectReportUpload(true);
                }
            );
            return;
        }
        
        if (data.message) {
            showAlert(data.message, data.count ? 'success' : 'danger');
            
            if (data.count) {
                // 重置上传表单
                fileInput.value = '';
                dateInput.value = '';
                handleFileSelect(null, 'subjectReport');
                updateSubjectReportUploadBtn();
                
                // 如果是普通用户，更新统计信息
                if (currentUser.role === 'user') {
                    loadUserStats();
                }
            }
        }
    })
    .catch(error => {
        hideSpinner();
        showAlert('主体报表上传失败：' + error.message, 'danger');
    });
}

// 更新主体报表上传按钮状态
function updateSubjectReportUploadBtn() {
    const fileInput = document.getElementById('subjectReportFileInput');
    const dateInput = document.getElementById('subjectReportDate');
    const uploadBtn = document.getElementById('subjectReportUploadBtn');
    
    const hasFile = fileInput && fileInput.files.length > 0;
    const hasDate = dateInput && dateInput.value !== '';
    
    if (uploadBtn) {
        uploadBtn.disabled = !(hasFile && hasDate);
    }
}

// ======================== 数据汇总功能 ========================

// 设置数据汇总功能的事件监听器
function setupSummaryEventListeners() {
    console.log('正在设置数据汇总事件监听器...');
    
    const summaryDate = document.getElementById('summaryDate');
    const calculateBtn = document.getElementById('calculateSummaryBtn');
    
    console.log('数据汇总元素检查:', {
        summaryDate: !!summaryDate,
        calculateBtn: !!calculateBtn
    });
    
    if (summaryDate) {
        // 移除旧的事件监听器（如果存在）
        summaryDate.removeEventListener('change', updateCalculateButton);
        // 添加新的事件监听器
        summaryDate.addEventListener('change', updateCalculateButton);
        
        // 设置默认日期为今天（如果还没有值）
        if (!summaryDate.value) {
            const today = new Date().toISOString().split('T')[0];
            summaryDate.value = today;
            console.log('设置默认日期:', today);
        }
        updateCalculateButton();
        console.log('数据汇总日期选择器事件监听器已设置');
    } else {
        console.error('summaryDate 元素未找到！');
    }
    
    if (calculateBtn) {
        // 移除旧的事件监听器（如果存在）
        calculateBtn.removeEventListener('click', handleCalculateSummary);
        // 添加新的事件监听器
        calculateBtn.addEventListener('click', handleCalculateSummary);
        console.log('数据汇总计算按钮事件监听器已设置');
    } else {
        console.error('calculateSummaryBtn 元素未找到！');
    }
    
    console.log('数据汇总事件监听器设置完成');
}

// 更新计算按钮状态
function updateCalculateButton() {
    const summaryDate = document.getElementById('summaryDate');
    const calculateBtn = document.getElementById('calculateSummaryBtn');
    
    if (summaryDate && calculateBtn) {
        const hasDate = summaryDate.value !== '';
        calculateBtn.disabled = !hasDate;
        
        if (hasDate) {
            calculateBtn.innerHTML = `<i class="fas fa-play"></i> 计算 ${summaryDate.value} 的汇总数据`;
        } else {
            calculateBtn.innerHTML = `<i class="fas fa-play"></i> 开始计算汇总`;
        }
    }
}

// 处理汇总计算
function handleCalculateSummary() {
    console.log('handleCalculateSummary 函数被调用');
    
    const summaryDate = document.getElementById('summaryDate');
    const targetDate = summaryDate.value;
    
    console.log('选择的日期:', targetDate);
    
    if (!targetDate) {
        console.log('没有选择日期，显示警告');
        showAlert('请选择计算日期', 'warning');
        return;
    }
    
    // 移除权限检查，允许所有用户执行汇总计算
    // if (currentUser.role !== 'admin') {
    //     showAlert('权限不足，只有管理员可以执行汇总计算', 'danger');
    //     return;
    // }
    
    // 显示确认对话框
    showConfirmDialog(
        '确认计算汇总',
        `确定要计算 ${targetDate} 的推广费用汇总吗？<br><br>
        <small class="text-muted">
        系统将：<br>
        1. 查找该日期的商品数据和主体报表数据<br>
        2. 根据场景名称自动分配推广费用<br>
        3. 更新合并数据表中的推广费用字段<br><br>
        <strong>注意：此操作将覆盖现有的推广费用数据！</strong>
        </small>`,
        () => executeCalculateSummary(targetDate)
    );
}

// 执行汇总计算
function executeCalculateSummary(targetDate) {
    console.log(`开始计算 ${targetDate} 的汇总数据`);
    
    // 隐藏之前的结果
    document.getElementById('summaryResults').style.display = 'none';
    
    // 显示计算进度
    document.getElementById('calculationProgress').style.display = 'block';
    
    // 禁用计算按钮
    const calculateBtn = document.getElementById('calculateSummaryBtn');
    calculateBtn.disabled = true;
    calculateBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 正在计算...`;
    
    fetch(`${API_BASE}/calculate-promotion-summary`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ target_date: targetDate })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => Promise.reject(err));
        }
        return response.json();
    })
    .then(data => {
        console.log('汇总计算成功:', data);
        displaySummaryResults(data);
        showAlert(data.message, 'success');
    })
    .catch(error => {
        console.error('汇总计算失败:', error);
        showAlert(error.message || '汇总计算失败，请稍后重试', 'danger');
    })
    .finally(() => {
        // 隐藏进度，恢复按钮
        document.getElementById('calculationProgress').style.display = 'none';
        calculateBtn.disabled = false;
        updateCalculateButton();
    });
}

// 显示汇总计算结果
function displaySummaryResults(data) {
    const stats = data.stats || {};
    
    // 更新基本统计数字
    document.getElementById('processedCount').textContent = stats.processed_count || 0;
    document.getElementById('matchedCount').textContent = stats.matched_count || 0;
    document.getElementById('updatedCount').textContent = stats.updated_count || 0;
    document.getElementById('errorCount').textContent = (stats.errors || []).length;
    
    // 更新场景费用分布表格
    displaySceneDistribution(stats.scene_name_distribution || {});
    
    // 显示错误信息（如果有）
    displayErrorMessages(stats.errors || []);
    
    // 显示结果区域
    document.getElementById('summaryResults').style.display = 'block';
    
    // 平滑滚动到结果区域
    document.getElementById('summaryResults').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

// 显示场景费用分布
function displaySceneDistribution(distribution) {
    const tableBody = document.getElementById('sceneDistributionTable');
    tableBody.innerHTML = '';
    
    if (Object.keys(distribution).length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-muted">暂无场景费用数据</td>
            </tr>
        `;
        return;
    }
    
    // 按费用总额排序
    const sortedEntries = Object.entries(distribution).sort((a, b) => 
        (b[1].total_cost || 0) - (a[1].total_cost || 0)
    );
    
    sortedEntries.forEach(([sceneName, info]) => {
        const row = tableBody.insertRow();
        
        // 场景名称列（添加颜色标识）
        const sceneCell = row.insertCell();
        const badgeClass = getSceneBadgeClass(sceneName);
        sceneCell.innerHTML = `<span class="badge ${badgeClass}">${sceneName}</span>`;
        
        // 记录数量列
        const countCell = row.insertCell();
        countCell.textContent = info.count || 0;
        
        // 总费用列
        const costCell = row.insertCell();
        const cost = info.total_cost || 0;
        costCell.innerHTML = `<strong>¥${cost.toFixed(2)}</strong>`;
        costCell.className = 'text-end';
    });
    
    // 添加合计行
    const totalCost = sortedEntries.reduce((sum, [, info]) => sum + (info.total_cost || 0), 0);
    const totalCount = sortedEntries.reduce((sum, [, info]) => sum + (info.count || 0), 0);
    
    if (sortedEntries.length > 1) {
        const totalRow = tableBody.insertRow();
        totalRow.className = 'table-active';
        
        const totalSceneCell = totalRow.insertCell();
        totalSceneCell.innerHTML = '<strong>总计</strong>';
        
        const totalCountCell = totalRow.insertCell();
        totalCountCell.innerHTML = `<strong>${totalCount}</strong>`;
        
        const totalCostCell = totalRow.insertCell();
        totalCostCell.innerHTML = `<strong>¥${totalCost.toFixed(2)}</strong>`;
        totalCostCell.className = 'text-end';
    }
}

// 获取场景对应的徽章样式类
function getSceneBadgeClass(sceneName) {
    const sceneStyles = {
        '全站推广': 'bg-primary',
        '关键词推广': 'bg-success',
        '货品运营': 'bg-warning',
        '人群推广': 'bg-danger',
        '超级短视频': 'bg-info',
        '多目标直投': 'bg-secondary'
    };
    
    return sceneStyles[sceneName] || 'bg-dark';
}

// 显示错误信息
function displayErrorMessages(errors) {
    const errorMessages = document.getElementById('errorMessages');
    const errorList = document.getElementById('errorList');
    
    if (!errors || errors.length === 0) {
        errorMessages.style.display = 'none';
        return;
    }
    
    errorList.innerHTML = '';
    
    // 最多显示10个错误
    const displayErrors = errors.slice(0, 10);
    displayErrors.forEach(error => {
        const li = document.createElement('li');
        li.textContent = error;
        errorList.appendChild(li);
    });
    
    // 如果有更多错误，添加提示
    if (errors.length > 10) {
        const li = document.createElement('li');
        li.innerHTML = `<em>... 还有 ${errors.length - 10} 个错误未显示</em>`;
        li.className = 'text-muted';
        errorList.appendChild(li);
    }
    
    errorMessages.style.display = 'block';
}

// 导出全局函数
window.handleCalculateSummary = handleCalculateSummary;
window.setupSummaryEventListeners = setupSummaryEventListeners;
window.updateCalculateButton = updateCalculateButton;

// 设置种菜汇总功能事件监听器
function setupPlantingSummaryEventListeners() {
    const plantingSummaryDate = document.getElementById('plantingSummaryDate');
    const calculatePlantingSummaryBtn = document.getElementById('calculatePlantingSummaryBtn');
    
    if (plantingSummaryDate && calculatePlantingSummaryBtn) {
        // 设置默认日期为今天
        const today = new Date().toISOString().split('T')[0];
        plantingSummaryDate.value = today;
        
        // 监听日期变化
        plantingSummaryDate.addEventListener('change', updatePlantingCalculateButton);
        
        // 监听计算按钮点击
        calculatePlantingSummaryBtn.addEventListener('click', handleCalculatePlantingSummary);
        
        // 初始化按钮状态
        updatePlantingCalculateButton();
        
        console.log('种菜汇总事件监听器已设置');
    } else {
        console.error('种菜汇总元素未找到:', {
            plantingSummaryDate: !!plantingSummaryDate,
            calculatePlantingSummaryBtn: !!calculatePlantingSummaryBtn
        });
    }
}

// 更新种菜汇总计算按钮状态
function updatePlantingCalculateButton() {
    const plantingSummaryDate = document.getElementById('plantingSummaryDate');
    const calculatePlantingSummaryBtn = document.getElementById('calculatePlantingSummaryBtn');
    
    if (plantingSummaryDate && calculatePlantingSummaryBtn) {
        calculatePlantingSummaryBtn.disabled = !plantingSummaryDate.value;
    }
}

// 处理种菜汇总计算
function handleCalculatePlantingSummary() {
    const plantingSummaryDate = document.getElementById('plantingSummaryDate').value;
    if (!plantingSummaryDate) {
        showAlert('请选择要计算的日期', 'warning');
        return;
    }
    
    showConfirmDialog(
        '确认计算种菜汇总',
        `确定要计算 ${plantingSummaryDate} 的种菜数据汇总吗？`,
        () => executePlantingSummary(plantingSummaryDate)
    );
}

// 执行种菜汇总计算
function executePlantingSummary(targetDate) {
    showSpinner();
    
    fetch(`${API_BASE}/calculate-planting-summary`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date: targetDate })
    })
    .then(response => response.json())
    .then(data => {
        hideSpinner();
        
        if (data.error_type) {
            // 处理特定错误类型
            if (data.error_type === 'NO_PLANTING_DATA') {
                showAlert('未找到所选日期的种菜表格数据，请先上传种菜表格', 'warning');
            } else if (data.error_type === 'NO_MERGE_DATA') {
                showAlert('未找到所选日期的商品排行数据，请先上传商品排行日报', 'warning');
            } else {
                showAlert(data.message || '计算失败，请稍后重试', 'danger');
            }
        } else {
            // 显示成功消息
            showAlert(data.message, 'success');
            // 显示计算结果
            displayPlantingSummaryResults(data);
        }
    })
    .catch(error => {
        hideSpinner();
        showAlert('计算失败：' + error.message, 'danger');
    });
}

// 显示种菜汇总计算结果
function displayPlantingSummaryResults(data) {
    const resultsDiv = document.getElementById('plantingSummaryResults');
    if (!resultsDiv) return;
    
    resultsDiv.style.display = 'block';
    
    // 创建结果表格
    const resultHtml = `
        <div class="table-responsive mt-4">
            <table class="table table-bordered">
                <thead class="table-light">
                    <tr>
                        <th>更新记录数</th>
                        <th>计算时间</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${data.count} 条</td>
                        <td>${new Date().toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="alert alert-success mt-4">
            <h6><i class="fas fa-check-circle"></i> 计算完成！</h6>
            <p class="mb-0">系统已成功计算并更新了以下数据：</p>
            <ul class="mt-2 mb-0">
                <li>匹配到的种菜订单数量</li>
                <li>种菜订单总金额</li>
                <li>种菜佣金总额</li>
                <li>物流成本 (订单数 × 2.5)</li>
                <li>扣款金额 (总金额 × 0.08)</li>
            </ul>
        </div>
    `;
    
    resultsDiv.innerHTML = resultHtml;
    
    // 滚动到结果区域
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

// 设置最终汇总功能事件监听器
function setupFinalSummaryEventListeners() {
    const finalSummaryDate = document.getElementById('finalSummaryDate');
    const calculateFinalSummaryBtn = document.getElementById('calculateFinalSummaryBtn');
    
    if (finalSummaryDate && calculateFinalSummaryBtn) {
        // 设置默认日期为今天
        const today = new Date().toISOString().split('T')[0];
        finalSummaryDate.value = today;
        
        // 监听日期变化
        finalSummaryDate.addEventListener('change', updateFinalCalculateButton);
        
        // 监听计算按钮点击
        calculateFinalSummaryBtn.addEventListener('click', handleCalculateFinalSummary);
        
        // 初始化按钮状态
        updateFinalCalculateButton();
        
        console.log('最终汇总事件监听器已设置');
    } else {
        console.error('最终汇总元素未找到:', {
            finalSummaryDate: !!finalSummaryDate,
            calculateFinalSummaryBtn: !!calculateFinalSummaryBtn
        });
    }
}

// 更新最终汇总计算按钮状态
function updateFinalCalculateButton() {
    const finalSummaryDate = document.getElementById('finalSummaryDate');
    const calculateFinalSummaryBtn = document.getElementById('calculateFinalSummaryBtn');
    
    if (finalSummaryDate && calculateFinalSummaryBtn) {
        calculateFinalSummaryBtn.disabled = !finalSummaryDate.value;
    }
}

// 处理最终汇总计算
function handleCalculateFinalSummary() {
    const finalSummaryDate = document.getElementById('finalSummaryDate').value;
    if (!finalSummaryDate) {
        showAlert('请选择要计算的日期', 'warning');
        return;
    }
    
    showConfirmDialog(
        '确认计算最终汇总',
        `确定要计算 ${finalSummaryDate} 的最终数据汇总吗？`,
        () => executeFinalSummary(finalSummaryDate)
    );
}

// 执行最终汇总计算
function executeFinalSummary(targetDate) {
    showSpinner();
    
    fetch(`${API_BASE}/calculate-final-summary`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date: targetDate })
    })
    .then(response => response.json())
    .then(data => {
        hideSpinner();
        
        if (data.error_type) {
            if (data.error_type === 'NO_DATA') {
                showAlert('未找到所选日期的数据，请确保已上传商品排行数据', 'warning');
            } else {
                showAlert(data.message || '计算失败，请稍后重试', 'danger');
            }
        } else {
            showAlert(data.message, 'success');
            displayFinalSummaryResults(data);
        }
    })
    .catch(error => {
        hideSpinner();
        showAlert('计算失败：' + error.message, 'danger');
    });
}

// 显示最终汇总计算结果
function displayFinalSummaryResults(data) {
    const resultsDiv = document.getElementById('finalSummaryResults');
    if (!resultsDiv) return;
    
    resultsDiv.style.display = 'block';
    
    // 创建结果表格
    const resultHtml = `
        <div class="table-responsive mt-4">
            <table class="table table-bordered">
                <thead class="table-light">
                    <tr>
                        <th>更新记录数</th>
                        <th>计算时间</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${data.count} 条</td>
                        <td>${new Date().toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="alert alert-success mt-4">
            <h6><i class="fas fa-check-circle"></i> 计算完成！</h6>
            <p class="mb-0">系统已成功计算并更新了以下数据：</p>
            <ul class="mt-2 mb-0">
                <li>转化率指标（支付转化率、收藏率、加购率）</li>
                <li>价值指标（UV价值、真实转化率）</li>
                <li>真实数据（真实金额、真实买家数、真实件数）</li>
                <li>成本费用（产品成本、订单扣点、税票、物流成本）</li>
                <li>最终毛利</li>
            </ul>
        </div>
    `;
    
    resultsDiv.innerHTML = resultHtml;
    
    // 滚动到结果区域
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

// 定义所有可用的列
const tableColumns = [
    // 基础信息
    { key: 'upload_date', name: '日期', defaultVisible: true, width: '100px' },
    { key: 'tmall_product_code', name: '天猫ID', defaultVisible: true, width: '120px' },
    { key: 'product_name', name: '产品', defaultVisible: true, width: '200px' },
    { key: 'listing_time', name: '上架时间', defaultVisible: true, width: '100px' },
    
    // 订单和支付数据
    { key: 'payment_buyer_count', name: '前台订单笔数', defaultVisible: true, width: '120px' },
    { key: 'payment_product_count', name: '支付件数', defaultVisible: true, width: '100px' },
    { key: 'payment_amount', name: '前台成交金额', defaultVisible: true, width: '120px' },
    { key: 'refund_amount', name: '退款金额', defaultVisible: true, width: '100px' },
    
    // 流量和行为数据
    { key: 'visitor_count', name: '访客数', defaultVisible: true, width: '100px' },
    { key: 'search_guided_visitors', name: '自然搜索', defaultVisible: true, width: '100px' },
    { key: 'favorite_count', name: '收藏', defaultVisible: true, width: '80px' },
    { key: 'add_to_cart_count', name: '加购', defaultVisible: true, width: '80px' },
    
    // 转化率指标
    { key: 'conversion_rate', name: '支付转化率', defaultVisible: true, width: '100px' },
    { key: 'favorite_rate', name: '收藏率', defaultVisible: true, width: '100px' },
    { key: 'cart_rate', name: '加购率', defaultVisible: true, width: '100px' },
    { key: 'uv_value', name: 'UV价值', defaultVisible: true, width: '100px' },
    { key: 'real_conversion_rate', name: '真实转化率', defaultVisible: true, width: '100px' },
    
    // 真实数据
    { key: 'real_amount', name: '真实金额', defaultVisible: true, width: '100px' },
    { key: 'real_buyer_count', name: '真实买家数', defaultVisible: true, width: '100px' },
    { key: 'real_product_count', name: '真实件数', defaultVisible: true, width: '100px' },
    
    // 成本和费用
    { key: 'product_cost', name: '产品成本', defaultVisible: true, width: '100px' },
    { key: 'real_order_deduction', name: '真实订单扣点', defaultVisible: true, width: '120px' },
    { key: 'tax_invoice', name: '税票', defaultVisible: true, width: '100px' },
    { key: 'real_order_logistics_cost', name: '真实订单物流成本', defaultVisible: true, width: '140px' },
    
    // 种菜数据
    { key: 'planting_orders', name: '种菜笔数', defaultVisible: true, width: '100px' },
    { key: 'planting_amount', name: '种菜金额', defaultVisible: true, width: '100px' },
    { key: 'planting_cost', name: '种菜成本', defaultVisible: true, width: '100px' },
    { key: 'planting_deduction', name: '种菜扣点', defaultVisible: true, width: '100px' },
    { key: 'planting_logistics_cost', name: '种菜物流成本', defaultVisible: true, width: '120px' },
    
    // 推广费用
    { key: 'keyword_promotion', name: '关键词推广', defaultVisible: true, width: '100px' },
    { key: 'sitewide_promotion', name: '全站推广', defaultVisible: true, width: '100px' },
    { key: 'product_operation', name: '货品运营', defaultVisible: true, width: '100px' },
    { key: 'crowd_promotion', name: '人群推广', defaultVisible: true, width: '100px' },
    { key: 'super_short_video', name: '超级短视频', defaultVisible: true, width: '100px' },
    { key: 'multi_target_direct', name: '多目标直投', defaultVisible: true, width: '100px' },
    
    // 毛利
    { key: 'gross_profit', name: '毛利', defaultVisible: true, width: '100px' }
];

// 当前显示的列设置
let visibleColumns = tableColumns.filter(col => col.defaultVisible).map(col => col.key);

// 渲染数据表格
function renderDataTable(data) {
    renderTableHeader();
    renderTableBody(data);
}

function renderTableHeader() {
    const tableHeader = document.getElementById('tableHeader');
    tableHeader.innerHTML = '';
    
    tableColumns.forEach((column, index) => {
        if (visibleColumns.includes(column.key)) {
            const th = document.createElement('th');
            th.textContent = column.name;
            th.style.width = column.width;
            th.style.minWidth = '80px';
            th.className = 'resizable-column';
            th.setAttribute('data-column', column.key);
            
            // 添加拖拽事件监听器
            th.addEventListener('mousedown', handleColumnResize);
            
            tableHeader.appendChild(th);
        }
    });
}

function renderTableBody(data) {
    const tableBody = document.getElementById('dataTableBody');
    tableBody.innerHTML = '';
    
    data.forEach(item => {
        const row = tableBody.insertRow();
        
        tableColumns.forEach(column => {
            if (visibleColumns.includes(column.key)) {
                const cell = row.insertCell();
                let value = item[column.key] || '-';
                
                // 数值格式化
                if (value !== '-') {
                    // 金额字段
                    if ([
                        'payment_amount', 'refund_amount', 'real_amount', 'product_cost',
                        'real_order_deduction', 'tax_invoice', 'real_order_logistics_cost',
                        'planting_amount', 'planting_cost', 'planting_deduction', 'planting_logistics_cost',
                        'keyword_promotion', 'sitewide_promotion', 'product_operation',
                        'crowd_promotion', 'super_short_video', 'multi_target_direct',
                        'gross_profit', 'uv_value'
                    ].includes(column.key)) {
                        value = `¥${parseFloat(value).toFixed(2)}`;
                    }
                    // 百分比字段
                    else if ([
                        'conversion_rate', 'favorite_rate', 'cart_rate',
                        'real_conversion_rate'
                    ].includes(column.key)) {
                        value = `${parseFloat(value).toFixed(2)}%`;
                    }
                    // 整数字段
                    else if ([
                        'visitor_count', 'search_guided_visitors', 'favorite_count',
                        'add_to_cart_count', 'payment_buyer_count', 'payment_product_count',
                        'real_buyer_count', 'real_product_count', 'planting_orders'
                    ].includes(column.key)) {
                        value = parseInt(value).toLocaleString();
                    }
                    // 日期字段
                    else if (['upload_date', 'listing_time'].includes(column.key)) {
                        value = new Date(value).toLocaleDateString('zh-CN');
                    }
                }
                
                cell.textContent = value;
                
                // 设置单元格宽度与表头同步
                cell.style.width = column.width;
                cell.style.maxWidth = column.width;
                cell.style.overflow = 'hidden';
                cell.style.textOverflow = 'ellipsis';
                cell.style.whiteSpace = 'nowrap';
                cell.title = item[column.key] || '-'; // 添加tooltip显示完整内容
            }
        });
    });
}

// 渲染分页
function renderPagination(currentPage, totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    // 上一页
    if (currentPage > 1) {
        pagination.innerHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="loadDataList(${currentPage - 1})">上一页</a>
            </li>
        `;
    }
    
    // 页码
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            pagination.innerHTML += `
                <li class="page-item active">
                    <a class="page-link" href="#">${i}</a>
                </li>
            `;
        } else {
            pagination.innerHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="loadDataList(${i})">${i}</a>
                </li>
            `;
        }
    }
    
    // 下一页
    if (currentPage < totalPages) {
        pagination.innerHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="loadDataList(${currentPage + 1})">下一页</a>
            </li>
        `;
    }
}