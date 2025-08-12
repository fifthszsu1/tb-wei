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
        { key: 'visitor_average_value', name: '访客平均价值', defaultSelected: false, color: '#009688', type: 'money' },
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
        
        this.availableFields.forEach(field => {
            const colDiv = document.createElement('div');
            colDiv.className = 'col-lg-3 col-md-4 col-sm-6 mb-2';
            
            const checkDiv = document.createElement('div');
            checkDiv.className = 'form-check';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-check-input';
            checkbox.id = `trend-field-${field.key}`;
            checkbox.value = field.key;
            checkbox.checked = field.defaultSelected;
            
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

    // 创建趋势图表
    createTrendChart() {
        const canvas = document.getElementById('productTrendChart');
        const ctx = canvas.getContext('2d');
        
        // 销毁现有图表
        if (this.trendChart) {
            this.trendChart.destroy();
        }
        
        // 获取选中的字段
        const selectedFields = this.getSelectedFields();
        
        if (selectedFields.length === 0) {
            showAlert('请至少选择一个字段进行展示', 'warning');
            return;
        }
        
        // 准备图表数据
        const chartData = this.prepareChartData(selectedFields);
        
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
                        text: `${this.currentProductData.product_name} - 趋势分析`,
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15
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
                                
                                return `${context.dataset.label}: ${value}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '日期'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: '数值'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    },

    // 准备图表数据
    prepareChartData(selectedFields) {
        if (!this.currentProductData || !this.currentProductData.data || this.currentProductData.data.length === 0) {
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
        
        // 提取日期标签
        const labels = this.currentProductData.data.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
        });
        
        // 为每个选中字段创建数据集
        const datasets = selectedFields.map(field => {
            const data = this.currentProductData.data.map(item => item[field.key] || 0);
            
            return {
                label: field.name,
                data: data,
                borderColor: field.color,
                backgroundColor: field.color + '20', // 添加透明度
                tension: 0.1,
                fill: false,
                pointRadius: 3,
                pointHoverRadius: 5
            };
        });
        
        return {
            labels: labels,
            datasets: datasets
        };
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
    },

    // 全选字段
    selectAllTrendFields() {
        this.availableFields.forEach(field => {
            const checkbox = document.getElementById(`trend-field-${field.key}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    },

    // 重置字段选择
    resetTrendFields() {
        this.availableFields.forEach(field => {
            const checkbox = document.getElementById(`trend-field-${field.key}`);
            if (checkbox) {
                checkbox.checked = field.defaultSelected;
            }
        });
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