/**
 * 订单数据管理模块
 * 负责订单数据列表的加载、搜索、导出、店铺名称点击弹窗、列管理等功能
 */

const OrderDataModule = {
    // ======================== 模块状态变量 ========================
    
    // 当前显示的列设置
    visibleColumns: [],
    
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
        // 移除权限检查，允许所有用户加载数据
        // if (!AuthModule.isAdmin()) return;
        
        const startDateElement = document.getElementById('orderStartDateFilter');
        const endDateElement = document.getElementById('orderEndDateFilter');
        const storeNameElement = document.getElementById('orderStoreNameFilter');
        const operatorElement = document.getElementById('orderOperatorFilter');
        const provinceElement = document.getElementById('orderProvinceFilter');
        const cityElement = document.getElementById('orderCityFilter');
        const expressCompanyElement = document.getElementById('orderExpressCompanyFilter');
        
        const startDate = startDateElement ? startDateElement.value : '';
        const endDate = endDateElement ? endDateElement.value : '';
        const storeName = storeNameElement ? storeNameElement.value : '';
        const operator = operatorElement ? operatorElement.value : '';
        const province = provinceElement ? provinceElement.value : '';
        const city = cityElement ? cityElement.value : '';
        const expressCompany = expressCompanyElement ? expressCompanyElement.value : '';
        
        // 获取选中的订单状态
        const orderStatusCheckboxes = document.querySelectorAll('#orderStatusDropdown input[type="checkbox"]:checked');
        const orderStatusList = Array.from(orderStatusCheckboxes).map(cb => cb.value);
        
        console.log('loadOrderDataList被调用，参数:', { // 调试日志
            page: page,
            startDate: startDate,
            endDate: endDate,
            storeName: storeName,
            operator: operator,
            province: province,
            city: city,
            expressCompany: expressCompany,
            orderStatusList: orderStatusList
        });
        
        // 额外调试：检查DOM元素是否存在
        console.log('订单状态相关DOM元素检查:', {
            checkboxes: document.querySelectorAll('#orderStatusDropdown input[type="checkbox"]').length,
            checkedBoxes: document.querySelectorAll('#orderStatusDropdown input[type="checkbox"]:checked').length,
            dropdownExists: !!document.getElementById('orderStatusDropdown')
        });
        
        const filters = {
            start_date: startDate,
            end_date: endDate,
            store_name: storeName,
            operator: operator,
            province: province,
            city: city,
            express_company: expressCompany,
            order_status: orderStatusList
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
            const operatorFilter = document.getElementById('orderOperatorFilter');
            const provinceFilter = document.getElementById('orderProvinceFilter');
            const cityFilter = document.getElementById('orderCityFilter');
            const expressCompanyFilter = document.getElementById('orderExpressCompanyFilter');
            
            if (startDateFilter) startDateFilter.value = '';
            if (endDateFilter) endDateFilter.value = '';
            if (storeNameFilter) storeNameFilter.value = '';
            if (operatorFilter) operatorFilter.value = '';
            if (provinceFilter) provinceFilter.value = '';
            if (cityFilter) cityFilter.value = '';
            if (expressCompanyFilter) expressCompanyFilter.value = '';
            
            // 清空订单状态选择
            const orderStatusCheckboxes = document.querySelectorAll('#orderStatusDropdown input[type="checkbox"]');
            orderStatusCheckboxes.forEach(cb => cb.checked = false);
            
            // 更新订单状态显示文本
            const orderStatusSelected = document.getElementById('orderStatusSelected');
            if (orderStatusSelected) {
                orderStatusSelected.textContent = '选择状态';
            }
            
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
        // 移除管理员权限检查，允许所有用户导出
        // if (!AuthModule.checkAdminPermission()) {
        //     return;
        // }
        
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
        
        // 按照visibleColumns的顺序来渲染列
        this.visibleColumns.forEach((columnKey, index) => {
            const column = AppConfig.ORDER_TABLE_COLUMNS.find(col => col.key === columnKey);
            if (column) {
                // 普通用户不能看到运营成本供货价
                if (column.key === 'operation_cost_supply_price' && !AuthModule.isAdmin()) {
                    return;
                }
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
                
                // 特殊处理店铺名称列，添加提示图标（仅管理员）
                if (column.key === 'store_name' && AuthModule.isAdmin()) {
                    const infoIcon = document.createElement('i');
                    infoIcon.className = 'fas fa-info-circle text-info';
                    infoIcon.style.marginLeft = '5px';
                    infoIcon.title = '点击店铺名称查看汇总信息';
                    titleContainer.appendChild(infoIcon);
                }
                
                // 特殊处理操作人列，添加提示图标
                if (column.key === 'product_list_operator') {
                    const infoIcon = document.createElement('i');
                    infoIcon.className = 'fas fa-info-circle text-warning';
                    infoIcon.style.marginLeft = '5px';
                    infoIcon.title = '点击操作人查看该操作人在此店铺的汇总信息';
                    titleContainer.appendChild(infoIcon);
                }
                
                // 特殊处理内部订单号列，添加提示图标（仅管理员）
                if (column.key === 'internal_order_number' && AuthModule.isAdmin()) {
                    const infoIcon = document.createElement('i');
                    infoIcon.className = 'fas fa-info-circle text-success';
                    infoIcon.style.marginLeft = '5px';
                    infoIcon.title = '点击内部订单号查看订单详情';
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
            
            // 按照visibleColumns的顺序来渲染列
            this.visibleColumns.forEach(columnKey => {
                const column = AppConfig.ORDER_TABLE_COLUMNS.find(col => col.key === columnKey);
                if (column) {
                    // 普通用户不能看到运营成本供货价
                    if (column.key === 'operation_cost_supply_price' && !AuthModule.isAdmin()) {
                        return;
                    }
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
                    
                    // 特殊处理订单状态列
                    if (column.key === 'order_status') {
                        const statusSpan = document.createElement('span');
                        statusSpan.textContent = value || '空白';
                        statusSpan.className = 'badge ';
                        
                        // 根据不同状态设置不同的样式
                        switch (value) {
                            case '已发货':
                                statusSpan.className += 'bg-success';
                                break;
                            case '取消':
                                statusSpan.className += 'bg-danger';
                                break;
                            case '发货后取消':
                                statusSpan.className += 'bg-warning text-dark';
                                break;
                            case '外部发货':
                                statusSpan.className += 'bg-info';
                                break;
                            case '线上发货':
                                statusSpan.className += 'bg-primary';
                                break;
                            case 'None':
                                statusSpan.className += 'bg-secondary';
                                break;
                            default:
                                statusSpan.className += 'bg-light text-dark';
                                statusSpan.textContent = '空白';
                        }
                        
                        cell.appendChild(statusSpan);
                    }
                    // 特殊处理店铺名称列
                    if (column.key === 'store_name' && value !== '-') {
                        if (AuthModule.isAdmin()) {
                            // 管理员可以点击查看店铺汇总信息
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
                            // 普通用户只显示普通文本，不能点击
                            cell.textContent = value;
                            cell.style.color = '#333';
                            cell.style.cursor = 'default';
                        }
                    }
                    // 特殊处理操作人列
                    else if (column.key === 'product_list_operator' && value !== '-') {
                        const link = document.createElement('a');
                        link.href = '#';
                        link.textContent = value;
                        link.style.color = '#ff8c00';
                        link.style.textDecoration = 'none';
                        link.style.cursor = 'pointer';
                        link.title = '点击查看该操作人在此店铺的汇总信息';
                        
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            this.showOperatorInfo(item.store_name, value, item.upload_date);
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
                    // 特殊处理内部订单号列
                    else if (column.key === 'internal_order_number' && value !== '-') {
                        if (AuthModule.isAdmin()) {
                            // 管理员可以点击查看订单详情
                            const link = document.createElement('a');
                            link.href = '#';
                            link.textContent = value;
                            link.style.color = '#28a745';
                            link.style.textDecoration = 'none';
                            link.style.cursor = 'pointer';
                            link.title = '点击查看订单详情';
                            
                            link.addEventListener('click', (e) => {
                                e.preventDefault();
                                this.showOrderDetails(value);
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
                            // 普通用户只显示普通文本，不能点击
                            cell.textContent = value;
                            cell.style.color = '#333';
                            cell.style.cursor = 'default';
                        }
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

    // 当前列排序顺序
    columnOrder: [],
    
    // 拖拽状态
    dragState: {
        draggedElement: null,
        draggedIndex: -1,
        placeholder: null,
        targetElement: null,
        insertAfter: false
    },

    // 显示列选择器
    showOrderColumnSelector() {
        const selector = document.getElementById('orderColumnSelector');
        this.renderOrderCategorizedColumns();
        this.renderOrderSelectedColumns();
        selector.style.display = 'block';
        
        // 清空搜索框
        const searchInput = document.getElementById('orderColumnSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }
    },

    // 隐藏列选择器
    hideOrderColumnSelector() {
        document.getElementById('orderColumnSelector').style.display = 'none';
        this.clearOrderSearchFilter();
    },

    // 应用列设置
    applyOrderColumnSettings() {
        // 按用户排序的顺序排列可见列
        this.visibleColumns = [...this.columnOrder.filter(key => this.visibleColumns.includes(key))];
        
        // 至少显示一列
        if (this.visibleColumns.length === 0) {
            this.visibleColumns = ['internal_order_number'];
            this.columnOrder = ['internal_order_number'];
            showAlert('至少需要选择一列进行显示', 'warning');
        }
        
        console.log('应用订单列设置:', {
            columnOrder: this.columnOrder,
            finalVisibleColumns: this.visibleColumns
        });
        
        // 保存设置
        localStorage.setItem(AppConfig.STORAGE_KEYS.ORDER_VISIBLE_COLUMNS, JSON.stringify(this.visibleColumns));
        localStorage.setItem('orderTableColumnOrder', JSON.stringify(this.columnOrder));
        
        // 重新渲染表格
        this.loadOrderDataList();
        this.hideOrderColumnSelector();
        
        // 保存设置到localStorage
        localStorage.setItem(AppConfig.STORAGE_KEYS.ORDER_VISIBLE_COLUMNS, JSON.stringify(this.visibleColumns));
        
        showAlert('列设置已应用', 'success');
    },



    // 加载列设置
    loadOrderColumnSettings() {
        const saved = localStorage.getItem(AppConfig.STORAGE_KEYS.ORDER_VISIBLE_COLUMNS);
        if (saved) {
            try {
                const savedColumns = JSON.parse(saved);
                // 验证保存的列是否有效
                let validColumns = savedColumns.filter(col => 
                    AppConfig.ORDER_TABLE_COLUMNS.some(tableCol => tableCol.key === col)
                );
                
                // 普通用户不能显示运营成本供货价列
                if (!AuthModule.isAdmin()) {
                    validColumns = validColumns.filter(col => col !== 'operation_cost_supply_price');
                }
                
                if (validColumns.length > 0) {
                    this.visibleColumns = validColumns;
                }
            } catch (e) {
                console.log('恢复订单列设置失败，使用默认设置');
            }
        } else {
            // 如果没有保存的设置，使用默认设置
            this.visibleColumns = AppConfig.ORDER_TABLE_COLUMNS
                .filter(col => col.defaultVisible)
                .filter(col => {
                    // 普通用户不能显示运营成本供货价列
                    if (col.key === 'operation_cost_supply_price' && !AuthModule.isAdmin()) {
                        return false;
                    }
                    return true;
                })
                .map(col => col.key);
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

    // 显示操作人信息弹窗
    showOperatorInfo(storeName, operator, uploadDate) {
        console.log('显示操作人信息:', storeName, operator, uploadDate);
        
        // 显示弹窗
        const modal = document.getElementById('operatorInfoModal');
        if (!modal) return;
        
        // 更新弹窗标题
        const modalName = document.getElementById('operatorModalName');
        const modalOperatorName = document.getElementById('operatorModalOperatorName');
        const modalStoreName = document.getElementById('operatorModalStoreName');
        const modalDate = document.getElementById('operatorModalDate');
        
        if (modalName) modalName.textContent = operator;
        if (modalOperatorName) modalOperatorName.textContent = operator;
        if (modalStoreName) modalStoreName.textContent = storeName;
        if (modalDate) modalDate.textContent = this.formatDate(uploadDate);
        
        // 显示加载状态
        const loadingIndicator = document.getElementById('operatorInfoLoading');
        const modalBody = modal.querySelector('.modal-body');
        
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
        
        // 隐藏数据区域
        const dataRows = modal.querySelectorAll('.row:not(.mb-3)');
        dataRows.forEach(row => {
            if (row.id !== 'operatorInfoLoading') {
                row.style.display = 'none';
            }
        });
        
        // 显示弹窗
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // 加载操作人汇总数据
        this.loadOperatorInfo(storeName, operator, uploadDate);
    },

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

    // 加载操作人汇总信息
    loadOperatorInfo(storeName, operator, targetDate) {
        const formattedDate = this.formatDateForAPI(targetDate);
        
        APIService.getOperatorSummary(storeName, operator, formattedDate)
        .then(data => {
            console.log('操作人汇总数据:', data);
            this.updateOperatorInfoModal(data);
        })
        .catch(error => {
            console.error('加载操作人汇总信息失败:', error);
            showAlert('加载操作人汇总信息失败：' + error.message, 'danger');
            
            // 显示错误信息
            this.updateOperatorInfoModal({
                store_name: storeName,
                operator: operator,
                order_count: 0,
                total_sales: 0,
                total_cost: 0,
                profit: 0
            });
        })
        .finally(() => {
            // 隐藏加载状态
            const loadingIndicator = document.getElementById('operatorInfoLoading');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            // 显示数据区域
            const modal = document.getElementById('operatorInfoModal');
            const dataRows = modal.querySelectorAll('.row:not(.mb-3)');
            dataRows.forEach(row => {
                if (row.id !== 'operatorInfoLoading') {
                    row.style.display = 'flex';
                }
            });
        });
    },

    // 更新操作人信息弹窗数据
    updateOperatorInfoModal(data) {
        // 更新基本数据
        const orderCount = document.getElementById('operatorModalOrderCount');
        const totalSales = document.getElementById('operatorModalTotalSales');
        const totalCost = document.getElementById('operatorModalTotalCost');
        const profit = document.getElementById('operatorModalProfit');
        
        if (orderCount) orderCount.textContent = data.order_count || 0;
        if (totalSales) totalSales.textContent = (data.total_sales || 0).toFixed(2);
        if (totalCost) totalCost.textContent = (data.total_cost || 0).toFixed(2);
        if (profit) profit.textContent = (data.profit || 0).toFixed(2);
        
        // 计算并更新利润率
        const profitRate = data.total_sales > 0 ? (data.profit / data.total_sales * 100) : 0;
        const profitRateElement = document.getElementById('operatorModalProfitRate');
        const profitRateBar = document.getElementById('operatorProfitRateBar');
        
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
        const avgOrderAmountElement = document.getElementById('operatorModalAvgOrderAmount');
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

    // 设置订单状态筛选事件监听器
    setupOrderStatusFilter() {
        console.log('正在设置订单状态筛选器...');
        
        // 等待DOM完全准备好
        setTimeout(() => {
            const orderStatusCheckboxes = document.querySelectorAll('#orderStatusDropdown input[type="checkbox"]');
            const orderStatusSelected = document.getElementById('orderStatusSelected');
            const orderStatusDropdown = document.getElementById('orderStatusDropdown');
            
            console.log('订单状态DOM元素检查:', {
                dropdownExists: !!orderStatusDropdown,
                checkboxCount: orderStatusCheckboxes.length,
                selectedElementExists: !!orderStatusSelected,
                dropdownHTML: orderStatusDropdown ? orderStatusDropdown.outerHTML.substring(0, 200) : 'null'
            });
            
            if (orderStatusCheckboxes.length === 0) {
                console.error('未找到订单状态checkbox元素！');
                return;
            }
            
            orderStatusCheckboxes.forEach((checkbox, index) => {
                console.log(`设置checkbox[${index}]事件监听器，值:`, checkbox.value);
                checkbox.addEventListener('change', () => {
                    console.log(`checkbox[${index}]状态改变:`, checkbox.checked, checkbox.value);
                    
                    // 更新显示的选中状态文本
                    const checkedBoxes = document.querySelectorAll('#orderStatusDropdown input[type="checkbox"]:checked');
                    const selectedValues = Array.from(checkedBoxes).map(cb => cb.value);
                    
                    console.log('当前选中的状态:', selectedValues);
                    
                    if (orderStatusSelected) {
                        if (selectedValues.length === 0) {
                            orderStatusSelected.textContent = '选择状态';
                        } else if (selectedValues.length === 1) {
                            orderStatusSelected.textContent = selectedValues[0];
                        } else {
                            orderStatusSelected.textContent = `已选择 ${selectedValues.length} 项`;
                        }
                    }
                });
            });
            
            // 阻止下拉菜单因点击checkbox而关闭  
            const dropdownItems = document.querySelectorAll('#orderStatusDropdown .dropdown-item');
            console.log('找到dropdown-item数量:', dropdownItems.length);
            dropdownItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            });
            
            console.log('订单状态筛选器设置完成');
        }, 100);
    },

    // 初始化订单数据页面
    initOrderDataPage() {
        console.log('初始化订单数据页面');
        
        // 等待DOM完全渲染后再初始化
        setTimeout(() => {
            console.log('延迟初始化开始...');
            
            // 加载保存的设置
            this.loadOrderColumnSettings();
            this.loadOrderColumnWidths();
            
            // 绑定页大小选择器事件
            const pageSizeSelector = document.getElementById('orderPageSizeSelector');
            if (pageSizeSelector) {
                pageSizeSelector.addEventListener('change', () => this.onOrderPageSizeChange());
            }
            
            // 设置订单状态筛选事件监听器
            this.setupOrderStatusFilter();
            
            // 加载初始数据
            this.loadOrderDataList();
            
            console.log('订单数据页面初始化完成');
        }, 200);
    },

    // 测试订单状态筛选功能的调试函数
    testOrderStatusFilter() {
        console.log('=== 订单状态筛选测试 ===');
        
        const dropdown = document.getElementById('orderStatusDropdown');
        const checkboxes = document.querySelectorAll('#orderStatusDropdown input[type="checkbox"]');
        const checkedBoxes = document.querySelectorAll('#orderStatusDropdown input[type="checkbox"]:checked');
        const orderStatusList = Array.from(checkedBoxes).map(cb => cb.value);
        
        console.log('DOM元素检查:');
        console.log('- orderStatusDropdown存在:', !!dropdown);
        console.log('- 所有复选框数量:', checkboxes.length);
        console.log('- 选中复选框数量:', checkedBoxes.length);
        console.log('- 选中的状态:', orderStatusList);
        
        // 详细显示每个checkbox的状态
        checkboxes.forEach((cb, index) => {
            console.log(`- checkbox[${index}]: 值="${cb.value}", 选中=${cb.checked}`);
        });
        
        // 获取其他筛选条件进行测试
        const startDate = document.getElementById('orderStartDateFilter')?.value || '';
        const endDate = document.getElementById('orderEndDateFilter')?.value || '';
        const storeName = document.getElementById('orderStoreNameFilter')?.value || '';
        const operator = document.getElementById('orderOperatorFilter')?.value || '';
        const province = document.getElementById('orderProvinceFilter')?.value || '';
        const city = document.getElementById('orderCityFilter')?.value || '';
        const expressCompany = document.getElementById('orderExpressCompanyFilter')?.value || '';
        
        // 测试API调用
        const filters = {
            start_date: startDate,
            end_date: endDate,
            store_name: storeName,
            operator: operator,
            province: province,
            city: city,
            express_company: expressCompany,
            order_status: orderStatusList
        };
        
        console.log('将要发送的筛选条件:', filters);
        
        // 构建URL来查看最终的API调用
        let testUrl = `/api/order-details?page=1&per_page=20&sort_by=order_time&sort_order=desc`;
        if (startDate) testUrl += `&start_date=${encodeURIComponent(startDate)}`;
        if (endDate) testUrl += `&end_date=${encodeURIComponent(endDate)}`;
        if (storeName) testUrl += `&store_name=${encodeURIComponent(storeName)}`;
        if (operator) testUrl += `&operator=${encodeURIComponent(operator)}`;
        if (province) testUrl += `&province=${encodeURIComponent(province)}`;
        if (city) testUrl += `&city=${encodeURIComponent(city)}`;
        if (expressCompany) testUrl += `&express_company=${encodeURIComponent(expressCompany)}`;
        if (orderStatusList.length > 0) {
            orderStatusList.forEach(status => {
                testUrl += `&order_status=${encodeURIComponent(status)}`;
            });
        }
        console.log('预期的API URL:', testUrl);
        
        // 弹出提示框显示结果
        const filterSummary = [
            `复选框总数: ${checkboxes.length}`,
            `选中状态数量: ${checkedBoxes.length}`,
            `选中状态: ${orderStatusList.join(', ') || '无'}`,
            `省份: ${province || '无'}`,
            `城市: ${city || '无'}`,
            `快递公司: ${expressCompany || '无'}`,
            `店铺名称: ${storeName || '无'}`,
            `操作人: ${operator || '无'}`
        ].join('\n');
        
        alert(`订单筛选测试结果:\n${filterSummary}\n\n请查看控制台获取详细信息`);
        
        return orderStatusList;
    },

    // ======================== 订单详情弹窗功能 ========================

    // 显示订单详情弹窗
    showOrderDetails(internalOrderNumber) {
        console.log('显示订单详情:', internalOrderNumber);
        
        // 显示弹窗
        const modal = document.getElementById('orderDetailsModal');
        if (!modal) return;
        
        // 更新弹窗标题
        const modalTitle = document.getElementById('orderDetailsModalTitle');
        const modalInternalNumber = document.getElementById('orderDetailsModalInternalNumber');
        
        if (modalTitle) modalTitle.textContent = internalOrderNumber;
        if (modalInternalNumber) modalInternalNumber.textContent = internalOrderNumber;
        
        // 显示加载状态
        const loadingIndicator = document.getElementById('orderDetailsLoading');
        const modalBody = modal.querySelector('.modal-body');
        
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
        
        // 隐藏数据区域
        const dataRows = modal.querySelectorAll('.row, .table-responsive');
        dataRows.forEach(row => {
            if (row.id !== 'orderDetailsLoading') {
                row.style.display = 'none';
            }
        });
        
        // 显示弹窗
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // 加载订单详情数据
        this.loadOrderDetails(internalOrderNumber);
    },

    // 加载订单详情信息
    loadOrderDetails(internalOrderNumber) {
        APIService.getOrderDetailsByInternalNumber(internalOrderNumber)
        .then(data => {
            console.log('订单详情数据:', data);
            this.updateOrderDetailsModal(data);
        })
        .catch(error => {
            console.error('加载订单详情失败:', error);
            showAlert('加载订单详情失败：' + error.message, 'danger');
            
            // 显示错误信息
            this.updateOrderDetailsModal({
                data: [],
                summary: {
                    internal_order_number: internalOrderNumber,
                    sales_amount: 0,
                    total_cost: 0,
                    profit: 0,
                    item_count: 0,
                    store_name: '',
                    order_time: null
                }
            });
        })
        .finally(() => {
            // 隐藏加载状态
            const loadingIndicator = document.getElementById('orderDetailsLoading');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            // 显示数据区域
            const modal = document.getElementById('orderDetailsModal');
            const dataRows = modal.querySelectorAll('.row, .table-responsive');
            dataRows.forEach(row => {
                if (row.id !== 'orderDetailsLoading') {
                    row.style.display = 'block';
                }
            });
        });
    },

    // 更新订单详情弹窗数据
    updateOrderDetailsModal(response) {
        const { data, summary } = response;
        
        // 更新基本信息
        const storeName = document.getElementById('orderDetailsModalStoreName');
        const orderTime = document.getElementById('orderDetailsModalOrderTime');
        const itemCount = document.getElementById('orderDetailsModalItemCount');
        
        if (storeName) storeName.textContent = summary.store_name || '-';
        if (orderTime) orderTime.textContent = summary.order_time ? this.formatDateTime(summary.order_time) : '-';
        if (itemCount) itemCount.textContent = summary.item_count + ' 项';
        
        // 更新汇总数据
        const salesAmount = document.getElementById('orderDetailsModalSalesAmount');
        const totalCost = document.getElementById('orderDetailsModalTotalCost');
        const profit = document.getElementById('orderDetailsModalProfit');
        
        if (salesAmount) salesAmount.textContent = summary.sales_amount.toFixed(2);
        if (totalCost) totalCost.textContent = summary.total_cost.toFixed(2);
        if (profit) profit.textContent = summary.profit.toFixed(2);
        
        // 更新表格数据
        const tableBody = document.getElementById('orderDetailsModalTableBody');
        if (tableBody) {
            tableBody.innerHTML = '';
            
            if (data && data.length > 0) {
                data.forEach(item => {
                    const row = tableBody.insertRow();
                    
                    // 商品编码
                    const codeCell = row.insertCell();
                    codeCell.textContent = item.product_code || '-';
                    
                    // 商品名称
                    const nameCell = row.insertCell();
                    nameCell.textContent = item.product_name || '-';
                    nameCell.style.maxWidth = '300px';
                    nameCell.style.overflow = 'hidden';
                    nameCell.style.textOverflow = 'ellipsis';
                    nameCell.style.whiteSpace = 'nowrap';
                    nameCell.title = item.product_name || '-';
                    
                    // 数量
                    const quantityCell = row.insertCell();
                    quantityCell.textContent = item.quantity || 0;
                    quantityCell.style.textAlign = 'center';
                    
                    // 运营成本供货价
                    const priceCell = row.insertCell();
                    priceCell.textContent = '¥' + (item.operation_cost_supply_price || 0).toFixed(2);
                    priceCell.style.textAlign = 'right';
                    
                    // 小计成本
                    const subtotalCell = row.insertCell();
                    const subtotal = (item.operation_cost_supply_price || 0) * (item.quantity || 0);
                    subtotalCell.textContent = '¥' + subtotal.toFixed(2);
                    subtotalCell.style.textAlign = 'right';
                    subtotalCell.style.fontWeight = 'bold';
                });
            } else {
                const row = tableBody.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 5;
                cell.textContent = '暂无数据';
                cell.style.textAlign = 'center';
                cell.style.color = '#999';
            }
        }
    },
    
    // ======================== 新版列选择器方法 ========================
    
    // 渲染分类列表
    renderOrderCategorizedColumns() {
        const container = document.getElementById('orderCategorizedColumns');
        container.innerHTML = '';
        
        // 按分类分组
        const categories = {
            'order': { name: '订单信息', columns: [] },
            'product': { name: '商品信息', columns: [] },
            'store': { name: '店铺金额', columns: [] },
            'logistics': { name: '物流信息', columns: [] }
        };
        
        AppConfig.ORDER_TABLE_COLUMNS.forEach(column => {
            // 普通用户不能选择运营成本供货价列
            if (column.key === 'operation_cost_supply_price' && !AuthModule.isAdmin()) {
                return;
            }
            
            if (column.category && categories[column.category]) {
                categories[column.category].columns.push(column);
            }
        });
        
        // 渲染每个分类
        Object.keys(categories).forEach(categoryKey => {
            const category = categories[categoryKey];
            if (category.columns.length === 0) return;
            
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'mb-3';
            
            const headerDiv = document.createElement('div');
            headerDiv.className = 'category-header';
            headerDiv.innerHTML = `<i class="fas fa-folder"></i> ${category.name}`;
            categoryDiv.appendChild(headerDiv);
            
            category.columns.forEach(column => {
                const isSelected = this.visibleColumns.includes(column.key);
                
                const itemDiv = document.createElement('div');
                itemDiv.className = `category-item ${isSelected ? 'disabled' : ''}`;
                itemDiv.setAttribute('data-column', column.key);
                
                itemDiv.innerHTML = `
                    <span>${column.name}</span>
                    ${isSelected ? '<span class="badge bg-success">已选</span>' : ''}
                `;
                
                if (!isSelected) {
                    itemDiv.addEventListener('click', () => {
                        this.addOrderColumn(column.key);
                    });
                }
                
                categoryDiv.appendChild(itemDiv);
            });
            
            container.appendChild(categoryDiv);
        });
    },
    
    // 渲染已选择列表
    renderOrderSelectedColumns() {
        const container = document.getElementById('orderSelectedColumnsList');
        const countElement = document.getElementById('orderSelectedCount');
        
        // 初始化或更新列排序顺序
        if (this.columnOrder.length === 0) {
            this.columnOrder = [...this.visibleColumns];
        } else {
            // 添加新选择的列到末尾
            this.visibleColumns.forEach(key => {
                if (!this.columnOrder.includes(key)) {
                    this.columnOrder.push(key);
                }
            });
            // 移除未选择的列
            this.columnOrder = this.columnOrder.filter(key => this.visibleColumns.includes(key));
        }
        
        container.innerHTML = '';
        countElement.textContent = this.columnOrder.length;
        
        this.columnOrder.forEach((columnKey, index) => {
            const column = AppConfig.ORDER_TABLE_COLUMNS.find(col => col.key === columnKey);
            if (!column) return;
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'selected-item';
            itemDiv.draggable = true;
            itemDiv.setAttribute('data-column', columnKey);
            itemDiv.setAttribute('data-index', index);
            
            itemDiv.innerHTML = `
                <i class="fas fa-grip-vertical drag-handle"></i>
                <span>${column.name}</span>
                <i class="fas fa-times remove-btn" title="移除"></i>
            `;
            
            // 绑定拖拽事件
            this.bindOrderDragEvents(itemDiv);
            
            // 移除按钮事件
            const removeBtn = itemDiv.querySelector('.remove-btn');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeOrderColumn(columnKey);
            });
            
            container.appendChild(itemDiv);
        });
    },
    
    // 添加列
    addOrderColumn(columnKey) {
        if (!this.visibleColumns.includes(columnKey)) {
            this.visibleColumns.push(columnKey);
            this.columnOrder.push(columnKey);
            this.renderOrderCategorizedColumns();
            this.renderOrderSelectedColumns();
        }
    },
    
    // 移除列
    removeOrderColumn(columnKey) {
        this.visibleColumns = this.visibleColumns.filter(key => key !== columnKey);
        this.columnOrder = this.columnOrder.filter(key => key !== columnKey);
        this.renderOrderCategorizedColumns();
        this.renderOrderSelectedColumns();
    },
    
    // 绑定拖拽事件
    bindOrderDragEvents(element) {
        // 设置拖拽手柄样式
        const dragHandle = element.querySelector('.drag-handle');
        if (dragHandle) {
            dragHandle.style.cursor = 'grab';
        }
        
        element.addEventListener('dragstart', (e) => {
            this.dragState.draggedElement = element;
            this.dragState.draggedIndex = parseInt(element.getAttribute('data-index'));
            element.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', element.outerHTML);
            
            // 改变手柄样式
            if (dragHandle) {
                dragHandle.style.cursor = 'grabbing';
            }
        });
        
        element.addEventListener('dragend', (e) => {
            element.classList.remove('dragging');
            if (this.dragState.placeholder) {
                this.dragState.placeholder.remove();
                this.dragState.placeholder = null;
            }
            this.dragState.draggedElement = null;
            this.dragState.draggedIndex = -1;
            
            // 恢复手柄样式
            if (dragHandle) {
                dragHandle.style.cursor = 'grab';
            }
        });
        
        element.addEventListener('dragenter', (e) => {
            e.preventDefault();
        });
        
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (this.dragState.draggedElement && this.dragState.draggedElement !== element) {
                this.handleOrderDragOver(e, element);
            }
        });
        
        element.addEventListener('dragleave', (e) => {
            // 防止子元素触发dragleave
            if (!element.contains(e.relatedTarget)) {
                // 可以在这里添加视觉反馈
            }
        });
        
        element.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.dragState.draggedElement && this.dragState.draggedElement !== element) {
                this.handleOrderDrop(e, element);
            }
        });
    },
    
    // 处理拖拽悬停
    handleOrderDragOver(e, targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const isAfter = e.clientY > midY;
        
        // 创建或更新占位符
        if (!this.dragState.placeholder) {
            this.dragState.placeholder = document.createElement('div');
            this.dragState.placeholder.className = 'drag-placeholder';
            this.dragState.placeholder.innerHTML = '<div style="text-align: center; color: #007bff; font-size: 12px; padding: 8px;">释放到此处</div>';
        }
        
        // 移除现有占位符
        if (this.dragState.placeholder.parentNode) {
            this.dragState.placeholder.parentNode.removeChild(this.dragState.placeholder);
        }
        
        // 插入占位符到正确位置
        try {
            if (isAfter) {
                if (targetElement.nextSibling) {
                    targetElement.parentNode.insertBefore(this.dragState.placeholder, targetElement.nextSibling);
                } else {
                    targetElement.parentNode.appendChild(this.dragState.placeholder);
                }
            } else {
                targetElement.parentNode.insertBefore(this.dragState.placeholder, targetElement);
            }
        } catch (error) {
            console.warn('插入占位符时出错:', error);
        }
        
        // 存储目标位置信息
        this.dragState.targetElement = targetElement;
        this.dragState.insertAfter = isAfter;
    },
    
    // 处理拖拽放置
    handleOrderDrop(e, targetElement) {
        const targetIndex = parseInt(targetElement.getAttribute('data-index'));
        const draggedIndex = this.dragState.draggedIndex;
        
        if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
            console.log('订单拖拽操作:', { draggedIndex, targetIndex });
            
            // 移动数组元素
            const draggedItem = this.columnOrder[draggedIndex];
            this.columnOrder.splice(draggedIndex, 1);
            
            // 计算正确的插入位置
            let newIndex;
            if (this.dragState.insertAfter) {
                newIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
            } else {
                newIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
            }
            
            // 确保索引在有效范围内
            newIndex = Math.max(0, Math.min(newIndex, this.columnOrder.length));
            
            console.log('订单插入到位置:', newIndex);
            this.columnOrder.splice(newIndex, 0, draggedItem);
            
            // 重新渲染
            this.renderOrderSelectedColumns();
        }
        
        // 清理拖拽状态
        if (this.dragState.placeholder && this.dragState.placeholder.parentNode) {
            this.dragState.placeholder.parentNode.removeChild(this.dragState.placeholder);
            this.dragState.placeholder = null;
        }
        this.dragState.targetElement = null;
        this.dragState.insertAfter = false;
    },
    
    // 搜索过滤
    filterColumns(searchTerm) {
        const container = document.getElementById('orderCategorizedColumns');
        const items = container.querySelectorAll('.category-item');
        
        searchTerm = searchTerm.toLowerCase().trim();
        
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (searchTerm === '' || text.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    },
    
    // 清除搜索过滤
    clearOrderSearchFilter() {
        const container = document.getElementById('orderCategorizedColumns');
        const items = container.querySelectorAll('.category-item');
        items.forEach(item => {
            item.style.display = 'flex';
        });
    },
    
    // 初始化模块
    init() {
        console.log('订单数据模块初始化...');
        
        // 从localStorage加载可见列设置
        this.loadOrderColumnSettings();
        
        // 从localStorage加载列排序设置
        const savedOrder = localStorage.getItem('orderTableColumnOrder');
        if (savedOrder) {
            try {
                this.columnOrder = JSON.parse(savedOrder);
            } catch (e) {
                console.warn('无法解析保存的订单列排序设置，使用默认排序');
                this.columnOrder = [...this.visibleColumns];
            }
        } else {
            this.columnOrder = [...this.visibleColumns];
        }
        
        console.log('订单数据模块初始化完成');
    }
};

// 初始化订单数据模块
OrderDataModule.init();

// 全局函数（保持向后兼容）
window.OrderDataModule = OrderDataModule; 