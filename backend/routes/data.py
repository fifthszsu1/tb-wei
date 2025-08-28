import io
import pandas as pd
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text, or_
from datetime import datetime, date
import json
from models import db, User, ProductData, ProductDataMerge, SubjectReport, OrderDetailsMerge, ProductList
from utils import format_decimal, handle_db_connection_error

data_bp = Blueprint('data', __name__)

def get_matching_activities(action_list, upload_date):
    """
    根据上传日期获取匹配的活动
    
    Args:
        action_list: 活动列表(JSON数据)
        upload_date: 上传日期
    
    Returns:
        list: 匹配的活动名称列表，每个活动名称可能带有状态标识（如"预热中"、"活动中"）
    """
    if not action_list or not upload_date:
        return []
    
    try:
        # 如果action_list是字符串，解析为JSON
        if isinstance(action_list, str):
            activities = json.loads(action_list)
        else:
            activities = action_list
            
        if not isinstance(activities, list):
            return []
        
        matching_activities = []
        upload_date_obj = upload_date if isinstance(upload_date, date) else datetime.strptime(upload_date, '%Y-%m-%d').date()
        
        for activity in activities:
            if not isinstance(activity, dict):
                continue
                
            activity_name = activity.get('name')
            
            # 获取时间信息，优先使用新格式（包含时分），其次使用旧格式（只有日期）
            start_time_str = activity.get('start_time') or activity.get('start_date')
            end_time_str = activity.get('end_time') or activity.get('end_date')
            warmup_time_str = activity.get('warmup_time')
            
            if not all([activity_name, start_time_str, end_time_str]):
                continue
            
            try:
                # 解析开始和结束时间
                if 'T' in start_time_str:  # 新格式：包含时分
                    start_datetime = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
                    start_date = start_datetime.date()
                else:  # 旧格式：只有日期
                    start_date = datetime.strptime(start_time_str, '%Y-%m-%d').date()
                
                if 'T' in end_time_str:  # 新格式：包含时分
                    end_datetime = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
                    end_date = end_datetime.date()
                else:  # 旧格式：只有日期
                    end_date = datetime.strptime(end_time_str, '%Y-%m-%d').date()
                
                # 解析预热时间（如果有）
                warmup_date = None
                if warmup_time_str:
                    if 'T' in warmup_time_str:
                        warmup_datetime = datetime.fromisoformat(warmup_time_str.replace('Z', '+00:00'))
                        warmup_date = warmup_datetime.date()
                    else:
                        warmup_date = datetime.strptime(warmup_time_str, '%Y-%m-%d').date()
                
                # 判断上传日期所处的活动阶段
                activity_display_name = activity_name
                
                if warmup_date and warmup_date <= upload_date_obj < start_date:
                    # 在预热期间
                    activity_display_name = f"{activity_name} 预热中"
                    matching_activities.append(activity_display_name)
                elif start_date <= upload_date_obj <= end_date:
                    # 在活动期间
                    activity_display_name = f"{activity_name} 活动中"
                    matching_activities.append(activity_display_name)
                    
            except (ValueError, TypeError):
                # 日期格式错误，跳过此活动
                continue
                
        return matching_activities
        
    except (json.JSONDecodeError, ValueError, TypeError):
        return []

