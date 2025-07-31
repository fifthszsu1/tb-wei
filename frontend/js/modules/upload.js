/**
 * 文件上传模块
 * 负责所有文件上传相关功能，包括拖拽、文件选择、各类上传处理等
 */

// 文件上传模块对象
const UploadModule = {
    // 标记事件监听器是否已设置
    _baseListenersSet: false,
    _newListenersSet: false,

    // ======================== 拖拽处理功能 ========================
    
    // 文件拖拽进入
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    },

    // 文件拖拽离开
    handleDragLeave(e) {
        e.currentTarget.classList.remove('dragover');
    },

    // 文件拖拽放下
    handleDrop(e, fileInput = null) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const targetFileInput = fileInput || document.getElementById('fileInput');
            targetFileInput.files = files;
            
            // 根据文件输入类型调用对应的处理函数
            if (targetFileInput.id === 'productListFileInput') {
                this.handleFileSelect(null, 'productList');
            } else if (targetFileInput.id === 'plantingRecordsFileInput') {
                this.handleFileSelect(null, 'plantingRecords');
            } else if (targetFileInput.id === 'subjectReportFileInput') {
                this.handleFileSelect(null, 'subjectReport');
                this.updateSubjectReportUploadBtn();
            } else if (targetFileInput.id === 'orderDetailsFileInput') {
                this.handleFileSelect(null, 'orderDetails');
                this.updateOrderDetailsUploadBtn();
            } else if (targetFileInput.id === 'productPricingFileInput') {
                this.handleFileSelect(null, 'productPricing');
                this.updateProductPricingUploadBtn();
            } else if (targetFileInput.id === 'alipayFileInput') {
                this.handleFileSelect(null, 'alipay');
                this.updateAlipayUploadBtn();
            } else {
                this.handleFileSelect();
            }
        }
    },

    // ======================== 文件选择处理 ========================

    // 文件选择处理
    handleFileSelect(event = null, uploadType = 'platform') {
        let fileInput, uploadBtn, buttonText;
        
        if (uploadType === 'productList') {
            fileInput = document.getElementById('productListFileInput');
            uploadBtn = document.getElementById('productListUploadBtn');
            buttonText = '导入产品总表';
        } else if (uploadType === 'plantingRecords') {
            fileInput = document.getElementById('plantingRecordsFileInput');
            uploadBtn = document.getElementById('plantingRecordsUploadBtn');
            buttonText = '导入种菜表格';
        } else if (uploadType === 'subjectReport') {
            fileInput = document.getElementById('subjectReportFileInput');
            uploadBtn = document.getElementById('subjectReportUploadBtn');
            buttonText = '导入主体报表';
        } else if (uploadType === 'orderDetails') {
            fileInput = document.getElementById('orderDetailsFileInput');
            uploadBtn = document.getElementById('orderDetailsUploadBtn');
            buttonText = '导入订单详情';
        } else if (uploadType === 'productPricing') {
            fileInput = document.getElementById('productPricingFileInput');
            uploadBtn = document.getElementById('productPricingUploadBtn');
            buttonText = '导入产品定价';
        } else if (uploadType === 'alipay') {
            fileInput = document.getElementById('alipayFileInput');
            uploadBtn = document.getElementById('alipayUploadBtn');
            buttonText = '导入支付宝金额';
        } else {
            fileInput = document.getElementById('fileInput');
            uploadBtn = document.getElementById('uploadBtn');
            buttonText = '上传平台数据';
        }
        
        if (fileInput.files.length > 0) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = `<i class="fas fa-upload"></i> ${buttonText} (${fileInput.files[0].name})`;
        } else {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = `<i class="fas fa-upload"></i> ${buttonText}`;
        }
    },

    // ======================== 平台数据上传 ========================

    // 平台数据文件上传处理
    handleFileUpload() {
        const fileInput = document.getElementById('fileInput');
        const platform = document.getElementById('platform').value;
        const uploadDateElement = document.getElementById('uploadDate');
        const uploadDate = uploadDateElement ? uploadDateElement.value : '';
        const supplierStore = document.getElementById('supplierStore').value;
        
        console.log('上传日期元素:', uploadDateElement); // 调试日志
        console.log('上传日期值:', uploadDate); // 调试日志
        console.log('选择门店:', supplierStore); // 调试日志
        
        if (!fileInput.files[0]) {
            showAlert('请选择文件', 'warning');
            return;
        }
        
        if (!uploadDate || uploadDate.trim() === '') {
            showAlert('请选择日期', 'warning');
            console.log('日期验证失败:', uploadDate); // 调试日志
            return;
        }
        
        if (!supplierStore || supplierStore.trim() === '') {
            showAlert('请选择门店', 'warning');
            console.log('门店验证失败:', supplierStore); // 调试日志
            return;
        }
        
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('platform', platform);
        formData.append('upload_date', uploadDate);
        formData.append('supplier_store', supplierStore);
        
        showSpinner();
        
        APIService.uploadPlatformData(formData)
        .then(data => {
            hideSpinner();
            
            if (data.message) {
                showAlert(data.message, data.count ? 'success' : 'danger');
                
                if (data.count) {
                    // 重置上传表单
                    fileInput.value = '';
                    document.getElementById('supplierStore').value = '';  // 重置门店选择
                    this.handleFileSelect();
                    
                    // 如果是普通用户，更新统计信息
                    if (window.loadUserStats && AuthModule.isUser()) {
                        window.loadUserStats();
                    }
                }
            }
        })
        .catch(error => {
            hideSpinner();
            showAlert('上传失败：' + error.message, 'danger');
        });
    },

    // ======================== 产品总表上传 ========================

    // 产品总表上传处理
    handleProductListUpload(forceOverwrite = false) {
        console.log('产品总表上传处理函数被调用');
        
        const fileInput = document.getElementById('productListFileInput');
        
        if (fileInput.files.length === 0) {
            showAlert('请选择要上传的产品总表文件', 'warning');
            return;
        }
        
        const file = fileInput.files[0];
        console.log('开始上传产品总表文件:', file.name);
        console.log('文件信息:', {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        });
        
        const formData = new FormData();
        formData.append('file', file);
        if (forceOverwrite) {
            formData.append('force_overwrite', 'true');
        }
        
        // 调试：检查formData内容
        console.log('FormData entries:');
        for (let [key, value] of formData.entries()) {
            console.log(key, value);
        }
        
        showSpinner();
        
        APIService.uploadProductList(formData)
        .then(data => {
            hideSpinner();
            
            // 处理重复文件确认
            if (data.requires_confirmation) {
                showConfirmDialog(
                    '文件重复确认',
                    `产品总表文件已存在 ${data.existing_count} 条记录。是否要替换现有数据？`,
                    () => {
                        // 用户确认，强制覆盖
                        this.handleProductListUpload(true);
                    }
                );
                return;
            }
            
            if (data.message) {
                showAlert(data.message, data.count ? 'success' : 'danger');
                
                if (data.count) {
                    // 重置上传表单
                    fileInput.value = '';
                    this.handleFileSelect(null, 'productList');
                    
                    // 如果是普通用户，更新统计信息
                    if (window.loadUserStats && AuthModule.isUser()) {
                        window.loadUserStats();
                    }
                }
            }
        })
        .catch(error => {
            hideSpinner();
            showAlert('产品总表上传失败：' + error.message, 'danger');
        });
    },

    // ======================== 种菜表格上传 ========================

    // 种菜表格登记上传处理
    handlePlantingRecordsUpload(forceOverwrite = false) {
        console.log('种菜表格登记上传处理函数被调用');
        
        const fileInput = document.getElementById('plantingRecordsFileInput');
        
        if (fileInput.files.length === 0) {
            showAlert('请选择要上传的种菜表格登记文件', 'warning');
            return;
        }
        
        const file = fileInput.files[0];
        console.log('开始上传种菜表格登记文件:', file.name);
        console.log('文件信息:', {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        });
        
        const formData = new FormData();
        formData.append('file', file);
        if (forceOverwrite) {
            formData.append('force_overwrite', 'true');
        }
        
        // 调试：检查formData内容
        console.log('FormData entries:');
        for (let [key, value] of formData.entries()) {
            console.log(key, value);
        }
        
        showSpinner();
        
        APIService.uploadPlantingRecords(formData)
        .then(data => {
            hideSpinner();
            
            // 处理重复文件确认
            if (data.requires_confirmation) {
                showConfirmDialog(
                    '文件重复确认',
                    `种菜表格登记文件已存在 ${data.existing_count} 条记录。是否要替换现有数据？`,
                    () => {
                        // 用户确认，强制覆盖
                        this.handlePlantingRecordsUpload(true);
                    }
                );
                return;
            }
            
            if (data.message) {
                showAlert(data.message, data.count ? 'success' : 'danger');
                
                if (data.count) {
                    // 重置上传表单
                    fileInput.value = '';
                    this.handleFileSelect(null, 'plantingRecords');
                    
                    // 如果是普通用户，更新统计信息
                    if (window.loadUserStats && AuthModule.isUser()) {
                        window.loadUserStats();
                    }
                }
            }
        })
        .catch(error => {
            hideSpinner();
            showAlert('种菜表格登记上传失败：' + error.message, 'danger');
        });
    },

    // ======================== 主体报表上传 ========================

    // 主体报表上传处理
    handleSubjectReportUpload(forceOverwrite = false) {
        console.log('主体报表上传处理函数被调用');
        
        const fileInput = document.getElementById('subjectReportFileInput');
        const dateInput = document.getElementById('subjectReportDate');
        
        if (fileInput.files.length === 0) {
            showAlert('请选择要上传的主体报表文件', 'warning');
            return;
        }
        
        if (!dateInput.value) {
            showAlert('请选择报表日期', 'warning');
            return;
        }
        
        console.log('开始上传主体报表文件:', fileInput.files[0].name, '日期:', dateInput.value);
        
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('upload_date', dateInput.value);
        if (forceOverwrite) {
            formData.append('force_overwrite', 'true');
        }
        
        showSpinner();
        
        APIService.uploadSubjectReport(formData)
        .then(data => {
            hideSpinner();
            
            // 处理重复文件确认
            if (data.requires_confirmation) {
                showConfirmDialog(
                    '文件重复确认',
                    `该日期已存在主体报表数据 ${data.existing_count} 条记录。是否要替换现有数据？`,
                    () => {
                        // 用户确认，强制覆盖
                        this.handleSubjectReportUpload(true);
                    }
                );
                return;
            }
            
            if (data.message) {
                showAlert(data.message, data.count ? 'success' : 'danger');
                
                if (data.count) {
                    // 重置上传表单
                    fileInput.value = '';
                    dateInput.value = '';
                    this.handleFileSelect(null, 'subjectReport');
                    this.updateSubjectReportUploadBtn();
                    
                    // 如果是普通用户，更新统计信息
                    if (window.loadUserStats && AuthModule.isUser()) {
                        window.loadUserStats();
                    }
                }
            }
        })
        .catch(error => {
            hideSpinner();
            showAlert('主体报表上传失败：' + error.message, 'danger');
        });
    },

    // ======================== 订单详情上传处理 ========================

    // 处理订单详情上传
    handleOrderDetailsUpload(forceOverwrite = false) {
        console.log('处理订单详情上传，forceOverwrite:', forceOverwrite);
        
        const fileInput = document.getElementById('orderDetailsFileInput');
        const dateInput = document.getElementById('orderDetailsDate');
        
        if (fileInput.files.length === 0) {
            showAlert('请选择要上传的订单详情文件', 'warning');
            return;
        }
        
        if (!dateInput.value) {
            showAlert('请选择订单日期', 'warning');
            return;
        }
        
        console.log('开始上传订单详情文件:', fileInput.files[0].name, '日期:', dateInput.value);
        
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('upload_date', dateInput.value);
        if (forceOverwrite) {
            formData.append('force_overwrite', 'true');
        }
        
        showSpinner();
        
        APIService.uploadOrderDetails(formData)
        .then(data => {
            hideSpinner();
            
            // 处理重复文件确认
            if (data.requires_confirmation) {
                showConfirmDialog(
                    '文件重复确认',
                    `该日期已存在订单详情数据 ${data.existing_count} 条记录。是否要替换现有数据？`,
                    () => {
                        // 用户确认，强制覆盖
                        this.handleOrderDetailsUpload(true);
                    }
                );
                return;
            }
            
            if (data.message) {
                showAlert(data.message, data.count ? 'success' : 'danger');
                
                if (data.count) {
                    // 重置上传表单
                    fileInput.value = '';
                    dateInput.value = '';
                    this.handleFileSelect(null, 'orderDetails');
                    this.updateOrderDetailsUploadBtn();
                    
                    // 如果是普通用户，更新统计信息
                    if (window.loadUserStats && AuthModule.isUser()) {
                        window.loadUserStats();
                    }
                }
            }
        })
        .catch(error => {
            hideSpinner();
            showAlert('订单详情上传失败：' + error.message, 'danger');
        });
    },

    // ======================== 辅助函数 ========================

    // 更新主体报表上传按钮状态
    updateSubjectReportUploadBtn() {
        const fileInput = document.getElementById('subjectReportFileInput');
        const dateInput = document.getElementById('subjectReportDate');
        const uploadBtn = document.getElementById('subjectReportUploadBtn');
        
        const hasFile = fileInput && fileInput.files.length > 0;
        const hasDate = dateInput && dateInput.value !== '';
        
        if (uploadBtn) {
            uploadBtn.disabled = !(hasFile && hasDate);
        }
        
        // 更新按钮显示文本
        if (hasFile) {
            this.handleFileSelect(null, 'subjectReport');
        }
    },

    // 更新订单详情上传按钮状态
    updateOrderDetailsUploadBtn() {
        const fileInput = document.getElementById('orderDetailsFileInput');
        const dateInput = document.getElementById('orderDetailsDate');
        const uploadBtn = document.getElementById('orderDetailsUploadBtn');
        
        const hasFile = fileInput && fileInput.files.length > 0;
        const hasDate = dateInput && dateInput.value !== '';
        
        if (uploadBtn) {
            uploadBtn.disabled = !(hasFile && hasDate);
        }
        
        // 更新按钮显示文本
        if (hasFile) {
            this.handleFileSelect(null, 'orderDetails');
        }
    },

    // ======================== 产品定价上传处理 ========================

    // 处理产品定价上传
    handleProductPricingUpload(forceOverwrite = false) {
        console.log('处理产品定价上传，forceOverwrite:', forceOverwrite);
        
        const fileInput = document.getElementById('productPricingFileInput');
        
        if (fileInput.files.length === 0) {
            showAlert('请选择要上传的产品定价文件', 'warning');
            return;
        }
        
        console.log('开始上传产品定价文件:', fileInput.files[0].name);
        
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        if (forceOverwrite) {
            formData.append('force_overwrite', 'true');
        }
        
        showSpinner();
        
        APIService.uploadProductPricing(formData)
        .then(data => {
            hideSpinner();
            
            // 处理重复文件确认
            if (data.requires_confirmation) {
                showConfirmDialog(
                    '文件重复确认',
                    `该日期已存在产品定价数据 ${data.existing_count} 条记录。是否要替换现有数据？`,
                    () => {
                        // 用户确认，强制覆盖
                        this.handleProductPricingUpload(true);
                    }
                );
                return;
            }
            
            if (data.message) {
                showAlert(data.message, data.count ? 'success' : 'danger');
                
                if (data.count) {
                    // 重置上传表单
                    fileInput.value = '';
                    this.handleFileSelect(null, 'productPricing');
                    this.updateProductPricingUploadBtn();
                    
                    // 如果是普通用户，更新统计信息
                    if (window.loadUserStats && AuthModule.isUser()) {
                        window.loadUserStats();
                    }
                }
            }
        })
        .catch(error => {
            hideSpinner();
            showAlert('产品定价上传失败：' + error.message, 'danger');
        });
    },

    // 更新产品定价上传按钮状态
    updateProductPricingUploadBtn() {
        const fileInput = document.getElementById('productPricingFileInput');
        const uploadBtn = document.getElementById('productPricingUploadBtn');
        
        const hasFile = fileInput && fileInput.files.length > 0;
        
        if (uploadBtn) {
            uploadBtn.disabled = !hasFile;
        }
        
        // 更新按钮显示文本
        if (hasFile) {
            this.handleFileSelect(null, 'productPricing');
        }
    },

    // 更新支付宝上传按钮状态
    updateAlipayUploadBtn() {
        const fileInput = document.getElementById('alipayFileInput');
        const uploadBtn = document.getElementById('alipayUploadBtn');
        const startDate = document.getElementById('alipayStartDate');
        const endDate = document.getElementById('alipayEndDate');
        
        const hasFile = fileInput && fileInput.files.length > 0;
        const hasStartDate = startDate && startDate.value;
        const hasEndDate = endDate && endDate.value;
        
        // 验证日期范围
        let dateRangeValid = true;
        if (hasStartDate && hasEndDate) {
            const start = new Date(startDate.value);
            const end = new Date(endDate.value);
            dateRangeValid = start <= end;
        }
        
        if (uploadBtn) {
            uploadBtn.disabled = !(hasFile && hasStartDate && hasEndDate && dateRangeValid);
        }
        
        // 更新按钮显示文本
        if (hasFile) {
            this.handleFileSelect(null, 'alipay');
        }
        
        // 显示日期范围验证提示
        if (hasStartDate && hasEndDate && !dateRangeValid) {
            showAlert('开始日期不能晚于结束日期', 'warning');
        }
    },

    // 处理支付宝上传
    handleAlipayUpload() {
        console.log('处理支付宝文件上传');
        
        const fileInput = document.getElementById('alipayFileInput');
        const startDate = document.getElementById('alipayStartDate');
        const endDate = document.getElementById('alipayEndDate');
        
        if (fileInput.files.length === 0) {
            showAlert('请选择要上传的支付宝CSV文件', 'warning');
            return;
        }
        
        if (!startDate.value || !endDate.value) {
            showAlert('请选择开始日期和结束日期', 'warning');
            return;
        }
        
        // 验证日期范围
        const start = new Date(startDate.value);
        const end = new Date(endDate.value);
        if (start > end) {
            showAlert('开始日期不能晚于结束日期', 'warning');
            return;
        }
        
        console.log('开始上传支付宝文件:', fileInput.files[0].name, '日期范围:', startDate.value, '到', endDate.value);
        
        showSpinner();
        
        APIService.uploadAlipayFile(fileInput.files[0], startDate.value, endDate.value)
        .then(data => {
            hideSpinner();
            showAlert(data.message, 'success');
            
            // 清空文件选择和日期
            fileInput.value = '';
            startDate.value = '';
            endDate.value = '';
            this.updateAlipayUploadBtn();
            
            console.log('支付宝文件上传成功:', data);
        })
        .catch(error => {
            hideSpinner();
            console.error('支付宝文件上传失败:', error);
            showAlert('支付宝文件上传失败：' + error.message, 'danger');
        });
    },

    // ======================== 事件监听器设置 ========================

    // 设置基础上传事件监听器
    setupBaseUploadEventListeners() {
        if (this._baseListenersSet) {
            console.log('基础上传事件监听器已设置，跳过重复设置');
            return;
        }

        // 平台数据上传相关
        const fileInput = document.getElementById('fileInput');
        const uploadZone = document.getElementById('uploadZone');
        const uploadBtn = document.getElementById('uploadBtn');
        
        if (uploadZone && fileInput && uploadBtn) {
            uploadZone.addEventListener('click', () => fileInput.click());
            uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
            
            fileInput.addEventListener('change', () => this.handleFileSelect());
            uploadBtn.addEventListener('click', () => this.handleFileUpload());
            
            this._baseListenersSet = true;
            console.log('基础上传事件监听器已设置');
        }
    },

    // 设置新的上传功能事件监听器
    setupNewUploadEventListeners() {
        if (this._newListenersSet) {
            console.log('新上传功能事件监听器已设置，跳过重复设置');
            return;
        }
        // 产品总表上传
        const productListUploadZone = document.getElementById('productListUploadZone');
        const productListFileInput = document.getElementById('productListFileInput');
        const productListUploadBtn = document.getElementById('productListUploadBtn');
        
        if (productListUploadZone && productListFileInput && productListUploadBtn) {
            productListUploadZone.addEventListener('click', () => productListFileInput.click());
            productListUploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            productListUploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            productListUploadZone.addEventListener('drop', (e) => this.handleDrop(e, productListFileInput));
            productListFileInput.addEventListener('change', (e) => this.handleFileSelect(e, 'productList'));
            productListUploadBtn.addEventListener('click', () => this.handleProductListUpload());
            console.log('产品总表上传事件监听器已设置');
        } else {
            console.error('产品总表上传元素未找到:', {
                productListUploadZone: !!productListUploadZone,
                productListFileInput: !!productListFileInput,
                productListUploadBtn: !!productListUploadBtn
            });
        }
        
        // 种菜表格登记上传
        const plantingRecordsUploadZone = document.getElementById('plantingRecordsUploadZone');
        const plantingRecordsFileInput = document.getElementById('plantingRecordsFileInput');
        const plantingRecordsUploadBtn = document.getElementById('plantingRecordsUploadBtn');
        
        if (plantingRecordsUploadZone && plantingRecordsFileInput && plantingRecordsUploadBtn) {
            plantingRecordsUploadZone.addEventListener('click', () => plantingRecordsFileInput.click());
            plantingRecordsUploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            plantingRecordsUploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            plantingRecordsUploadZone.addEventListener('drop', (e) => this.handleDrop(e, plantingRecordsFileInput));
            plantingRecordsFileInput.addEventListener('change', (e) => this.handleFileSelect(e, 'plantingRecords'));
            plantingRecordsUploadBtn.addEventListener('click', () => this.handlePlantingRecordsUpload());
            console.log('种菜表格登记上传事件监听器已设置');
        } else {
            console.error('种菜表格登记上传元素未找到:', {
                plantingRecordsUploadZone: !!plantingRecordsUploadZone,
                plantingRecordsFileInput: !!plantingRecordsFileInput,
                plantingRecordsUploadBtn: !!plantingRecordsUploadBtn
            });
        }
        
        // 主体报表上传
        const subjectReportUploadZone = document.getElementById('subjectReportUploadZone');
        const subjectReportFileInput = document.getElementById('subjectReportFileInput');
        const subjectReportUploadBtn = document.getElementById('subjectReportUploadBtn');
        const subjectReportDate = document.getElementById('subjectReportDate');
        
        console.log('主体报表元素检查:', {
            subjectReportUploadZone: !!subjectReportUploadZone,
            subjectReportFileInput: !!subjectReportFileInput,
            subjectReportUploadBtn: !!subjectReportUploadBtn,
            subjectReportDate: !!subjectReportDate
        });
        
        if (subjectReportUploadZone && subjectReportFileInput && subjectReportUploadBtn) {
            // 设置点击事件监听器
            subjectReportUploadZone.addEventListener('click', () => {
                console.log('点击了主体报表上传区域');
                subjectReportFileInput.click();
            });
            
            // 设置拖拽事件监听器
            subjectReportUploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            subjectReportUploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            subjectReportUploadZone.addEventListener('drop', (e) => this.handleDrop(e, subjectReportFileInput));
            
            // 设置文件选择事件监听器
            subjectReportFileInput.addEventListener('change', (e) => {
                console.log('主体报表文件选择发生变化');
                this.handleFileSelect(e, 'subjectReport');
                this.updateSubjectReportUploadBtn();
            });
            
            // 设置日期选择事件监听器（如果存在）
            if (subjectReportDate) {
                subjectReportDate.addEventListener('change', () => this.updateSubjectReportUploadBtn());
            }
            
            // 设置上传按钮事件监听器
            subjectReportUploadBtn.addEventListener('click', () => this.handleSubjectReportUpload());
            
            console.log('主体报表上传事件监听器已设置');
        } else {
            console.error('主体报表上传元素未找到:', {
                subjectReportUploadZone: !!subjectReportUploadZone,
                subjectReportFileInput: !!subjectReportFileInput,
                subjectReportUploadBtn: !!subjectReportUploadBtn,
                subjectReportDate: !!subjectReportDate
            });
        }

        // 订单详情上传
        const orderDetailsUploadZone = document.getElementById('orderDetailsUploadZone');
        const orderDetailsFileInput = document.getElementById('orderDetailsFileInput');
        const orderDetailsUploadBtn = document.getElementById('orderDetailsUploadBtn');
        const orderDetailsDate = document.getElementById('orderDetailsDate');
        
        console.log('订单详情元素检查:', {
            orderDetailsUploadZone: !!orderDetailsUploadZone,
            orderDetailsFileInput: !!orderDetailsFileInput,
            orderDetailsUploadBtn: !!orderDetailsUploadBtn,
            orderDetailsDate: !!orderDetailsDate
        });
        
        if (orderDetailsUploadZone && orderDetailsFileInput && orderDetailsUploadBtn) {
            // 设置点击事件监听器
            orderDetailsUploadZone.addEventListener('click', () => {
                console.log('点击了订单详情上传区域');
                orderDetailsFileInput.click();
            });
            
            // 设置拖拽事件监听器
            orderDetailsUploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            orderDetailsUploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            orderDetailsUploadZone.addEventListener('drop', (e) => this.handleDrop(e, orderDetailsFileInput));
            
            // 设置文件选择事件监听器
            orderDetailsFileInput.addEventListener('change', (e) => {
                console.log('订单详情文件选择发生变化');
                this.handleFileSelect(e, 'orderDetails');
                this.updateOrderDetailsUploadBtn();
            });
            
            // 设置日期选择事件监听器（如果存在）
            if (orderDetailsDate) {
                orderDetailsDate.addEventListener('change', () => this.updateOrderDetailsUploadBtn());
            }
            
            // 设置上传按钮事件监听器
            orderDetailsUploadBtn.addEventListener('click', () => this.handleOrderDetailsUpload());
            
            console.log('订单详情上传事件监听器已设置');
        } else {
            console.error('订单详情上传元素未找到:', {
                orderDetailsUploadZone: !!orderDetailsUploadZone,
                orderDetailsFileInput: !!orderDetailsFileInput,
                orderDetailsUploadBtn: !!orderDetailsUploadBtn,
                orderDetailsDate: !!orderDetailsDate
            });
        }

        // 产品定价上传
        const productPricingUploadZone = document.getElementById('productPricingUploadZone');
        const productPricingFileInput = document.getElementById('productPricingFileInput');
        const productPricingUploadBtn = document.getElementById('productPricingUploadBtn');
        
        console.log('产品定价元素检查:', {
            productPricingUploadZone: !!productPricingUploadZone,
            productPricingFileInput: !!productPricingFileInput,
            productPricingUploadBtn: !!productPricingUploadBtn
        });
        
        if (productPricingUploadZone && productPricingFileInput && productPricingUploadBtn) {
            // 设置点击事件监听器
            productPricingUploadZone.addEventListener('click', () => {
                console.log('点击了产品定价上传区域');
                productPricingFileInput.click();
            });
            
            // 设置拖拽事件监听器
            productPricingUploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            productPricingUploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            productPricingUploadZone.addEventListener('drop', (e) => this.handleDrop(e, productPricingFileInput));
            
            // 设置文件选择事件监听器
            productPricingFileInput.addEventListener('change', (e) => {
                console.log('产品定价文件选择发生变化');
                this.handleFileSelect(e, 'productPricing');
                this.updateProductPricingUploadBtn();
            });
            
            // 设置上传按钮事件监听器
            productPricingUploadBtn.addEventListener('click', () => this.handleProductPricingUpload());
            
            console.log('产品定价上传事件监听器已设置');
        } else {
            console.error('产品定价上传元素未找到:', {
                productPricingUploadZone: !!productPricingUploadZone,
                productPricingFileInput: !!productPricingFileInput,
                productPricingUploadBtn: !!productPricingUploadBtn
            });
        }

        // 支付宝金额上传
        const alipayUploadZone = document.getElementById('alipayUploadZone');
        const alipayFileInput = document.getElementById('alipayFileInput');
        const alipayUploadBtn = document.getElementById('alipayUploadBtn');
        const alipayStartDate = document.getElementById('alipayStartDate');
        const alipayEndDate = document.getElementById('alipayEndDate');
        
        console.log('支付宝上传元素检查:', {
            alipayUploadZone: !!alipayUploadZone,
            alipayFileInput: !!alipayFileInput,
            alipayUploadBtn: !!alipayUploadBtn,
            alipayStartDate: !!alipayStartDate,
            alipayEndDate: !!alipayEndDate
        });
        
        if (alipayUploadZone && alipayFileInput && alipayUploadBtn && alipayStartDate && alipayEndDate) {
            // 设置点击事件监听器
            alipayUploadZone.addEventListener('click', () => {
                console.log('点击了支付宝上传区域');
                alipayFileInput.click();
            });
            
            // 设置拖拽事件监听器
            alipayUploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            alipayUploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            alipayUploadZone.addEventListener('drop', (e) => this.handleDrop(e, alipayFileInput));
            
            // 设置文件选择事件监听器
            alipayFileInput.addEventListener('change', (e) => {
                console.log('支付宝文件选择发生变化');
                this.handleFileSelect(e, 'alipay');
                this.updateAlipayUploadBtn();
            });
            
            // 设置日期选择事件监听器
            alipayStartDate.addEventListener('change', () => this.updateAlipayUploadBtn());
            alipayEndDate.addEventListener('change', () => this.updateAlipayUploadBtn());
            
            // 设置上传按钮事件监听器
            alipayUploadBtn.addEventListener('click', () => this.handleAlipayUpload());
            
            console.log('支付宝上传事件监听器已设置');
        } else {
            console.error('支付宝上传元素未找到:', {
                alipayUploadZone: !!alipayUploadZone,
                alipayFileInput: !!alipayFileInput,
                alipayUploadBtn: !!alipayUploadBtn,
                alipayStartDate: !!alipayStartDate,
                alipayEndDate: !!alipayEndDate
            });
        }

        this._newListenersSet = true;
        console.log('新上传功能事件监听器全部设置完成');
    }
};

