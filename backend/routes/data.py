import io
import pandas as pd
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text
from datetime import datetime
from models import db, User, ProductData, ProductDataMerge, SubjectReport, OrderDetailsMerge
from utils import format_decimal

data_bp = Blueprint('data', __name__)

@data_bp.route('/data', methods=['GET'])
@jwt_required()
def get_data():
    """获取数据列表（仅管理员可访问）"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足'}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    upload_date = request.args.get('upload_date')
    tmall_product_code = request.args.get('tmall_product_code')
    product_name = request.args.get('product_name')
    tmall_supplier_name = request.args.get('tmall_supplier_name')
    sort_by = request.args.get('sort_by', 'upload_date')  # 默认按上传日期排序
    sort_order = request.args.get('sort_order', 'desc')   # 默认倒序
    
    query = ProductDataMerge.query
    
    if upload_date:
        query = query.filter(ProductDataMerge.upload_date == upload_date)
    
    if tmall_product_code:
        query = query.filter(ProductDataMerge.tmall_product_code.ilike(f'%{tmall_product_code}%'))
    
    if product_name:
        query = query.filter(ProductDataMerge.product_name.ilike(f'%{product_name}%'))
    
    if tmall_supplier_name:
        query = query.filter(ProductDataMerge.tmall_supplier_name.ilike(f'%{tmall_supplier_name}%'))
    
    # 动态排序
    # 定义可排序的字段映射，确保安全性
    sortable_fields = {
        'upload_date': ProductDataMerge.upload_date,
        'tmall_product_code': ProductDataMerge.tmall_product_code,
        'product_name': ProductDataMerge.product_name,
        'tmall_supplier_name': ProductDataMerge.tmall_supplier_name,
        'listing_time': ProductDataMerge.listing_time,
        'payment_buyer_count': ProductDataMerge.payment_buyer_count,
        'payment_product_count': ProductDataMerge.payment_product_count,
        'payment_amount': ProductDataMerge.payment_amount,
        'refund_amount': ProductDataMerge.refund_amount,
        'visitor_count': ProductDataMerge.visitor_count,
        'search_guided_visitors': ProductDataMerge.search_guided_visitors,
        'favorite_count': ProductDataMerge.favorite_count,
        'add_to_cart_count': ProductDataMerge.add_to_cart_count,
        'conversion_rate': ProductDataMerge.conversion_rate,
        'favorite_rate': ProductDataMerge.favorite_rate,
        'cart_rate': ProductDataMerge.cart_rate,
        'uv_value': ProductDataMerge.uv_value,
        'real_conversion_rate': ProductDataMerge.real_conversion_rate,
        'real_amount': ProductDataMerge.real_amount,
        'real_buyer_count': ProductDataMerge.payment_buyer_count,
        'real_product_count': ProductDataMerge.payment_product_count,
        'product_cost': ProductDataMerge.product_cost,
        'real_order_deduction': ProductDataMerge.real_order_deduction,
        'tax_invoice': ProductDataMerge.tax_invoice,
        'real_order_logistics_cost': ProductDataMerge.real_order_logistics_cost,
        'planting_orders': ProductDataMerge.planting_orders,
        'planting_amount': ProductDataMerge.planting_amount,
        'planting_cost': ProductDataMerge.planting_cost,
        'planting_deduction': ProductDataMerge.planting_deduction,
        'planting_logistics_cost': ProductDataMerge.planting_logistics_cost,
        'keyword_promotion': ProductDataMerge.keyword_promotion,
        'sitewide_promotion': ProductDataMerge.sitewide_promotion,
        'product_operation': ProductDataMerge.product_operation,
        'crowd_promotion': ProductDataMerge.crowd_promotion,
        'super_short_video': ProductDataMerge.super_short_video,
        'multi_target_direct': ProductDataMerge.multi_target_direct,
        'gross_profit': ProductDataMerge.gross_profit
    }
    
    # 应用排序
    if sort_by in sortable_fields:
        sort_field = sortable_fields[sort_by]
        if sort_order.lower() == 'asc':
            query = query.order_by(sort_field.asc(), ProductDataMerge.id.asc())
        else:  # 默认desc
            query = query.order_by(sort_field.desc(), ProductDataMerge.id.desc())
    else:
        # 如果排序字段无效，使用默认排序
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
            'tmall_supplier_name': item.tmall_supplier_name,
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

@data_bp.route('/export-data', methods=['GET'])
@jwt_required()
def export_data():
    """导出数据列表到Excel（仅管理员可访问）"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足'}), 403
    
    try:
        # 获取查询参数
        upload_date = request.args.get('upload_date')
        tmall_product_code = request.args.get('tmall_product_code')
        product_name = request.args.get('product_name')
        tmall_supplier_name = request.args.get('tmall_supplier_name')
        sort_by = request.args.get('sort_by', 'upload_date')  # 默认按上传日期排序
        sort_order = request.args.get('sort_order', 'desc')   # 默认倒序
        
        # 构建查询
        query = ProductDataMerge.query
        
        if upload_date:
            query = query.filter(ProductDataMerge.upload_date == upload_date)
        
        if tmall_product_code:
            query = query.filter(ProductDataMerge.tmall_product_code.like(f'%{tmall_product_code}%'))
        
        if product_name:
            query = query.filter(ProductDataMerge.product_name.like(f'%{product_name}%'))
        
        if tmall_supplier_name:
            query = query.filter(ProductDataMerge.tmall_supplier_name.like(f'%{tmall_supplier_name}%'))
        
        # 动态排序（与数据列表API相同的逻辑）
        sortable_fields = {
            'upload_date': ProductDataMerge.upload_date,
            'tmall_product_code': ProductDataMerge.tmall_product_code,
            'product_name': ProductDataMerge.product_name,
            'tmall_supplier_name': ProductDataMerge.tmall_supplier_name,
            'listing_time': ProductDataMerge.listing_time,
            'payment_buyer_count': ProductDataMerge.payment_buyer_count,
            'payment_product_count': ProductDataMerge.payment_product_count,
            'payment_amount': ProductDataMerge.payment_amount,
            'refund_amount': ProductDataMerge.refund_amount,
            'visitor_count': ProductDataMerge.visitor_count,
            'search_guided_visitors': ProductDataMerge.search_guided_visitors,
            'favorite_count': ProductDataMerge.favorite_count,
            'add_to_cart_count': ProductDataMerge.add_to_cart_count,
            'conversion_rate': ProductDataMerge.conversion_rate,
            'favorite_rate': ProductDataMerge.favorite_rate,
            'cart_rate': ProductDataMerge.cart_rate,
            'uv_value': ProductDataMerge.uv_value,
            'real_conversion_rate': ProductDataMerge.real_conversion_rate,
            'real_amount': ProductDataMerge.real_amount,
            'real_buyer_count': ProductDataMerge.payment_buyer_count,
            'real_product_count': ProductDataMerge.payment_product_count,
            'product_cost': ProductDataMerge.product_cost,
            'real_order_deduction': ProductDataMerge.real_order_deduction,
            'tax_invoice': ProductDataMerge.tax_invoice,
            'real_order_logistics_cost': ProductDataMerge.real_order_logistics_cost,
            'planting_orders': ProductDataMerge.planting_orders,
            'planting_amount': ProductDataMerge.planting_amount,
            'planting_cost': ProductDataMerge.planting_cost,
            'planting_deduction': ProductDataMerge.planting_deduction,
            'planting_logistics_cost': ProductDataMerge.planting_logistics_cost,
            'keyword_promotion': ProductDataMerge.keyword_promotion,
            'sitewide_promotion': ProductDataMerge.sitewide_promotion,
            'product_operation': ProductDataMerge.product_operation,
            'crowd_promotion': ProductDataMerge.crowd_promotion,
            'super_short_video': ProductDataMerge.super_short_video,
            'multi_target_direct': ProductDataMerge.multi_target_direct,
            'gross_profit': ProductDataMerge.gross_profit
        }
        
        # 应用排序
        if sort_by in sortable_fields:
            sort_field = sortable_fields[sort_by]
            if sort_order.lower() == 'asc':
                query = query.order_by(sort_field.asc(), ProductDataMerge.id.asc())
            else:  # 默认desc
                query = query.order_by(sort_field.desc(), ProductDataMerge.id.desc())
        else:
            # 如果排序字段无效，使用默认排序
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
                '店铺名': item.tmall_supplier_name or '',
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
        current_app.logger.error(f'导出数据时出错: {str(e)}')
        return jsonify({'message': f'导出失败: {str(e)}'}), 500