@data_bp.route('/data', methods=['GET'])
@jwt_required()
@handle_db_connection_error(max_retries=3, retry_delay=2)
def get_data():
    """获取数据列表（所有用户可访问）"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    # 移除权限检查，允许所有用户访问
    # if user.role != 'admin':
    #     return jsonify({'message': '权限不足'}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    upload_start_date = request.args.get('upload_start_date')
    upload_end_date = request.args.get('upload_end_date')
    tmall_product_code = request.args.get('tmall_product_code')
    product_name = request.args.get('product_name')
    tmall_supplier_name = request.args.get('tmall_supplier_name')
    sort_by = request.args.get('sort_by', 'upload_date')  # 默认按上传日期排序
    sort_order = request.args.get('sort_order', 'desc')   # 默认倒序
    
    # 关联查询product_list表以获取action_list
    query = db.session.query(ProductDataMerge, ProductList.action_list).outerjoin(
        ProductList, 
        ProductDataMerge.tmall_product_code == ProductList.product_id
    )
    
    # 日期区间过滤
    if upload_start_date:
        try:
            start_date = datetime.strptime(upload_start_date, '%Y-%m-%d').date()
            query = query.filter(ProductDataMerge.upload_date >= start_date)
        except ValueError:
            return jsonify({'message': '开始日期格式错误，请使用YYYY-MM-DD格式'}), 400
    
    if upload_end_date:
        try:
            end_date = datetime.strptime(upload_end_date, '%Y-%m-%d').date()
            query = query.filter(ProductDataMerge.upload_date <= end_date)
        except ValueError:
            return jsonify({'message': '结束日期格式错误，请使用YYYY-MM-DD格式'}), 400
    
    # 验证日期区间的合理性
    if upload_start_date and upload_end_date:
        try:
            start_date = datetime.strptime(upload_start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(upload_end_date, '%Y-%m-%d').date()
            if start_date > end_date:
                return jsonify({'message': '开始日期不能晚于结束日期'}), 400
        except ValueError:
            pass  # 错误已在上面处理
    
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
    
    # 由于我们现在使用的是联合查询，需要从查询中创建子查询然后分页
    # 首先构建基础查询，然后应用分页
    total_query = query
    
    # 应用分页（注意：由于我们使用的是复合查询，需要用offset/limit而不是paginate）
    offset = (page - 1) * per_page
    items = query.offset(offset).limit(per_page).all()
    
    # 计算总数（需要从原始联合查询计算）
    total = total_query.count()
    
    data = []
    for item_data, action_list in items:
        # 计算匹配的活动
        matching_activities = get_matching_activities(action_list, item_data.upload_date)
        participating_activities = ', '.join(matching_activities) if matching_activities else ''
        
        # 直接使用数据库中存储的值
        real_amount = format_decimal(item_data.real_amount)
        conversion_rate = format_decimal(item_data.conversion_rate)
        favorite_rate = format_decimal(item_data.favorite_rate)
        cart_rate = format_decimal(item_data.cart_rate)
        uv_value = format_decimal(item_data.uv_value)
        real_conversion_rate = format_decimal(item_data.real_conversion_rate)
        product_cost = format_decimal(item_data.product_cost)
        real_order_deduction = format_decimal(item_data.real_order_deduction)
        tax_invoice = format_decimal(item_data.tax_invoice)
        real_order_logistics_cost = format_decimal(item_data.real_order_logistics_cost)
        gross_profit = format_decimal(item_data.gross_profit)
        
        data.append({
            'id': item_data.id,
            'upload_date': item_data.upload_date.isoformat() if item_data.upload_date else None,
            'tmall_product_code': item_data.tmall_product_code,
            'product_name': item_data.product_name,
            'participating_activities': participating_activities,  # 新增参与活动字段
            'tmall_supplier_name': item_data.tmall_supplier_name,
            'listing_time': item_data.listing_time.isoformat() if item_data.listing_time else None,
            'product_list_operator': item_data.product_list_operator,  # 链接负责人
            'product_list_image': item_data.product_list_image,  # 链接主图
            'payment_buyer_count': item_data.payment_buyer_count,
            'payment_product_count': item_data.payment_product_count,
            'payment_amount': format_decimal(item_data.payment_amount),
            'refund_amount': format_decimal(item_data.refund_amount),
            'visitor_count': item_data.visitor_count,
            'search_guided_visitors': item_data.search_guided_visitors,
            'favorite_count': item_data.favorite_count,
            'add_to_cart_count': item_data.add_to_cart_count,
            'conversion_rate': conversion_rate,
            'favorite_rate': favorite_rate,
            'cart_rate': cart_rate,
            'uv_value': uv_value,
            'real_conversion_rate': real_conversion_rate,
            'real_amount': real_amount,
            'real_buyer_count': item_data.payment_buyer_count,
            'real_product_count': item_data.payment_product_count,
            'product_cost': product_cost,
            'real_order_deduction': real_order_deduction,
            'tax_invoice': tax_invoice,
            'real_order_logistics_cost': real_order_logistics_cost,
            'planting_orders': format_decimal(item_data.planting_orders),
            'planting_amount': format_decimal(item_data.planting_amount),
            'planting_cost': format_decimal(item_data.planting_cost),
            'planting_deduction': format_decimal(item_data.planting_deduction),
            'planting_logistics_cost': format_decimal(item_data.planting_logistics_cost),
            'keyword_promotion': format_decimal(item_data.keyword_promotion),
            'sitewide_promotion': format_decimal(item_data.sitewide_promotion),
            'product_operation': format_decimal(item_data.product_operation),
            'crowd_promotion': format_decimal(item_data.crowd_promotion),
            'super_short_video': format_decimal(item_data.super_short_video),
            'multi_target_direct': format_decimal(item_data.multi_target_direct),
            'gross_profit': gross_profit
        })
    
    # 计算页面信息
    pages = (total + per_page - 1) // per_page  # 向上取整
    
    return jsonify({
        'data': data,
        'total': total,
        'pages': pages,
        'current_page': page,
        'per_page': per_page
    })

@data_bp.route('/export-data', methods=['GET'])
@jwt_required()
@handle_db_connection_error(max_retries=3, retry_delay=2)
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
@handle_db_connection_error(max_retries=3, retry_delay=2)
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
@handle_db_connection_error(max_retries=3, retry_delay=2)
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
    """获取门店销售统计信息（支持日期区间查询）"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    # 移除权限检查，允许所有用户访问
    # if user.role != 'admin':
    #     return jsonify({'message': '权限不足'}), 403
    
    # 获取日期参数
    start_date_param = request.args.get('start_date')
    end_date_param = request.args.get('end_date')
    
    try:
        if start_date_param and end_date_param:
            # 使用用户提供的日期区间
            start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
            
            # 验证日期区间的合理性
            if start_date > end_date:
                return jsonify({'message': '开始日期不能晚于结束日期'}), 400
                
        else:
            # 默认使用昨天的数据
            from datetime import timedelta
            yesterday = datetime.now().date() - timedelta(days=1)
            start_date = yesterday
            end_date = yesterday
        
        # 按门店统计销售数据
        store_stats = db.session.query(
            ProductDataMerge.tmall_supplier_name.label('store_name'),
            db.func.sum(ProductDataMerge.payment_amount).label('total_amount'),
            db.func.sum(ProductDataMerge.payment_product_count).label('total_quantity'),
            db.func.sum(ProductDataMerge.visitor_count).label('total_visitor_count'),
            db.func.sum(ProductDataMerge.payment_buyer_count).label('total_payment_buyer_count'),
            db.func.sum(ProductDataMerge.planting_orders).label('total_planting_orders'),
            db.func.sum(ProductDataMerge.planting_amount).label('total_planting_amount'),
            db.func.sum(ProductDataMerge.refund_amount).label('total_refund_amount'),
            db.func.sum(ProductDataMerge.sitewide_promotion).label('total_sitewide_promotion'),
            db.func.sum(ProductDataMerge.keyword_promotion).label('total_keyword_promotion'),
            db.func.sum(ProductDataMerge.product_operation).label('total_product_operation'),
            db.func.sum(ProductDataMerge.crowd_promotion).label('total_crowd_promotion'),
            db.func.sum(ProductDataMerge.super_short_video).label('total_super_short_video'),
            db.func.sum(ProductDataMerge.multi_target_direct).label('total_multi_target_direct'),
            db.func.count(ProductDataMerge.id).label('record_count')
        ).filter(
            ProductDataMerge.tmall_supplier_name.isnot(None),
            ProductDataMerge.upload_date >= start_date,
            ProductDataMerge.upload_date <= end_date
        ).group_by(ProductDataMerge.tmall_supplier_name).all()
        
        # 计算汇总数据
        total_amount = 0
        total_quantity = 0
        total_records = 0
        total_real_amount = 0
        store_data = []
        
        for store in store_stats:
            store_amount = float(store.total_amount) if store.total_amount else 0
            store_quantity = int(store.total_quantity) if store.total_quantity else 0
            store_visitor_count = int(store.total_visitor_count) if store.total_visitor_count else 0
            store_payment_buyer_count = int(store.total_payment_buyer_count) if store.total_payment_buyer_count else 0
            store_planting_orders = int(store.total_planting_orders) if store.total_planting_orders else 0
            store_planting_amount = float(store.total_planting_amount) if store.total_planting_amount else 0
            store_refund_amount = float(store.total_refund_amount) if store.total_refund_amount else 0
            store_sitewide_promotion = float(store.total_sitewide_promotion) if store.total_sitewide_promotion else 0
            store_keyword_promotion = float(store.total_keyword_promotion) if store.total_keyword_promotion else 0
            store_product_operation = float(store.total_product_operation) if store.total_product_operation else 0
            store_crowd_promotion = float(store.total_crowd_promotion) if store.total_crowd_promotion else 0
            store_super_short_video = float(store.total_super_short_video) if store.total_super_short_video else 0
            store_multi_target_direct = float(store.total_multi_target_direct) if store.total_multi_target_direct else 0
            
            # 计算真实销售金额 = 销售金额 - 退款金额 - 种菜金额
            store_real_amount = store_amount - store_refund_amount - store_planting_amount
            
            # 计算客单价（销售金额/销售件数）
            unit_price = store_amount / store_quantity if store_quantity > 0 else 0
            
            # 计算支付转化率（payment_buyer_count/visitor_count）
            payment_conversion_rate = (store_payment_buyer_count / store_visitor_count * 100) if store_visitor_count > 0 else 0
            
            # 计算推广总金额
            total_promotion = (store_sitewide_promotion + store_keyword_promotion + store_product_operation + 
                             store_crowd_promotion + store_super_short_video + store_multi_target_direct)
            
            store_data.append({
                'store_name': store.store_name,
                'total_amount': store_amount,
                'real_amount': round(store_real_amount, 2),
                'total_quantity': store_quantity,
                'unit_price': round(unit_price, 2),
                'visitor_count': store_visitor_count,
                'payment_buyer_count': store_payment_buyer_count,
                'payment_conversion_rate': round(payment_conversion_rate, 2),
                'planting_orders': store_planting_orders,
                'planting_amount': round(store_planting_amount, 2),
                'refund_amount': round(store_refund_amount, 2),
                'sitewide_promotion': round(store_sitewide_promotion, 2),
                'keyword_promotion': round(store_keyword_promotion, 2),
                'product_operation': round(store_product_operation, 2),
                'crowd_promotion': round(store_crowd_promotion, 2),
                'super_short_video': round(store_super_short_video, 2),
                'multi_target_direct': round(store_multi_target_direct, 2),
                'total_promotion': round(total_promotion, 2),
                'record_count': store.record_count
            })
            
            total_amount += store_amount
            total_real_amount += store_real_amount
            total_quantity += store_quantity
            total_records += store.record_count
        
        # 按销售金额排序
        store_data.sort(key=lambda x: x['total_amount'], reverse=True)
        
        # 计算总体客单价
        overall_unit_price = total_amount / total_quantity if total_quantity > 0 else 0
        
        return jsonify({
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'total_amount': round(total_amount, 2),
            'total_real_amount': round(total_real_amount, 2),
            'total_quantity': total_quantity,
            'overall_unit_price': round(overall_unit_price, 2),
            'total_records': total_records,
            'store_count': len(store_data),
            'store_stats': store_data
        })
        
    except ValueError:
        return jsonify({'message': '日期格式错误，请使用YYYY-MM-DD格式'}), 400
    except Exception as e:
        current_app.logger.error(f'获取统计数据时出错: {str(e)}')
        return jsonify({'message': f'获取统计数据失败: {str(e)}'}), 500

