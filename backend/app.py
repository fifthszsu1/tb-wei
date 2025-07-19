from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import pandas as pd
import os
from datetime import datetime, timedelta
import chardet
import logging
from logging.handlers import RotatingFileHandler
import re
import io

app = Flask(__name__)

# 配置日志
handler = logging.StreamHandler()
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
app.logger.addHandler(handler)
app.logger.setLevel(logging.INFO)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'mysql+pymysql://root:password@localhost:3306/ecommerce_db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'jwt-secret-string'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['UPLOAD_FOLDER'] = 'uploads'

# 创建上传目录
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db = SQLAlchemy(app)
jwt = JWTManager(app)
# 配置CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost", "http://localhost:80"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
        "supports_credentials": True
    }
})

# 用户模型
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')  # user 或 admin
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='scrypt')

    def check_password(self, password):
        try:
            return check_password_hash(self.password_hash, password)
        except TypeError:
            # 处理旧的或损坏的密码哈希格式
            return False

# ProductData模型
class ProductData(db.Model):
    __tablename__ = 'product_data'
    
    id = db.Column(db.Integer, primary_key=True)
    platform = db.Column(db.String(50), nullable=False)
    
    # 基础字段
    product_name = db.Column(db.Text)  # 商品名称
    tmall_product_code = db.Column(db.String(100))  # 天猫商品编码
    tmall_supplier_name = db.Column(db.String(200))  # 天猫供应商名称
    
    # 流量相关字段
    visitor_count = db.Column(db.Integer)  # 访客数
    page_views = db.Column(db.Integer)  # 浏览量
    search_guided_visitors = db.Column(db.Integer)  # 搜索商品引导访客数
    
    # 用户行为字段
    add_to_cart_count = db.Column(db.Integer)  # 加购件数
    favorite_count = db.Column(db.Integer)  # 收藏人数
    
    # 支付相关字段
    payment_amount = db.Column(db.Float)  # 支付金额
    payment_product_count = db.Column(db.Integer)  # 支付商品件数
    payment_buyer_count = db.Column(db.Integer)  # 支付买家数
    search_guided_payment_buyers = db.Column(db.Integer)  # 搜索引导支付买家数
    
    # 价值和转化指标
    unit_price = db.Column(db.Float)  # 客单价
    visitor_average_value = db.Column(db.Float)  # 访客平均价值
    payment_conversion_rate = db.Column(db.Float)  # 支付转化率
    order_conversion_rate = db.Column(db.Float)  # 下单转化率
    
    # 页面行为指标
    avg_stay_time = db.Column(db.Float)  # 平均停留时长
    detail_page_bounce_rate = db.Column(db.Float)  # 详情页跳出率
    order_payment_conversion_rate = db.Column(db.Float)  # 下单支付转化率
    search_payment_conversion_rate = db.Column(db.Float)  # 搜索支付转化率
    
    # 退款相关字段
    refund_amount = db.Column(db.Float)  # 退款金额
    refund_ratio = db.Column(db.Float)  # 退款占比
    
    # 元数据
    filename = db.Column(db.String(255), nullable=False)
    upload_date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'))

# 产品总表模型
class ProductList(db.Model):
    __tablename__ = 'product_list'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.String(100), nullable=False)  # 产品ID/链接ID
    product_name = db.Column(db.String(500), nullable=False)  # 商品名称
    listing_time = db.Column(db.Date)  # 上架时间
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'))

# 种菜表格登记模型
class PlantingRecord(db.Model):
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

# 产品数据合并表模型
class ProductDataMerge(db.Model):
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

# 主体报表模型
class SubjectReport(db.Model):
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

# 用户注册
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': '用户名已存在'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': '邮箱已存在'}), 400
    
    user = User(
        username=data['username'],
        email=data['email'],
        role=data.get('role', 'user')
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': '注册成功'}), 201

# 用户登录
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).first()
    
    if user and user.check_password(data['password']):
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={'role': user.role}
        )
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role
            }
        })
    
    return jsonify({'message': '用户名或密码错误'}), 401

# 获取用户信息
@app.route('/api/user', methods=['GET'])
@jwt_required()
def get_user():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role
    })

