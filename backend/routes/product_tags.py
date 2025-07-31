from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_
from models import db, User, ProductList
from datetime import datetime
import json

product_tags_bp = Blueprint('product_tags', __name__)

@product_tags_bp.route('/product-tags', methods=['GET'])
@jwt_required()
def get_product_tags():
    """获取产品标签列表（仅管理员可访问）"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足'}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    # 获取搜索过滤参数
    product_id = request.args.get('product_id', '').strip()
    product_name = request.args.get('product_name', '').strip()
    listing_time = request.args.get('listing_time', '').strip()
    tmall_supplier_id = request.args.get('tmall_supplier_id', '').strip()
    operator = request.args.get('operator', '').strip()
    
    # 排序参数
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')
    
    # 构建查询
    query = ProductList.query
    
    # 应用搜索过滤
    if product_id:
        query = query.filter(ProductList.product_id.ilike(f'%{product_id}%'))
    
    if product_name:
        query = query.filter(ProductList.product_name.ilike(f'%{product_name}%'))
    
    if listing_time:
        query = query.filter(ProductList.listing_time == listing_time)
    
    if tmall_supplier_id:
        query = query.filter(ProductList.tmall_supplier_id.ilike(f'%{tmall_supplier_id}%'))
    
    if operator:
        query = query.filter(ProductList.operator.ilike(f'%{operator}%'))
    
    # 动态排序
    sort_column = getattr(ProductList, sort_by, ProductList.created_at)
    if sort_order.lower() == 'desc':
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # 分页
    pagination = query.paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    # 构建响应数据
    data = []
    for item in pagination.items:
        data.append({
            'id': item.id,
            'product_id': item.product_id,
            'product_name': item.product_name,
            'listing_time': item.listing_time.strftime('%Y-%m-%d') if item.listing_time else None,
            'tmall_supplier_id': item.tmall_supplier_id,
            'operator': item.operator,
            'action_list': item.action_list if item.action_list else [],
            'created_at': item.created_at.strftime('%Y-%m-%d %H:%M:%S') if item.created_at else None,
            'updated_at': item.updated_at.strftime('%Y-%m-%d %H:%M:%S') if item.updated_at else None
        })
    
    return jsonify({
        'data': data,
        'current_page': pagination.page,
        'pages': pagination.pages,
        'per_page': pagination.per_page,
        'total': pagination.total,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    })

@product_tags_bp.route('/product-tags/<int:product_id>/actions', methods=['PUT'])
@jwt_required()
def update_product_actions(product_id):
    """更新产品的活动列表（仅管理员可访问）"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足'}), 403
    
    # 获取产品记录
    product = db.session.get(ProductList, product_id)
    if not product:
        return jsonify({'message': '产品不存在'}), 404
    
    # 获取请求数据
    data = request.get_json()
    if not data or 'action_list' not in data:
        return jsonify({'message': '缺少action_list参数'}), 400
    
    action_list = data['action_list']
    
    # 验证action_list格式
    if not isinstance(action_list, list):
        return jsonify({'message': 'action_list必须是数组格式'}), 400
    
    # 验证每个活动的格式
    for action in action_list:
        if not isinstance(action, dict):
            return jsonify({'message': '活动项必须是对象格式'}), 400
        
        if 'name' not in action or 'start_date' not in action or 'end_date' not in action:
            return jsonify({'message': '活动项必须包含name、start_date、end_date字段'}), 400
        
        # 验证日期格式
        try:
            datetime.strptime(action['start_date'], '%Y-%m-%d')
            datetime.strptime(action['end_date'], '%Y-%m-%d')
        except ValueError:
            return jsonify({'message': '日期格式错误，应为YYYY-MM-DD'}), 400
    
    try:
        # 更新产品的action_list
        product.action_list = action_list
        product.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': '活动列表更新成功',
            'data': {
                'id': product.id,
                'product_id': product.product_id,
                'product_name': product.product_name,
                'action_list': product.action_list,
                'updated_at': product.updated_at.strftime('%Y-%m-%d %H:%M:%S')
            }
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'更新失败: {str(e)}'}), 500

@product_tags_bp.route('/product-tags/<int:product_id>', methods=['GET'])
@jwt_required()
def get_product_tag_detail(product_id):
    """获取单个产品的详细信息（仅管理员可访问）"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足'}), 403
    
    product = db.session.get(ProductList, product_id)
    if not product:
        return jsonify({'message': '产品不存在'}), 404
    
    return jsonify({
        'data': {
            'id': product.id,
            'product_id': product.product_id,
            'product_name': product.product_name,
            'listing_time': product.listing_time.strftime('%Y-%m-%d') if product.listing_time else None,
            'tmall_supplier_id': product.tmall_supplier_id,
            'operator': product.operator,
            'action_list': product.action_list if product.action_list else [],
            'created_at': product.created_at.strftime('%Y-%m-%d %H:%M:%S') if product.created_at else None,
            'updated_at': product.updated_at.strftime('%Y-%m-%d %H:%M:%S') if product.updated_at else None
        }
    }) 