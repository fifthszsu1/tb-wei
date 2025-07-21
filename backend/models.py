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
    """产品数据模型 - 匹配实际数据库表结构"""
    __tablename__ = 'product_data'
    
    id = db.Column(db.Integer, primary_key=True)
    platform = db.Column(db.String(50), nullable=False)
    
    # 基础字段
    product_code = db.Column(db.String(100))  # 产品编码
    product_name = db.Column(db.Text)  # 商品名称
    store_code = db.Column(db.String(100))  # 店铺编码
    store_name = db.Column(db.String(200))  # 店铺名称
    brand = db.Column(db.String(100))  # 品牌
    
    # 分类字段
    category_1 = db.Column(db.String(100))  # 一级分类
    category_2 = db.Column(db.String(100))  # 二级分类
    category_3 = db.Column(db.String(100))  # 三级分类
    category_4 = db.Column(db.String(100))  # 四级分类
    
    # 价格和销量
    unit_price = db.Column(db.Numeric(10, 2))  # 客单价
    sales_volume = db.Column(db.Integer)  # 销量
    product_sales_count = db.Column(db.Integer)  # 商品销售数量
    order_count = db.Column(db.Integer)  # 订单数
    
    # 用户行为字段
    favorite_count = db.Column(db.Integer)  # 收藏人数
    payment_count = db.Column(db.Integer)  # 支付人数
    
    # 转化率相关
    payment_conversion_rate = db.Column(db.Numeric(5, 4))  # 支付转化率
    click_conversion_rate = db.Column(db.Numeric(5, 4))  # 点击转化率
    new_payment_conversion = db.Column(db.Numeric(5, 4))  # 新客支付转化率
    total_payment_conversion = db.Column(db.Numeric(5, 4))  # 总支付转化率
    
    # 页面行为指标
    avg_stay_time = db.Column(db.Numeric(8, 2))  # 平均停留时长
    page_views = db.Column(db.Integer)  # 浏览量
    traffic_ratio = db.Column(db.Numeric(5, 4))  # 流量占比
    
    # 元数据
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'))

class ProductList(db.Model):
    """产品总表模型"""
    __tablename__ = 'product_list'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.String(100), nullable=False)  # 产品ID/链接ID
    product_name = db.Column(db.String(500), nullable=False)  # 商品名称
    listing_time = db.Column(db.Date)  # 上架时间
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
    tmall_supplier_name = db.Column(db.String(200))
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