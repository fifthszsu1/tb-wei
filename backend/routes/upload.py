import os
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from datetime import datetime
from models import db, ProductData, ProductList, PlantingRecord, SubjectReport, ProductDataMerge, OrderDetails, OrderDetailsMerge, CompanyCostPricing, OperationCostPricing, AlipayAmount
from services.file_processor import FileProcessor

upload_bp = Blueprint('upload', __name__)
file_processor = FileProcessor()

@upload_bp.route('/check-file', methods=['POST'])
@jwt_required()
def check_file_exists():
    """检查门店在指定日期是否已上传数据"""
    data = request.get_json()
    upload_date = data.get('upload_date')
    supplier_store = data.get('supplier_store')
    
    if not upload_date or not supplier_store:
        return jsonify({'message': '缺少日期或门店信息'}), 400
    
    # 转换日期格式
    try:
        upload_date = datetime.strptime(upload_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': '日期格式错误'}), 400
    
    # 检查是否已存在
    existing = ProductData.query.filter_by(
        upload_date=upload_date,
        tmall_supplier_name=supplier_store
    ).first()
    
    return jsonify({'exists': existing is not None})

@upload_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    """上传产品数据文件"""
    if 'file' not in request.files:
        return jsonify({'message': '没有文件'}), 400
    
    file = request.files['file']
    platform = request.form.get('platform', '未知')
    upload_date = request.form.get('upload_date')
    supplier_store = request.form.get('supplier_store')
    
    if file.filename == '':
        return jsonify({'message': '没有选择文件'}), 400
    
    if not upload_date:
        return jsonify({'message': '请选择日期'}), 400
        
    if not supplier_store:
        return jsonify({'message': '请选择门店'}), 400
    
    # 转换日期格式
    try:
        upload_date = datetime.strptime(upload_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': '日期格式错误'}), 400
    
    if file and file.filename.endswith(('.xlsx', '.xls', '.csv')):
        filename = secure_filename(file.filename)
        
        # 检查是否已存在相同日期和门店的记录，直接删除不弹确认
        existing_records = ProductData.query.filter_by(
            upload_date=upload_date,
            tmall_supplier_name=supplier_store
        ).all()
        
        if existing_records:
            # 直接删除现有记录，同时删除相关的merge记录
            ProductDataMerge.query.filter_by(
                upload_date=upload_date,
                tmall_supplier_name=supplier_store
            ).delete()
            
            for record in existing_records:
                db.session.delete(record)
            db.session.commit()
            print(f"已删除门店 {supplier_store} 在 {upload_date} 的 {len(existing_records)} 条旧记录")
        
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # 处理文件
        try:
            success_count = file_processor.process_uploaded_file(
                filepath, platform, int(get_jwt_identity()), filename, upload_date, supplier_store
            )
            os.remove(filepath)  # 删除临时文件
            
            message = f'文件上传成功，处理了 {success_count} 条数据'
            if existing_records:
                message += f'，已替换门店"{supplier_store}"之前的 {len(existing_records)} 条记录'
            
            return jsonify({
                'message': message,
                'count': success_count
            }), 200
        except Exception as e:
            return jsonify({'message': f'文件处理失败: {str(e)}'}), 500
    
    return jsonify({'message': '不支持的文件格式'}), 400

@upload_bp.route('/upload-product-list', methods=['POST'])
@jwt_required()
def upload_product_list():
    """产品总表导入"""
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
        
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            success_count = file_processor.process_product_list_file(
                filepath, int(get_jwt_identity())
            )
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

@upload_bp.route('/upload-planting-records', methods=['POST'])
@jwt_required()
def upload_planting_records():
    """种菜表格登记导入"""
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
        
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            success_count = file_processor.process_planting_records_file(
                filepath, int(get_jwt_identity())
            )
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

@upload_bp.route('/upload-subject-report', methods=['POST'])
@jwt_required()
def upload_subject_report():
    """主体报表导入"""
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
        
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            success_count = file_processor.process_subject_report_file(
                filepath, int(get_jwt_identity()), filename, upload_date
            )
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

@upload_bp.route('/upload-order-details', methods=['POST'])
@jwt_required()
def upload_order_details():
    """订单详情导入"""
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
    
    if file and file.filename.endswith(('.xlsx', '.xls')):
        filename = secure_filename(file.filename)
        
        # 检查是否已存在相同日期的记录
        existing_records = OrderDetails.query.filter_by(upload_date=upload_date).all()
        if existing_records and not force_overwrite:
            return jsonify({
                'message': '该日期已存在订单详情数据',
                'requires_confirmation': True,
                'existing_count': len(existing_records)
            }), 409
        
        # 如果强制覆盖，删除现有记录
        if existing_records and force_overwrite:
            print(f"开始删除日期 {upload_date} 的现有数据")
            print(f"订单详情记录: {len(existing_records)} 条")
            
            # 先删除订单详情合并表中对应日期的记录
            existing_merge_records = OrderDetailsMerge.query.filter_by(upload_date=upload_date).all()
            if existing_merge_records:
                print(f"订单详情合并记录: {len(existing_merge_records)} 条")
                for merge_record in existing_merge_records:
                    db.session.delete(merge_record)
            else:
                print("订单详情合并记录: 0 条")
            
            # 然后删除订单详情记录
            for record in existing_records:
                db.session.delete(record)
                
            db.session.commit()
            print(f"日期 {upload_date} 的所有相关数据删除完成")
        
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            success_count = file_processor.process_order_details_file(
                filepath, int(get_jwt_identity()), filename, upload_date
            )
            os.remove(filepath)  # 删除临时文件
            
            message = f'订单详情导入成功，处理了 {success_count} 条数据'
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
    
    return jsonify({'message': '不支持的文件格式，请上传 .xlsx 或 .xls 文件'}), 400

@upload_bp.route('/upload-product-pricing', methods=['POST'])
@jwt_required()
def upload_product_pricing():
    """产品定价文件导入"""
    if 'file' not in request.files:
        return jsonify({'message': '没有文件'}), 400
    
    file = request.files['file']
    force_overwrite = request.form.get('force_overwrite', 'false').lower() == 'true'
    
    if file.filename == '':
        return jsonify({'message': '没有选择文件'}), 400
    
    if file and file.filename.endswith(('.xlsx', '.xls')):
        filename = secure_filename(file.filename)
        
        # 检查是否已存在记录
        existing_company_records = CompanyCostPricing.query.all()
        existing_operation_records = OperationCostPricing.query.all()
        existing_count = len(existing_company_records) + len(existing_operation_records)
        
        if existing_count > 0 and not force_overwrite:
            return jsonify({
                'message': '已存在产品定价数据，上传将覆盖现有数据',
                'requires_confirmation': True,
                'existing_count': existing_count
            }), 409
        
        # 如果强制覆盖，删除现有记录
        if existing_count > 0 and force_overwrite:
            for record in existing_company_records:
                db.session.delete(record)
            for record in existing_operation_records:
                db.session.delete(record)
            db.session.commit()
        
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            success_count = file_processor.process_product_pricing_file(
                filepath, int(get_jwt_identity()), filename
            )
            os.remove(filepath)  # 删除临时文件
            
            message = f'产品定价文件导入成功，处理了 {success_count} 条数据'
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

@upload_bp.route('/upload-alipay', methods=['POST'])
@jwt_required()
def upload_alipay_file():
    """上传支付宝金额文件"""
    if 'file' not in request.files:
        return jsonify({'message': '没有文件'}), 400
    
    file = request.files['file']
    start_date = request.form.get('start_date')
    end_date = request.form.get('end_date')
    
    if file.filename == '':
        return jsonify({'message': '没有选择文件'}), 400
    
    if not start_date or not end_date:
        return jsonify({'message': '请选择开始日期和结束日期'}), 400
    
    # 验证文件格式
    if not file.filename.lower().endswith('.csv'):
        return jsonify({'message': '不支持的文件格式，请上传 CSV 文件'}), 400
    
    # 转换日期格式
    try:
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': '日期格式错误，请使用 YYYY-MM-DD 格式'}), 400
    
    # 验证日期范围
    if start_date_obj > end_date_obj:
        return jsonify({'message': '开始日期不能晚于结束日期'}), 400
    
    # 检查是否已存在该日期范围内的数据
    existing_count = AlipayAmount.query.filter(
        AlipayAmount.transaction_date >= start_date_obj,
        AlipayAmount.transaction_date <= end_date_obj
    ).count()
    
    try:
        # 保存文件
        filename = secure_filename(file.filename)
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        os.makedirs(upload_folder, exist_ok=True)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        
        # 处理文件
        success_count = file_processor.process_alipay_amount_file(
            filepath, int(get_jwt_identity()), filename, start_date_obj, end_date_obj
        )
        os.remove(filepath)  # 删除临时文件
        
        message = f'支付宝金额文件导入成功，处理了 {success_count} 条数据'
        if existing_count > 0:
            message += f'，已替换该日期范围内的 {existing_count} 条记录'
        
        return jsonify({
            'message': message,
            'count': success_count,
            'date_range': f'{start_date} 至 {end_date}'
        }), 200
    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'message': f'文件处理失败: {str(e)}'}), 500