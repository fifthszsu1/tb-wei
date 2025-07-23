/**
 * 种菜汇总模块
 * 负责种菜数据汇总计算、事件监听器管理、结果显示等功能
 */

// 种菜汇总模块对象
const PlantingModule = {
    // ======================== 内部状态 ========================
    
    // 存储事件监听器函数的引用，以便正确移除
    _eventListeners: {
        dateChangeHandler: null,
        calculateClickHandler: null
    },

    // ======================== 事件监听器管理 ========================

    // 设置种菜汇总功能事件监听器
    setupPlantingSummaryEventListeners() {
        console.log('正在设置种菜汇总事件监听器...');
        
        const plantingSummaryDate = document.getElementById('plantingSummaryDate');
        const calculatePlantingSummaryBtn = document.getElementById('calculatePlantingSummaryBtn');
        
        console.log('种菜汇总元素检查:', {
            plantingSummaryDate: !!plantingSummaryDate,
            calculatePlantingSummaryBtn: !!calculatePlantingSummaryBtn
        });
        
        // 先移除之前的监听器
        this.removePlantingEventListeners();
        
        if (plantingSummaryDate && calculatePlantingSummaryBtn) {
            // 设置默认日期为今天
            const today = new Date().toISOString().split('T')[0];
            plantingSummaryDate.value = today;
            
            // 创建监听器函数并存储引用
            this._eventListeners.dateChangeHandler = () => this.updatePlantingCalculateButton();
            this._eventListeners.calculateClickHandler = () => this.handleCalculatePlantingSummary();
            
            // 监听日期变化
            plantingSummaryDate.addEventListener('change', this._eventListeners.dateChangeHandler);
            
            // 监听计算按钮点击
            calculatePlantingSummaryBtn.addEventListener('click', this._eventListeners.calculateClickHandler);
            
            // 初始化按钮状态
            this.updatePlantingCalculateButton();
            
            console.log('种菜汇总事件监听器已设置');
        } else {
            console.error('种菜汇总元素未找到:', {
                plantingSummaryDate: !!plantingSummaryDate,
                calculatePlantingSummaryBtn: !!calculatePlantingSummaryBtn
            });
        }
    },

    // 移除种菜汇总事件监听器
    removePlantingEventListeners() {
        const plantingSummaryDate = document.getElementById('plantingSummaryDate');
        const calculatePlantingSummaryBtn = document.getElementById('calculatePlantingSummaryBtn');
        
        if (plantingSummaryDate && this._eventListeners.dateChangeHandler) {
            plantingSummaryDate.removeEventListener('change', this._eventListeners.dateChangeHandler);
            this._eventListeners.dateChangeHandler = null;
        }
        
        if (calculatePlantingSummaryBtn && this._eventListeners.calculateClickHandler) {
            calculatePlantingSummaryBtn.removeEventListener('click', this._eventListeners.calculateClickHandler);
            this._eventListeners.calculateClickHandler = null;
        }
        
        console.log('种菜汇总事件监听器已移除');
    },

    // ======================== 按钮状态管理 ========================

    // 更新种菜汇总计算按钮状态
    updatePlantingCalculateButton() {
        const plantingSummaryDate = document.getElementById('plantingSummaryDate');
        const calculatePlantingSummaryBtn = document.getElementById('calculatePlantingSummaryBtn');
        
        if (plantingSummaryDate && calculatePlantingSummaryBtn) {
            const hasDate = plantingSummaryDate.value !== '';
            calculatePlantingSummaryBtn.disabled = !hasDate;
            
            if (hasDate) {
                calculatePlantingSummaryBtn.innerHTML = `<i class="fas fa-calculator"></i> 计算 ${plantingSummaryDate.value} 的种菜汇总`;
            } else {
                calculatePlantingSummaryBtn.innerHTML = `<i class="fas fa-calculator"></i> 开始计算种菜汇总`;
            }
        }
    },

    // ======================== 汇总计算核心功能 ========================

    // 处理种菜汇总计算
    handleCalculatePlantingSummary() {
        console.log('handleCalculatePlantingSummary 函数被调用');
        
        const plantingSummaryDate = document.getElementById('plantingSummaryDate');
        const targetDate = plantingSummaryDate ? plantingSummaryDate.value : '';
        
        console.log('选择的日期:', targetDate);
        
        if (!targetDate) {
            console.log('没有选择日期，显示警告');
            showAlert('请选择要计算的日期', 'warning');
            return;
        }
        
        // 显示确认对话框
        showConfirmDialog(
            '确认计算种菜汇总',
            `确定要计算 ${targetDate} 的种菜数据汇总吗？<br><br>
            <small class="text-muted">
            系统将：<br>
            1. 查找该日期的种菜表格数据<br>
            2. 查找该日期的商品排行数据<br>
            3. 计算种菜订单相关指标<br>
            4. 更新合并数据表中的种菜字段<br>
            </small>`,
            () => this.executePlantingSummary(targetDate)
        );
    },

    // 执行种菜汇总计算
    executePlantingSummary(targetDate) {
        console.log(`开始计算 ${targetDate} 的种菜汇总数据`);
        
        // 隐藏之前的结果
        const plantingSummaryResults = document.getElementById('plantingSummaryResults');
        if (plantingSummaryResults) {
            plantingSummaryResults.style.display = 'none';
        }
        
        // 显示加载动画
        showSpinner();
        
        // 禁用计算按钮
        const calculatePlantingSummaryBtn = document.getElementById('calculatePlantingSummaryBtn');
        if (calculatePlantingSummaryBtn) {
            calculatePlantingSummaryBtn.disabled = true;
            calculatePlantingSummaryBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 正在计算...`;
        }
        
        APIService.calculatePlantingSummary(targetDate)
        .then(data => {
            console.log('种菜汇总计算成功:', data);
            hideSpinner();
            
            if (data.error_type) {
                // 处理特定错误类型
                this.handlePlantingError(data);
            } else {
                // 显示成功消息
                showAlert(data.message, 'success');
                // 显示计算结果
                this.displayPlantingSummaryResults(data);
            }
        })
        .catch(error => {
            console.error('种菜汇总计算失败:', error);
            hideSpinner();
            showAlert('计算失败：' + error.message, 'danger');
        })
        .finally(() => {
            // 恢复按钮状态
            if (calculatePlantingSummaryBtn) {
                calculatePlantingSummaryBtn.disabled = false;
                this.updatePlantingCalculateButton();
            }
        });
    },

    // ======================== 错误处理 ========================

    // 处理种菜汇总错误
    handlePlantingError(data) {
        if (data.error_type === 'NO_PLANTING_DATA') {
            showAlert('未找到所选日期的种菜表格数据，请先上传种菜表格', 'warning');
        } else if (data.error_type === 'NO_MERGE_DATA') {
            showAlert('未找到所选日期的商品排行数据，请先上传商品排行日报', 'warning');
        } else {
            showAlert(data.message || '计算失败，请稍后重试', 'danger');
        }
    },

    // ======================== 结果显示功能 ========================

    // 显示种菜汇总计算结果
    displayPlantingSummaryResults(data) {
        const resultsDiv = document.getElementById('plantingSummaryResults');
        if (!resultsDiv) {
            console.error('plantingSummaryResults 元素未找到');
            return;
        }
        
        resultsDiv.style.display = 'block';
        
        // 创建结果HTML
        const resultHtml = this.createPlantingResultsHTML(data);
        resultsDiv.innerHTML = resultHtml;
        
        // 滚动到结果区域
        resultsDiv.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
        
        console.log('种菜汇总结果已显示');
    },

    // 创建种菜结果HTML
    createPlantingResultsHTML(data) {
        const updateCount = data.count || 0;
        const currentTime = new Date().toLocaleString();
        
        return `
            <div class="card mt-4">
                <div class="card-header bg-success text-white">
                    <h5 class="mb-0">
                        <i class="fas fa-seedling"></i> 种菜汇总计算结果
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
                            <li><strong>匹配到的种菜订单数量</strong></li>
                            <li><strong>种菜订单总金额</strong></li>
                            <li><strong>种菜佣金总额</strong></li>
                            <li><strong>物流成本</strong> (订单数 × 2.5)</li>
                            <li><strong>扣款金额</strong> (总金额 × 0.08)</li>
                        </ul>
                    </div>
                    
                    ${this.createPlantingMetricsHTML(data)}
                </div>
            </div>
        `;
    },

    // 创建种菜指标HTML（如果有详细数据）
    createPlantingMetricsHTML(data) {
        if (!data.metrics) {
            return '';
        }
        
        const metrics = data.metrics;
        return `
            <div class="row mt-3">
                <div class="col-md-6">
                    <div class="card border-info">
                        <div class="card-header bg-info text-white">
                            <h6 class="mb-0">订单统计</h6>
                        </div>
                        <div class="card-body">
                            <p class="mb-1">订单数量: <strong>${metrics.order_count || 0}</strong></p>
                            <p class="mb-0">订单总额: <strong>¥${(metrics.total_amount || 0).toFixed(2)}</strong></p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card border-warning">
                        <div class="card-header bg-warning text-white">
                            <h6 class="mb-0">成本统计</h6>
                        </div>
                        <div class="card-body">
                            <p class="mb-1">佣金总额: <strong>¥${(metrics.commission || 0).toFixed(2)}</strong></p>
                            <p class="mb-0">物流成本: <strong>¥${(metrics.logistics_cost || 0).toFixed(2)}</strong></p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ======================== 模块初始化 ========================

    // 初始化种菜汇总模块
    initializePlantingModule() {
        console.log('种菜汇总模块初始化');
        
        // 检查必要的DOM元素是否存在
        const requiredElements = ['plantingSummaryDate', 'calculatePlantingSummaryBtn'];
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.warn('种菜汇总模块初始化失败，缺少必要元素:', missingElements);
            return false;
        }
        
        // 设置事件监听器
        this.setupPlantingSummaryEventListeners();
        
        console.log('种菜汇总模块初始化完成');
        return true;
    }
};

// 将PlantingModule暴露给全局使用
window.PlantingModule = PlantingModule;

// 暴露兼容性函数给外部调用（保持现有代码兼容）
window.setupPlantingSummaryEventListeners = () => PlantingModule.setupPlantingSummaryEventListeners();
window.updatePlantingCalculateButton = () => PlantingModule.updatePlantingCalculateButton();
window.handleCalculatePlantingSummary = () => PlantingModule.handleCalculatePlantingSummary(); 