@data_bp.route('/merge-data', methods=['GET'])
@jwt_required()
def get_merge_data():
    """获取merge数据列表（仅管理员可访问）"""
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

@data_bp.route('/subject-report', methods=['GET'])
@jwt_required()
def get_subject_report():
    """获取主体报表数据列表（仅管理员可访问）"""
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
            
            # CSV实际字段映射
            'date_field': item.date_field.isoformat() if item.date_field else None,
            'scene_id': item.scene_id,
            'scene_name': item.scene_name,
            'original_scene_id': item.original_scene_id,
            'original_scene_name': item.original_scene_name,
            'plan_id': item.plan_id,
            'plan_name': item.plan_name,
            'subject_id': item.subject_id,
            'subject_type': item.subject_type,
            'subject_name': item.subject_name,
            
            # 展现和点击数据
            'impressions': item.impressions,
            'clicks': item.clicks,
            'cost': item.cost,
            'ctr': item.ctr,
            'avg_cpc': item.avg_cpc,
            'cpm': item.cpm,
            
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

@data_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """获取统计信息"""
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

@data_bp.route('/platforms', methods=['GET'])
@jwt_required()
def get_platforms():
    """获取平台列表"""
    platforms = db.session.query(ProductData.platform).distinct().all()
    return jsonify([p[0] for p in platforms])

