import pandas as pd
import chardet
import re
import logging
from datetime import datetime
import threading
from datetime import datetime, timedelta
from typing import Dict, Optional, Any
import functools
import time
from sqlalchemy.exc import OperationalError, DisconnectionError
from flask import jsonify
from models import db
import logging

# 配置日志
logger = logging.getLogger(__name__)

class ProgressTracker:
    """进度跟踪器 - 用于跟踪长时间运行的任务进度"""
    
    def __init__(self):
        self._progress_data: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
    
    def create_task(self, task_id: str, total_items: int, description: str = "") -> None:
        """创建新任务"""
        with self._lock:
            self._progress_data[task_id] = {
                'task_id': task_id,
                'description': description,
                'total_items': total_items,
                'processed_items': 0,
                'current_batch': 0,
                'total_batches': 0,
                'status': 'running',  # running, completed, error
                'message': '',
                'error_message': '',
                'start_time': datetime.utcnow(),
                'end_time': None,
                'progress_percentage': 0,
                'estimated_remaining_seconds': None,
                'details': {
                    'update_count': 0,
                    'insert_count': 0,
                    'error_count': 0,
                    'processed_dates': []
                }
            }
    
    def update_progress(self, task_id: str, processed_items: int, message: str = "", **kwargs) -> None:
        """更新任务进度"""
        with self._lock:
            if task_id not in self._progress_data:
                return
            
            data = self._progress_data[task_id]
            data['processed_items'] = processed_items
            data['message'] = message
            
            # 更新详细信息
            for key, value in kwargs.items():
                if key in data['details']:
                    data['details'][key] = value
            
            # 计算进度百分比
            if data['total_items'] > 0:
                data['progress_percentage'] = min(100, (processed_items / data['total_items']) * 100)
            
            # 估算剩余时间
            if processed_items > 0:
                elapsed_time = (datetime.utcnow() - data['start_time']).total_seconds()
                if elapsed_time > 0:
                    items_per_second = processed_items / elapsed_time
                    remaining_items = data['total_items'] - processed_items
                    if items_per_second > 0:
                        data['estimated_remaining_seconds'] = int(remaining_items / items_per_second)
    
    def set_batch_info(self, task_id: str, current_batch: int, total_batches: int) -> None:
        """设置批次信息"""
        with self._lock:
            if task_id not in self._progress_data:
                return
            
            data = self._progress_data[task_id]
            data['current_batch'] = current_batch
            data['total_batches'] = total_batches
    
    def complete_task(self, task_id: str, message: str = "任务完成") -> None:
        """标记任务完成"""
        with self._lock:
            if task_id not in self._progress_data:
                return
            
            data = self._progress_data[task_id]
            data['status'] = 'completed'
            data['message'] = message
            data['end_time'] = datetime.utcnow()
            data['progress_percentage'] = 100
            data['estimated_remaining_seconds'] = 0
    
    def error_task(self, task_id: str, error_message: str) -> None:
        """标记任务错误"""
        with self._lock:
            if task_id not in self._progress_data:
                return
            
            data = self._progress_data[task_id]
            data['status'] = 'error'
            data['error_message'] = error_message
            data['end_time'] = datetime.utcnow()
    
    def get_progress(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取任务进度"""
        with self._lock:
            return self._progress_data.get(task_id, None)
    
    def cleanup_old_tasks(self, hours: int = 24) -> None:
        """清理旧任务（超过指定小时数的已完成任务）"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        with self._lock:
            to_remove = []
            for task_id, data in self._progress_data.items():
                if (data['status'] in ['completed', 'error'] and 
                    data['end_time'] and 
                    data['end_time'] < cutoff_time):
                    to_remove.append(task_id)
            
            for task_id in to_remove:
                del self._progress_data[task_id]
    
    def list_tasks(self) -> Dict[str, Dict[str, Any]]:
        """列出所有任务"""
        with self._lock:
            return self._progress_data.copy()

# 全局进度跟踪器实例
progress_tracker = ProgressTracker()

def handle_db_connection_error(max_retries=3, retry_delay=1):
    """
    数据库连接错误处理装饰器
    当遇到MySQL连接断开时自动重试
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except (OperationalError, DisconnectionError) as e:
                    last_exception = e
                    error_msg = str(e)
                    
                    # 检查是否是连接相关的错误
                    connection_errors = [
                        'MySQL server has gone away',
                        'Lost connection to MySQL server',
                        'Broken pipe',
                        'Connection was killed'
                    ]
                    
                    is_connection_error = any(err in error_msg for err in connection_errors)
                    
                    if is_connection_error and attempt < max_retries - 1:
                        logger.warning(f"数据库连接错误，尝试重连 (第{attempt + 1}次): {error_msg}")
                        
                        # 关闭当前会话并创建新的
                        try:
                            db.session.rollback()
                            db.session.close()
                        except:
                            pass
                        
                        # 等待后重试
                        time.sleep(retry_delay * (attempt + 1))
                        continue
                    else:
                        # 非连接错误或已达到最大重试次数
                        break
                except Exception as e:
                    # 其他类型的错误直接抛出
                    raise e
            
            # 如果所有重试都失败了，返回错误响应
            logger.error(f"数据库操作失败，已达到最大重试次数: {last_exception}")
            return jsonify({
                'message': '数据库连接异常，请稍后重试',
                'error_type': 'database_connection_error'
            }), 500
            
        return wrapper
    return decorator

def ping_database():
    """
    测试数据库连接是否正常
    """
    try:
        from sqlalchemy import text
        with db.engine.connect() as conn:
            conn.execute(text('SELECT 1'))
        return True
    except Exception as e:
        logger.error(f"数据库连接测试失败: {e}")
        return False

def ensure_db_connection():
    """
    确保数据库连接正常，如果断开则重新连接
    """
    try:
        # 测试连接
        if not ping_database():
            logger.info("数据库连接已断开，尝试重新连接...")
            
            # 关闭现有连接
            db.session.close()
            
            # 重新创建连接
            db.engine.dispose()
            
            # 再次测试
            if ping_database():
                logger.info("数据库重连成功")
                return True
            else:
                logger.error("数据库重连失败")
                return False
        return True
    except Exception as e:
        logger.error(f"确保数据库连接时发生错误: {e}")
        return False

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
                    # 尝试常见的日期格式，包括带时间的格式
                    date_formats = [
                        '%Y-%m-%d %H:%M:%S',  # 2025-07-01 01:47:41
                        '%Y-%m-%d',           # 2025-07-01
                        '%Y/%m/%d %H:%M:%S',  # 2025/07/01 01:47:41
                        '%Y/%m/%d',           # 2025/07/01
                        '%Y年%m月%d日',        # 2025年07月01日
                        '%m/%d/%Y',           # 07/01/2025
                        '%d/%m/%Y'            # 01/07/2025
                    ]
                    for fmt in date_formats:
                        try:
                            dt = datetime.strptime(value, fmt)
                            return dt.date()  # 只返回日期部分
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
                    dt = pd.to_datetime(value)
                    return dt.date() if pd.notna(dt) else None
            except:
                return None
    return None

def safe_get_datetime(row, field_name):
    """安全获取日期时间值"""
    if field_name and field_name in row:
        value = row[field_name]
        if pd.notna(value):
            try:
                # 如果是字符串，尝试解析多种日期时间格式
                if isinstance(value, str):
                    # 尝试常见的日期时间格式
                    datetime_formats = [
                        '%Y-%m-%d %H:%M:%S',  # 2025-07-01 01:47:41
                        '%Y/%m/%d %H:%M:%S',  # 2025/07/01 01:47:41
                        '%Y-%m-%d',           # 2025-07-01 (当天00:00:00)
                        '%Y/%m/%d',           # 2025/07/01 (当天00:00:00)
                        '%Y年%m月%d日 %H:%M:%S',
                        '%Y年%m月%d日'
                    ]
                    for fmt in datetime_formats:
                        try:
                            return datetime.strptime(value, fmt)
                        except:
                            continue
                # 如果是pandas的日期时间对象
                elif hasattr(value, 'to_pydatetime'):
                    return value.to_pydatetime()
                # 如果已经是datetime对象
                elif isinstance(value, datetime):
                    return value
                # 尝试转换为日期时间
                else:
                    dt = pd.to_datetime(value)
                    return dt.to_pydatetime() if pd.notna(dt) else None
            except:
                return None
    return None

def safe_parse_date(date_value):
    """安全解析日期"""
    if pd.isna(date_value):
        logger.debug(f"日期值为空: {date_value}")
        return None
    
    if isinstance(date_value, (datetime, pd.Timestamp)):
        result = date_value.date()
        logger.debug(f"日期解析(datetime): {date_value} -> {result}")
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
                    logger.debug(f"日期解析(字符串): {date_value} -> {result} (格式: {fmt})")
                    return result
                except ValueError:
                    continue
            
            logger.info(f"无法解析日期字符串，使用NULL: {date_value}")
        except Exception as e:
            logger.warning(f"日期解析错误，使用NULL: {date_value} -> {str(e)}")
    else:
        logger.info(f"未知日期类型，使用NULL: {type(date_value)} -> {date_value}")
    
    return None

def safe_get_str(row, field_name):
    """安全获取字符串值"""
    if field_name and field_name in row.index:
        value = row[field_name]
        if pd.notna(value):
            return str(value)
    return None

def format_decimal(value):
    """格式化数字，保留2位小数"""
    try:
        if value is None:
            return None
        return round(float(value), 2)
    except (TypeError, ValueError):
        return None

def read_file_with_encoding(filepath):
    """使用多种编码尝试读取文件"""
    if filepath.endswith('.csv'):
        # 检测文件编码，尝试多种编码
        encodings_to_try = ['utf-8', 'gbk', 'gb2312', 'utf-8-sig', 'latin-1', 'cp1252']
        
        # 先尝试自动检测
        try:
            with open(filepath, 'rb') as f:
                raw_data = f.read()
                detected = chardet.detect(raw_data)
                if detected['encoding'] and detected['confidence'] > 0.7:
                    encodings_to_try.insert(0, detected['encoding'])
        except Exception as e:
            print(f"编码检测失败: {e}")
        
        df = None
        last_error = None
        for encoding in encodings_to_try:
            try:
                # 尝试不同的分隔符和参数
                df = pd.read_csv(filepath, encoding=encoding, sep=None, engine='python')
                print(f"成功使用编码 {encoding} 读取CSV文件")
                break
            except Exception as e:
                print(f"编码 {encoding} 失败: {e}")
                last_error = e
                continue
        
        if df is None:
            raise Exception(f"无法读取CSV文件，尝试了多种编码都失败。最后的错误: {last_error}")
        
        return df
    else:
        # 指定engine参数来处理不同格式的Excel文件
        try:
            return pd.read_excel(filepath, engine='openpyxl')  # 用于.xlsx文件
        except Exception as e:
            try:
                return pd.read_excel(filepath, engine='xlrd')  # 用于.xls文件
            except Exception as e2:
                raise Exception(f"无法读取Excel文件: {str(e)} | {str(e2)}")

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