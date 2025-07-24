import os
import pandas as pd
from datetime import datetime
from models import db, ProductData, ProductList, PlantingRecord, SubjectReport, ProductDataMerge
from utils import (
    get_field_mapping, safe_get_value, clean_product_code, safe_get_value_by_index,
    clean_product_code_by_index, safe_get_int, safe_get_float, safe_get_int_by_index,
    safe_get_float_by_index, safe_get_date, safe_parse_date, safe_get_str,
    read_file_with_encoding, get_subject_report_column_mapping
)
import logging
import re

logger = logging.getLogger(__name__)

class FileProcessor:
    """文件处理服务类"""
    
    def process_uploaded_file(self, filepath, platform, user_id, filename, upload_date):
        """处理上传的产品数据文件（XLSX格式，支持多个工作表）"""
        try:
            # 读取XLSX文件的所有工作表
            xl_file = pd.ExcelFile(filepath)
            total_success_count = 0
            
            # 根据平台映射字段
            field_mapping = get_field_mapping(platform)
            
            print(f"发现 {len(xl_file.sheet_names)} 个工作表: {xl_file.sheet_names}")
            
            # 遍历每个工作表
            for sheet_name in xl_file.sheet_names:
                print(f"处理工作表: {sheet_name}")
                
                try:
                    # 读取当前工作表数据
                    df = pd.read_excel(filepath, sheet_name=sheet_name)
                    
                    # 获取列名
                    columns = df.columns.tolist()
                    print(f"工作表 {sheet_name} 列名: {columns}")
                    
                    sheet_success_count = 0
                    
                    for _, row in df.iterrows():
                        try:
                            # 跳过完全空的行
                            if row.isna().all():
                                continue
                            
                            # 使用字段映射获取数据
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
                            
                            # 跳过没有关键数据的行
                            if not tmall_product_code and not product_name:
                                continue
                            
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
                            sheet_success_count += 1
                            
                        except Exception as e:
                            print(f"处理工作表 {sheet_name} 行数据时出错: {e}")
                            continue
                    
                    print(f"工作表 {sheet_name} 处理完成，成功处理 {sheet_success_count} 条数据")
                    total_success_count += sheet_success_count
                    
                except Exception as e:
                    print(f"处理工作表 {sheet_name} 时出错: {e}")
                    continue
            
            db.session.commit()
            print(f"所有工作表处理完成，总计成功处理 {total_success_count} 条数据")
            
            # 处理merge表数据
            try:
                merge_count = self.process_product_data_merge(upload_date, user_id)
                print(f"Merge处理完成，处理了 {merge_count} 条数据")
            except Exception as e:
                print(f"Merge处理出错: {e}")
                # merge处理失败不影响主流程
            
            return total_success_count
            
        except Exception as e:
            db.session.rollback()
            raise e

    def process_product_data_merge(self, upload_date, user_id):
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

    def process_product_list_file(self, filepath, user_id):
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

    def process_planting_records_file(self, filepath, user_id):
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
                logger.info(f"工作表 {sheet_name} 列名: {columns}")
                
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
                
                logger.info(f"工作表 {sheet_name} 列名映射结果:")
                for field, col in col_mapping.items():
                    logger.info(f"  {field}: {col}")
                
                # 处理每一行数据
                for _, row in df.iterrows():
                    try:
                        # 跳过完全空的行或标题行
                        if row.isna().all():
                            continue
                        
                        # 检查是否是标题行
                        if not pd.isna(row.iloc[0]) and str(row.iloc[0]).lower() in ['数量', '付款时间', '序号']:
                            continue
                        
                        # 检查是否有任何有意义的数据
                        has_data = False
                        key_fields = [col_mapping.get('quantity'), col_mapping.get('order_date'), 
                                     col_mapping.get('wechat_id'), col_mapping.get('product_id'), 
                                     col_mapping.get('order_number')]
                        for field in key_fields:
                            if field and field in row.index and pd.notna(row[field]):
                                has_data = True
                                break
                        
                        if not has_data:
                            continue
                        
                        # 处理日期字段
                        order_date = None
                        refund_date = None
                        
                        if col_mapping.get('order_date'):
                            order_date_value = row.get(col_mapping.get('order_date'))
                            order_date = safe_parse_date(order_date_value)
                        
                        if col_mapping.get('refund_date'):
                            refund_date_value = row.get(col_mapping.get('refund_date'))
                            refund_date = safe_parse_date(refund_date_value)
                        
                        # 处理订单号
                        order_number = None
                        if col_mapping.get('order_number'):
                            order_number_value = row.get(col_mapping.get('order_number'))
                            if pd.notna(order_number_value):
                                try:
                                    if isinstance(order_number_value, (float, int)) or (isinstance(order_number_value, str) and 'e' in order_number_value.lower()):
                                        order_number = str(int(float(order_number_value)))
                                    else:
                                        order_number = ''.join(str(order_number_value).split())
                                        if '.' in order_number:
                                            order_number = str(int(float(order_number)))
                                except (ValueError, TypeError) as e:
                                    logger.warning(f"订单号格式转换失败: {order_number_value} -> {str(e)}")
                                    order_number = str(order_number_value)

                        # 处理内部订单号
                        internal_order_number = None
                        if col_mapping.get('internal_order_number'):
                            internal_number_value = row.get(col_mapping.get('internal_order_number'))
                            if pd.notna(internal_number_value):
                                try:
                                    internal_order_number = ''.join(str(internal_number_value).split())
                                    if '.' in internal_order_number:
                                        internal_order_number = str(int(float(internal_order_number)))
                                except (ValueError, TypeError) as e:
                                    logger.warning(f"内部订单号格式转换失败: {internal_number_value} -> {str(e)}")
                                    internal_order_number = str(internal_number_value)
                        
                        # 处理product_id
                        product_id = safe_get_str(row, col_mapping.get('product_id'))
                        
                        # 验证product_id是否为有效的数字字符串
                        if product_id:
                            product_id = ''.join(product_id.split())
                            
                            if '.' in product_id:
                                try:
                                    product_id = str(int(float(product_id)))
                                except (ValueError, TypeError):
                                    logger.warning(f"无效的product_id格式(小数转换失败): {product_id}")
                                    continue
                            
                            if not re.match(r'^\d+$', product_id):
                                logger.warning(f"无效的product_id格式(非数字): {product_id}")
                                continue
                        else:
                            logger.warning("product_id为空，跳过该行")
                            continue
                        
                        # 最终格式化订单号
                        final_order_number = order_number
                        if isinstance(order_number, (float, int)) or (isinstance(order_number, str) and ('e' in str(order_number).lower() or '.' in str(order_number))):
                            try:
                                final_order_number = str(int(float(order_number)))
                            except (ValueError, TypeError) as e:
                                logger.error(f"订单号最终格式化失败: {order_number} -> {str(e)}")
                                final_order_number = str(order_number)

                        final_internal_number = internal_order_number
                        if isinstance(internal_order_number, (float, int)) or (isinstance(internal_order_number, str) and '.' in str(internal_order_number)):
                            try:
                                final_internal_number = str(int(float(internal_order_number)))
                            except (ValueError, TypeError) as e:
                                logger.error(f"内部订单号最终格式化失败: {internal_order_number} -> {str(e)}")
                                final_internal_number = str(internal_order_number)

                        planting_record = PlantingRecord(
                            staff_name=sheet_name,
                            quantity=safe_get_int(row, col_mapping.get('quantity')),
                            order_date=order_date,
                            wechat_id=safe_get_str(row, col_mapping.get('wechat_id')),
                            product_id=product_id,
                            keyword=safe_get_str(row, col_mapping.get('keyword')),
                            wangwang_id=safe_get_str(row, col_mapping.get('wangwang_id')),
                            order_wechat=safe_get_str(row, col_mapping.get('order_wechat')),
                            order_number=final_order_number,
                            amount=safe_get_float(row, col_mapping.get('amount')),
                            gift_commission=safe_get_float(row, col_mapping.get('gift_commission')),
                            refund_status=safe_get_str(row, col_mapping.get('refund_status')),
                            refund_amount=safe_get_float(row, col_mapping.get('refund_amount')),
                            refund_wechat=safe_get_str(row, col_mapping.get('refund_wechat')),
                            refund_date=refund_date,
                            store_name=safe_get_str(row, col_mapping.get('store_name')),
                            internal_order_number=final_internal_number,
                            uploaded_by=user_id
                        )
                        
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

    def process_subject_report_file(self, filepath, user_id, filename, upload_date):
        """处理主体报表文件"""
        try:
            # 读取文件
            df = read_file_with_encoding(filepath)
            
            success_count = 0
            
            # 从文件名中提取报表日期（如果可能）
            report_date = upload_date  # 默认使用上传日期
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