// 将UploadModule暴露给全局使用
window.UploadModule = UploadModule;

// 暴露兼容性函数给外部调用（保持现有代码兼容）
window.handleDragOver = (e) => UploadModule.handleDragOver(e);
window.handleDragLeave = (e) => UploadModule.handleDragLeave(e);
window.handleDrop = (e, fileInput) => UploadModule.handleDrop(e, fileInput);
window.handleFileSelect = (event, uploadType) => UploadModule.handleFileSelect(event, uploadType);
window.handleFileUpload = (forceOverwrite) => UploadModule.handleFileUpload(forceOverwrite);
window.handleProductListUpload = (forceOverwrite) => UploadModule.handleProductListUpload(forceOverwrite);
window.handlePlantingRecordsUpload = (forceOverwrite) => UploadModule.handlePlantingRecordsUpload(forceOverwrite);
window.handleSubjectReportUpload = (forceOverwrite) => UploadModule.handleSubjectReportUpload(forceOverwrite);
window.handleOrderDetailsUpload = (forceOverwrite) => UploadModule.handleOrderDetailsUpload(forceOverwrite);
window.handleProductPricingUpload = (forceOverwrite) => UploadModule.handleProductPricingUpload(forceOverwrite);
window.handleAlipayUpload = () => UploadModule.handleAlipayUpload();
window.updateSubjectReportUploadBtn = () => UploadModule.updateSubjectReportUploadBtn();
window.updateOrderDetailsUploadBtn = () => UploadModule.updateOrderDetailsUploadBtn();
window.updateProductPricingUploadBtn = () => UploadModule.updateProductPricingUploadBtn();
window.updateAlipayUploadBtn = () => UploadModule.updateAlipayUploadBtn(); 