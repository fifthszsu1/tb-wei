/**
 * 最终汇总模块
 * 负责最终数据汇总计算、事件监听器管理、结果显示等功能
 */

// 最终汇总模块对象
const FinalModule = {
    // ======================== 内部状态 ========================
    
    // 存储事件监听器函数的引用，以便正确移除
    _eventListeners: {
        dateChangeHandler: null,
        calculateClickHandler: null
    },

    // ======================== 事件监听器管理 ========================

    // 设置最终汇总功能事件监听器
    setupFinalSummaryEventListeners() {
        console.log('正在设置最终汇总事件监听器...');
        
        const finalSummaryDate = document.getElementById('finalSummaryDate');
        const calculateFinalSummaryBtn = document.getElementById('calculateFinalSummaryBtn');
        
        console.log('最终汇总元素检查:', {
            finalSummaryDate: !!finalSummaryDate,
            calculateFinalSummaryBtn: !!calculateFinalSummaryBtn
        });
        
        // 先移除之前的监听器
        this.removeFinalEventListeners();
        
        if (finalSummaryDate && calculateFinalSummaryBtn) {
            // 设置默认日期为今天
            const today = new Date().toISOString().split('T')[0];
            finalSummaryDate.value = today;
            
            // 创建监听器函数并存储引用
            this._eventListeners.dateChangeHandler = () => this.updateFinalCalculateButton();
            this._eventListeners.calculateClickHandler = () => this.handleCalculateFinalSummary();
            
            // 监听日期变化
            finalSummaryDate.addEventListener('change', this._eventListeners.dateChangeHandler);
            
            // 监听计算按钮点击
            calculateFinalSummaryBtn.addEventListener('click', this._eventListeners.calculateClickHandler);
            
            // 初始化按钮状态
            this.updateFinalCalculateButton();
            
            console.log('最终汇总事件监听器已设置');
        } else {
            console.error('最终汇总元素未找到:', {
                finalSummaryDate: !!finalSummaryDate,
                calculateFinalSummaryBtn: !!calculateFinalSummaryBtn
            });
        }
    },

    // 移除最终汇总事件监听器
    removeFinalEventListeners() {
        const finalSummaryDate = document.getElementById('finalSummaryDate');
        const calculateFinalSummaryBtn = document.getElementById('calculateFinalSummaryBtn');
        
        if (finalSummaryDate && this._eventListeners.dateChangeHandler) {
            finalSummaryDate.removeEventListener('change', this._eventListeners.dateChangeHandler);
            this._eventListeners.dateChangeHandler = null;
        }
        
        if (calculateFinalSummaryBtn && this._eventListeners.calculateClickHandler) {
            calculateFinalSummaryBtn.removeEventListener('click', this._eventListeners.calculateClickHandler);
            this._eventListeners.calculateClickHandler = null;
        }
        
        console.log('最终汇总事件监听器已移除');
    },

    // ======================== 按钮状态管理 ========================

    // 更新最终汇总计算按钮状态
    updateFinalCalculateButton() {
        const finalSummaryDate = document.getElementById('finalSummaryDate');
        const calculateFinalSummaryBtn = document.getElementById('calculateFinalSummaryBtn');
        
        if (finalSummaryDate && calculateFinalSummaryBtn) {
            const hasDate = finalSummaryDate.value !== '';
            calculateFinalSummaryBtn.disabled = !hasDate;
            
            if (hasDate) {
                calculateFinalSummaryBtn.innerHTML = `<i class="fas fa-chart-line"></i> 计算 ${finalSummaryDate.value} 的最终汇总`;
            } else {
                calculateFinalSummaryBtn.innerHTML = `<i class="fas fa-chart-line"></i> 开始计算最终汇总`;
            }
        }
    },

    // ======================== 汇总计算核心功能 ========================

    // 处理最终汇总计算
    handleCalculateFinalSummary() {
        console.log('handleCalculateFinalSummary 函数被调用');
        
        const finalSummaryDate = document.getElementById('finalSummaryDate');
        const targetDate = finalSummaryDate ? finalSummaryDate.value : '';
        
        console.log('选择的日期:', targetDate);
        
        if (!targetDate) {
            console.log('没有选择日期，显示警告');
            showAlert('请选择要计算的日期', 'warning');
            return;
        }
        
        // 显示确认对话框
        showConfirmDialog(
            '确认计算最终汇总',
            `确定要计算 ${targetDate} 的最终数据汇总吗？<br><br>
            <small class="text-muted">
            系统将：<br>
            1. 查找该日期的商品排行数据<br>
            2. 计算转化率指标（支付转化率、收藏率、加购率）<br>
            3. 计算价值指标（UV价值、真实转化率）<br>
            4. 计算成本费用（产品成本、订单扣点、税票、物流成本）<br>
            5. 计算最终毛利<br>
            </small>`,
            () => this.executeFinalSummary(targetDate)
        );
    },

    // 执行最终汇总计算
    executeFinalSummary(targetDate) {
        console.log(`开始计算 ${targetDate} 的最终汇总数据`);
        
        // 隐藏之前的结果
        const finalSummaryResults = document.getElementById('finalSummaryResults');
        if (finalSummaryResults) {
            finalSummaryResults.style.display = 'none';
        }
        
        // 显示加载动画
        showSpinner();
        
        // 禁用计算按钮
        const calculateFinalSummaryBtn = document.getElementById('calculateFinalSummaryBtn');
        if (calculateFinalSummaryBtn) {
            calculateFinalSummaryBtn.disabled = true;
            calculateFinalSummaryBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 正在计算...`;
        }
        
        APIService.calculateFinalSummary(targetDate)
        .then(data => {
            console.log('最终汇总计算成功:', data);
            hideSpinner();
            
            if (data.error_type) {
                // 处理特定错误类型
                this.handleFinalError(data);
            } else {
                // 显示成功消息
                showAlert(data.message, 'success');
                // 显示计算结果
                this.displayFinalSummaryResults(data);
            }
        })
        .catch(error => {
            console.error('最终汇总计算失败:', error);
            hideSpinner();
            showAlert('计算失败：' + error.message, 'danger');
        })
        .finally(() => {
            // 恢复按钮状态
            if (calculateFinalSummaryBtn) {
                calculateFinalSummaryBtn.disabled = false;
                this.updateFinalCalculateButton();
            }
        });
    },

    // ======================== 错误处理 ========================

    // 处理最终汇总错误
    handleFinalError(data) {
        if (data.error_type === 'NO_DATA') {
            showAlert('未找到所选日期的数据，请确保已上传商品排行数据', 'warning');
        } else {
            showAlert(data.message || '计算失败，请稍后重试', 'danger');
        }
    },

    // ======================== 结果显示功能 ========================

    // 显示最终汇总计算结果
    displayFinalSummaryResults(data) {
        const resultsDiv = document.getElementById('finalSummaryResults');
        if (!resultsDiv) {
            console.error('finalSummaryResults 元素未找到');
            return;
        }
        
        resultsDiv.style.display = 'block';
        
        // 创建结果HTML
        const resultHtml = this.createFinalResultsHTML(data);
        resultsDiv.innerHTML = resultHtml;
        
        // 滚动到结果区域
        resultsDiv.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
        
        console.log('最终汇总结果已显示');
    },

    // 创建最终汇总结果HTML
    createFinalResultsHTML(data) {
        const updateCount = data.count || 0;
        const currentTime = new Date().toLocaleString();
        
        return `
            <div class="card mt-4">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0">
                        <i class="fas fa-chart-line"></i> 最终汇总计算结果
                    </h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-bordered">
                            <thead class="table-light">
                                <tr>
                                    <th>更新记录数</th>
                                    <th>计算时间</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>${updateCount}</strong> 条</td>
                                    <td>${currentTime}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="alert alert-success mt-3">
                        <h6><i class="fas fa-check-circle"></i> 计算完成！</h6>
                        <p class="mb-2">系统已成功计算并更新了以下数据：</p>
                        <ul class="mb-0">
                            <li><strong>转化率指标</strong>（支付转化率、收藏率、加购率）</li>
                            <li><strong>价值指标</strong>（UV价值、真实转化率）</li>
                            <li><strong>真实数据</strong>（真实金额、真实买家数、真实件数）</li>
                            <li><strong>成本费用</strong>（产品成本、订单扣点、税票、物流成本）</li>
                            <li><strong>最终毛利</strong></li>
                        </ul>
                    </div>
                    
                    ${this.createFinalMetricsHTML(data)}
                </div>
            </div>
        `;
    },

    // 创建最终汇总指标HTML（如果有详细数据）
    createFinalMetricsHTML(data) {
        if (!data.metrics) {
            return '';
        }
        
        const metrics = data.metrics;
        return `
            <div class="row mt-3">
                <div class="col-md-4">
                    <div class="card border-success">
                        <div class="card-header bg-success text-white">
                            <h6 class="mb-0">转化率指标</h6>
                        </div>
                        <div class="card-body">
                            <p class="mb-1">支付转化率: <strong>${(metrics.payment_rate || 0).toFixed(2)}%</strong></p>
                            <p class="mb-1">收藏率: <strong>${(metrics.collection_rate || 0).toFixed(2)}%</strong></p>
                            <p class="mb-0">加购率: <strong>${(metrics.cart_rate || 0).toFixed(2)}%</strong></p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-info">
                        <div class="card-header bg-info text-white">
                            <h6 class="mb-0">价值指标</h6>
                        </div>
                        <div class="card-body">
                            <p class="mb-1">UV价值: <strong>¥${(metrics.uv_value || 0).toFixed(2)}</strong></p>
                            <p class="mb-0">真实转化率: <strong>${(metrics.real_conversion_rate || 0).toFixed(2)}%</strong></p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-warning">
                        <div class="card-header bg-warning text-white">
                            <h6 class="mb-0">成本与毛利</h6>
                        </div>
                        <div class="card-body">
                            <p class="mb-1">总成本: <strong>¥${(metrics.total_cost || 0).toFixed(2)}</strong></p>
                            <p class="mb-0">最终毛利: <strong>¥${(metrics.final_profit || 0).toFixed(2)}</strong></p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ======================== 模块初始化 ========================

    // 初始化最终汇总模块
    initializeFinalModule() {
        console.log('最终汇总模块初始化');
        
        // 检查必要的DOM元素是否存在
        const requiredElements = ['finalSummaryDate', 'calculateFinalSummaryBtn'];
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.warn('最终汇总模块初始化失败，缺少必要元素:', missingElements);
            return false;
        }
        
        // 设置事件监听器
        this.setupFinalSummaryEventListeners();
        
        console.log('最终汇总模块初始化完成');
        return true;
    }
};

// 将FinalModule暴露给全局使用
window.FinalModule = FinalModule;

// 暴露兼容性函数给外部调用（保持现有代码兼容）
window.setupFinalSummaryEventListeners = () => FinalModule.setupFinalSummaryEventListeners();
window.updateFinalCalculateButton = () => FinalModule.updateFinalCalculateButton();
window.handleCalculateFinalSummary = () => FinalModule.handleCalculateFinalSummary(); 