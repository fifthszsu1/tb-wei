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
    
    // 设置基础上传事件监听器
    UploadModule.setupBaseUploadEventListeners();
    

    
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







// 设置主应用事件监听器（在用户登录后调用）
window.setupMainAppEventListeners = function() {
    // 同步认证状态
    updateLocalAuthReferences();
    
    // 设置新的上传功能事件监听器
    UploadModule.setupNewUploadEventListeners();
    
    // 设置数据汇总功能事件监听器
    setupSummaryEventListeners();
    
    // 设置种菜汇总功能事件监听器
    setupPlantingSummaryEventListeners();
    
    // 设置最终汇总功能事件监听器
    setupFinalSummaryEventListeners();
}

// 暴露loadUserStats函数给AuthModule使用
window.loadUserStats = loadUserStats;

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







// 加载仪表板数据
function loadDashboard() {
    if (!AuthModule.isAdmin()) return;
    
    APIService.getStats()
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
    if (!AuthModule.isAdmin()) return;
    
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
    
    const filters = {
        uploadDate,
        tmallProductCode,
        productName
    };
    
    console.log('请求参数:', { page, filters }); // 调试日志
    
    APIService.getDataList(page, filters)
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
    if (!AuthModule.checkAdminPermission()) {
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
        
        // 构建过滤条件参数
        const filters = {
            uploadDate,
            tmallProductCode,
            productName
        };
        
        console.log('导出参数:', filters);
        
        // 使用API服务导出数据
        APIService.exportData(filters)
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
    const columnIndex = AppConfig.TABLE_COLUMNS.findIndex(col => col.key === columnKey);
    if (columnIndex !== -1) {
        AppConfig.TABLE_COLUMNS[columnIndex].width = newWidth + 'px';
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
    AppConfig.TABLE_COLUMNS.forEach(column => {
        widths[column.key] = column.width;
    });
    localStorage.setItem(AppConfig.STORAGE_KEYS.COLUMN_WIDTHS, JSON.stringify(widths));
}

function loadColumnWidths() {
    const savedWidths = localStorage.getItem(AppConfig.STORAGE_KEYS.COLUMN_WIDTHS);
    if (savedWidths) {
        try {
            const widths = JSON.parse(savedWidths);
            AppConfig.TABLE_COLUMNS.forEach(column => {
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
    if (!AuthModule.isUser()) return;
    
    APIService.getUserStats()
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



// 列选择器功能
function showColumnSelector() {
    const selector = document.getElementById('columnSelector');
    const checkboxContainer = document.getElementById('columnCheckboxes');
    
    checkboxContainer.innerHTML = '';
    
    AppConfig.TABLE_COLUMNS.forEach(column => {
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
    
    AppConfig.TABLE_COLUMNS.forEach(column => {
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
    localStorage.setItem(AppConfig.STORAGE_KEYS.VISIBLE_COLUMNS, JSON.stringify(visibleColumns));
    
    showAlert('列设置已应用', 'success');
}

function selectAllColumns() {
    AppConfig.TABLE_COLUMNS.forEach(column => {
        const checkbox = document.getElementById(`col-${column.key}`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
}

function resetColumns() {
    AppConfig.TABLE_COLUMNS.forEach(column => {
        const checkbox = document.getElementById(`col-${column.key}`);
        if (checkbox) {
            checkbox.checked = column.defaultVisible;
        }
    });
}

// 页面加载时恢复列设置
function loadColumnSettings() {
    const saved = localStorage.getItem(AppConfig.STORAGE_KEYS.VISIBLE_COLUMNS);
    if (saved) {
        try {
            const savedColumns = JSON.parse(saved);
            // 验证保存的列是否有效
            const validColumns = savedColumns.filter(col => 
                AppConfig.TABLE_COLUMNS.some(tableCol => tableCol.key === col)
            );
            if (validColumns.length > 0) {
                visibleColumns = validColumns;
            }
        } catch (e) {
            console.log('恢复列设置失败，使用默认设置');
        }
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
    
    // 检查管理员权限
    if (!AuthModule.checkAdminPermission()) {
        return;
    }
    
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
    
    APIService.calculatePromotionSummary(targetDate)
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
    
    APIService.calculatePlantingSummary(targetDate)
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
    
    APIService.calculateFinalSummary(targetDate)
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

// 当前显示的列设置
let visibleColumns = AppConfig.TABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.key);

// 渲染数据表格
function renderDataTable(data) {
    renderTableHeader();
    renderTableBody(data);
}

function renderTableHeader() {
    const tableHeader = document.getElementById('tableHeader');
    tableHeader.innerHTML = '';
    
    AppConfig.TABLE_COLUMNS.forEach((column, index) => {
        if (visibleColumns.includes(column.key)) {
            const th = document.createElement('th');
            th.textContent = column.name;
            th.style.width = column.width;
            th.style.minWidth = AppConfig.TABLE_CONFIG.MIN_COLUMN_WIDTH + 'px';
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
        
        AppConfig.TABLE_COLUMNS.forEach(column => {
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