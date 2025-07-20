// 业务计算模块
import { API_BASE_URL } from '../config.js';
import { UIUtils } from '../utils/ui.js';
import { AuthManager } from './auth.js';

export class BusinessManager {
    constructor() {
        this.initializeEventListeners();
    }

    // 初始化事件监听器
    initializeEventListeners() {
        // 推广汇总计算按钮
        const calculatePromotionBtn = document.getElementById('calculatePromotionSummary');
        if (calculatePromotionBtn) {
            calculatePromotionBtn.addEventListener('click', () => this.calculatePromotionSummary());
        }

        // 种植汇总计算按钮
        const calculatePlantingBtn = document.getElementById('calculatePlantingSummary');
        if (calculatePlantingBtn) {
            calculatePlantingBtn.addEventListener('click', () => this.calculatePlantingSummary());
        }

        // 最终汇总计算按钮
        const calculateFinalBtn = document.getElementById('calculateFinalSummary');
        if (calculateFinalBtn) {
            calculateFinalBtn.addEventListener('click', () => this.calculateFinalSummary());
        }

        // 数据汇总计算按钮
        const calculateDataSummaryBtn = document.getElementById('calculateDataSummary');
        if (calculateDataSummaryBtn) {
            calculateDataSummaryBtn.addEventListener('click', () => this.calculateDataSummary());
        }
    }

