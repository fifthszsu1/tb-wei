// API服务模块
const APIService = {
    
    // 获取认证头信息
    getAuthHeaders() {
        const token = localStorage.getItem(AppConfig.STORAGE_KEYS.TOKEN);
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    },

    // 统一错误处理
    async handleResponse(response) {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    },

    // 认证相关API
    async verifyUser() {
        const response = await fetch(`${AppConfig.API_BASE}/user`, {
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    },

    async login(username, password) {
        const response = await fetch(`${AppConfig.API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        return response.json();
    },

    // 数据查询相关API
    async getDataList(page = 1, filters = {}, pageSize = 20, sortBy = 'upload_date', sortOrder = 'desc') {
        let url = `${AppConfig.API_BASE}/data?page=${page}&per_page=${pageSize}&sort_by=${sortBy}&sort_order=${sortOrder}`;
        
        if (filters.uploadStartDate) {
            url += `&upload_start_date=${filters.uploadStartDate}`;
        }
        if (filters.uploadEndDate) {
            url += `&upload_end_date=${filters.uploadEndDate}`;
        }
        if (filters.tmallProductCode) {
            url += `&tmall_product_code=${encodeURIComponent(filters.tmallProductCode)}`;
        }
        if (filters.productName) {
            url += `&product_name=${encodeURIComponent(filters.productName)}`;
        }
        if (filters.tmallSupplierName) {
            url += `&tmall_supplier_name=${encodeURIComponent(filters.tmallSupplierName)}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    },

    async getStats(startDate = null, endDate = null) {
        let url = `${AppConfig.API_BASE}/stats`;
        
        // 如果提供了日期参数，添加到URL
        if (startDate && endDate) {
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate
            });
            url += `?${params.toString()}`;
        }
        
        const response = await fetch(url, {
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    },

    async getUserStats() {
        const response = await fetch(`${AppConfig.API_BASE}/user-stats`, {
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    },

    // 文件上传相关API
    async uploadPlatformData(formData) {
        const token = localStorage.getItem(AppConfig.STORAGE_KEYS.TOKEN);
        const response = await fetch(`${AppConfig.API_BASE}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        return response.json();
    },

    async uploadProductList(formData) {
        const token = localStorage.getItem(AppConfig.STORAGE_KEYS.TOKEN);
        const response = await fetch(`${AppConfig.API_BASE}/upload-product-list`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        return response.json();
    },

    async uploadPlantingRecords(formData) {
        const token = localStorage.getItem(AppConfig.STORAGE_KEYS.TOKEN);
        const response = await fetch(`${AppConfig.API_BASE}/upload-planting-records`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        return response.json();
    },

    async uploadSubjectReport(formData) {
        const token = localStorage.getItem(AppConfig.STORAGE_KEYS.TOKEN);
        const response = await fetch(`${AppConfig.API_BASE}/upload-subject-report`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        return response.json();
    },

    async uploadOrderDetails(formData) {
        const token = localStorage.getItem(AppConfig.STORAGE_KEYS.TOKEN);
        const response = await fetch(`${AppConfig.API_BASE}/upload-order-details`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        return response.json();
    },

    // 获取上传进度
    async getUploadProgress(taskId) {
        const token = localStorage.getItem(AppConfig.STORAGE_KEYS.TOKEN);
        const response = await fetch(`${AppConfig.API_BASE}/progress/${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.json();
    },

    // 列出所有进度任务
    async listUploadProgress() {  
        const token = localStorage.getItem(AppConfig.STORAGE_KEYS.TOKEN);
        const response = await fetch(`${AppConfig.API_BASE}/progress`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.json();
    },

    async uploadProductPricing(formData) {
        const token = localStorage.getItem(AppConfig.STORAGE_KEYS.TOKEN);
        const response = await fetch(`${AppConfig.API_BASE}/upload-product-pricing`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        return response.json();
    },

    // 数据导出API
    async exportData(filters = {}) {
        let url = `${AppConfig.API_BASE}/export-data`;
        const params = new URLSearchParams();
        
        if (filters.uploadDate) {
            params.append('upload_date', filters.uploadDate);
        }
        if (filters.tmallProductCode) {
            params.append('tmall_product_code', filters.tmallProductCode);
        }
        if (filters.productName) {
            params.append('product_name', filters.productName);
        }
        if (filters.tmallSupplierName) {
            params.append('tmall_supplier_name', filters.tmallSupplierName);
        }
        if (filters.sortBy) {
            params.append('sort_by', filters.sortBy);
        }
        if (filters.sortOrder) {
            params.append('sort_order', filters.sortOrder);
        }
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const token = localStorage.getItem(AppConfig.STORAGE_KEYS.TOKEN);
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        });
        
        if (!response.ok) {
            throw new Error(`导出失败: ${response.status}`);
        }
        return response.blob();
    },

    // 汇总计算相关API
    async calculatePromotionSummary(targetDate) {
        const response = await fetch(`${AppConfig.API_BASE}/calculate-promotion-summary`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ target_date: targetDate })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw errorData;
        }
        return response.json();
    },

    async calculatePlantingSummary(date) {
        const response = await fetch(`${AppConfig.API_BASE}/calculate-planting-summary`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ date })
        });
        return response.json();
    },

    async calculateFinalSummary(date) {
        const response = await fetch(`${AppConfig.API_BASE}/calculate-final-summary`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ date })
        });
        return response.json();
    },

    // 订单详情汇总计算相关API
    async calculateOrderDetailsMerge(startDate, endDate) {
        const response = await fetch(`${AppConfig.API_BASE}/calculate-order-details-merge`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ 
                start_date: startDate,
                end_date: endDate 
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw errorData;
        }
        return response.json();
    },

    async calculateOrderCostSummary(startDate, endDate) {
        const response = await fetch(`${AppConfig.API_BASE}/calculate-order-cost-summary`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ 
                start_date: startDate,
                end_date: endDate 
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw errorData;
        }
        return response.json();
    },

    async calculateOrderPaymentUpdate(startDate, endDate) {
        const response = await fetch(`${AppConfig.API_BASE}/calculate-order-payment-update`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ 
                start_date: startDate,
                end_date: endDate 
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw errorData;
        }
        return response.json();
    },

    // 获取商品趋势数据
    async getProductTrend(tmallProductCode, startDate = null, endDate = null) {
        let url = `${AppConfig.API_BASE}/product-trend/${encodeURIComponent(tmallProductCode)}`;
        
        // 如果提供了日期参数，添加到URL
        if (startDate && endDate) {
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate
            });
            url += `?${params.toString()}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    },

    // 订单数据相关API
    async getOrderDetailsList(page = 1, filters = {}, pageSize = 20, sortBy = 'order_time', sortOrder = 'desc') {
        let url = `${AppConfig.API_BASE}/order-details?page=${page}&per_page=${pageSize}&sort_by=${sortBy}&sort_order=${sortOrder}`;
        
        if (filters.start_date) {
            url += `&start_date=${filters.start_date}`;
        }
        if (filters.end_date) {
            url += `&end_date=${filters.end_date}`;
        }
        if (filters.store_name) {
            url += `&store_name=${encodeURIComponent(filters.store_name)}`;
        }
        if (filters.operator) {
            url += `&operator=${encodeURIComponent(filters.operator)}`;
        }
        if (filters.province) {
            url += `&province=${encodeURIComponent(filters.province)}`;
        }
        if (filters.city) {
            url += `&city=${encodeURIComponent(filters.city)}`;
        }
        if (filters.express_company) {
            url += `&express_company=${encodeURIComponent(filters.express_company)}`;
        }
        if (filters.order_status && filters.order_status.length > 0) {
            console.log('API: 正在添加order_status参数:', filters.order_status);
            filters.order_status.forEach(status => {
                url += `&order_status=${encodeURIComponent(status)}`;
            });
        } else {
            console.log('API: 没有order_status参数或参数为空:', filters.order_status);
        }
        
        console.log('API: 最终请求URL:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    },

    // 根据内部订单号获取订单详情
    async getOrderDetailsByInternalNumber(internalOrderNumber) {
        const url = `${AppConfig.API_BASE}/order-details-by-internal-number/${encodeURIComponent(internalOrderNumber)}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    },

    // 获取店铺汇总信息
    async getStoreSummary(storeName, targetDate) {
        const url = `${AppConfig.API_BASE}/store-summary?store_name=${encodeURIComponent(storeName)}&target_date=${targetDate}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    },

    // 获取操作人汇总信息
    async getOperatorSummary(storeName, operator, targetDate) {
        const url = `${AppConfig.API_BASE}/operator-summary?store_name=${encodeURIComponent(storeName)}&operator=${encodeURIComponent(operator)}&target_date=${targetDate}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    },

    // 上传支付宝金额文件
    async uploadAlipayFile(file, startDate, endDate) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('start_date', startDate);
        formData.append('end_date', endDate);

        const token = localStorage.getItem(AppConfig.STORAGE_KEYS.TOKEN);
        const response = await fetch(`${AppConfig.API_BASE}/upload-alipay`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // 不设置Content-Type，让浏览器自动设置multipart/form-data
            },
            body: formData
        });
        return this.handleResponse(response);
    },

    // ======================== 产品标签相关API ========================

    // 获取产品标签列表
    async getProductTags(page = 1, filters = {}, pageSize = 20, sortBy = 'created_at', sortOrder = 'desc') {
        let url = `${AppConfig.API_BASE}/product-tags?page=${page}&per_page=${pageSize}&sort_by=${sortBy}&sort_order=${sortOrder}`;
        
        if (filters.product_id) {
            url += `&product_id=${encodeURIComponent(filters.product_id)}`;
        }
        if (filters.product_name) {
            url += `&product_name=${encodeURIComponent(filters.product_name)}`;
        }
        if (filters.listing_time) {
            url += `&listing_time=${filters.listing_time}`;
        }
        if (filters.tmall_supplier_id) {
            url += `&tmall_supplier_id=${encodeURIComponent(filters.tmall_supplier_id)}`;
        }
        if (filters.operator) {
            url += `&operator=${encodeURIComponent(filters.operator)}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    },

    // 获取单个产品标签详情
    async getProductTagDetail(productId) {
        const response = await fetch(`${AppConfig.API_BASE}/product-tags/${productId}`, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    },

    // 更新产品的活动列表
    async updateProductActions(productId, actionList) {
        const response = await fetch(`${AppConfig.API_BASE}/product-tags/${productId}/actions`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ action_list: actionList })
        });
        return this.handleResponse(response);
    },

    // 批量更新产品的活动列表
    async batchUpdateProductActions(productIds, newAction) {
        const response = await fetch(`${AppConfig.API_BASE}/product-tags/batch-actions`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ 
                product_ids: productIds,
                new_action: newAction
            })
        });
        return this.handleResponse(response);
    },

    // 获取所有产品的ID列表（支持搜索过滤）
    async getAllProductIds(filters = {}) {
        let url = `${AppConfig.API_BASE}/product-tags/all-ids`;
        
        const params = new URLSearchParams();
        if (filters.product_id) params.append('product_id', filters.product_id);
        if (filters.product_name) params.append('product_name', filters.product_name);
        if (filters.listing_time) params.append('listing_time', filters.listing_time);
        if (filters.tmall_supplier_id) params.append('tmall_supplier_id', filters.tmall_supplier_id);
        if (filters.operator) params.append('operator', filters.operator);
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    }
};

// 导出到全局作用域
window.APIService = APIService; 