# 检查文件是否已上传
@app.route('/api/check-file', methods=['POST'])
@jwt_required()
def check_file_exists():
    data = request.get_json()
    filename = data.get('filename')
    upload_date = data.get('upload_date')
    
    if not filename or not upload_date:
        return jsonify({'message': '缺少文件名或日期'}), 400
    
    # 转换日期格式
    try:
        upload_date = datetime.strptime(upload_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': '日期格式错误'}), 400
    
    # 检查是否已存在
    existing = ProductData.query.filter_by(
        filename=filename,
        upload_date=upload_date
    ).first()
    
    return jsonify({'exists': existing is not None})

# 文件上传
@app.route('/api/upload', methods=['POST'])
@jwt_required()
def upload_file():
    if 'file' not in request.files:
        return jsonify({'message': '没有文件'}), 400
    
    file = request.files['file']
    platform = request.form.get('platform', '未知')
    upload_date = request.form.get('upload_date')
    force_overwrite = request.form.get('force_overwrite', 'false').lower() == 'true'
    
    if file.filename == '':
        return jsonify({'message': '没有选择文件'}), 400
    
    if not upload_date:
        return jsonify({'message': '请选择日期'}), 400
    
    # 转换日期格式
    try:
        upload_date = datetime.strptime(upload_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': '日期格式错误'}), 400
    
    if file and file.filename.endswith(('.xlsx', '.xls', '.csv')):
        filename = secure_filename(file.filename)
        
        # 检查是否已存在相同文件名和日期的记录
        existing_records = ProductData.query.filter_by(
            filename=filename,
            upload_date=upload_date
        ).all()
        
        if existing_records and not force_overwrite:
            return jsonify({
                'message': '文件已存在',
                'requires_confirmation': True,
                'existing_count': len(existing_records)
            }), 409
        
        # 如果强制覆盖，删除现有记录
        if existing_records and force_overwrite:
            for record in existing_records:
                db.session.delete(record)
            db.session.commit()
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # 处理文件
        try:
            success_count = process_uploaded_file(filepath, platform, int(get_jwt_identity()), filename, upload_date)
            os.remove(filepath)  # 删除临时文件
            
            message = f'文件上传成功，处理了 {success_count} 条数据'
            if existing_records and force_overwrite:
                message += f'，已替换之前的 {len(existing_records)} 条记录'
            
            return jsonify({
                'message': message,
                'count': success_count
            }), 200
        except Exception as e:
            return jsonify({'message': f'文件处理失败: {str(e)}'}), 500
    
    return jsonify({'message': '不支持的文件格式'}), 400

def process_uploaded_file(filepath, platform, user_id, filename, upload_date):
    """处理上传的文件"""
    try:
        # 尝试读取Excel文件
        if filepath.endswith('.csv'):
            # 检测文件编码，尝试多种编码
            encodings_to_try = ['utf-8', 'gbk', 'gb2312', 'utf-8-sig', 'latin-1']
            
            # 先尝试自动检测
            with open(filepath, 'rb') as f:
                raw_data = f.read()
                detected = chardet.detect(raw_data)
                if detected['encoding']:
                    encodings_to_try.insert(0, detected['encoding'])
            
            df = None
            for encoding in encodings_to_try:
                try:
                    df = pd.read_csv(filepath, encoding=encoding)
                    print(f"成功使用编码 {encoding} 读取CSV文件")
                    break
                except Exception as e:
                    print(f"编码 {encoding} 失败: {e}")
                    continue
            
            if df is None:
                raise Exception("无法读取CSV文件，尝试了多种编码都失败")
        else:
            df = pd.read_excel(filepath)
        
        success_count = 0
        
        # 根据平台映射字段
        field_mapping = get_field_mapping(platform)
        
        # 特殊处理苏宁CSV文件的列索引
        use_column_index = platform == '苏宁' and filepath.endswith('.csv')
        
        for _, row in df.iterrows():
            try:
                # 根据是否使用列索引来获取数据
                if use_column_index:
                    product_name = safe_get_value_by_index(row, 0)  # 第1列：商品名称
                    tmall_product_code = clean_product_code_by_index(row, 2)  # 第3列：商品编码
                    tmall_supplier_name = safe_get_value_by_index(row, 5)  # 第6列：供应商名称
                    # 对于苏宁CSV文件，使用列索引获取数值字段
                    visitor_count = safe_get_int_by_index(row, 14)  # 访客数
                    page_views = safe_get_int_by_index(row, 15)  # 浏览量
                    search_guided_visitors = safe_get_int_by_index(row, 16)  # 搜索引导访客数
                    add_to_cart_count = safe_get_int_by_index(row, 17)  # 加购件数
                    favorite_count = safe_get_int_by_index(row, 18)  # 收藏人数
                    payment_amount = safe_get_float_by_index(row, 19)  # 支付金额
                    payment_product_count = safe_get_int_by_index(row, 20)  # 支付商品件数
                    payment_buyer_count = safe_get_int_by_index(row, 21)  # 支付买家数
                    search_guided_payment_buyers = safe_get_int_by_index(row, 22)  # 搜索引导支付买家数
                    unit_price = safe_get_float_by_index(row, 23)  # 客单价
                    visitor_average_value = safe_get_float_by_index(row, 24)  # 访客平均价值
                    payment_conversion_rate = safe_get_float_by_index(row, 25)  # 支付转化率
                    order_conversion_rate = safe_get_float_by_index(row, 26)  # 下单转化率
                    avg_stay_time = safe_get_float_by_index(row, 27)  # 平均停留时长
                    detail_page_bounce_rate = safe_get_float_by_index(row, 28)  # 详情页跳出率
                    order_payment_conversion_rate = safe_get_float_by_index(row, 29)  # 下单支付转化率
                    search_payment_conversion_rate = safe_get_float_by_index(row, 30)  # 搜索支付转化率
                    refund_amount = safe_get_float_by_index(row, 31)  # 退款金额
                    refund_ratio = safe_get_float_by_index(row, 32)  # 退款占比
                else:
                    product_name = safe_get_value(row, field_mapping.get('product_name'))
                    tmall_product_code = clean_product_code(row, field_mapping.get('tmall_product_code'))
                    tmall_supplier_name = safe_get_value(row, field_mapping.get('tmall_supplier_name'))
                    visitor_count = safe_get_int(row, field_mapping.get('visitor_count'))
                    page_views = safe_get_int(row, field_mapping.get('page_views'))
                    search_guided_visitors = safe_get_int(row, field_mapping.get('search_guided_visitors'))
                    add_to_cart_count = safe_get_int(row, field_mapping.get('add_to_cart_count'))
                    favorite_count = safe_get_int(row, field_mapping.get('favorite_count'))
                    payment_amount = safe_get_float(row, field_mapping.get('payment_amount'))
                    payment_product_count = safe_get_int(row, field_mapping.get('payment_product_count'))
                    payment_buyer_count = safe_get_int(row, field_mapping.get('payment_buyer_count'))
                    search_guided_payment_buyers = safe_get_int(row, field_mapping.get('search_guided_payment_buyers'))
                    unit_price = safe_get_float(row, field_mapping.get('unit_price'))
                    visitor_average_value = safe_get_float(row, field_mapping.get('visitor_average_value'))
                    payment_conversion_rate = safe_get_float(row, field_mapping.get('payment_conversion_rate'))
                    order_conversion_rate = safe_get_float(row, field_mapping.get('order_conversion_rate'))
                    avg_stay_time = safe_get_float(row, field_mapping.get('avg_stay_time'))
                    detail_page_bounce_rate = safe_get_float(row, field_mapping.get('detail_page_bounce_rate'))
                    order_payment_conversion_rate = safe_get_float(row, field_mapping.get('order_payment_conversion_rate'))
                    search_payment_conversion_rate = safe_get_float(row, field_mapping.get('search_payment_conversion_rate'))
                    refund_amount = safe_get_float(row, field_mapping.get('refund_amount'))
                    refund_ratio = safe_get_float(row, field_mapping.get('refund_ratio'))
                
                product_data = ProductData(
                    platform=platform,
                    product_name=product_name,
                    tmall_product_code=tmall_product_code,
                    tmall_supplier_name=tmall_supplier_name,
                    visitor_count=visitor_count,
                    page_views=page_views,
                    search_guided_visitors=search_guided_visitors,
                    add_to_cart_count=add_to_cart_count,
                    favorite_count=favorite_count,
                    payment_amount=payment_amount,
                    payment_product_count=payment_product_count,
                    payment_buyer_count=payment_buyer_count,
                    search_guided_payment_buyers=search_guided_payment_buyers,
                    unit_price=unit_price,
                    visitor_average_value=visitor_average_value,
                    payment_conversion_rate=payment_conversion_rate,
                    order_conversion_rate=order_conversion_rate,
                    avg_stay_time=avg_stay_time,
                    detail_page_bounce_rate=detail_page_bounce_rate,
                    order_payment_conversion_rate=order_payment_conversion_rate,
                    search_payment_conversion_rate=search_payment_conversion_rate,
                    refund_amount=refund_amount,
                    refund_ratio=refund_ratio,
                    filename=filename,
                    upload_date=upload_date,
                    uploaded_by=user_id
                )
                
                db.session.add(product_data)
                success_count += 1
                
            except Exception as e:
                print(f"处理行数据时出错: {e}")
                continue
        
        db.session.commit()
        
        # 处理merge表数据
        try:
            merge_count = process_product_data_merge(upload_date, user_id)
            print(f"Merge处理完成，处理了 {merge_count} 条数据")
        except Exception as e:
            print(f"Merge处理出错: {e}")
            # merge处理失败不影响主流程
        
        return success_count
        
    except Exception as e:
        db.session.rollback()
        raise e

def process_product_data_merge(upload_date, user_id):
    """处理产品数据合并表"""
    try:
        # 1. 删除同一天的merge数据（如果存在）
        existing_merge_records = ProductDataMerge.query.filter_by(upload_date=upload_date).all()
        if existing_merge_records:
            for record in existing_merge_records:
                db.session.delete(record)
            print(f"删除了 {len(existing_merge_records)} 条同一天的merge数据")
        
        # 2. 获取当天的product_data数据
        product_data_records = ProductData.query.filter_by(upload_date=upload_date).all()
        
        if not product_data_records:
            print("没有找到当天的product_data数据")
            return 0
        
        merge_count = 0
        matched_count = 0
        
        # 3. 对每条product_data进行左连接处理
        for product_data in product_data_records:
            # 查找匹配的product_list记录
            product_list_record = None
            is_matched = False
            
            if product_data.tmall_product_code:
                product_list_record = ProductList.query.filter_by(
                    product_id=product_data.tmall_product_code
                ).first()
                
                if product_list_record:
                    is_matched = True
                    matched_count += 1
            
            # 创建merge记录
            merge_record = ProductDataMerge(
                # 来自product_data的字段
                product_data_id=product_data.id,
                platform=product_data.platform,
                product_name=product_data.product_name,
                tmall_product_code=product_data.tmall_product_code,
                tmall_supplier_name=product_data.tmall_supplier_name,
                visitor_count=product_data.visitor_count,
                page_views=product_data.page_views,
                search_guided_visitors=product_data.search_guided_visitors,
                add_to_cart_count=product_data.add_to_cart_count,
                favorite_count=product_data.favorite_count,
                payment_amount=product_data.payment_amount,
                payment_product_count=product_data.payment_product_count,
                payment_buyer_count=product_data.payment_buyer_count,
                search_guided_payment_buyers=product_data.search_guided_payment_buyers,
                unit_price=product_data.unit_price,
                visitor_average_value=product_data.visitor_average_value,
                payment_conversion_rate=product_data.payment_conversion_rate,
                order_conversion_rate=product_data.order_conversion_rate,
                avg_stay_time=product_data.avg_stay_time,
                detail_page_bounce_rate=product_data.detail_page_bounce_rate,
                order_payment_conversion_rate=product_data.order_payment_conversion_rate,
                search_payment_conversion_rate=product_data.search_payment_conversion_rate,
                refund_amount=product_data.refund_amount,
                refund_ratio=product_data.refund_ratio,
                filename=product_data.filename,
                upload_date=product_data.upload_date,
                uploaded_by=product_data.uploaded_by,
                
                # 来自product_list的字段（如果匹配的话）
                product_list_id=product_list_record.id if product_list_record else None,
                product_list_name=product_list_record.product_name if product_list_record else None,
                listing_time=product_list_record.listing_time if product_list_record else None,
                product_list_created_at=product_list_record.created_at if product_list_record else None,
                product_list_updated_at=product_list_record.updated_at if product_list_record else None,
                product_list_uploaded_by=product_list_record.uploaded_by if product_list_record else None,
                
                # 元数据
                is_matched=is_matched
            )
            
            db.session.add(merge_record)
            merge_count += 1
        
        db.session.commit()
        print(f"Merge处理完成: 总计 {merge_count} 条记录，匹配 {matched_count} 条")
        return merge_count
        
    except Exception as e:
        db.session.rollback()
        print(f"Merge处理失败: {e}")
        raise e

def get_field_mapping(platform):
    """根据平台获取字段映射"""
    mappings = {
        '苏宁': {
            'product_name': '商品名称',
            'tmall_product_code': '天猫商品编码',
            'tmall_supplier_name': '天猫供应商名称',
            'visitor_count': '访客数',
            'page_views': '浏览量',
            'search_guided_visitors': '搜索商品引导访客数',
            'add_to_cart_count': '加购件数',
            'favorite_count': '收藏人数',
            'payment_amount': '支付金额',
            'payment_product_count': '支付商品件数',
            'payment_buyer_count': '支付买家数',
            'search_guided_payment_buyers': '搜索引导支付买家数',
            'unit_price': '客单价',
            'visitor_average_value': '访客平均价值',
            'payment_conversion_rate': '支付转化率',
            'order_conversion_rate': '下单转化率',
            'avg_stay_time': '平均停留时长',
            'detail_page_bounce_rate': '详情页跳出率',
            'order_payment_conversion_rate': '下单支付转化率',
            'search_payment_conversion_rate': '搜索支付转化率',
            'refund_amount': '退款金额',
            'refund_ratio': '退款占比'
        },
        '淘宝': {
            'product_name': '商品标题',
            'tmall_product_code': '商品编号',
            'tmall_supplier_name': '店铺名称',
            'visitor_count': '访客数',
            'page_views': '浏览量',
            'search_guided_visitors': '搜索引导访客数',
            'add_to_cart_count': '加购件数',
            'favorite_count': '收藏人数',
            'payment_amount': '支付金额',
            'payment_product_count': '支付商品件数',
            'payment_buyer_count': '支付买家数',
            'search_guided_payment_buyers': '搜索引导支付买家数',
            'unit_price': '客单价',
            'visitor_average_value': '访客平均价值',
            'payment_conversion_rate': '转化率',
            'order_conversion_rate': '下单转化率',
            'avg_stay_time': '平均停留时长',
            'detail_page_bounce_rate': '详情页跳出率',
            'order_payment_conversion_rate': '下单支付转化率',
            'search_payment_conversion_rate': '搜索支付转化率',
            'refund_amount': '退款金额',
            'refund_ratio': '退款占比'
        },
        '拼多多': {
            'product_name': '商品名称',
            'tmall_product_code': '商品ID',
            'tmall_supplier_name': '店铺名称',
            'visitor_count': '访客数',
            'page_views': '浏览量',
            'search_guided_visitors': '搜索引导访客数',
            'add_to_cart_count': '加购件数',
            'favorite_count': '收藏人数',
            'payment_amount': '支付金额',
            'payment_product_count': '支付商品件数',
            'payment_buyer_count': '支付买家数',
            'search_guided_payment_buyers': '搜索引导支付买家数',
            'unit_price': '价格',
            'visitor_average_value': '访客平均价值',
            'payment_conversion_rate': '转化率',
            'order_conversion_rate': '下单转化率',
            'avg_stay_time': '平均停留时长',
            'detail_page_bounce_rate': '详情页跳出率',
            'order_payment_conversion_rate': '下单支付转化率',
            'search_payment_conversion_rate': '搜索支付转化率',
            'refund_amount': '退款金额',
            'refund_ratio': '退款占比'
        }
    }
    
    return mappings.get(platform, mappings['苏宁'])

def safe_get_value(row, field_name):
    """安全获取字符串值"""
    if field_name and field_name in row:
        value = row[field_name]
        return str(value) if pd.notna(value) else None
    return None

def clean_product_code(row, field_name):
    """清理商品编码，提取纯数字部分"""
    import re
    if field_name and field_name in row:
        value = row[field_name]
        if pd.notna(value):
            # 转换为字符串
            str_value = str(value)
            # 使用正则表达式提取所有数字
            numbers = re.findall(r'\d+', str_value)
            if numbers:
                # 返回最长的数字字符串（通常是商品编码）
                return max(numbers, key=len)
    return None

def safe_get_value_by_index(row, index):
    """通过列索引安全获取字符串值"""
    try:
        if index < len(row):
            value = row.iloc[index]
            return str(value) if pd.notna(value) else None
    except:
        pass
    return None

def clean_product_code_by_index(row, index):
    """通过列索引清理商品编码，提取纯数字部分"""
    import re
    try:
        if index < len(row):
            value = row.iloc[index]
            if pd.notna(value):
                # 转换为字符串
                str_value = str(value)
                # 使用正则表达式提取所有数字
                numbers = re.findall(r'\d+', str_value)
                if numbers:
                    # 返回最长的数字字符串（通常是商品编码）
                    return max(numbers, key=len)
    except:
        pass
    return None

def safe_get_int(row, field_name):
    """安全获取整数值"""
    if field_name and field_name in row:
        value = row[field_name]
        if pd.notna(value):
            try:
                return int(float(value))
            except:
                return None
    return None

def safe_get_float(row, field_name):
    """安全获取浮点数值"""
    if field_name and field_name in row:
        value = row[field_name]
        if pd.notna(value):
            try:
                # 处理百分比格式
                if isinstance(value, str) and '%' in value:
                    return float(value.replace('%', '')) / 100
                return float(value)
            except:
                return None
    return None

def safe_get_int_by_index(row, index):
    """通过列索引安全获取整数值"""
    try:
        if index < len(row):
            value = row.iloc[index]
            if pd.notna(value):
                return int(float(value))
    except:
        pass
    return None

def safe_get_float_by_index(row, index):
    """通过列索引安全获取浮点数值"""
    try:
        if index < len(row):
            value = row.iloc[index]
            if pd.notna(value):
                # 处理百分比格式
                if isinstance(value, str) and '%' in value:
                    return float(value.replace('%', '')) / 100
                return float(value)
    except:
        pass
    return None

def safe_get_date(row, field_name):
    """安全获取日期值"""
    if field_name and field_name in row:
        value = row[field_name]
        if pd.notna(value):
            try:
                # 如果是字符串，尝试解析多种日期格式
                if isinstance(value, str):
                    # 尝试常见的日期格式
                    date_formats = ['%Y-%m-%d', '%Y/%m/%d', '%Y年%m月%d日', '%m/%d/%Y', '%d/%m/%Y']
                    for fmt in date_formats:
                        try:
                            return datetime.strptime(value, fmt).date()
                        except:
                            continue
                # 如果是pandas的日期时间对象
                elif hasattr(value, 'date'):
                    return value.date()
                # 如果是日期对象
                elif hasattr(value, 'year'):
                    return value
                # 尝试转换为日期
                else:
                    return pd.to_datetime(value).date()
            except:
                return None
    return None

# 格式化数字，保留2位小数
def format_decimal(value):
    try:
        if value is None:
            return None
        return round(float(value), 2)
    except (TypeError, ValueError):
        return None

# 获取数据列表（仅管理员可访问）
@app.route('/api/data', methods=['GET'])
@jwt_required()
def get_data():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足'}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    upload_date = request.args.get('upload_date')
    tmall_product_code = request.args.get('tmall_product_code')
    product_name = request.args.get('product_name')
    
    query = ProductDataMerge.query
    
    if upload_date:
        query = query.filter(ProductDataMerge.upload_date == upload_date)
    
    if tmall_product_code:
        query = query.filter(ProductDataMerge.tmall_product_code.ilike(f'%{tmall_product_code}%'))
    
    if product_name:
        query = query.filter(ProductDataMerge.product_name.ilike(f'%{product_name}%'))
    
    # 按日期和ID倒序排列
    query = query.order_by(ProductDataMerge.upload_date.desc(), ProductDataMerge.id.desc())
    
    pagination = query.paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    data = []
    for item in pagination.items:
        # 直接使用数据库中存储的值
        real_amount = format_decimal(item.real_amount)
        conversion_rate = format_decimal(item.conversion_rate)
        favorite_rate = format_decimal(item.favorite_rate)
        cart_rate = format_decimal(item.cart_rate)
        uv_value = format_decimal(item.uv_value)
        real_conversion_rate = format_decimal(item.real_conversion_rate)
        product_cost = format_decimal(item.product_cost)
        real_order_deduction = format_decimal(item.real_order_deduction)
        tax_invoice = format_decimal(item.tax_invoice)
        real_order_logistics_cost = format_decimal(item.real_order_logistics_cost)
        gross_profit = format_decimal(item.gross_profit)
        
        data.append({
            'id': item.id,
            'upload_date': item.upload_date.isoformat() if item.upload_date else None,
            'tmall_product_code': item.tmall_product_code,
            'product_name': item.product_name,
            'listing_time': item.listing_time.isoformat() if item.listing_time else None,
            'payment_buyer_count': item.payment_buyer_count,
            'payment_product_count': item.payment_product_count,
            'payment_amount': format_decimal(item.payment_amount),
            'refund_amount': format_decimal(item.refund_amount),
            'visitor_count': item.visitor_count,
            'search_guided_visitors': item.search_guided_visitors,
            'favorite_count': item.favorite_count,
            'add_to_cart_count': item.add_to_cart_count,
            'conversion_rate': conversion_rate,
            'favorite_rate': favorite_rate,
            'cart_rate': cart_rate,
            'uv_value': uv_value,
            'real_conversion_rate': real_conversion_rate,
            'real_amount': real_amount,
            'real_buyer_count': item.payment_buyer_count,
            'real_product_count': item.payment_product_count,
            'product_cost': product_cost,
            'real_order_deduction': real_order_deduction,
            'tax_invoice': tax_invoice,
            'real_order_logistics_cost': real_order_logistics_cost,
            'planting_orders': format_decimal(item.planting_orders),
            'planting_amount': format_decimal(item.planting_amount),
            'planting_cost': format_decimal(item.planting_cost),
            'planting_deduction': format_decimal(item.planting_deduction),
            'planting_logistics_cost': format_decimal(item.planting_logistics_cost),
            'keyword_promotion': format_decimal(item.keyword_promotion),
            'sitewide_promotion': format_decimal(item.sitewide_promotion),
            'product_operation': format_decimal(item.product_operation),
            'crowd_promotion': format_decimal(item.crowd_promotion),
            'super_short_video': format_decimal(item.super_short_video),
            'multi_target_direct': format_decimal(item.multi_target_direct),
            'gross_profit': gross_profit
        })
    
    return jsonify({
        'data': data,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'per_page': pagination.per_page
    })

# 导出数据列表到Excel（仅管理员可访问）
@app.route('/api/export-data', methods=['GET'])
@jwt_required()
def export_data():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足'}), 403
    
    try:
        # 获取查询参数
        upload_date = request.args.get('upload_date')
        tmall_product_code = request.args.get('tmall_product_code')
        product_name = request.args.get('product_name')
        
        # 构建查询
        query = ProductDataMerge.query
        
        if upload_date:
            query = query.filter(ProductDataMerge.upload_date == upload_date)
        
        if tmall_product_code:
            query = query.filter(ProductDataMerge.tmall_product_code.like(f'%{tmall_product_code}%'))
        
        if product_name:
            query = query.filter(ProductDataMerge.product_name.like(f'%{product_name}%'))
        
        # 按上传日期倒序排列
        query = query.order_by(ProductDataMerge.upload_date.desc(), ProductDataMerge.id.desc())
        
        # 获取所有数据（不分页）
        items = query.all()
        
        # 准备数据
        export_data = []
        for item in items:
            # 直接使用数据库中存储的值
            real_amount = format_decimal(item.real_amount)
            conversion_rate = format_decimal(item.conversion_rate)
            favorite_rate = format_decimal(item.favorite_rate)
            cart_rate = format_decimal(item.cart_rate)
            uv_value = format_decimal(item.uv_value)
            real_conversion_rate = format_decimal(item.real_conversion_rate)
            product_cost = format_decimal(item.product_cost)
            real_order_deduction = format_decimal(item.real_order_deduction)
            tax_invoice = format_decimal(item.tax_invoice)
            real_order_logistics_cost = format_decimal(item.real_order_logistics_cost)
            gross_profit = format_decimal(item.gross_profit)
            
            export_data.append({
                'ID': item.id,
                '上传日期': item.upload_date.strftime('%Y-%m-%d') if item.upload_date else '',
                '天猫ID': item.tmall_product_code or '',
                '产品名称': item.product_name or '',
                '上架时间': item.listing_time.strftime('%Y-%m-%d') if item.listing_time else '',
                '支付买家数': item.payment_buyer_count or 0,
                '支付件数': item.payment_product_count or 0,
                '支付金额': format_decimal(item.payment_amount),
                '退款金额': format_decimal(item.refund_amount),
                '访客数': item.visitor_count or 0,
                '自然搜索访客': item.search_guided_visitors or 0,
                '收藏数': item.favorite_count or 0,
                '加购数': item.add_to_cart_count or 0,
                '转化率(%)': conversion_rate,
                '收藏率(%)': favorite_rate,
                '加购率(%)': cart_rate,
                'UV价值': uv_value,
                '真实转化率(%)': real_conversion_rate,
                '真实金额': real_amount,
                '真实买家数': item.payment_buyer_count or 0,
                '真实件数': item.payment_product_count or 0,
                '产品成本': product_cost,
                '真实订单扣点': real_order_deduction,
                '税票': tax_invoice,
                '真实订单物流成本': real_order_logistics_cost,
                '种菜订单数': format_decimal(item.planting_orders),
                '种菜金额': format_decimal(item.planting_amount),
                '种菜成本': format_decimal(item.planting_cost),
                '种菜扣款': format_decimal(item.planting_deduction),
                '种菜物流成本': format_decimal(item.planting_logistics_cost),
                '关键词推广': format_decimal(item.keyword_promotion),
                '全站推广': format_decimal(item.sitewide_promotion),
                '货品运营': format_decimal(item.product_operation),
                '人群推广': format_decimal(item.crowd_promotion),
                '超级短视频': format_decimal(item.super_short_video),
                '多目标直投': format_decimal(item.multi_target_direct),
                '毛利': gross_profit
            })
        
        # 创建DataFrame
        df = pd.DataFrame(export_data)
        
        # 创建Excel文件
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='数据列表', index=False)
        
        output.seek(0)
        
        # 生成文件名
        current_time = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'数据列表_{current_time}.xlsx'
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        app.logger.error(f'导出数据时出错: {str(e)}')
        return jsonify({'message': f'导出失败: {str(e)}'}), 500

# 获取merge数据列表（仅管理员可访问）
@app.route('/api/merge-data', methods=['GET'])
@jwt_required()
def get_merge_data():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足'}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    platform = request.args.get('platform')
    upload_date = request.args.get('upload_date')
    is_matched = request.args.get('is_matched')
    
    query = ProductDataMerge.query
    
    if platform:
        query = query.filter_by(platform=platform)
    
    if upload_date:
        query = query.filter_by(upload_date=upload_date)
    
    if is_matched is not None:
        query = query.filter_by(is_matched=is_matched.lower() == 'true')
    
    # 按创建时间倒序排列
    query = query.order_by(ProductDataMerge.created_at.desc())
    
    pagination = query.paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    data = []
    for item in pagination.items:
        data.append({
            'id': item.id,
            'product_data_id': item.product_data_id,
            'platform': item.platform,
            
            # 基础字段
            'product_name': item.product_name,
            'tmall_product_code': item.tmall_product_code,
            'tmall_supplier_name': item.tmall_supplier_name,
            
            # 流量相关字段
            'visitor_count': item.visitor_count,
            'page_views': item.page_views,
            'search_guided_visitors': item.search_guided_visitors,
            
            # 用户行为字段
            'add_to_cart_count': item.add_to_cart_count,
            'favorite_count': item.favorite_count,
            
            # 支付相关字段
            'payment_amount': item.payment_amount,
            'payment_product_count': item.payment_product_count,
            'payment_buyer_count': item.payment_buyer_count,
            'search_guided_payment_buyers': item.search_guided_payment_buyers,
            
            # 价值和转化指标
            'unit_price': item.unit_price,
            'visitor_average_value': item.visitor_average_value,
            'payment_conversion_rate': item.payment_conversion_rate,
            'order_conversion_rate': item.order_conversion_rate,
            
            # 页面行为指标
            'avg_stay_time': item.avg_stay_time,
            'detail_page_bounce_rate': item.detail_page_bounce_rate,
            'order_payment_conversion_rate': item.order_payment_conversion_rate,
            'search_payment_conversion_rate': item.search_payment_conversion_rate,
            
            # 退款相关字段
            'refund_amount': item.refund_amount,
            'refund_ratio': item.refund_ratio,
            
            # 来自product_list的字段
            'product_list_id': item.product_list_id,
            'product_list_name': item.product_list_name,
            'listing_time': item.listing_time.isoformat() if item.listing_time else None,
            'product_list_created_at': item.product_list_created_at.isoformat() if item.product_list_created_at else None,
            'product_list_updated_at': item.product_list_updated_at.isoformat() if item.product_list_updated_at else None,
            'product_list_uploaded_by': item.product_list_uploaded_by,
            
            # 推广费用字段
            'sitewide_promotion': item.sitewide_promotion,
            'keyword_promotion': item.keyword_promotion,
            'product_operation': item.product_operation,
            'crowd_promotion': item.crowd_promotion,
            'super_short_video': item.super_short_video,
            'multi_target_direct': item.multi_target_direct,
            'promotion_summary_updated_at': item.promotion_summary_updated_at.isoformat() if item.promotion_summary_updated_at else None,
            
            # 匹配信息
            'is_matched': item.is_matched,
            
            # 元数据
            'filename': item.filename,
            'upload_date': item.upload_date.isoformat() if item.upload_date else None,
            'uploaded_by': item.uploaded_by,
            'created_at': item.created_at.isoformat()
        })
    
    return jsonify({
        'data': data,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'per_page': pagination.per_page
    })

# 获取主体报表数据列表（仅管理员可访问）
@app.route('/api/subject-report', methods=['GET'])
@jwt_required()
def get_subject_report():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足'}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    platform = request.args.get('platform')
    upload_date = request.args.get('upload_date')
    report_date = request.args.get('report_date')
    supplier_name = request.args.get('supplier_name')
    
    query = SubjectReport.query
    
    if platform:
        query = query.filter_by(platform=platform)
    
    if upload_date:
        query = query.filter_by(upload_date=upload_date)
    
    if report_date:
        query = query.filter_by(report_date=report_date)
    
    if supplier_name:
        query = query.filter(SubjectReport.supplier_name.like(f'%{supplier_name}%'))
    
    # 按创建时间倒序排列
    query = query.order_by(SubjectReport.created_at.desc())
    
    pagination = query.paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    data = []
    for item in pagination.items:
        data.append({
            'id': item.id,
            'platform': item.platform,
            'report_date': item.report_date.isoformat() if item.report_date else None,
            
            # 基础字段
            'product_name': item.product_name,
            'product_code': item.product_code,
            'category': item.category,
            'brand': item.brand,
            'supplier_name': item.supplier_name,
            'shop_name': item.shop_name,
            
            # 销售数据
            'sales_amount': item.sales_amount,
            'sales_quantity': item.sales_quantity,
            'refund_amount': item.refund_amount,
            'refund_quantity': item.refund_quantity,
            'net_sales_amount': item.net_sales_amount,
            'net_sales_quantity': item.net_sales_quantity,
            
            # 成本和利润
            'cost_amount': item.cost_amount,
            'gross_profit': item.gross_profit,
            'gross_profit_rate': item.gross_profit_rate,
            
            # 推广数据
            'promotion_cost': item.promotion_cost,
            'promotion_clicks': item.promotion_clicks,
            'promotion_impressions': item.promotion_impressions,
            'promotion_ctr': item.promotion_ctr,
            'promotion_cpc': item.promotion_cpc,
            'promotion_conversion_rate': item.promotion_conversion_rate,
            'promotion_roi': item.promotion_roi,
            
            # 流量数据
            'visitor_count': item.visitor_count,
            'page_views': item.page_views,
            'bounce_rate': item.bounce_rate,
            'avg_visit_duration': item.avg_visit_duration,
            'conversion_rate': item.conversion_rate,
            
            # 库存数据
            'stock_quantity': item.stock_quantity,
            'stock_value': item.stock_value,
            'stock_turnover': item.stock_turnover,
            
            # 评价数据
            'review_count': item.review_count,
            'positive_review_rate': item.positive_review_rate,
            'avg_rating': item.avg_rating,
            
            # 元数据
            'filename': item.filename,
            'upload_date': item.upload_date.isoformat() if item.upload_date else None,
            'uploaded_by': item.uploaded_by,
            'created_at': item.created_at.isoformat()
        })
    
    return jsonify({
        'data': data,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'per_page': pagination.per_page
    })

# 获取统计信息
@app.route('/api/stats', methods=['GET'])
@jwt_required()
def get_stats():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足'}), 403
    
    # 总记录数
    total_records = ProductData.query.count()
    
    # 按平台统计
    platform_stats = db.session.query(
        ProductData.platform,
        db.func.count(ProductData.id).label('count')
    ).group_by(ProductData.platform).all()
    
    # 按品牌统计（前10）
    brand_stats = db.session.query(
        ProductData.tmall_supplier_name, # 使用tmall_supplier_name作为品牌
        db.func.count(ProductData.id).label('count')
    ).filter(ProductData.tmall_supplier_name.isnot(None)).group_by(ProductData.tmall_supplier_name).order_by(db.desc('count')).limit(10).all()
    
    return jsonify({
        'total_records': total_records,
        'platform_stats': [{'platform': p[0], 'count': p[1]} for p in platform_stats],
        'brand_stats': [{'brand': b[0], 'count': b[1]} for b in brand_stats]
    })

# 健康检查端点（无需认证）
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()}), 200

