// 数据管理模块
import { API_BASE_URL, TABLE_COLUMNS, STORAGE_KEYS } from '../config.js';
import { UIUtils } from '../utils/ui.js';
import { AuthManager } from './auth.js';

export class DataManager {
    constructor() {
        this.currentData = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.totalItems = 0;
        this.currentSort = { column: null, direction: 'asc' };
    }

    // 通用数据加载
    async loadData(endpoint, params = {}) {
        try {
            UIUtils.showSpinner();
            
            const url = new URL(`${API_BASE_URL}${endpoint}`);
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
                    url.searchParams.append(key, params[key]);
                }
            });

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${AuthManager.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            this.currentData = result.data || result;
            this.filteredData = [...this.currentData];
            this.totalItems = this.currentData.length;
            
            return result;
        } catch (error) {
            console.error('数据加载错误:', error);
            UIUtils.showAlert('error', `数据加载失败: ${error.message}`);
            throw error;
        } finally {
            UIUtils.hideSpinner();
        }
    }

    // 产品数据加载
    async loadProductData(params = {}) {
        const defaultParams = {
            page: this.currentPage,
            per_page: this.itemsPerPage
        };
        
        return await this.loadData('/product_data', { ...defaultParams, ...params });
    }

    // 产品清单加载
    async loadProductList(params = {}) {
        return await this.loadData('/product_list', params);
    }

    // 种植记录加载
    async loadPlantingRecords(params = {}) {
        return await this.loadData('/planting_records', params);
    }

    // 主体报告加载
    async loadSubjectReports(params = {}) {
        return await this.loadData('/subject_reports', params);
    }

    // 数据搜索
    searchData(query, columns = []) {
        if (!query.trim()) {
            this.filteredData = [...this.currentData];
            return this.filteredData;
        }

        const searchQuery = query.toLowerCase();
        this.filteredData = this.currentData.filter(item => {
            if (columns.length > 0) {
                // 在指定列中搜索
                return columns.some(column => {
                    const value = item[column];
                    return value && value.toString().toLowerCase().includes(searchQuery);
                });
            } else {
                // 在所有列中搜索
                return Object.values(item).some(value => {
                    return value && value.toString().toLowerCase().includes(searchQuery);
                });
            }
        });

        this.currentPage = 1; // 重置到第一页
        return this.filteredData;
    }

    // 数据排序
    sortData(column, direction = 'asc') {
        this.currentSort = { column, direction };
        
        this.filteredData.sort((a, b) => {
            let aValue = a[column];
            let bValue = b[column];
            
            // 处理空值
            if (aValue === null || aValue === undefined) aValue = '';
            if (bValue === null || bValue === undefined) bValue = '';
            
            // 数字比较
            if (!isNaN(aValue) && !isNaN(bValue)) {
                aValue = parseFloat(aValue);
                bValue = parseFloat(bValue);
            } else {
                // 字符串比较
                aValue = aValue.toString().toLowerCase();
                bValue = bValue.toString().toLowerCase();
            }
            
            if (direction === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });
        
        return this.filteredData;
    }

    // 数据过滤
    filterData(filters) {
        this.filteredData = this.currentData.filter(item => {
            return Object.keys(filters).every(key => {
                const filterValue = filters[key];
                const itemValue = item[key];
                
                if (filterValue === null || filterValue === undefined || filterValue === '') {
                    return true; // 空过滤器不过滤
                }
                
                if (typeof filterValue === 'string') {
                    return itemValue && itemValue.toString().toLowerCase().includes(filterValue.toLowerCase());
                }
                
                return itemValue === filterValue;
            });
        });
        
        this.currentPage = 1;
        return this.filteredData;
    }

    // 分页数据
    getPaginatedData() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.filteredData.slice(startIndex, endIndex);
    }

    // 设置分页
    setPage(page) {
        this.currentPage = Math.max(1, Math.min(page, this.getTotalPages()));
        return this.getPaginatedData();
    }

    // 获取总页数
    getTotalPages() {
        return Math.ceil(this.filteredData.length / this.itemsPerPage);
    }

    // 设置每页项目数
    setItemsPerPage(count) {
        this.itemsPerPage = count;
        this.currentPage = 1;
        return this.getPaginatedData();
    }

    // 导出数据
    async exportData(endpoint, params = {}, filename = 'data.csv') {
        try {
            UIUtils.showSpinner();
            
            const url = new URL(`${API_BASE_URL}${endpoint}`);
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
                    url.searchParams.append(key, params[key]);
                }
            });

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${AuthManager.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`导出失败: ${response.status}`);
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            
            UIUtils.showAlert('success', '数据导出成功！');
        } catch (error) {
            console.error('导出错误:', error);
            UIUtils.showAlert('error', `导出失败: ${error.message}`);
        } finally {
            UIUtils.hideSpinner();
        }
    }

    // 获取统计信息
    async getStatistics(endpoint) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${AuthManager.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`获取统计信息失败: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('统计信息获取错误:', error);
            throw error;
        }
    }

    // 获取平台信息
    async getPlatformInfo() {
        return await this.getStatistics('/platform_info');
    }

    // 获取供应商信息
    async getSupplierInfo() {
        return await this.getStatistics('/supplier_info');
    }

    // 渲染表格
    renderTable(data, tableId, columns) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="' + columns.length + '" class="text-center">暂无数据</td></tr>';
            return;
        }

        data.forEach(item => {
            const row = document.createElement('tr');
            
            columns.forEach(column => {
                const cell = document.createElement('td');
                let value = item[column.key];
                
                if (column.formatter && typeof column.formatter === 'function') {
                    value = column.formatter(value, item);
                } else if (value === null || value === undefined) {
                    value = '-';
                } else if (column.type === 'date' && value) {
                    value = new Date(value).toLocaleDateString();
                } else if (column.type === 'number' && value) {
                    value = Number(value).toLocaleString();
                }
                
                cell.textContent = value;
                if (column.class) {
                    cell.className = column.class;
                }
                
                row.appendChild(cell);
            });
            
            tbody.appendChild(row);
        });
    }

    // 渲染分页器
    renderPagination(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const totalPages = this.getTotalPages();
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<nav><ul class="pagination justify-content-center">';
        
        // 上一页
        paginationHTML += `<li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${this.currentPage - 1}">上一页</a>
        </li>`;
        
        // 页码
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            paginationHTML += '<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>';
            if (startPage > 2) {
                paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `<li class="page-item ${i === this.currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
        }
        
        // 下一页
        paginationHTML += `<li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${this.currentPage + 1}">下一页</a>
        </li>`;
        
        paginationHTML += '</ul></nav>';
        
        container.innerHTML = paginationHTML;
        
        // 绑定分页事件
        container.addEventListener('click', (e) => {
            e.preventDefault();
            if (e.target.classList.contains('page-link') && e.target.dataset.page) {
                const page = parseInt(e.target.dataset.page);
                if (page >= 1 && page <= totalPages) {
                    this.setPage(page);
                    // 触发自定义事件通知页面更新
                    window.dispatchEvent(new CustomEvent('dataPageChanged', { 
                        detail: { page, data: this.getPaginatedData() }
                    }));
                }
            }
        });
    }

    // 清空数据
    clearData() {
        this.currentData = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.totalItems = 0;
    }

    // 获取当前数据状态
    getDataState() {
        return {
            totalItems: this.totalItems,
            filteredItems: this.filteredData.length,
            currentPage: this.currentPage,
            totalPages: this.getTotalPages(),
            itemsPerPage: this.itemsPerPage,
            currentSort: this.currentSort
        };
    }
} 