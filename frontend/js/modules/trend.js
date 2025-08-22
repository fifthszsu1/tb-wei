/**
 * 商品趋势分析模块
 * 负责商品趋势弹窗、字段选择、图表绘制等功能
 */

// 趋势分析模块对象
const TrendModule = {
    // ======================== 模块状态变量 ========================
    
    // 当前商品数据
    currentProductData: null,
    currentProductCode: null,
    
    // 当前图表实例
    trendChart: null,
    
    // 可用字段配置
    availableFields: [
        { key: 'search_guided_visitors', name: '搜索引导访客数', defaultSelected: true, color: '#007bff', type: 'number' },
        { key: 'add_to_cart_count', name: '加购件数', defaultSelected: true, color: '#28a745', type: 'number' },
        { key: 'real_amount', name: '真实金额', defaultSelected: true, color: '#dc3545', type: 'money' },
        { key: 'real_buyer_count', name: '真实买家数', defaultSelected: true, color: '#ffc107', type: 'number' },
        { key: 'real_conversion_rate', name: '真实转化率', defaultSelected: true, color: '#6610f2', type: 'percent' },
        
        { key: 'visitor_count', name: '访客数', defaultSelected: false, color: '#fd7e14', type: 'number' },
        { key: 'page_views', name: '浏览量', defaultSelected: false, color: '#20c997', type: 'number' },
        { key: 'favorite_count', name: '收藏人数', defaultSelected: false, color: '#6f42c1', type: 'number' },
        { key: 'payment_amount', name: '支付金额', defaultSelected: false, color: '#e83e8c', type: 'money' },
        { key: 'payment_product_count', name: '支付商品件数', defaultSelected: false, color: '#795548', type: 'number' },
        { key: 'payment_buyer_count', name: '支付买家数', defaultSelected: false, color: '#607d8b', type: 'number' },
        { key: 'unit_price', name: '客单价', defaultSelected: false, color: '#ff5722', type: 'money' },
        { key: 'visitor_average_value', name: '访客平均价值', defaultSelected: false, color: '#009688', type: 'average' },
        { key: 'payment_conversion_rate', name: '支付转化率', defaultSelected: false, color: '#4caf50', type: 'percent' },
        { key: 'order_conversion_rate', name: '下单转化率', defaultSelected: false, color: '#2196f3', type: 'percent' },
        { key: 'refund_amount', name: '退款金额', defaultSelected: false, color: '#f44336', type: 'money' },
        { key: 'refund_ratio', name: '退款占比', defaultSelected: false, color: '#9c27b0', type: 'percent' },
        { key: 'conversion_rate', name: '转化率', defaultSelected: false, color: '#3f51b5', type: 'percent' },
        { key: 'favorite_rate', name: '收藏率', defaultSelected: false, color: '#673ab7', type: 'percent' },
        { key: 'cart_rate', name: '加购率', defaultSelected: false, color: '#ff9800', type: 'percent' },
        { key: 'uv_value', name: 'UV价值', defaultSelected: false, color: '#cddc39', type: 'money' },
        { key: 'product_cost', name: '产品成本', defaultSelected: false, color: '#8bc34a', type: 'money' },
        { key: 'gross_profit', name: '毛利', defaultSelected: false, color: '#ffeb3b', type: 'money' }
    ],

    // ======================== 趋势分析核心功能 ========================

    // 显示商品趋势弹窗
    showProductTrend(tmallProductCode) {
        if (!AuthModule.isAdmin()) {
            showAlert('权限不足', 'warning');
            return;
        }
        
        if (!tmallProductCode) {
            showAlert('天猫ID不能为空', 'warning');
            return;
        }
        
        this.currentProductCode = tmallProductCode;
        
        // 更新弹窗标题
        document.getElementById('trendProductCode').textContent = tmallProductCode;
        
        // 显示弹窗
        const modal = new bootstrap.Modal(document.getElementById('productTrendModal'));
        modal.show();
        
        // 加载趋势数据
        this.loadTrendData(tmallProductCode);
    },

    // 加载趋势数据
    loadTrendData(tmallProductCode, startDate = null, endDate = null) {
        showSpinner();
        
        APIService.getProductTrend(tmallProductCode, startDate, endDate)
        .then(data => {
            hideSpinner();
            console.log('趋势数据加载成功:', data);
            
            this.currentProductData = data;
            
            // 更新基本信息
            document.getElementById('trendProductName').textContent = data.product_name || '未知商品';
            document.getElementById('trendDateRange').textContent = `${data.start_date} 至 ${data.end_date}`;
            
            // 更新图表标题
            const isCustomRange = startDate && endDate;
            const dataCount = data.data ? data.data.length : 0;
            const chartTitle = isCustomRange ? 
                `（${data.start_date} 至 ${data.end_date}，${dataCount}天有数据）` : 
                `（最近30天，${dataCount}天有数据）`;
            document.getElementById('trendChartTitle').textContent = chartTitle;
            
            // 初始化字段选择器
            this.renderFieldSelector();
            
            // 绘制趋势图（即使数据为空也会显示空图表）
            this.createTrendChart();
            
            // 如果没有数据，显示友好提示
            if (dataCount === 0) {
                showAlert(`商品 ${tmallProductCode} 在指定日期范围内没有数据，图表将显示为空`, 'info');
            }
        })
        .catch(error => {
            hideSpinner();
            console.error('加载趋势数据失败:', error);
            showAlert(`加载趋势数据失败: ${error.message}`, 'danger');
        });
    },

    // 加载自定义日期区间的数据
    loadCustomDateRange() {
        const startDateInput = document.getElementById('trendStartDate');
        const endDateInput = document.getElementById('trendEndDate');
        
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        
        // 验证日期输入
        if (!startDate || !endDate) {
            showAlert('请选择开始日期和结束日期', 'warning');
            return;
        }
        
        if (startDate > endDate) {
            showAlert('开始日期不能晚于结束日期', 'warning');
            return;
        }
        
        // 检查日期范围是否超过365天
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 365) {
            showAlert('查询范围不能超过365天', 'warning');
            return;
        }
        
        // 重新加载数据
        this.loadTrendData(this.currentProductCode, startDate, endDate);
    },

    // 重置为默认30天数据
    resetToDefault() {
        // 清空日期输入
        document.getElementById('trendStartDate').value = '';
        document.getElementById('trendEndDate').value = '';
        
        // 重新加载默认数据
        this.loadTrendData(this.currentProductCode);
    },

    // 渲染字段选择器
    renderFieldSelector() {
        const container = document.getElementById('trendFieldSelector');
        container.innerHTML = '';
        
        this.availableFields.forEach((field, index) => {
            const colDiv = document.createElement('div');
            colDiv.className = 'col-lg-3 col-md-4 col-sm-6 mb-2';
            
            const checkDiv = document.createElement('div');
            checkDiv.className = 'form-check';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-check-input';
            checkbox.id = `trend-field-${field.key}`;
            checkbox.value = field.key;
            // 默认只选择前两个字段
            checkbox.checked = index < 2;
            
            // 添加选择限制事件监听
            checkbox.addEventListener('change', (e) => {
                this.handleFieldSelection(e.target);
            });
            
            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.htmlFor = `trend-field-${field.key}`;
            label.textContent = field.name;
            label.style.fontSize = '0.875rem';
            
            // 添加颜色指示器
            const colorIndicator = document.createElement('span');
            colorIndicator.style.display = 'inline-block';
            colorIndicator.style.width = '12px';
            colorIndicator.style.height = '12px';
            colorIndicator.style.backgroundColor = field.color;
            colorIndicator.style.marginRight = '5px';
            colorIndicator.style.borderRadius = '2px';
            
            label.insertBefore(colorIndicator, label.childNodes[0]);
            
            checkDiv.appendChild(checkbox);
            checkDiv.appendChild(label);
            colDiv.appendChild(checkDiv);
            container.appendChild(colDiv);
        });
    },
    
    // 处理字段选择限制
    handleFieldSelection(checkbox) {
        const selectedCount = this.getSelectedFields().length;
        
        if (checkbox.checked && selectedCount > 2) {
            checkbox.checked = false;
            showAlert('最多只能选择2个指标进行对比分析', 'warning');
            return;
        }
        
        // 更新图表
        this.updateTrendChart();
    },

    // 创建趋势图表
    createTrendChart() {
        // 检查Chart.js是否已加载
        if (typeof Chart === 'undefined') {
            console.error('Chart.js库未加载，等待库加载完成...');
            
            // 显示加载提示
            const canvas = document.getElementById('productTrendChart');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.font = '16px Arial';
                ctx.fillStyle = '#666';
                ctx.textAlign = 'center';
                ctx.fillText('正在加载图表组件...', canvas.width / 2, canvas.height / 2);
            }
            
            // 监听Chart.js加载完成事件（如果尚未监听）
            if (!this.chartEventListenerAdded) {
                window.addEventListener('chartjs-loaded', () => {
                    console.log('监听到Chart.js加载完成事件，重新创建图表');
                    this.createTrendChart();
                });
                this.chartEventListenerAdded = true;
            }
            
            // 延迟重试，最多重试10次
            if (!this.chartLoadRetryCount) this.chartLoadRetryCount = 0;
            this.chartLoadRetryCount++;
            
            if (this.chartLoadRetryCount <= 10) {
                setTimeout(() => {
                    this.createTrendChart();
                }, 1000);
            } else {
                // 重试失败，显示错误信息
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#dc3545';
                    ctx.fillText('图表组件加载失败', canvas.width / 2, canvas.height / 2 - 10);
                    ctx.fillStyle = '#666';
                    ctx.font = '12px Arial';
                    ctx.fillText('请刷新页面重试', canvas.width / 2, canvas.height / 2 + 10);
                }
                showAlert('图表组件加载失败，请刷新页面重试', 'error');
            }
            return;
        }
        
        // 重置重试计数器
        this.chartLoadRetryCount = 0;
        
        const canvas = document.getElementById('productTrendChart');
        const ctx = canvas.getContext('2d');
        
        // 销毁现有图表
        if (this.trendChart) {
            this.trendChart.destroy();
        }
        
        // 获取选中的字段
        const selectedFields = this.getSelectedFields();
        
        if (selectedFields.length === 0) {
            showAlert('请选择1-2个指标进行展示', 'warning');
            return;
        }
        
        // 准备图表数据
        const chartData = this.prepareChartData(selectedFields);
        
        // 配置Y轴
        const scales = {
            x: {
                display: true,
                title: {
                    display: true,
                    text: '日期'
                }
            }
        };
        
        // 配置双Y轴（如果有两个指标）
        if (selectedFields.length === 1) {
            // 单Y轴
            scales.y = {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: selectedFields[0].name,
                    color: selectedFields[0].color
                },
                beginAtZero: true,
                ticks: {
                    color: selectedFields[0].color,
                    callback: function(value) {
                        if (selectedFields[0].type === 'money') {
                            return `¥${value.toFixed(0)}`;
                        } else if (selectedFields[0].type === 'percent') {
                            return `${value.toFixed(1)}%`;
                        } else {
                            return value.toLocaleString();
                        }
                    }
                }
            };
        } else if (selectedFields.length === 2) {
            // 双Y轴
            scales.y = {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: selectedFields[0].name,
                    color: selectedFields[0].color
                },
                beginAtZero: true,
                ticks: {
                    color: selectedFields[0].color,
                    callback: function(value) {
                        if (selectedFields[0].type === 'money') {
                            return `¥${value.toFixed(0)}`;
                        } else if (selectedFields[0].type === 'percent') {
                            return `${value.toFixed(1)}%`;
                        } else {
                            return value.toLocaleString();
                        }
                    }
                }
            };
            
            scales.y1 = {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: selectedFields[1].name,
                    color: selectedFields[1].color
                },
                beginAtZero: true,
                ticks: {
                    color: selectedFields[1].color,
                    callback: function(value) {
                        if (selectedFields[1].type === 'money') {
                            return `¥${value.toFixed(0)}`;
                        } else if (selectedFields[1].type === 'percent') {
                            return `${value.toFixed(1)}%`;
                        } else {
                            return value.toLocaleString();
                        }
                    }
                },
                grid: {
                    drawOnChartArea: false, // 只显示左侧网格线
                }
            };
        }
        
        // 创建图表
        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: true,
                        text: `${this.currentProductData.product_name} - 趋势对比分析`,
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            generateLabels: function(chart) {
                                const original = Chart.defaults.plugins.legend.labels.generateLabels;
                                const labels = original.call(this, chart);
                                
                                // 为每个标签添加Y轴信息
                                labels.forEach((label, index) => {
                                    if (selectedFields.length === 2) {
                                        const axisInfo = index === 0 ? ' (左轴)' : ' (右轴)';
                                        label.text += axisInfo;
                                    }
                                });
                                
                                return labels;
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const field = selectedFields.find(f => f.name === context.dataset.label);
                                let value = context.parsed.y;
                                
                                if (field.type === 'money') {
                                    value = `¥${value.toFixed(2)}`;
                                } else if (field.type === 'percent') {
                                    value = `${value.toFixed(2)}%`;
                                } else {
                                    value = value.toLocaleString();
                                }
                                
                                const axisInfo = selectedFields.length === 2 ? 
                                    (context.datasetIndex === 0 ? ' (左轴)' : ' (右轴)') : '';
                                
                                return `${context.dataset.label}${axisInfo}: ${value}`;
                            }
                        }
                    }
                },
                scales: scales
            }
        });

        // 更新统计汇总
        this.renderSummaryStats();
    },

    // 准备图表数据
    prepareChartData(selectedFields) {
        if (!this.currentProductData || !this.currentProductData.start_date || !this.currentProductData.end_date) {
            return { 
                labels: ['无数据'], 
                datasets: [{
                    label: '暂无数据',
                    data: [0],
                    borderColor: '#cccccc',
                    backgroundColor: '#cccccc20',
                    tension: 0.1,
                    fill: false,
                    pointRadius: 0
                }]
            };
        }
        
        // 生成完整的日期范围（从start_date到end_date）
        const dateRange = this.generateDateRange(this.currentProductData.start_date, this.currentProductData.end_date);
        
        // 创建日期到数据的映射
        const dataMap = {};
        if (this.currentProductData.data && this.currentProductData.data.length > 0) {
            this.currentProductData.data.forEach(item => {
                dataMap[item.date] = item;
            });
        }
        
        // 生成日期标签
        const labels = dateRange.map(dateStr => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
        });
        
        // 为每个选中字段创建数据集
        const datasets = selectedFields.map((field, index) => {
            const data = dateRange.map(dateStr => {
                const dayData = dataMap[dateStr];
                return dayData ? (dayData[field.key] || 0) : 0;
            });
            
            const dataset = {
                label: field.name,
                data: data,
                borderColor: field.color,
                backgroundColor: field.color + '20', // 添加透明度
                tension: 0.1,
                fill: false,
                pointRadius: 3,
                pointHoverRadius: 5,
                borderWidth: 2
            };
            
            // 如果有两个指标，第二个指标使用右侧Y轴
            if (selectedFields.length === 2 && index === 1) {
                dataset.yAxisID = 'y1';
            } else {
                dataset.yAxisID = 'y';
            }
            
            return dataset;
        });
        
        return {
            labels: labels,
            datasets: datasets
        };
    },
    
    // 生成日期范围
    generateDateRange(startDate, endDate) {
        const dates = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const current = new Date(start);
        while (current <= end) {
            dates.push(current.toISOString().split('T')[0]); // YYYY-MM-DD 格式
            current.setDate(current.getDate() + 1);
        }
        
        return dates;
    },

    // 获取选中的字段
    getSelectedFields() {
        const selected = [];
        this.availableFields.forEach(field => {
            const checkbox = document.getElementById(`trend-field-${field.key}`);
            if (checkbox && checkbox.checked) {
                selected.push(field);
            }
        });
        return selected;
    },

    // 更新趋势图表
    updateTrendChart() {
        if (!this.currentProductData) {
            showAlert('请先加载数据', 'warning');
            return;
        }
        
        this.createTrendChart();
        this.renderSummaryStats();
    },

    // 全选字段（最多选择前2个）
    selectAllTrendFields() {
        // 先取消所有选择
        this.availableFields.forEach(field => {
            const checkbox = document.getElementById(`trend-field-${field.key}`);
            if (checkbox) {
                checkbox.checked = false;
            }
        });
        
        // 只选择前2个字段
        this.availableFields.slice(0, 2).forEach(field => {
            const checkbox = document.getElementById(`trend-field-${field.key}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
        
        // 更新图表
        this.updateTrendChart();
    },

    // 重置字段选择（选择前2个默认字段）
    resetTrendFields() {
        this.availableFields.forEach((field, index) => {
            const checkbox = document.getElementById(`trend-field-${field.key}`);
            if (checkbox) {
                checkbox.checked = index < 2;
            }
        });
        
        // 更新图表
        this.updateTrendChart();
    },

    // 导出趋势数据
    exportTrendData() {
        if (!this.currentProductData) {
            showAlert('没有可导出的数据', 'warning');
            return;
        }
        
        try {
            const selectedFields = this.getSelectedFields();
            if (selectedFields.length === 0) {
                showAlert('请选择要导出的字段', 'warning');
                return;
            }
            
            // 准备导出数据
            const exportData = this.currentProductData.data.map(item => {
                const row = {
                    '日期': item.date,
                    '天猫ID': this.currentProductCode,
                    '商品名称': this.currentProductData.product_name
                };
                
                selectedFields.forEach(field => {
                    let value = item[field.key] || 0;
                    if (field.type === 'money') {
                        value = parseFloat(value).toFixed(2);
                    } else if (field.type === 'percent') {
                        value = parseFloat(value).toFixed(2);
                    }
                    row[field.name] = value;
                });
                
                return row;
            });
            
            // 转换为CSV格式
            const csvContent = this.convertToCSV(exportData);
            
            // 创建下载链接
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `商品趋势_${this.currentProductCode}_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showAlert('数据导出成功', 'success');
        } catch (error) {
            console.error('导出数据失败:', error);
            showAlert('导出数据失败', 'danger');
        }
    },

    // 转换为CSV格式
    convertToCSV(data) {
        if (!data.length) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [];
        
        // 添加标题行
        csvRows.push(headers.join(','));
        
        // 添加数据行
        data.forEach(row => {
            const values = headers.map(header => {
                let value = row[header];
                // 处理包含逗号或引号的值
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = '"' + value.replace(/"/g, '""') + '"';
                }
                return value;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    },

    // ======================== 统计汇总功能 ========================

    // 计算统计汇总数据
    calculateSummaryStats() {
        if (!this.currentProductData || !this.currentProductData.data || this.currentProductData.data.length === 0) {
            return {};
        }

        const selectedFields = this.getSelectedFields();
        const summaryStats = {};

        selectedFields.forEach(field => {
            // 跳过百分比类型和平均值类型的字段
            if (field.type === 'percent' || field.type === 'average') {
                return;
            }

            let total = 0;
            let count = 0;
            let hasData = false;

            this.currentProductData.data.forEach(item => {
                const value = parseFloat(item[field.key]) || 0;
                if (value > 0 || item[field.key] === 0) { // 包含0值但排除null/undefined
                    total += value;
                    count++;
                    hasData = true;
                }
            });

            if (hasData) {
                summaryStats[field.key] = {
                    name: field.name,
                    total: total,
                    average: count > 0 ? total / count : 0,
                    count: count,
                    type: field.type,
                    color: field.color
                };
            }
        });

        return summaryStats;
    },

    // 渲染统计汇总
    renderSummaryStats() {
        const summaryCard = document.getElementById('trendSummaryCard');
        const summaryContent = document.getElementById('trendSummaryContent');
        const summaryDateRange = document.getElementById('summaryDateRange');

        const summaryStats = this.calculateSummaryStats();
        const statsKeys = Object.keys(summaryStats);

        // 如果没有可汇总的数据，隐藏统计卡片
        if (statsKeys.length === 0) {
            summaryCard.style.display = 'none';
            return;
        }

        // 显示统计卡片并更新日期范围
        summaryCard.style.display = 'block';
        if (this.currentProductData) {
            summaryDateRange.textContent = `（${this.currentProductData.start_date} 至 ${this.currentProductData.end_date}）`;
        }

        // 清空现有内容
        summaryContent.innerHTML = '';

        // 为每个统计字段创建展示卡片
        statsKeys.forEach(key => {
            const stat = summaryStats[key];
            const colDiv = document.createElement('div');
            colDiv.className = 'col-xl-3 col-lg-4 col-md-6 mb-3';

            // 格式化数值
            let totalFormatted = stat.total;
            let averageFormatted = stat.average;

            if (stat.type === 'money') {
                totalFormatted = `¥${stat.total.toFixed(2)}`;
                averageFormatted = `¥${stat.average.toFixed(2)}`;
            } else if (stat.type === 'number') {
                totalFormatted = stat.total.toLocaleString();
                averageFormatted = stat.average.toFixed(1);
            }

            colDiv.innerHTML = `
                <div class="card h-100 border-left-primary shadow-sm" style="border-left: 4px solid ${stat.color};">
                    <div class="card-body py-3">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1">
                                <h6 class="card-title mb-1 text-truncate" style="font-size: 0.875rem;">${stat.name}</h6>
                                <div class="mb-2">
                                    <div class="text-primary font-weight-bold" style="font-size: 1.1rem;">
                                        ${totalFormatted}
                                    </div>
                                    <small class="text-muted">汇总</small>
                                </div>
                                <div class="mb-1">
                                    <div class="text-secondary" style="font-size: 0.9rem;">
                                        ${averageFormatted}
                                    </div>
                                    <small class="text-muted">日均</small>
                                </div>
                                <small class="text-muted">
                                    ${stat.count} 天有数据
                                </small>
                            </div>
                            <div class="ml-2">
                                <div style="width: 12px; height: 60px; background: linear-gradient(180deg, ${stat.color}, ${stat.color}40); border-radius: 6px;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            summaryContent.appendChild(colDiv);
        });

        // 如果有统计数据，显示汇总信息
        if (statsKeys.length > 0) {
            const totalDays = this.currentProductData.data.length;
            const summaryInfoDiv = document.createElement('div');
            summaryInfoDiv.className = 'col-12 mt-2';
            summaryInfoDiv.innerHTML = `
                <div class="alert alert-info py-2 mb-0">
                    <i class="fas fa-info-circle"></i>
                    <strong>统计说明：</strong>
                    共 ${totalDays} 天数据，显示 ${statsKeys.length} 个可汇总字段的统计信息。
                    百分比类字段（如转化率、收藏率等）不参与汇总计算。
                </div>
            `;
            summaryContent.appendChild(summaryInfoDiv);
        }
    }
};

// 将TrendModule暴露给全局使用
window.TrendModule = TrendModule;

// 暴露兼容性函数给外部调用
window.showProductTrend = (tmallProductCode) => TrendModule.showProductTrend(tmallProductCode);
window.updateTrendChart = () => TrendModule.updateTrendChart();
window.selectAllTrendFields = () => TrendModule.selectAllTrendFields();
window.resetTrendFields = () => TrendModule.resetTrendFields();
window.exportTrendData = () => TrendModule.exportTrendData(); 