@data_bp.route('/stats/operator', methods=['GET'])
@jwt_required()
def get_operator_stats():
    """获取负责人员销售统计信息（支持日期区间查询）"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    # 移除权限检查，允许所有用户访问
    # if user.role != 'admin':
    #     return jsonify({'message': '权限不足'}), 403
    
    # 获取日期参数
    start_date_param = request.args.get('start_date')
    end_date_param = request.args.get('end_date')
    
    try:
        if start_date_param and end_date_param:
            # 使用用户提供的日期区间
            start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
            
            # 验证日期区间的合理性
            if start_date > end_date:
                return jsonify({'message': '开始日期不能晚于结束日期'}), 400
                
        else:
            # 默认使用昨天的数据
            from datetime import timedelta
            yesterday = datetime.now().date() - timedelta(days=1)
            start_date = yesterday
            end_date = yesterday
        
        # 按负责人员统计销售数据
        operator_stats = db.session.query(
            ProductDataMerge.platform.label('team'),
            db.func.coalesce(ProductDataMerge.product_list_operator, '未分配').label('operator'),
            db.func.sum(ProductDataMerge.payment_amount).label('total_amount'),
            db.func.sum(ProductDataMerge.payment_product_count).label('total_quantity'),
            db.func.sum(ProductDataMerge.visitor_count).label('total_visitor_count'),
            db.func.sum(ProductDataMerge.payment_buyer_count).label('total_payment_buyer_count'),
            db.func.sum(ProductDataMerge.planting_orders).label('total_planting_orders'),
            db.func.sum(ProductDataMerge.planting_amount).label('total_planting_amount'),
            db.func.sum(ProductDataMerge.refund_amount).label('total_refund_amount'),
            db.func.sum(ProductDataMerge.sitewide_promotion).label('total_sitewide_promotion'),
            db.func.sum(ProductDataMerge.keyword_promotion).label('total_keyword_promotion'),
            db.func.sum(ProductDataMerge.product_operation).label('total_product_operation'),
            db.func.sum(ProductDataMerge.crowd_promotion).label('total_crowd_promotion'),
            db.func.sum(ProductDataMerge.super_short_video).label('total_super_short_video'),
            db.func.sum(ProductDataMerge.multi_target_direct).label('total_multi_target_direct'),
            db.func.count(ProductDataMerge.id).label('record_count')
        ).filter(
            ProductDataMerge.upload_date >= start_date,
            ProductDataMerge.upload_date <= end_date
        ).group_by(
            ProductDataMerge.platform,
            db.func.coalesce(ProductDataMerge.product_list_operator, '未分配')
        ).all()
        
        # 计算汇总数据
        total_amount = 0
        total_quantity = 0
        total_records = 0
        total_real_amount = 0
        operator_data = []
        
        for operator in operator_stats:
            operator_amount = float(operator.total_amount) if operator.total_amount else 0
            operator_quantity = int(operator.total_quantity) if operator.total_quantity else 0
            operator_visitor_count = int(operator.total_visitor_count) if operator.total_visitor_count else 0
            operator_payment_buyer_count = int(operator.total_payment_buyer_count) if operator.total_payment_buyer_count else 0
            operator_planting_orders = int(operator.total_planting_orders) if operator.total_planting_orders else 0
            operator_planting_amount = float(operator.total_planting_amount) if operator.total_planting_amount else 0
            operator_refund_amount = float(operator.total_refund_amount) if operator.total_refund_amount else 0
            operator_sitewide_promotion = float(operator.total_sitewide_promotion) if operator.total_sitewide_promotion else 0
            operator_keyword_promotion = float(operator.total_keyword_promotion) if operator.total_keyword_promotion else 0
            operator_product_operation = float(operator.total_product_operation) if operator.total_product_operation else 0
            operator_crowd_promotion = float(operator.total_crowd_promotion) if operator.total_crowd_promotion else 0
            operator_super_short_video = float(operator.total_super_short_video) if operator.total_super_short_video else 0
            operator_multi_target_direct = float(operator.total_multi_target_direct) if operator.total_multi_target_direct else 0
            
            # 计算真实销售金额 = 销售金额 - 退款金额 - 种菜金额
            operator_real_amount = operator_amount - operator_refund_amount - operator_planting_amount
            
            # 计算客单价（销售金额/销售件数）
            unit_price = operator_amount / operator_quantity if operator_quantity > 0 else 0
            
            # 计算支付转化率（payment_buyer_count/visitor_count）
            payment_conversion_rate = (operator_payment_buyer_count / operator_visitor_count * 100) if operator_visitor_count > 0 else 0
            
            # 计算推广总金额
            total_promotion = (operator_sitewide_promotion + operator_keyword_promotion + operator_product_operation + 
                             operator_crowd_promotion + operator_super_short_video + operator_multi_target_direct)
            
            operator_data.append({
                'team': operator.team,
                'operator': operator.operator,
                'total_amount': operator_amount,
                'real_amount': round(operator_real_amount, 2),
                'total_quantity': operator_quantity,
                'unit_price': round(unit_price, 2),
                'visitor_count': operator_visitor_count,
                'payment_buyer_count': operator_payment_buyer_count,
                'payment_conversion_rate': round(payment_conversion_rate, 2),
                'planting_orders': operator_planting_orders,
                'planting_amount': round(operator_planting_amount, 2),
                'refund_amount': round(operator_refund_amount, 2),
                'sitewide_promotion': round(operator_sitewide_promotion, 2),
                'keyword_promotion': round(operator_keyword_promotion, 2),
                'product_operation': round(operator_product_operation, 2),
                'crowd_promotion': round(operator_crowd_promotion, 2),
                'super_short_video': round(operator_super_short_video, 2),
                'multi_target_direct': round(operator_multi_target_direct, 2),
                'total_promotion': round(total_promotion, 2),
                'record_count': operator.record_count
            })
            
            total_amount += operator_amount
            total_real_amount += operator_real_amount
            total_quantity += operator_quantity
            total_records += operator.record_count
        
        # 按销售金额排序
        operator_data.sort(key=lambda x: x['total_amount'], reverse=True)
        
        # 计算总体客单价
        overall_unit_price = total_amount / total_quantity if total_quantity > 0 else 0
        
        return jsonify({
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'total_amount': round(total_amount, 2),
            'total_real_amount': round(total_real_amount, 2),
            'total_quantity': total_quantity,
            'overall_unit_price': round(overall_unit_price, 2),
            'total_records': total_records,
            'operator_count': len(operator_data),
            'operator_stats': operator_data
        })
        
    except ValueError:
        return jsonify({'message': '日期格式错误，请使用YYYY-MM-DD格式'}), 400
    except Exception as e:
        current_app.logger.error(f'获取负责人员统计数据时出错: {str(e)}')
        return jsonify({'message': f'获取负责人员统计数据失败: {str(e)}'}), 500

@data_bp.route('/stats/category', methods=['GET'])
@jwt_required()
def get_category_stats():
    """获取类目业绩分布统计信息（支持日期区间查询）"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    # 移除权限检查，允许所有用户访问
    # if user.role != 'admin':
    #     return jsonify({'message': '权限不足'}), 403
    
    # 获取日期参数
    start_date_param = request.args.get('start_date')
    end_date_param = request.args.get('end_date')
    
    try:
        if start_date_param and end_date_param:
            # 使用用户提供的日期区间
            start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
            
            # 验证日期区间的合理性
            if start_date > end_date:
                return jsonify({'message': '开始日期不能晚于结束日期'}), 400
                
        else:
            # 默认使用昨天的数据
            from datetime import timedelta
            yesterday = datetime.now().date() - timedelta(days=1)
            start_date = yesterday
            end_date = yesterday
        
        # 按类目统计销售数据
        category_stats = db.session.query(
            db.func.coalesce(ProductDataMerge.product_list_category, '未分类').label('category'),
            db.func.sum(ProductDataMerge.payment_amount).label('total_amount'),
            db.func.sum(ProductDataMerge.payment_product_count).label('total_quantity'),
            db.func.sum(ProductDataMerge.visitor_count).label('total_visitor_count'),
            db.func.sum(ProductDataMerge.payment_buyer_count).label('total_payment_buyer_count'),
            db.func.sum(ProductDataMerge.planting_orders).label('total_planting_orders'),
            db.func.sum(ProductDataMerge.planting_amount).label('total_planting_amount'),
            db.func.sum(ProductDataMerge.refund_amount).label('total_refund_amount'),
            db.func.sum(ProductDataMerge.sitewide_promotion).label('total_sitewide_promotion'),
            db.func.sum(ProductDataMerge.keyword_promotion).label('total_keyword_promotion'),
            db.func.sum(ProductDataMerge.product_operation).label('total_product_operation'),
            db.func.sum(ProductDataMerge.crowd_promotion).label('total_crowd_promotion'),
            db.func.sum(ProductDataMerge.super_short_video).label('total_super_short_video'),
            db.func.sum(ProductDataMerge.multi_target_direct).label('total_multi_target_direct'),
            db.func.count(ProductDataMerge.id).label('record_count')
        ).filter(
            ProductDataMerge.upload_date >= start_date,
            ProductDataMerge.upload_date <= end_date
        ).group_by(
            db.func.coalesce(ProductDataMerge.product_list_category, '未分类')
        ).all()
        
        # 计算汇总数据
        total_amount = 0
        total_quantity = 0
        total_records = 0
        total_real_amount = 0
        category_data = []
        
        for category in category_stats:
            category_amount = float(category.total_amount) if category.total_amount else 0
            category_quantity = int(category.total_quantity) if category.total_quantity else 0
            category_visitor_count = int(category.total_visitor_count) if category.total_visitor_count else 0
            category_payment_buyer_count = int(category.total_payment_buyer_count) if category.total_payment_buyer_count else 0
            category_planting_orders = int(category.total_planting_orders) if category.total_planting_orders else 0
            category_planting_amount = float(category.total_planting_amount) if category.total_planting_amount else 0
            category_refund_amount = float(category.total_refund_amount) if category.total_refund_amount else 0
            category_sitewide_promotion = float(category.total_sitewide_promotion) if category.total_sitewide_promotion else 0
            category_keyword_promotion = float(category.total_keyword_promotion) if category.total_keyword_promotion else 0
            category_product_operation = float(category.total_product_operation) if category.total_product_operation else 0
            category_crowd_promotion = float(category.total_crowd_promotion) if category.total_crowd_promotion else 0
            category_super_short_video = float(category.total_super_short_video) if category.total_super_short_video else 0
            category_multi_target_direct = float(category.total_multi_target_direct) if category.total_multi_target_direct else 0
            
            # 计算真实销售金额 = 销售金额 - 退款金额 - 种菜金额
            category_real_amount = category_amount - category_refund_amount - category_planting_amount
            
            # 计算客单价（销售金额/销售件数）
            unit_price = category_amount / category_quantity if category_quantity > 0 else 0
            
            # 计算支付转化率（payment_buyer_count/visitor_count）
            payment_conversion_rate = (category_payment_buyer_count / category_visitor_count * 100) if category_visitor_count > 0 else 0
            
            # 计算推广总金额
            total_promotion = (category_sitewide_promotion + category_keyword_promotion + category_product_operation + 
                             category_crowd_promotion + category_super_short_video + category_multi_target_direct)
            
            category_data.append({
                'category': category.category,
                'total_amount': category_amount,
                'real_amount': round(category_real_amount, 2),
                'total_quantity': category_quantity,
                'unit_price': round(unit_price, 2),
                'visitor_count': category_visitor_count,
                'payment_buyer_count': category_payment_buyer_count,
                'payment_conversion_rate': round(payment_conversion_rate, 2),
                'planting_orders': category_planting_orders,
                'planting_amount': round(category_planting_amount, 2),
                'refund_amount': round(category_refund_amount, 2),
                'sitewide_promotion': round(category_sitewide_promotion, 2),
                'keyword_promotion': round(category_keyword_promotion, 2),
                'product_operation': round(category_product_operation, 2),
                'crowd_promotion': round(category_crowd_promotion, 2),
                'super_short_video': round(category_super_short_video, 2),
                'multi_target_direct': round(category_multi_target_direct, 2),
                'total_promotion': round(total_promotion, 2),
                'record_count': category.record_count
            })
            
            total_amount += category_amount
            total_real_amount += category_real_amount
            total_quantity += category_quantity
            total_records += category.record_count
        
        # 按销售金额排序
        category_data.sort(key=lambda x: x['total_amount'], reverse=True)
        
        # 计算总体客单价
        overall_unit_price = total_amount / total_quantity if total_quantity > 0 else 0
        
        return jsonify({
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'total_amount': round(total_amount, 2),
            'total_real_amount': round(total_real_amount, 2),
            'total_quantity': total_quantity,
            'overall_unit_price': round(overall_unit_price, 2),
            'total_records': total_records,
            'category_count': len(category_data),
            'category_stats': category_data
        })
        
    except ValueError:
        return jsonify({'message': '日期格式错误，请使用YYYY-MM-DD格式'}), 400
    except Exception as e:
        current_app.logger.error(f'获取类目业绩分布统计数据时出错: {str(e)}')
        return jsonify({'message': f'获取类目业绩分布统计数据失败: {str(e)}'}), 500

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
    """获取特定商品的趋势数据（支持自定义日期区间，默认最近30天）"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    # 移除权限检查，允许所有用户访问
    # if user.role != 'admin':
    #     return jsonify({'message': '权限不足'}), 403
    
    try:
        from datetime import datetime, timedelta
        
        # 获取日期参数
        start_date_param = request.args.get('start_date')
        end_date_param = request.args.get('end_date')
        
        if start_date_param and end_date_param:
            # 使用用户提供的日期区间
            try:
                start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
                
                # 验证日期区间的合理性
                if start_date > end_date:
                    return jsonify({'message': '开始日期不能晚于结束日期'}), 400
                    
                # 限制查询范围不超过365天
                if (end_date - start_date).days > 365:
                    return jsonify({'message': '查询范围不能超过365天'}), 400
                    
            except ValueError:
                return jsonify({'message': '日期格式错误，请使用YYYY-MM-DD格式'}), 400
        else:
            # 使用默认的30天前的日期
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=30)
        
        # 查询该商品最近30天的数据
        trend_data = ProductDataMerge.query.filter(
            ProductDataMerge.tmall_product_code == tmall_product_code,
            ProductDataMerge.upload_date >= start_date,
            ProductDataMerge.upload_date <= end_date
        ).order_by(ProductDataMerge.upload_date.asc()).all()
        
        # 调试信息：记录查询参数
        current_app.logger.info(f'趋势查询参数: 商品代码={tmall_product_code}, 开始日期={start_date}, 结束日期={end_date}, 找到数据条数={len(trend_data)}')
        
        # 检查商品是否存在（用于获取商品名称）
        product_info = ProductDataMerge.query.filter(
            ProductDataMerge.tmall_product_code == tmall_product_code
        ).first()
        
        if not product_info:
            # 商品完全不存在
            current_app.logger.info(f'商品 {tmall_product_code} 在数据库中不存在')
            return jsonify({
                'message': f'未找到天猫ID为 {tmall_product_code} 的商品数据',
                'product_code': tmall_product_code,
                'data': []
            }), 404
        
        # 获取商品名称
        product_name = product_info.product_name or '未知商品'
        
        # 组织返回数据 - 支持不连续的数据
        result = []
        
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
                
                # 推广费用字段
                'sitewide_promotion': float(item.sitewide_promotion) if item.sitewide_promotion else 0,  # 全站推广
                'keyword_promotion': float(item.keyword_promotion) if item.keyword_promotion else 0,  # 关键词推广
                'product_operation': float(item.product_operation) if item.product_operation else 0,  # 货品运营推广
                'crowd_promotion': float(item.crowd_promotion) if item.crowd_promotion else 0,  # 人群推广费用
                'super_short_video': float(item.super_short_video) if item.super_short_video else 0,  # 超级短视频
                'multi_target_direct': float(item.multi_target_direct) if item.multi_target_direct else 0,  # 多目标直投
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
@handle_db_connection_error(max_retries=3, retry_delay=2)
def get_order_details():
    """获取订单详情数据列表（所有用户可访问）"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    # 移除权限检查，允许所有用户访问
    # if user.role != 'admin':
    #     return jsonify({'message': '权限不足'}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    sort_by = request.args.get('sort_by', 'order_time')
    sort_order = request.args.get('sort_order', 'desc')
    
    # 过滤参数
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    store_name = request.args.get('store_name')
    operator = request.args.get('operator')
    province = request.args.get('province')
    city = request.args.get('city')
    express_company = request.args.get('express_company')
    order_status_list = request.args.getlist('order_status')
    
    # 调试日志：记录接收到的筛选参数
    print(f"订单详情API接收到的筛选参数: start_date={start_date}, end_date={end_date}, store_name={store_name}, operator={operator}, province={province}, city={city}, express_company={express_company}, order_status_list={order_status_list}")
    
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
    
    # 操作人过滤
    if operator:
        query = query.filter(OrderDetailsMerge.product_list_operator.ilike(f'%{operator}%'))
    
    # 省份过滤
    if province:
        query = query.filter(OrderDetailsMerge.province.ilike(f'%{province}%'))
    
    # 城市过滤
    if city:
        query = query.filter(OrderDetailsMerge.city.ilike(f'%{city}%'))
    
    # 快递公司过滤
    if express_company:
        query = query.filter(OrderDetailsMerge.express_company.ilike(f'%{express_company}%'))
    
    # 订单状态过滤（多选）
    if order_status_list:
        status_filters = []
        for status in order_status_list:
            if status == '空白':
                # 处理空白/NULL状态
                status_filters.append(OrderDetailsMerge.order_status.is_(None))
                status_filters.append(OrderDetailsMerge.order_status == '')
            else:
                status_filters.append(OrderDetailsMerge.order_status == status)
        
        if status_filters:
            query = query.filter(or_(*status_filters))
    
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
            'order_status': item.order_status,
            'upload_date': item.upload_date.isoformat() if item.upload_date else None,
            'operation_cost_supply_price': float(item.operation_cost_supply_price) if item.operation_cost_supply_price else 0,
            'product_list_operator': item.product_list_operator,
        })
    
    # 对内部订单号进行去重处理
    def deduplicate_by_internal_order_number(data_list):
        """
        根据内部订单号去重，去重规则：
        1. 优先显示product_name不含有"支架","牙线棒"关键字的记录
        2. 如果有多条不含关键字，则选择product_name最长的那一条
        """
        if not data_list:
            return data_list
            
        # 按内部订单号分组
        grouped = {}
        no_order_number_items = []  # 没有内部订单号的记录
        
        for item in data_list:
            internal_order_number = item.get('internal_order_number')
            if internal_order_number:
                if internal_order_number not in grouped:
                    grouped[internal_order_number] = []
                grouped[internal_order_number].append(item)
            else:
                # 没有内部订单号的记录直接保留
                no_order_number_items.append(item)
        
        # 对每组进行去重处理
        deduplicated_data = []
        for internal_order_number, items in grouped.items():
            if len(items) == 1:
                # 只有一条记录，直接添加
                deduplicated_data.extend(items)
            else:
                # 多条记录，需要按规则选择
                # 优先选择不含"支架"、"牙线棒"关键字的记录
                excluded_keywords = ["支架", "牙线棒"]
                preferred_items = []
                
                for item in items:
                    product_name = item.get('product_name', '') or ''
                    if not any(keyword in product_name for keyword in excluded_keywords):
                        preferred_items.append(item)
                
                if preferred_items:
                    # 如果有不含关键字的记录，从中选择product_name最长的
                    selected_item = max(preferred_items, key=lambda x: len(x.get('product_name', '') or ''))
                else:
                    # 如果都含关键字，选择product_name最长的
                    selected_item = max(items, key=lambda x: len(x.get('product_name', '') or ''))
                
                deduplicated_data.append(selected_item)
        
        # 将没有内部订单号的记录加入结果
        deduplicated_data.extend(no_order_number_items)
        
        # 按原来的顺序返回（保持排序）
        # 创建一个映射来保持原始顺序
        order_map = {id(item): i for i, item in enumerate(data_list)}
        deduplicated_data.sort(key=lambda x: order_map.get(id(x), len(data_list)))
        
        return deduplicated_data
    
    # 应用去重处理
    data = deduplicate_by_internal_order_number(data)
    
    return jsonify({
        'data': data,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'per_page': pagination.per_page
    })

