// 文件上传模块
import { API_BASE_URL } from '../config.js';
import { UIUtils } from '../utils/ui.js';
import { AuthManager } from './auth.js';

export class UploadManager {
    constructor() {
        this.initializeEventListeners();
    }

    // 初始化事件监听器
    initializeEventListeners() {
        // 产品数据上传
        const productDataUpload = document.getElementById('productDataUpload');
        if (productDataUpload) {
            productDataUpload.addEventListener('change', (e) => this.handleProductDataUpload(e));
        }

        // 产品清单上传
        const productListUpload = document.getElementById('productListUpload');
        if (productListUpload) {
            productListUpload.addEventListener('change', (e) => this.handleProductListUpload(e));
        }

        // 种植记录上传
        const plantingRecordUpload = document.getElementById('plantingRecordUpload');
        if (plantingRecordUpload) {
            plantingRecordUpload.addEventListener('change', (e) => this.handlePlantingRecordUpload(e));
        }

        // 主体报告上传
        const subjectReportUpload = document.getElementById('subjectReportUpload');
        if (subjectReportUpload) {
            subjectReportUpload.addEventListener('change', (e) => this.handleSubjectReportUpload(e));
        }
    }

    // 通用文件上传处理
    async uploadFile(file, endpoint, progressCallback = null) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${AuthManager.getToken()}`
                }
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || '上传失败');
            }

            return result;
        } catch (error) {
            console.error('文件上传错误:', error);
            throw error;
        }
    }

    // 产品数据上传处理
    async handleProductDataUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        UIUtils.showSpinner();
        
        try {
            const result = await this.uploadFile(file, '/upload_product_data');
            
            UIUtils.showAlert('success', `产品数据上传成功！处理了 ${result.count} 条记录`);
            
            // 刷新数据
            if (window.currentPage === 'productData') {
                window.loadProductData();
            }
        } catch (error) {
            UIUtils.showAlert('error', `产品数据上传失败: ${error.message}`);
        } finally {
            UIUtils.hideSpinner();
            event.target.value = ''; // 重置文件输入
        }
    }

    // 产品清单上传处理
    async handleProductListUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        UIUtils.showSpinner();
        
        try {
            const result = await this.uploadFile(file, '/upload_product_list');
            
            UIUtils.showAlert('success', `产品清单上传成功！处理了 ${result.count} 条记录`);
            
            // 刷新数据
            if (window.currentPage === 'productList') {
                window.loadProductList();
            }
        } catch (error) {
            UIUtils.showAlert('error', `产品清单上传失败: ${error.message}`);
        } finally {
            UIUtils.hideSpinner();
            event.target.value = '';
        }
    }

    // 种植记录上传处理
    async handlePlantingRecordUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        UIUtils.showSpinner();
        
        try {
            const result = await this.uploadFile(file, '/upload_planting_record');
            
            UIUtils.showAlert('success', `种植记录上传成功！处理了 ${result.count} 条记录`);
            
            // 刷新数据
            if (window.currentPage === 'plantingRecords') {
                window.loadPlantingRecords();
            }
        } catch (error) {
            UIUtils.showAlert('error', `种植记录上传失败: ${error.message}`);
        } finally {
            UIUtils.hideSpinner();
            event.target.value = '';
        }
    }

    // 主体报告上传处理
    async handleSubjectReportUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        UIUtils.showSpinner();
        
        try {
            const result = await this.uploadFile(file, '/upload_subject_report');
            
            UIUtils.showAlert('success', `主体报告上传成功！处理了 ${result.count} 条记录`);
            
            // 刷新数据
            if (window.currentPage === 'subjectReports') {
                window.loadSubjectReports();
            }
        } catch (error) {
            UIUtils.showAlert('error', `主体报告上传失败: ${error.message}`);
        } finally {
            UIUtils.hideSpinner();
            event.target.value = '';
        }
    }

    // 批量上传文件
    async uploadMultipleFiles(files, endpoint) {
        const results = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const result = await this.uploadFile(file, endpoint);
                results.push({ file: file.name, success: true, result });
            } catch (error) {
                results.push({ file: file.name, success: false, error: error.message });
            }
        }
        
        return results;
    }

    // 验证文件类型
    validateFileType(file, allowedTypes = ['.csv', '.xlsx', '.xls']) {
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        return allowedTypes.includes(fileExtension);
    }

    // 验证文件大小
    validateFileSize(file, maxSizeMB = 10) {
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        return file.size <= maxSizeBytes;
    }

    // 显示上传进度
    showUploadProgress(filename, progress) {
        // 可以扩展为显示具体的上传进度条
        console.log(`上传进度 ${filename}: ${progress}%`);
    }

    // 获取上传历史
    async getUploadHistory() {
        try {
            const response = await fetch(`${API_BASE_URL}/upload_history`, {
                headers: {
                    'Authorization': `Bearer ${AuthManager.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('获取上传历史失败');
            }

            return await response.json();
        } catch (error) {
            console.error('获取上传历史错误:', error);
            throw error;
        }
    }
} 