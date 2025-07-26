/**
 * 订单数据管理模块
 * 负责订单数据列表的加载、搜索、导出、店铺名称点击弹窗、列管理等功能
 */

const OrderDataModule = {
    // ======================== 模块状态变量 ========================
    
    // 当前显示的列设置
    visibleColumns: AppConfig.ORDER_TABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.key),
    
    // 当前页大小
    currentPageSize: 20,
    
    // 当前排序状态
    currentSortBy: 'order_time',
    currentSortOrder: 'desc',
    
    // 列宽调整相关变量
    isResizing: false,
    currentColumn: null,
    startX: 0,
    startWidth: 0,

    // ======================== 数据管理核心功能 ========================

    // 加载订单数据列表
    loadOrderDataList(page = 1) {
        if (!AuthModule.isAdmin()) return;
        
        const startDateElement = document.getElementById('orderStartDateFilter');
        const endDateElement = document.getElementById('orderEndDateFilter');
        const storeNameElement = document.getElementById('orderStoreNameFilter');
        
        const startDate = startDateElement ? startDateElement.value : '';
        const endDate = endDateElement ? endDateElement.value : '';
        const storeName = storeNameElement ? storeNameElement.value : '';
        
        console.log('loadOrderDataList被调用，参数:', { // 调试日志
            page: page,
            startDate: startDate,
            endDate: endDate,
            storeName: storeName
        });
        
        const filters = {
            start_date: startDate,
            end_date: endDate,
            store_name: storeName
        };
        
        // 显示加载状态
        const loadingIndicator = document.getElementById('orderLoadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
        
        // 隐藏表格
        const table = document.getElementById('orderDataTable');
        if (table) {
            table.style.opacity = '0.5';
        }
        
        APIService.getOrderDetailsList(page, filters, this.currentPageSize, this.currentSortBy, this.currentSortOrder)
        .then(data => {
            console.log('接收到订单数据:', data.total, '条记录'); // 调试日志
            this.renderOrderDataTable(data.data);
            this.renderOrderPagination(data.current_page, data.pages, data.total);
            this.updateOrderDataInfo(data.current_page, data.per_page, data.total);
        })
        .catch(error => {
            console.error('加载订单数据失败:', error); // 调试日志
            showAlert('加载订单数据失败：' + error.message, 'danger');
        })
        .finally(() => {
            // 隐藏加载状态
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            // 恢复表格
            if (table) {
                table.style.opacity = '1';
            }
        });
    },

    // 搜索订单数据
    searchOrderData() {
        this.loadOrderDataList(1);
    },

    // 清空过滤器
    clearOrderFilters() {
        console.log('clearOrderFilters函数被调用'); // 调试日志
        
        try {
            const startDateFilter = document.getElementById('orderStartDateFilter');
            const endDateFilter = document.getElementById('orderEndDateFilter');
            const storeNameFilter = document.getElementById('orderStoreNameFilter');
            
            if (startDateFilter) startDateFilter.value = '';
            if (endDateFilter) endDateFilter.value = '';
            if (storeNameFilter) storeNameFilter.value = '';
            
            console.log('过滤器已清空，重新加载数据');
            
            // 重新加载数据
            this.loadOrderDataList();
        } catch (error) {
            console.error('清空过滤器时出错:', error);
            showAlert('清空过滤器失败', 'danger');
        }
    },

    // 更新数据信息显示
    updateOrderDataInfo(currentPage, perPage, total) {
        const dataInfo = document.getElementById('orderDataInfo');
        if (dataInfo) {
            const start = (currentPage - 1) * perPage + 1;
            const end = Math.min(currentPage * perPage, total);
            dataInfo.textContent = `显示 ${start}-${end} 条，共 ${total} 条`;
        }
    },

    // 处理页大小改变
    onOrderPageSizeChange() {
        const pageSizeSelector = document.getElementById('orderPageSizeSelector');
        if (pageSizeSelector) {
            this.currentPageSize = parseInt(pageSizeSelector.value);
            console.log('页大小改变为:', this.currentPageSize);
            // 重新加载第一页数据
            this.loadOrderDataList(1);
        }
    },

    // 处理列排序点击
    handleOrderColumnSort(columnKey) {
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
        this.loadOrderDataList(1);
    },

    // 导出订单数据到Excel
    exportOrderDataToExcel() {
        if (!AuthModule.checkAdminPermission()) {
            return;
        }
        
        try {
            // 显示加载状态
            const exportButton = document.querySelector('button[onclick="OrderDataModule.exportOrderDataToExcel()"]');
            if (exportButton) {
                exportButton.disabled = true;
                exportButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 导出中...';
            }
            
            // 获取当前过滤条件
            const startDate = document.getElementById('orderStartDateFilter')?.value || '';
            const endDate = document.getElementById('orderEndDateFilter')?.value || '';
            const storeName = document.getElementById('orderStoreNameFilter')?.value || '';
            
            // 构建查询参数
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (storeName) params.append('store_name', storeName);
            params.append('export', 'true');
            
            // 生成文件名
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10);
            const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
            const filename = `订单数据_${dateStr}_${timeStr}.xlsx`;
            
            // 创建下载链接
            const downloadUrl = `/api/order-details?${params.toString()}`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showAlert('订单数据导出成功', 'success');
            
        } catch (error) {
            console.error('导出订单数据失败:', error);
            showAlert('导出订单数据失败：' + error.message, 'danger');
        } finally {
            // 恢复按钮状态
            const exportButton = document.querySelector('button[onclick="OrderDataModule.exportOrderDataToExcel()"]');
            if (exportButton) {
                exportButton.disabled = false;
                exportButton.innerHTML = '<i class="fas fa-download"></i> 导出Excel';
            }
        }
    },

    // ======================== 表格渲染功能 ========================

    // 渲染订单数据表格
    renderOrderDataTable(data) {
        this.renderOrderTableHeader();
        this.renderOrderTableBody(data);
    },

    // 渲染表格头
    renderOrderTableHeader() {
        const tableHeader = document.getElementById('orderTableHeader');
        tableHeader.innerHTML = '';
        
        AppConfig.ORDER_TABLE_COLUMNS.forEach((column, index) => {
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
                
                // 排序指示器（仅对可排序的列显示）
                if (column.sortable !== false) {
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
                }
                
                // 特殊处理店铺名称列，添加提示图标
                if (column.key === 'store_name') {
                    const infoIcon = document.createElement('i');
                    infoIcon.className = 'fas fa-info-circle text-info';
                    infoIcon.style.marginLeft = '5px';
                    infoIcon.title = '点击店铺名称查看汇总信息';
                    titleContainer.appendChild(infoIcon);
                }
                
                th.appendChild(titleContainer);
                
                // 添加点击排序事件监听器（仅对可排序的列）
                if (column.sortable !== false) {
                    th.addEventListener('click', (e) => {
                        // 防止拖拽时触发排序
                        if (!this.isResizing) {
                            this.handleOrderColumnSort(column.key);
                        }
                    });
                }
                
                // 添加拖拽事件监听器（保持原有的列宽调整功能）
                th.addEventListener('mousedown', (e) => this.handleOrderColumnResize(e));
                
                tableHeader.appendChild(th);
            }
        });
    },

    // 渲染表格体
    renderOrderTableBody(data) {
        const tableBody = document.getElementById('orderDataTableBody');
        if (!tableBody) return;
        
        // 清空现有数据
        tableBody.innerHTML = '';
        
        if (!data || data.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="${this.visibleColumns.length}" class="text-center text-muted py-4">暂无数据</td>`;
            tableBody.appendChild(emptyRow);
            return;
        }
        
        data.forEach(item => {
            const row = document.createElement('tr');
            
            AppConfig.ORDER_TABLE_COLUMNS.forEach(column => {
                if (this.visibleColumns.includes(column.key)) {
                    const cell = document.createElement('td');
                    let value = item[column.key] || '-';
                    
                    // 数据格式化
                    if (value !== '-') {
                        // 金额字段格式化
                        if (['payable_amount', 'paid_amount', 'unit_price', 'product_amount', 'operation_cost_supply_price'].includes(column.key)) {
                            value = this.formatCurrency(value);
                        }
                        // 日期时间字段格式化
                        else if (column.key === 'order_time') {
                            value = this.formatDateTime(value);
                        }
                        // 日期字段格式化
                        else if (['payment_date', 'shipping_date', 'upload_date'].includes(column.key)) {
                            value = this.formatDate(value);
                        }
                        // 数量字段格式化
                        else if (column.key === 'quantity') {
                            value = parseInt(value).toLocaleString();
                        }
                    }
                    
                    // 特殊处理店铺名称列
                    if (column.key === 'store_name' && value !== '-') {
                        const link = document.createElement('a');
                        link.href = '#';
                        link.textContent = value;
                        link.style.color = '#007bff';
                        link.style.textDecoration = 'none';
                        link.style.cursor = 'pointer';
                        link.title = '点击查看店铺汇总信息';
                        
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            this.showStoreInfo(value, item.upload_date);
                        });
                        
                        // 鼠标悬停效果
                        link.addEventListener('mouseenter', function() {
                            this.style.textDecoration = 'underline';
                        });
                        
                        link.addEventListener('mouseleave', function() {
                            this.style.textDecoration = 'none';
                        });
                        
                        cell.appendChild(link);
                    } else {
                        cell.textContent = value;
                    }
                    
                    // 设置单元格样式
                    cell.style.width = column.width;
                    cell.style.maxWidth = column.width;
                    cell.style.overflow = 'hidden';
                    cell.style.textOverflow = 'ellipsis';
                    cell.style.whiteSpace = 'nowrap';
                    cell.title = item[column.key] || '-'; // 添加tooltip显示完整内容
                    
                    row.appendChild(cell);
                }
            });
            
            tableBody.appendChild(row);
        });
    },

    // ======================== 列宽调整功能 ========================

    // 处理列宽调整
    handleOrderColumnResize(e) {
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
        document.addEventListener('mousemove', (e) => this.onOrderColumnResize(e));
        document.addEventListener('mouseup', () => this.stopOrderColumnResize());
        
        // 禁用文本选择
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
    },

    // 列宽调整中
    onOrderColumnResize(e) {
        if (!this.isResizing || !this.currentColumn) return;
        
        const deltaX = e.clientX - this.startX;
        const newWidth = Math.max(80, this.startWidth + deltaX);
        
        this.currentColumn.style.width = newWidth + 'px';
        
        // 更新对应列的宽度配置
        const columnKey = this.currentColumn.getAttribute('data-column');
        const columnIndex = AppConfig.ORDER_TABLE_COLUMNS.findIndex(col => col.key === columnKey);
        if (columnIndex !== -1) {
            AppConfig.ORDER_TABLE_COLUMNS[columnIndex].width = newWidth + 'px';
        }
        
        // 更新表格主体中对应列的宽度
        this.updateOrderTableBodyColumnWidth(columnKey, newWidth);
    },

    // 停止列宽调整
    stopOrderColumnResize() {
        if (!this.isResizing) return;
        
        this.isResizing = false;
        
        if (this.currentColumn) {
            this.currentColumn.classList.remove('resizing');
            this.currentColumn = null;
        }
        
        // 移除全局事件监听器
        document.removeEventListener('mousemove', (e) => this.onOrderColumnResize(e));
        document.removeEventListener('mouseup', () => this.stopOrderColumnResize());
        
        // 恢复文本选择
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        
        // 保存列宽设置
        this.saveOrderColumnWidths();
    },

    // 更新表格体列宽
    updateOrderTableBodyColumnWidth(columnKey, width) {
        const tableBody = document.getElementById('orderDataTableBody');
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
    saveOrderColumnWidths() {
        const widths = {};
        AppConfig.ORDER_TABLE_COLUMNS.forEach(column => {
            widths[column.key] = column.width;
        });
        localStorage.setItem(AppConfig.STORAGE_KEYS.ORDER_COLUMN_WIDTHS, JSON.stringify(widths));
    },

    // 加载列宽设置
    loadOrderColumnWidths() {
        const savedWidths = localStorage.getItem(AppConfig.STORAGE_KEYS.ORDER_COLUMN_WIDTHS);
        if (savedWidths) {
            try {
                const widths = JSON.parse(savedWidths);
                AppConfig.ORDER_TABLE_COLUMNS.forEach(column => {
                    if (widths[column.key]) {
                        column.width = widths[column.key];
                    }
                });
            } catch (e) {
                console.error('加载订单列宽设置失败:', e);
            }
        }
    },

    // ======================== 列选择器功能 ========================

    // 显示列选择器
    showOrderColumnSelector() {
        const selector = document.getElementById('orderColumnSelector');
        const checkboxContainer = document.getElementById('orderColumnCheckboxes');
        
        checkboxContainer.innerHTML = '';
        
        AppConfig.ORDER_TABLE_COLUMNS.forEach(column => {
            const colDiv = document.createElement('div');
            colDiv.className = 'col-md-3 mb-2';
            
            const checkDiv = document.createElement('div');
            checkDiv.className = 'form-check';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-check-input';
            checkbox.id = `order-col-${column.key}`;
            checkbox.checked = this.visibleColumns.includes(column.key);
            
            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.htmlFor = `order-col-${column.key}`;
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
    hideOrderColumnSelector() {
        document.getElementById('orderColumnSelector').style.display = 'none';
    },

    // 应用列设置
    applyOrderColumnSettings() {
        this.visibleColumns = [];
        
        AppConfig.ORDER_TABLE_COLUMNS.forEach(column => {
            const checkbox = document.getElementById(`order-col-${column.key}`);
            if (checkbox && checkbox.checked) {
                this.visibleColumns.push(column.key);
            }
        });
        
        // 至少显示一列
        if (this.visibleColumns.length === 0) {
            this.visibleColumns = ['store_name'];
            showAlert('至少需要选择一列进行显示', 'warning');
        }
        
        // 重新渲染表格
        this.loadOrderDataList();
        this.hideOrderColumnSelector();
        
        // 保存设置到localStorage
        localStorage.setItem(AppConfig.STORAGE_KEYS.ORDER_VISIBLE_COLUMNS, JSON.stringify(this.visibleColumns));
        
        showAlert('列设置已应用', 'success');
    },

    // 选择所有列
    selectAllOrderColumns() {
        AppConfig.ORDER_TABLE_COLUMNS.forEach(column => {
            const checkbox = document.getElementById(`order-col-${column.key}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    },

    // 重置列
    resetOrderColumns() {
        AppConfig.ORDER_TABLE_COLUMNS.forEach(column => {
            const checkbox = document.getElementById(`order-col-${column.key}`);
            if (checkbox) {
                checkbox.checked = column.defaultVisible;
            }
        });
    },

    // 加载列设置
    loadOrderColumnSettings() {
        const saved = localStorage.getItem(AppConfig.STORAGE_KEYS.ORDER_VISIBLE_COLUMNS);
        if (saved) {
            try {
                const savedColumns = JSON.parse(saved);
                // 验证保存的列是否有效
                const validColumns = savedColumns.filter(col => 
                    AppConfig.ORDER_TABLE_COLUMNS.some(tableCol => tableCol.key === col)
                );
                if (validColumns.length > 0) {
                    this.visibleColumns = validColumns;
                }
            } catch (e) {
                console.log('恢复订单列设置失败，使用默认设置');
            }
        }
    },

    // 渲染分页控制
    renderOrderPagination(currentPage, totalPages, totalRecords) {
        const pagination = document.getElementById('orderPagination');
        if (!pagination) return;
        
        // 清空现有分页
        pagination.innerHTML = '';
        
        if (totalPages <= 1) return;
        
        // 上一页按钮
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage <= 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" ${currentPage > 1 ? `onclick="OrderDataModule.loadOrderDataList(${currentPage - 1})"` : ''}>上一页</a>`;
        pagination.appendChild(prevLi);
        
        // 计算显示的页码范围
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        // 如果开始页码大于1，显示第一页和省略号
        if (startPage > 1) {
            const firstLi = document.createElement('li');
            firstLi.className = 'page-item';
            firstLi.innerHTML = `<a class="page-link" href="#" onclick="OrderDataModule.loadOrderDataList(1)">1</a>`;
            pagination.appendChild(firstLi);
            
            if (startPage > 2) {
                const ellipsisLi = document.createElement('li');
                ellipsisLi.className = 'page-item disabled';
                ellipsisLi.innerHTML = '<span class="page-link">...</span>';
                pagination.appendChild(ellipsisLi);
            }
        }
        
        // 显示页码
        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" onclick="OrderDataModule.loadOrderDataList(${i})">${i}</a>`;
            pagination.appendChild(li);
        }
        
        // 如果结束页码小于总页数，显示省略号和最后一页
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsisLi = document.createElement('li');
                ellipsisLi.className = 'page-item disabled';
                ellipsisLi.innerHTML = '<span class="page-link">...</span>';
                pagination.appendChild(ellipsisLi);
            }
            
            const lastLi = document.createElement('li');
            lastLi.className = 'page-item';
            lastLi.innerHTML = `<a class="page-link" href="#" onclick="OrderDataModule.loadOrderDataList(${totalPages})">${totalPages}</a>`;
            pagination.appendChild(lastLi);
        }
        
        // 下一页按钮
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage >= totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" ${currentPage < totalPages ? `onclick="OrderDataModule.loadOrderDataList(${currentPage + 1})"` : ''}>下一页</a>`;
        pagination.appendChild(nextLi);
    },

    // ======================== 店铺信息弹窗功能 ========================

    // 显示店铺信息弹窗
    showStoreInfo(storeName, uploadDate) {
        console.log('显示店铺信息:', storeName, uploadDate);
        
        // 显示弹窗
        const modal = document.getElementById('storeInfoModal');
        if (!modal) return;
        
        // 更新弹窗标题
        const modalName = document.getElementById('storeModalName');
        const modalStoreName = document.getElementById('storeModalStoreName');
        const modalDate = document.getElementById('storeModalDate');
        
        if (modalName) modalName.textContent = storeName;
        if (modalStoreName) modalStoreName.textContent = storeName;
        if (modalDate) modalDate.textContent = this.formatDate(uploadDate);
        
        // 显示加载状态
        const loadingIndicator = document.getElementById('storeInfoLoading');
        const modalBody = modal.querySelector('.modal-body');
        
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
        
        // 隐藏数据区域
        const dataRows = modal.querySelectorAll('.row:not(.mb-3)');
        dataRows.forEach(row => {
            if (row.id !== 'storeInfoLoading') {
                row.style.display = 'none';
            }
        });
        
        // 显示弹窗
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // 加载店铺汇总数据
        this.loadStoreInfo(storeName, uploadDate);
    },

    // 加载店铺汇总信息
    loadStoreInfo(storeName, targetDate) {
        const formattedDate = this.formatDateForAPI(targetDate);
        
        APIService.getStoreSummary(storeName, formattedDate)
        .then(data => {
            console.log('店铺汇总数据:', data);
            this.updateStoreInfoModal(data);
        })
        .catch(error => {
            console.error('加载店铺汇总信息失败:', error);
            showAlert('加载店铺汇总信息失败：' + error.message, 'danger');
            
            // 显示错误信息
            this.updateStoreInfoModal({
                order_count: 0,
                total_sales: 0,
                total_cost: 0,
                profit: 0
            });
        })
        .finally(() => {
            // 隐藏加载状态
            const loadingIndicator = document.getElementById('storeInfoLoading');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            // 显示数据区域
            const modal = document.getElementById('storeInfoModal');
            const dataRows = modal.querySelectorAll('.row:not(.mb-3)');
            dataRows.forEach(row => {
                if (row.id !== 'storeInfoLoading') {
                    row.style.display = 'flex';
                }
            });
        });
    },

    // 更新店铺信息弹窗数据
    updateStoreInfoModal(data) {
        // 更新基本数据
        const orderCount = document.getElementById('storeModalOrderCount');
        const totalSales = document.getElementById('storeModalTotalSales');
        const totalCost = document.getElementById('storeModalTotalCost');
        const profit = document.getElementById('storeModalProfit');
        
        if (orderCount) orderCount.textContent = data.order_count || 0;
        if (totalSales) totalSales.textContent = (data.total_sales || 0).toFixed(2);
        if (totalCost) totalCost.textContent = (data.total_cost || 0).toFixed(2);
        if (profit) profit.textContent = (data.profit || 0).toFixed(2);
        
        // 计算并更新利润率
        const profitRate = data.total_sales > 0 ? (data.profit / data.total_sales * 100) : 0;
        const profitRateElement = document.getElementById('storeModalProfitRate');
        const profitRateBar = document.getElementById('storeProfitRateBar');
        
        if (profitRateElement) profitRateElement.textContent = profitRate.toFixed(1) + '%';
        if (profitRateBar) {
            profitRateBar.style.width = Math.min(Math.max(profitRate, 0), 100) + '%';
            // 根据利润率设置颜色
            if (profitRate < 10) {
                profitRateBar.className = 'progress-bar bg-danger';
            } else if (profitRate < 20) {
                profitRateBar.className = 'progress-bar bg-warning';
            } else {
                profitRateBar.className = 'progress-bar bg-success';
            }
        }
        
        // 计算并更新平均订单金额
        const avgOrderAmount = data.order_count > 0 ? (data.total_sales / data.order_count) : 0;
        const avgOrderAmountElement = document.getElementById('storeModalAvgOrderAmount');
        if (avgOrderAmountElement) avgOrderAmountElement.textContent = avgOrderAmount.toFixed(2);
    },

    // ======================== 工具函数 ========================

    // 格式化日期时间
    formatDateTime(dateTimeString) {
        if (!dateTimeString) return '-';
        try {
            const date = new Date(dateTimeString);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateTimeString;
        }
    },

    // 格式化日期
    formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('zh-CN');
        } catch (error) {
            return dateString;
        }
    },

    // 格式化日期为API需要的格式
    formatDateForAPI(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0]; // YYYY-MM-DD
        } catch (error) {
            return dateString;
        }
    },

    // 格式化货币
    formatCurrency(amount) {
        if (amount === null || amount === undefined) return '-';
        try {
            return '¥' + parseFloat(amount).toFixed(2);
        } catch (error) {
            return amount;
        }
    },

    // ======================== 页面初始化功能 ========================

    // 初始化订单数据页面
    initOrderDataPage() {
        console.log('初始化订单数据页面');
        
        // 加载保存的设置
        this.loadOrderColumnSettings();
        this.loadOrderColumnWidths();
        
        // 绑定页大小选择器事件
        const pageSizeSelector = document.getElementById('orderPageSizeSelector');
        if (pageSizeSelector) {
            pageSizeSelector.addEventListener('change', () => this.onOrderPageSizeChange());
        }
        
        // 加载初始数据
        this.loadOrderDataList();
    }
};

// 全局函数（保持向后兼容）
window.OrderDataModule = OrderDataModule; 