@data_bp.route('/order-details-by-internal-number/<internal_order_number>', methods=['GET'])
@jwt_required()
@handle_db_connection_error(max_retries=3, retry_delay=2)
def get_order_details_by_internal_number(internal_order_number):
    """根据内部订单号获取所有相关的订单详情数据（所有用户可访问）"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    # 移除权限检查，允许所有用户访问
    # if user.role != 'admin':
    #     return jsonify({'message': '权限不足'}), 403
    
    try:
        # 查询相同内部订单号的所有记录
        items = OrderDetailsMerge.query.filter(
            OrderDetailsMerge.internal_order_number == internal_order_number
        ).order_by(OrderDetailsMerge.order_time.desc()).all()
        
        if not items:
            return jsonify({'message': '未找到相关订单数据'}), 404
        
        # 构建返回数据
        data = []
        total_cost = 0.0  # 总成本
        
        for item in items:
            # 安全地获取数值字段
            operation_cost_price = float(item.operation_cost_supply_price) if item.operation_cost_supply_price is not None else 0
            unit_price = float(item.unit_price) if item.unit_price is not None else 0
            product_amount = float(item.product_amount) if item.product_amount is not None else 0
            quantity = int(item.quantity) if item.quantity is not None else 0
            
            item_data = {
                'id': item.id,
                'product_code': item.product_code,
                'product_name': item.product_name,
                'quantity': quantity,
                'operation_cost_supply_price': operation_cost_price,
                'unit_price': unit_price,
                'product_amount': product_amount,
                
                # 其他可能有用的字段
                'order_time': item.order_time.isoformat() if item.order_time else None,
                'store_name': item.store_name,
                'online_order_number': item.online_order_number,
                'tracking_number': item.tracking_number,
                'order_status': item.order_status,
            }
            data.append(item_data)
            
            # 计算成本：运营成本供货价 × 数量
            cost = operation_cost_price * quantity
            total_cost += cost
        
        # 计算汇总信息
        # 销售金额：取第一条的paid_amount（不累加）
        sales_amount = float(items[0].paid_amount) if items[0].paid_amount is not None else 0
        
        # 利润：销售金额 - 成本
        profit = sales_amount - total_cost

        profit = profit if profit > 0 else 0
        
        summary = {
            'internal_order_number': internal_order_number,
            'sales_amount': sales_amount,
            'total_cost': total_cost,
            'profit': profit,
            'item_count': len(items),
            'store_name': items[0].store_name if items else '',
            'order_time': items[0].order_time.isoformat() if items and items[0].order_time else None,
        }
        
        return jsonify({
            'data': data,
            'summary': summary
        })
        
    except Exception as e:
        import traceback
        error_msg = f"获取订单详情失败: {str(e)}"
        print(error_msg)
        print("详细错误信息:")
        print(traceback.format_exc())
        return jsonify({'message': error_msg}), 500

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
    
    # 查询该店铺在指定日期的所有订单（只统计已发货状态）
    orders = OrderDetailsMerge.query.filter(
        OrderDetailsMerge.store_name == store_name,
        db.func.date(OrderDetailsMerge.upload_date) == target_date,
        OrderDetailsMerge.order_status == '已发货'
    ).all()
    
    if not orders:
        return jsonify({
            'message': f'未找到店铺 {store_name} 在 {target_date} 的已发货订单数据',
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
        if order.paid_amount:
            total_sales += float(order.paid_amount)
        
        # 总成本
        if order.operation_cost_supply_price and order.quantity and order.product_amount>0:
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
    
    # 查询该操作人在指定店铺和日期的所有订单（只统计已发货状态）
    orders = OrderDetailsMerge.query.filter(
        OrderDetailsMerge.store_name == store_name,
        OrderDetailsMerge.product_list_operator == operator,
        db.func.date(OrderDetailsMerge.upload_date) == target_date,
        OrderDetailsMerge.order_status == '已发货'
    ).all()
    
    if not orders:
        return jsonify({
            'message': f'未找到操作人 {operator} 在店铺 {store_name} 于 {target_date} 的已发货订单数据',
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
        if order.paid_amount:
            total_sales += float(order.paid_amount)
        
        # 总成本
        if order.operation_cost_supply_price and order.quantity and order.paid_amount>0:
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

@data_bp.route('/product-ranking', methods=['GET'])
@jwt_required()
def get_product_ranking():
    """获取商品销售排行数据（支持按门店、负责人员、类目分类）"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    # 移除权限检查，允许所有用户访问
    # if user.role != 'admin':
    #     return jsonify({'message': '权限不足'}), 403
    
    # 获取查询参数
    category_type = request.args.get('category_type')  # 'store', 'operator', 'category'
    category_value = request.args.get('category_value')  # 具体的分类值
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    sort_by = request.args.get('sort_by', 'real_amount')  # 默认按真实销售金额排序
    sort_order = request.args.get('sort_order', 'desc')   # 默认倒序
    
    try:
        # 验证必需参数
        if not category_type or not category_value:
            return jsonify({'message': '请提供分类类型和分类值'}), 400
        
        # 解析日期参数
        if start_date and end_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            if start_date > end_date:
                return jsonify({'message': '开始日期不能晚于结束日期'}), 400
        else:
            # 默认使用昨天的数据
            from datetime import timedelta
            yesterday = datetime.now().date() - timedelta(days=1)
            start_date = yesterday
            end_date = yesterday
        
        # 构建基础查询
        query = db.session.query(
            ProductDataMerge.tmall_product_code,
            ProductDataMerge.product_name,
            ProductDataMerge.tmall_supplier_name,
            ProductDataMerge.product_list_operator,
            ProductDataMerge.product_list_category,
            db.func.sum(ProductDataMerge.payment_amount).label('total_amount'),
            db.func.sum(ProductDataMerge.payment_product_count).label('total_quantity'),
            db.func.sum(ProductDataMerge.refund_amount).label('total_refund_amount'),
            db.func.sum(ProductDataMerge.planting_amount).label('total_planting_amount'),
            db.func.count(ProductDataMerge.id).label('record_count')
        ).filter(
            ProductDataMerge.upload_date >= start_date,
            ProductDataMerge.upload_date <= end_date
        )
        
        # 根据分类类型添加过滤条件
        if category_type == 'store':
            if category_value == '其他':
                query = query.filter(ProductDataMerge.tmall_supplier_name == None)
            else:
                query = query.filter(ProductDataMerge.tmall_supplier_name == category_value)
        elif category_type == 'operator':
            if category_value == '未分配': 
                query = query.filter(ProductDataMerge.product_list_operator == None)
            else:
                query = query.filter(ProductDataMerge.product_list_operator == category_value)
        elif category_type == 'category':
            if category_value == '未分类':
                query = query.filter(ProductDataMerge.product_list_category == None)
            else:
                query = query.filter(ProductDataMerge.product_list_category == category_value)
        else:
            return jsonify({'message': '无效的分类类型'}), 400
        
        # 分组
        query = query.group_by(
            ProductDataMerge.tmall_product_code,
            ProductDataMerge.product_name,
            ProductDataMerge.tmall_supplier_name,
            ProductDataMerge.product_list_operator,
            ProductDataMerge.product_list_category
        )
        
        # 计算真实销售金额
        query = query.having(
            db.func.sum(ProductDataMerge.payment_amount) > 0
        )
        
        # 应用排序
        if sort_by == 'real_amount':
            # 按真实销售金额排序（需要计算）
            if sort_order == 'asc':
                query = query.order_by(
                    (db.func.sum(ProductDataMerge.payment_amount) - 
                     db.func.sum(ProductDataMerge.refund_amount) - 
                     db.func.sum(ProductDataMerge.planting_amount)).asc()
                )
            else:
                query = query.order_by(
                    (db.func.sum(ProductDataMerge.payment_amount) - 
                     db.func.sum(ProductDataMerge.refund_amount) - 
                     db.func.sum(ProductDataMerge.planting_amount)).desc()
                )
        elif sort_by == 'total_amount':
            if sort_order == 'asc':
                query = query.order_by(db.func.sum(ProductDataMerge.payment_amount).asc())
            else:
                query = query.order_by(db.func.sum(ProductDataMerge.payment_amount).desc())
        elif sort_by == 'total_quantity':
            if sort_order == 'asc':
                query = query.order_by(db.func.sum(ProductDataMerge.payment_product_count).asc())
            else:
                query = query.order_by(db.func.sum(ProductDataMerge.payment_product_count).desc())
        else:
            # 默认按真实销售金额倒序
            query = query.order_by(
                (db.func.sum(ProductDataMerge.payment_amount) - 
                 db.func.sum(ProductDataMerge.refund_amount) - 
                 db.func.sum(ProductDataMerge.planting_amount)).desc()
            )
        
        # 计算总数
        total_query = query
        total = total_query.count()
        
        # 应用分页
        offset = (page - 1) * per_page
        items = query.offset(offset).limit(per_page).all()
        
        # 构建返回数据
        data = []
        for item in items:
            total_amount = float(item.total_amount) if item.total_amount else 0
            total_refund_amount = float(item.total_refund_amount) if item.total_refund_amount else 0
            total_planting_amount = float(item.total_planting_amount) if item.total_planting_amount else 0
            
            # 计算真实销售金额
            real_amount = total_amount - total_refund_amount - total_planting_amount
            
            data.append({
                'tmall_product_code': item.tmall_product_code,
                'product_name': item.product_name,
                'tmall_supplier_name': item.tmall_supplier_name,
                'product_list_operator': item.product_list_operator,
                'product_list_category': item.product_list_category,
                'total_amount': round(total_amount, 2),
                'real_amount': round(real_amount, 2),
                'total_quantity': int(item.total_quantity) if item.total_quantity else 0,
                'refund_amount': round(total_refund_amount, 2),
                'planting_amount': round(total_planting_amount, 2),
                'record_count': item.record_count
            })
        
        # 计算页面信息
        pages = (total + per_page - 1) // per_page  # 向上取整
        
        return jsonify({
            'category_type': category_type,
            'category_value': category_value,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'sort_by': sort_by,
            'sort_order': sort_order,
            'data': data,
            'total': total,
            'pages': pages,
            'current_page': page,
            'per_page': per_page
        })
        
    except ValueError:
        return jsonify({'message': '日期格式错误，请使用YYYY-MM-DD格式'}), 400
    except Exception as e:
        current_app.logger.error(f'获取商品销售排行数据时出错: {str(e)}')
        return jsonify({'message': f'获取商品销售排行数据失败: {str(e)}'}), 500