# 获取平台列表
@app.route('/api/platforms', methods=['GET'])
@jwt_required()
def get_platforms():
    platforms = db.session.query(ProductData.platform).distinct().all()
    return jsonify([p[0] for p in platforms])

# 获取供应商列表
@app.route('/api/suppliers', methods=['GET'])
@jwt_required()
def get_suppliers():
    suppliers = db.session.query(ProductData.tmall_supplier_name).distinct().filter(ProductData.tmall_supplier_name.isnot(None)).all()
    return jsonify([s[0] for s in suppliers])

# 获取上传日期列表
@app.route('/api/upload-dates', methods=['GET'])
@jwt_required()
def get_upload_dates():
    dates = db.session.query(ProductData.upload_date).distinct().order_by(ProductData.upload_date.desc()).all()
    return jsonify([d[0].isoformat() for d in dates if d[0]])

# 获取用户上传统计
@app.route('/api/user-stats', methods=['GET'])
@jwt_required()
def get_user_stats():
    user_id = int(get_jwt_identity())
    
    # 获取用户上传的文件数量（按上传时间去重，同一天多次上传算一个文件）
    upload_count = db.session.query(
        db.func.count(db.func.distinct(db.func.date(ProductData.created_at)))
    ).filter_by(uploaded_by=user_id).scalar() or 0
    
    # 获取用户上传的数据记录总数
    record_count = ProductData.query.filter_by(uploaded_by=user_id).count()
    
    return jsonify({
        'upload_count': upload_count,
        'record_count': record_count
    })

