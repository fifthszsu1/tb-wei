// 图表模块
export class ChartManager {
    constructor() {
        this.charts = new Map(); // 存储图表实例
        this.defaultOptions = this.getDefaultChartOptions();
    }

    // 获取默认图表配置
    getDefaultChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        };
    }

    // 创建柱状图
    createBarChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element with id '${canvasId}' not found`);
            return null;
        }

        // 销毁现有图表
        this.destroyChart(canvasId);

        const ctx = canvas.getContext('2d');
        const config = {
            type: 'bar',
            data: data,
            options: {
                ...this.defaultOptions,
                ...options
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        
        return chart;
    }

    // 创建折线图
    createLineChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element with id '${canvasId}' not found`);
            return null;
        }

        this.destroyChart(canvasId);

        const ctx = canvas.getContext('2d');
        const config = {
            type: 'line',
            data: data,
            options: {
                ...this.defaultOptions,
                ...options,
                elements: {
                    line: {
                        tension: 0.4
                    }
                }
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        
        return chart;
    }

    // 创建饼图
    createPieChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element with id '${canvasId}' not found`);
            return null;
        }

        this.destroyChart(canvasId);

        const ctx = canvas.getContext('2d');
        const config = {
            type: 'pie',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                ...options
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        
        return chart;
    }

    // 创建环形图
    createDoughnutChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element with id '${canvasId}' not found`);
            return null;
        }

        this.destroyChart(canvasId);

        const ctx = canvas.getContext('2d');
        const config = {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                ...options
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        
        return chart;
    }

    // 创建混合图表
    createMixedChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element with id '${canvasId}' not found`);
            return null;
        }

        this.destroyChart(canvasId);

        const ctx = canvas.getContext('2d');
        const config = {
            type: 'bar', // 基础类型
            data: data,
            options: {
                ...this.defaultOptions,
                ...options
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        
        return chart;
    }

    // 销售趋势图表
    createSalesTrendChart(canvasId, salesData) {
        const data = {
            labels: salesData.map(item => item.date),
            datasets: [{
                label: '销售额',
                data: salesData.map(item => item.amount),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.4
            }]
        };

        const options = {
            plugins: {
                title: {
                    display: true,
                    text: '销售趋势图'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '¥' + value.toLocaleString();
                        }
                    }
                }
            }
        };

        return this.createLineChart(canvasId, data, options);
    }

    // 平台分布图表
    createPlatformDistributionChart(canvasId, platformData) {
        const data = {
            labels: platformData.map(item => item.platform),
            datasets: [{
                data: platformData.map(item => item.sales),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 205, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)'
                ]
            }]
        };

        const options = {
            plugins: {
                title: {
                    display: true,
                    text: '平台销售分布'
                }
            }
        };

        return this.createDoughnutChart(canvasId, data, options);
    }

    // 月度对比图表
    createMonthlyComparisonChart(canvasId, monthlyData) {
        const data = {
            labels: monthlyData.map(item => item.month),
            datasets: [
                {
                    label: '销售额',
                    data: monthlyData.map(item => item.sales),
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    yAxisID: 'y'
                },
                {
                    label: '订单数',
                    data: monthlyData.map(item => item.orders),
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    yAxisID: 'y1'
                }
            ]
        };

        const options = {
            plugins: {
                title: {
                    display: true,
                    text: '月度销售对比'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        callback: function(value) {
                            return '¥' + value.toLocaleString();
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '单';
                        }
                    }
                }
            }
        };

        return this.createBarChart(canvasId, data, options);
    }

    // 产品类别销售图表
    createProductCategoryChart(canvasId, categoryData) {
        const data = {
            labels: categoryData.map(item => item.category),
            datasets: [{
                label: '销售量',
                data: categoryData.map(item => item.quantity),
                backgroundColor: 'rgba(75, 192, 192, 0.8)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        };

        const options = {
            plugins: {
                title: {
                    display: true,
                    text: '产品类别销售统计'
                }
            },
            indexAxis: 'y' // 水平柱状图
        };

        return this.createBarChart(canvasId, data, options);
    }

    // 推广效果图表
    createPromotionEffectChart(canvasId, promotionData) {
        const data = {
            labels: promotionData.map(item => item.campaign),
            datasets: [
                {
                    label: '推广费用',
                    data: promotionData.map(item => item.cost),
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    yAxisID: 'y'
                },
                {
                    label: '销售收入',
                    data: promotionData.map(item => item.revenue),
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    yAxisID: 'y'
                }
            ]
        };

        const options = {
            plugins: {
                title: {
                    display: true,
                    text: '推广效果分析'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '¥' + value.toLocaleString();
                        }
                    }
                }
            }
        };

        return this.createBarChart(canvasId, data, options);
    }

    // 更新图表数据
    updateChart(canvasId, newData) {
        const chart = this.charts.get(canvasId);
        if (!chart) {
            console.error(`Chart with id '${canvasId}' not found`);
            return;
        }

        chart.data = newData;
        chart.update('active');
    }

    // 更新图表数据集
    updateChartDataset(canvasId, datasetIndex, newData) {
        const chart = this.charts.get(canvasId);
        if (!chart) {
            console.error(`Chart with id '${canvasId}' not found`);
            return;
        }

        if (chart.data.datasets[datasetIndex]) {
            chart.data.datasets[datasetIndex].data = newData;
            chart.update('active');
        }
    }

    // 添加数据点
    addDataPoint(canvasId, label, dataPoints) {
        const chart = this.charts.get(canvasId);
        if (!chart) {
            console.error(`Chart with id '${canvasId}' not found`);
            return;
        }

        chart.data.labels.push(label);
        chart.data.datasets.forEach((dataset, index) => {
            dataset.data.push(dataPoints[index] || 0);
        });
        
        chart.update('active');
    }

    // 移除数据点
    removeDataPoint(canvasId, index) {
        const chart = this.charts.get(canvasId);
        if (!chart) {
            console.error(`Chart with id '${canvasId}' not found`);
            return;
        }

        chart.data.labels.splice(index, 1);
        chart.data.datasets.forEach(dataset => {
            dataset.data.splice(index, 1);
        });
        
        chart.update('active');
    }

    // 销毁图表
    destroyChart(canvasId) {
        const chart = this.charts.get(canvasId);
        if (chart) {
            chart.destroy();
            this.charts.delete(canvasId);
        }
    }

    // 销毁所有图表
    destroyAllCharts() {
        this.charts.forEach((chart, canvasId) => {
            chart.destroy();
        });
        this.charts.clear();
    }

    // 导出图表为图片
    exportChartAsImage(canvasId, filename = 'chart.png') {
        const chart = this.charts.get(canvasId);
        if (!chart) {
            console.error(`Chart with id '${canvasId}' not found`);
            return;
        }

        const canvas = chart.canvas;
        const url = canvas.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 获取图表实例
    getChart(canvasId) {
        return this.charts.get(canvasId);
    }

    // 获取所有图表
    getAllCharts() {
        return this.charts;
    }

    // 重置图表大小
    resizeChart(canvasId) {
        const chart = this.charts.get(canvasId);
        if (chart) {
            chart.resize();
        }
    }

    // 重置所有图表大小
    resizeAllCharts() {
        this.charts.forEach(chart => {
            chart.resize();
        });
    }

    // 生成随机颜色
    generateRandomColor() {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        return `rgba(${r}, ${g}, ${b}, 0.8)`;
    }

    // 生成颜色数组
    generateColorArray(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(this.generateRandomColor());
        }
        return colors;
    }

    // 格式化数据为图表格式
    formatDataForChart(rawData, labelKey, valueKey) {
        return {
            labels: rawData.map(item => item[labelKey]),
            datasets: [{
                data: rawData.map(item => item[valueKey]),
                backgroundColor: this.generateColorArray(rawData.length)
            }]
        };
    }
} 