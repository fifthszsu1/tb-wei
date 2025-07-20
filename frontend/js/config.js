// 应用配置模块
const AppConfig = {
    // API配置
    API_BASE: window.location.port === '80' || window.location.port === '' ? '/api' : 'http://localhost:5000/api',
    
    // 本地存储键名
    STORAGE_KEYS: {
        TOKEN: 'token',
        VISIBLE_COLUMNS: 'visibleColumns',
        COLUMN_WIDTHS: 'columnWidths'
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
        // 基础信息
        { key: 'upload_date', name: '日期', defaultVisible: true, width: '100px' },
        { key: 'tmall_product_code', name: '天猫ID', defaultVisible: true, width: '120px' },
        { key: 'product_name', name: '产品', defaultVisible: true, width: '200px' },
        { key: 'listing_time', name: '上架时间', defaultVisible: true, width: '100px' },
        
        // 订单和支付数据
        { key: 'payment_buyer_count', name: '前台订单笔数', defaultVisible: true, width: '120px' },
        { key: 'payment_product_count', name: '支付件数', defaultVisible: true, width: '100px' },
        { key: 'payment_amount', name: '前台成交金额', defaultVisible: true, width: '120px' },
        { key: 'refund_amount', name: '退款金额', defaultVisible: true, width: '100px' },
        
        // 流量和行为数据
        { key: 'visitor_count', name: '访客数', defaultVisible: true, width: '100px' },
        { key: 'search_guided_visitors', name: '自然搜索', defaultVisible: true, width: '100px' },
        { key: 'favorite_count', name: '收藏', defaultVisible: true, width: '80px' },
        { key: 'add_to_cart_count', name: '加购', defaultVisible: true, width: '80px' },
        
        // 转化率指标
        { key: 'conversion_rate', name: '支付转化率', defaultVisible: true, width: '100px' },
        { key: 'favorite_rate', name: '收藏率', defaultVisible: true, width: '100px' },
        { key: 'cart_rate', name: '加购率', defaultVisible: true, width: '100px' },
        { key: 'uv_value', name: 'UV价值', defaultVisible: true, width: '100px' },
        { key: 'real_conversion_rate', name: '真实转化率', defaultVisible: true, width: '100px' },
        
        // 真实数据
        { key: 'real_amount', name: '真实金额', defaultVisible: true, width: '100px' },
        { key: 'real_buyer_count', name: '真实买家数', defaultVisible: true, width: '100px' },
        { key: 'real_product_count', name: '真实件数', defaultVisible: true, width: '100px' },
        
        // 成本和费用
        { key: 'product_cost', name: '产品成本', defaultVisible: true, width: '100px' },
        { key: 'real_order_deduction', name: '真实订单扣点', defaultVisible: true, width: '120px' },
        { key: 'tax_invoice', name: '税票', defaultVisible: true, width: '100px' },
        { key: 'real_order_logistics_cost', name: '真实订单物流成本', defaultVisible: true, width: '140px' },
        
        // 种菜数据
        { key: 'planting_orders', name: '种菜笔数', defaultVisible: true, width: '100px' },
        { key: 'planting_amount', name: '种菜金额', defaultVisible: true, width: '100px' },
        { key: 'planting_cost', name: '种菜成本', defaultVisible: true, width: '100px' },
        { key: 'planting_deduction', name: '种菜扣点', defaultVisible: true, width: '100px' },
        { key: 'planting_logistics_cost', name: '种菜物流成本', defaultVisible: true, width: '120px' },
        
        // 推广费用
        { key: 'keyword_promotion', name: '关键词推广', defaultVisible: true, width: '100px' },
        { key: 'sitewide_promotion', name: '全站推广', defaultVisible: true, width: '100px' },
        { key: 'product_operation', name: '货品运营', defaultVisible: true, width: '100px' },
        { key: 'crowd_promotion', name: '人群推广', defaultVisible: true, width: '100px' },
        { key: 'super_short_video', name: '超级短视频', defaultVisible: true, width: '100px' },
        { key: 'multi_target_direct', name: '多目标直投', defaultVisible: true, width: '100px' },
        
        // 毛利
        { key: 'gross_profit', name: '毛利', defaultVisible: true, width: '100px' }
    ]
};

// 导出配置对象
window.AppConfig = AppConfig; 