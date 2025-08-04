from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    """用户模型"""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')  # user 或 admin
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        """设置密码哈希"""
        self.password_hash = generate_password_hash(password, method='scrypt')

    def check_password(self, password):
        """验证密码"""
        try:
            return check_password_hash(self.password_hash, password)
        except (TypeError, ValueError):
            # 处理旧的或损坏的密码哈希格式
            # 如果密码验证失败，尝试重新设置密码（仅用于调试，生产环境应该删除）
            return False

class ProductData(db.Model):
    """产品数据模型 - 完全匹配SQL表结构"""
    __tablename__ = 'product_data'
    
    id = db.Column(db.Integer, primary_key=True)
    platform = db.Column(db.String(50), nullable=False)
    product_name = db.Column(db.Text)
    tmall_product_code = db.Column(db.String(100))
    tmall_supplier_name = db.Column(db.String(200), comment='店铺名')
    visitor_count = db.Column(db.Integer)
    page_views = db.Column(db.Integer)
    search_guided_visitors = db.Column(db.Integer)
    add_to_cart_count = db.Column(db.Integer)
    favorite_count = db.Column(db.Integer)
    payment_amount = db.Column(db.Float)
    payment_product_count = db.Column(db.Integer)
    payment_buyer_count = db.Column(db.Integer)
    search_guided_payment_buyers = db.Column(db.Integer)
    unit_price = db.Column(db.Float)
    visitor_average_value = db.Column(db.Float)
    payment_conversion_rate = db.Column(db.Float)
    order_conversion_rate = db.Column(db.Float)
    avg_stay_time = db.Column(db.Float)
    detail_page_bounce_rate = db.Column(db.Float)
    order_payment_conversion_rate = db.Column(db.Float)
    search_payment_conversion_rate = db.Column(db.Float)
    refund_amount = db.Column(db.Float)
    refund_ratio = db.Column(db.Float)
    filename = db.Column(db.String(255), nullable=False)
    upload_date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'))

class ProductList(db.Model):
    """产品总表模型"""
    __tablename__ = 'product_list'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.String(100), nullable=False)  # 产品ID/链接ID
    product_name = db.Column(db.String(500), nullable=False)  # 商品名称
    listing_time = db.Column(db.Date)  # 上架时间
    tmall_supplier_id = db.Column(db.String(200))  # 天猫供销ID
    operator = db.Column(db.String(100))  # 操作人
    action_list = db.Column(db.JSON)  # 活动列表，存储活动名称和周期
    main_image_url = db.Column(db.Text)  # 链接主图网络地址
    network_disk_path = db.Column(db.Text)  # 网盘路径
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'))

class PlantingRecord(db.Model):
    """种菜表格登记模型"""
    __tablename__ = 'planting_records'
    
    id = db.Column(db.Integer, primary_key=True)
    staff_name = db.Column(db.String(100), nullable=False)  # 人员名称
    quantity = db.Column(db.Integer)  # 数量
    order_date = db.Column(db.Date)  # 订单日期
    wechat_id = db.Column(db.String(100))  # 微信号
    product_id = db.Column(db.String(100))  # 产品ID
    keyword = db.Column(db.String(200))  # 关键词
    wangwang_id = db.Column(db.String(100))  # 旺旺号
    order_wechat = db.Column(db.String(100))  # 做单微信
    order_number = db.Column(db.String(100))  # 订单号
    amount = db.Column(db.Float)  # 金额
    gift_commission = db.Column(db.Float)  # 赠送/佣金
    refund_status = db.Column(db.String(50))  # 返款状态
    refund_amount = db.Column(db.Float)  # 返款金额
    refund_wechat = db.Column(db.String(100))  # 返款微信
    refund_date = db.Column(db.Date)  # 返款日期
    store_name = db.Column(db.String(200))  # 店铺名称
    internal_order_number = db.Column(db.String(100))  # 内部订单号
    remarks = db.Column(db.Text)  # 备注
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'))

