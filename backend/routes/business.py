from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text
from datetime import datetime
from decimal import Decimal
from models import db, User, ProductDataMerge, SubjectReport, PlantingRecord

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