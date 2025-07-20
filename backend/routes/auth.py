from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """用户注册"""
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

@auth_bp.route('/login', methods=['POST'])
def login():
    """用户登录"""
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

@auth_bp.route('/user', methods=['GET'])
@jwt_required()
def get_user():
    """获取用户信息"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role
    })

@auth_bp.route('/user-stats', methods=['GET'])
@jwt_required()
def get_user_stats():
    """获取用户上传统计"""
    from models import ProductData
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