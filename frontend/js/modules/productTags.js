/**
 * 产品标签管理模块
 * 负责产品标签列表的加载、搜索、编辑活动列表等功能
 */

const ProductTagsModule = {
    // ======================== 模块状态变量 ========================
    
    // 当前页大小
    currentPageSize: 20,
    
    // 当前排序状态
    currentSortBy: 'created_at',
    currentSortOrder: 'desc',
    
    // 当前编辑的产品信息
    currentEditingProduct: null,

    // ======================== 数据管理核心功能 ========================

    // 加载产品标签列表
    loadProductTagsList(page = 1) {
        if (!AuthModule.isAdmin()) return;
        
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
        
        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        <i class="fas fa-info-circle"></i> 暂无数据
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        data.forEach(item => {
            const actionListDisplay = this.formatActionList(item.action_list);
            
            html += `
                <tr>
                    <td>${this.escapeHtml(item.product_id || '')}</td>
                    <td title="${this.escapeHtml(item.product_name || '')}" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${this.escapeHtml(item.product_name || '')}
                    </td>
                    <td>${item.listing_time || '-'}</td>
                    <td>${this.escapeHtml(item.tmall_supplier_id || '-')}</td>
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

    // 生成单个活动编辑HTML
    generateActionEditHtml(action, index) {
        return `
            <div class="card mb-3" data-action-index="${index}">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-4">
                            <label class="form-label">活动名称</label>
                            <input type="text" class="form-control" value="${this.escapeHtml(action.name || '')}" 
                                   onchange="ProductTagsModule.updateActionField(${index}, 'name', this.value)">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">开始日期</label>
                            <input type="date" class="form-control" value="${action.start_date || ''}" 
                                   onchange="ProductTagsModule.updateActionField(${index}, 'start_date', this.value)">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">结束日期</label>
                            <input type="date" class="form-control" value="${action.end_date || ''}" 
                                   onchange="ProductTagsModule.updateActionField(${index}, 'end_date', this.value)">
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">&nbsp;</label>
                            <div>
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
            if (!action.name || !action.start_date || !action.end_date) {
                showAlert(`第${i + 1}个活动的信息不完整，请填写完整信息`, 'warning');
                return;
            }
            
            if (action.start_date > action.end_date) {
                showAlert(`第${i + 1}个活动的开始日期不能晚于结束日期`, 'warning');
                return;
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

    // 初始化产品标签页面
    initProductTagsPage() {
        this.loadProductTagsList();
    }
};

// 将ProductTagsModule暴露给全局使用
window.ProductTagsModule = ProductTagsModule; 