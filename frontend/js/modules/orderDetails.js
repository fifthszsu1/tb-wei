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
        
        const orderDetailsSummaryDate = document.getElementById('orderDetailsSummaryDate');
        const calculateOrderDetailsMergeBtn = document.getElementById('calculateOrderDetailsMergeBtn');
        const calculateOrderCostSummaryBtn = document.getElementById('calculateOrderCostSummaryBtn');
        
        console.log('订单详情汇总元素检查:', {
            orderDetailsSummaryDate: !!orderDetailsSummaryDate,
            calculateOrderDetailsMergeBtn: !!calculateOrderDetailsMergeBtn,
            calculateOrderCostSummaryBtn: !!calculateOrderCostSummaryBtn
        });
        
        if (orderDetailsSummaryDate) {
            // 日期变化时更新按钮状态
            orderDetailsSummaryDate.addEventListener('change', () => this.updateOrderDetailsSummaryButtons());
            
            // 设置默认日期为今天
            if (!orderDetailsSummaryDate.value) {
                const today = new Date().toISOString().split('T')[0];
                orderDetailsSummaryDate.value = today;
                console.log('设置订单详情汇总默认日期:', today);
            }
            this.updateOrderDetailsSummaryButtons();
            console.log('订单详情汇总日期选择器事件监听器已设置');
        } else {
            console.error('orderDetailsSummaryDate 元素未找到！');
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
    },

    // ======================== 按钮状态管理 ========================

    updateOrderDetailsSummaryButtons() {
        const orderDetailsSummaryDate = document.getElementById('orderDetailsSummaryDate');
        const calculateOrderDetailsMergeBtn = document.getElementById('calculateOrderDetailsMergeBtn');
        const calculateOrderCostSummaryBtn = document.getElementById('calculateOrderCostSummaryBtn');
        
        const hasDate = orderDetailsSummaryDate && orderDetailsSummaryDate.value;
        
        if (calculateOrderDetailsMergeBtn) {
            calculateOrderDetailsMergeBtn.disabled = !hasDate;
        }
        
        if (calculateOrderCostSummaryBtn) {
            calculateOrderCostSummaryBtn.disabled = !hasDate;
        }
        
        console.log('订单详情汇总按钮状态已更新，日期可用:', hasDate);
    },

    // ======================== 第一步：订单详情关联产品总表 ========================

    async handleCalculateOrderDetailsMerge() {
        console.log('开始执行订单详情合并计算（第一步）');
        
        const dateInput = document.getElementById('orderDetailsSummaryDate');
        const targetDate = dateInput.value;
        
        if (!targetDate) {
            alert('请选择日期');
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
            const response = await APIService.calculateOrderDetailsMerge(targetDate);
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
        
        const dateInput = document.getElementById('orderDetailsSummaryDate');
        const targetDate = dateInput.value;
        
        if (!targetDate) {
            alert('请选择日期');
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
            const response = await APIService.calculateOrderCostSummary(targetDate);
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
            'orderDetailsSummaryDate', 
            'calculateOrderDetailsMergeBtn', 
            'calculateOrderCostSummaryBtn'
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