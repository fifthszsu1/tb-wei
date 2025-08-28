/**
 * 数据管理模块
 * 负责数据列表的加载、搜索、导出、表格渲染、列管理等功能
 */

// 数据管理模块对象
const DataModule = {
    // ======================== 模块状态变量 ========================
    
    // 当前显示的列设置
    visibleColumns: [],
    
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
        
        const uploadStartDateElement = document.getElementById('uploadStartDateFilter');
        const uploadEndDateElement = document.getElementById('uploadEndDateFilter');
        const tmallProductCodeElement = document.getElementById('tmallProductCodeFilter');
        const productNameElement = document.getElementById('productNameFilter');
        const tmallSupplierNameElement = document.getElementById('tmallSupplierNameFilter');
        
        const uploadStartDate = uploadStartDateElement ? uploadStartDateElement.value : '';
        const uploadEndDate = uploadEndDateElement ? uploadEndDateElement.value : '';
        const tmallProductCode = tmallProductCodeElement ? tmallProductCodeElement.value : '';
        const productName = productNameElement ? productNameElement.value : '';
        const tmallSupplierName = tmallSupplierNameElement ? tmallSupplierNameElement.value : '';
        
        console.log('loadDataList被调用，参数:', { // 调试日志
            page: page,
            uploadStartDate: uploadStartDate,
            uploadEndDate: uploadEndDate,
            tmallProductCode: tmallProductCode,
            productName: productName,
            tmallSupplierName: tmallSupplierName
        });
        
        const filters = {
            uploadStartDate,
            uploadEndDate,
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
        // 验证日期区间
        const uploadStartDateElement = document.getElementById('uploadStartDateFilter');
        const uploadEndDateElement = document.getElementById('uploadEndDateFilter');
        
        if (uploadStartDateElement && uploadEndDateElement) {
            const startDate = uploadStartDateElement.value;
            const endDate = uploadEndDateElement.value;
            
            // 如果两个日期都有值，验证开始日期不能晚于结束日期
            if (startDate && endDate && startDate > endDate) {
                showAlert('开始日期不能晚于结束日期', 'warning');
                return;
            }
        }
        
        this.loadDataList(1);
    },

    // 清空过滤器
    clearFilters() {
        console.log('clearFilters函数被调用'); // 调试日志
        
        try {
            const uploadStartDateFilter = document.getElementById('uploadStartDateFilter');
            const uploadEndDateFilter = document.getElementById('uploadEndDateFilter');
            const tmallProductCodeFilter = document.getElementById('tmallProductCodeFilter');
            const productNameFilter = document.getElementById('productNameFilter');
            const tmallSupplierNameFilter = document.getElementById('tmallSupplierNameFilter');
            
            if (uploadStartDateFilter) uploadStartDateFilter.value = '';
            if (uploadEndDateFilter) uploadEndDateFilter.value = '';
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
        // 移除权限检查，允许所有用户导出数据
        // if (!AuthModule.checkAdminPermission()) {
        //     return;
        // }
        
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
        this.updateFrozenColumnPositions();
        
        // 调试信息
        console.log('表格渲染完成，冻结列位置已更新');
        console.log('可见列:', this.visibleColumns);
        console.log('冻结列:', ['upload_date', 'tmall_product_code', 'product_name', 'participating_activities', 'tmall_supplier_name', 'listing_time']);
        
        // 检查每列的实际位置
        this.visibleColumns.forEach((col, index) => {
            console.log(`第${index + 1}列: ${col}`);
        });
    },

    // 渲染表格头
    renderTableHeader() {
        const tableHeader = document.getElementById('tableHeader');
        tableHeader.innerHTML = '';
        
        // 按照visibleColumns的顺序来渲染列
        this.visibleColumns.forEach((columnKey, index) => {
            const column = AppConfig.TABLE_COLUMNS.find(col => col.key === columnKey);
            if (column) {
                const th = document.createElement('th');
                const width = parseInt(column.width);
                th.style.width = column.width;
                th.style.minWidth = width + 'px';
                th.style.maxWidth = column.width;
                th.className = 'resizable-column sortable-column';
                th.setAttribute('data-column', column.key);
                th.style.cursor = 'pointer';
                th.style.userSelect = 'none';
                th.style.position = 'relative';
                
                // 为前8列添加冻结列类名（日期、链接主图、天猫ID、产品、参与活动、店铺名、上架时间、链接负责人）
                const frozenColumns = ['upload_date', 'product_list_image', 'tmall_product_code', 'product_name', 'participating_activities', 'tmall_supplier_name', 'listing_time', 'product_list_operator'];
                if (frozenColumns.includes(column.key)) {
                    th.classList.add('frozen-column');
                    // 为最后一个冻结列添加特殊类名
                    if (column.key === 'product_list_operator') {
                        th.classList.add('last-frozen');
                    }
                }
                
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
            
            // 按照visibleColumns的顺序来渲染列
            this.visibleColumns.forEach(columnKey => {
                const column = AppConfig.TABLE_COLUMNS.find(col => col.key === columnKey);
                if (column) {
                    const cell = row.insertCell();
                    
                    // 为前8列添加冻结列类名（日期、链接主图、天猫ID、产品、参与活动、店铺名、上架时间、链接负责人）
                    const frozenColumns = ['upload_date', 'product_list_image', 'tmall_product_code', 'product_name', 'participating_activities', 'tmall_supplier_name', 'listing_time', 'product_list_operator'];
                    if (frozenColumns.includes(column.key)) {
                        cell.classList.add('frozen-column');
                        // 为最后一个冻结列添加特殊类名
                        if (column.key === 'product_list_operator') {
                            cell.classList.add('last-frozen');
                        }
                    }
                    
                    let value = item[column.key] || '-';
                    
                    // 特殊处理链接主图列
                    if (column.key === 'product_list_image') {
                        cell.innerHTML = this.renderMainImage(value);
                        return;
                    }
                    
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
                    // 特殊处理推广费用字段，添加点击事件
                    else if (['keyword_promotion', 'sitewide_promotion', 'product_operation', 'crowd_promotion', 'super_short_video', 'multi_target_direct'].includes(column.key) && value !== '-') {
                        const link = document.createElement('a');
                        link.href = '#';
                        link.textContent = value;
                        link.style.color = '#ffc107';
                        link.style.textDecoration = 'none';
                        link.style.cursor = 'pointer';
                        link.title = '点击查看主体报表数据';
                        
                        // 获取天猫ID用于关联查询
                        const tmallProductCode = item.tmall_product_code || '';
                        
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            if (tmallProductCode) {
                                showSubjectReport(tmallProductCode, column.key);
                            } else {
                                showAlert('无法获取商品ID，请检查数据完整性', 'warning');
                            }
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
                    const width = parseInt(column.width);
                    cell.style.width = column.width;
                    cell.style.minWidth = width + 'px';
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
                    cell.style.minWidth = width + 'px';
                }
            });
            
            // 如果是冻结列，需要重新计算后续冻结列的left位置
            const frozenColumns = ['upload_date', 'product_list_image', 'tmall_product_code', 'product_name', 'participating_activities', 'tmall_supplier_name', 'listing_time', 'product_list_operator'];
            if (frozenColumns.includes(columnKey)) {
                // 延迟更新，确保DOM已更新
                setTimeout(() => {
                    this.updateFrozenColumnPositions();
                }, 10);
            }
        }
    },
    
    // 更新冻结列位置
    updateFrozenColumnPositions() {
        const frozenColumns = ['upload_date', 'product_list_image', 'tmall_product_code', 'product_name', 'participating_activities', 'tmall_supplier_name', 'listing_time', 'product_list_operator'];
        let currentLeft = 0;
        
        // 清除之前的样式
        const existingStyles = document.querySelectorAll('style[data-frozen-columns]');
        existingStyles.forEach(style => style.remove());
        
        // 创建新的样式元素
        const style = document.createElement('style');
        style.setAttribute('data-frozen-columns', 'true');
        let styleContent = '';
        
        // 计算每个冻结列在可见列中的实际位置
        let frozenIndex = 0;
        this.visibleColumns.forEach((columnKey, visibleIndex) => {
            if (frozenColumns.includes(columnKey)) {
                const columnConfig = AppConfig.TABLE_COLUMNS.find(col => col.key === columnKey);
                if (columnConfig) {
                    const width = parseInt(columnConfig.width);
                    
                    // 为表头和数据行都设置位置
                    styleContent += `
                        #dataPage .table-container thead tr th:nth-child(${visibleIndex + 1}).frozen-column,
                        #dataPage .table-container tbody tr td:nth-child(${visibleIndex + 1}).frozen-column {
                            left: ${currentLeft}px !important;
                            z-index: 11;
                            background: white !important;
                            width: ${width}px !important;
                            min-width: ${width}px !important;
                            max-width: ${width}px !important;
                        }
                        #dataPage .table-container thead tr th:nth-child(${visibleIndex + 1}).frozen-column {
                            background: #212529 !important;
                        }
                    `;
                    
                    currentLeft += width;
                    frozenIndex++;
                }
            }
        });
        
        // 更新CSS中的冻结区域总宽度
        const totalFrozenWidth = currentLeft;
        styleContent += `
            #dataPage .table-container::before {
                width: ${totalFrozenWidth}px !important;
            }
        `;
        
        style.textContent = styleContent;
        document.head.appendChild(style);
        
        console.log('冻结列总宽度:', totalFrozenWidth + 'px');
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
    
    // 重置冻结列宽度
    resetFrozenColumnsWidth() {
        const frozenColumns = ['upload_date', 'product_list_image', 'tmall_product_code', 'product_name', 'participating_activities', 'tmall_supplier_name', 'listing_time', 'product_list_operator'];
        const defaultWidths = {
            'upload_date': '100px',
            'product_list_image': '80px',
            'tmall_product_code': '120px',
            'product_name': '200px',
            'participating_activities': '120px',
            'tmall_supplier_name': '150px',
            'listing_time': '100px',
            'product_list_operator': '120px'
        };
        
        AppConfig.TABLE_COLUMNS.forEach(column => {
            if (frozenColumns.includes(column.key)) {
                column.width = defaultWidths[column.key];
            }
        });
        
        this.saveColumnWidths();
        console.log('冻结列宽度已重置');
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
    showColumnSelector() {
        const selector = document.getElementById('columnSelector');
        this.renderCategorizedColumns();
        this.renderSelectedColumns();
        selector.style.display = 'block';
        
        // 清空搜索框
        const searchInput = document.getElementById('columnSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }
    },

    // 隐藏列选择器
    hideColumnSelector() {
        document.getElementById('columnSelector').style.display = 'none';
        this.clearSearchFilter();
    },
    
    // 渲染分类列表
    renderCategorizedColumns() {
        const container = document.getElementById('categorizedColumns');
        container.innerHTML = '';
        
        // 按分类分组
        const categories = {
            'sales': { name: '销售数据', columns: [] },
            'traffic': { name: '流量转化', columns: [] },
            'cost': { name: '成本费用', columns: [] },
            'planting': { name: '种菜相关', columns: [] }
        };
        
        AppConfig.TABLE_COLUMNS.forEach(column => {
            // 跳过冻结列
            if (column.frozen) return;
            
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
                        this.addColumn(column.key);
                    });
                }
                
                categoryDiv.appendChild(itemDiv);
            });
            
            container.appendChild(categoryDiv);
        });
    },
    
    // 渲染已选择列表
    renderSelectedColumns() {
        const container = document.getElementById('selectedColumnsList');
        const countElement = document.getElementById('selectedCount');
        
        // 获取非冻结的可见列
        const selectedColumns = this.visibleColumns.filter(key => 
            !AppConfig.TABLE_COLUMNS.find(col => col.key === key)?.frozen
        );
        
        // 初始化或更新列排序顺序
        if (this.columnOrder.length === 0) {
            this.columnOrder = [...selectedColumns];
        } else {
            // 添加新选择的列到末尾
            selectedColumns.forEach(key => {
                if (!this.columnOrder.includes(key)) {
                    this.columnOrder.push(key);
                }
            });
            // 移除未选择的列
            this.columnOrder = this.columnOrder.filter(key => selectedColumns.includes(key));
        }
        
        container.innerHTML = '';
        countElement.textContent = this.columnOrder.length;
        
        this.columnOrder.forEach((columnKey, index) => {
            const column = AppConfig.TABLE_COLUMNS.find(col => col.key === columnKey);
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
            this.bindDragEvents(itemDiv);
            
            // 移除按钮事件
            const removeBtn = itemDiv.querySelector('.remove-btn');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeColumn(columnKey);
            });
            
            container.appendChild(itemDiv);
        });
    },
    
    // 添加列
    addColumn(columnKey) {
        if (!this.visibleColumns.includes(columnKey)) {
            this.visibleColumns.push(columnKey);
            this.columnOrder.push(columnKey);
            this.renderCategorizedColumns();
            this.renderSelectedColumns();
        }
    },
    
    // 移除列
    removeColumn(columnKey) {
        this.visibleColumns = this.visibleColumns.filter(key => key !== columnKey);
        this.columnOrder = this.columnOrder.filter(key => key !== columnKey);
        this.renderCategorizedColumns();
        this.renderSelectedColumns();
    },
    
    // 绑定拖拽事件
    bindDragEvents(element) {
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
                this.handleDragOver(e, element);
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
                this.handleDrop(e, element);
            }
        });
    },
    
    // 处理拖拽悬停
    handleDragOver(e, targetElement) {
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
    handleDrop(e, targetElement) {
        const targetIndex = parseInt(targetElement.getAttribute('data-index'));
        const draggedIndex = this.dragState.draggedIndex;
        
        if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
            console.log('拖拽操作:', { draggedIndex, targetIndex });
            
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
            
            console.log('插入到位置:', newIndex);
            this.columnOrder.splice(newIndex, 0, draggedItem);
            
            // 重新渲染
            this.renderSelectedColumns();
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
        const container = document.getElementById('categorizedColumns');
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
    clearSearchFilter() {
        const container = document.getElementById('categorizedColumns');
        const items = container.querySelectorAll('.category-item');
        items.forEach(item => {
            item.style.display = 'flex';
        });
    },
    
    // 应用列设置
    applyColumnSettings() {
        // 重新排序可见列，将冻结列放在最前面，然后按用户排序的顺序排列
        const frozenColumns = AppConfig.TABLE_COLUMNS.filter(col => col.frozen).map(col => col.key);
        const orderedNonFrozenColumns = this.columnOrder.filter(key => this.visibleColumns.includes(key));
        
        this.visibleColumns = [...frozenColumns, ...orderedNonFrozenColumns];
        
        console.log('应用列设置:', {
            frozenColumns,
            orderedNonFrozenColumns,
            finalVisibleColumns: this.visibleColumns,
            columnOrder: this.columnOrder
        });
        
        // 保存设置
        localStorage.setItem('dataTableVisibleColumns', JSON.stringify(this.visibleColumns));
        localStorage.setItem('dataTableColumnOrder', JSON.stringify(this.columnOrder));
        
        // 重新渲染表格
        this.loadDataList();
        this.hideColumnSelector();
    },
    
    // 重置列设置
    resetColumns() {
        this.visibleColumns = AppConfig.TABLE_COLUMNS
            .filter(col => col.defaultVisible)
            .map(col => col.key);
        this.columnOrder = AppConfig.TABLE_COLUMNS
            .filter(col => col.defaultVisible && !col.frozen)
            .map(col => col.key);
        
        this.renderCategorizedColumns();
        this.renderSelectedColumns();
    },



    // ======================== 图片展示功能 ========================
    
    // 渲染链接主图
    renderMainImage(imageUrl) {
        if (!imageUrl || imageUrl.trim() === '' || imageUrl === '-') {
            return '<span class="text-muted">-</span>';
        }
        
        const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const escapedUrl = this.escapeHtml(imageUrl);
        return `
            <div class="image-container" style="display: flex; align-items: center; position: relative;">
                <img id="${imageId}" src="${escapedUrl}" 
                     style="width: 50px; height: 50px; object-fit: cover; cursor: pointer; border-radius: 4px; border: 1px solid #ddd; transition: transform 0.2s ease;" 
                     onclick="DataModule.showImageModal('${escapedUrl}')"
                     onmouseenter="DataModule.showHoverPreview(event, '${escapedUrl}')"
                     onmousemove="DataModule.updateHoverPreviewPosition(event)"
                     onmouseleave="DataModule.hideHoverPreview()"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';" />
                <span style="display: none; color: #999; font-size: 12px;">图片加载失败</span>
            </div>
        `;
    },

    // HTML转义
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function (m) {
            return map[m];
        });
    },

    // 显示图片模态框
    showImageModal(imageUrl) {
        const escapedUrl = this.escapeHtml(imageUrl);
        
        // 创建模态框HTML
        const modalHtml = `
            <div class="modal fade" id="imageModal" tabindex="-1" aria-labelledby="imageModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="imageModalLabel">产品图片</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
                        </div>
                        <div class="modal-body text-center">
                            <img src="${escapedUrl}" class="img-fluid" style="max-height: 70vh;" 
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                            <div style="display: none; color: #999; padding: 50px;">
                                <i class="fas fa-exclamation-triangle"></i><br>
                                图片加载失败
                            </div>
                        </div>
                        <div class="modal-footer">
                            <a href="${escapedUrl}" target="_blank" class="btn btn-primary">
                                <i class="fas fa-external-link-alt"></i> 在新窗口打开
                            </a>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 移除已存在的模态框
        const existingModal = document.getElementById('imageModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 添加新模态框到页面
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('imageModal'));
        modal.show();
        
        // 模态框关闭后清理DOM
        document.getElementById('imageModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    },

    // ======================== 悬浮预览功能 ========================

    // 悬浮预览相关状态
    hoverPreviewContainer: null,
    hoverPreviewTimeout: null,
    previewImageCache: new Map(), // 图片预加载缓存

    // 显示悬浮预览
    showHoverPreview(event, imageUrl) {
        // 清除之前的定时器
        if (this.hoverPreviewTimeout) {
            clearTimeout(this.hoverPreviewTimeout);
        }

        // 延迟显示预览，避免快速移动时闪烁
        this.hoverPreviewTimeout = setTimeout(() => {
            this.createHoverPreview(event, imageUrl);
        }, 300);
    },

    // 创建悬浮预览容器
    createHoverPreview(event, imageUrl) {
        // 移除已存在的预览
        this.hideHoverPreview();

        // 创建预览容器
        this.hoverPreviewContainer = document.createElement('div');
        this.hoverPreviewContainer.className = 'image-hover-preview';
        
        // 初始显示加载状态
        this.hoverPreviewContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i><br>
                加载中...
            </div>
        `;

        // 添加到页面
        document.body.appendChild(this.hoverPreviewContainer);

        // 设置初始位置
        this.updatePreviewPosition(event);

        // 预加载图片
        this.loadPreviewImage(imageUrl);

        // 显示动画
        requestAnimationFrame(() => {
            this.hoverPreviewContainer.classList.add('show');
        });
    },

    // 预加载图片
    loadPreviewImage(imageUrl) {
        // 检查缓存
        if (this.previewImageCache.has(imageUrl)) {
            const cachedImage = this.previewImageCache.get(imageUrl);
            if (cachedImage.complete && cachedImage.naturalWidth > 0) {
                this.showPreviewImage(cachedImage.src);
                return;
            }
        }

        // 创建新的图片对象
        const img = new Image();
        
        img.onload = () => {
            // 缓存成功加载的图片
            this.previewImageCache.set(imageUrl, img);
            
            // 如果预览容器还存在，显示图片
            if (this.hoverPreviewContainer) {
                this.showPreviewImage(imageUrl);
            }
        };

        img.onerror = () => {
            // 如果预览容器还存在，显示错误信息
            if (this.hoverPreviewContainer) {
                this.showPreviewError();
            }
        };

        // 开始加载图片
        img.src = imageUrl;
    },

    // 显示预览图片
    showPreviewImage(imageUrl) {
        if (!this.hoverPreviewContainer) return;

        this.hoverPreviewContainer.innerHTML = `
            <img src="${this.escapeHtml(imageUrl)}" alt="产品图片预览" />
        `;
    },

    // 显示预览错误
    showPreviewError() {
        if (!this.hoverPreviewContainer) return;

        this.hoverPreviewContainer.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i><br>
                图片加载失败
            </div>
        `;
    },

    // 更新预览位置
    updatePreviewPosition(event) {
        if (!this.hoverPreviewContainer) return;

        const preview = this.hoverPreviewContainer;
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        
        // 获取窗口尺寸
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // 预览框的预估尺寸
        const previewWidth = 400;
        const previewHeight = 400;
        
        // 计算最佳位置
        let left = mouseX + 15; // 鼠标右侧15px
        let top = mouseY - previewHeight / 2; // 垂直居中于鼠标
        
        // 防止超出右边界
        if (left + previewWidth > windowWidth - 20) {
            left = mouseX - previewWidth - 15; // 显示在鼠标左侧
        }
        
        // 防止超出上边界
        if (top < 20) {
            top = 20;
        }
        
        // 防止超出下边界
        if (top + previewHeight > windowHeight - 20) {
            top = windowHeight - previewHeight - 20;
        }
        
        // 防止超出左边界
        if (left < 20) {
            left = 20;
        }

        preview.style.left = left + 'px';
        preview.style.top = top + 'px';
    },

    // 隐藏悬浮预览
    hideHoverPreview() {
        // 清除定时器
        if (this.hoverPreviewTimeout) {
            clearTimeout(this.hoverPreviewTimeout);
            this.hoverPreviewTimeout = null;
        }

        // 移除预览容器
        if (this.hoverPreviewContainer) {
            this.hoverPreviewContainer.classList.remove('show');
            
            // 等待动画完成后移除元素
            setTimeout(() => {
                if (this.hoverPreviewContainer && this.hoverPreviewContainer.parentNode) {
                    this.hoverPreviewContainer.parentNode.removeChild(this.hoverPreviewContainer);
                }
                this.hoverPreviewContainer = null;
            }, 300);
        }
    },

    // 更新悬浮预览位置（用于鼠标移动时）
    updateHoverPreviewPosition(event) {
        if (this.hoverPreviewContainer && this.hoverPreviewContainer.classList.contains('show')) {
            this.updatePreviewPosition(event);
        }
    },
    
    // ======================== 模块初始化 ========================
    
    // 初始化模块
    init() {
        console.log('数据模块初始化...');
        
        // 从localStorage加载可见列设置
        const saved = localStorage.getItem('dataTableVisibleColumns');
        if (saved) {
            try {
                this.visibleColumns = JSON.parse(saved);
            } catch (e) {
                console.warn('无法解析保存的列设置，使用默认设置');
                this.visibleColumns = AppConfig.TABLE_COLUMNS
                    .filter(col => col.defaultVisible)
                    .map(col => col.key);
            }
        } else {
            this.visibleColumns = AppConfig.TABLE_COLUMNS
                .filter(col => col.defaultVisible)
                .map(col => col.key);
        }
        
        // 从localStorage加载列排序设置
        const savedOrder = localStorage.getItem('dataTableColumnOrder');
        if (savedOrder) {
            try {
                this.columnOrder = JSON.parse(savedOrder);
            } catch (e) {
                console.warn('无法解析保存的列排序设置，使用默认排序');
                this.columnOrder = AppConfig.TABLE_COLUMNS
                    .filter(col => col.defaultVisible && !col.frozen)
                    .map(col => col.key);
            }
        } else {
            this.columnOrder = AppConfig.TABLE_COLUMNS
                .filter(col => col.defaultVisible && !col.frozen)
                .map(col => col.key);
        }
        
        // 加载列宽设置
        this.loadColumnWidths();
        
        console.log('数据模块初始化完成');
    }
};

// 初始化数据模块
DataModule.init();

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
window.resetFrozenColumnsWidth = () => DataModule.resetFrozenColumnsWidth(); 