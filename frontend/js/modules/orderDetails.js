/**
 * 订单详情汇总计算模块
 * 负责订单详情与产品总表关联、运营成本价格匹配和成本计算等功能
 */

// 订单详情汇总模块对象
const OrderDetailsModule = {
    // ======================== 事件监听器管理 ========================

    // 设置订单详情汇总功能的事件监听器
    setupOrderDetailsSummaryEventListeners() {
        console.log('正在设置订单详情汇总事件监听器...');
        
        const orderDetailsSummaryStartDate = document.getElementById('orderDetailsSummaryStartDate');
        const orderDetailsSummaryEndDate = document.getElementById('orderDetailsSummaryEndDate');
        const calculateOrderDetailsMergeBtn = document.getElementById('calculateOrderDetailsMergeBtn');
        const calculateOrderCostSummaryBtn = document.getElementById('calculateOrderCostSummaryBtn');
        const calculateOrderPaymentUpdateBtn = document.getElementById('calculateOrderPaymentUpdateBtn');
        
        console.log('订单详情汇总元素检查:', {
            orderDetailsSummaryStartDate: !!orderDetailsSummaryStartDate,
            orderDetailsSummaryEndDate: !!orderDetailsSummaryEndDate,
            calculateOrderDetailsMergeBtn: !!calculateOrderDetailsMergeBtn,
            calculateOrderCostSummaryBtn: !!calculateOrderCostSummaryBtn,
            calculateOrderPaymentUpdateBtn: !!calculateOrderPaymentUpdateBtn
        });
        
        if (orderDetailsSummaryStartDate) {
            // 开始日期变化时更新按钮状态
            orderDetailsSummaryStartDate.addEventListener('change', () => this.updateOrderDetailsSummaryButtons());
            
            // 设置默认开始日期为今天
            if (!orderDetailsSummaryStartDate.value) {
                const today = new Date().toISOString().split('T')[0];
                orderDetailsSummaryStartDate.value = today;
                console.log('设置订单详情汇总默认开始日期:', today);
            }
            console.log('订单详情汇总开始日期选择器事件监听器已设置');
        } else {
            console.error('orderDetailsSummaryStartDate 元素未找到！');
        }

        if (orderDetailsSummaryEndDate) {
            // 结束日期变化时更新按钮状态
            orderDetailsSummaryEndDate.addEventListener('change', () => this.updateOrderDetailsSummaryButtons());
            
            // 设置默认结束日期为今天
            if (!orderDetailsSummaryEndDate.value) {
                const today = new Date().toISOString().split('T')[0];
                orderDetailsSummaryEndDate.value = today;
                console.log('设置订单详情汇总默认结束日期:', today);
            }
            this.updateOrderDetailsSummaryButtons();
            console.log('订单详情汇总结束日期选择器事件监听器已设置');
        } else {
            console.error('orderDetailsSummaryEndDate 元素未找到！');
        }
        
        if (calculateOrderDetailsMergeBtn) {
            calculateOrderDetailsMergeBtn.addEventListener('click', () => this.handleCalculateOrderDetailsMerge());
            console.log('第一步计算按钮事件监听器已设置');
        } else {
            console.error('calculateOrderDetailsMergeBtn 元素未找到！');
        }
        
        if (calculateOrderCostSummaryBtn) {
            calculateOrderCostSummaryBtn.addEventListener('click', () => this.handleCalculateOrderCostSummary());
            console.log('第二步计算按钮事件监听器已设置');
        } else {
            console.error('calculateOrderCostSummaryBtn 元素未找到！');
        }

        if (calculateOrderPaymentUpdateBtn) {
            calculateOrderPaymentUpdateBtn.addEventListener('click', () => this.handleCalculateOrderPaymentUpdate());
            console.log('第三步计算按钮事件监听器已设置');
        } else {
            console.error('calculateOrderPaymentUpdateBtn 元素未找到！');
        }
    },

    // ======================== 按钮状态管理 ========================

    updateOrderDetailsSummaryButtons() {
        const orderDetailsSummaryStartDate = document.getElementById('orderDetailsSummaryStartDate');
        const orderDetailsSummaryEndDate = document.getElementById('orderDetailsSummaryEndDate');
        const calculateOrderDetailsMergeBtn = document.getElementById('calculateOrderDetailsMergeBtn');
        const calculateOrderCostSummaryBtn = document.getElementById('calculateOrderCostSummaryBtn');
        const calculateOrderPaymentUpdateBtn = document.getElementById('calculateOrderPaymentUpdateBtn');
        
        const hasStartDate = orderDetailsSummaryStartDate && orderDetailsSummaryStartDate.value;
        const hasEndDate = orderDetailsSummaryEndDate && orderDetailsSummaryEndDate.value;
        const hasDateRange = hasStartDate && hasEndDate;
        
        // 检查日期区间是否有效（开始日期不能晚于结束日期）
        let isDateRangeValid = false;
        if (hasDateRange) {
            const startDate = new Date(orderDetailsSummaryStartDate.value);
            const endDate = new Date(orderDetailsSummaryEndDate.value);
            isDateRangeValid = startDate <= endDate;
        }
        
        if (calculateOrderDetailsMergeBtn) {
            calculateOrderDetailsMergeBtn.disabled = !isDateRangeValid;
        }
        
        if (calculateOrderCostSummaryBtn) {
            calculateOrderCostSummaryBtn.disabled = !isDateRangeValid;
        }

        if (calculateOrderPaymentUpdateBtn) {
            calculateOrderPaymentUpdateBtn.disabled = !isDateRangeValid;
        }
        
        console.log('订单详情汇总按钮状态已更新，日期区间有效:', isDateRangeValid);
    },

    // ======================== 第一步：订单详情关联产品总表 ========================

    async handleCalculateOrderDetailsMerge() {
        console.log('开始执行订单详情合并计算（第一步）');
        
        const startDateInput = document.getElementById('orderDetailsSummaryStartDate');
        const endDateInput = document.getElementById('orderDetailsSummaryEndDate');
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        
        if (!startDate || !endDate) {
            alert('请选择完整的日期区间');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            alert('开始日期不能晚于结束日期');
            return;
        }
        
        const calculateBtn = document.getElementById('calculateOrderDetailsMergeBtn');
        const resultsDiv = document.getElementById('orderDetailsSummaryResults');
        const step1Results = document.getElementById('step1Results');
        const loadingIndicator = document.getElementById('orderDetailsCalculatingIndicator');
        
        try {
            // 显示加载状态
            calculateBtn.disabled = true;
            calculateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 计算中...';
            loadingIndicator.style.display = 'block';
            
            // 调用API
            const response = await APIService.calculateOrderDetailsMerge(startDate, endDate);
            console.log('订单详情合并计算响应:', response);
            
            // 显示结果
            if (response.stats) {
                resultsDiv.style.display = 'block';
                step1Results.style.display = 'block';
                
                // 更新统计数据
                document.getElementById('step1ProcessedCount').textContent = response.stats.processed_count || 0;
                document.getElementById('step1MatchedCount').textContent = response.stats.matched_count || 0;
                document.getElementById('step1CreatedCount').textContent = response.stats.created_count || 0;
            }
            
            // 显示成功消息
            this.showAlert('success', response.message || '订单详情合并计算完成！');
            
        } catch (error) {
            console.error('订单详情合并计算失败:', error);
            
            let errorMessage = '订单详情合并计算失败';
            if (error.message) {
                errorMessage = error.message;
            } else if (error.error_type) {
                switch (error.error_type) {
                    case 'missing_order_details':
                        errorMessage = '未找到指定日期的订单详情数据，请先上传订单详情文件';
                        break;
                    default:
                        errorMessage = error.message || '计算失败，请检查数据';
                }
            }
            
            this.showAlert('danger', errorMessage);
        } finally {
            // 恢复按钮状态
            calculateBtn.disabled = false;
            calculateBtn.innerHTML = '<i class="fas fa-link"></i> 第一步：关联产品总表';
            loadingIndicator.style.display = 'none';
        }
    },

    // ======================== 第二步：成本汇总计算 ========================

    async handleCalculateOrderCostSummary() {
        console.log('开始执行订单成本汇总计算（第二步）');
        
        const startDateInput = document.getElementById('orderDetailsSummaryStartDate');
        const endDateInput = document.getElementById('orderDetailsSummaryEndDate');
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        
        if (!startDate || !endDate) {
            alert('请选择完整的日期区间');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            alert('开始日期不能晚于结束日期');
            return;
        }
        
        const calculateBtn = document.getElementById('calculateOrderCostSummaryBtn');
        const resultsDiv = document.getElementById('orderDetailsSummaryResults');
        const step2Results = document.getElementById('step2Results');
        const loadingIndicator = document.getElementById('orderDetailsCalculatingIndicator');
        
        try {
            // 显示加载状态
            calculateBtn.disabled = true;
            calculateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 计算中...';
            loadingIndicator.style.display = 'block';
            
            // 调用API
            const response = await APIService.calculateOrderCostSummary(startDate, endDate);
            console.log('订单成本汇总计算响应:', response);
            
            // 显示结果
            if (response.stats) {
                resultsDiv.style.display = 'block';
                step2Results.style.display = 'block';
                
                // 更新统计数据
                document.getElementById('step2ProcessedCount').textContent = response.stats.processed_count || 0;
                document.getElementById('step2CostMatchedCount').textContent = response.stats.operation_cost_matched_count || 0;
                document.getElementById('step2UpdatedCount').textContent = response.stats.updated_count || 0;
                document.getElementById('step2CostCalculatedCount').textContent = response.stats.cost_calculated_count || 0;
            }
            
            // 显示成功消息
            this.showAlert('success', response.message || '订单成本汇总计算完成！');
            
        } catch (error) {
            console.error('订单成本汇总计算失败:', error);
            
            let errorMessage = '订单成本汇总计算失败';
            if (error.message) {
                errorMessage = error.message;
            } else if (error.error_type) {
                switch (error.error_type) {
                    case 'missing_merge_data':
                        errorMessage = '未找到订单详情合并数据，请先执行第一步：关联产品总表';
                        break;
                    default:
                        errorMessage = error.message || '计算失败，请检查数据';
                }
            }
            
            this.showAlert('danger', errorMessage);
        } finally {
            // 恢复按钮状态
            calculateBtn.disabled = false;
            calculateBtn.innerHTML = '<i class="fas fa-calculator"></i> 第二步：计算成本汇总';
            loadingIndicator.style.display = 'none';
        }
    },

    // ======================== 第三步：更新支付金额 ========================

    async handleCalculateOrderPaymentUpdate() {
        console.log('开始执行订单支付金额更新（第三步）');
        
        const startDateInput = document.getElementById('orderDetailsSummaryStartDate');
        const endDateInput = document.getElementById('orderDetailsSummaryEndDate');
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        
        if (!startDate || !endDate) {
            alert('请选择完整的日期区间');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            alert('开始日期不能晚于结束日期');
            return;
        }
        
        const calculateBtn = document.getElementById('calculateOrderPaymentUpdateBtn');
        const resultsDiv = document.getElementById('orderDetailsSummaryResults');
        const step3Results = document.getElementById('step3Results');
        const loadingIndicator = document.getElementById('orderDetailsCalculatingIndicator');
        
        try {
            // 显示加载状态
            calculateBtn.disabled = true;
            calculateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 更新中...';
            loadingIndicator.style.display = 'block';
            
            // 调用API
            const response = await APIService.calculateOrderPaymentUpdate(startDate, endDate);
            console.log('订单支付金额更新响应:', response);
            
            // 显示结果
            if (response.stats) {
                resultsDiv.style.display = 'block';
                step3Results.style.display = 'block';
                
                // 更新统计数据
                document.getElementById('step3ProcessedCount').textContent = response.stats.processed_count || 0;
                document.getElementById('step3MatchedCount').textContent = response.stats.matched_count || 0;
                document.getElementById('step3UpdatedCount').textContent = response.stats.updated_count || 0;
                document.getElementById('step3TotalAmount').textContent = response.stats.total_amount || 0;
            }
            
            // 显示成功消息
            this.showAlert('success', response.message || '订单支付金额更新完成！');
            
        } catch (error) {
            console.error('订单支付金额更新失败:', error);
            
            let errorMessage = '订单支付金额更新失败';
            if (error.message) {
                errorMessage = error.message;
            } else if (error.error_type) {
                switch (error.error_type) {
                    case 'missing_merge_data':
                        errorMessage = '未找到订单详情合并数据，请先执行前两步';
                        break;
                    case 'missing_alipay_data':
                        errorMessage = '未找到支付宝金额数据，请先上传支付宝数据';
                        break;
                    default:
                        errorMessage = error.message || '更新失败，请检查数据';
                }
            }
            
            this.showAlert('danger', errorMessage);
        } finally {
            // 恢复按钮状态
            calculateBtn.disabled = false;
            calculateBtn.innerHTML = '<i class="fas fa-credit-card"></i> 第三步：更新支付金额';
            loadingIndicator.style.display = 'none';
        }
    },

    // ======================== 工具方法 ========================

    // 显示提示消息
    showAlert(type, message) {
        // 创建提示框元素
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
        alertDiv.innerHTML = `
            <strong>${type === 'success' ? '成功！' : '错误！'}</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // 查找结果显示区域
        const resultsDiv = document.getElementById('orderDetailsSummaryResults');
        if (resultsDiv) {
            resultsDiv.appendChild(alertDiv);
        } else {
            // 如果没有结果区域，显示在页面顶部
            document.body.insertBefore(alertDiv, document.body.firstChild);
        }
        
        // 3秒后自动关闭
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 3000);
    },

    // ======================== 模块初始化 ========================

    // 初始化订单详情汇总模块
    initializeOrderDetailsModule() {
        console.log('订单详情汇总模块初始化');
        
        // 检查必要的DOM元素是否存在
        const requiredElements = [
            'orderDetailsSummaryStartDate',
            'orderDetailsSummaryEndDate', 
            'calculateOrderDetailsMergeBtn', 
            'calculateOrderCostSummaryBtn',
            'calculateOrderPaymentUpdateBtn'
        ];
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.warn('订单详情汇总模块初始化失败，缺少必要元素:', missingElements);
            return false;
        }
        
        // 设置事件监听器
        this.setupOrderDetailsSummaryEventListeners();
        
        console.log('订单详情汇总模块初始化完成');
        return true;
    }
};

// 将OrderDetailsModule暴露给全局使用
window.OrderDetailsModule = OrderDetailsModule;

// 暴露兼容性函数给外部调用（保持现有代码兼容）
window.setupOrderDetailsSummaryEventListeners = () => OrderDetailsModule.setupOrderDetailsSummaryEventListeners();
window.updateOrderDetailsSummaryButtons = () => OrderDetailsModule.updateOrderDetailsSummaryButtons();
window.handleCalculateOrderDetailsMerge = () => OrderDetailsModule.handleCalculateOrderDetailsMerge();
window.handleCalculateOrderCostSummary = () => OrderDetailsModule.handleCalculateOrderCostSummary();
window.handleCalculateOrderPaymentUpdate = () => OrderDetailsModule.handleCalculateOrderPaymentUpdate(); 