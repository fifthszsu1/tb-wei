/**
 * 商品销售排行模块
 * 负责显示门店、负责人员、类目下的商品销售排行
 */

const ProductRankingModule = {
    // ======================== 模块状态变量 ========================
    
    // 当前显示的数据
    currentData: null,
    currentCategoryType: null,
    currentCategoryValue: null,
    currentStartDate: null,
    currentEndDate: null,
    
    // 分页和排序状态
    currentPage: 1,
    perPage: 20,
    sortBy: 'real_amount',
    sortOrder: 'desc',
    
    // ======================== 初始化方法 ========================
    
    // 初始化模块
    init() {
        this.bindEvents();
    },
    
    // 绑定事件
    bindEvents() {
        // 使用事件委托，绑定到document上
        document.addEventListener('click', (e) => {
            // 模态框关闭事件
            if (e.target.classList.contains('modal') || e.target.classList.contains('btn-close')) {
                this.hideModal();
            }
            
            // 排序事件
            if (e.target.classList.contains('sort-header')) {
                e.preventDefault();
                const sortBy = e.target.dataset.sortBy;
                console.log('排序事件触发:', sortBy); // 调试信息
                this.handleSort(sortBy);
            }
            
            // 分页事件
            if (e.target.classList.contains('page-link')) {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                console.log('分页事件触发:', page); // 调试信息
                if (page && page !== this.currentPage) {
                    this.loadData(page);
                }
            }
        });
    },
    
    // ======================== 主要方法 ========================
    
    // 显示商品销售排行
    async showProductRanking(categoryType, categoryValue, startDate = null, endDate = null) {
        try {
            // 更新状态
            this.currentCategoryType = categoryType;
            this.currentCategoryValue = categoryValue;
            this.currentStartDate = startDate;
            this.currentEndDate = endDate;
            this.currentPage = 1;
            this.sortBy = 'real_amount';
            this.sortOrder = 'desc';
            
            // 显示加载状态
            this.showModal();
            this.showLoading();
            
            // 加载数据
            await this.loadData(1);
            
        } catch (error) {
            console.error('显示商品销售排行失败:', error);
            showAlert('加载商品销售排行数据失败：' + error.message, 'danger');
        }
    },
    
    // 加载数据
    async loadData(page = 1) {
        try {
            this.currentPage = page;
            console.log('loadData被调用:', page, '当前排序:', this.sortBy, this.sortOrder); // 调试信息
            
            // 调用API获取数据
            const data = await APIService.getProductRanking(
                this.currentCategoryType,
                this.currentCategoryValue,
                this.currentStartDate,
                this.currentEndDate,
                page,
                this.perPage,
                this.sortBy,
                this.sortOrder
            );
            
            this.currentData = data;
            this.renderTable(data);
            this.renderPagination(data);
            this.updateModalTitle();
            
        } catch (error) {
            console.error('加载商品销售排行数据失败:', error);
            showAlert('加载数据失败：' + error.message, 'danger');
        }
    },
    
    // 处理排序
    async handleSort(sortBy) {
        console.log('handleSort被调用:', sortBy, '当前排序:', this.sortBy, this.sortOrder); // 调试信息
        
        if (this.sortBy === sortBy) {
            // 切换排序方向
            this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
        } else {
            // 新的排序字段，默认倒序
            this.sortBy = sortBy;
            this.sortOrder = 'desc';
        }
        
        console.log('排序参数更新:', this.sortBy, this.sortOrder); // 调试信息
        
        // 重新加载数据
        await this.loadData(1);
    },
    
    // ======================== 渲染方法 ========================
    
    // 渲染表格
    renderTable(data) {
        const tableBody = document.getElementById('productRankingTableBody');
        if (!tableBody) return;
        
        if (!data.data || data.data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">
                        <i class="fas fa-inbox"></i> 暂无数据
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        data.data.forEach((item, index) => {
            const rank = (data.current_page - 1) * data.per_page + index + 1;
            html += `
                <tr>
                    <td><span class="badge bg-primary">${rank}</span></td>
                    <td><strong class="text-info">${item.tmall_product_code || '未知'}</strong></td>
                    <td>
                        <div class="product-name-cell" title="${item.product_name || ''}">
                            ${item.product_name || '未知商品'}
                        </div>
                    </td>
                    <td><strong class="text-success">¥${this.formatCurrency(item.total_amount)}</strong></td>
                    <td><strong class="text-primary">¥${this.formatCurrency(item.real_amount)}</strong></td>
                    <td>${item.total_quantity.toLocaleString()}</td>
                    <td>¥${this.formatCurrency(item.refund_amount)}</td>
                    <td>¥${this.formatCurrency(item.planting_amount)}</td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
        
        // 更新排序图标
        this.updateSortIcons();
    },
    
    // 渲染分页
    renderPagination(data) {
        const paginationContainer = document.getElementById('productRankingPagination');
        if (!paginationContainer) return;
        
        if (data.pages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let html = '<ul class="pagination justify-content-center">';
        
        // 上一页
        if (data.current_page > 1) {
            html += `<li class="page-item"><a class="page-link" href="#" data-page="${data.current_page - 1}">上一页</a></li>`;
        } else {
            html += `<li class="page-item disabled"><span class="page-link">上一页</span></li>`;
        }
        
        // 页码
        const startPage = Math.max(1, data.current_page - 2);
        const endPage = Math.min(data.pages, data.current_page + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            if (i === data.current_page) {
                html += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
            } else {
                html += `<li class="page-item"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
            }
        }
        
        // 下一页
        if (data.current_page < data.pages) {
            html += `<li class="page-item"><a class="page-link" href="#" data-page="${data.current_page + 1}">下一页</a></li>`;
        } else {
            html += `<li class="page-item disabled"><span class="page-link">下一页</span></li>`;
        }
        
        html += '</ul>';
        
        // 添加统计信息
        html += `
            <div class="text-center text-muted mt-2">
                共 ${data.total} 条记录，第 ${data.current_page} / ${data.pages} 页
            </div>
        `;
        
        paginationContainer.innerHTML = html;
        
        // 重新绑定分页事件
        this.bindPaginationEvents();
    },
    
    // 绑定分页事件
    bindPaginationEvents() {
        const paginationContainer = document.getElementById('productRankingPagination');
        if (!paginationContainer) return;
        
        const pageLinks = paginationContainer.querySelectorAll('.page-link[data-page]');
        pageLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(link.dataset.page);
                console.log('分页链接点击:', page);
                if (page && page !== this.currentPage) {
                    this.loadData(page);
                }
            });
        });
    },
    
    // 更新模态框标题
    updateModalTitle() {
        const modalTitle = document.getElementById('productRankingModalTitle');
        if (!modalTitle) return;
        
        let title = '';
        switch (this.currentCategoryType) {
            case 'store':
                title = `门店 "${this.currentCategoryValue}" 商品销售排行`;
                break;
            case 'operator':
                title = `负责人员 "${this.currentCategoryValue}" 商品销售排行`;
                break;
            case 'category':
                title = `类目 "${this.currentCategoryValue}" 商品销售排行`;
                break;
            default:
                title = '商品销售排行';
        }
        
        modalTitle.textContent = title;
    },
    
    // ======================== 模态框控制 ========================
    
    // 显示模态框
    showModal() {
        const modal = document.getElementById('productRankingModal');
        if (modal) {
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();
            
            // 模态框显示后重新绑定事件
            setTimeout(() => {
                this.bindModalEvents();
            }, 100);
        }
    },
    
    // 绑定模态框内的事件
    bindModalEvents() {
        const modal = document.getElementById('productRankingModal');
        if (!modal) return;
        
        // 绑定排序事件
        const sortHeaders = modal.querySelectorAll('.sort-header');
        sortHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                e.preventDefault();
                const sortBy = header.dataset.sortBy;
                console.log('排序事件触发:', sortBy);
                this.handleSort(sortBy);
            });
        });
        
        // 绑定分页事件（使用事件委托）
        const paginationContainer = modal.querySelector('#productRankingPagination');
        if (paginationContainer) {
            paginationContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('page-link')) {
                    e.preventDefault();
                    const page = parseInt(e.target.dataset.page);
                    console.log('分页事件触发:', page);
                    if (page && page !== this.currentPage) {
                        this.loadData(page);
                    }
                }
            });
        }
    },
    
    // 隐藏模态框
    hideModal() {
        const modal = document.getElementById('productRankingModal');
        if (modal) {
            const bootstrapModal = bootstrap.Modal.getInstance(modal);
            if (bootstrapModal) {
                bootstrapModal.hide();
            }
        }
    },
    
    // 显示加载状态
    showLoading() {
        const tableBody = document.getElementById('productRankingTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <i class="fas fa-spinner fa-spin"></i> 加载中...
                    </td>
                </tr>
            `;
        }
        
        const paginationContainer = document.getElementById('productRankingPagination');
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
        }
    },
    
    // ======================== 工具方法 ========================
    
    // 格式化货币
    formatCurrency(amount) {
        if (amount === null || amount === undefined) return '0.00';
        return parseFloat(amount).toFixed(2);
    },
    
    // 获取排序图标
    getSortIcon(sortBy) {
        if (this.sortBy !== sortBy) {
            return '<i class="fas fa-sort text-muted"></i>';
        }
        return this.sortOrder === 'desc' 
            ? '<i class="fas fa-sort-down text-primary"></i>' 
            : '<i class="fas fa-sort-up text-primary"></i>';
    },
    
    // 更新排序图标
    updateSortIcons() {
        const sortHeaders = document.querySelectorAll('.sort-header');
        sortHeaders.forEach(header => {
            const sortBy = header.dataset.sortBy;
            const iconElement = header.querySelector('i');
            if (iconElement) {
                iconElement.className = this.getSortIcon(sortBy).match(/class="([^"]*)"/)[1];
            }
        });
    },
    
    // 处理类目文本
    processCategoryText(text) {
        if (!text) return '';
        
        // 如果文本包含两个或更多 '>'
        const parts = text.split('>');
        if (parts.length >= 3) {
            // 只取第一个和最后一个部分
            const firstPart = parts[0].trim();
            const lastPart = parts[parts.length - 1].trim();
            return `${firstPart}>${lastPart}`;
        }
        
        // 如果只有一个或两个 '>'，保持原样
        return text;
    }
};

// 将ProductRankingModule暴露给全局使用
window.ProductRankingModule = ProductRankingModule; 