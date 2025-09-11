/**
 * 图表模块
 * 负责仪表板数据加载、图表创建、图表管理等功能
 */

// 图表模块对象
const ChartsModule = {
    // ======================== 模块状态变量 ========================
    
    // 当前日期范围
    currentStartDate: null,
    currentEndDate: null,
    
    // ======================== 仪表板数据加载 ========================

    // 加载仪表板数据
    loadDashboard(startDate = null, endDate = null) {
        // 更新当前日期范围
        this.currentStartDate = startDate;
        this.currentEndDate = endDate;
        // 移除权限检查，允许所有用户加载数据
        // if (!AuthModule.isAdmin()) return;
        
        // 并行加载所有统计数据
        Promise.all([
            APIService.getStats(startDate, endDate),
            APIService.getOperatorStats(startDate, endDate),
            APIService.getCategoryStats(startDate, endDate)
        ])
        .then(([storeData, operatorData, categoryData]) => {
            // 更新统计数字
            this.updateDashboardStats(storeData);
            
            // 创建门店图表和表格
            if (storeData.store_stats && storeData.store_stats.length > 0) {
                this.createStoreAmountChart(storeData.store_stats);
                this.createStorePieChart(storeData.store_stats);
                this.renderStoreTable(storeData.store_stats);
            } else {
                // 如果没有数据，显示空状态
                this.showEmptyChart('storeAmountChart', '暂无门店数据');
                this.showEmptyChart('storePieChart', '暂无门店数据');
                this.renderEmptyStoreTable();
            }

            // 渲染负责人员销售详情表格
            if (operatorData.operator_stats && operatorData.operator_stats.length > 0) {
                this.renderOperatorTable(operatorData.operator_stats);
            } else {
                this.renderEmptyOperatorTable();
            }

            // 渲染类目业绩分布表格
            if (categoryData.category_stats && categoryData.category_stats.length > 0) {
                this.renderCategoryTable(categoryData.category_stats);
            } else {
                this.renderEmptyCategoryTable();
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
        const totalRealAmountElement = document.getElementById('totalRealAmount');
        const totalQuantityElement = document.getElementById('totalQuantity');
        const overallUnitPriceElement = document.getElementById('overallUnitPrice');
        const storeCountElement = document.getElementById('storeCount');
        const dateRangeElement = document.getElementById('dateRange');

        if (totalAmountElement) {
            totalAmountElement.textContent = `¥${this.formatCurrency(data.total_amount || 0)}`;
        }
        if (totalRealAmountElement) {
            totalRealAmountElement.textContent = `¥${this.formatCurrency(data.total_real_amount || 0)}`;
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
                    <td colspan="19" class="text-center text-muted">
                        <i class="fas fa-inbox"></i> 暂无数据
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        
        // 计算汇总数据
        let totalAmount = 0, totalRealAmount = 0, totalQuantity = 0, totalVisitors = 0, totalPaymentBuyers = 0;
        let totalPlantingOrders = 0, totalPlantingAmount = 0, totalRecords = 0;
        let totalSitewide = 0, totalKeyword = 0, totalProductOp = 0;
        let totalCrowd = 0, totalVideo = 0, totalDirect = 0, totalPromotion = 0;
        
        storeStats.forEach((store, index) => {
            // 累加汇总数据
            totalAmount += store.total_amount || 0;
            totalRealAmount += store.real_amount || 0;
            totalQuantity += store.total_quantity || 0;
            totalVisitors += store.visitor_count || 0;
            totalPaymentBuyers += store.payment_buyer_count || 0;
            totalPlantingOrders += store.planting_orders || 0;
            totalPlantingAmount += store.planting_amount || 0;
            totalSitewide += store.sitewide_promotion || 0;
            totalKeyword += store.keyword_promotion || 0;
            totalProductOp += store.product_operation || 0;
            totalCrowd += store.crowd_promotion || 0;
            totalVideo += store.super_short_video || 0;
            totalDirect += store.multi_target_direct || 0;
            totalPromotion += store.total_promotion || 0;
            totalRecords += store.record_count || 0;
            
            html += `
                <tr>
                    <td><span class="badge bg-primary">${index + 1}</span></td>
                    <td><strong>${store.store_name}</strong></td>
                    <td><strong class="text-success">¥${this.formatCurrency(store.total_amount)}</strong></td>
                    <td>
                        <strong class="text-primary clickable-real-amount" 
                               onclick="ProductRankingModule.showProductRanking('store', '${store.store_name}', '${this.currentStartDate}', '${this.currentEndDate}')"
                               style="cursor: pointer; text-decoration: underline;">
                            ¥${this.formatCurrency(store.real_amount || 0)}
                        </strong>
                    </td>
                    <td>${(store.total_quantity || 0).toLocaleString()}</td>
                    <td>¥${this.formatCurrency(store.unit_price)}</td>
                    <td>${(store.visitor_count || 0).toLocaleString()}</td>
                    <td>${(store.payment_buyer_count || 0).toLocaleString()}</td>
                    <td><span class="badge bg-info">${store.payment_conversion_rate || 0}%</span></td>
                    <td>${(store.planting_orders || 0).toLocaleString()}</td>
                    <td>¥${this.formatCurrency(store.planting_amount || 0)}</td>
                    <td>¥${this.formatCurrency(store.sitewide_promotion || 0)}</td>
                    <td>¥${this.formatCurrency(store.keyword_promotion || 0)}</td>
                    <td>¥${this.formatCurrency(store.product_operation || 0)}</td>
                    <td>¥${this.formatCurrency(store.crowd_promotion || 0)}</td>
                    <td>¥${this.formatCurrency(store.super_short_video || 0)}</td>
                    <td>¥${this.formatCurrency(store.multi_target_direct || 0)}</td>
                    <td><strong class="text-warning">¥${this.formatCurrency(store.total_promotion || 0)}</strong></td>
                    <td><span class="badge bg-secondary">${store.promotion_ratio || 0}%</span></td>
                    <td><small class="text-muted">${store.record_count}</small></td>
                </tr>
            `;
        });
        
        // 添加汇总行
        const overallConversionRate = totalVisitors > 0 ? (totalPaymentBuyers / totalVisitors * 100) : 0;
        const avgUnitPrice = totalQuantity > 0 ? (totalAmount / totalQuantity) : 0;
        const overallPromotionRatio = totalRealAmount > 0 ? (totalPromotion / totalRealAmount * 100) : 0;
        
        html += `
            <tr class="table-warning fw-bold border-top border-3">
                <td><i class="fas fa-calculator"></i></td>
                <td><strong>合计</strong></td>
                <td><strong class="text-success">¥${this.formatCurrency(totalAmount)}</strong></td>
                <td><strong class="text-primary">¥${this.formatCurrency(totalRealAmount)}</strong></td>
                <td><strong>${totalQuantity.toLocaleString()}</strong></td>
                <td><strong>¥${this.formatCurrency(avgUnitPrice)}</strong></td>
                <td><strong>${totalVisitors.toLocaleString()}</strong></td>
                <td><strong>${totalPaymentBuyers.toLocaleString()}</strong></td>
                <td><span class="badge bg-primary">${overallConversionRate.toFixed(2)}%</span></td>
                <td><strong>${totalPlantingOrders.toLocaleString()}</strong></td>
                <td><strong>¥${this.formatCurrency(totalPlantingAmount)}</strong></td>
                <td><strong>¥${this.formatCurrency(totalSitewide)}</strong></td>
                <td><strong>¥${this.formatCurrency(totalKeyword)}</strong></td>
                <td><strong>¥${this.formatCurrency(totalProductOp)}</strong></td>
                <td><strong>¥${this.formatCurrency(totalCrowd)}</strong></td>
                <td><strong>¥${this.formatCurrency(totalVideo)}</strong></td>
                <td><strong>¥${this.formatCurrency(totalDirect)}</strong></td>
                <td><strong class="text-danger">¥${this.formatCurrency(totalPromotion)}</strong></td>
                <td><span class="badge bg-warning">${overallPromotionRatio.toFixed(2)}%</span></td>
                <td><strong class="text-muted">${totalRecords}</strong></td>
            </tr>
        `;
        
        tableBody.innerHTML = html;
    },

    // 渲染空的门店表格
    renderEmptyStoreTable() {
        const tableBody = document.getElementById('storeTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="20" class="text-center text-muted">
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

    // 查询前一天
    loadPreviousDay() {
        const startDateInput = document.getElementById('dashboardStartDate');
        const endDateInput = document.getElementById('dashboardEndDate');
        
        let startDate, endDate;
        
        // 如果当前有日期输入，基于当前日期计算前一天
        if (startDateInput && endDateInput && startDateInput.value && endDateInput.value) {
            const currentStart = new Date(startDateInput.value);
            const currentEnd = new Date(endDateInput.value);
            
            // 计算日期差
            const diffTime = currentEnd - currentStart;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // 向前移动相同的天数
            const newStart = new Date(currentStart);
            newStart.setDate(newStart.getDate() - 1);
            
            const newEnd = new Date(currentEnd);
            newEnd.setDate(newEnd.getDate() - 1);
            
            startDate = newStart.toISOString().split('T')[0];
            endDate = newEnd.toISOString().split('T')[0];
        } else {
            // 如果没有日期输入，使用昨天作为基准
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            startDate = yesterday.toISOString().split('T')[0];
            endDate = startDate;
        }
        
        // 更新日期输入框
        if (startDateInput) startDateInput.value = startDate;
        if (endDateInput) endDateInput.value = endDate;
        
        // 加载数据
        this.loadDashboard(startDate, endDate);
    },

    // 查询后一天
    loadNextDay() {
        const startDateInput = document.getElementById('dashboardStartDate');
        const endDateInput = document.getElementById('dashboardEndDate');
        
        let startDate, endDate;
        
        // 如果当前有日期输入，基于当前日期计算后一天
        if (startDateInput && endDateInput && startDateInput.value && endDateInput.value) {
            const currentStart = new Date(startDateInput.value);
            const currentEnd = new Date(endDateInput.value);
            
            // 计算日期差
            const diffTime = currentEnd - currentStart;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // 向后移动相同的天数
            const newStart = new Date(currentStart);
            newStart.setDate(newStart.getDate() + 1);
            
            const newEnd = new Date(currentEnd);
            newEnd.setDate(newEnd.getDate() + 1);
            
            startDate = newStart.toISOString().split('T')[0];
            endDate = newEnd.toISOString().split('T')[0];
        } else {
            // 如果没有日期输入，使用昨天作为基准
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const tomorrow = new Date(yesterday);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            startDate = tomorrow.toISOString().split('T')[0];
            endDate = startDate;
        }
        
        // 更新日期输入框
        if (startDateInput) startDateInput.value = startDate;
        if (endDateInput) endDateInput.value = endDate;
        
        // 加载数据
        this.loadDashboard(startDate, endDate);
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
    },

    // ======================== 负责人员销售详情 ========================
    
    // 渲染负责人员销售详情表格
    renderOperatorTable(operatorStats) {
        const tableBody = document.getElementById('operatorTableBody');
        if (!tableBody) {
            console.error('负责人员表格容器不存在');
            return;
        }

        if (!operatorStats || operatorStats.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="21" class="text-center text-muted">
                        <i class="fas fa-inbox"></i> 暂无数据
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        
        // 计算汇总数据
        let totalAmount = 0, totalRealAmount = 0, totalQuantity = 0, totalVisitors = 0, totalPaymentBuyers = 0;
        let totalPlantingOrders = 0, totalPlantingAmount = 0, totalRecords = 0;
        let totalSitewide = 0, totalKeyword = 0, totalProductOp = 0;
        let totalCrowd = 0, totalVideo = 0, totalDirect = 0, totalPromotion = 0;
        
        operatorStats.forEach((operator, index) => {
            // 累加汇总数据
            totalAmount += operator.total_amount || 0;
            totalRealAmount += operator.real_amount || 0;
            totalQuantity += operator.total_quantity || 0;
            totalVisitors += operator.visitor_count || 0;
            totalPaymentBuyers += operator.payment_buyer_count || 0;
            totalPlantingOrders += operator.planting_orders || 0;
            totalPlantingAmount += operator.planting_amount || 0;
            totalSitewide += operator.sitewide_promotion || 0;
            totalKeyword += operator.keyword_promotion || 0;
            totalProductOp += operator.product_operation || 0;
            totalCrowd += operator.crowd_promotion || 0;
            totalVideo += operator.super_short_video || 0;
            totalDirect += operator.multi_target_direct || 0;
            totalPromotion += operator.total_promotion || 0;
            totalRecords += operator.record_count || 0;
            
            html += `
                <tr>
                    <td><span class="badge bg-primary">${index + 1}</span></td>
                    <td><strong class="text-info">${operator.team}</strong></td>
                    <td><strong>${operator.operator}</strong></td>
                    <td><strong class="text-success">¥${this.formatCurrency(operator.total_amount)}</strong></td>
                    <td>
                        <strong class="text-primary clickable-real-amount" 
                               onclick="ProductRankingModule.showProductRanking('operator', '${operator.operator}', '${this.currentStartDate}', '${this.currentEndDate}')"
                               style="cursor: pointer; text-decoration: underline;">
                            ¥${this.formatCurrency(operator.real_amount || 0)}
                        </strong>
                    </td>
                    <td>${(operator.total_quantity || 0).toLocaleString()}</td>
                    <td>¥${this.formatCurrency(operator.unit_price)}</td>
                    <td>${(operator.visitor_count || 0).toLocaleString()}</td>
                    <td>${(operator.payment_buyer_count || 0).toLocaleString()}</td>
                    <td><span class="badge bg-info">${operator.payment_conversion_rate || 0}%</span></td>
                    <td>${(operator.planting_orders || 0).toLocaleString()}</td>
                    <td>¥${this.formatCurrency(operator.planting_amount || 0)}</td>
                    <td>¥${this.formatCurrency(operator.sitewide_promotion || 0)}</td>
                    <td>¥${this.formatCurrency(operator.keyword_promotion || 0)}</td>
                    <td>¥${this.formatCurrency(operator.product_operation || 0)}</td>
                    <td>¥${this.formatCurrency(operator.crowd_promotion || 0)}</td>
                    <td>¥${this.formatCurrency(operator.super_short_video || 0)}</td>
                    <td>¥${this.formatCurrency(operator.multi_target_direct || 0)}</td>
                    <td><strong class="text-warning">¥${this.formatCurrency(operator.total_promotion || 0)}</strong></td>
                    <td><span class="badge bg-secondary">${operator.promotion_ratio || 0}%</span></td>
                    <td><small class="text-muted">${operator.record_count}</small></td>
                </tr>
            `;
        });
        
        // 添加汇总行
        const overallConversionRate = totalVisitors > 0 ? (totalPaymentBuyers / totalVisitors * 100) : 0;
        const avgUnitPrice = totalQuantity > 0 ? (totalAmount / totalQuantity) : 0;
        const overallPromotionRatio = totalRealAmount > 0 ? (totalPromotion / totalRealAmount * 100) : 0;
        
        html += `
            <tr class="table-warning fw-bold border-top border-3">
                <td><i class="fas fa-calculator"></i></td>
                <td><strong>合计</strong></td>
                <td>-</td>
                <td><strong class="text-success">¥${this.formatCurrency(totalAmount)}</strong></td>
                <td><strong class="text-primary">¥${this.formatCurrency(totalRealAmount)}</strong></td>
                <td><strong>${totalQuantity.toLocaleString()}</strong></td>
                <td><strong>¥${this.formatCurrency(avgUnitPrice)}</strong></td>
                <td><strong>${totalVisitors.toLocaleString()}</strong></td>
                <td><strong>${totalPaymentBuyers.toLocaleString()}</strong></td>
                <td><span class="badge bg-primary">${overallConversionRate.toFixed(2)}%</span></td>
                <td><strong>${totalPlantingOrders.toLocaleString()}</strong></td>
                <td><strong>¥${this.formatCurrency(totalPlantingAmount)}</strong></td>
                <td><strong>¥${this.formatCurrency(totalSitewide)}</strong></td>
                <td><strong>¥${this.formatCurrency(totalKeyword)}</strong></td>
                <td><strong>¥${this.formatCurrency(totalProductOp)}</strong></td>
                <td><strong>¥${this.formatCurrency(totalCrowd)}</strong></td>
                <td><strong>¥${this.formatCurrency(totalVideo)}</strong></td>
                <td><strong>¥${this.formatCurrency(totalDirect)}</strong></td>
                <td><strong class="text-danger">¥${this.formatCurrency(totalPromotion)}</strong></td>
                <td><span class="badge bg-warning">${overallPromotionRatio.toFixed(2)}%</span></td>
                <td><strong class="text-muted">${totalRecords}</strong></td>
            </tr>
        `;
        
        tableBody.innerHTML = html;
    },

    // 渲染空的负责人员表格
    renderEmptyOperatorTable() {
        const tableBody = document.getElementById('operatorTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="21" class="text-center text-muted">
                        <i class="fas fa-inbox"></i> 暂无负责人员数据
                    </td>
                </tr>
            `;
        }
    },

    // ======================== 类目业绩分布 ========================
    
    // 渲染类目业绩分布表格
    renderCategoryTable(categoryStats) {
        const tableBody = document.getElementById('categoryTableBody');
        if (!tableBody) {
            console.error('类目业绩分布表格容器不存在');
            return;
        }

        if (!categoryStats || categoryStats.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="19" class="text-center text-muted">
                        <i class="fas fa-inbox"></i> 暂无数据
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        
        // 计算汇总数据
        let totalAmount = 0, totalRealAmount = 0, totalQuantity = 0, totalVisitors = 0, totalPaymentBuyers = 0;
        let totalPlantingOrders = 0, totalPlantingAmount = 0, totalRecords = 0;
        let totalSitewide = 0, totalKeyword = 0, totalProductOp = 0;
        let totalCrowd = 0, totalVideo = 0, totalDirect = 0, totalPromotion = 0;
        
        categoryStats.forEach((category, index) => {
            // 累加汇总数据
            totalAmount += category.total_amount || 0;
            totalRealAmount += category.real_amount || 0;
            totalQuantity += category.total_quantity || 0;
            totalVisitors += category.visitor_count || 0;
            totalPaymentBuyers += category.payment_buyer_count || 0;
            totalPlantingOrders += category.planting_orders || 0;
            totalPlantingAmount += category.planting_amount || 0;
            totalSitewide += category.sitewide_promotion || 0;
            totalKeyword += category.keyword_promotion || 0;
            totalProductOp += category.product_operation || 0;
            totalCrowd += category.crowd_promotion || 0;
            totalVideo += category.super_short_video || 0;
            totalDirect += category.multi_target_direct || 0;
            totalPromotion += category.total_promotion || 0;
            totalRecords += category.record_count || 0;
            
            html += `
                <tr>
                    <td><span class="badge bg-primary">${index + 1}</span></td>
                    <td>
                        <div class="category-cell" 
                             onmouseenter="ChartsModule.showCategoryTooltip(event, '${this.escapeHtml(category.category)}')"
                             onmouseleave="ChartsModule.hideCategoryTooltip(event)"
                             title="${this.escapeHtml(category.category)}">
                            <strong class="text-info">${this.processCategoryText(category.category)}</strong>
                        </div>
                    </td>
                    <td><strong class="text-success">¥${this.formatCurrency(category.total_amount)}</strong></td>
                    <td>
                        <strong class="text-primary clickable-real-amount" 
                               onclick="ProductRankingModule.showProductRanking('category', '${category.category}', '${this.currentStartDate}', '${this.currentEndDate}')"
                               style="cursor: pointer; text-decoration: underline;">
                            ¥${this.formatCurrency(category.real_amount || 0)}
                        </strong>
                    </td>
                    <td>${(category.total_quantity || 0).toLocaleString()}</td>
                    <td>¥${this.formatCurrency(category.unit_price)}</td>
                    <td>${(category.visitor_count || 0).toLocaleString()}</td>
                    <td>${(category.payment_buyer_count || 0).toLocaleString()}</td>
                    <td><span class="badge bg-info">${category.payment_conversion_rate || 0}%</span></td>
                    <td>${(category.planting_orders || 0).toLocaleString()}</td>
                    <td>¥${this.formatCurrency(category.planting_amount || 0)}</td>
                    <td>¥${this.formatCurrency(category.sitewide_promotion || 0)}</td>
                    <td>¥${this.formatCurrency(category.keyword_promotion || 0)}</td>
                    <td>¥${this.formatCurrency(category.product_operation || 0)}</td>
                    <td>¥${this.formatCurrency(category.crowd_promotion || 0)}</td>
                    <td>¥${this.formatCurrency(category.super_short_video || 0)}</td>
                    <td>¥${this.formatCurrency(category.multi_target_direct || 0)}</td>
                    <td><strong class="text-warning">¥${this.formatCurrency(category.total_promotion || 0)}</strong></td>
                    <td><small class="text-muted">${category.record_count}</small></td>
                </tr>
            `;
        });
        
        // 添加汇总行
        const overallConversionRate = totalVisitors > 0 ? (totalPaymentBuyers / totalVisitors * 100) : 0;
        const avgUnitPrice = totalQuantity > 0 ? (totalAmount / totalQuantity) : 0;
        
        html += `
            <tr class="table-warning fw-bold border-top border-3">
                <td><i class="fas fa-calculator"></i></td>
                <td><strong>合计</strong></td>
                <td><strong class="text-success">¥${this.formatCurrency(totalAmount)}</strong></td>
                <td><strong class="text-primary">¥${this.formatCurrency(totalRealAmount)}</strong></td>
                <td><strong>${totalQuantity.toLocaleString()}</strong></td>
                <td><strong>¥${this.formatCurrency(avgUnitPrice)}</strong></td>
                <td><strong>${totalVisitors.toLocaleString()}</strong></td>
                <td><strong>${totalPaymentBuyers.toLocaleString()}</strong></td>
                <td><span class="badge bg-primary">${overallConversionRate.toFixed(2)}%</span></td>
                <td><strong>${totalPlantingOrders.toLocaleString()}</strong></td>
                <td><strong>¥${this.formatCurrency(totalPlantingAmount)}</strong></td>
                <td><strong>¥${this.formatCurrency(totalSitewide)}</strong></td>
                <td><strong>¥${this.formatCurrency(totalKeyword)}</strong></td>
                <td><strong>¥${this.formatCurrency(totalProductOp)}</strong></td>
                <td><strong>¥${this.formatCurrency(totalCrowd)}</strong></td>
                <td><strong>¥${this.formatCurrency(totalVideo)}</strong></td>
                <td><strong>¥${this.formatCurrency(totalDirect)}</strong></td>
                <td><strong class="text-danger">¥${this.formatCurrency(totalPromotion)}</strong></td>
                <td><strong class="text-muted">${totalRecords}</strong></td>
            </tr>
        `;
        
        tableBody.innerHTML = html;
    },

    // 渲染空的类目业绩分布表格
    renderEmptyCategoryTable() {
        const tableBody = document.getElementById('categoryTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="19" class="text-center text-muted">
                        <i class="fas fa-inbox"></i> 暂无类目业绩数据
                    </td>
                </tr>
            `;
        }
    },

    // ======================== 类目悬停提示功能 ========================
    
    // 显示类目悬停提示
    showCategoryTooltip(event, categoryText) {
        console.log('showCategoryTooltip被调用:', categoryText, '长度:', categoryText.length); // 调试信息
        
        // 如果文本长度不超过30个字符，不显示提示（降低阈值）
        if (categoryText.length <= 30) {
            console.log('文本长度不足，不显示提示');
            return;
        }
        
        // 移除已存在的提示
        this.hideCategoryTooltip();
        
        // 创建提示元素
        const tooltip = document.createElement('div');
        tooltip.className = 'category-tooltip';
        tooltip.textContent = categoryText;
        tooltip.id = 'categoryTooltip';
        
        // 添加到页面
        document.body.appendChild(tooltip);
        
        // 计算位置
        const rect = event.target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let left = rect.left;
        let top = rect.top - tooltipRect.height - 10;
        
        // 防止超出屏幕边界
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        
        if (top < 10) {
            top = rect.bottom + 10;
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        
        console.log('提示框位置:', left, top); // 调试信息
        
        // 显示动画
        setTimeout(() => {
            tooltip.classList.add('show');
            console.log('提示框显示'); // 调试信息
        }, 50);
    },
    
    // 隐藏类目悬停提示
    hideCategoryTooltip(event) {
        const tooltip = document.getElementById('categoryTooltip');
        if (tooltip) {
            tooltip.classList.remove('show');
            setTimeout(() => {
                if (tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                    console.log('提示框隐藏'); // 调试信息
                }
            }, 300);
        }
    },
    
    // HTML转义
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function (m) {
            return map[m];
        });
    },
    
    // 处理类目文本
    processCategoryText(text) {
        if (!text) return '';
        
        // 如果文本包含两个或更多 '>'
        const parts = text.split('>');
        if (parts.length >= 3) {
            // 只取第一个和最后一个部分
            const firstPart = parts[0].trim();
            const lastPart = parts[parts.length - 1].trim();
            return `${firstPart}>${lastPart}`;
        }
        
        // 如果只有一个或两个 '>'，保持原样
        return text;
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