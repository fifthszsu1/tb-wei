/**
 * 图表模块
 * 负责仪表板数据加载、图表创建、图表管理等功能
 */

// 图表模块对象
const ChartsModule = {
    // ======================== 仪表板数据加载 ========================

    // 加载仪表板数据
    loadDashboard() {
        // 移除权限检查，允许所有用户加载数据
        // if (!AuthModule.isAdmin()) return;
        
        APIService.getStats()
        .then(data => {
            // 更新统计数字
            this.updateDashboardStats(data);
            
            // 创建图表（检查数据是否存在）
            if (data.platform_stats && data.platform_stats.length > 0) {
                this.createPlatformChart(data.platform_stats);
            } else {
                // 如果没有数据，显示空状态
                this.showEmptyChart('platformChart', '暂无平台数据');
            }
            
            if (data.brand_stats && data.brand_stats.length > 0) {
                this.createBrandChart(data.brand_stats);
            } else {
                // 如果没有数据，显示空状态
                this.showEmptyChart('brandChart', '暂无品牌数据');
            }
        })
        .catch(error => {
            console.error('Dashboard loading error:', error);
            showAlert('加载统计数据失败：' + error.message, 'danger');
        });
    },

    // 更新仪表板统计数字
    updateDashboardStats(data) {
        const totalRecordsElement = document.getElementById('totalRecords');
        const platformCountElement = document.getElementById('platformCount');
        const brandCountElement = document.getElementById('brandCount');

        if (totalRecordsElement) {
            totalRecordsElement.textContent = data.total_records || 0;
        }
        if (platformCountElement) {
            platformCountElement.textContent = (data.platform_stats || []).length;
        }
        if (brandCountElement) {
            brandCountElement.textContent = (data.brand_stats || []).length;
        }
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