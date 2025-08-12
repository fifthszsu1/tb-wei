/**
 * 图表模块
 * 负责仪表板数据加载、图表创建、图表管理等功能
 */

// 图表模块对象
const ChartsModule = {
    // ======================== 仪表板数据加载 ========================

    // 加载仪表板数据
    loadDashboard(startDate = null, endDate = null) {
        // 移除权限检查，允许所有用户加载数据
        // if (!AuthModule.isAdmin()) return;
        
        APIService.getStats(startDate, endDate)
        .then(data => {
            // 更新统计数字
            this.updateDashboardStats(data);
            
            // 创建图表（检查数据是否存在）
            if (data.store_stats && data.store_stats.length > 0) {
                this.createStoreAmountChart(data.store_stats);
                this.createStorePieChart(data.store_stats);
                this.renderStoreTable(data.store_stats);
            } else {
                // 如果没有数据，显示空状态
                this.showEmptyChart('storeAmountChart', '暂无门店数据');
                this.showEmptyChart('storePieChart', '暂无门店数据');
                this.renderEmptyStoreTable();
            }
        })
        .catch(error => {
            console.error('Dashboard loading error:', error);
            showAlert('加载统计数据失败：' + error.message, 'danger');
        });
    },

    // 更新仪表板统计数字
    updateDashboardStats(data) {
        const totalAmountElement = document.getElementById('totalAmount');
        const totalQuantityElement = document.getElementById('totalQuantity');
        const overallUnitPriceElement = document.getElementById('overallUnitPrice');
        const storeCountElement = document.getElementById('storeCount');
        const dateRangeElement = document.getElementById('dateRange');

        if (totalAmountElement) {
            totalAmountElement.textContent = `¥${this.formatCurrency(data.total_amount || 0)}`;
        }
        if (totalQuantityElement) {
            totalQuantityElement.textContent = (data.total_quantity || 0).toLocaleString();
        }
        if (overallUnitPriceElement) {
            overallUnitPriceElement.textContent = `¥${this.formatCurrency(data.overall_unit_price || 0)}`;
        }
        if (storeCountElement) {
            storeCountElement.textContent = data.store_count || 0;
        }
        if (dateRangeElement) {
            const startDate = data.start_date;
            const endDate = data.end_date;
            if (startDate === endDate) {
                dateRangeElement.textContent = startDate === this.getYesterday() ? '昨天' : startDate;
            } else {
                dateRangeElement.textContent = `${startDate} 至 ${endDate}`;
            }
        }
    },

    // 格式化货币显示
    formatCurrency(amount) {
        return parseFloat(amount).toFixed(2);
    },

    // 获取昨天的日期字符串
    getYesterday() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    },

    // ======================== 图表创建功能 ========================

    // 创建平台分布图表
    createPlatformChart(platformStats) {
        try {
            const canvas = document.getElementById('platformChart');
            if (!canvas) {
                console.error('平台图表容器不存在');
                return;
            }

            const ctx = canvas.getContext('2d');
            
            // 销毁旧图表
            if (window.platformChart && typeof window.platformChart.destroy === 'function') {
                window.platformChart.destroy();
            }
            
            window.platformChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: platformStats.map(p => p.platform),
                    datasets: [{
                        data: platformStats.map(p => p.count),
                        backgroundColor: [
                            '#FF6384',
                            '#36A2EB',
                            '#FFCE56',
                            '#4BC0C0',
                            '#9966FF',
                            '#FF9F40'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        } catch (error) {
            console.error('创建平台图表失败:', error);
            this.showEmptyChart('platformChart', '图表加载失败');
        }
    },

    // 创建品牌排行图表
    createBrandChart(brandStats) {
        try {
            const canvas = document.getElementById('brandChart');
            if (!canvas) {
                console.error('品牌图表容器不存在');
                return;
            }

            const ctx = canvas.getContext('2d');
            
            // 销毁旧图表
            if (window.brandChart && typeof window.brandChart.destroy === 'function') {
                window.brandChart.destroy();
            }
            
            window.brandChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: brandStats.map(b => b.brand),
                    datasets: [{
                        label: '商品数量',
                        data: brandStats.map(b => b.count),
                        backgroundColor: '#36A2EB'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        } catch (error) {
            console.error('创建品牌图表失败:', error);
            this.showEmptyChart('brandChart', '图表加载失败');
        }
    },

    // ======================== 图表管理功能 ========================

    // 显示空图表状态
    showEmptyChart(chartId, message) {
        const canvas = document.getElementById(chartId);
        if (!canvas) {
            console.error(`图表容器 ${chartId} 不存在`);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制空状态
        ctx.fillStyle = '#6c757d';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    },

    // 清理所有图表
    clearAllCharts() {
        // 清理平台图表
        if (window.platformChart && typeof window.platformChart.destroy === 'function') {
            window.platformChart.destroy();
            window.platformChart = null;
        }
        
        // 清理品牌图表
        if (window.brandChart && typeof window.brandChart.destroy === 'function') {
            window.brandChart.destroy();
            window.brandChart = null;
        }
    },

    // 清理指定图表
    clearChart(chartName) {
        const chartInstance = window[chartName];
        if (chartInstance && typeof chartInstance.destroy === 'function') {
            chartInstance.destroy();
            window[chartName] = null;
        }
    },

    // ======================== 图表工具功能 ========================

    // 检查Chart.js是否可用
    isChartJSAvailable() {
        return typeof Chart !== 'undefined';
    },

    // 获取图表默认配置
    getDefaultChartOptions(type = 'basic') {
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false
        };

        switch(type) {
            case 'doughnut':
                return {
                    ...baseOptions,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                };
            case 'bar':
                return {
                    ...baseOptions,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                };
            default:
                return baseOptions;
        }
    },

    // 获取图表默认颜色
    getDefaultColors() {
        return [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40',
            '#FF6384',
            '#C9CBCF'
        ];
    },

    // ======================== 新的门店图表功能 ========================

    // 创建门店销售金额排行图表
    createStoreAmountChart(storeStats) {
        try {
            const canvas = document.getElementById('storeAmountChart');
            if (!canvas) {
                console.error('门店金额图表容器不存在');
                return;
            }
            
            const ctx = canvas.getContext('2d');
            
            // 销毁现有图表
            if (window.storeAmountChart && typeof window.storeAmountChart.destroy === 'function') {
                window.storeAmountChart.destroy();
            }
            
            // 取前10个门店
            const topStores = storeStats.slice(0, 10);
            const labels = topStores.map(item => item.store_name);
            const data = topStores.map(item => item.total_amount);
            
            window.storeAmountChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '销售金额 (¥)',
                        data: data,
                        backgroundColor: '#36A2EB',
                        borderColor: '#36A2EB',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '¥' + value.toLocaleString();
                                }
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return '销售金额: ¥' + context.parsed.y.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('创建门店金额图表失败:', error);
            this.showEmptyChart('storeAmountChart', '图表加载失败');
        }
    },

    // 创建门店销售占比饼图
    createStorePieChart(storeStats) {
        try {
            const canvas = document.getElementById('storePieChart');
            if (!canvas) {
                console.error('门店饼图容器不存在');
                return;
            }
            
            const ctx = canvas.getContext('2d');
            
            // 销毁现有图表
            if (window.storePieChart && typeof window.storePieChart.destroy === 'function') {
                window.storePieChart.destroy();
            }
            
            // 取前8个门店，其余合并为"其他"
            const topStores = storeStats.slice(0, 8);
            const otherStores = storeStats.slice(8);
            
            const labels = topStores.map(item => item.store_name);
            const data = topStores.map(item => item.total_amount);
            
            if (otherStores.length > 0) {
                const otherTotal = otherStores.reduce((sum, item) => sum + item.total_amount, 0);
                labels.push('其他');
                data.push(otherTotal);
            }
            
            window.storePieChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: this.getDefaultColors()
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                font: {
                                    size: 11
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${context.label}: ¥${context.parsed.toLocaleString()} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('创建门店饼图失败:', error);
            this.showEmptyChart('storePieChart', '图表加载失败');
        }
    },

    // 渲染门店数据表格
    renderStoreTable(storeStats) {
        const tableBody = document.getElementById('storeTableBody');
        if (!tableBody) {
            console.error('门店表格容器不存在');
            return;
        }

        if (!storeStats || storeStats.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        <i class="fas fa-inbox"></i> 暂无数据
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        storeStats.forEach((store, index) => {
            html += `
                <tr>
                    <td><span class="badge bg-primary">${index + 1}</span></td>
                    <td>${store.store_name}</td>
                    <td><strong>¥${this.formatCurrency(store.total_amount)}</strong></td>
                    <td>${store.total_quantity.toLocaleString()}</td>
                    <td>¥${this.formatCurrency(store.unit_price)}</td>
                    <td>${store.record_count}</td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
    },

    // 渲染空的门店表格
    renderEmptyStoreTable() {
        const tableBody = document.getElementById('storeTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        <i class="fas fa-inbox"></i> 暂无门店数据
                    </td>
                </tr>
            `;
        }
    },

    // 加载自定义日期区间的数据
    loadCustomDateRange() {
        const startDateInput = document.getElementById('dashboardStartDate');
        const endDateInput = document.getElementById('dashboardEndDate');
        
        const startDate = startDateInput ? startDateInput.value : '';
        const endDate = endDateInput ? endDateInput.value : '';
        
        // 验证日期输入
        if (!startDate || !endDate) {
            showAlert('请选择开始日期和结束日期', 'warning');
            return;
        }
        
        if (startDate > endDate) {
            showAlert('开始日期不能晚于结束日期', 'warning');
            return;
        }
        
        // 重新加载数据
        this.loadDashboard(startDate, endDate);
    },

    // 重置为默认数据
    resetToDefault() {
        // 清空日期输入
        const startDateInput = document.getElementById('dashboardStartDate');
        const endDateInput = document.getElementById('dashboardEndDate');
        
        if (startDateInput) startDateInput.value = '';
        if (endDateInput) endDateInput.value = '';
        
        // 重新加载默认数据
        this.loadDashboard();
    },

    // ======================== 图表初始化 ========================

    // 初始化图表模块
    initializeCharts() {
        if (!this.isChartJSAvailable()) {
            console.warn('Chart.js 未加载，图表功能不可用');
            return false;
        }

        // 清理现有图表
        this.clearAllCharts();
        
        console.log('图表模块初始化完成');
        return true;
    }
};

// 将ChartsModule暴露给全局使用
window.ChartsModule = ChartsModule;

// 暴露兼容性函数给外部调用（保持现有代码兼容）
window.loadDashboard = () => ChartsModule.loadDashboard();
window.createPlatformChart = (platformStats) => ChartsModule.createPlatformChart(platformStats);
window.createBrandChart = (brandStats) => ChartsModule.createBrandChart(brandStats);
window.clearAllCharts = () => ChartsModule.clearAllCharts();
window.showEmptyChart = (chartId, message) => ChartsModule.showEmptyChart(chartId, message); 