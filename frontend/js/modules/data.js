/**
 * 数据管理模块
 * 负责数据列表的加载、搜索、导出、表格渲染、列管理等功能
 */

// 数据管理模块对象
const DataModule = {
    // ======================== 模块状态变量 ========================
    
    // 当前显示的列设置
    visibleColumns: AppConfig.TABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.key),
    
    // 当前页大小
    currentPageSize: 20,
    
    // 当前排序状态
    currentSortBy: 'upload_date',
    currentSortOrder: 'desc',
    
    // 列宽调整相关变量
    isResizing: false,
    currentColumn: null,
    startX: 0,
    startWidth: 0,

    // ======================== 数据管理核心功能 ========================

    // 加载数据列表
    loadDataList(page = 1) {
        // 移除权限检查，允许所有用户加载数据
        // if (!AuthModule.isAdmin()) return;
        
        const uploadDateElement = document.getElementById('uploadDateFilter');
        const tmallProductCodeElement = document.getElementById('tmallProductCodeFilter');
        const productNameElement = document.getElementById('productNameFilter');
        const tmallSupplierNameElement = document.getElementById('tmallSupplierNameFilter');
        
        const uploadDate = uploadDateElement ? uploadDateElement.value : '';
        const tmallProductCode = tmallProductCodeElement ? tmallProductCodeElement.value : '';
        const productName = productNameElement ? productNameElement.value : '';
        const tmallSupplierName = tmallSupplierNameElement ? tmallSupplierNameElement.value : '';
        
        console.log('loadDataList被调用，参数:', { // 调试日志
            page: page,
            uploadDate: uploadDate,
            tmallProductCode: tmallProductCode,
            productName: productName,
            tmallSupplierName: tmallSupplierName
        });
        
        const filters = {
            uploadDate,
            tmallProductCode,
            productName,
            tmallSupplierName
        };
        
        console.log('请求参数:', { page, filters, pageSize: this.currentPageSize, sortBy: this.currentSortBy, sortOrder: this.currentSortOrder }); // 调试日志
        
        APIService.getDataList(page, filters, this.currentPageSize, this.currentSortBy, this.currentSortOrder)
        .then(data => {
            console.log('接收到数据:', data.total, '条记录'); // 调试日志
            this.renderDataTable(data.data);
            this.renderPagination(data.current_page, data.pages);
            this.updateDataInfo(data.current_page, data.per_page, data.total);
        })
        .catch(error => {
            console.error('加载数据失败:', error); // 调试日志
            showAlert('加载数据失败：' + error.message, 'danger');
        });
    },

    // 搜索数据
    searchData() {
        this.loadDataList(1);
    },

    // 清空过滤器
    clearFilters() {
        console.log('clearFilters函数被调用'); // 调试日志
        
        try {
            const uploadDateFilter = document.getElementById('uploadDateFilter');
            const tmallProductCodeFilter = document.getElementById('tmallProductCodeFilter');
            const productNameFilter = document.getElementById('productNameFilter');
            const tmallSupplierNameFilter = document.getElementById('tmallSupplierNameFilter');
            
            if (uploadDateFilter) uploadDateFilter.value = '';
            if (tmallProductCodeFilter) tmallProductCodeFilter.value = '';
            if (productNameFilter) productNameFilter.value = '';
            if (tmallSupplierNameFilter) tmallSupplierNameFilter.value = '';
            
            console.log('过滤器已清空，重新加载数据');
            
            // 重新加载数据
            this.loadDataList();
        } catch (error) {
            console.error('清空过滤器时出错:', error);
            showAlert('清空过滤器失败', 'danger');
        }
    },

    // 更新数据信息显示
    updateDataInfo(currentPage, perPage, total) {
        const dataInfo = document.getElementById('dataInfo');
        if (dataInfo) {
            const start = (currentPage - 1) * perPage + 1;
            const end = Math.min(currentPage * perPage, total);
            dataInfo.textContent = `显示 ${start}-${end} 条，共 ${total} 条`;
        }
    },

    // 处理页大小改变
    onPageSizeChange() {
        const pageSizeSelector = document.getElementById('pageSizeSelector');
        if (pageSizeSelector) {
            this.currentPageSize = parseInt(pageSizeSelector.value);
            console.log('页大小改变为:', this.currentPageSize);
            // 重新加载第一页数据
            this.loadDataList(1);
        }
    },

    // 处理列排序点击
    handleColumnSort(columnKey) {
        console.log('点击排序列:', columnKey);
        
        // 如果点击的是当前排序列，切换排序方向
        if (this.currentSortBy === columnKey) {
            this.currentSortOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            // 如果点击的是不同的列，设置为新的排序列，默认倒序
            this.currentSortBy = columnKey;
            this.currentSortOrder = 'desc';
        }
        
        console.log('排序更新为:', { sortBy: this.currentSortBy, sortOrder: this.currentSortOrder });
        
        // 重新加载第一页数据
        this.loadDataList(1);
    },

    // 导出数据到Excel
    exportDataToExcel() {
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
            const tmallSupplierNameElement = document.getElementById('tmallSupplierNameFilter');
            
            const uploadDate = uploadDateElement ? uploadDateElement.value : '';
            const tmallProductCode = tmallProductCodeElement ? tmallProductCodeElement.value : '';
            const productName = productNameElement ? productNameElement.value : '';
            const tmallSupplierName = tmallSupplierNameElement ? tmallSupplierNameElement.value : '';
            
            // 构建过滤条件参数（包含排序）
            const filters = {
                uploadDate,
                tmallProductCode,
                productName,
                tmallSupplierName,
                sortBy: this.currentSortBy,
                sortOrder: this.currentSortOrder
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
    },

    // 加载用户上传统计
    loadUserStats() {
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
    },

    // 格式化参与活动显示
    formatParticipatingActivities(activitiesString) {
        if (!activitiesString || activitiesString === '-') {
            return '-';
        }
        
        // 将活动字符串按逗号分割，去除空格
        const activities = activitiesString.split(',').map(activity => activity.trim()).filter(activity => activity);
        
        if (activities.length === 0) {
            return '-';
        }
        
        // 为每个活动添加样式
        const formattedActivities = activities.map(activity => {
            let formattedActivity = activity;
            
            // 检查活动状态并添加相应的颜色样式
            if (activity.includes('预热中')) {
                // 浅蓝色显示预热中状态 - 使用正则表达式确保只替换最后一个"预热中"
                formattedActivity = activity.replace(/预热中$/, '<span class="activity-status activity-warmup">预热中</span>');
            } else if (activity.includes('活动中')) {
                // 深绿色显示活动中状态 - 使用正则表达式确保只替换最后一个"活动中"
                formattedActivity = activity.replace(/活动中$/, '<span class="activity-status activity-active">活动中</span>');
            }
            
            return `<div class="activity-item">${formattedActivity}</div>`;
        });
        
        // 用换行符连接多个活动
        return formattedActivities.join('');
    },

    // ======================== 表格渲染功能 ========================

    // 渲染数据表格
    renderDataTable(data) {
        this.renderTableHeader();
        this.renderTableBody(data);
    },

    // 渲染表格头
    renderTableHeader() {
        const tableHeader = document.getElementById('tableHeader');
        tableHeader.innerHTML = '';
        
        AppConfig.TABLE_COLUMNS.forEach((column, index) => {
            if (this.visibleColumns.includes(column.key)) {
                const th = document.createElement('th');
                th.style.width = column.width;
                th.style.minWidth = AppConfig.TABLE_CONFIG.MIN_COLUMN_WIDTH + 'px';
                th.className = 'resizable-column sortable-column';
                th.setAttribute('data-column', column.key);
                th.style.cursor = 'pointer';
                th.style.userSelect = 'none';
                th.style.position = 'relative';
                
                // 创建列标题容器
                const titleContainer = document.createElement('div');
                titleContainer.style.display = 'flex';
                titleContainer.style.alignItems = 'center';
                titleContainer.style.justifyContent = 'space-between';
                
                // 列标题文本
                const titleText = document.createElement('span');
                titleText.textContent = column.name;
                titleContainer.appendChild(titleText);
                
                // 排序指示器
                const sortIndicator = document.createElement('span');
                sortIndicator.style.marginLeft = '5px';
                sortIndicator.style.fontSize = '12px';
                sortIndicator.style.opacity = '0.6';
                
                if (this.currentSortBy === column.key) {
                    sortIndicator.innerHTML = this.currentSortOrder === 'asc' ? '▲' : '▼';
                    sortIndicator.style.opacity = '1';
                    th.style.backgroundColor = '#d4edda'; // 浅绿色背景，便于识别当前排序列
                } else {
                    sortIndicator.innerHTML = '⇅';
                }
                
                titleContainer.appendChild(sortIndicator);
                th.appendChild(titleContainer);
                
                // 添加点击排序事件监听器
                th.addEventListener('click', (e) => {
                    // 防止拖拽时触发排序
                    if (!this.isResizing) {
                        this.handleColumnSort(column.key);
                    }
                });
                
                // 添加拖拽事件监听器（保持原有的列宽调整功能）
                th.addEventListener('mousedown', (e) => this.handleColumnResize(e));
                
                tableHeader.appendChild(th);
            }
        });
    },

    // 渲染表格体
    renderTableBody(data) {
        const tableBody = document.getElementById('dataTableBody');
        tableBody.innerHTML = '';
        
        data.forEach(item => {
            const row = tableBody.insertRow();
            
            AppConfig.TABLE_COLUMNS.forEach(column => {
                if (this.visibleColumns.includes(column.key)) {
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
                    
                    // 特殊处理天猫ID字段，添加点击事件
                    if (column.key === 'tmall_product_code' && value !== '-') {
                        const link = document.createElement('a');
                        link.href = '#';
                        link.textContent = value;
                        link.style.color = '#007bff';
                        link.style.textDecoration = 'none';
                        link.style.cursor = 'pointer';
                        link.title = '点击查看趋势图';
                        
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            showProductTrend(value);
                        });
                        
                        // 鼠标悬停效果
                        link.addEventListener('mouseenter', function() {
                            this.style.textDecoration = 'underline';
                        });
                        
                        link.addEventListener('mouseleave', function() {
                            this.style.textDecoration = 'none';
                        });
                        
                        cell.appendChild(link);
                    } 
                    // 特殊处理参与活动字段，支持换行和状态颜色
                    else if (column.key === 'participating_activities' && value !== '-') {
                        cell.innerHTML = this.formatParticipatingActivities(value);
                        cell.style.whiteSpace = 'normal'; // 允许换行
                        cell.style.lineHeight = '1.4'; // 设置行高
                        // 为参与活动列设置特殊的宽度和样式
                        cell.style.minWidth = '180px';
                        cell.style.verticalAlign = 'top';
                        cell.title = item[column.key] || '-'; // 添加tooltip显示完整内容
                        return; // 提前返回，跳过通用样式设置
                    } else {
                        cell.textContent = value;
                    }
                    
                    // 设置单元格宽度与表头同步（参与活动列已特殊处理）
                    cell.style.width = column.width;
                    cell.style.maxWidth = column.width;
                    cell.style.overflow = 'hidden';
                    cell.style.textOverflow = 'ellipsis';
                    cell.style.whiteSpace = 'nowrap';
                    cell.title = item[column.key] || '-'; // 添加tooltip显示完整内容
                }
            });
        });
    },

    // 渲染分页
    renderPagination(currentPage, totalPages) {
        const pagination = document.getElementById('pagination');
        pagination.innerHTML = '';
        
        if (totalPages <= 1) {
            return; // 只有一页或没有数据时不显示分页
        }
        
        // 页码信息
        pagination.innerHTML += `
            <li class="page-item disabled d-none d-md-inline-block">
                <span class="page-link">第 ${currentPage} 页，共 ${totalPages} 页</span>
            </li>
        `;
        
        // 上一页
        if (currentPage > 1) {
            pagination.innerHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="DataModule.loadDataList(${currentPage - 1})">
                        <i class="fas fa-chevron-left"></i> 上一页
                    </a>
                </li>
            `;
        }
        
        // 智能分页逻辑
        const pageNumbers = this.calculatePageNumbers(currentPage, totalPages);
        
        pageNumbers.forEach(page => {
            if (page === '...') {
                // 省略号
                pagination.innerHTML += `
                    <li class="page-item disabled">
                        <span class="page-link">...</span>
                    </li>
                `;
            } else {
                // 页码
                const isActive = page === currentPage;
                pagination.innerHTML += `
                    <li class="page-item ${isActive ? 'active' : ''}">
                        <a class="page-link" href="#" ${isActive ? '' : `onclick="DataModule.loadDataList(${page})"`}>
                            ${page}
                        </a>
                    </li>
                `;
            }
        });
        
        // 下一页
        if (currentPage < totalPages) {
            pagination.innerHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="DataModule.loadDataList(${currentPage + 1})">
                        下一页 <i class="fas fa-chevron-right"></i>
                    </a>
                </li>
            `;
        }
        
        // 快速跳转（在大屏幕上显示）
        if (totalPages > 7) {
            pagination.innerHTML += `
                <li class="page-item d-none d-lg-inline-block">
                    <div class="page-link p-0" style="padding: 0!important;">
                        <div class="input-group input-group-sm" style="width: 120px;">
                            <input type="number" class="form-control form-control-sm" 
                                   placeholder="页码" min="1" max="${totalPages}" 
                                   id="quickJumpInput" style="font-size: 12px; height: 31px;">
                            <button class="btn btn-outline-primary btn-sm" type="button" 
                                    onclick="DataModule.quickJumpToPage()" style="font-size: 12px;">
                                <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                </li>
            `;
        }
    },

    // 快速跳转到指定页面
    quickJumpToPage() {
        const input = document.getElementById('quickJumpInput');
        if (!input) return;
        
        const pageNumber = parseInt(input.value);
        const totalPages = parseInt(input.getAttribute('max'));
        
        if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > totalPages) {
            showAlert(`请输入1到${totalPages}之间的页码`, 'warning');
            input.focus();
            return;
        }
        
        // 清空输入框
        input.value = '';
        
        // 跳转到指定页面
        this.loadDataList(pageNumber);
    },

    // 计算要显示的页码数组
    calculatePageNumbers(currentPage, totalPages) {
        const pages = [];
        const maxVisiblePages = 7; // 最多显示7个页码按钮
        
        if (totalPages <= maxVisiblePages) {
            // 页数较少时，显示所有页码
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // 页数较多时，使用智能分页
            // 始终显示第1页
            pages.push(1);
            
            let startPage, endPage;
            
            if (currentPage <= 4) {
                // 当前页靠近开头
                startPage = 2;
                endPage = 5;
                
                pages.push(...Array.from({length: endPage - startPage + 1}, (_, i) => startPage + i));
                
                if (endPage < totalPages - 1) {
                    pages.push('...');
                }
                if (totalPages > 1) {
                    pages.push(totalPages);
                }
            } else if (currentPage >= totalPages - 3) {
                // 当前页靠近结尾
                if (totalPages > 5) {
                    pages.push('...');
                }
                
                startPage = Math.max(2, totalPages - 4);
                endPage = totalPages - 1;
                
                pages.push(...Array.from({length: endPage - startPage + 1}, (_, i) => startPage + i));
                pages.push(totalPages);
            } else {
                // 当前页在中间
                pages.push('...');
                
                startPage = currentPage - 1;
                endPage = currentPage + 1;
                
                pages.push(...Array.from({length: endPage - startPage + 1}, (_, i) => startPage + i));
                
                if (currentPage < totalPages - 2) {
                    pages.push('...');
                }
                pages.push(totalPages);
            }
        }
        
        return pages;
    },

    // ======================== 列宽调整功能 ========================

    // 处理列宽调整
    handleColumnResize(e) {
        // 只有在右边缘附近点击才触发调整
        const rect = e.target.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const columnWidth = rect.width;
        
        // 检查是否在右边缘6px范围内
        if (offsetX < columnWidth - 6) {
            return;
        }
        
        e.preventDefault();
        
        this.isResizing = true;
        this.currentColumn = e.target;
        this.startX = e.clientX;
        this.startWidth = this.currentColumn.offsetWidth;
        
        this.currentColumn.classList.add('resizing');
        
        // 添加全局事件监听器
        document.addEventListener('mousemove', (e) => this.onColumnResize(e));
        document.addEventListener('mouseup', () => this.stopColumnResize());
        
        // 禁用文本选择
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
    },

    // 列宽调整中
    onColumnResize(e) {
        if (!this.isResizing || !this.currentColumn) return;
        
        const deltaX = e.clientX - this.startX;
        const newWidth = Math.max(80, this.startWidth + deltaX);
        
        this.currentColumn.style.width = newWidth + 'px';
        
        // 更新对应列的宽度配置
        const columnKey = this.currentColumn.getAttribute('data-column');
        const columnIndex = AppConfig.TABLE_COLUMNS.findIndex(col => col.key === columnKey);
        if (columnIndex !== -1) {
            AppConfig.TABLE_COLUMNS[columnIndex].width = newWidth + 'px';
        }
        
        // 更新表格主体中对应列的宽度
        this.updateTableBodyColumnWidth(columnKey, newWidth);
    },

    // 停止列宽调整
    stopColumnResize() {
        if (!this.isResizing) return;
        
        this.isResizing = false;
        
        if (this.currentColumn) {
            this.currentColumn.classList.remove('resizing');
            this.currentColumn = null;
        }
        
        // 移除全局事件监听器
        document.removeEventListener('mousemove', (e) => this.onColumnResize(e));
        document.removeEventListener('mouseup', () => this.stopColumnResize());
        
        // 恢复文本选择
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        
        // 保存列宽设置
        this.saveColumnWidths();
    },

    // 更新表格体列宽
    updateTableBodyColumnWidth(columnKey, width) {
        const tableBody = document.getElementById('dataTableBody');
        const columnIndex = this.visibleColumns.indexOf(columnKey);
        
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
    },

    // 保存列宽设置
    saveColumnWidths() {
        const widths = {};
        AppConfig.TABLE_COLUMNS.forEach(column => {
            widths[column.key] = column.width;
        });
        localStorage.setItem(AppConfig.STORAGE_KEYS.COLUMN_WIDTHS, JSON.stringify(widths));
    },

    // 加载列宽设置
    loadColumnWidths() {
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
    },

    // ======================== 列选择器功能 ========================

    // 显示列选择器
    showColumnSelector() {
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
            checkbox.checked = this.visibleColumns.includes(column.key);
            
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
    },

    // 隐藏列选择器
    hideColumnSelector() {
        document.getElementById('columnSelector').style.display = 'none';
    },

    // 应用列设置
    applyColumnSettings() {
        this.visibleColumns = [];
        
        AppConfig.TABLE_COLUMNS.forEach(column => {
            const checkbox = document.getElementById(`col-${column.key}`);
            if (checkbox && checkbox.checked) {
                this.visibleColumns.push(column.key);
            }
        });
        
        // 至少显示一列
        if (this.visibleColumns.length === 0) {
            this.visibleColumns = ['product_code'];
            showAlert('至少需要选择一列进行显示', 'warning');
        }
        
        // 重新渲染表格
        this.loadDataList();
        this.hideColumnSelector();
        
        // 保存设置到localStorage
        localStorage.setItem(AppConfig.STORAGE_KEYS.VISIBLE_COLUMNS, JSON.stringify(this.visibleColumns));
        
        showAlert('列设置已应用', 'success');
    },

    // 选择所有列
    selectAllColumns() {
        AppConfig.TABLE_COLUMNS.forEach(column => {
            const checkbox = document.getElementById(`col-${column.key}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    },

    // 重置列
    resetColumns() {
        AppConfig.TABLE_COLUMNS.forEach(column => {
            const checkbox = document.getElementById(`col-${column.key}`);
            if (checkbox) {
                checkbox.checked = column.defaultVisible;
            }
        });
    },

    // 加载列设置
    loadColumnSettings() {
        const saved = localStorage.getItem(AppConfig.STORAGE_KEYS.VISIBLE_COLUMNS);
        if (saved) {
            try {
                const savedColumns = JSON.parse(saved);
                // 验证保存的列是否有效
                const validColumns = savedColumns.filter(col => 
                    AppConfig.TABLE_COLUMNS.some(tableCol => tableCol.key === col)
                );
                if (validColumns.length > 0) {
                    this.visibleColumns = validColumns;
                }
            } catch (e) {
                console.log('恢复列设置失败，使用默认设置');
            }
        }
    }
};

// 将DataModule暴露给全局使用
window.DataModule = DataModule;

// 暴露兼容性函数给外部调用（保持现有代码兼容）
window.loadDataList = (page) => DataModule.loadDataList(page);
window.searchData = () => DataModule.searchData();
window.clearFilters = () => DataModule.clearFilters();
window.exportDataToExcel = () => DataModule.exportDataToExcel();
window.loadUserStats = () => DataModule.loadUserStats();
window.renderDataTable = (data) => DataModule.renderDataTable(data);
window.renderPagination = (currentPage, totalPages) => DataModule.renderPagination(currentPage, totalPages);
window.quickJumpToPage = () => DataModule.quickJumpToPage();
window.showColumnSelector = () => DataModule.showColumnSelector();
window.hideColumnSelector = () => DataModule.hideColumnSelector();
window.applyColumnSettings = () => DataModule.applyColumnSettings();
window.selectAllColumns = () => DataModule.selectAllColumns();
window.resetColumns = () => DataModule.resetColumns();
window.loadColumnSettings = () => DataModule.loadColumnSettings();
window.loadColumnWidths = () => DataModule.loadColumnWidths();
window.onPageSizeChange = () => DataModule.onPageSizeChange();
window.handleColumnSort = (columnKey) => DataModule.handleColumnSort(columnKey); 