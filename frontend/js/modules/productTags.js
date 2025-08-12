/**
 * 产品标签管理模块
 * 负责产品标签列表的加载、搜索、编辑活动列表等功能
 */

const ProductTagsModule = {
    // ======================== 模块状态变量 ========================
    
    // 当前页大小
    currentPageSize: 20,
    
    // 批量选择相关状态
    selectedProducts: new Set(), // 存储选中的产品ID
    currentPageProducts: [], // 当前页面的产品数据,
    
    // 当前排序状态
    currentSortBy: 'created_at',
    currentSortOrder: 'desc',
    
    // 当前编辑的产品信息
    currentEditingProduct: null,

    // 列宽调整相关状态
    isResizing: false,
    currentColumn: null,
    startX: 0,
    startWidth: 0,

    // ======================== 数据管理核心功能 ========================

    // 加载产品标签列表
    loadProductTagsList(page = 1) {
        // 移除权限检查，允许所有用户加载数据
        // if (!AuthModule.isAdmin()) return;
        
        const productIdElement = document.getElementById('productIdFilter');
        const productNameElement = document.getElementById('productNameTagFilter');
        const listingTimeElement = document.getElementById('listingTimeFilter');
        const tmallSupplierIdElement = document.getElementById('tmallSupplierIdFilter');
        const operatorElement = document.getElementById('operatorFilter');
        
        const productId = productIdElement ? productIdElement.value : '';
        const productName = productNameElement ? productNameElement.value : '';
        const listingTime = listingTimeElement ? listingTimeElement.value : '';
        const tmallSupplierId = tmallSupplierIdElement ? tmallSupplierIdElement.value : '';
        const operator = operatorElement ? operatorElement.value : '';
        
        console.log('loadProductTagsList被调用，参数:', {
            page: page,
            productId: productId,
            productName: productName,
            listingTime: listingTime,
            tmallSupplierId: tmallSupplierId,
            operator: operator
        });
        
        const filters = {
            product_id: productId,
            product_name: productName,
            listing_time: listingTime,
            tmall_supplier_id: tmallSupplierId,
            operator: operator
        };
        
        APIService.getProductTags(page, filters, this.currentPageSize, this.currentSortBy, this.currentSortOrder)
        .then(data => {
            console.log('接收到产品标签数据:', data.total, '条记录');
            this.renderProductTagsTable(data.data);
            this.renderPagination(data.current_page, data.pages);
            this.updateDataInfo(data.current_page, data.per_page, data.total);
        })
        .catch(error => {
            console.error('加载产品标签失败:', error);
            showAlert('加载产品标签失败：' + error.message, 'danger');
        });
    },

    // 搜索数据
    searchData() {
        this.loadProductTagsList(1);
    },

    // 重置搜索过滤条件
    resetFilters() {
        document.getElementById('productIdFilter').value = '';
        document.getElementById('productNameTagFilter').value = '';
        document.getElementById('listingTimeFilter').value = '';
        document.getElementById('tmallSupplierIdFilter').value = '';
        document.getElementById('operatorFilter').value = '';
        this.loadProductTagsList(1);
    },

    // 刷新数据
    refreshData() {
        this.loadProductTagsList();
    },

    // 改变页面大小
    changePageSize() {
        const pageSize = document.getElementById('productTagsPageSize').value;
        this.currentPageSize = parseInt(pageSize);
        this.loadProductTagsList(1);
    },

    // ======================== 表格渲染功能 ========================

    // 渲染产品标签表格
    renderProductTagsTable(data) {
        const tbody = document.getElementById('productTagsTableBody');
        
        // 存储当前页面的产品数据
        this.currentPageProducts = data || [];
        
        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center text-muted">
                        <i class="fas fa-info-circle"></i> 暂无数据
                    </td>
                </tr>
            `;
            this.updateSelectionUI();
            return;
        }

        let html = '';
        data.forEach(item => {
            const actionListDisplay = this.formatActionList(item.action_list);
            const isSelected = this.selectedProducts.has(item.id);
            
            html += `
                <tr>
                    <td>
                        <div class="form-check">
                            <input class="form-check-input product-checkbox" type="checkbox" 
                                   value="${item.id}" ${isSelected ? 'checked' : ''}
                                   onchange="ProductTagsModule.toggleProductSelection(${item.id}, this.checked)">
                            <label class="form-check-label"></label>
                        </div>
                    </td>
                    <td>${this.renderMainImage(item.main_image_url)}</td>
                    <td>${this.escapeHtml(item.product_id || '')}</td>
                    <td title="${this.escapeHtml(item.product_name || '')}" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${this.escapeHtml(item.product_name || '')}
                    </td>
                    <td>${item.listing_time || '-'}</td>
                    <td>${this.escapeHtml(item.tmall_supplier_id || '-')}</td>
                    <td>${this.renderNetworkPath(item.network_disk_path)}</td>
                    <td>${this.escapeHtml(item.operator || '-')}</td>
                    <td>${actionListDisplay}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="ProductTagsModule.editActions(${item.id})">
                            <i class="fas fa-edit"></i> 编辑
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        this.updateSelectionUI();
    },

    // 格式化活动列表显示
    formatActionList(actionList) {
        if (!actionList || !Array.isArray(actionList) || actionList.length === 0) {
            return '<span class="text-muted">暂无活动</span>';
        }

        let html = '<div>';
        actionList.forEach((action, index) => {
            if (index < 2) { // 只显示前两个活动
                html += `<span class="badge bg-primary me-1 mb-1">${this.escapeHtml(action.name || '')}</span>`;
            }
        });
        
        if (actionList.length > 2) {
            html += `<span class="text-muted">等${actionList.length}个活动</span>`;
        }
        html += '</div>';
        
        return html;
    },

    // ======================== 分页功能 ========================

    // 渲染分页
    renderPagination(currentPage, totalPages) {
        const pagination = document.getElementById('productTagsPagination');
        const paginationInfo = document.getElementById('productTagsPaginationInfo');
        
        paginationInfo.textContent = `第 ${currentPage} 页，共 ${totalPages} 页`;
        
        let html = '';
        
        // 上一页
        html += `<li class="page-item ${currentPage <= 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="ProductTagsModule.loadProductTagsList(${currentPage - 1})">上一页</a>
        </li>`;
        
        // 页码显示逻辑
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            html += `<li class="page-item"><a class="page-link" href="#" onclick="ProductTagsModule.loadProductTagsList(1)">1</a></li>`;
            if (startPage > 2) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="ProductTagsModule.loadProductTagsList(${i})">${i}</a>
            </li>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            html += `<li class="page-item"><a class="page-link" href="#" onclick="ProductTagsModule.loadProductTagsList(${totalPages})">${totalPages}</a></li>`;
        }
        
        // 下一页
        html += `<li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="ProductTagsModule.loadProductTagsList(${currentPage + 1})">下一页</a>
        </li>`;
        
        pagination.innerHTML = html;
    },

    // 更新数据信息
    updateDataInfo(currentPage, perPage, total) {
        const dataInfo = document.getElementById('productTagsDataInfo');
        const start = (currentPage - 1) * perPage + 1;
        const end = Math.min(currentPage * perPage, total);
        dataInfo.textContent = `显示 ${start}-${end} 条，共 ${total} 条记录`;
    },

    // ======================== 活动编辑功能 ========================

    // 编辑活动列表
    editActions(productId) {
        APIService.getProductTagDetail(productId)
        .then(data => {
            this.currentEditingProduct = data.data;
            this.showActionEditModal();
        })
        .catch(error => {
            console.error('获取产品详情失败:', error);
            showAlert('获取产品详情失败：' + error.message, 'danger');
        });
    },

    // 显示活动编辑模态框
    showActionEditModal() {
        if (!this.currentEditingProduct) return;

        document.getElementById('editProductId').value = this.currentEditingProduct.product_id || '';
        document.getElementById('editProductName').value = this.currentEditingProduct.product_name || '';
        
        this.renderActionList();
        
        const modal = new bootstrap.Modal(document.getElementById('actionEditModal'));
        modal.show();
    },

    // 渲染活动列表编辑界面
    renderActionList() {
        const container = document.getElementById('actionListContainer');
        const actionList = this.currentEditingProduct.action_list || [];
        
        let html = '';
        
        actionList.forEach((action, index) => {
            html += this.generateActionEditHtml(action, index);
        });
        
        if (actionList.length === 0) {
            html = '<div class="text-muted text-center py-3">暂无活动，点击上方"新增活动"按钮添加</div>';
        }
        
        container.innerHTML = html;
    },

    // 将Date对象格式化为本地日期字符串（YYYY-MM-DD）
    formatDateToLocal(date) {
        if (!date) return '';
        
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    },

    // 将Date对象转换为本地时间的ISO格式字符串
    toLocalISOString(date) {
        if (!date) return '';
        
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    },

    // 生成单个活动编辑HTML
    generateActionEditHtml(action, index) {
        // 解析预热时间
        const warmupDateTime = action.warmup_time ? new Date(action.warmup_time) : null;
        const warmupDate = warmupDateTime ? this.formatDateToLocal(warmupDateTime) : '';
        const warmupHour = warmupDateTime ? warmupDateTime.getHours().toString().padStart(2, '0') : '00';
        const warmupMinute = warmupDateTime ? Math.floor(warmupDateTime.getMinutes() / 10) * 10 : 0;
        
        // 解析开始时间
        const startDateTime = action.start_time ? new Date(action.start_time) : (action.start_date ? new Date(action.start_date + 'T00:00:00') : null);
        const startDate = startDateTime ? this.formatDateToLocal(startDateTime) : (action.start_date || '');
        const startHour = startDateTime ? startDateTime.getHours().toString().padStart(2, '0') : '00';
        const startMinute = startDateTime ? Math.floor(startDateTime.getMinutes() / 10) * 10 : 0;
        
        // 解析结束时间
        const endDateTime = action.end_time ? new Date(action.end_time) : (action.end_date ? new Date(action.end_date + 'T23:59:59') : null);
        const endDate = endDateTime ? this.formatDateToLocal(endDateTime) : (action.end_date || '');
        const endHour = endDateTime ? endDateTime.getHours().toString().padStart(2, '0') : '23';
        const endMinute = endDateTime ? Math.floor(endDateTime.getMinutes() / 10) * 10 : 50;
        
        return `
            <div class="card mb-3" data-action-index="${index}">
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-md-4">
                            <label class="form-label">活动名称 <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" value="${this.escapeHtml(action.name || '')}" 
                                   onchange="ProductTagsModule.updateActionField(${index}, 'name', this.value)">
                        </div>
                        <div class="col-md-8">
                            <label class="form-label">预热时间 <span class="text-muted">(可选)</span></label>
                            <div class="row g-2">
                                <div class="col-6">
                                    <input type="date" class="form-control" value="${warmupDate}" 
                                           onchange="ProductTagsModule.updateActionDateTime(${index}, 'warmup_time', 'date', this.value)">
                                </div>
                                <div class="col-3">
                                    <select class="form-select" onchange="ProductTagsModule.updateActionDateTime(${index}, 'warmup_time', 'hour', this.value)">
                                        ${this.generateHourOptions(warmupHour)}
                                    </select>
                                </div>
                                <div class="col-3">
                                    <select class="form-select" onchange="ProductTagsModule.updateActionDateTime(${index}, 'warmup_time', 'minute', this.value)">
                                        ${this.generateMinuteOptions(warmupMinute)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-4">
                            <label class="form-label">开始日期 <span class="text-danger">*</span></label>
                            <div class="row g-2">
                                <div class="col-12 mb-2">
                                    <input type="date" class="form-control" value="${startDate}" 
                                           onchange="ProductTagsModule.updateActionDateTime(${index}, 'start_time', 'date', this.value)">
                                </div>
                                <div class="col-6">
                                    <select class="form-select" onchange="ProductTagsModule.updateActionDateTime(${index}, 'start_time', 'hour', this.value)">
                                        ${this.generateHourOptions(startHour)}
                                    </select>
                                </div>
                                <div class="col-6">
                                    <select class="form-select" onchange="ProductTagsModule.updateActionDateTime(${index}, 'start_time', 'minute', this.value)">
                                        ${this.generateMinuteOptions(startMinute)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">结束日期 <span class="text-danger">*</span></label>
                            <div class="row g-2">
                                <div class="col-12 mb-2">
                                    <input type="date" class="form-control" value="${endDate}" 
                                           onchange="ProductTagsModule.updateActionDateTime(${index}, 'end_time', 'date', this.value)">
                                </div>
                                <div class="col-6">
                                    <select class="form-select" onchange="ProductTagsModule.updateActionDateTime(${index}, 'end_time', 'hour', this.value)">
                                        ${this.generateHourOptions(endHour)}
                                    </select>
                                </div>
                                <div class="col-6">
                                    <select class="form-select" onchange="ProductTagsModule.updateActionDateTime(${index}, 'end_time', 'minute', this.value)">
                                        ${this.generateMinuteOptions(endMinute)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">&nbsp;</label>
                            <div class="d-flex align-items-end h-100 pb-3">
                                <button type="button" class="btn btn-danger btn-sm" onclick="ProductTagsModule.removeAction(${index})">
                                    <i class="fas fa-trash"></i> 删除
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // 生成小时选项
    generateHourOptions(selectedHour) {
        let options = '';
        for (let i = 0; i < 24; i++) {
            const hourStr = i.toString().padStart(2, '0');
            const selected = hourStr === selectedHour ? 'selected' : '';
            options += `<option value="${hourStr}" ${selected}>${hourStr}时</option>`;
        }
        return options;
    },

    // 生成分钟选项（只有0,10,20,30,40,50）
    generateMinuteOptions(selectedMinute) {
        const minutes = [0, 10, 20, 30, 40, 50];
        let options = '';
        for (let minute of minutes) {
            const minuteStr = minute.toString().padStart(2, '0');
            const selected = minute === selectedMinute ? 'selected' : '';
            options += `<option value="${minute}" ${selected}>${minuteStr}分</option>`;
        }
        return options;
    },

    // 更新活动日期时间字段
    updateActionDateTime(index, timeType, component, value) {
        if (!this.currentEditingProduct.action_list || !this.currentEditingProduct.action_list[index]) {
            return;
        }

        const action = this.currentEditingProduct.action_list[index];
        
        // 获取当前的日期时间值
        let currentDateTime = null;
        if (timeType === 'warmup_time' && action.warmup_time) {
            currentDateTime = new Date(action.warmup_time);
        } else if (timeType === 'start_time') {
            currentDateTime = action.start_time ? new Date(action.start_time) : 
                            (action.start_date ? new Date(action.start_date + 'T00:00:00') : new Date());
        } else if (timeType === 'end_time') {
            currentDateTime = action.end_time ? new Date(action.end_time) : 
                            (action.end_date ? new Date(action.end_date + 'T23:59:59') : new Date());
        }

        // 如果是预热时间且没有设置过，初始化为null
        if (timeType === 'warmup_time' && !currentDateTime && component !== 'date') {
            return;
        }

        // 如果是预热时间的日期输入且值为空，清空预热时间
        if (timeType === 'warmup_time' && component === 'date' && !value) {
            action.warmup_time = null;
            return;
        }

        // 如果是预热时间的日期输入且有值，但之前没有设置过预热时间，初始化时间
        if (timeType === 'warmup_time' && component === 'date' && value && !currentDateTime) {
            currentDateTime = new Date(value + 'T00:00:00');
        }

        // 如果还是没有有效的日期时间对象，创建一个
        if (!currentDateTime) {
            if (component === 'date' && value) {
                currentDateTime = new Date(value + 'T00:00:00');
            } else {
                currentDateTime = new Date();
            }
        }

        // 根据组件类型更新对应的部分
        switch (component) {
            case 'date':
                if (value) {
                    const dateParts = value.split('-');
                    currentDateTime.setFullYear(parseInt(dateParts[0]));
                    currentDateTime.setMonth(parseInt(dateParts[1]) - 1);
                    currentDateTime.setDate(parseInt(dateParts[2]));
                } else {
                    return; // 如果日期为空，不更新
                }
                break;
            case 'hour':
                currentDateTime.setHours(parseInt(value));
                break;
            case 'minute':
                currentDateTime.setMinutes(parseInt(value));
                break;
        }

        // 更新活动对象（使用本地时间格式避免时区问题）
        action[timeType] = this.toLocalISOString(currentDateTime);
        
        // 为了向后兼容，同时更新旧的字段格式
        if (timeType === 'start_time') {
            action.start_date = this.formatDateToLocal(currentDateTime);
        } else if (timeType === 'end_time') {
            action.end_date = this.formatDateToLocal(currentDateTime);
        }
    },

    // 新增活动
    addNewAction() {
        if (!this.currentEditingProduct.action_list) {
            this.currentEditingProduct.action_list = [];
        }
        
        this.currentEditingProduct.action_list.push({
            name: '',
            start_date: '',
            end_date: ''
        });
        
        this.renderActionList();
    },

    // 更新活动字段
    updateActionField(index, field, value) {
        if (this.currentEditingProduct.action_list && this.currentEditingProduct.action_list[index]) {
            this.currentEditingProduct.action_list[index][field] = value;
        }
    },

    // 删除活动
    removeAction(index) {
        if (this.currentEditingProduct.action_list && this.currentEditingProduct.action_list[index]) {
            this.currentEditingProduct.action_list.splice(index, 1);
            this.renderActionList();
        }
    },

    // 保存活动列表
    saveActions() {
        if (!this.currentEditingProduct) return;

        // 验证活动数据
        const actionList = this.currentEditingProduct.action_list || [];
        for (let i = 0; i < actionList.length; i++) {
            const action = actionList[i];
            
            // 检查必填字段
            if (!action.name) {
                showAlert(`第${i + 1}个活动的活动名称不能为空`, 'warning');
                return;
            }
            
            // 检查开始时间和结束时间
            const startTime = action.start_time || (action.start_date ? action.start_date + 'T00:00:00' : null);
            const endTime = action.end_time || (action.end_date ? action.end_date + 'T23:59:59' : null);
            
            if (!startTime || !endTime) {
                showAlert(`第${i + 1}个活动的开始时间和结束时间不能为空`, 'warning');
                return;
            }
            
            const startDateTime = new Date(startTime);
            const endDateTime = new Date(endTime);
            
            if (startDateTime >= endDateTime) {
                showAlert(`第${i + 1}个活动的开始时间不能晚于或等于结束时间`, 'warning');
                return;
            }
            
            // 检查预热时间（如果设置了）
            if (action.warmup_time) {
                const warmupDateTime = new Date(action.warmup_time);
                if (warmupDateTime >= startDateTime) {
                    showAlert(`第${i + 1}个活动的预热时间不能晚于或等于开始时间`, 'warning');
                    return;
                }
            }
        }

        APIService.updateProductActions(this.currentEditingProduct.id, actionList)
        .then(data => {
            showAlert('活动列表更新成功', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('actionEditModal'));
            modal.hide();
            this.refreshData(); // 刷新列表
        })
        .catch(error => {
            console.error('更新活动列表失败:', error);
            showAlert('更新活动列表失败：' + error.message, 'danger');
        });
    },

    // ======================== 批量选择功能 ========================

    // 切换单个产品的选择状态
    toggleProductSelection(productId, isSelected) {
        if (isSelected) {
            this.selectedProducts.add(productId);
        } else {
            this.selectedProducts.delete(productId);
        }
        this.updateSelectionUI();
    },

    // 切换当前页所有产品的选择状态
    toggleAllSelection(isSelected) {
        this.currentPageProducts.forEach(product => {
            if (isSelected) {
                this.selectedProducts.add(product.id);
            } else {
                this.selectedProducts.delete(product.id);
            }
        });
        
        // 更新页面中的复选框状态
        const checkboxes = document.querySelectorAll('.product-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = isSelected;
        });
        
        this.updateSelectionUI();
    },

    // 获取当前的搜索过滤条件
    getCurrentFilters() {
        return {
            product_id: document.getElementById('productIdFilter')?.value || '',
            product_name: document.getElementById('productNameTagFilter')?.value || '',
            listing_time: document.getElementById('listingTimeFilter')?.value || '',
            tmall_supplier_id: document.getElementById('tmallSupplierIdFilter')?.value || '',
            operator: document.getElementById('operatorFilter')?.value || ''
        };
    },

    // 全选（所有页面）
    async selectAll() {
        try {
            // 显示加载提示
            const selectAllBtn = document.getElementById('selectAllBtn');
            if (selectAllBtn) {
                selectAllBtn.disabled = true;
                selectAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 全选中...';
            }

            // 获取当前的过滤条件
            const filters = this.getCurrentFilters();
            const hasFilters = Object.values(filters).some(value => value.trim() !== '');
            
            // 调用API获取所有产品ID
            const response = await APIService.getAllProductIds(filters);
            const allProductIds = response.product_ids || [];
            
            if (allProductIds.length === 0) {
                showAlert('没有找到可选择的产品', 'warning');
                return;
            }
            
            // 将所有产品ID添加到选择集合中
            allProductIds.forEach(id => {
                this.selectedProducts.add(id);
            });
            
            // 更新当前页面的复选框状态
            const checkboxes = document.querySelectorAll('.product-checkbox');
            checkboxes.forEach(checkbox => {
                const productId = parseInt(checkbox.value);
                if (allProductIds.includes(productId)) {
                    checkbox.checked = true;
                }
            });
            
            // 更新UI显示
            this.updateSelectionUI();
            
            // 根据是否有过滤条件显示不同的提示信息
            if (hasFilters) {
                showAlert(`已选择所有 ${allProductIds.length} 个搜索结果`, 'success');
            } else {
                showAlert(`已选择所有 ${allProductIds.length} 个产品`, 'success');
            }
            
        } catch (error) {
            console.error('全选失败:', error);
            showAlert('全选失败：' + error.message, 'danger');
        } finally {
            // 恢复按钮的disabled状态，文本由updateSelectionUI方法统一处理
            const selectAllBtn = document.getElementById('selectAllBtn');
            if (selectAllBtn) {
                selectAllBtn.disabled = false;
                // 如果按钮文本还是loading状态，恢复为默认状态
                if (selectAllBtn.innerHTML.includes('fa-spinner')) {
                    const filters = this.getCurrentFilters();
                    const hasFilters = Object.values(filters).some(value => value.trim() !== '');
                    
                    if (hasFilters) {
                        selectAllBtn.innerHTML = '<i class="fas fa-check-square"></i> 全选搜索结果';
                    } else {
                        selectAllBtn.innerHTML = '<i class="fas fa-check-square"></i> 全选';
                    }
                }
            }
        }
    },

    // 清空选择
    clearSelection() {
        this.selectedProducts.clear();
        
        // 更新页面中的复选框状态
        const checkboxes = document.querySelectorAll('.product-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // 更新全选复选框状态
        const masterCheckbox = document.getElementById('masterCheckbox');
        if (masterCheckbox) {
            masterCheckbox.checked = false;
            masterCheckbox.indeterminate = false;
        }
        
        this.updateSelectionUI();
    },

    // 更新选择状态的UI显示
    updateSelectionUI() {
        const selectedCount = this.selectedProducts.size;
        const currentPageSelectedCount = this.currentPageProducts.filter(p => this.selectedProducts.has(p.id)).length;
        const currentPageTotalCount = this.currentPageProducts.length;
        
        // 更新选择计数显示
        const selectedCountEl = document.getElementById('selectedCount');
        if (selectedCountEl) {
            selectedCountEl.textContent = `已选择 ${selectedCount} 项`;
        }
        
        // 更新批量操作按钮状态
        const batchTagBtn = document.getElementById('batchTagBtn');
        if (batchTagBtn) {
            batchTagBtn.disabled = selectedCount === 0;
        }
        
        // 更新全选按钮文本
        const selectAllBtn = document.getElementById('selectAllBtn');
        if (selectAllBtn) {
            const filters = this.getCurrentFilters();
            const hasFilters = Object.values(filters).some(value => value.trim() !== '');
            
            if (hasFilters) {
                selectAllBtn.innerHTML = '<i class="fas fa-check-square"></i> 全选搜索结果';
                selectAllBtn.title = '选择所有符合当前搜索条件的产品';
            } else {
                selectAllBtn.innerHTML = '<i class="fas fa-check-square"></i> 全选';
                selectAllBtn.title = '选择所有产品';
            }
        }
        
        // 更新全选复选框状态
        const masterCheckbox = document.getElementById('masterCheckbox');
        if (masterCheckbox && currentPageTotalCount > 0) {
            if (currentPageSelectedCount === 0) {
                masterCheckbox.checked = false;
                masterCheckbox.indeterminate = false;
            } else if (currentPageSelectedCount === currentPageTotalCount) {
                masterCheckbox.checked = true;
                masterCheckbox.indeterminate = false;
            } else {
                masterCheckbox.checked = false;
                masterCheckbox.indeterminate = true;
            }
        }
    },

    // 显示批量打标模态框
    showBatchTagModal() {
        if (this.selectedProducts.size === 0) {
            showAlert('请先选择要打标的产品', 'warning');
            return;
        }
        
        // 更新模态框中的选择计数
        const batchSelectedCountEl = document.getElementById('batchSelectedCount');
        if (batchSelectedCountEl) {
            batchSelectedCountEl.textContent = this.selectedProducts.size;
        }
        
        // 初始化时间选择器
        this.initBatchTimeSelectors();
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('batchTagModal'));
        modal.show();
    },

    // 初始化批量打标模态框的时间选择器
    initBatchTimeSelectors() {
        // 生成小时选项
        const hourSelectors = ['batchWarmupHour', 'batchStartHour', 'batchEndHour'];
        hourSelectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (selector) {
                selector.innerHTML = this.generateHourOptions('00');
            }
        });
        
        // 生成分钟选项
        const minuteSelectors = ['batchWarmupMinute', 'batchStartMinute', 'batchEndMinute'];
        minuteSelectors.forEach((selectorId, index) => {
            const selector = document.getElementById(selectorId);
            if (selector) {
                const defaultMinute = index === 2 ? 50 : 0; // 结束时间默认50分，其他默认0分
                selector.innerHTML = this.generateMinuteOptions(defaultMinute);
            }
        });
        
        // 设置默认值
        const today = this.formatDateToLocal(new Date());
        const startDateInput = document.getElementById('batchStartDate');
        const endDateInput = document.getElementById('batchEndDate');
        if (startDateInput) startDateInput.value = today;
        if (endDateInput) endDateInput.value = today;
        
        // 清空其他字段
        const batchActionNameInput = document.getElementById('batchActionName');
        const batchWarmupDateInput = document.getElementById('batchWarmupDate');
        if (batchActionNameInput) batchActionNameInput.value = '';
        if (batchWarmupDateInput) batchWarmupDateInput.value = '';
    },

    // 保存批量打标
    saveBatchTags() {
        // 获取表单数据
        const actionName = document.getElementById('batchActionName').value.trim();
        const warmupDate = document.getElementById('batchWarmupDate').value;
        const warmupHour = document.getElementById('batchWarmupHour').value;
        const warmupMinute = document.getElementById('batchWarmupMinute').value;
        const startDate = document.getElementById('batchStartDate').value;
        const startHour = document.getElementById('batchStartHour').value;
        const startMinute = document.getElementById('batchStartMinute').value;
        const endDate = document.getElementById('batchEndDate').value;
        const endHour = document.getElementById('batchEndHour').value;
        const endMinute = document.getElementById('batchEndMinute').value;
        
        // 验证必填字段
        if (!actionName) {
            showAlert('请输入活动名称', 'warning');
            return;
        }
        
        if (!startDate || !endDate) {
            showAlert('请选择开始时间和结束时间', 'warning');
            return;
        }
        
        // 构建时间字符串
        const startTime = `${startDate}T${startHour}:${startMinute.toString().padStart(2, '0')}:00`;
        const endTime = `${endDate}T${endHour}:${endMinute.toString().padStart(2, '0')}:00`;
        const warmupTime = warmupDate ? `${warmupDate}T${warmupHour}:${warmupMinute.toString().padStart(2, '0')}:00` : null;
        
        // 验证时间逻辑
        const startDateTime = new Date(startTime);
        const endDateTime = new Date(endTime);
        
        if (startDateTime >= endDateTime) {
            showAlert('开始时间不能晚于或等于结束时间', 'warning');
            return;
        }
        
        if (warmupTime) {
            const warmupDateTime = new Date(warmupTime);
            if (warmupDateTime >= startDateTime) {
                showAlert('预热时间不能晚于或等于开始时间', 'warning');
                return;
            }
        }
        
        // 构建活动对象
        const newAction = {
            name: actionName,
            start_time: startTime,
            end_time: endTime,
            // 为了向后兼容，同时设置旧格式的字段
            start_date: startDate,
            end_date: endDate
        };
        
        if (warmupTime) {
            newAction.warmup_time = warmupTime;
        }
        
        // 调用API进行批量打标
        const selectedProductIds = Array.from(this.selectedProducts);
        APIService.batchUpdateProductActions(selectedProductIds, newAction)
        .then(data => {
            showAlert(`成功为 ${selectedProductIds.length} 个产品添加活动标签`, 'success');
            
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('batchTagModal'));
            modal.hide();
            
            // 清空选择并刷新数据
            this.clearSelection();
            this.refreshData();
        })
        .catch(error => {
            console.error('批量打标失败:', error);
            showAlert('批量打标失败：' + error.message, 'danger');
        });
    },

    // ======================== 工具函数 ========================

    // HTML转义
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
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

    // 渲染链接主图
    renderMainImage(imageUrl) {
        if (!imageUrl || imageUrl.trim() === '') {
            return '<span class="text-muted">-</span>';
        }
        
        const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const escapedUrl = this.escapeHtml(imageUrl);
        return `
            <div class="image-container" style="display: flex; align-items: center; position: relative;">
                <img id="${imageId}" src="${escapedUrl}" 
                     style="width: 50px; height: 50px; object-fit: cover; cursor: pointer; border-radius: 4px; border: 1px solid #ddd; transition: transform 0.2s ease;" 
                     onclick="ProductTagsModule.showImageModal('${escapedUrl}')"
                     onmouseenter="ProductTagsModule.showHoverPreview(event, '${escapedUrl}')"
                     onmousemove="ProductTagsModule.updateHoverPreviewPosition(event)"
                     onmouseleave="ProductTagsModule.hideHoverPreview()"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';"
                     title="鼠标悬停预览，点击查看原图" />
                <span style="display: none; color: #999; font-size: 12px;">图片加载失败</span>
            </div>
        `;
    },

    // 渲染网盘路径
    renderNetworkPath(networkPath) {
        if (!networkPath || networkPath.trim() === '') {
            return '<span class="text-muted">-</span>';
        }
        
        const pathId = `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const escapedPath = this.escapeHtml(networkPath);
        
        // 将原始路径存储到data属性中，避免HTML转义影响
        const pathData = btoa(encodeURIComponent(networkPath)); // Base64编码存储原始数据
        
        return `
            <div class="network-path-container" style="position: relative; width: 100%;">
                <span class="network-path-text" title="${escapedPath}" 
                      style="display: block; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 5px;">
                    ${escapedPath}
                </span>
                <button class="network-path-copy-btn btn btn-outline-secondary btn-sm" 
                        onclick="ProductTagsModule.copyNetworkPathFromData('${pathData}')"
                        title="复制网盘路径"
                        style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); padding: 1px 4px; font-size: 10px; opacity: 0; transition: opacity 0.2s; z-index: 10;">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
        `;
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

    // 清理预览缓存（可选，用于内存管理）
    clearPreviewCache() {
        this.previewImageCache.clear();
    },

    // 复制网盘路径
    copyNetworkPath(networkPath) {
        if (!networkPath) {
            showAlert('没有可复制的路径', 'warning');
            return;
        }
        
        // 解码HTML实体，确保反斜杠正确显示
        const decodedPath = this.decodeHtmlEntities(networkPath);
        
        // 使用现代浏览器的Clipboard API
        if (navigator.clipboard) {
            navigator.clipboard.writeText(decodedPath).then(() => {
                showAlert('网盘路径已复制到剪贴板', 'success');
            }).catch(err => {
                console.error('复制失败:', err);
                this.fallbackCopyText(decodedPath);
            });
        } else {
            // 降级方案
            this.fallbackCopyText(decodedPath);
        }
    },

    // 从Base64编码的数据复制网盘路径
    copyNetworkPathFromData(pathData) {
        try {
            // 解码Base64并获取原始路径
            const originalPath = decodeURIComponent(atob(pathData));
            
            if (!originalPath) {
                showAlert('没有可复制的路径', 'warning');
                return;
            }
            
            // 使用现代浏览器的Clipboard API
            if (navigator.clipboard) {
                navigator.clipboard.writeText(originalPath).then(() => {
                    showAlert('网盘路径已复制到剪贴板', 'success');
                }).catch(err => {
                    console.error('复制失败:', err);
                    this.fallbackCopyText(originalPath);
                });
            } else {
                // 降级方案
                this.fallbackCopyText(originalPath);
            }
        } catch (err) {
            console.error('解码路径失败:', err);
            showAlert('复制失败，路径数据异常', 'danger');
        }
    },

    // 降级复制方案
    fallbackCopyText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            showAlert('网盘路径已复制到剪贴板', 'success');
        } catch (err) {
            console.error('降级复制也失败:', err);
            showAlert('复制失败，请手动复制', 'danger');
        } finally {
            document.body.removeChild(textArea);
        }
    },

    // 解码HTML实体
    decodeHtmlEntities(text) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
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
        const onMouseMove = (e) => this.onColumnResize(e);
        const onMouseUp = () => {
            this.stopColumnResize();
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        // 禁用文本选择
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
    },

    // 列宽调整中
    onColumnResize(e) {
        if (!this.isResizing || !this.currentColumn) return;
        
        const deltaX = e.clientX - this.startX;
        const newWidth = Math.max(50, this.startWidth + deltaX);  // 最小宽度50px
        
        this.currentColumn.style.width = newWidth + 'px';
        
        // 更新表格主体中对应列的宽度
        const columnKey = this.currentColumn.getAttribute('data-column');
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
        
        // 恢复文本选择
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        
        this.startX = 0;
        this.startWidth = 0;
    },

    // 更新表格体列宽
    updateTableBodyColumnWidth(columnKey, width) {
        const tableBody = document.getElementById('productTagsTableBody');
        if (!tableBody) return;
        
        // 列的索引映射
        const columnIndexMap = {
            'checkbox': 0,
            'main_image': 1,
            'product_id': 2,
            'product_name': 3,
            'listing_time': 4,
            'tmall_supplier_id': 5,
            'network_path': 6,
            'operator': 7,
            'action_list': 8,
            'actions': 9
        };
        
        const columnIndex = columnIndexMap[columnKey];
        if (columnIndex === undefined) return;
        
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const cell = row.cells[columnIndex];
            if (cell) {
                cell.style.width = width + 'px';
                cell.style.maxWidth = width + 'px';
            }
        });
    },

    // 初始化产品标签页面
    initProductTagsPage() {
        this.loadProductTagsList();
    }
};

// 将ProductTagsModule暴露给全局使用
window.ProductTagsModule = ProductTagsModule; 