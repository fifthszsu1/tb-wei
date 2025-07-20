import os
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from datetime import datetime
from models import db, ProductData, ProductList, PlantingRecord, SubjectReport
from services.file_processor import FileProcessor

upload_bp = Blueprint('upload', __name__)
file_processor = FileProcessor()

@upload_bp.route('/check-file', methods=['POST'])
@jwt_required()
def check_file_exists():
    """检查文件是否已上传"""
    data = request.get_json()
    filename = data.get('filename')
    upload_date = data.get('upload_date')
    
    if not filename or not upload_date:
        return jsonify({'message': '缺少文件名或日期'}), 400
    
    # 转换日期格式
    try:
        upload_date = datetime.strptime(upload_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': '日期格式错误'}), 400
    
    # 检查是否已存在
    existing = ProductData.query.filter_by(
        filename=filename,
        upload_date=upload_date
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
    force_overwrite = request.form.get('force_overwrite', 'false').lower() == 'true'
    
    if file.filename == '':
        return jsonify({'message': '没有选择文件'}), 400
    
    if not upload_date:
        return jsonify({'message': '请选择日期'}), 400
    
    # 转换日期格式
    try:
        upload_date = datetime.strptime(upload_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': '日期格式错误'}), 400
    
    if file and file.filename.endswith(('.xlsx', '.xls', '.csv')):
        filename = secure_filename(file.filename)
        
        # 检查是否已存在相同文件名和日期的记录
        existing_records = ProductData.query.filter_by(
            filename=filename,
            upload_date=upload_date
        ).all()
        
        if existing_records and not force_overwrite:
            return jsonify({
                'message': '文件已存在',
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
        
        # 处理文件
        try:
            success_count = file_processor.process_uploaded_file(
                filepath, platform, int(get_jwt_identity()), filename, upload_date
            )
            os.remove(filepath)  # 删除临时文件
            
            message = f'文件上传成功，处理了 {success_count} 条数据'
            if existing_records and force_overwrite:
                message += f'，已替换之前的 {len(existing_records)} 条记录'
            
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