@data_bp.route('/suppliers', methods=['GET'])
@jwt_required()
def get_suppliers():
    """获取供应商列表"""
    suppliers = db.session.query(ProductData.tmall_supplier_name).distinct().filter(ProductData.tmall_supplier_name.isnot(None)).all()
    return jsonify([s[0] for s in suppliers])

@data_bp.route('/upload-dates', methods=['GET'])
@jwt_required()
def get_upload_dates():
    """获取上传日期列表"""
    dates = db.session.query(ProductData.upload_date).distinct().order_by(ProductData.upload_date.desc()).all()
    return jsonify([d[0].isoformat() for d in dates if d[0]])

@data_bp.route('/product-trend/<tmall_product_code>', methods=['GET'])
@jwt_required()
def get_product_trend(tmall_product_code):
    """获取特定商品的趋势数据（最近30天）"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足'}), 403
    
    try:
        from datetime import datetime, timedelta
        
        # 计算30天前的日期
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)
        
        # 查询该商品最近30天的数据
        trend_data = ProductDataMerge.query.filter(
            ProductDataMerge.tmall_product_code == tmall_product_code,
            ProductDataMerge.upload_date >= start_date,
            ProductDataMerge.upload_date <= end_date
        ).order_by(ProductDataMerge.upload_date.asc()).all()
        
        if not trend_data:
            return jsonify({
                'message': f'未找到天猫ID为 {tmall_product_code} 的商品数据',
                'product_code': tmall_product_code,
                'data': []
            }), 404
        
        # 组织返回数据
        result = []
        product_name = trend_data[0].product_name  # 获取商品名称
        
        for item in trend_data:
            result.append({
                'date': item.upload_date.isoformat(),
                'search_guided_visitors': item.search_guided_visitors or 0,  # 搜索引导访客数
                'add_to_cart_count': item.add_to_cart_count or 0,  # 加购件数
                'real_amount': float(item.real_amount) if item.real_amount else 0,  # 真实金额
                'real_buyer_count': item.payment_buyer_count or 0,  # 真实买家数
                'real_conversion_rate': float(item.real_conversion_rate) if item.real_conversion_rate else 0,  # 真实转化率
                
                # 其他可选字段
                'visitor_count': item.visitor_count or 0,  # 访客数
                'page_views': item.page_views or 0,  # 浏览量
                'favorite_count': item.favorite_count or 0,  # 收藏人数
                'payment_amount': float(item.payment_amount) if item.payment_amount else 0,  # 支付金额
                'payment_product_count': item.payment_product_count or 0,  # 支付商品件数
                'payment_buyer_count': item.payment_buyer_count or 0,  # 支付买家数
                'unit_price': float(item.unit_price) if item.unit_price else 0,  # 客单价
                'visitor_average_value': float(item.visitor_average_value) if item.visitor_average_value else 0,  # 访客平均价值
                'payment_conversion_rate': float(item.payment_conversion_rate) if item.payment_conversion_rate else 0,  # 支付转化率
                'order_conversion_rate': float(item.order_conversion_rate) if item.order_conversion_rate else 0,  # 下单转化率
                'refund_amount': float(item.refund_amount) if item.refund_amount else 0,  # 退款金额
                'refund_ratio': float(item.refund_ratio) if item.refund_ratio else 0,  # 退款占比
                'conversion_rate': float(item.conversion_rate) if item.conversion_rate else 0,  # 转化率
                'favorite_rate': float(item.favorite_rate) if item.favorite_rate else 0,  # 收藏率
                'cart_rate': float(item.cart_rate) if item.cart_rate else 0,  # 加购率
                'uv_value': float(item.uv_value) if item.uv_value else 0,  # UV价值
                'product_cost': float(item.product_cost) if item.product_cost else 0,  # 产品成本
                'gross_profit': float(item.gross_profit) if item.gross_profit else 0,  # 毛利
            })
        
        return jsonify({
            'product_code': tmall_product_code,
            'product_name': product_name,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'data_count': len(result),
            'data': result
        })
        
    except Exception as e:
        current_app.logger.error(f'获取商品趋势数据时出错: {str(e)}')
        return jsonify({'message': f'获取趋势数据失败: {str(e)}'}), 500 

@data_bp.route('/order-details', methods=['GET'])
@jwt_required()
def get_order_details():
    """获取订单详情数据列表（仅管理员可访问）"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足'}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    sort_by = request.args.get('sort_by', 'order_time')
    sort_order = request.args.get('sort_order', 'desc')
    
    # 过滤参数
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    store_name = request.args.get('store_name')
    
    query = OrderDetailsMerge.query
    
    # 日期区间过滤
    if start_date:
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(db.func.date(OrderDetailsMerge.order_time) >= start_date)
        except ValueError:
            return jsonify({'message': '开始日期格式错误，请使用YYYY-MM-DD格式'}), 400
    
    if end_date:
        try:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(db.func.date(OrderDetailsMerge.order_time) <= end_date)
        except ValueError:
            return jsonify({'message': '结束日期格式错误，请使用YYYY-MM-DD格式'}), 400
    
    # 店铺名称过滤
    if store_name:
        query = query.filter(OrderDetailsMerge.store_name.ilike(f'%{store_name}%'))
    
    # 排序
    if sort_order == 'desc':
        sort_column = getattr(OrderDetailsMerge, sort_by, OrderDetailsMerge.order_time).desc()
    else:
        sort_column = getattr(OrderDetailsMerge, sort_by, OrderDetailsMerge.order_time).asc()
    
    query = query.order_by(sort_column)
    
    pagination = query.paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    data = []
    for item in pagination.items:
        data.append({
            'id': item.id,
            'order_details_id': item.order_details_id,
            'internal_order_number': item.internal_order_number,
            'online_order_number': item.online_order_number,
            'store_code': item.store_code,
            'store_name': item.store_name,
            'order_time': item.order_time.isoformat() if item.order_time else None,
            'payment_date': item.payment_date.isoformat() if item.payment_date else None,
            'shipping_date': item.shipping_date.isoformat() if item.shipping_date else None,
            'payable_amount': float(item.payable_amount) if item.payable_amount else 0,
            'paid_amount': float(item.paid_amount) if item.paid_amount else 0,
            'express_company': item.express_company,
            'tracking_number': item.tracking_number,
            'province': item.province,
            'city': item.city,
            'district': item.district,
            'product_code': item.product_code,
            'product_name': item.product_name,
            'quantity': item.quantity,
            'unit_price': float(item.unit_price) if item.unit_price else 0,
            'product_amount': float(item.product_amount) if item.product_amount else 0,
            'payment_number': item.payment_number,
            'image_url': item.image_url,
                         'store_style_code': item.store_style_code,
             'upload_date': item.upload_date.isoformat() if item.upload_date else None,
             'operation_cost_supply_price': float(item.operation_cost_supply_price) if item.operation_cost_supply_price else 0,
             'product_list_operator': item.product_list_operator,
        })
    
    return jsonify({
        'data': data,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'per_page': pagination.per_page
    })

