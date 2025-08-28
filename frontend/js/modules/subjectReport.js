/**
 * 主体报表弹窗模块
 * 负责显示商品的subject_report数据
 */

const SubjectReportModule = {
    // ======================== 模块状态变量 ========================
    
    // 当前商品数据
    currentProductCode: null,
    currentProductName: null,
    currentSubjectReportData: null,
    
    // ======================== 模块初始化 ========================
    
    // 初始化模块
    init() {
        console.log('SubjectReportModule 初始化完成');
    },
    
    // ======================== 主体报表弹窗功能 ========================
    
    // 显示主体报表弹窗
    showSubjectReport(tmallProductCode, promotionType) {
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
        const promotionTypeNames = {
            'keyword_promotion': '关键词推广',
            'sitewide_promotion': '全站推广',
            'product_operation': '货品运营推广',
            'crowd_promotion': '人群推广',
            'super_short_video': '超级短视频',
            'multi_target_direct': '多目标直投'
        };
        
        const promotionName = promotionTypeNames[promotionType] || '推广';
        document.getElementById('subjectReportProductCode').textContent = tmallProductCode;
        document.getElementById('subjectReportPromotionType').textContent = promotionName;
        
        // 显示弹窗
        const modal = new bootstrap.Modal(document.getElementById('subjectReportModal'));
        modal.show();
        
        // 加载主体报表数据
        this.loadSubjectReportData(tmallProductCode);
    },
    
    // 加载主体报表数据
    async loadSubjectReportData(tmallProductCode, startDate = null, endDate = null) {
        showSpinner();
        
        try {
            const response = await APIService.getProductSubjectReport(tmallProductCode, startDate, endDate);
            
            if (response.success) {
                this.currentSubjectReportData = response.data;
                this.currentProductName = response.data.product_name;
                
                // 更新商品信息
                document.getElementById('subjectReportProductName').textContent = response.data.product_name;
                document.getElementById('subjectReportDateRange').textContent = 
                    `${response.data.start_date} 至 ${response.data.end_date}`;
                
                // 渲染数据表格
                this.renderSubjectReportTable(response.data.data);
                
                // 显示数据统计
                this.showDataSummary(response.data.data);
                
            } else {
                showAlert(response.message || '获取主体报表数据失败', 'error');
            }
        } catch (error) {
            console.error('加载主体报表数据时出错:', error);
            showAlert('获取主体报表数据失败', 'error');
        } finally {
            hideSpinner();
        }
    },
    
    // 渲染主体报表表格
    renderSubjectReportTable(data) {
        const tableBody = document.getElementById('subjectReportTableBody');
        tableBody.innerHTML = '';
        
        if (!data || data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="20" class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-2x mb-2"></i>
                        <br>暂无主体报表数据
                    </td>
                </tr>
            `;
            return;
        }
        
        data.forEach(item => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${item.report_date || '-'}</td>
                <td>${item.scene_name || '-'}</td>
                <td>${item.original_scene_name || '-'}</td>
                <td>${item.plan_id || '-'}</td>
                <td>${item.plan_name || '-'}</td>
                <td>${item.subject_id || '-'}</td>
                <td>${(item.impressions || 0).toLocaleString()}</td>
                <td>${(item.clicks || 0).toLocaleString()}</td>
                <td>¥${(item.cost || 0).toFixed(2)}</td>
                <td>${(item.ctr || 0).toFixed(2)}%</td>
                <td>¥${(item.avg_cpc || 0).toFixed(2)}</td>
                <td>¥${(item.direct_transaction_amount || 0).toFixed(2)}</td>
                <td>¥${(item.indirect_transaction_amount || 0).toFixed(2)}</td>
                <td>¥${(item.total_transaction_amount || 0).toFixed(2)}</td>
                <td>${(item.total_transaction_orders || 0).toLocaleString()}</td>
                <td>${(item.click_conversion_rate || 0).toFixed(2)}%</td>
                <td>${(item.roas || 0).toFixed(2)}</td>
                <td>¥${(item.total_transaction_cost || 0).toFixed(2)}</td>
                <td>${(item.total_cart_count || 0).toLocaleString()}</td>
                <td>${(item.direct_cart_count || 0).toLocaleString()}</td>
                <td>${(item.indirect_cart_count || 0).toLocaleString()}</td>
                <td>${(item.cart_rate || 0).toFixed(2)}%</td>
                <td>${(item.favorite_product_count || 0).toLocaleString()}</td>
                <td>${(item.favorite_shop_count || 0).toLocaleString()}</td>
                <td>¥${(item.shop_favorite_cost || 0).toFixed(2)}</td>
                <td>${(item.total_favorite_cart_count || 0).toLocaleString()}</td>
                <td>¥${(item.total_favorite_cart_cost || 0).toFixed(2)}</td>
                <td>${(item.product_favorite_cart_count || 0).toLocaleString()}</td>
                <td>¥${(item.product_favorite_cart_cost || 0).toFixed(2)}</td>
                <td>${(item.total_favorite_count || 0).toLocaleString()}</td>
                <td>¥${(item.product_favorite_cost || 0).toFixed(2)}</td>
                <td>${(item.product_favorite_rate || 0).toFixed(2)}%</td>
                <td>¥${(item.cart_cost || 0).toFixed(2)}</td>
                <td>${(item.placed_order_count || 0).toLocaleString()}</td>
                <td>¥${(item.placed_order_amount || 0).toFixed(2)}</td>
                <td>${(item.direct_favorite_product_count || 0).toLocaleString()}</td>
                <td>${(item.indirect_favorite_product_count || 0).toLocaleString()}</td>
                <td>${(item.wangwang_consultation_count || 0).toLocaleString()}</td>
                <td>${(item.guided_visit_count || 0).toLocaleString()}</td>
                <td>${(item.guided_visitor_count || 0).toLocaleString()}</td>
                <td>${(item.guided_potential_customer_count || 0).toLocaleString()}</td>
                <td>${(item.guided_potential_customer_rate || 0).toFixed(2)}%</td>
                <td>${(item.guided_visit_rate || 0).toFixed(2)}%</td>
                <td>${(item.deep_visit_count || 0).toLocaleString()}</td>
                <td>${(item.avg_visit_pages || 0).toFixed(1)}</td>
                <td>${(item.new_customer_count || 0).toLocaleString()}</td>
                <td>${(item.new_customer_rate || 0).toFixed(2)}%</td>
                <td>${(item.member_first_purchase_count || 0).toLocaleString()}</td>
                <td>¥${(item.member_transaction_amount || 0).toFixed(2)}</td>
                <td>${(item.member_transaction_orders || 0).toLocaleString()}</td>
                <td>${(item.transaction_customer_count || 0).toLocaleString()}</td>
                <td>${(item.avg_orders_per_customer || 0).toFixed(1)}</td>
                <td>¥${(item.avg_amount_per_customer || 0).toFixed(2)}</td>
                <td>¥${(item.natural_traffic_amount || 0).toFixed(2)}</td>
                <td>${(item.natural_traffic_impressions || 0).toLocaleString()}</td>
            `;
        });
    },
    
    // 显示数据统计
    showDataSummary(data) {
        if (!data || data.length === 0) {
            document.getElementById('subjectReportSummary').style.display = 'none';
            return;
        }
        
        // 计算汇总数据
        const summary = {
            totalCost: 0,
            totalImpressions: 0,
            totalClicks: 0,
            totalTransactionAmount: 0,
            totalTransactionOrders: 0,
            avgCtr: 0,
            avgCpc: 0,
            avgRoas: 0
        };
        
        data.forEach(item => {
            summary.totalCost += item.cost || 0;
            summary.totalImpressions += item.impressions || 0;
            summary.totalClicks += item.clicks || 0;
            summary.totalTransactionAmount += item.total_transaction_amount || 0;
            summary.totalTransactionOrders += item.total_transaction_orders || 0;
        });
        
        // 计算平均值
        if (data.length > 0) {
            summary.avgCtr = summary.totalImpressions > 0 ? (summary.totalClicks / summary.totalImpressions * 100) : 0;
            summary.avgCpc = summary.totalClicks > 0 ? (summary.totalCost / summary.totalClicks) : 0;
            summary.avgRoas = summary.totalCost > 0 ? (summary.totalTransactionAmount / summary.totalCost) : 0;
        }
        
        // 更新统计显示
        document.getElementById('subjectReportSummary').style.display = 'block';
        document.getElementById('summaryTotalCost').textContent = `¥${summary.totalCost.toFixed(2)}`;
        document.getElementById('summaryTotalImpressions').textContent = summary.totalImpressions.toLocaleString();
        document.getElementById('summaryTotalClicks').textContent = summary.totalClicks.toLocaleString();
        document.getElementById('summaryTotalTransactionAmount').textContent = `¥${summary.totalTransactionAmount.toFixed(2)}`;
        document.getElementById('summaryTotalTransactionOrders').textContent = summary.totalTransactionOrders.toLocaleString();
        document.getElementById('summaryAvgCtr').textContent = `${summary.avgCtr.toFixed(2)}%`;
        document.getElementById('summaryAvgCpc').textContent = `¥${summary.avgCpc.toFixed(2)}`;
        document.getElementById('summaryAvgRoas').textContent = summary.avgRoas.toFixed(2);
    },
    
    // 导出数据
    exportSubjectReportData() {
        if (!this.currentSubjectReportData || !this.currentSubjectReportData.data) {
            showAlert('没有可导出的数据', 'warning');
            return;
        }
        
        const data = this.currentSubjectReportData.data;
        const filename = `subject_report_${this.currentProductCode}_${new Date().toISOString().split('T')[0]}.csv`;
        
        // 定义CSV列头
        const headers = [
            '日期', '场景名字', '原二级场景名字', '计划ID', '计划名字', '主体ID',
            '展现量', '点击量', '花费', '点击率', '平均点击花费', '千次展现花费',
            '直接成交金额', '间接成交金额', '总成交金额', '总成交笔数', '直接成交笔数', '间接成交笔数',
            '点击转化率', '投入产出比', '总成交成本', '总购物车数', '直接购物车数', '间接购物车数',
            '加购率', '收藏宝贝数', '收藏店铺数', '店铺收藏成本', '总收藏加购数', '总收藏加购成本',
            '宝贝收藏加购数', '宝贝收藏加购成本', '总收藏数', '宝贝收藏成本', '宝贝收藏率', '加购成本',
            '拍下订单笔数', '拍下订单金额', '直接收藏宝贝数', '间接收藏宝贝数', '旺旺咨询量',
            '引导访问量', '引导访问人数', '引导访问潜客数', '引导访问潜客占比', '引导访问率',
            '深度访问量', '平均访问页面数', '成交新客数', '成交新客占比', '会员首购人数',
            '会员成交金额', '会员成交笔数', '成交人数', '人均成交笔数', '人均成交金额',
            '自然流量转化金额', '自然流量曝光量'
        ];
        
        // 准备CSV数据
        const csvData = [headers];
        data.forEach(item => {
            csvData.push([
                item.report_date || '',
                item.scene_name || '',
                item.original_scene_name || '',
                item.plan_id || '',
                item.plan_name || '',
                item.subject_id || '',
                item.impressions || 0,
                item.clicks || 0,
                item.cost || 0,
                item.ctr || 0,
                item.avg_cpc || 0,
                item.cpm || 0,
                item.direct_transaction_amount || 0,
                item.indirect_transaction_amount || 0,
                item.total_transaction_amount || 0,
                item.total_transaction_orders || 0,
                item.direct_transaction_orders || 0,
                item.indirect_transaction_orders || 0,
                item.click_conversion_rate || 0,
                item.roas || 0,
                item.total_transaction_cost || 0,
                item.total_cart_count || 0,
                item.direct_cart_count || 0,
                item.indirect_cart_count || 0,
                item.cart_rate || 0,
                item.favorite_product_count || 0,
                item.favorite_shop_count || 0,
                item.shop_favorite_cost || 0,
                item.total_favorite_cart_count || 0,
                item.total_favorite_cart_cost || 0,
                item.product_favorite_cart_count || 0,
                item.product_favorite_cart_cost || 0,
                item.total_favorite_count || 0,
                item.product_favorite_cost || 0,
                item.product_favorite_rate || 0,
                item.cart_cost || 0,
                item.placed_order_count || 0,
                item.placed_order_amount || 0,
                item.direct_favorite_product_count || 0,
                item.indirect_favorite_product_count || 0,
                item.wangwang_consultation_count || 0,
                item.guided_visit_count || 0,
                item.guided_visitor_count || 0,
                item.guided_potential_customer_count || 0,
                item.guided_potential_customer_rate || 0,
                item.guided_visit_rate || 0,
                item.deep_visit_count || 0,
                item.avg_visit_pages || 0,
                item.new_customer_count || 0,
                item.new_customer_rate || 0,
                item.member_first_purchase_count || 0,
                item.member_transaction_amount || 0,
                item.member_transaction_orders || 0,
                item.transaction_customer_count || 0,
                item.avg_orders_per_customer || 0,
                item.avg_amount_per_customer || 0,
                item.natural_traffic_amount || 0,
                item.natural_traffic_impressions || 0
            ]);
        });
        
        // 生成并下载CSV文件
        const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        
        showAlert('数据导出成功', 'success');
    }
};

// 将SubjectReportModule暴露给全局使用
window.SubjectReportModule = SubjectReportModule;

// 暴露兼容性函数给外部调用
window.showSubjectReport = (tmallProductCode, promotionType) => SubjectReportModule.showSubjectReport(tmallProductCode, promotionType);
window.exportSubjectReportData = () => SubjectReportModule.exportSubjectReportData(); 