class ProductDataMerge(db.Model):
    """产品数据合并表模型"""
    __tablename__ = 'product_data_merge'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # 来自product_data的字段
    product_data_id = db.Column(db.Integer, db.ForeignKey('product_data.id'))
    platform = db.Column(db.String(50), nullable=False)
    product_name = db.Column(db.Text)
    tmall_product_code = db.Column(db.String(100))
    tmall_supplier_name = db.Column(db.String(200), comment='店铺名')
    visitor_count = db.Column(db.Integer)
    page_views = db.Column(db.Integer)
    search_guided_visitors = db.Column(db.Integer)
    add_to_cart_count = db.Column(db.Integer)
    favorite_count = db.Column(db.Integer)
    payment_amount = db.Column(db.Float)
    payment_product_count = db.Column(db.Integer)
    payment_buyer_count = db.Column(db.Integer)
    search_guided_payment_buyers = db.Column(db.Integer)
    unit_price = db.Column(db.Float)
    visitor_average_value = db.Column(db.Float)
    payment_conversion_rate = db.Column(db.Float)
    order_conversion_rate = db.Column(db.Float)
    avg_stay_time = db.Column(db.Float)
    detail_page_bounce_rate = db.Column(db.Float)
    order_payment_conversion_rate = db.Column(db.Float)
    search_payment_conversion_rate = db.Column(db.Float)
    refund_amount = db.Column(db.Float)
    refund_ratio = db.Column(db.Float)
    filename = db.Column(db.String(255), nullable=False)
    upload_date = db.Column(db.Date, nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    
    # 来自product_list的字段
    product_list_id = db.Column(db.Integer, db.ForeignKey('product_list.id'))
    product_list_name = db.Column(db.String(500))
    listing_time = db.Column(db.Date)
    product_list_tmall_supplier_id = db.Column(db.String(200))  # 天猫供销ID
    product_list_operator = db.Column(db.String(100))  # 操作人
    product_list_created_at = db.Column(db.DateTime)
    product_list_updated_at = db.Column(db.DateTime)
    product_list_uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    
    # 推广费用字段
    sitewide_promotion = db.Column(db.Float)  # 全站推广费用
    keyword_promotion = db.Column(db.Float)  # 关键词推广费用
    product_operation = db.Column(db.Float)  # 货品运营费用
    crowd_promotion = db.Column(db.Float)  # 人群推广费用
    super_short_video = db.Column(db.Float)  # 超级短视频费用
    multi_target_direct = db.Column(db.Float)  # 多目标直投费用
    promotion_summary_updated_at = db.Column(db.DateTime)  # 推广费用汇总更新时间
    
    # 种菜表格汇总字段
    planting_orders = db.Column(db.Integer)  # 匹配到的种菜订单数量
    planting_amount = db.Column(db.Float)  # 种菜订单总金额
    planting_cost = db.Column(db.Float)  # 种菜佣金总额
    planting_logistics_cost = db.Column(db.Float)  # 物流成本 (订单数 * 2.5)
    planting_deduction = db.Column(db.Float)  # 扣款金额 (总金额 * 0.08)
    planting_summary_updated_at = db.Column(db.DateTime)  # 种菜汇总更新时间
    
    # 转化率和业务指标字段
    conversion_rate = db.Column(db.Float)  # 支付转化率
    favorite_rate = db.Column(db.Float)  # 收藏率
    cart_rate = db.Column(db.Float)  # 加购率
    uv_value = db.Column(db.Float)  # UV价值
    real_conversion_rate = db.Column(db.Float)  # 真实转化率
    real_amount = db.Column(db.Float)  # 真实金额
    real_buyer_count = db.Column(db.Integer)  # 真实买家数
    real_product_count = db.Column(db.Integer)  # 真实件数
    product_cost = db.Column(db.Float)  # 产品成本
    real_order_deduction = db.Column(db.Float)  # 真实订单扣点
    tax_invoice = db.Column(db.Float)  # 税票
    real_order_logistics_cost = db.Column(db.Float)  # 真实订单物流成本
    gross_profit = db.Column(db.Float)  # 毛利

    # merge表的元数据
    is_matched = db.Column(db.Boolean, default=False)  # 是否成功匹配到product_list
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CompanyCostPricing(db.Model):
    """公司成本价格模型"""
    __tablename__ = 'company_cost_pricing'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # 产品基本信息
    brand_category = db.Column(db.String(200), comment='适配品牌分类')
    product_code = db.Column(db.String(100), nullable=False, comment='商品编码')
    product_name = db.Column(db.String(500), comment='产品名称')
    
    # 价格信息
    actual_supply_price = db.Column(db.Numeric(10, 2), comment='实际供货价')
    supplier = db.Column(db.String(200), comment='供应商')
    
    # 元数据
    filename = db.Column(db.String(255), nullable=False, comment='源文件名')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'))

class OperationCostPricing(db.Model):
    """运营成本价格模型"""
    __tablename__ = 'operation_cost_pricing'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # 产品基本信息
    brand_category = db.Column(db.String(200), comment='适配品牌分类')
    product_code = db.Column(db.String(100), nullable=False, comment='商品编码')
    product_name = db.Column(db.String(500), comment='产品名称')
    
    # 价格信息
    supply_price = db.Column(db.Numeric(10, 2), comment='供货价')
    operation_staff = db.Column(db.String(100), comment='运营人员')
    
    # 元数据
    filename = db.Column(db.String(255), nullable=False, comment='源文件名')
    tab_name = db.Column(db.String(100), comment='来源Tab名称')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'))

class OrderDetails(db.Model):
    """订单详情模型"""
    __tablename__ = 'order_details'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # 订单基本信息
    internal_order_number = db.Column(db.String(100), comment='内部订单号')
    online_order_number = db.Column(db.String(100), comment='线上订单号')
    store_code = db.Column(db.String(50), comment='店铺编号')
    store_name = db.Column(db.String(200), comment='店铺名称')
    order_time = db.Column(db.DateTime, comment='下单时间')
    payment_date = db.Column(db.Date, comment='付款日期')
    shipping_date = db.Column(db.Date, comment='发货日期')
    
    # 金额信息
    payable_amount = db.Column(db.Numeric(10, 2), comment='应付金额')
    paid_amount = db.Column(db.Numeric(10, 2), comment='已付金额')
    
    # 物流信息
    express_company = db.Column(db.String(100), comment='快递公司')
    tracking_number = db.Column(db.String(100), comment='快递单号')
    province = db.Column(db.String(50), comment='省份')
    city = db.Column(db.String(50), comment='城市')
    district = db.Column(db.String(50), comment='区县')
    
    # 商品信息
    product_code = db.Column(db.String(100), comment='商品编码')
    product_name = db.Column(db.String(500), comment='商品名称')
    quantity = db.Column(db.Integer, comment='数量')
    unit_price = db.Column(db.Numeric(10, 2), comment='商品单价')
    product_amount = db.Column(db.Numeric(10, 2), comment='商品金额')
    
    # 其他信息
    payment_number = db.Column(db.String(100), comment='支付单号')
    image_url = db.Column(db.Text, comment='图片地址')
    store_style_code = db.Column(db.String(100), comment='店铺款式编码')
    order_status = db.Column(db.String(50), comment='子订单状态')
    
    # 元数据
    filename = db.Column(db.String(255), nullable=False, comment='源文件名')
    upload_date = db.Column(db.Date, nullable=False, comment='上传日期')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'))

class SubjectReport(db.Model):
    """主体报表模型"""
    __tablename__ = 'subject_report'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # 基础信息
    platform = db.Column(db.String(50), nullable=False, default='天猫苏宁')
    report_date = db.Column(db.Date, nullable=False)
    
    # CSV实际字段映射
    date_field = db.Column(db.Date)
    scene_id = db.Column(db.String(100))
    scene_name = db.Column(db.String(200))
    original_scene_id = db.Column(db.String(100))
    original_scene_name = db.Column(db.String(200))
    plan_id = db.Column(db.String(100))
    plan_name = db.Column(db.String(200))
    subject_id = db.Column(db.String(100))
    subject_type = db.Column(db.String(100))
    subject_name = db.Column(db.String(200))
    
    # 展现和点击数据
    impressions = db.Column(db.BigInteger)
    clicks = db.Column(db.BigInteger)
    cost = db.Column(db.Float)
    ctr = db.Column(db.Float)
    avg_cpc = db.Column(db.Float)
    cpm = db.Column(db.Float)
    
    # 预售成交数据
    total_presale_amount = db.Column(db.Float)
    total_presale_orders = db.Column(db.Integer)
    direct_presale_amount = db.Column(db.Float)
    direct_presale_orders = db.Column(db.Integer)
    indirect_presale_amount = db.Column(db.Float)
    indirect_presale_orders = db.Column(db.Integer)
    
    # 成交数据
    direct_transaction_amount = db.Column(db.Float)
    indirect_transaction_amount = db.Column(db.Float)
    total_transaction_amount = db.Column(db.Float)
    total_transaction_orders = db.Column(db.Integer)
    direct_transaction_orders = db.Column(db.Integer)
    indirect_transaction_orders = db.Column(db.Integer)
    
    # 转化和投入产出
    click_conversion_rate = db.Column(db.Float)
    roas = db.Column(db.Float)
    total_transaction_cost = db.Column(db.Float)
    
    # 购物车数据
    total_cart_count = db.Column(db.Integer)
    direct_cart_count = db.Column(db.Integer)
    indirect_cart_count = db.Column(db.Integer)
    cart_rate = db.Column(db.Float)
    
    # 收藏数据
    favorite_product_count = db.Column(db.Integer)
    favorite_shop_count = db.Column(db.Integer)
    shop_favorite_cost = db.Column(db.Float)
    total_favorite_cart_count = db.Column(db.Integer)
    total_favorite_cart_cost = db.Column(db.Float)
    product_favorite_cart_count = db.Column(db.Integer)
    product_favorite_cart_cost = db.Column(db.Float)
    total_favorite_count = db.Column(db.Integer)
    product_favorite_cost = db.Column(db.Float)
    product_favorite_rate = db.Column(db.Float)
    cart_cost = db.Column(db.Float)
    
    # 订单数据
    placed_order_count = db.Column(db.Integer)
    placed_order_amount = db.Column(db.Float)
    direct_favorite_product_count = db.Column(db.Integer)
    indirect_favorite_product_count = db.Column(db.Integer)
    
    # 优惠券和充值
    coupon_claim_count = db.Column(db.Integer)
    shopping_gold_recharge_count = db.Column(db.Integer)
    shopping_gold_recharge_amount = db.Column(db.Float)
    
    # 咨询和访问数据
    wangwang_consultation_count = db.Column(db.Integer)
    guided_visit_count = db.Column(db.Integer)
    guided_visitor_count = db.Column(db.Integer)
    guided_potential_customer_count = db.Column(db.Integer)
    guided_potential_customer_rate = db.Column(db.Float)
    membership_rate = db.Column(db.Float)
    membership_count = db.Column(db.Integer)
    guided_visit_rate = db.Column(db.Float)
    deep_visit_count = db.Column(db.Integer)
    avg_visit_pages = db.Column(db.Float)
    
    # 客户数据
    new_customer_count = db.Column(db.Integer)
    new_customer_rate = db.Column(db.Float)
    member_first_purchase_count = db.Column(db.Integer)
    member_transaction_amount = db.Column(db.Float)
    member_transaction_orders = db.Column(db.Integer)
    transaction_customer_count = db.Column(db.Integer)
    avg_orders_per_customer = db.Column(db.Float)
    avg_amount_per_customer = db.Column(db.Float)
    
    # 自然流量数据
    natural_traffic_amount = db.Column(db.Float)
    natural_traffic_impressions = db.Column(db.BigInteger)
    
    # 平台助推数据
    platform_boost_total_transaction = db.Column(db.Float)
    platform_boost_direct_transaction = db.Column(db.Float)
    platform_boost_clicks = db.Column(db.Integer)
    
    # 优惠券撬动数据
    product_coupon_discount_amount = db.Column(db.Float)
    product_coupon_total_transaction = db.Column(db.Float)
    product_coupon_direct_transaction = db.Column(db.Float)
    product_coupon_clicks = db.Column(db.Integer)
    
    # 元数据
    filename = db.Column(db.String(255), nullable=False)
    upload_date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'))

class OrderDetailsMerge(db.Model):
    """订单详情合并表模型"""
    __tablename__ = 'order_details_merge'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # ================================
    # 来自order_details表的字段
    # ================================
    order_details_id = db.Column(db.Integer, db.ForeignKey('order_details.id'), comment='订单详情表ID')
    
    # 订单基本信息
    internal_order_number = db.Column(db.String(100), comment='内部订单号')
    online_order_number = db.Column(db.String(100), comment='线上订单号')
    store_code = db.Column(db.String(50), comment='店铺编号')
    store_name = db.Column(db.String(200), comment='店铺名称')
    order_time = db.Column(db.DateTime, comment='下单时间')
    payment_date = db.Column(db.Date, comment='付款日期')
    shipping_date = db.Column(db.Date, comment='发货日期')
    
    # 金额信息
    payable_amount = db.Column(db.Numeric(10, 2), comment='应付金额')
    paid_amount = db.Column(db.Numeric(10, 2), comment='已付金额')
    
    # 物流信息
    express_company = db.Column(db.String(100), comment='快递公司')
    tracking_number = db.Column(db.String(100), comment='快递单号')
    province = db.Column(db.String(50), comment='省份')
    city = db.Column(db.String(50), comment='城市')
    district = db.Column(db.String(50), comment='区县')
    
    # 商品信息
    product_code = db.Column(db.String(100), comment='商品编码')
    product_name = db.Column(db.String(500), comment='商品名称')
    quantity = db.Column(db.Integer, comment='数量')
    unit_price = db.Column(db.Numeric(10, 2), comment='商品单价')
    product_amount = db.Column(db.Numeric(10, 2), comment='商品金额')
    
    # 其他信息
    payment_number = db.Column(db.String(100), comment='支付单号')
    image_url = db.Column(db.Text, comment='图片地址')
    store_style_code = db.Column(db.String(100), comment='店铺款式编码')
    order_status = db.Column(db.String(50), comment='子订单状态')
    
    # 订单详情元数据
    order_details_filename = db.Column(db.String(255), comment='订单详情源文件名')
    upload_date = db.Column(db.Date, comment='上传日期')
    order_details_uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'), comment='订单详情上传用户ID')
    order_details_created_at = db.Column(db.DateTime, comment='订单详情创建时间')
    order_details_updated_at = db.Column(db.DateTime, comment='订单详情更新时间')
    
    # ================================
    # 来自product_list表的字段（带前缀）
    # ================================
    product_list_product_id = db.Column(db.String(100), comment='产品总表-产品ID')
    product_list_product_name = db.Column(db.String(500), comment='产品总表-产品名称')
    product_list_listing_time = db.Column(db.Date, comment='产品总表-上架时间')
    product_list_tmall_supplier_id = db.Column(db.String(200), comment='产品总表-天猫供销ID')
    product_list_operator = db.Column(db.String(100), comment='产品总表-操作人')
    
    # ================================
    # 来自operation_cost_pricing表的字段（带前缀）
    # ================================
    operation_cost_brand_category = db.Column(db.String(200), comment='运营成本-适配品牌分类')
    operation_cost_product_code = db.Column(db.String(100), comment='运营成本-商品编码')
    operation_cost_product_name = db.Column(db.String(500), comment='运营成本-产品名称')
    operation_cost_supply_price = db.Column(db.Numeric(10, 2), comment='运营成本-供货价')
    operation_cost_operation_staff = db.Column(db.String(100), comment='运营成本-运营人员')
    operation_cost_filename = db.Column(db.String(255), comment='运营成本-源文件名')
    
    # ================================
    # 业务计算字段（类似product_data_merge）
    # ================================
    
    # 基础业务指标
    order_conversion_rate = db.Column(db.Float, comment='订单转化率')
    order_profit_margin = db.Column(db.Float, comment='订单利润率')
    avg_order_value = db.Column(db.Float, comment='平均订单价值')
    
    # 成本计算字段
    product_cost = db.Column(db.Float, comment='产品成本 (数量 * 运营成本价格)')
    order_logistics_cost = db.Column(db.Float, comment='订单物流成本 (数量 * 2.5)')
    order_deduction = db.Column(db.Float, comment='订单扣点 (商品金额 * 0.08)')
    tax_invoice = db.Column(db.Float, comment='税票 (商品金额 * 0.13)')
    
    # 利润计算字段
    gross_profit = db.Column(db.Float, comment='毛利 (商品金额 - 产品成本 - 各项费用)')
    net_profit = db.Column(db.Float, comment='净利润')
    profit_per_unit = db.Column(db.Float, comment='单件利润')
    
    # 汇总更新时间戳
    cost_summary_updated_at = db.Column(db.DateTime, comment='成本汇总更新时间')
    profit_summary_updated_at = db.Column(db.DateTime, comment='利润汇总更新时间')
    
    # ================================
    # 匹配状态字段
    # ================================
    is_product_list_matched = db.Column(db.Boolean, default=False, comment='是否成功匹配到product_list')
    is_operation_cost_matched = db.Column(db.Boolean, default=False, comment='是否成功匹配到operation_cost_pricing')
    
    # ================================
    # 元数据字段
    # ================================
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AlipayAmount(db.Model):
    """支付宝金额表模型"""
    __tablename__ = 'alipay_amount'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # 支付宝数据字段
    transaction_date = db.Column(db.Date, nullable=False, comment='发生时间（仅日期部分）')
    income_amount = db.Column(db.Numeric(10, 2), comment='收入金额（+元）')
    expense_amount = db.Column(db.Numeric(10, 2), comment='支出金额（-元）')
    order_number = db.Column(db.String(100), comment='从备注中提取的订单号')
    raw_remark = db.Column(db.Text, comment='原始备注内容')
    
    # 元数据
    filename = db.Column(db.String(255), nullable=False, comment='源文件名')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'))