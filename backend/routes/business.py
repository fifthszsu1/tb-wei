from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text
from datetime import datetime
from decimal import Decimal
from models import db, User, ProductDataMerge, SubjectReport, PlantingRecord, OrderDetails, ProductList, OperationCostPricing, OrderDetailsMerge
import logging

# 获取日志记录器
logger = logging.getLogger(__name__)

business_bp = Blueprint('business', __name__)

@business_bp.route('/calculate-promotion-summary', methods=['POST'])
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
        
        logger.info(f"数据检查通过 - 找到 {len(merge_records)} 条商品数据，{len(subject_records)} 条主体报表数据")
        
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
                        logger.info(f"产品 {merge_record.tmall_product_code}: {scene_name} += {cost}")
                
                # 更新推广费用汇总时间
                merge_record.promotion_summary_updated_at = datetime.utcnow()
                stats['updated_count'] += 1
                
            except Exception as e:
                error_msg = f"处理产品 {merge_record.tmall_product_code} 时出错: {str(e)}"
                stats['errors'].append(error_msg)
                logger.error(error_msg)
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

@business_bp.route('/calculate-planting-summary', methods=['POST'])
@jwt_required()
def calculate_planting_summary():
    """计算种菜表格汇总数据"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足，只有管理员可以执行汇总计算'}), 403
    
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
                current_app.logger.info(f"种菜汇总计算 - 商品编码: {merge_record.tmall_product_code}")
                current_app.logger.info(f"  匹配订单数: {planting_orders}")
                current_app.logger.info(f"  总金额: {planting_amount}")
                current_app.logger.info(f"  佣金总额: {planting_cost}")
                current_app.logger.info(f"  物流成本: {planting_logistics_cost}")
                current_app.logger.info(f"  扣款金额: {planting_deduction}")
        
        # 提交数据库更改
        db.session.commit()
        
        return jsonify({
            'message': f'种菜汇总计算完成，更新了 {summary_count} 条记录',
            'count': summary_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"种菜汇总计算失败: {str(e)}")
        return jsonify({'message': f'计算失败: {str(e)}'}), 500

@business_bp.route('/calculate-final-summary', methods=['POST'])
@jwt_required()
def calculate_final_summary():
    """计算最终汇总数据"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足，只有管理员可以执行汇总计算'}), 403
    
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
                current_app.logger.info(f"计算结果 - {record.tmall_product_code}:")
                current_app.logger.info(f"  基础数据: 访客={visitor_count}, 订单={payment_buyer_count}, 金额={payment_amount}")
                current_app.logger.info(f"  转化率: {record.conversion_rate}%")
                current_app.logger.info(f"  真实金额: {record.real_amount}")
                current_app.logger.info(f"  真实订单: {record.real_buyer_count}")
                current_app.logger.info(f"  真实件数: {record.real_product_count}")
                current_app.logger.info(f"  毛利: {record.gross_profit}")
                current_app.logger.info(f"  记录ID: {record.id}")
                
                summary_count += 1
                
                # 添加日志记录
                current_app.logger.info(f"最终汇总计算 - 商品编码: {record.tmall_product_code}")
                current_app.logger.info(f"  真实金额: {record.real_amount}")
                current_app.logger.info(f"  真实买家数: {record.real_buyer_count}")
                current_app.logger.info(f"  毛利: {record.gross_profit}")
            
            except Exception as e:
                current_app.logger.error(f"计算记录时出错: {str(e)}")
                continue
        
        # 提交数据库更改
        db.session.commit()
        
        return jsonify({
            'message': f'最终汇总计算完成，更新了 {summary_count} 条记录',
            'count': summary_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"最终汇总计算失败: {str(e)}")
        return jsonify({'message': f'计算失败: {str(e)}'}), 500

@business_bp.route('/calculate-order-details-merge', methods=['POST'])
@jwt_required()
def calculate_order_details_merge():
    """
    订单详情合并计算接口（第一步）
    将order_details与product_list进行LEFT JOIN
    匹配规则：order_details.store_style_code = product_list.tmall_supplier_id
    前端传入日期区间与order_details.order_time的日期部分匹配
    """
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足，只有管理员可以执行汇总计算'}), 403
    
    data = request.get_json()
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    
    if not start_date or not end_date:
        return jsonify({'message': '请提供开始日期和结束日期'}), 400
    
    # 转换日期格式
    try:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': '日期格式错误，请使用YYYY-MM-DD格式'}), 400
    
    if start_date > end_date:
        return jsonify({'message': '开始日期不能晚于结束日期'}), 400
    
    try:
        # 统计信息
        stats = {
            'processed_count': 0,
            'matched_count': 0,
            'created_count': 0,
            'errors': []
        }
        
                # 数据存在性检查 - 检查指定日期区间的订单详情数据（提取order_time的日期部分匹配）
        order_details_records = db.session.query(OrderDetails).filter(
            db.func.date(OrderDetails.order_time) >= start_date,
            db.func.date(OrderDetails.order_time) <= end_date
        ).all()
        
        if not order_details_records:
            return jsonify({
                'message': f'未找到日期区间 {start_date} 到 {end_date} 的订单详情数据，请先上传相应日期的订单详情',
                'stats': stats,
                'error_type': 'missing_order_details'
            }), 400
            
        logger.info(f"数据检查通过 - 找到 {len(order_details_records)} 条订单详情数据")
        
        # 直接删除同一日期区间的现有合并数据（避免先查询大量数据）
        deleted_count = db.session.query(OrderDetailsMerge).filter(
            db.func.date(OrderDetailsMerge.order_time) >= start_date,
            db.func.date(OrderDetailsMerge.order_time) <= end_date
        ).delete(synchronize_session=False)
        
        if deleted_count > 0:
            logger.info(f"删除了 {deleted_count} 条同一日期区间的现有合并数据")
        else:
            logger.info("没有找到需要删除的同一日期区间合并数据")
        
        # 处理每条订单详情记录
        for order_detail in order_details_records:
            stats['processed_count'] += 1
            
            try:
                # 查找匹配的product_list记录
                product_list_record = None
                is_matched = False
                
                if order_detail.store_style_code:
                    product_list_record = ProductList.query.filter_by(
                        tmall_supplier_id=order_detail.store_style_code
                    ).first()
                    
                    if product_list_record:
                        is_matched = True
                        stats['matched_count'] += 1
                
                # 创建合并记录
                merge_record = OrderDetailsMerge(
                    # 来自order_details的字段
                    order_details_id=order_detail.id,
                    internal_order_number=order_detail.internal_order_number,
                    online_order_number=order_detail.online_order_number,
                    store_code=order_detail.store_code,
                    store_name=order_detail.store_name,
                    order_time=order_detail.order_time,
                    payment_date=order_detail.payment_date,
                    shipping_date=order_detail.shipping_date,
                    payable_amount=order_detail.payable_amount,
                    paid_amount=order_detail.paid_amount,
                    express_company=order_detail.express_company,
                    tracking_number=order_detail.tracking_number,
                    province=order_detail.province,
                    city=order_detail.city,
                    district=order_detail.district,
                    product_code=order_detail.product_code,
                    product_name=order_detail.product_name,
                    quantity=order_detail.quantity,
                    unit_price=order_detail.unit_price,
                    product_amount=order_detail.product_amount,
                    payment_number=order_detail.payment_number,
                    image_url=order_detail.image_url,
                    store_style_code=order_detail.store_style_code,
                    order_status=order_detail.order_status,
                    order_details_filename=order_detail.filename,
                    upload_date=order_detail.upload_date,
                    order_details_uploaded_by=order_detail.uploaded_by,
                    order_details_created_at=order_detail.created_at,
                    order_details_updated_at=order_detail.updated_at,
                    
                    # 来自product_list的字段（如果匹配的话）
                    product_list_product_id=product_list_record.product_id if product_list_record else None,
                    product_list_product_name=product_list_record.product_name if product_list_record else None,
                    product_list_listing_time=product_list_record.listing_time if product_list_record else None,
                    product_list_tmall_supplier_id=product_list_record.tmall_supplier_id if product_list_record else None,
                    product_list_operator=product_list_record.operator if product_list_record else None,
                    
                    # 匹配状态
                    is_product_list_matched=is_matched
                )
                
                db.session.add(merge_record)
                stats['created_count'] += 1
                
            except Exception as e:
                error_msg = f"处理订单 {order_detail.internal_order_number or order_detail.online_order_number} 时出错: {str(e)}"
                stats['errors'].append(error_msg)
                logger.error(error_msg)
                continue
        
        # 提交数据库事务
        db.session.commit()
        
        return jsonify({
            'message': f'订单详情合并计算完成！处理了 {stats["processed_count"]} 条记录，匹配了 {stats["matched_count"]} 条记录，创建了 {stats["created_count"]} 条合并记录',
            'stats': stats
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'订单详情合并计算失败: {str(e)}'}), 500

@business_bp.route('/calculate-order-cost-summary', methods=['POST'])
@jwt_required()
def calculate_order_cost_summary():
    """
    订单成本汇总计算接口（第二步）
    基于order_details_merge与operation_cost_pricing进行LEFT JOIN
    匹配规则：order_details_merge.product_list_operator = operation_cost_pricing.operation_staff 
           AND order_details_merge.product_code = operation_cost_pricing.product_code
    前端传入日期区间与order_details_merge.order_time的日期部分匹配
    """
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足，只有管理员可以执行汇总计算'}), 403
    
    data = request.get_json()
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    
    if not start_date or not end_date:
        return jsonify({'message': '请提供开始日期和结束日期'}), 400
    
    # 转换日期格式
    try:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': '日期格式错误，请使用YYYY-MM-DD格式'}), 400
    
    if start_date > end_date:
        return jsonify({'message': '开始日期不能晚于结束日期'}), 400
    
    try:
        # 统计信息
        stats = {
            'processed_count': 0,
            'operation_cost_matched_count': 0,
            'updated_count': 0,
            'cost_calculated_count': 0,
            'errors': []
        }
        
        # 数据存在性检查 - 检查指定日期区间的订单详情合并数据
        merge_records = db.session.query(OrderDetailsMerge).filter(
            db.func.date(OrderDetailsMerge.order_time) >= start_date,
            db.func.date(OrderDetailsMerge.order_time) <= end_date
        ).all()
        
        if not merge_records:
            return jsonify({
                'message': f'未找到日期区间 {start_date} 到 {end_date} 的订单详情合并数据，请先执行第一步：订单详情合并计算',
                'stats': stats,
                'error_type': 'missing_merge_data'
            }), 400
        
        logger.info(f"数据检查通过 - 找到 {len(merge_records)} 条订单详情合并数据")
        
        # 处理每条合并记录
        for merge_record in merge_records:
            stats['processed_count'] += 1
            
            try:
                # 查找匹配的operation_cost_pricing记录
                operation_cost_record = None
                is_operation_cost_matched = False
                
                if (merge_record.product_list_operator and 
                    merge_record.product_code):
                    
                    operation_cost_record = OperationCostPricing.query.filter_by(
                        operation_staff=merge_record.product_list_operator,
                        product_code=merge_record.product_code
                    ).first()
                    
                    if operation_cost_record:
                        is_operation_cost_matched = True
                        stats['operation_cost_matched_count'] += 1
                
                # 更新运营成本相关字段
                if operation_cost_record:
                    merge_record.operation_cost_brand_category = operation_cost_record.brand_category
                    merge_record.operation_cost_product_code = operation_cost_record.product_code
                    merge_record.operation_cost_product_name = operation_cost_record.product_name
                    merge_record.operation_cost_supply_price = operation_cost_record.supply_price
                    merge_record.operation_cost_operation_staff = operation_cost_record.operation_staff
                    merge_record.operation_cost_filename = operation_cost_record.filename
                else:
                    # 清空运营成本字段
                    merge_record.operation_cost_brand_category = None
                    merge_record.operation_cost_product_code = None
                    merge_record.operation_cost_product_name = None
                    merge_record.operation_cost_supply_price = None
                    merge_record.operation_cost_operation_staff = None
                    merge_record.operation_cost_filename = None
                
                # 更新匹配状态
                merge_record.is_operation_cost_matched = is_operation_cost_matched
                
                # 计算业务字段（如果有运营成本价格）
                if (is_operation_cost_matched and 
                    merge_record.quantity and 
                    merge_record.product_amount and
                    operation_cost_record.supply_price):
                    
                    quantity = float(merge_record.quantity)
                    product_amount = float(merge_record.product_amount)
                    supply_price = float(operation_cost_record.supply_price)
                    
                    # 成本计算
                    merge_record.product_cost = quantity * supply_price  # 产品成本
                    merge_record.order_logistics_cost = quantity * 2.5  # 物流成本
                    merge_record.order_deduction = product_amount * 0.08  # 订单扣点
                    merge_record.tax_invoice = product_amount * 0.13  # 税票
                    
                    # 毛利计算
                    merge_record.gross_profit = (product_amount - 
                                               merge_record.product_cost - 
                                               merge_record.order_logistics_cost - 
                                               merge_record.order_deduction - 
                                               merge_record.tax_invoice)
                    
                    # 业务指标计算
                    if product_amount > 0:
                        merge_record.order_profit_margin = (merge_record.gross_profit / product_amount) * 100
                        merge_record.profit_per_unit = merge_record.gross_profit / quantity if quantity > 0 else 0
                    
                    merge_record.avg_order_value = product_amount
                    
                    # 更新汇总时间
                    merge_record.cost_summary_updated_at = datetime.utcnow()
                    merge_record.profit_summary_updated_at = datetime.utcnow()
                    
                    stats['cost_calculated_count'] += 1
                    
                    logger.info(f"成本计算完成 - 订单: {merge_record.internal_order_number}, "
                              f"产品成本: {merge_record.product_cost}, "
                              f"毛利: {merge_record.gross_profit}")
                
                stats['updated_count'] += 1
                
            except Exception as e:
                error_msg = f"处理合并记录 {merge_record.internal_order_number or merge_record.online_order_number} 时出错: {str(e)}"
                stats['errors'].append(error_msg)
                logger.error(error_msg)
                continue
        
        # 提交数据库事务
        db.session.commit()
        
        return jsonify({
            'message': f'订单成本汇总计算完成！处理了 {stats["processed_count"]} 条记录，匹配运营成本 {stats["operation_cost_matched_count"]} 条，更新了 {stats["updated_count"]} 条记录，计算成本 {stats["cost_calculated_count"]} 条',
            'stats': stats
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'订单成本汇总计算失败: {str(e)}'}), 500

@business_bp.route('/calculate-order-payment-update', methods=['POST'])
@jwt_required()
def calculate_order_payment_update():
    """
    订单支付金额更新接口（第三步）
    基于order_details_merge与alipay_amount进行LEFT JOIN
    匹配规则：order_details_merge.online_order_number = alipay_amount.order_number
    根据日期区间过滤order_details_merge.upload_date，支付宝数据取日期区间+30天范围
    汇总相同order_number的income_amount和expense_amount，更新到order_details_merge.paid_amount
    """
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': '权限不足，只有管理员可以执行汇总计算'}), 403
    
    data = request.get_json()
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    
    if not start_date or not end_date:
        return jsonify({'message': '请提供开始日期和结束日期'}), 400
    
    # 转换日期格式
    try:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': '日期格式错误，请使用YYYY-MM-DD格式'}), 400
    
    if start_date > end_date:
        return jsonify({'message': '开始日期不能晚于结束日期'}), 400

    try:
        from datetime import timedelta
        from models import AlipayAmount
        from sqlalchemy import func
        
        # 统计信息
        stats = {
            'processed_count': 0,
            'matched_count': 0,
            'updated_count': 0,
            'total_amount': 0,
            'errors': []
        }
        
        # 计算支付宝数据查询的结束日期（原结束日期+30天）
        alipay_end_date = end_date + timedelta(days=30)
        
        # 数据存在性检查 - 检查指定日期区间的订单详情合并数据（根据upload_date过滤）
        merge_records = db.session.query(OrderDetailsMerge).filter(
            OrderDetailsMerge.upload_date >= start_date,
            OrderDetailsMerge.upload_date <= end_date
        ).all()
        
        if not merge_records:
            return jsonify({
                'message': f'未找到上传日期区间 {start_date} 到 {end_date} 的订单详情合并数据，请先执行前两步',
                'stats': stats,
                'error_type': 'missing_merge_data'
            }), 400
            
        logger.info(f"数据检查通过 - 找到 {len(merge_records)} 条订单详情合并数据")
        
        # 检查支付宝数据是否存在
        alipay_records = db.session.query(AlipayAmount).filter(
            AlipayAmount.transaction_date >= start_date,
            AlipayAmount.transaction_date <= alipay_end_date
        ).all()
        
        if not alipay_records:
            return jsonify({
                'message': f'未找到日期区间 {start_date} 到 {alipay_end_date} 的支付宝金额数据，请先上传支付宝数据',
                'stats': stats,
                'error_type': 'missing_alipay_data'
            }), 400
            
        logger.info(f"支付宝数据检查通过 - 找到 {len(alipay_records)} 条支付宝数据")
        
        # 预先计算支付宝数据汇总（按order_number分组）
        alipay_summary = {}
        for alipay_record in alipay_records:
            if alipay_record.order_number:
                order_number = alipay_record.order_number
                if order_number not in alipay_summary:
                    alipay_summary[order_number] = {
                        'total_income': 0,
                        'total_expense': 0,
                        'net_amount': 0
                    }
                
                # 累加收入和支出
                income = float(alipay_record.income_amount) if alipay_record.income_amount else 0
                expense = float(alipay_record.expense_amount) if alipay_record.expense_amount else 0
                
                alipay_summary[order_number]['total_income'] += income
                alipay_summary[order_number]['total_expense'] += expense
                alipay_summary[order_number]['net_amount'] = (
                    alipay_summary[order_number]['total_income'] + 
                    alipay_summary[order_number]['total_expense']  # expense通常是负数，所以用加法
                )
        
        logger.info(f"支付宝数据汇总完成 - 共 {len(alipay_summary)} 个不同的订单号")
        
        # 处理每条合并记录
        for merge_record in merge_records:
            stats['processed_count'] += 1
            
            try:
                # 查找匹配的支付宝数据
                if (merge_record.online_order_number and 
                    merge_record.online_order_number in alipay_summary):
                    
                    alipay_data = alipay_summary[merge_record.online_order_number]
                    net_amount = alipay_data['net_amount']
                    
                    # 记录更新前的值
                    old_paid_amount = merge_record.paid_amount
                    old_updated_at = merge_record.updated_at
                    
                    # 更新paid_amount和updated_at
                    merge_record.paid_amount = net_amount
                    merge_record.updated_at = datetime.utcnow()
                    
                    # 强制标记对象为dirty，确保SQLAlchemy检测到变更
                    db.session.merge(merge_record)
                    
                    stats['matched_count'] += 1
                    stats['updated_count'] += 1
                    stats['total_amount'] += net_amount
                    
                    logger.info(f"更新订单 {merge_record.online_order_number} (ID: {merge_record.id}): "
                              f"收入={alipay_data['total_income']}, "
                              f"支出={alipay_data['total_expense']}, "
                              f"净额={net_amount}, "
                              f"paid_amount: {old_paid_amount} -> {net_amount}, "
                              f"updated_at: {old_updated_at} -> {merge_record.updated_at}")
                
            except Exception as e:
                error_msg = f"处理合并记录 {merge_record.internal_order_number or merge_record.online_order_number} 时出错: {str(e)}"
                stats['errors'].append(error_msg)
                logger.error(error_msg)
                continue
        
        # 提交数据库事务
        logger.info(f"准备提交数据库事务，共更新 {stats['updated_count']} 条记录")
        db.session.commit()
        logger.info("数据库事务提交成功")
        
        return jsonify({
            'message': f'订单支付金额更新完成！处理了 {stats["processed_count"]} 条记录，匹配支付宝数据 {stats["matched_count"]} 条，更新了 {stats["updated_count"]} 条记录，处理总金额 {stats["total_amount"]:.2f}',
            'stats': stats
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'订单支付金额更新失败: {str(e)}'}), 500