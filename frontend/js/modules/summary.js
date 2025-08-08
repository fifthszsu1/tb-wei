/**
 * 数据汇总模块
 * 负责推广费用汇总计算、事件监听器管理、结果显示等功能
 */

// 数据汇总模块对象
const SummaryModule = {
    // ======================== 内部状态 ========================
    
    // 存储事件监听器函数的引用，以便正确移除
    _eventListeners: {
        dateChangeHandler: null,
        calculateClickHandler: null
    },

    // ======================== 事件监听器管理 ========================

    // 设置数据汇总功能的事件监听器
    setupSummaryEventListeners() {
        console.log('正在设置数据汇总事件监听器...');
        
        const summaryDate = document.getElementById('summaryDate');
        const calculateBtn = document.getElementById('calculateSummaryBtn');
        
        console.log('数据汇总元素检查:', {
            summaryDate: !!summaryDate,
            calculateBtn: !!calculateBtn
        });
        
        // 先移除之前的监听器
        this.removeSummaryEventListeners();
        
        if (summaryDate) {
            // 创建监听器函数并存储引用
            this._eventListeners.dateChangeHandler = () => this.updateCalculateButton();
            
            // 添加新的事件监听器
            summaryDate.addEventListener('change', this._eventListeners.dateChangeHandler);
            
            // 设置默认日期为今天（如果还没有值）
            if (!summaryDate.value) {
                const today = new Date().toISOString().split('T')[0];
                summaryDate.value = today;
                console.log('设置默认日期:', today);
            }
            this.updateCalculateButton();
            console.log('数据汇总日期选择器事件监听器已设置');
        } else {
            console.error('summaryDate 元素未找到！');
        }
        
        if (calculateBtn) {
            // 创建监听器函数并存储引用
            this._eventListeners.calculateClickHandler = () => this.handleCalculateSummary();
            
            // 添加新的事件监听器
            calculateBtn.addEventListener('click', this._eventListeners.calculateClickHandler);
            console.log('数据汇总计算按钮事件监听器已设置');
        } else {
            console.error('calculateSummaryBtn 元素未找到！');
        }
        
        console.log('数据汇总事件监听器设置完成');
    },

    // 移除数据汇总事件监听器
    removeSummaryEventListeners() {
        const summaryDate = document.getElementById('summaryDate');
        const calculateBtn = document.getElementById('calculateSummaryBtn');
        
        if (summaryDate && this._eventListeners.dateChangeHandler) {
            summaryDate.removeEventListener('change', this._eventListeners.dateChangeHandler);
            this._eventListeners.dateChangeHandler = null;
        }
        
        if (calculateBtn && this._eventListeners.calculateClickHandler) {
            calculateBtn.removeEventListener('click', this._eventListeners.calculateClickHandler);
            this._eventListeners.calculateClickHandler = null;
        }
        
        console.log('数据汇总事件监听器已移除');
    },

    // ======================== 按钮状态管理 ========================

    // 更新计算按钮状态
    updateCalculateButton() {
        const summaryDate = document.getElementById('summaryDate');
        const calculateBtn = document.getElementById('calculateSummaryBtn');
        
        if (summaryDate && calculateBtn) {
            const hasDate = summaryDate.value !== '';
            calculateBtn.disabled = !hasDate;
            
            if (hasDate) {
                calculateBtn.innerHTML = `<i class="fas fa-play"></i> 计算 ${summaryDate.value} 的汇总数据`;
            } else {
                calculateBtn.innerHTML = `<i class="fas fa-play"></i> 开始计算汇总`;
            }
        }
    },

    // ======================== 汇总计算核心功能 ========================

    // 处理汇总计算
    handleCalculateSummary() {
        console.log('handleCalculateSummary 函数被调用');
        
        const summaryDate = document.getElementById('summaryDate');
        const targetDate = summaryDate.value;
        
        console.log('选择的日期:', targetDate);
        
        if (!targetDate) {
            console.log('没有选择日期，显示警告');
            showAlert('请选择计算日期', 'warning');
            return;
        }
        
        // 移除权限检查，允许所有用户执行汇总计算
        // if (!AuthModule.checkAdminPermission()) {
        //     return;
        // }
        
        // 显示确认对话框
        showConfirmDialog(
            '确认计算汇总',
            `确定要计算 ${targetDate} 的推广费用汇总吗？<br><br>
            <small class="text-muted">
            系统将：<br>
            1. 查找该日期的商品数据和主体报表数据<br>
            2. 根据场景名称自动分配推广费用<br>
            3. 更新合并数据表中的推广费用字段<br><br>
            <strong>注意：此操作将覆盖现有的推广费用数据！</strong>
            </small>`,
            () => this.executeCalculateSummary(targetDate)
        );
    },

    // 执行汇总计算
    executeCalculateSummary(targetDate) {
        console.log(`开始计算 ${targetDate} 的汇总数据`);
        
        // 隐藏之前的结果
        const summaryResults = document.getElementById('summaryResults');
        if (summaryResults) {
            summaryResults.style.display = 'none';
        }
        
        // 显示计算进度
        const calculationProgress = document.getElementById('calculationProgress');
        if (calculationProgress) {
            calculationProgress.style.display = 'block';
        }
        
        // 禁用计算按钮
        const calculateBtn = document.getElementById('calculateSummaryBtn');
        if (calculateBtn) {
            calculateBtn.disabled = true;
            calculateBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 正在计算...`;
        }
        
        APIService.calculatePromotionSummary(targetDate)
        .then(data => {
            console.log('汇总计算成功:', data);
            this.displaySummaryResults(data);
            showAlert(data.message, 'success');
        })
        .catch(error => {
            console.error('汇总计算失败:', error);
            showAlert(error.message || '汇总计算失败，请稍后重试', 'danger');
        })
        .finally(() => {
            // 隐藏进度，恢复按钮
            if (calculationProgress) {
                calculationProgress.style.display = 'none';
            }
            if (calculateBtn) {
                calculateBtn.disabled = false;
                this.updateCalculateButton();
            }
        });
    },

    // ======================== 结果显示功能 ========================

    // 显示汇总计算结果
    displaySummaryResults(data) {
        const stats = data.stats || {};
        
        // 更新基本统计数字
        this.updateStatistics(stats);
        
        // 更新场景费用分布表格
        this.displaySceneDistribution(stats.scene_name_distribution || {});
        
        // 显示错误信息（如果有）
        this.displayErrorMessages(stats.errors || []);
        
        // 显示结果区域
        const summaryResults = document.getElementById('summaryResults');
        if (summaryResults) {
            summaryResults.style.display = 'block';
            
            // 平滑滚动到结果区域
            summaryResults.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    },

    // 更新统计数字
    updateStatistics(stats) {
        const elements = {
            'processedCount': stats.processed_count || 0,
            'matchedCount': stats.matched_count || 0,
            'updatedCount': stats.updated_count || 0,
            'errorCount': (stats.errors || []).length
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    },

    // 显示场景费用分布
    displaySceneDistribution(distribution) {
        const tableBody = document.getElementById('sceneDistributionTable');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (Object.keys(distribution).length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-muted">暂无场景费用数据</td>
                </tr>
            `;
            return;
        }
        
        // 按费用总额排序
        const sortedEntries = Object.entries(distribution).sort((a, b) => 
            (b[1].total_cost || 0) - (a[1].total_cost || 0)
        );
        
        sortedEntries.forEach(([sceneName, info]) => {
            const row = tableBody.insertRow();
            
            // 场景名称列（添加颜色标识）
            const sceneCell = row.insertCell();
            const badgeClass = this.getSceneBadgeClass(sceneName);
            sceneCell.innerHTML = `<span class="badge ${badgeClass}">${sceneName}</span>`;
            
            // 记录数量列
            const countCell = row.insertCell();
            countCell.textContent = info.count || 0;
            
            // 总费用列
            const costCell = row.insertCell();
            const cost = info.total_cost || 0;
            costCell.innerHTML = `<strong>¥${cost.toFixed(2)}</strong>`;
            costCell.className = 'text-end';
        });
        
        // 添加合计行
        this.addTotalRow(tableBody, sortedEntries);
    },

    // 添加合计行
    addTotalRow(tableBody, sortedEntries) {
        const totalCost = sortedEntries.reduce((sum, [, info]) => sum + (info.total_cost || 0), 0);
        const totalCount = sortedEntries.reduce((sum, [, info]) => sum + (info.count || 0), 0);
        
        if (sortedEntries.length > 1) {
            const totalRow = tableBody.insertRow();
            totalRow.className = 'table-active';
            
            const totalSceneCell = totalRow.insertCell();
            totalSceneCell.innerHTML = '<strong>总计</strong>';
            
            const totalCountCell = totalRow.insertCell();
            totalCountCell.innerHTML = `<strong>${totalCount}</strong>`;
            
            const totalCostCell = totalRow.insertCell();
            totalCostCell.innerHTML = `<strong>¥${totalCost.toFixed(2)}</strong>`;
            totalCostCell.className = 'text-end';
        }
    },

    // 显示错误信息
    displayErrorMessages(errors) {
        const errorMessages = document.getElementById('errorMessages');
        const errorList = document.getElementById('errorList');
        
        if (!errorMessages || !errorList) return;
        
        if (!errors || errors.length === 0) {
            errorMessages.style.display = 'none';
            return;
        }
        
        errorList.innerHTML = '';
        
        // 最多显示10个错误
        const displayErrors = errors.slice(0, 10);
        displayErrors.forEach(error => {
            const li = document.createElement('li');
            li.textContent = error;
            errorList.appendChild(li);
        });
        
        // 如果有更多错误，添加提示
        if (errors.length > 10) {
            const li = document.createElement('li');
            li.innerHTML = `<em>... 还有 ${errors.length - 10} 个错误未显示</em>`;
            li.className = 'text-muted';
            errorList.appendChild(li);
        }
        
        errorMessages.style.display = 'block';
    },

    // ======================== 工具函数 ========================

    // 获取场景徽章样式类
    getSceneBadgeClass(sceneName) {
        // 使用全局的getSceneBadgeClass函数，如果不存在则返回默认样式
        if (typeof window.getSceneBadgeClass === 'function') {
            return window.getSceneBadgeClass(sceneName);
        }
        
        // 备用的场景样式映射
        const sceneStyles = {
            '全站推广': 'bg-primary',
            '关键词推广': 'bg-success',
            '货品运营': 'bg-warning',
            '人群推广': 'bg-danger',
            '超级短视频': 'bg-info',
            '多目标直投': 'bg-secondary'
        };
        
        return sceneStyles[sceneName] || 'bg-secondary';
    },

    // ======================== 模块初始化 ========================

    // 初始化汇总模块
    initializeSummaryModule() {
        console.log('数据汇总模块初始化');
        
        // 检查必要的DOM元素是否存在
        const requiredElements = ['summaryDate', 'calculateSummaryBtn'];
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.warn('数据汇总模块初始化失败，缺少必要元素:', missingElements);
            return false;
        }
        
        // 设置事件监听器
        this.setupSummaryEventListeners();
        
        console.log('数据汇总模块初始化完成');
        return true;
    }
};

// 将SummaryModule暴露给全局使用
window.SummaryModule = SummaryModule;

// 暴露兼容性函数给外部调用（保持现有代码兼容）
window.setupSummaryEventListeners = () => SummaryModule.setupSummaryEventListeners();
window.updateCalculateButton = () => SummaryModule.updateCalculateButton();
window.handleCalculateSummary = () => SummaryModule.handleCalculateSummary(); 