# 汇总计算推广费用 - 根据日期计算推广费用分配
@app.route('/api/calculate-promotion-summary', methods=['POST'])
@jwt_required()
def calculate_promotion_summary():
    """
    汇总计算推广费用接口
    前端传入日期，后端执行以下逻辑：
    1. product_data_merge LEFT JOIN subject_report
    2. 匹配条件：product_data_merge.upload_date = 传入日期 AND product_data_merge.upload_date = subject_report.report_date
    3. 匹配条件：product_data_merge.tmall_product_code = subject_report.subject_id
    4. 根据subject_report.scene_name分配subject_report.cost到对应的推广字段
    """
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足，只有管理员可以执行汇总计算'}), 403
    
    data = request.get_json()
    target_date = data.get('target_date')
    
    if not target_date:
        return jsonify({'message': '请提供目标日期'}), 400
    
    # 转换日期格式
    try:
        target_date = datetime.strptime(target_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': '日期格式错误，请使用YYYY-MM-DD格式'}), 400
    
    try:
        # 统计信息
        stats = {
            'processed_count': 0,
            'matched_count': 0,
            'updated_count': 0,
            'scene_name_distribution': {},
            'errors': []
        }
        
        # 数据存在性检查
        merge_records = ProductDataMerge.query.filter_by(upload_date=target_date).all()
        subject_records = SubjectReport.query.filter_by(report_date=target_date).all()
        
        # 检查product_data_merge数据
        if not merge_records:
            return jsonify({
                'message': f'未找到日期为 {target_date} 的商品排行数据，请先上传当天的商品排行日报（苏宁/天猫等平台数据）',
                'stats': stats,
                'error_type': 'missing_product_data'
            }), 400
            
        # 检查subject_report数据
        if not subject_records:
            return jsonify({
                'message': f'未找到日期为 {target_date} 的主体报表数据，请先上传当天的主体报表',
                'stats': stats,
                'error_type': 'missing_subject_report'
            }), 400
        
        print(f"数据检查通过 - 找到 {len(merge_records)} 条商品数据，{len(subject_records)} 条主体报表数据")
        
        # 场景名称到字段的映射
        scene_mapping = {
            '全站推广': 'sitewide_promotion',
            '关键词推广': 'keyword_promotion', 
            '货品运营': 'product_operation',
            '人群推广': 'crowd_promotion',
            '超级短视频': 'super_short_video',
            '多目标直投': 'multi_target_direct'
        }
        
        # 处理每条merge记录
        for merge_record in merge_records:
            stats['processed_count'] += 1
            
            try:
                if not merge_record.tmall_product_code:
                    continue
                
                # 查找匹配的subject_report记录
                subject_reports = SubjectReport.query.filter(
                    SubjectReport.report_date == target_date,
                    SubjectReport.subject_id == merge_record.tmall_product_code
                ).all()
                
                if not subject_reports:
                    continue
                
                stats['matched_count'] += 1
                
                # 重置所有推广费用字段为0
                merge_record.sitewide_promotion = 0
                merge_record.keyword_promotion = 0
                merge_record.product_operation = 0
                merge_record.crowd_promotion = 0
                merge_record.super_short_video = 0
                merge_record.multi_target_direct = 0
                
                # 累加各个场景的费用
                for subject_report in subject_reports:
                    scene_name = subject_report.scene_name
                    cost = subject_report.cost or 0
                    
                    # 统计场景名称分布
                    if scene_name:
                        if scene_name not in stats['scene_name_distribution']:
                            stats['scene_name_distribution'][scene_name] = {'count': 0, 'total_cost': 0}
                        stats['scene_name_distribution'][scene_name]['count'] += 1
                        stats['scene_name_distribution'][scene_name]['total_cost'] += cost
                    
                    # 根据场景名称分配费用
                    if scene_name in scene_mapping:
                        field_name = scene_mapping[scene_name]
                        current_value = getattr(merge_record, field_name) or 0
                        setattr(merge_record, field_name, current_value + cost)
                        print(f"产品 {merge_record.tmall_product_code}: {scene_name} += {cost}")
                
                # 更新推广费用汇总时间
                merge_record.promotion_summary_updated_at = datetime.utcnow()
                stats['updated_count'] += 1
                
            except Exception as e:
                error_msg = f"处理产品 {merge_record.tmall_product_code} 时出错: {str(e)}"
                stats['errors'].append(error_msg)
                print(error_msg)
                continue
        
        # 提交数据库事务
        db.session.commit()
        
        return jsonify({
            'message': f'汇总计算完成！处理了 {stats["processed_count"]} 条记录，匹配了 {stats["matched_count"]} 条记录，更新了 {stats["updated_count"]} 条记录',
            'stats': stats
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'汇总计算失败: {str(e)}'}), 500

# 产品总表导入
@app.route('/api/upload-product-list', methods=['POST'])
@jwt_required()
def upload_product_list():
    if 'file' not in request.files:
        return jsonify({'message': '没有文件'}), 400
    
    file = request.files['file']
    force_overwrite = request.form.get('force_overwrite', 'false').lower() == 'true'
    
    if file.filename == '':
        return jsonify({'message': '没有选择文件'}), 400
    
    if file and file.filename.endswith(('.xlsx', '.xls')):
        filename = secure_filename(file.filename)
        
        # 检查是否已存在数据
        existing_count = ProductList.query.count()
        if existing_count > 0 and not force_overwrite:
            return jsonify({
                'message': '产品总表已存在数据',
                'requires_confirmation': True,
                'existing_count': existing_count
            }), 409
        
        # 如果强制覆盖，删除现有记录
        if existing_count > 0 and force_overwrite:
            ProductList.query.delete()
            db.session.commit()
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            success_count = process_product_list_file(filepath, int(get_jwt_identity()))
            os.remove(filepath)  # 删除临时文件
            
            message = f'产品总表导入成功，处理了 {success_count} 条数据'
            if existing_count > 0 and force_overwrite:
                message += f'，已替换之前的 {existing_count} 条记录'
            
            return jsonify({
                'message': message,
                'count': success_count
            }), 200
        except Exception as e:
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({'message': f'文件处理失败: {str(e)}'}), 500
    
    return jsonify({'message': '不支持的文件格式，请上传 .xlsx 或 .xls 文件'}), 400

# 种菜表格登记导入
@app.route('/api/upload-planting-records', methods=['POST'])
@jwt_required()
def upload_planting_records():
    if 'file' not in request.files:
        return jsonify({'message': '没有文件'}), 400
    
    file = request.files['file']
    force_overwrite = request.form.get('force_overwrite', 'false').lower() == 'true'
    
    if file.filename == '':
        return jsonify({'message': '没有选择文件'}), 400
    
    if file and file.filename.endswith(('.xlsx', '.xls')):
        filename = secure_filename(file.filename)
        
        # 检查是否已存在数据
        existing_count = PlantingRecord.query.count()
        if existing_count > 0 and not force_overwrite:
            return jsonify({
                'message': '种菜表格登记已存在数据',
                'requires_confirmation': True,
                'existing_count': existing_count
            }), 409
        
        # 如果强制覆盖，删除现有记录
        if existing_count > 0 and force_overwrite:
            PlantingRecord.query.delete()
            db.session.commit()
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            success_count = process_planting_records_file(filepath, int(get_jwt_identity()))
            os.remove(filepath)  # 删除临时文件
            
            message = f'种菜表格登记导入成功，处理了 {success_count} 条数据'
            if existing_count > 0 and force_overwrite:
                message += f'，已替换之前的 {existing_count} 条记录'
            
            return jsonify({
                'message': message,
                'count': success_count
            }), 200
        except Exception as e:
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({'message': f'文件处理失败: {str(e)}'}), 500
    
    return jsonify({'message': '不支持的文件格式，请上传 .xlsx 或 .xls 文件'}), 400

# 主体报表导入
@app.route('/api/upload-subject-report', methods=['POST'])
@jwt_required()
def upload_subject_report():
    if 'file' not in request.files:
        return jsonify({'message': '没有文件'}), 400
    
    file = request.files['file']
    upload_date = request.form.get('upload_date')
    force_overwrite = request.form.get('force_overwrite', 'false').lower() == 'true'
    
    if file.filename == '':
        return jsonify({'message': '没有选择文件'}), 400
    
    if not upload_date:
        return jsonify({'message': '请选择上传日期'}), 400
    
    try:
        upload_date = datetime.strptime(upload_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': '日期格式错误'}), 400
    
    if file and file.filename.endswith(('.xlsx', '.xls', '.csv')):
        filename = secure_filename(file.filename)
        
        # 检查是否已存在相同日期的记录
        existing_records = SubjectReport.query.filter_by(upload_date=upload_date).all()
        if existing_records and not force_overwrite:
            return jsonify({
                'message': '该日期已存在主体报表数据',
                'requires_confirmation': True,
                'existing_count': len(existing_records)
            }), 409
        
        # 如果强制覆盖，删除现有记录
        if existing_records and force_overwrite:
            for record in existing_records:
                db.session.delete(record)
            db.session.commit()
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            success_count = process_subject_report_file(filepath, int(get_jwt_identity()), filename, upload_date)
            os.remove(filepath)  # 删除临时文件
            
            message = f'主体报表导入成功，处理了 {success_count} 条数据'
            if existing_records and force_overwrite:
                message += f'，已替换之前的 {len(existing_records)} 条记录'
            
            return jsonify({
                'message': message,
                'count': success_count
            }), 200
        except Exception as e:
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({'message': f'文件处理失败: {str(e)}'}), 500
    
    return jsonify({'message': '不支持的文件格式，请上传 .xlsx、.xls 或 .csv 文件'}), 400

def process_product_list_file(filepath, user_id):
    """处理产品总表文件"""
    try:
        # 读取Excel文件，默认第一个sheet
        df = pd.read_excel(filepath, sheet_name=0)
        
        # 获取列名，根据实际情况调整
        columns = df.columns.tolist()
        print(f"Excel列名: {columns}")
        
        # 根据分析结果，产品总表有3列：ID、商品名称、上架时间
        if len(columns) >= 3:
            id_col = columns[0]  # 第一列是ID
            name_col = columns[1]  # 第二列是商品名称
            time_col = columns[2]  # 第三列是上架时间
        else:
            raise ValueError("Excel文件格式不正确，需要至少3列数据")
        
        success_count = 0
        
        for _, row in df.iterrows():
            try:
                # 跳过空行
                if pd.isna(row[id_col]):
                    continue
                
                # 处理上架时间
                listing_time = None
                if not pd.isna(row[time_col]):
                    if isinstance(row[time_col], str):
                        try:
                            listing_time = datetime.strptime(row[time_col], '%Y-%m-%d').date()
                        except:
                            try:
                                listing_time = datetime.strptime(row[time_col], '%Y/%m/%d').date()
                            except:
                                pass
                    else:
                        listing_time = row[time_col]
                
                product_list = ProductList(
                    product_id=str(row[id_col]),
                    product_name=str(row[name_col]) if not pd.isna(row[name_col]) else '',
                    listing_time=listing_time,
                    uploaded_by=user_id
                )
                
                db.session.add(product_list)
                success_count += 1
                
            except Exception as e:
                print(f"处理产品总表行数据时出错: {e}")
                continue
        
        db.session.commit()
        return success_count
        
    except Exception as e:
        db.session.rollback()
        raise e

def process_planting_records_file(filepath, user_id):
    """处理种菜表格登记文件"""
    try:
        # 读取Excel文件的所有工作表
        xl_file = pd.ExcelFile(filepath)
        success_count = 0
        
        for sheet_name in xl_file.sheet_names:
            print(f"处理工作表: {sheet_name}")
            
            # 读取工作表数据
            df = pd.read_excel(filepath, sheet_name=sheet_name)
            
            # 获取列名映射
            columns = df.columns.tolist()
            app.logger.info(f"工作表 {sheet_name} 列名: {columns}")
            
            # 创建列名映射字典
            col_mapping = {}
            
            # 首先遍历一遍，找到所有精确匹配的列名
            exact_matches = {
                '数量': 'quantity',
                '日期': 'order_date',
                '微信号': 'wechat_id',
                '产品ID': 'product_id',
                '关键词': 'keyword',
                '旺旺号': 'wangwang_id',
                '做单微信': 'order_wechat',
                '订单号': 'order_number',
                '金额': 'amount',
                '赠送/佣金': 'gift_commission',
                '返款状态': 'refund_status',
                '返款金额': 'refund_amount',
                '返款微信': 'refund_wechat',
                '返款日期': 'refund_date',
                '店铺': 'store_name',
                '内部订单号': 'internal_order_number'
            }
            
            # 记录已经匹配的字段
            matched_fields = set()
            
            # 首先进行精确匹配
            for col in columns:
                col_str = str(col).strip()
                if col_str in exact_matches:
                    field_name = exact_matches[col_str]
                    col_mapping[field_name] = col
                    matched_fields.add(field_name)
            
            # 对于未匹配的字段，使用模糊匹配
            for col in columns:
                col_str = str(col).strip()
                col_lower = col_str.lower()
                
                # 跳过已经精确匹配的列
                if col_str in exact_matches:
                    continue
                
                # 模糊匹配规则
                if '产品id' in col_lower and 'product_id' not in matched_fields:
                    col_mapping['product_id'] = col
                    matched_fields.add('product_id')
                elif '付款时间' in col_lower and 'order_date' not in matched_fields:
                    col_mapping['order_date'] = col
                    matched_fields.add('order_date')
                elif '付款日期' in col_lower and 'order_date' not in matched_fields:
                    col_mapping['order_date'] = col
                    matched_fields.add('order_date')
            
            app.logger.info(f"工作表 {sheet_name} 列名映射结果:")
            for field, col in col_mapping.items():
                app.logger.info(f"  {field}: {col}")
            
            app.logger.info(f"工作表 {sheet_name} 列名映射: {col_mapping}")  # 添加调试信息
            
            # 处理每一行数据
            for _, row in df.iterrows():
                try:
                    # 跳过完全空的行或标题行
                    # 检查是否整行都为空
                    if row.isna().all():
                        continue
                    
                    # 检查是否是标题行（第一列包含特定关键字）
                    if not pd.isna(row.iloc[0]) and str(row.iloc[0]).lower() in ['数量', '付款时间', '序号']:
                        continue
                    
                    # 检查是否有任何有意义的数据（至少一个关键字段不为空）
                    has_data = False
                    key_fields = [col_mapping.get('quantity'), col_mapping.get('order_date'), col_mapping.get('wechat_id'), 
                                 col_mapping.get('product_id'), col_mapping.get('order_number')]
                    for field in key_fields:
                        if field and field in row.index and pd.notna(row[field]):
                            has_data = True
                            break
                    
                    if not has_data:
                        continue
                    
                    # 处理日期字段
                    order_date = None
                    refund_date = None
                    
                    # 获取订单日期
                    if col_mapping.get('order_date'):
                        order_date_value = row.get(col_mapping.get('order_date'))
                        order_date = safe_parse_date(order_date_value)
                        app.logger.info(f"订单日期解析: 原值='{order_date_value}' -> {order_date}")
                    
                    # 获取返款日期
                    if col_mapping.get('refund_date'):
                        refund_date_value = row.get(col_mapping.get('refund_date'))
                        refund_date = safe_parse_date(refund_date_value)
                        app.logger.info(f"返款日期解析: 原值='{refund_date_value}' -> {refund_date}")
                    
                    # 获取订单号和内部订单号，确保它们是字符串格式
                    order_number = None
                    if col_mapping.get('order_number'):
                        order_number_value = row.get(col_mapping.get('order_number'))
                        if pd.notna(order_number_value):
                            try:
                                # 如果是科学计数法，先转换为float再转为整数字符串
                                if isinstance(order_number_value, (float, int)) or (isinstance(order_number_value, str) and 'e' in order_number_value.lower()):
                                    order_number = str(int(float(order_number_value)))
                                else:
                                    # 移除所有空白字符和小数点后的0
                                    order_number = ''.join(str(order_number_value).split())
                                    if '.' in order_number:
                                        order_number = str(int(float(order_number)))
                            except (ValueError, TypeError) as e:
                                app.logger.warning(f"订单号格式转换失败: {order_number_value} -> {str(e)}")
                                order_number = str(order_number_value)

                    internal_order_number = None
                    if col_mapping.get('internal_order_number'):
                        internal_number_value = row.get(col_mapping.get('internal_order_number'))
                        if pd.notna(internal_number_value):
                            try:
                                # 移除所有空白字符和小数点后的0
                                internal_order_number = ''.join(str(internal_number_value).split())
                                if '.' in internal_order_number:
                                    internal_order_number = str(int(float(internal_order_number)))
                            except (ValueError, TypeError) as e:
                                app.logger.warning(f"内部订单号格式转换失败: {internal_number_value} -> {str(e)}")
                                internal_order_number = str(internal_number_value)

                    app.logger.info(f"订单号信息: order_number='{order_number}', internal_order_number='{internal_order_number}'")
                    
                    # 处理product_id
                    product_id = safe_get_str(row, col_mapping.get('product_id'))
                    
                    # 验证product_id是否为有效的数字字符串
                    if product_id:
                        # 移除所有空白字符
                        product_id = ''.join(product_id.split())
                        
                        # 如果包含小数点，尝试转换为整数
                        if '.' in product_id:
                            try:
                                product_id = str(int(float(product_id)))
                            except (ValueError, TypeError):
                                app.logger.warning(f"无效的product_id格式(小数转换失败): {product_id}")
                                continue  # 跳过这一行
                        
                        # 验证是否为纯数字
                        if not re.match(r'^\d+$', product_id):
                            app.logger.warning(f"无效的product_id格式(非数字): {product_id}")
                            continue  # 跳过这一行
                    else:
                        app.logger.warning("product_id为空，跳过该行")
                        continue  # 跳过这一行
                    
                    app.logger.info(f"处理数据行 - product_id: {product_id}")
                    
                    # 在创建记录前再次确保订单号和内部订单号格式正确
                    final_order_number = order_number
                    if isinstance(order_number, (float, int)) or (isinstance(order_number, str) and ('e' in str(order_number).lower() or '.' in str(order_number))):
                        try:
                            final_order_number = str(int(float(order_number)))
                            app.logger.info(f"订单号最终格式化: {order_number} -> {final_order_number}")
                        except (ValueError, TypeError) as e:
                            app.logger.error(f"订单号最终格式化失败: {order_number} -> {str(e)}")
                            final_order_number = str(order_number)

                    final_internal_number = internal_order_number
                    if isinstance(internal_order_number, (float, int)) or (isinstance(internal_order_number, str) and '.' in str(internal_order_number)):
                        try:
                            final_internal_number = str(int(float(internal_order_number)))
                            app.logger.info(f"内部订单号最终格式化: {internal_order_number} -> {final_internal_number}")
                        except (ValueError, TypeError) as e:
                            app.logger.error(f"内部订单号最终格式化失败: {internal_order_number} -> {str(e)}")
                            final_internal_number = str(internal_order_number)

                    planting_record = PlantingRecord(
                        staff_name=sheet_name,  # 使用工作表名称作为人员名称
                        quantity=safe_get_int(row, col_mapping.get('quantity')),
                        order_date=order_date,  # 使用付款时间/付款日期作为订单日期
                        wechat_id=safe_get_str(row, col_mapping.get('wechat_id')),
                        product_id=product_id,
                        keyword=safe_get_str(row, col_mapping.get('keyword')),
                        wangwang_id=safe_get_str(row, col_mapping.get('wangwang_id')),
                        order_wechat=safe_get_str(row, col_mapping.get('order_wechat')),
                        order_number=final_order_number,  # 使用最终格式化的订单号
                        amount=safe_get_float(row, col_mapping.get('amount')),
                        gift_commission=safe_get_float(row, col_mapping.get('gift_commission')),
                        refund_status=safe_get_str(row, col_mapping.get('refund_status')),
                        refund_amount=safe_get_float(row, col_mapping.get('refund_amount')),
                        refund_wechat=safe_get_str(row, col_mapping.get('refund_wechat')),
                        refund_date=refund_date,
                        store_name=safe_get_str(row, col_mapping.get('store_name')),
                        internal_order_number=final_internal_number,  # 使用最终格式化的内部订单号
                        uploaded_by=user_id
                    )
                    
                    # 添加额外的日志记录
                    app.logger.info(f"最终数据验证 - 工作表: {sheet_name}")
                    app.logger.info(f"  订单号: 原始值='{order_number}', 最终值='{final_order_number}'")
                    app.logger.info(f"  内部订单号: 原始值='{internal_order_number}', 最终值='{final_internal_number}'")
                    
                    db.session.add(planting_record)
                    success_count += 1
                    
                except Exception as e:
                    print(f"处理种菜表格行数据时出错: {e}")
                    continue
        
        db.session.commit()
        return success_count
        
    except Exception as e:
        db.session.rollback()
        raise e

def process_subject_report_file(filepath, user_id, filename, upload_date):
    """处理主体报表文件"""
    try:
        # 读取文件
        if filepath.endswith('.csv'):
            # 检测文件编码，尝试多种编码
            encodings_to_try = ['utf-8', 'gbk', 'gb2312', 'utf-8-sig', 'latin-1']
            
            # 先尝试自动检测
            with open(filepath, 'rb') as f:
                raw_data = f.read()
                detected = chardet.detect(raw_data)
                if detected['encoding']:
                    encodings_to_try.insert(0, detected['encoding'])
            
            df = None
            for encoding in encodings_to_try:
                try:
                    df = pd.read_csv(filepath, encoding=encoding)
                    print(f"成功使用编码 {encoding} 读取CSV文件")
                    break
                except Exception as e:
                    print(f"编码 {encoding} 失败: {e}")
                    continue
            
            if df is None:
                raise Exception("无法读取CSV文件，尝试了多种编码都失败")
        else:
            df = pd.read_excel(filepath)
        
        success_count = 0
        
        # 从文件名中提取报表日期（如果可能）
        report_date = upload_date  # 默认使用上传日期
        import re
        date_match = re.search(r'(\d{8})', filename)
        if date_match:
            try:
                extracted_date = datetime.strptime(date_match.group(1), '%Y%m%d').date()
                report_date = extracted_date
            except:
                pass
        
        # 获取列名映射
        column_mapping = get_subject_report_column_mapping(df.columns.tolist())
        
        # 定义需要过滤的关键字
        filter_keywords = ['五更', '希臻', '谦易律哲']
        
        for _, row in df.iterrows():
            try:
                # 跳过空行
                if pd.isna(row.iloc[0]):
                    continue
                
                # 检查计划名称是否包含指定关键字
                plan_name_col = column_mapping.get('plan_name')
                if plan_name_col:
                    plan_name = safe_get_value(row, plan_name_col)
                    if plan_name:
                        # 检查是否包含任何一个关键字
                        has_keyword = any(keyword in str(plan_name) for keyword in filter_keywords)
                        if not has_keyword:
                            continue  # 跳过不包含关键字的行
                
                subject_report = SubjectReport(
                    platform='天猫苏宁',
                    report_date=report_date,
                    
                    # CSV实际字段映射
                    date_field=safe_get_date(row, column_mapping.get('date_field')),
                    scene_id=safe_get_value(row, column_mapping.get('scene_id')),
                    scene_name=safe_get_value(row, column_mapping.get('scene_name')),
                    original_scene_id=safe_get_value(row, column_mapping.get('original_scene_id')),
                    original_scene_name=safe_get_value(row, column_mapping.get('original_scene_name')),
                    plan_id=safe_get_value(row, column_mapping.get('plan_id')),
                    plan_name=safe_get_value(row, column_mapping.get('plan_name')),
                    subject_id=safe_get_value(row, column_mapping.get('subject_id')),
                    subject_type=safe_get_value(row, column_mapping.get('subject_type')),
                    subject_name=safe_get_value(row, column_mapping.get('subject_name')),
                    
                    # 展现和点击数据
                    impressions=safe_get_int(row, column_mapping.get('impressions')),
                    clicks=safe_get_int(row, column_mapping.get('clicks')),
                    cost=safe_get_float(row, column_mapping.get('cost')),
                    ctr=safe_get_float(row, column_mapping.get('ctr')),
                    avg_cpc=safe_get_float(row, column_mapping.get('avg_cpc')),
                    cpm=safe_get_float(row, column_mapping.get('cpm')),
                    
                    # 预售成交数据
                    total_presale_amount=safe_get_float(row, column_mapping.get('total_presale_amount')),
                    total_presale_orders=safe_get_int(row, column_mapping.get('total_presale_orders')),
                    direct_presale_amount=safe_get_float(row, column_mapping.get('direct_presale_amount')),
                    direct_presale_orders=safe_get_int(row, column_mapping.get('direct_presale_orders')),
                    indirect_presale_amount=safe_get_float(row, column_mapping.get('indirect_presale_amount')),
                    indirect_presale_orders=safe_get_int(row, column_mapping.get('indirect_presale_orders')),
                    
                    # 成交数据
                    direct_transaction_amount=safe_get_float(row, column_mapping.get('direct_transaction_amount')),
                    indirect_transaction_amount=safe_get_float(row, column_mapping.get('indirect_transaction_amount')),
                    total_transaction_amount=safe_get_float(row, column_mapping.get('total_transaction_amount')),
                    total_transaction_orders=safe_get_int(row, column_mapping.get('total_transaction_orders')),
                    direct_transaction_orders=safe_get_int(row, column_mapping.get('direct_transaction_orders')),
                    indirect_transaction_orders=safe_get_int(row, column_mapping.get('indirect_transaction_orders')),
                    
                    # 转化和投入产出
                    click_conversion_rate=safe_get_float(row, column_mapping.get('click_conversion_rate')),
                    roas=safe_get_float(row, column_mapping.get('roas')),
                    total_transaction_cost=safe_get_float(row, column_mapping.get('total_transaction_cost')),
                    
                    # 购物车数据
                    total_cart_count=safe_get_int(row, column_mapping.get('total_cart_count')),
                    direct_cart_count=safe_get_int(row, column_mapping.get('direct_cart_count')),
                    indirect_cart_count=safe_get_int(row, column_mapping.get('indirect_cart_count')),
                    cart_rate=safe_get_float(row, column_mapping.get('cart_rate')),
                    
                    # 收藏数据
                    favorite_product_count=safe_get_int(row, column_mapping.get('favorite_product_count')),
                    favorite_shop_count=safe_get_int(row, column_mapping.get('favorite_shop_count')),
                    shop_favorite_cost=safe_get_float(row, column_mapping.get('shop_favorite_cost')),
                    total_favorite_cart_count=safe_get_int(row, column_mapping.get('total_favorite_cart_count')),
                    total_favorite_cart_cost=safe_get_float(row, column_mapping.get('total_favorite_cart_cost')),
                    product_favorite_cart_count=safe_get_int(row, column_mapping.get('product_favorite_cart_count')),
                    product_favorite_cart_cost=safe_get_float(row, column_mapping.get('product_favorite_cart_cost')),
                    total_favorite_count=safe_get_int(row, column_mapping.get('total_favorite_count')),
                    product_favorite_cost=safe_get_float(row, column_mapping.get('product_favorite_cost')),
                    product_favorite_rate=safe_get_float(row, column_mapping.get('product_favorite_rate')),
                    cart_cost=safe_get_float(row, column_mapping.get('cart_cost')),
                    
                    # 订单数据
                    placed_order_count=safe_get_int(row, column_mapping.get('placed_order_count')),
                    placed_order_amount=safe_get_float(row, column_mapping.get('placed_order_amount')),
                    direct_favorite_product_count=safe_get_int(row, column_mapping.get('direct_favorite_product_count')),
                    indirect_favorite_product_count=safe_get_int(row, column_mapping.get('indirect_favorite_product_count')),
                    
                    # 优惠券和充值
                    coupon_claim_count=safe_get_int(row, column_mapping.get('coupon_claim_count')),
                    shopping_gold_recharge_count=safe_get_int(row, column_mapping.get('shopping_gold_recharge_count')),
                    shopping_gold_recharge_amount=safe_get_float(row, column_mapping.get('shopping_gold_recharge_amount')),
                    
                    # 咨询和访问数据
                    wangwang_consultation_count=safe_get_int(row, column_mapping.get('wangwang_consultation_count')),
                    guided_visit_count=safe_get_int(row, column_mapping.get('guided_visit_count')),
                    guided_visitor_count=safe_get_int(row, column_mapping.get('guided_visitor_count')),
                    guided_potential_customer_count=safe_get_int(row, column_mapping.get('guided_potential_customer_count')),
                    guided_potential_customer_rate=safe_get_float(row, column_mapping.get('guided_potential_customer_rate')),
                    membership_rate=safe_get_float(row, column_mapping.get('membership_rate')),
                    membership_count=safe_get_int(row, column_mapping.get('membership_count')),
                    guided_visit_rate=safe_get_float(row, column_mapping.get('guided_visit_rate')),
                    deep_visit_count=safe_get_int(row, column_mapping.get('deep_visit_count')),
                    avg_visit_pages=safe_get_float(row, column_mapping.get('avg_visit_pages')),
                    
                    # 客户数据
                    new_customer_count=safe_get_int(row, column_mapping.get('new_customer_count')),
                    new_customer_rate=safe_get_float(row, column_mapping.get('new_customer_rate')),
                    member_first_purchase_count=safe_get_int(row, column_mapping.get('member_first_purchase_count')),
                    member_transaction_amount=safe_get_float(row, column_mapping.get('member_transaction_amount')),
                    member_transaction_orders=safe_get_int(row, column_mapping.get('member_transaction_orders')),
                    transaction_customer_count=safe_get_int(row, column_mapping.get('transaction_customer_count')),
                    avg_orders_per_customer=safe_get_float(row, column_mapping.get('avg_orders_per_customer')),
                    avg_amount_per_customer=safe_get_float(row, column_mapping.get('avg_amount_per_customer')),
                    
                    # 自然流量数据
                    natural_traffic_amount=safe_get_float(row, column_mapping.get('natural_traffic_amount')),
                    natural_traffic_impressions=safe_get_int(row, column_mapping.get('natural_traffic_impressions')),
                    
                    # 平台助推数据
                    platform_boost_total_transaction=safe_get_float(row, column_mapping.get('platform_boost_total_transaction')),
                    platform_boost_direct_transaction=safe_get_float(row, column_mapping.get('platform_boost_direct_transaction')),
                    platform_boost_clicks=safe_get_int(row, column_mapping.get('platform_boost_clicks')),
                    
                    # 优惠券撬动数据
                    product_coupon_discount_amount=safe_get_float(row, column_mapping.get('product_coupon_discount_amount')),
                    product_coupon_total_transaction=safe_get_float(row, column_mapping.get('product_coupon_total_transaction')),
                    product_coupon_direct_transaction=safe_get_float(row, column_mapping.get('product_coupon_direct_transaction')),
                    product_coupon_clicks=safe_get_int(row, column_mapping.get('product_coupon_clicks')),
                    
                    # 元数据
                    filename=filename,
                    upload_date=upload_date,
                    uploaded_by=user_id
                )
                
                db.session.add(subject_report)
                success_count += 1
                
            except Exception as e:
                print(f"处理主体报表行数据时出错: {e}")
                continue
        
        db.session.commit()
        return success_count
        
    except Exception as e:
        db.session.rollback()
        raise e

def get_subject_report_column_mapping(columns):
    """获取主体报表的列名映射"""
    mapping = {}
    
    print(f"检测到的CSV列名: {columns}")
    
    # 精确匹配CSV列名到数据库字段
    column_map = {
        # 基础字段
        '日期': 'date_field',
        '场景ID': 'scene_id',
        '场景名字': 'scene_name',
        '原二级场景ID': 'original_scene_id',
        '原二级场景名字': 'original_scene_name',
        '计划ID': 'plan_id',
        '计划名字': 'plan_name',
        '主体ID': 'subject_id',
        '主体类型': 'subject_type',
        '主体名称': 'subject_name',
        
        # 展现和点击数据
        '展现量': 'impressions',
        '点击量': 'clicks',
        '花费': 'cost',
        '点击率': 'ctr',
        '平均点击花费': 'avg_cpc',
        '千次展现花费': 'cpm',
        
        # 预售成交数据
        '总预售成交金额': 'total_presale_amount',
        '总预售成交笔数': 'total_presale_orders',
        '直接预售成交金额': 'direct_presale_amount',
        '直接预售成交笔数': 'direct_presale_orders',
        '间接预售成交金额': 'indirect_presale_amount',
        '间接预售成交笔数': 'indirect_presale_orders',
        
        # 成交数据
        '直接成交金额': 'direct_transaction_amount',
        '间接成交金额': 'indirect_transaction_amount',
        '总成交金额': 'total_transaction_amount',
        '总成交笔数': 'total_transaction_orders',
        '直接成交笔数': 'direct_transaction_orders',
        '间接成交笔数': 'indirect_transaction_orders',
        
        # 转化和投入产出
        '点击转化率': 'click_conversion_rate',
        '投入产出比': 'roas',
        '总成交成本': 'total_transaction_cost',
        
        # 购物车数据
        '总购物车数': 'total_cart_count',
        '直接购物车数': 'direct_cart_count',
        '间接购物车数': 'indirect_cart_count',
        '加购率': 'cart_rate',
        
        # 收藏数据
        '收藏宝贝数': 'favorite_product_count',
        '收藏店铺数': 'favorite_shop_count',
        '店铺收藏成本': 'shop_favorite_cost',
        '总收藏加购数': 'total_favorite_cart_count',
        '总收藏加购成本': 'total_favorite_cart_cost',
        '宝贝收藏加购数': 'product_favorite_cart_count',
        '宝贝收藏加购成本': 'product_favorite_cart_cost',
        '总收藏数': 'total_favorite_count',
        '宝贝收藏成本': 'product_favorite_cost',
        '宝贝收藏率': 'product_favorite_rate',
        '加购成本': 'cart_cost',
        
        # 订单数据
        '拍下订单笔数': 'placed_order_count',
        '拍下订单金额': 'placed_order_amount',
        '直接收藏宝贝数': 'direct_favorite_product_count',
        '间接收藏宝贝数': 'indirect_favorite_product_count',
        
        # 优惠券和充值
        '优惠券领取量': 'coupon_claim_count',
        '购物金充值笔数': 'shopping_gold_recharge_count',
        '购物金充值金额': 'shopping_gold_recharge_amount',
        
        # 咨询和访问数据
        '旺旺咨询量': 'wangwang_consultation_count',
        '引导访问量': 'guided_visit_count',
        '引导访问人数': 'guided_visitor_count',
        '引导访问潜客数': 'guided_potential_customer_count',
        '引导访问潜客占比': 'guided_potential_customer_rate',
        '入会率': 'membership_rate',
        '入会量': 'membership_count',
        '引导访问率': 'guided_visit_rate',
        '深度访问量': 'deep_visit_count',
        '平均访问页面数': 'avg_visit_pages',
        
        # 客户数据
        '成交新客数': 'new_customer_count',
        '成交新客占比': 'new_customer_rate',
        '会员首购人数': 'member_first_purchase_count',
        '会员成交金额': 'member_transaction_amount',
        '会员成交笔数': 'member_transaction_orders',
        '成交人数': 'transaction_customer_count',
        '人均成交笔数': 'avg_orders_per_customer',
        '人均成交金额': 'avg_amount_per_customer',
        
        # 自然流量数据
        '自然流量转化金额': 'natural_traffic_amount',
        '自然流量曝光量': 'natural_traffic_impressions',
        
        # 平台助推数据
        '平台助推总成交': 'platform_boost_total_transaction',
        '平台助推直接成交': 'platform_boost_direct_transaction',
        '平台助推点击': 'platform_boost_clicks',
        
        # 优惠券撬动数据
        '宝贝优惠券抵扣金额': 'product_coupon_discount_amount',
        '宝贝优惠券撬动总成交': 'product_coupon_total_transaction',
        '宝贝优惠券撬动直接成交': 'product_coupon_direct_transaction',
        '宝贝优惠券撬动点击': 'product_coupon_clicks',
    }
    
    # 遍历CSV列名，寻找匹配的字段
    for col in columns:
        col_clean = str(col).strip()
        if col_clean in column_map:
            mapping[column_map[col_clean]] = col
    
    print(f"映射结果: {mapping}")
    return mapping

def safe_parse_date(date_value):
    """安全解析日期"""
    if pd.isna(date_value):
        app.logger.debug(f"日期值为空: {date_value}")
        return None
    
    if isinstance(date_value, (datetime, pd.Timestamp)):
        result = date_value.date()
        app.logger.debug(f"日期解析(datetime): {date_value} -> {result}")
        return result
    
    if isinstance(date_value, str):
        try:
            # 尝试不同的日期格式
            date_formats = [
                '%Y-%m-%d',
                '%Y/%m/%d',
                '%Y.%m.%d',
                '%Y年%m月%d日',
                '%Y-%m-%d %H:%M:%S',
                '%Y/%m/%d %H:%M:%S',
                '%Y.%m.%d %H:%M:%S',
                '%Y%m%d'
            ]
            
            # 清理日期字符串
            date_str = date_value.strip()
            # 如果包含时间，只取日期部分
            if ' ' in date_str:
                date_str = date_str.split(' ')[0]
            
            for fmt in date_formats:
                try:
                    result = datetime.strptime(date_str, fmt).date()
                    app.logger.debug(f"日期解析(字符串): {date_value} -> {result} (格式: {fmt})")
                    return result
                except ValueError:
                    continue
            
            app.logger.info(f"无法解析日期字符串，使用NULL: {date_value}")
        except Exception as e:
            app.logger.warning(f"日期解析错误，使用NULL: {date_value} -> {str(e)}")
    else:
        app.logger.info(f"未知日期类型，使用NULL: {type(date_value)} -> {date_value}")
    
    return None

def safe_get_str(row, field_name):
    """安全获取字符串值"""
    if field_name and field_name in row.index:
        value = row[field_name]
        if pd.notna(value):
            return str(value)
    return None

def safe_get_int(row, field_name):
    """安全获取整数值"""
    if field_name and field_name in row.index:
        value = row[field_name]
        if pd.notna(value):
            try:
                return int(float(value))
            except:
                return None
    return None

def safe_get_float(row, field_name):
    """安全获取浮点数值"""
    if field_name and field_name in row.index:
        value = row[field_name]
        if pd.notna(value):
            try:
                return float(value)
            except:
                return None
    return None

def init_database():
    """初始化数据库，带重试机制"""
    import time
    max_retries = 30  # 最多重试30次
    retry_delay = 2   # 每次重试间隔2秒
    
    for attempt in range(max_retries):
        try:
            with app.app_context():
                # 测试数据库连接
                with db.engine.connect() as conn:
                    conn.execute(text('SELECT 1'))
                print(f"数据库连接成功！")
                
                # 创建所有表
                db.create_all()
                print("数据库表创建成功！")
                
                # 创建默认管理员用户
                admin = User.query.filter_by(username='admin').first()
                if not admin:
                    admin = User(
                        username='admin',
                        email='admin@example.com',
                        role='admin'
                    )
                    admin.set_password('admin123')
                    db.session.add(admin)
                    db.session.commit()
                    print("创建管理员账户: admin / admin123")
                
                # 创建默认普通用户
                user = User.query.filter_by(username='user').first()
                if not user:
                    user = User(
                        username='user',
                        email='user@example.com',
                        role='user'
                    )
                    user.set_password('user123')
                    db.session.add(user)
                    db.session.commit()
                    print("创建普通用户账户: user / user123")
                
                print("数据库初始化完成！")
                return True
                
        except Exception as e:
            print(f"数据库连接失败 (尝试 {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                print(f"等待 {retry_delay} 秒后重试...")
                time.sleep(retry_delay)
            else:
                print("数据库连接失败，已达到最大重试次数")
                return False

@app.route('/api/calculate-planting-summary', methods=['POST'])
@jwt_required()
def calculate_planting_summary():
    """计算种菜表格汇总数据"""
    try:
        # 获取请求参数
        data = request.get_json()
        if not data or 'date' not in data:
            return jsonify({'message': '请选择日期'}), 400
        
        summary_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        
        # 检查是否有当天的种菜表格数据
        planting_records = PlantingRecord.query.filter_by(order_date=summary_date).all()
        if not planting_records:
            return jsonify({
                'message': '未找到所选日期的种菜表格数据，请先上传种菜表格',
                'error_type': 'NO_PLANTING_DATA'
            }), 404
        
        # 检查是否有当天的商品排行数据
        merge_records = ProductDataMerge.query.filter_by(upload_date=summary_date).all()
        if not merge_records:
            return jsonify({
                'message': '未找到所选日期的商品排行数据，请先上传商品排行日报',
                'error_type': 'NO_MERGE_DATA'
            }), 404
        
        # 开始计算汇总数据
        summary_count = 0
        for merge_record in merge_records:
            # 查找匹配的种菜记录
            matched_records = PlantingRecord.query.filter_by(
                order_date=summary_date,
                product_id=merge_record.tmall_product_code
            ).all()
            
            if matched_records:
                # 计算汇总数据
                planting_orders = len(matched_records)
                planting_amount = sum(record.amount or 0 for record in matched_records)
                planting_cost = sum(record.gift_commission or 0 for record in matched_records)
                planting_logistics_cost = planting_orders * 2.5
                planting_deduction = planting_amount * 0.08
                
                # 更新merge记录
                merge_record.planting_orders = planting_orders
                merge_record.planting_amount = planting_amount
                merge_record.planting_cost = planting_cost
                merge_record.planting_logistics_cost = planting_logistics_cost
                merge_record.planting_deduction = planting_deduction
                merge_record.planting_summary_updated_at = datetime.utcnow()
                
                summary_count += 1
                
                # 添加日志记录
                app.logger.info(f"种菜汇总计算 - 商品编码: {merge_record.tmall_product_code}")
                app.logger.info(f"  匹配订单数: {planting_orders}")
                app.logger.info(f"  总金额: {planting_amount}")
                app.logger.info(f"  佣金总额: {planting_cost}")
                app.logger.info(f"  物流成本: {planting_logistics_cost}")
                app.logger.info(f"  扣款金额: {planting_deduction}")
        
        # 提交数据库更改
        db.session.commit()
        
        return jsonify({
            'message': f'种菜汇总计算完成，更新了 {summary_count} 条记录',
            'count': summary_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"种菜汇总计算失败: {str(e)}")
        return jsonify({'message': f'计算失败: {str(e)}'}), 500

@app.route('/api/calculate-final-summary', methods=['POST'])
@jwt_required()
def calculate_final_summary():
    """计算最终汇总数据"""
    try:
        # 获取请求参数
        data = request.get_json()
        if not data or 'date' not in data:
            return jsonify({'message': '请选择日期'}), 400
        
        summary_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        
        # 获取指定日期的记录
        merge_records = ProductDataMerge.query.filter_by(upload_date=summary_date).all()
        if not merge_records:
            return jsonify({
                'message': '未找到所选日期的数据',
                'error_type': 'NO_DATA'
            }), 404
        
        # 开始计算汇总数据
        summary_count = 0
        for record in merge_records:
            try:
                from decimal import Decimal

                # 第一层计算：基础比率
                visitor_count = Decimal(str(record.visitor_count or 0))
                payment_buyer_count = Decimal(str(record.payment_buyer_count or 0))
                favorite_count = Decimal(str(record.favorite_count or 0))
                add_to_cart_count = Decimal(str(record.add_to_cart_count or 0))
                payment_amount = Decimal(str(record.payment_amount or 0))
                
                # 转换为float以确保兼容性
                record.conversion_rate = float((payment_buyer_count / visitor_count * Decimal('100')) if visitor_count > 0 else Decimal('0'))
                record.favorite_rate = float((favorite_count / visitor_count * Decimal('100')) if visitor_count > 0 else Decimal('0'))
                record.cart_rate = float((add_to_cart_count / visitor_count * Decimal('100')) if visitor_count > 0 else Decimal('0'))
                record.uv_value = float((payment_amount / visitor_count) if visitor_count > 0 else Decimal('0'))
                
                # 第二层计算：真实数据
                refund_amount = Decimal(str(record.refund_amount or 0))
                planting_amount = Decimal(str(record.planting_amount or 0))
                planting_orders = Decimal(str(record.planting_orders or 0))
                payment_product_count = Decimal(str(record.payment_product_count or 0))
                
                record.real_amount = payment_amount - refund_amount - planting_amount
                record.real_buyer_count = int(payment_buyer_count - planting_orders)
                record.real_product_count = int(payment_product_count - planting_orders)
                
                # 第三层计算：成本和费用
                record.product_cost = float((Decimal(str(record.real_product_count)) * Decimal('10')) + ((payment_product_count - payment_buyer_count) * Decimal('10')))
                record.real_order_deduction = float(record.real_amount * Decimal('0.08'))
                record.tax_invoice = float(payment_amount * Decimal('0.13'))
                record.real_order_logistics_cost = float(Decimal(str(record.real_product_count)) * Decimal('2.5'))
                record.real_conversion_rate = float((Decimal(str(record.real_buyer_count)) / visitor_count * Decimal('100')) if visitor_count > 0 else Decimal('0'))
                
                # 第四层计算：毛利
                planting_cost = Decimal(str(record.planting_cost or 0))
                planting_deduction = Decimal(str(record.planting_deduction or 0))
                planting_logistics_cost = Decimal(str(record.planting_logistics_cost or 0))
                keyword_promotion = Decimal(str(record.keyword_promotion or 0))
                sitewide_promotion = Decimal(str(record.sitewide_promotion or 0))
                product_operation = Decimal(str(record.product_operation or 0))
                crowd_promotion = Decimal(str(record.crowd_promotion or 0))
                super_short_video = Decimal(str(record.super_short_video or 0))
                multi_target_direct = Decimal(str(record.multi_target_direct or 0))
                
                # 计算毛利
                gross_profit = (
                    Decimal(str(record.real_amount)) -
                    Decimal(str(record.product_cost)) -
                    Decimal(str(record.real_order_deduction)) -
                    Decimal(str(record.tax_invoice)) -
                    Decimal(str(record.real_order_logistics_cost)) -
                    planting_cost -
                    planting_deduction -
                    planting_logistics_cost -
                    keyword_promotion -
                    sitewide_promotion -
                    product_operation -
                    crowd_promotion -
                    super_short_video -
                    multi_target_direct
                )
                record.gross_profit = float(gross_profit)
                
                # 确保real_amount也是float
                record.real_amount = float(record.real_amount)

                # 添加更新时间
                record.updated_at = datetime.utcnow()

                # 确保所有计算结果都被保存到数据库
                db.session.execute(
                    text("""
                    UPDATE product_data_merge 
                    SET conversion_rate = :conversion_rate,
                        favorite_rate = :favorite_rate,
                        cart_rate = :cart_rate,
                        uv_value = :uv_value,
                        real_conversion_rate = :real_conversion_rate,
                        real_amount = :real_amount,
                        real_buyer_count = :real_buyer_count,
                        real_product_count = :real_product_count,
                        product_cost = :product_cost,
                        real_order_deduction = :real_order_deduction,
                        tax_invoice = :tax_invoice,
                        real_order_logistics_cost = :real_order_logistics_cost,
                        gross_profit = :gross_profit,
                        updated_at = :updated_at
                    WHERE id = :id
                    """),
                    {
                        'id': record.id,
                        'conversion_rate': record.conversion_rate,
                        'favorite_rate': record.favorite_rate,
                        'cart_rate': record.cart_rate,
                        'uv_value': record.uv_value,
                        'real_conversion_rate': record.real_conversion_rate,
                        'real_amount': record.real_amount,
                        'real_buyer_count': record.real_buyer_count,
                        'real_product_count': record.real_product_count,
                        'product_cost': record.product_cost,
                        'real_order_deduction': record.real_order_deduction,
                        'tax_invoice': record.tax_invoice,
                        'real_order_logistics_cost': record.real_order_logistics_cost,
                        'gross_profit': record.gross_profit,
                        'updated_at': record.updated_at
                    }
                )

                # 详细日志记录
                app.logger.info(f"计算结果 - {record.tmall_product_code}:")
                app.logger.info(f"  基础数据: 访客={visitor_count}, 订单={payment_buyer_count}, 金额={payment_amount}")
                app.logger.info(f"  转化率: {record.conversion_rate}%")
                app.logger.info(f"  真实金额: {record.real_amount}")
                app.logger.info(f"  真实订单: {record.real_buyer_count}")
                app.logger.info(f"  真实件数: {record.real_product_count}")
                app.logger.info(f"  毛利: {record.gross_profit}")
                app.logger.info(f"  记录ID: {record.id}")
                
                summary_count += 1
                
                # 添加日志记录
                app.logger.info(f"最终汇总计算 - 商品编码: {record.tmall_product_code}")
                app.logger.info(f"  真实金额: {record.real_amount}")
                app.logger.info(f"  真实买家数: {record.real_buyer_count}")
                app.logger.info(f"  毛利: {record.gross_profit}")
            
            except Exception as e:
                app.logger.error(f"计算记录时出错: {str(e)}")
                continue
        
        # 提交数据库更改
        db.session.commit()
        
        return jsonify({
            'message': f'最终汇总计算完成，更新了 {summary_count} 条记录',
            'count': summary_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"最终汇总计算失败: {str(e)}")
        return jsonify({'message': f'计算失败: {str(e)}'}), 500

if __name__ == '__main__':
    # 初始化数据库
    if init_database():
        # 启动Flask应用
        app.run(host='0.0.0.0', port=5000, debug=True)
    else:
        print("应用启动失败：无法连接数据库")
        exit(1) 