    // 推广汇总计算
    async calculatePromotionSummary() {
        try {
            UIUtils.showSpinner();
            
            const response = await fetch(`${API_BASE_URL}/calculate_promotion_summary`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AuthManager.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || '推广汇总计算失败');
            }

            UIUtils.showAlert('success', `推广汇总计算完成！处理了 ${result.processed_count} 条记录`);
            
            // 更新显示
            this.displayPromotionSummary(result.summary);
            
            return result;
        } catch (error) {
            console.error('推广汇总计算错误:', error);
            UIUtils.showAlert('error', `推广汇总计算失败: ${error.message}`);
            throw error;
        } finally {
            UIUtils.hideSpinner();
        }
    }

    // 种植汇总计算
    async calculatePlantingSummary() {
        try {
            UIUtils.showSpinner();
            
            const response = await fetch(`${API_BASE_URL}/calculate_planting_summary`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AuthManager.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || '种植汇总计算失败');
            }

            UIUtils.showAlert('success', `种植汇总计算完成！处理了 ${result.processed_count} 条记录`);
            
            // 更新显示
            this.displayPlantingSummary(result.summary);
            
            return result;
        } catch (error) {
            console.error('种植汇总计算错误:', error);
            UIUtils.showAlert('error', `种植汇总计算失败: ${error.message}`);
            throw error;
        } finally {
            UIUtils.hideSpinner();
        }
    }

    // 最终汇总计算
    async calculateFinalSummary() {
        try {
            UIUtils.showSpinner();
            
            const response = await fetch(`${API_BASE_URL}/calculate_final_summary`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AuthManager.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || '最终汇总计算失败');
            }

            UIUtils.showAlert('success', `最终汇总计算完成！`);
            
            // 更新显示
            this.displayFinalSummary(result.summary);
            
            return result;
        } catch (error) {
            console.error('最终汇总计算错误:', error);
            UIUtils.showAlert('error', `最终汇总计算失败: ${error.message}`);
            throw error;
        } finally {
            UIUtils.hideSpinner();
        }
    }

    // 数据汇总计算
    async calculateDataSummary() {
        try {
            UIUtils.showSpinner();
            
            const response = await fetch(`${API_BASE_URL}/calculate_data_summary`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AuthManager.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || '数据汇总计算失败');
            }

            UIUtils.showAlert('success', `数据汇总计算完成！`);
            
            // 更新显示
            this.displayDataSummary(result.summary);
            
            return result;
        } catch (error) {
            console.error('数据汇总计算错误:', error);
            UIUtils.showAlert('error', `数据汇总计算失败: ${error.message}`);
            throw error;
        } finally {
            UIUtils.hideSpinner();
        }
    }

    // 获取推广汇总数据
    async getPromotionSummary(filters = {}) {
        try {
            const url = new URL(`${API_BASE_URL}/promotion_summary`);
            Object.keys(filters).forEach(key => {
                if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
                    url.searchParams.append(key, filters[key]);
                }
            });

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${AuthManager.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('获取推广汇总数据失败');
            }

            return await response.json();
        } catch (error) {
            console.error('获取推广汇总错误:', error);
            throw error;
        }
    }

    // 获取种植汇总数据
    async getPlantingSummary(filters = {}) {
        try {
            const url = new URL(`${API_BASE_URL}/planting_summary`);
            Object.keys(filters).forEach(key => {
                if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
                    url.searchParams.append(key, filters[key]);
                }
            });

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${AuthManager.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('获取种植汇总数据失败');
            }

            return await response.json();
        } catch (error) {
            console.error('获取种植汇总错误:', error);
            throw error;
        }
    }

    // 显示推广汇总结果
    displayPromotionSummary(summary) {
        const container = document.getElementById('promotionSummaryResult');
        if (!container || !summary) return;

        let html = '<div class="row">';
        
        // 总体统计
        if (summary.total_stats) {
            html += `
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5>推广汇总统计</h5>
                        </div>
                        <div class="card-body">
                            <p><strong>总记录数:</strong> ${summary.total_stats.total_records || 0}</p>
                            <p><strong>总推广费用:</strong> ¥${(summary.total_stats.total_promotion_cost || 0).toLocaleString()}</p>
                            <p><strong>总销售额:</strong> ¥${(summary.total_stats.total_sales || 0).toLocaleString()}</p>
                            <p><strong>平均ROI:</strong> ${((summary.total_stats.avg_roi || 0) * 100).toFixed(2)}%</p>
                        </div>
                    </div>
                </div>
            `;
        }

        // 按平台统计
        if (summary.platform_stats && summary.platform_stats.length > 0) {
            html += `
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5>按平台统计</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>平台</th>
                                            <th>推广费用</th>
                                            <th>销售额</th>
                                        </tr>
                                    </thead>
                                    <tbody>
            `;
            
            summary.platform_stats.forEach(stat => {
                html += `
                    <tr>
                        <td>${stat.platform || '-'}</td>
                        <td>¥${(stat.promotion_cost || 0).toLocaleString()}</td>
                        <td>¥${(stat.sales || 0).toLocaleString()}</td>
                    </tr>
                `;
            });
            
            html += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    }

    // 显示种植汇总结果
    displayPlantingSummary(summary) {
        const container = document.getElementById('plantingSummaryResult');
        if (!container || !summary) return;

        let html = '<div class="row">';
        
        // 总体统计
        if (summary.total_stats) {
            html += `
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5>种植汇总统计</h5>
                        </div>
                        <div class="card-body">
                            <p><strong>总记录数:</strong> ${summary.total_stats.total_records || 0}</p>
                            <p><strong>总种植面积:</strong> ${(summary.total_stats.total_area || 0).toLocaleString()} 亩</p>
                            <p><strong>总产量:</strong> ${(summary.total_stats.total_yield || 0).toLocaleString()} 斤</p>
                            <p><strong>平均亩产:</strong> ${(summary.total_stats.avg_yield_per_area || 0).toFixed(2)} 斤/亩</p>
                        </div>
                    </div>
                </div>
            `;
        }

        // 按作物统计
        if (summary.crop_stats && summary.crop_stats.length > 0) {
            html += `
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5>按作物统计</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>作物</th>
                                            <th>种植面积</th>
                                            <th>总产量</th>
                                        </tr>
                                    </thead>
                                    <tbody>
            `;
            
            summary.crop_stats.forEach(stat => {
                html += `
                    <tr>
                        <td>${stat.crop_name || '-'}</td>
                        <td>${(stat.area || 0).toLocaleString()} 亩</td>
                        <td>${(stat.yield || 0).toLocaleString()} 斤</td>
                    </tr>
                `;
            });
            
            html += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    }

    // 显示最终汇总结果
    displayFinalSummary(summary) {
        const container = document.getElementById('finalSummaryResult');
        if (!container || !summary) return;

        let html = `
            <div class="card">
                <div class="card-header">
                    <h5>最终汇总结果</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-4">
                            <h6>总体指标</h6>
                            <p><strong>总销售额:</strong> ¥${(summary.total_sales || 0).toLocaleString()}</p>
                            <p><strong>总成本:</strong> ¥${(summary.total_cost || 0).toLocaleString()}</p>
                            <p><strong>总利润:</strong> ¥${(summary.total_profit || 0).toLocaleString()}</p>
                            <p><strong>利润率:</strong> ${((summary.profit_margin || 0) * 100).toFixed(2)}%</p>
                        </div>
                        <div class="col-md-4">
                            <h6>推广指标</h6>
                            <p><strong>推广费用:</strong> ¥${(summary.promotion_cost || 0).toLocaleString()}</p>
                            <p><strong>推广ROI:</strong> ${((summary.promotion_roi || 0) * 100).toFixed(2)}%</p>
                        </div>
                        <div class="col-md-4">
                            <h6>生产指标</h6>
                            <p><strong>种植面积:</strong> ${(summary.planting_area || 0).toLocaleString()} 亩</p>
                            <p><strong>总产量:</strong> ${(summary.total_yield || 0).toLocaleString()} 斤</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // 显示数据汇总结果
    displayDataSummary(summary) {
        const container = document.getElementById('dataSummaryResult');
        if (!container || !summary) return;

        let html = `
            <div class="card">
                <div class="card-header">
                    <h5>数据汇总结果</h5>
                </div>
                <div class="card-body">
                    <div class="row">
        `;

        // 数据统计
        if (summary.data_stats) {
            html += `
                <div class="col-md-6">
                    <h6>数据统计</h6>
                    <p><strong>产品数据:</strong> ${summary.data_stats.product_data_count || 0} 条</p>
                    <p><strong>产品清单:</strong> ${summary.data_stats.product_list_count || 0} 条</p>
                    <p><strong>种植记录:</strong> ${summary.data_stats.planting_records_count || 0} 条</p>
                    <p><strong>主体报告:</strong> ${summary.data_stats.subject_reports_count || 0} 条</p>
                </div>
            `;
        }

        // 业务统计
        if (summary.business_stats) {
            html += `
                <div class="col-md-6">
                    <h6>业务统计</h6>
                    <p><strong>总销售额:</strong> ¥${(summary.business_stats.total_sales || 0).toLocaleString()}</p>
                    <p><strong>总订单数:</strong> ${summary.business_stats.total_orders || 0}</p>
                    <p><strong>平均客单价:</strong> ¥${(summary.business_stats.avg_order_value || 0).toFixed(2)}</p>
                </div>
            `;
        }

        html += `
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // 导出汇总报告
    async exportSummaryReport(type, filters = {}) {
        try {
            UIUtils.showSpinner();
            
            const url = new URL(`${API_BASE_URL}/export_summary_report`);
            url.searchParams.append('type', type);
            
            Object.keys(filters).forEach(key => {
                if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
                    url.searchParams.append(key, filters[key]);
                }
            });

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${AuthManager.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('导出汇总报告失败');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${type}_summary_report_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            
            UIUtils.showAlert('success', '汇总报告导出成功！');
        } catch (error) {
            console.error('导出汇总报告错误:', error);
            UIUtils.showAlert('error', `导出失败: ${error.message}`);
        } finally {
            UIUtils.hideSpinner();
        }
    }

    // 清除汇总结果显示
    clearSummaryDisplay(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }
    }

    // 获取业务指标
    async getBusinessMetrics(dateRange = {}) {
        try {
            const url = new URL(`${API_BASE_URL}/business_metrics`);
            if (dateRange.start_date) {
                url.searchParams.append('start_date', dateRange.start_date);
            }
            if (dateRange.end_date) {
                url.searchParams.append('end_date', dateRange.end_date);
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${AuthManager.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('获取业务指标失败');
            }

            return await response.json();
        } catch (error) {
            console.error('获取业务指标错误:', error);
            throw error;
        }
    }
} 