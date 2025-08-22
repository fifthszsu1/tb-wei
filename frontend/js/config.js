// 应用配置模块
const AppConfig = {
    // API配置
    API_BASE: window.location.port === '80' || window.location.port === '' ? '/api' : 'http://localhost:5000/api',
    
    // 本地存储键名
    STORAGE_KEYS: {
        TOKEN: 'token',
        VISIBLE_COLUMNS: 'visibleColumns',
        COLUMN_WIDTHS: 'columnWidths',
        ORDER_VISIBLE_COLUMNS: 'orderVisibleColumns',
        ORDER_COLUMN_WIDTHS: 'orderColumnWidths'
    },
    
    // 表格配置
    TABLE_CONFIG: {
        DEFAULT_PAGE_SIZE: 20,
        MIN_COLUMN_WIDTH: 80
    },
    
    // 文件上传配置
    UPLOAD_CONFIG: {
        ACCEPTED_FORMATS: ['.xlsx', '.xls', '.csv'],
        MAX_FILE_SIZE: 50 * 1024 * 1024 // 50MB
    },
    
    // 用户角色
    USER_ROLES: {
        ADMIN: 'admin',
        USER: 'user'
    },
    
    // 场景名称到样式的映射
    SCENE_STYLES: {
        '全站推广': 'bg-primary',
        '关键词推广': 'bg-success',
        '货品运营': 'bg-warning',
        '人群推广': 'bg-danger',
        '超级短视频': 'bg-info',
        '多目标直投': 'bg-secondary'
    },
    
    // 表格列配置
    TABLE_COLUMNS: [
        // 基础信息（冻结列 - 不参与列设置）
        { key: 'upload_date', name: '日期', defaultVisible: true, width: '100px', frozen: true },
        { key: 'product_list_image', name: '链接主图', defaultVisible: true, width: '80px', frozen: true },
        { key: 'tmall_product_code', name: '天猫ID', defaultVisible: true, width: '120px', frozen: true },
        { key: 'product_name', name: '产品', defaultVisible: true, width: '200px', frozen: true },
        { key: 'participating_activities', name: '参与活动', defaultVisible: true, width: '120px', frozen: true },
        { key: 'tmall_supplier_name', name: '店铺名', defaultVisible: true, width: '150px', frozen: true },
        { key: 'listing_time', name: '上架时间', defaultVisible: true, width: '100px', frozen: true },
        { key: 'product_list_operator', name: '链接负责人', defaultVisible: true, width: '120px', frozen: true },
        
        // 销售数据
        { key: 'payment_buyer_count', name: '前台订单笔数', defaultVisible: true, width: '120px', category: 'sales', categoryName: '销售数据' },
        { key: 'payment_product_count', name: '支付件数', defaultVisible: true, width: '100px', category: 'sales', categoryName: '销售数据' },
        { key: 'real_buyer_count', name: '真实买家数', defaultVisible: true, width: '100px', category: 'sales', categoryName: '销售数据' },
        { key: 'real_product_count', name: '真实件数', defaultVisible: true, width: '100px', category: 'sales', categoryName: '销售数据' },
        { key: 'payment_amount', name: '前台成交金额', defaultVisible: true, width: '120px', category: 'sales', categoryName: '销售数据' },
        { key: 'real_amount', name: '真实金额', defaultVisible: true, width: '100px', category: 'sales', categoryName: '销售数据' },
        { key: 'refund_amount', name: '退款金额', defaultVisible: true, width: '100px', category: 'sales', categoryName: '销售数据' },
        
        // 流量转化
        { key: 'visitor_count', name: '访客数', defaultVisible: true, width: '100px', category: 'traffic', categoryName: '流量转化' },
        { key: 'search_guided_visitors', name: '自然搜索', defaultVisible: true, width: '100px', category: 'traffic', categoryName: '流量转化' },
        { key: 'favorite_count', name: '收藏', defaultVisible: true, width: '80px', category: 'traffic', categoryName: '流量转化' },
        { key: 'add_to_cart_count', name: '加购', defaultVisible: true, width: '80px', category: 'traffic', categoryName: '流量转化' },
        { key: 'conversion_rate', name: '支付转化率', defaultVisible: true, width: '100px', category: 'traffic', categoryName: '流量转化' },
        { key: 'favorite_rate', name: '收藏率', defaultVisible: true, width: '100px', category: 'traffic', categoryName: '流量转化' },
        { key: 'cart_rate', name: '加购率', defaultVisible: true, width: '100px', category: 'traffic', categoryName: '流量转化' },
        { key: 'uv_value', name: 'UV价值', defaultVisible: true, width: '100px', category: 'traffic', categoryName: '流量转化' },
        { key: 'real_conversion_rate', name: '真实转化率', defaultVisible: true, width: '100px', category: 'traffic', categoryName: '流量转化' },
        
        // 成本费用
        { key: 'product_cost', name: '产品成本', defaultVisible: true, width: '100px', category: 'cost', categoryName: '成本费用' },
        { key: 'real_order_deduction', name: '真实订单扣点', defaultVisible: true, width: '120px', category: 'cost', categoryName: '成本费用' },
        { key: 'tax_invoice', name: '税票', defaultVisible: true, width: '100px', category: 'cost', categoryName: '成本费用' },
        { key: 'real_order_logistics_cost', name: '真实订单物流成本', defaultVisible: true, width: '140px', category: 'cost', categoryName: '成本费用' },
        { key: 'keyword_promotion', name: '关键词推广', defaultVisible: true, width: '100px', category: 'cost', categoryName: '成本费用' },
        { key: 'sitewide_promotion', name: '全站推广', defaultVisible: true, width: '100px', category: 'cost', categoryName: '成本费用' },
        { key: 'product_operation', name: '货品运营', defaultVisible: true, width: '100px', category: 'cost', categoryName: '成本费用' },
        { key: 'crowd_promotion', name: '人群推广', defaultVisible: true, width: '100px', category: 'cost', categoryName: '成本费用' },
        { key: 'super_short_video', name: '超级短视频', defaultVisible: true, width: '100px', category: 'cost', categoryName: '成本费用' },
        { key: 'multi_target_direct', name: '多目标直投', defaultVisible: true, width: '100px', category: 'cost', categoryName: '成本费用' },
        { key: 'gross_profit', name: '毛利', defaultVisible: true, width: '100px', category: 'cost', categoryName: '成本费用' },
        
        // 种菜相关
        { key: 'planting_orders', name: '种菜笔数', defaultVisible: true, width: '100px', category: 'planting', categoryName: '种菜相关' },
        { key: 'planting_amount', name: '种菜金额', defaultVisible: true, width: '100px', category: 'planting', categoryName: '种菜相关' },
        { key: 'planting_cost', name: '种菜成本', defaultVisible: true, width: '100px', category: 'planting', categoryName: '种菜相关' },
        { key: 'planting_deduction', name: '种菜扣点', defaultVisible: true, width: '100px', category: 'planting', categoryName: '种菜相关' },
        { key: 'planting_logistics_cost', name: '种菜物流成本', defaultVisible: true, width: '120px', category: 'planting', categoryName: '种菜相关' }
    ],

    // 订单数据表格列配置
    ORDER_TABLE_COLUMNS: [
        // 订单信息
        { key: 'internal_order_number', name: '内部订单号', defaultVisible: true, width: '150px', sortable: true, category: 'order', categoryName: '订单信息' },
        { key: 'online_order_number', name: '线上订单号', defaultVisible: true, width: '150px', sortable: true, category: 'order', categoryName: '订单信息' },
        { key: 'order_status', name: '订单状态', defaultVisible: true, width: '120px', sortable: true, category: 'order', categoryName: '订单信息' },
        { key: 'product_list_operator', name: '操作人', defaultVisible: true, width: '120px', sortable: true, category: 'order', categoryName: '订单信息' },
        { key: 'order_time', name: '下单时间', defaultVisible: true, width: '180px', sortable: true, category: 'order', categoryName: '订单信息' },
        { key: 'payment_date', name: '付款日期', defaultVisible: true, width: '120px', sortable: true, category: 'order', categoryName: '订单信息' },
        { key: 'shipping_date', name: '发货日期', defaultVisible: true, width: '120px', sortable: true, category: 'order', categoryName: '订单信息' },
        { key: 'upload_date', name: '上传日期', defaultVisible: true, width: '120px', sortable: true, category: 'order', categoryName: '订单信息' },
        
        // 商品信息
        { key: 'product_code', name: '商品编码', defaultVisible: true, width: '150px', sortable: true, category: 'product', categoryName: '商品信息' },
        { key: 'product_name', name: '商品名称', defaultVisible: true, width: '200px', sortable: true, category: 'product', categoryName: '商品信息' },
        { key: 'quantity', name: '数量', defaultVisible: true, width: '80px', sortable: true, category: 'product', categoryName: '商品信息' },
        { key: 'unit_price', name: '商品单价', defaultVisible: true, width: '120px', sortable: true, category: 'product', categoryName: '商品信息' },
        { key: 'product_amount', name: '商品金额', defaultVisible: true, width: '120px', sortable: true, category: 'product', categoryName: '商品信息' },
        
        // 店铺金额
        { key: 'store_code', name: '店铺编号', defaultVisible: true, width: '120px', sortable: true, category: 'store', categoryName: '店铺金额' },
        { key: 'store_name', name: '店铺名称', defaultVisible: true, width: '150px', sortable: true, category: 'store', categoryName: '店铺金额' },
        { key: 'payable_amount', name: '应付金额', defaultVisible: true, width: '120px', sortable: true, category: 'store', categoryName: '店铺金额' },
        { key: 'paid_amount', name: '已付金额', defaultVisible: true, width: '120px', sortable: true, category: 'store', categoryName: '店铺金额' },
        { key: 'operation_cost_supply_price', name: '运营成本供货价', defaultVisible: true, width: '150px', sortable: true, category: 'store', categoryName: '店铺金额' },
        
        // 物流信息
        { key: 'province', name: '省份', defaultVisible: false, width: '80px', sortable: true, category: 'logistics', categoryName: '物流信息' },
        { key: 'city', name: '城市', defaultVisible: false, width: '80px', sortable: true, category: 'logistics', categoryName: '物流信息' },
        { key: 'district', name: '区县', defaultVisible: false, width: '80px', sortable: true, category: 'logistics', categoryName: '物流信息' },
        { key: 'express_company', name: '快递公司', defaultVisible: false, width: '120px', sortable: true, category: 'logistics', categoryName: '物流信息' },
        { key: 'tracking_number', name: '快递单号', defaultVisible: false, width: '150px', sortable: true, category: 'logistics', categoryName: '物流信息' },
        { key: 'payment_number', name: '支付单号', defaultVisible: false, width: '150px', sortable: true, category: 'logistics', categoryName: '物流信息' }
    ]
};

// 导出配置对象
window.AppConfig = AppConfig;

// 获取场景对应的徽章样式类的辅助函数
window.getSceneBadgeClass = function(sceneName) {
    return AppConfig.SCENE_STYLES[sceneName] || 'bg-dark';
}; 