@data_bp.route('/store-summary', methods=['GET'])
@jwt_required()
def get_store_summary():
    """获取指定店铺在指定日期的汇总信息（仅管理员可访问）"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足'}), 403
    
    store_name = request.args.get('store_name')
    target_date = request.args.get('target_date')
    
    if not store_name or not target_date:
        return jsonify({'message': '请提供店铺名称和目标日期'}), 400
    
    try:
        target_date = datetime.strptime(target_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': '日期格式错误，请使用YYYY-MM-DD格式'}), 400
    
    # 查询该店铺在指定日期的所有订单
    orders = OrderDetailsMerge.query.filter(
        OrderDetailsMerge.store_name == store_name,
        db.func.date(OrderDetailsMerge.upload_date) == target_date
    ).all()
    
    if not orders:
        return jsonify({
            'message': f'未找到店铺 {store_name} 在 {target_date} 的订单数据',
            'order_count': 0,
            'total_sales': 0,
            'total_cost': 0,
            'profit': 0
        })
    
    # 统计数据
    unique_orders = set()
    total_sales = 0
    total_cost = 0
    
    for order in orders:
        # 订单数量（去重）
        if order.online_order_number:
            unique_orders.add(order.online_order_number)
        
        # 销售金额
        if order.product_amount:
            total_sales += float(order.product_amount)
        
        # 总成本
        if order.operation_cost_supply_price and order.quantity:
            total_cost += float(order.operation_cost_supply_price) * order.quantity
    
    # 利润
    profit = total_sales - total_cost
    
    return jsonify({
        'store_name': store_name,
        'target_date': target_date.isoformat(),
        'order_count': len(unique_orders),
        'total_sales': round(total_sales, 2),
        'total_cost': round(total_cost, 2),
        'profit': round(profit, 2)
    })

@data_bp.route('/operator-summary', methods=['GET'])
@jwt_required()
def get_operator_summary():
    """获取指定操作人在指定店铺和日期的汇总信息（仅管理员可访问）"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足'}), 403
    
    store_name = request.args.get('store_name')
    operator = request.args.get('operator')
    target_date = request.args.get('target_date')
    
    if not store_name or not operator or not target_date:
        return jsonify({'message': '请提供店铺名称、操作人和目标日期'}), 400
    
    try:
        target_date = datetime.strptime(target_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': '日期格式错误，请使用YYYY-MM-DD格式'}), 400
    
    # 查询该操作人在指定店铺和日期的所有订单
    orders = OrderDetailsMerge.query.filter(
        OrderDetailsMerge.store_name == store_name,
        OrderDetailsMerge.product_list_operator == operator,
        db.func.date(OrderDetailsMerge.upload_date) == target_date
    ).all()
    
    if not orders:
        return jsonify({
            'message': f'未找到操作人 {operator} 在店铺 {store_name} 于 {target_date} 的订单数据',
            'store_name': store_name,
            'operator': operator,
            'order_count': 0,
            'total_sales': 0,
            'total_cost': 0,
            'profit': 0
        })
    
    # 统计数据
    unique_orders = set()
    total_sales = 0
    total_cost = 0
    
    for order in orders:
        # 订单数量（去重）
        if order.online_order_number:
            unique_orders.add(order.online_order_number)
        
        # 销售金额
        if order.product_amount:
            total_sales += float(order.product_amount)
        
        # 总成本
        if order.operation_cost_supply_price and order.quantity:
            total_cost += float(order.operation_cost_supply_price) * order.quantity
    
    # 利润
    profit = total_sales - total_cost
    
    return jsonify({
        'store_name': store_name,
        'operator': operator,
        'target_date': target_date.isoformat(),
        'order_count': len(unique_orders),
        'total_sales': round(total_sales, 2),
        'total_cost': round(total_cost, 2),
        'profit': round(profit, 2)
    }) 