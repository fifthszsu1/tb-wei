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
    async getDataList(page = 1, filters = {}) {
        let url = `${AppConfig.API_BASE}/data?page=${page}`;
        
        if (filters.uploadDate) {
            url += `&upload_date=${filters.uploadDate}`;
        }
        if (filters.tmallProductCode) {
            url += `&tmall_product_code=${encodeURIComponent(filters.tmallProductCode)}`;
        }
        if (filters.productName) {
            url += `&product_name=${encodeURIComponent(filters.productName)}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    },

    async getStats() {
        const response = await fetch(`${AppConfig.API_BASE}/stats`, {
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
    }
};

// 导出到全局作用域
window.APIService = APIService; 