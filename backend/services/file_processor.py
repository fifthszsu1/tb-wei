import os
import pandas as pd
from datetime import datetime
from models import db, ProductData, ProductList, PlantingRecord, SubjectReport, ProductDataMerge, OrderDetails, CompanyCostPricing, OperationCostPricing, OrderDetailsMerge
from utils import (
    get_field_mapping, safe_get_value, clean_product_code, safe_get_value_by_index,
    clean_product_code_by_index, safe_get_int, safe_get_float, safe_get_int_by_index,
    safe_get_float_by_index, safe_get_date, safe_get_datetime, safe_parse_date, safe_get_str,
    read_file_with_encoding, get_subject_report_column_mapping
)
import logging
import re

logger = logging.getLogger(__name__)

class FileProcessor:
    """文件处理服务类"""
    
    def process_uploaded_file(self, filepath, platform, user_id, filename, upload_date, supplier_store):
        """处理上传的产品数据文件（XLSX格式，支持多个工作表）"""
        try:
            # 读取XLSX文件的所有工作表
            xl_file = pd.ExcelFile(filepath)
            total_success_count = 0
            
            # 根据平台映射字段
            field_mapping = get_field_mapping(platform)
            
            print(f"发现 {len(xl_file.sheet_names)} 个工作表: {xl_file.sheet_names}")
            
            # 兜底校验：扫描文件中的实际门店名，删除冲突的旧数据
            actual_stores_in_file = set()
            for sheet_name in xl_file.sheet_names:
                try:
                    df = pd.read_excel(filepath, sheet_name=sheet_name)
                    for _, row in df.iterrows():
                        if row.isna().all():
                            continue
                        actual_store = safe_get_value(row, field_mapping.get('tmall_supplier_name'))
                        if actual_store and actual_store.strip():
                            actual_stores_in_file.add(actual_store.strip())
                except Exception as e:
                    print(f"扫描工作表 {sheet_name} 中的门店信息时出错: {e}")
                    continue
            
            print(f"文件中发现的实际门店名: {actual_stores_in_file}")
            
            # 删除文件中实际门店名对应的旧数据（兜底校验）
            for actual_store in actual_stores_in_file:
                if actual_store != supplier_store:  # 如果文件中的门店名与用户选择的不同
                    print(f"兜底校验：删除门店 {actual_store} 在 {upload_date} 的旧数据")
                    # 删除ProductDataMerge中的数据
                    ProductDataMerge.query.filter_by(
                        upload_date=upload_date,
                        tmall_supplier_name=actual_store
                    ).delete()
                    # 删除ProductData中的数据
                    old_records = ProductData.query.filter_by(
                        upload_date=upload_date,
                        tmall_supplier_name=actual_store
                    ).all()
                    for record in old_records:
                        db.session.delete(record)
                    db.session.commit()
                    print(f"已删除门店 {actual_store} 在 {upload_date} 的 {len(old_records)} 条旧记录")
            
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
                                tmall_supplier_name=supplier_store,  # 使用前端选择的门店
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
                product_list_tmall_supplier_id=product_list_record.tmall_supplier_id if product_list_record else None,
                product_list_operator=product_list_record.operator if product_list_record else None,
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
        """处理产品总表文件（支持多个Tab）"""
        try:
            # 读取Excel文件的所有工作表
            xl_file = pd.ExcelFile(filepath)
            total_success_count = 0
            
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
                    
                    # 创建列名映射字典
                    col_mapping = {}
                    
                    # 首先进行精确匹配
                    exact_matches = {
                        '天猫ID': 'product_id',
                        '产品ID': 'product_id', 
                        '链接ID': 'product_id',
                        '商品名称': 'product_name',
                        '产品名称': 'product_name',
                        '链接简称': 'product_name',
                        '简称': 'product_name',
                        '名称': 'product_name',
                        '上架时间': 'listing_time',
                        '天猫供销ID': 'tmall_supplier_id',
                        '供销ID': 'tmall_supplier_id',
                        '操作人': 'operator',
                        '操作员': 'operator'
                    }
                    
                    # 记录已经匹配的字段
                    matched_fields = set()
                    
                    # 精确匹配
                    for col in columns:
                        col_str = str(col).strip()
                        if col_str in exact_matches:
                            field_name = exact_matches[col_str]
                            col_mapping[field_name] = col
                            matched_fields.add(field_name)
                    
                    # 模糊匹配（针对未匹配的字段）
                    for col in columns:
                        col_str = str(col).strip().lower()
                        
                        # 跳过已经精确匹配的列
                        if str(col).strip() in exact_matches:
                            continue
                        
                        # 模糊匹配规则
                        if ('id' in col_str or '天猫ID' in str(col).strip()) and 'product_id' not in matched_fields:
                            col_mapping['product_id'] = col
                            matched_fields.add('product_id')
                        elif ('简称' in col_str or '链接简称' in col_str or ('名称' in col_str and '供销' not in col_str)) and 'product_name' not in matched_fields:
                            col_mapping['product_name'] = col
                            matched_fields.add('product_name')
                        elif ('上架时间' in col_str or '上架' in col_str) and 'listing_time' not in matched_fields:
                            col_mapping['listing_time'] = col
                            matched_fields.add('listing_time')
                        elif ('供销' in col_str or '天猫供销ID' in col_str) and 'tmall_supplier_id' not in matched_fields:
                            col_mapping['tmall_supplier_id'] = col
                            matched_fields.add('tmall_supplier_id')
                        elif ('操作人' in col_str) and 'operator' not in matched_fields:
                            col_mapping['operator'] = col
                            matched_fields.add('operator')
                    
                    # 如果没有找到主要字段，尝试按位置匹配
                    if 'product_id' not in matched_fields and len(columns) >= 1:
                        col_mapping['product_id'] = columns[0]
                        matched_fields.add('product_id')
                    if 'product_name' not in matched_fields and len(columns) >= 2:
                        col_mapping['product_name'] = columns[1]
                        matched_fields.add('product_name')
                    if 'listing_time' not in matched_fields and len(columns) >= 3:
                        col_mapping['listing_time'] = columns[2]
                        matched_fields.add('listing_time')
                    if 'tmall_supplier_id' not in matched_fields and len(columns) >= 4:
                        col_mapping['tmall_supplier_id'] = columns[3]
                        matched_fields.add('tmall_supplier_id')
                    if 'operator' not in matched_fields and len(columns) >= 5:
                        col_mapping['operator'] = columns[4]
                        matched_fields.add('operator')
                    
                    print(f"工作表 {sheet_name} 列名映射结果:")
                    for field, col in col_mapping.items():
                        print(f"  {field}: {col}")
                    
                    # 检查必需字段
                    if 'product_id' not in col_mapping:
                        print(f"工作表 {sheet_name} 缺少必需的产品ID列，跳过")
                        continue
                    
                    sheet_success_count = 0
                    
                    for _, row in df.iterrows():
                        try:
                            # 跳过空行
                            product_id_value = row.get(col_mapping.get('product_id'))
                            if pd.isna(product_id_value):
                                continue
                            
                            # 清理产品ID（去掉.0等格式问题）
                            product_id = clean_product_code(row, col_mapping.get('product_id'))
                            if not product_id:
                                # 如果clean_product_code返回None，使用原始值转字符串
                                product_id = str(product_id_value).split('.')[0] if '.' in str(product_id_value) else str(product_id_value)
                            
                            # 处理上架时间
                            listing_time = None
                            if col_mapping.get('listing_time'):
                                time_value = row.get(col_mapping.get('listing_time'))
                                if not pd.isna(time_value):
                                    if isinstance(time_value, str):
                                        try:
                                            listing_time = datetime.strptime(time_value, '%Y-%m-%d').date()
                                        except:
                                            try:
                                                listing_time = datetime.strptime(time_value, '%Y/%m/%d').date()
                                            except:
                                                try:
                                                    listing_time = datetime.strptime(time_value, '%Y-%m-%d %H:%M:%S').date()
                                                except:
                                                    pass
                                    else:
                                        try:
                                            listing_time = time_value
                                        except:
                                            pass
                            
                            # 获取产品名称（链接简称）
                            product_name = ''
                            if col_mapping.get('product_name'):
                                name_value = row.get(col_mapping.get('product_name'))
                                if not pd.isna(name_value):
                                    product_name = str(name_value)
                            
                            # 获取天猫供销ID（使用相同的清理逻辑）
                            tmall_supplier_id = None
                            if col_mapping.get('tmall_supplier_id'):
                                supplier_id_value = row.get(col_mapping.get('tmall_supplier_id'))
                                if not pd.isna(supplier_id_value):
                                    # 使用clean_product_code清理天猫供销ID
                                    tmall_supplier_id = clean_product_code(row, col_mapping.get('tmall_supplier_id'))
                                    if not tmall_supplier_id:
                                        # 如果clean_product_code返回None，手动去掉.0
                                        tmall_supplier_id = str(supplier_id_value).split('.')[0] if '.' in str(supplier_id_value) else str(supplier_id_value)
                            
                            # 获取操作人
                            operator = None
                            if col_mapping.get('operator'):
                                operator_value = row.get(col_mapping.get('operator'))
                                if not pd.isna(operator_value):
                                    operator = str(operator_value)
                            
                            # 调试信息：打印处理的数据
                            print(f"处理数据行: product_id={product_id}, product_name={product_name}, tmall_supplier_id={tmall_supplier_id}, operator={operator}")
                            
                            product_list = ProductList(
                                product_id=product_id,
                                product_name=product_name,
                                listing_time=listing_time,
                                tmall_supplier_id=tmall_supplier_id,
                                operator=operator,
                                uploaded_by=user_id
                            )
                            
                            db.session.add(product_list)
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
            return total_success_count
            
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

    def process_order_details_file(self, filepath, user_id, filename, upload_date):
        """处理订单详情文件（支持多个Tab）"""
        try:
            # 读取Excel文件的所有工作表
            xl_file = pd.ExcelFile(filepath)
            total_success_count = 0
            
            print(f"发现 {len(xl_file.sheet_names)} 个工作表: {xl_file.sheet_names}")
            
            # 删除同一天的订单详情数据（如果存在）
            existing_records = OrderDetails.query.filter_by(upload_date=upload_date).all()
            if existing_records:
                for record in existing_records:
                    db.session.delete(record)
                print(f"删除了 {len(existing_records)} 条同一天的订单详情数据")
            
            # 遍历每个工作表
            for sheet_name in xl_file.sheet_names:
                print(f"处理工作表: {sheet_name}")
                
                try:
                    # 读取当前工作表数据
                    df = pd.read_excel(filepath, sheet_name=sheet_name)
                    
                    # 获取列名
                    columns = df.columns.tolist()
                    print(f"工作表 {sheet_name} 列名: {columns}")
                    
                    # 创建列名映射字典
                    col_mapping = {}
                    
                    # 订单详情字段的精确匹配
                    exact_matches = {
                        '内部订单号': 'internal_order_number',
                        '线上订单号': 'online_order_number',
                        '店铺编号': 'store_code',
                        '店铺名称': 'store_name',
                        '下单时间': 'order_time',
                        '付款日期': 'payment_date',
                        '发货日期': 'shipping_date',
                        '应付金额': 'payable_amount',
                        '已付金额': 'paid_amount',
                        '快递公司': 'express_company',
                        '快递单号': 'tracking_number',
                        '省份': 'province',
                        '城市': 'city',
                        '区县': 'district',
                        '商品编码': 'product_code',
                        '商品名称': 'product_name',
                        '数量': 'quantity',
                        '商品单价': 'unit_price',
                        '商品金额': 'product_amount',
                        '支付单号': 'payment_number',
                        '图片地址': 'image_url',
                        '店铺款式编码': 'store_style_code'
                    }
                    
                    # 记录已经匹配的字段
                    matched_fields = set()
                    
                    # 精确匹配
                    for col in columns:
                        col_str = str(col).strip()
                        if col_str in exact_matches:
                            field_name = exact_matches[col_str]
                            col_mapping[field_name] = col
                            matched_fields.add(field_name)
                    
                    print(f"工作表 {sheet_name} 列名映射结果:")
                    for field, col in col_mapping.items():
                        print(f"  {field}: {col}")
                    
                    sheet_success_count = 0
                    
                    for _, row in df.iterrows():
                        try:
                            # 跳过完全空的行
                            if row.isna().all():
                                continue
                            
                            # 获取各个字段的值
                            # 处理订单号字段（清理.0后缀）
                            internal_order_number = None
                            if col_mapping.get('internal_order_number'):
                                internal_order_value = row.get(col_mapping.get('internal_order_number'))
                                if not pd.isna(internal_order_value):
                                    # 使用clean_product_code清理内部订单号
                                    internal_order_number = clean_product_code(row, col_mapping.get('internal_order_number'))
                                    if not internal_order_number:
                                        # 如果clean_product_code返回None，手动去掉.0
                                        internal_order_number = str(internal_order_value).split('.')[0] if '.' in str(internal_order_value) else str(internal_order_value)
                            
                            online_order_number = None
                            if col_mapping.get('online_order_number'):
                                online_order_value = row.get(col_mapping.get('online_order_number'))
                                if not pd.isna(online_order_value):
                                    # 使用clean_product_code清理线上订单号
                                    online_order_number = clean_product_code(row, col_mapping.get('online_order_number'))
                                    if not online_order_number:
                                        # 如果clean_product_code返回None，手动去掉.0
                                        online_order_number = str(online_order_value).split('.')[0] if '.' in str(online_order_value) else str(online_order_value)
                            
                            store_code = safe_get_value(row, col_mapping.get('store_code'))
                            store_name = safe_get_value(row, col_mapping.get('store_name'))
                            
                            # 处理时间字段
                            # order_time是DateTime类型，可以包含时间信息
                            order_time = safe_get_datetime(row, col_mapping.get('order_time'))
                            # payment_date和shipping_date是Date类型，只保留日期部分
                            payment_date = safe_get_date(row, col_mapping.get('payment_date'))
                            shipping_date = safe_get_date(row, col_mapping.get('shipping_date'))
                            
                            # 调试信息：输出解析后的日期时间
                            print(f"日期解析结果: order_time={order_time}, payment_date={payment_date}, shipping_date={shipping_date}")
                            if col_mapping.get('order_time') and col_mapping.get('order_time') in row:
                                print(f"原始order_time值: {row[col_mapping.get('order_time')]}")
                            if col_mapping.get('payment_date') and col_mapping.get('payment_date') in row:
                                print(f"原始payment_date值: {row[col_mapping.get('payment_date')]}")
                            if col_mapping.get('shipping_date') and col_mapping.get('shipping_date') in row:
                                print(f"原始shipping_date值: {row[col_mapping.get('shipping_date')]}")
                            
                            # 处理金额字段
                            payable_amount = safe_get_float(row, col_mapping.get('payable_amount'))
                            paid_amount = safe_get_float(row, col_mapping.get('paid_amount'))
                            unit_price = safe_get_float(row, col_mapping.get('unit_price'))
                            product_amount = safe_get_float(row, col_mapping.get('product_amount'))
                            
                            # 处理物流信息
                            express_company = safe_get_value(row, col_mapping.get('express_company'))
                            
                            # 处理快递单号（清理.0后缀）
                            tracking_number = None
                            if col_mapping.get('tracking_number'):
                                tracking_value = row.get(col_mapping.get('tracking_number'))
                                if not pd.isna(tracking_value):
                                    # 使用clean_product_code清理快递单号
                                    tracking_number = clean_product_code(row, col_mapping.get('tracking_number'))
                                    if not tracking_number:
                                        # 如果clean_product_code返回None，手动去掉.0
                                        tracking_number = str(tracking_value).split('.')[0] if '.' in str(tracking_value) else str(tracking_value)
                            
                            province = safe_get_value(row, col_mapping.get('province'))
                            city = safe_get_value(row, col_mapping.get('city'))
                            district = safe_get_value(row, col_mapping.get('district'))
                            
                            # 处理商品信息
                            # 处理商品编码（保持原始格式，商品编码可能含有字母和连字符）
                            product_code = safe_get_value(row, col_mapping.get('product_code'))
                            
                            product_name = safe_get_value(row, col_mapping.get('product_name'))
                            quantity = safe_get_int(row, col_mapping.get('quantity'))
                            
                            # 处理其他信息
                            # 处理支付单号（清理.0后缀）
                            payment_number = None
                            if col_mapping.get('payment_number'):
                                payment_value = row.get(col_mapping.get('payment_number'))
                                if not pd.isna(payment_value):
                                    # 使用clean_product_code清理支付单号
                                    payment_number = clean_product_code(row, col_mapping.get('payment_number'))
                                    if not payment_number:
                                        # 如果clean_product_code返回None，手动去掉.0
                                        payment_number = str(payment_value).split('.')[0] if '.' in str(payment_value) else str(payment_value)
                            
                            image_url = safe_get_value(row, col_mapping.get('image_url'))
                            
                            # 处理店铺款式编码（清理.0后缀）
                            store_style_code = None
                            if col_mapping.get('store_style_code'):
                                style_code_value = row.get(col_mapping.get('store_style_code'))
                                if not pd.isna(style_code_value):
                                    # 使用clean_product_code清理店铺款式编码
                                    store_style_code = clean_product_code(row, col_mapping.get('store_style_code'))
                                    if not store_style_code:
                                        # 如果clean_product_code返回None，手动去掉.0
                                        store_style_code = str(style_code_value).split('.')[0] if '.' in str(style_code_value) else str(style_code_value)
                            
                            # 调试信息：输出解析后的数据
                            print(f"处理订单数据: ")
                            if col_mapping.get('internal_order_number') and col_mapping.get('internal_order_number') in row:
                                original_internal = row[col_mapping.get('internal_order_number')]
                                print(f"  内部订单号: 原始值={original_internal}, 清理后={internal_order_number}")
                            if col_mapping.get('online_order_number') and col_mapping.get('online_order_number') in row:
                                original_online = row[col_mapping.get('online_order_number')]
                                print(f"  线上订单号: 原始值={original_online}, 清理后={online_order_number}")
                            if col_mapping.get('product_code') and col_mapping.get('product_code') in row:
                                original_product_code = row[col_mapping.get('product_code')]
                                print(f"  商品编码: 原始值={original_product_code}, 保持原样={product_code}")
                            if col_mapping.get('store_style_code') and col_mapping.get('store_style_code') in row:
                                original_style_code = row[col_mapping.get('store_style_code')]
                                print(f"  店铺款式编码: 原始值={original_style_code}, 清理后={store_style_code}")
                            if col_mapping.get('tracking_number') and col_mapping.get('tracking_number') in row:
                                original_tracking = row[col_mapping.get('tracking_number')]
                                print(f"  快递单号: 原始值={original_tracking}, 清理后={tracking_number}")
                            if col_mapping.get('payment_number') and col_mapping.get('payment_number') in row:
                                original_payment = row[col_mapping.get('payment_number')]
                                print(f"  支付单号: 原始值={original_payment}, 清理后={payment_number}")
                            
                            # 跳过没有关键数据的行
                            if not internal_order_number and not online_order_number:
                                continue
                            
                            # TODO: 供应商过滤逻辑 - 将来可能需要去掉这个过滤条件
                            # 当前只导入店铺名称包含"供应商"的数据
                            # 如需要导入所有数据，请注释掉下面的条件判断
                            if store_name and '供应商' not in store_name:
                                print(f"跳过不包含'供应商'的店铺: {store_name}")
                                continue
                            
                            order_detail = OrderDetails(
                                internal_order_number=internal_order_number,
                                online_order_number=online_order_number,
                                store_code=store_code,
                                store_name=store_name,
                                order_time=order_time,
                                payment_date=payment_date,
                                shipping_date=shipping_date,
                                payable_amount=payable_amount,
                                paid_amount=paid_amount,
                                express_company=express_company,
                                tracking_number=tracking_number,
                                province=province,
                                city=city,
                                district=district,
                                product_code=product_code,
                                product_name=product_name,
                                quantity=quantity,
                                unit_price=unit_price,
                                product_amount=product_amount,
                                payment_number=payment_number,
                                image_url=image_url,
                                store_style_code=store_style_code,
                                filename=filename,
                                upload_date=upload_date,
                                uploaded_by=user_id
                            )
                            
                            db.session.add(order_detail)
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
            return total_success_count
            
        except Exception as e:
            db.session.rollback()
            raise e

    def process_product_pricing_file(self, filepath, user_id, filename):
        """处理产品定价文件（第一个Tab落库到公司成本价格表，其他Tab落库到运营成本价格表）"""
        try:
            # 读取Excel文件的所有工作表
            xl_file = pd.ExcelFile(filepath)
            total_success_count = 0
            company_success_count = 0
            operation_success_count = 0
            
            print(f"发现 {len(xl_file.sheet_names)} 个工作表: {xl_file.sheet_names}")
            
            # 删除现有的产品定价数据（全部清空）
            existing_company_records = CompanyCostPricing.query.all()
            existing_operation_records = OperationCostPricing.query.all()
            
            if existing_company_records:
                for record in existing_company_records:
                    db.session.delete(record)
                print(f"删除了 {len(existing_company_records)} 条现有的公司成本价格数据")
            
            if existing_operation_records:
                for record in existing_operation_records:
                    db.session.delete(record)
                print(f"删除了 {len(existing_operation_records)} 条现有的运营成本价格数据")
            
            # 遍历每个工作表
            for index, sheet_name in enumerate(xl_file.sheet_names):
                print(f"处理工作表 {index + 1}/{len(xl_file.sheet_names)}: {sheet_name}")
                
                try:
                    # 读取当前工作表数据
                    df = pd.read_excel(filepath, sheet_name=sheet_name)
                    
                    # 获取列名
                    columns = df.columns.tolist()
                    print(f"工作表 {sheet_name} 列名: {columns}")
                    
                    # 判断是第一个Tab还是其他Tab
                    is_first_tab = (index == 0)
                    
                    if is_first_tab:
                        # 第一个Tab - 公司成本价格
                        sheet_success_count = self._process_company_cost_pricing_tab(
                            df, sheet_name, columns, filename, user_id
                        )
                        company_success_count += sheet_success_count
                    else:
                        # 其他Tab - 运营成本价格
                        sheet_success_count = self._process_operation_cost_pricing_tab(
                            df, sheet_name, columns, filename, user_id
                        )
                        operation_success_count += sheet_success_count
                    
                    print(f"工作表 {sheet_name} 处理完成，成功处理 {sheet_success_count} 条数据")
                    total_success_count += sheet_success_count
                    
                except Exception as e:
                    print(f"处理工作表 {sheet_name} 时出错: {e}")
                    continue
            
            db.session.commit()
            print(f"所有工作表处理完成，总计成功处理 {total_success_count} 条数据")
            print(f"其中：公司成本价格 {company_success_count} 条，运营成本价格 {operation_success_count} 条")
            return total_success_count
            
        except Exception as e:
            db.session.rollback()
            raise e

    def _process_company_cost_pricing_tab(self, df, sheet_name, columns, filename, user_id):
        """处理公司成本价格Tab（第一个Tab）"""
        # 创建列名映射字典
        col_mapping = {}
        
        # 公司成本价格字段的精确匹配
        exact_matches = {
            '适配品牌分类': 'brand_category',
            '商品编码': 'product_code',
            '产品名称': 'product_name',
            '实际供货价': 'actual_supply_price',
            '供货价': 'actual_supply_price',  # 添加更多可能的列名
            '价格': 'actual_supply_price',
            '成本价': 'actual_supply_price',
            '单价': 'actual_supply_price',
            '供应商': 'supplier'
        }
        
        # 记录已经匹配的字段
        matched_fields = set()
        
        # 精确匹配
        for col in columns:
            col_str = str(col).strip()
            if col_str in exact_matches:
                field_name = exact_matches[col_str]
                col_mapping[field_name] = col
                matched_fields.add(field_name)
        
        # 模糊匹配（针对未匹配的字段）
        for col in columns:
            col_str = str(col).strip().lower()
            
            # 跳过已经精确匹配的列
            if str(col).strip() in exact_matches:
                continue
            
            # 模糊匹配规则
            if ('适配' in col_str and '品牌' in col_str) and 'brand_category' not in matched_fields:
                col_mapping['brand_category'] = col
                matched_fields.add('brand_category')
            elif ('商品' in col_str and '编码' in col_str) and 'product_code' not in matched_fields:
                col_mapping['product_code'] = col
                matched_fields.add('product_code')
            elif ('产品' in col_str and '名称' in col_str) and 'product_name' not in matched_fields:
                col_mapping['product_name'] = col
                matched_fields.add('product_name')
            elif (('实际' in col_str and '供货价' in col_str) or 
                  ('供货价' in col_str) or 
                  ('价格' in col_str)) and 'actual_supply_price' not in matched_fields:
                col_mapping['actual_supply_price'] = col
                matched_fields.add('actual_supply_price')
            elif '供应商' in col_str and 'supplier' not in matched_fields:
                col_mapping['supplier'] = col
                matched_fields.add('supplier')
        
        print(f"公司成本价格表 - 工作表 {sheet_name} 列名映射结果:")
        for field, col in col_mapping.items():
            print(f"  {field}: {col}")
        
        # 检查字段映射完整性
        expected_fields = ['brand_category', 'product_code', 'product_name', 'actual_supply_price', 'supplier']
        missing_fields = [field for field in expected_fields if field not in col_mapping]
        if missing_fields:
            print(f"警告：以下字段未能映射: {missing_fields}")
            print(f"可用列名: {columns}")
        
        # 检查必需字段
        if 'product_code' not in col_mapping:
            print(f"工作表 {sheet_name} 缺少必需的产品编号列，跳过")
            return 0
        
        sheet_success_count = 0
        
        for _, row in df.iterrows():
            try:
                # 跳过完全空的行
                if row.isna().all():
                    continue
                
                # 获取产品编号
                product_code = safe_get_value(row, col_mapping.get('product_code'))
                if not product_code:
                    continue
                
                # 获取各个字段的值
                brand_category = safe_get_value(row, col_mapping.get('brand_category'))
                product_name = safe_get_value(row, col_mapping.get('product_name'))
                actual_supply_price = safe_get_float(row, col_mapping.get('actual_supply_price'))
                supplier = safe_get_value(row, col_mapping.get('supplier'))
                
                # 调试信息：输出解析后的价格
                if col_mapping.get('actual_supply_price'):
                    original_price_value = row.get(col_mapping.get('actual_supply_price'))
                    print(f"价格解析: 列名={col_mapping.get('actual_supply_price')}, 原始值={original_price_value}, 解析值={actual_supply_price}")
                else:
                    print(f"警告：未找到实际供货价字段映射")
                
                company_cost = CompanyCostPricing(
                    brand_category=brand_category,
                    product_code=product_code,
                    product_name=product_name,
                    actual_supply_price=actual_supply_price,
                    supplier=supplier,
                    filename=filename,
                    uploaded_by=user_id
                )
                
                db.session.add(company_cost)
                sheet_success_count += 1
                
            except Exception as e:
                print(f"处理公司成本价格表行数据时出错: {e}")
                continue
        
        return sheet_success_count

    def _process_operation_cost_pricing_tab(self, df, sheet_name, columns, filename, user_id):
        """处理运营成本价格Tab（其他Tab）"""
        # 从Tab名提取运营人员
        operation_staff = self._extract_operation_staff_from_tab_name(sheet_name)
        
        # 创建列名映射字典
        col_mapping = {}
        
        # 运营成本价格字段的精确匹配
        exact_matches = {
            '适配品牌分类': 'brand_category',
            '商品编码': 'product_code',
            '产品名称': 'product_name',
            '供货价': 'supply_price',
            '运营供货价': 'supply_price',  # 添加更多可能的列名
            '价格': 'supply_price',
            '成本价': 'supply_price',
            '单价': 'supply_price'
        }
        
        # 记录已经匹配的字段
        matched_fields = set()
        
        # 精确匹配
        for col in columns:
            col_str = str(col).strip()
            if col_str in exact_matches:
                field_name = exact_matches[col_str]
                col_mapping[field_name] = col
                matched_fields.add(field_name)
        
        # 模糊匹配（针对未匹配的字段）
        for col in columns:
            col_str = str(col).strip().lower()
            
            # 跳过已经精确匹配的列
            if str(col).strip() in exact_matches:
                continue
            
            # 模糊匹配规则
            if ('适配' in col_str and '品牌' in col_str) and 'brand_category' not in matched_fields:
                col_mapping['brand_category'] = col
                matched_fields.add('brand_category')
            elif ('商品' in col_str and '编码' in col_str) and 'product_code' not in matched_fields:
                col_mapping['product_code'] = col
                matched_fields.add('product_code')
            elif ('产品' in col_str and '名称' in col_str) and 'product_name' not in matched_fields:
                col_mapping['product_name'] = col
                matched_fields.add('product_name')
            elif ('供货价' in col_str or '价格' in col_str) and 'supply_price' not in matched_fields:
                col_mapping['supply_price'] = col
                matched_fields.add('supply_price')
        
        print(f"运营成本价格表 - 工作表 {sheet_name} 列名映射结果:")
        for field, col in col_mapping.items():
            print(f"  {field}: {col}")
        print(f"  运营人员: {operation_staff} (来自Tab名: {sheet_name})")
        
        # 检查字段映射完整性
        expected_fields = ['brand_category', 'product_code', 'product_name', 'supply_price']
        missing_fields = [field for field in expected_fields if field not in col_mapping]
        if missing_fields:
            print(f"警告：以下字段未能映射: {missing_fields}")
            print(f"可用列名: {columns}")
        
        # 检查必需字段
        if 'product_code' not in col_mapping:
            print(f"工作表 {sheet_name} 缺少必需的产品编号列，跳过")
            return 0
        
        sheet_success_count = 0
        
        for _, row in df.iterrows():
            try:
                # 跳过完全空的行
                if row.isna().all():
                    continue
                
                # 获取产品编号
                product_code = safe_get_value(row, col_mapping.get('product_code'))
                if not product_code:
                    continue
                
                # 获取各个字段的值
                brand_category = safe_get_value(row, col_mapping.get('brand_category'))
                product_name = safe_get_value(row, col_mapping.get('product_name'))
                supply_price = safe_get_float(row, col_mapping.get('supply_price'))
                
                # 调试信息：输出解析后的价格
                if col_mapping.get('supply_price'):
                    original_price_value = row.get(col_mapping.get('supply_price'))
                    print(f"运营价格解析: 列名={col_mapping.get('supply_price')}, 原始值={original_price_value}, 解析值={supply_price}")
                else:
                    print(f"警告：未找到供货价字段映射")
                
                operation_cost = OperationCostPricing(
                    brand_category=brand_category,
                    product_code=product_code,
                    product_name=product_name,
                    supply_price=supply_price,
                    operation_staff=operation_staff,
                    filename=filename,
                    tab_name=sheet_name,
                    uploaded_by=user_id
                )
                
                db.session.add(operation_cost)
                sheet_success_count += 1
                
            except Exception as e:
                print(f"处理运营成本价格表行数据时出错: {e}")
                continue
        
        return sheet_success_count

    def _extract_operation_staff_from_tab_name(self, tab_name):
        """从Tab名中提取运营人员姓名"""
        import re
        
        # 尝试各种模式提取姓名
        # 模式1: "产品供货价-陈淋田" -> "陈淋田"
        pattern1 = r'.*[-－—]\s*([^-－—\s]+)\s*$'
        match1 = re.match(pattern1, tab_name)
        if match1:
            return match1.group(1)
        
        # 模式2: "陈淋田" (直接是姓名)
        if len(tab_name) <= 4 and all('\u4e00' <= char <= '\u9fff' for char in tab_name):
            return tab_name
        
        # 模式3: "陈淋田供货价" -> "陈淋田"
        pattern3 = r'^([^0-9]+?)(?:供货价|价格|表|数据).*$'
        match3 = re.match(pattern3, tab_name)
        if match3:
            candidate = match3.group(1).strip()
            if len(candidate) <= 4 and all('\u4e00' <= char <= '\u9fff' for char in candidate):
                return candidate
        
        # 如果无法提取，返回原Tab名
        print(f"无法从Tab名 '{tab_name}' 中提取运营人员姓名，使用原Tab名")
        return tab_name