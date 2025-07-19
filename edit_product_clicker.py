from DrissionPage import ChromiumPage
import time
import os
import requests
import pandas as pd
from DrissionPage.errors import PageDisconnectedError

# 直接用 debug_port 参数连接已开启远程调试的浏览器
# 9223用于境外，9224用于境内
page = ChromiumPage(addr_or_opts=9224)

def clean_image_src(img_src):
    """清理图片src地址，去掉尺寸和格式后缀"""
    if not img_src:
        return img_src
    
    # 去掉_320x320q80_.webp这样的后缀，保留原始的.jpg格式
    # 使用正则表达式匹配并替换
    import re
    
    # 匹配模式：_数字x数字q数字_.webp 或 _数字x数字_.webp
    pattern = r'_\d+x\d+q?\d*_\.webp$'
    
    # 如果匹配到模式，就替换为空字符串
    if re.search(pattern, img_src):
        cleaned_src = re.sub(pattern, '', img_src)
        return cleaned_src
    
    # 如果没有匹配到，返回原始地址
    return img_src

def create_folder_name(product_name, create_time):
    """创建文件夹名称"""
    # 清理文件名中的非法字符
    invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
    clean_name = product_name
    clean_time = create_time
    
    for char in invalid_chars:
        clean_name = clean_name.replace(char, '_')
        clean_time = clean_time.replace(char, '_')
    
    # 创建文件夹名称：创建时间+商品名称
    folder_name = f"{clean_time}_{clean_name}"
    return folder_name

def download_image(img_url, folder_path, img_index):
    """下载单个图片"""
    try:
        # 如果URL是相对路径，添加https前缀
        if img_url.startswith('//'):
            img_url = 'https:' + img_url
        elif not img_url.startswith('http'):
            img_url = 'https://' + img_url
        
        # 获取图片扩展名
        img_extension = '.jpg'  # 默认扩展名
        if '.webp' in img_url:
            img_extension = '.webp'
        elif '.png' in img_url:
            img_extension = '.png'
        elif '.jpeg' in img_url:
            img_extension = '.jpeg'
        
        # 设置文件名
        img_filename = f"image_{img_index:02d}{img_extension}"
        img_path = os.path.join(folder_path, img_filename)
        
        # 设置请求头，模拟浏览器访问
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Referer': 'https://sell.taobao.com/',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
        
        # 创建session以保持连接
        session = requests.Session()
        session.headers.update(headers)
        
        # 下载图片
        response = session.get(img_url, timeout=30, stream=True)
        response.raise_for_status()
        
        with open(img_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        return True
        
    except Exception as e:
        print(f"❌ 下载图片失败 {img_index}: {e}")
        return False

def process_sku_info(page_obj, sku_folder_path):
    """处理SKU信息：获取名字、图片、价格并保存"""
    try:
        # 等待SKU元素加载
        time.sleep(5)
        
        # 获取SKU元素
        sku_name_elements = page_obj.eles('xpath://tr[@class="sku-table-row"]//td[2]//span', timeout=10)
        sku_img_elements = page_obj.eles('xpath://tr[@class="sku-table-row"]//td[2]//img', timeout=10)
        sku_price_elements = page_obj.eles('xpath://tr[@class="sku-table-row"]//td[4]//input', timeout=10)
        
        if not sku_name_elements:
            create_sku_excel(sku_folder_path, [])
            print("⚠️ 未找到SKU信息")
            return
        
        # 创建SKU数据列表
        sku_data = []
        
        # 处理每个SKU
        downloaded_count = 0
        for i, name_element in enumerate(sku_name_elements):
            try:
                # 获取SKU名字
                sku_name = name_element.text.strip()
                if not sku_name:
                    continue
                
                # 获取SKU图片
                sku_img_src = ""
                if i < len(sku_img_elements):
                    sku_img_src = sku_img_elements[i].attr('src')
                
                # 获取SKU价格
                sku_price = ""
                if i < len(sku_price_elements):
                    sku_price = sku_price_elements[i].attr('value')
                
                # 下载SKU图片
                if sku_img_src:
                    success = download_sku_image(sku_img_src, sku_folder_path, sku_name, i+1)
                    if success:
                        downloaded_count += 1
                    # 添加延迟，避免请求过于频繁
                    time.sleep(2)
                
                # 添加到数据列表
                sku_data.append({
                    'SKU名字': sku_name,
                    'SKU价格': sku_price,
                    '图片': '已下载' if sku_img_src else '无图片'
                })
                
            except Exception as e:
                print(f"❌ 处理第{i+1}个SKU失败: {e}")
                continue
        
        # 创建Excel文件
        if sku_data:
            create_sku_excel(sku_folder_path, sku_data)
            print(f"✅ SKU信息: {len(sku_data)}个，图片: {downloaded_count}张")
        else:
            print("⚠️ 无有效SKU信息")
            
    except Exception as e:
        print(f"❌ 处理SKU时发生异常: {e}")
        import traceback
        traceback.print_exc()

def download_sku_image(img_url, folder_path, sku_name, img_index):
    """下载SKU图片"""
    try:
        # 如果URL是相对路径，添加https前缀
        if img_url.startswith('//'):
            img_url = 'https:' + img_url
        elif not img_url.startswith('http'):
            img_url = 'https://' + img_url
        
        # 清理SKU名字中的非法字符
        invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
        clean_sku_name = sku_name
        for char in invalid_chars:
            clean_sku_name = clean_sku_name.replace(char, '_')
        
        # 获取图片扩展名
        img_extension = '.jpg'  # 默认扩展名
        if '.webp' in img_url:
            img_extension = '.webp'
        elif '.png' in img_url:
            img_extension = '.png'
        elif '.jpeg' in img_url:
            img_extension = '.jpeg'
        
        # 设置文件名
        img_filename = f"{clean_sku_name}{img_extension}"
        img_path = os.path.join(folder_path, img_filename)
        
        # 设置请求头，模拟浏览器访问
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Referer': 'https://sell.taobao.com/',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
        
        # 创建session以保持连接
        session = requests.Session()
        session.headers.update(headers)
        
        # 下载图片
        response = session.get(img_url, timeout=30, stream=True)
        response.raise_for_status()
        
        with open(img_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        return True
        
    except Exception as e:
        print(f"❌ 下载SKU图片失败 {sku_name}: {e}")
        return False

def create_sku_excel(folder_path, sku_data):
    """创建SKU信息Excel文件"""
    try:
        # 创建Excel文件路径
        excel_path = os.path.join(folder_path, 'sku_info.xlsx')
        
        # 如果没有SKU数据，创建空的DataFrame
        if not sku_data:
            df = pd.DataFrame(columns=['SKU名字', 'SKU价格', '图片'])
        else:
            df = pd.DataFrame(sku_data)
        
        # 保存到Excel文件
        df.to_excel(excel_path, index=False, engine='openpyxl')
        
        # 验证文件是否真的创建了
        if not os.path.exists(excel_path):
            print(f"❌ Excel文件创建失败: {excel_path}")
        
    except Exception as e:
        print(f"❌ 创建SKU Excel文件失败: {e}")
        import traceback
        traceback.print_exc()

def process_34main_images(page_obj, folder_path):
    """处理34main图片：查找特定元素并下载图片"""
    try:
        # 创建34main文件夹
        main_folder_path = os.path.join(folder_path, '34main')
        
        if not os.path.exists(main_folder_path):
            try:
                os.makedirs(main_folder_path)
            except Exception as e:
                print(f"❌ 创建34main文件夹失败: {e}")
                return
        
        # 等待页面元素加载
        time.sleep(3)
        
        # 查找34main图片元素
        main_img_elements = page_obj.eles('xpath://div[@class="sell-component-image-v2"]/div[@class="main-content medium solid tf"]/img', timeout=10)
        
        if not main_img_elements:
            print("⚠️ 未找到34main图片")
            return
        
        # 处理每个34main图片
        download_count = 0
        for i, img_element in enumerate(main_img_elements, 1):
            try:
                # 获取图片的src属性
                img_src = img_element.attr('src')
                if img_src:
                    # 清理src地址，去掉尺寸和格式后缀
                    img_src = clean_image_src(img_src)
                    
                    # 下载图片
                    success = download_image(img_src, main_folder_path, i)
                    if success:
                        download_count += 1
                    
                    # 添加延迟，避免请求过于频繁
                    time.sleep(2)
                    
            except Exception as e:
                print(f"❌ 处理第{i}个34main图片失败: {e}")
                continue
        
        print(f"✅ 34main图片: {download_count}/{len(main_img_elements)} 张")
            
    except Exception as e:
        print(f"❌ 处理34main图片时发生异常: {e}")
        import traceback
        traceback.print_exc()

def process_sucai_images(page_obj, folder_path):
    """处理sucai图片：查找特定元素并下载图片"""
    try:
        # 创建sucai文件夹
        sucai_folder_path = os.path.join(folder_path, 'sucai')
        
        if not os.path.exists(sucai_folder_path):
            try:
                os.makedirs(sucai_folder_path)
            except Exception as e:
                print(f"❌ 创建sucai文件夹失败: {e}")
                return
        
        # 等待页面元素加载
        time.sleep(3)
        
        # 查找sucai图片元素
        sucai_img_elements = page_obj.eles('xpath://div[@class="sell-component-image-v2"]/div[@class="main-content large solid oo"]/img', timeout=10)
        
        if not sucai_img_elements:
            print("⚠️ 未找到sucai图片")
            return
        
        # 处理每个sucai图片
        download_count = 0
        for i, img_element in enumerate(sucai_img_elements, 1):
            try:
                # 获取图片的src属性
                img_src = img_element.attr('src')
                if img_src:
                    # 清理src地址，去掉尺寸和格式后缀
                    img_src = clean_image_src(img_src)
                    
                    # 下载图片
                    success = download_image(img_src, sucai_folder_path, i)
                    if success:
                        download_count += 1
                    
                    # 添加延迟，避免请求过于频繁
                    time.sleep(2)
                    
            except Exception as e:
                print(f"❌ 处理第{i}个sucai图片失败: {e}")
                continue
        
        print(f"✅ sucai图片: {download_count}/{len(sucai_img_elements)} 张")
            
    except Exception as e:
        print(f"❌ 处理sucai图片时发生异常: {e}")
        import traceback
        traceback.print_exc()

def process_pc_images(page_obj, folder_path):
    """处理PC图片：查找编辑器中的图片并下载"""
    try:
        # 创建PC文件夹
        pc_folder_path = os.path.join(folder_path, 'PC')
        
        if not os.path.exists(pc_folder_path):
            try:
                os.makedirs(pc_folder_path)
            except Exception as e:
                print(f"❌ 创建PC文件夹失败: {e}")
                return
        
        # 等待页面元素加载
        time.sleep(3)
        
        # 查找PC图片元素
        pc_img_elements = page_obj.eles('xpath://body[@class="ks-editor"]//img', timeout=10)
        
        if not pc_img_elements:
            print("⚠️ 未找到PC图片")
            return
        
        # 处理每个PC图片
        download_count = 0
        for i, img_element in enumerate(pc_img_elements, 1):
            try:
                # 获取图片的_kesaved_src属性
                img_src = img_element.attr('_kesaved_src')
                if img_src:
                    # 下载图片
                    success = download_image(img_src, pc_folder_path, i)
                    if success:
                        download_count += 1
                    
                    # 添加延迟，避免请求过于频繁
                    time.sleep(2)
                    
            except Exception as e:
                print(f"❌ 处理第{i}个PC图片失败: {e}")
                continue
        
        print(f"✅ PC图片: {download_count}/{len(pc_img_elements)} 张")
            
    except Exception as e:
        print(f"❌ 处理PC图片时发生异常: {e}")
        import traceback
        traceback.print_exc()

def process_edit_page(product_name, create_time, current_page=None, is_already_processed=False):
    """处理编辑页面：创建文件夹并下载图片"""
    try:
        # 使用传入的页面对象，如果没有则使用全局页面对象
        page_obj = current_page if current_page else page
        
        # 创建文件夹名称
        folder_name = create_folder_name(product_name, create_time)
        folder_path = os.path.join(os.getcwd(), folder_name)
        
        # 检查文件夹是否存在，不存在则创建
        if os.path.exists(folder_path):
            print(f"文件夹已存在: {folder_path}")
        else:
            os.makedirs(folder_path)
            print(f"已创建文件夹: {folder_path}")
        
        # 等待页面加载完成
        print("⏳ 等待页面加载...")
        time.sleep(10)  # 先等待10秒
        
        # 检查页面加载状态，最多等待30秒
        max_wait_time = 30
        wait_count = 0
        while wait_count < max_wait_time:
            try:
                # 检查页面是否加载完成
                ready_state = page_obj.run_js('return document.readyState')
                if ready_state == 'complete':
                    break
                else:
                    time.sleep(2)
                    wait_count += 2
            except Exception as e:
                time.sleep(2)
                wait_count += 2
        
        # 额外等待5秒确保页面完全加载
        time.sleep(5)
        
        if is_already_processed:
            # 商品已处理过，只下载PC图片
            print("🔄 商品已处理过，只下载PC图片...")
            print("💻 处理PC图片...")
            process_pc_images(page_obj, folder_path)
        else:
            # 商品未处理过，执行完整流程
            print("🆕 商品未处理过，执行完整流程...")
            
            # 查找商品主图
            print("📸 处理商品主图...")
            img_elements = page_obj.eles('xpath://div[@class="image-list"]//div[@class="main-content medium solid oo"]/img', timeout=10)
            
            if not img_elements:
                img_elements = page_obj.eles('xpath://div[@class="image-list"]//img', timeout=10)
            
            if img_elements:
                download_count = 0
                for i, img_element in enumerate(img_elements, 1):
                    try:
                        # 获取图片的src属性
                        img_src = img_element.attr('src')
                        if img_src:
                            # 清理src地址，去掉尺寸和格式后缀
                            img_src = clean_image_src(img_src)
                            success = download_image(img_src, folder_path, i)
                            if success:
                                download_count += 1
                            # 添加延迟，避免请求过于频繁
                            time.sleep(2)
                            
                    except Exception as e:
                        print(f"❌ 处理第{i}个图片失败: {e}")
                        continue
                
                print(f"✅ 商品主图: {download_count}/{len(img_elements)} 张")
                
            else:
                print("⚠️ 未找到商品主图")
            
            # 创建SKU文件夹
            sku_folder_path = os.path.join(folder_path, 'sku')
            
            if not os.path.exists(sku_folder_path):
                try:
                    os.makedirs(sku_folder_path)
                except Exception as e:
                    print(f"❌ 创建SKU文件夹失败: {e}")
                    return
            
            # 处理SKU信息
            print("🛍️ 处理SKU信息...")
            process_sku_info(page_obj, sku_folder_path)
            
            # 处理34main图片
            print("🖼️ 处理34main图片...")
            process_34main_images(page_obj, folder_path)
            
            # 处理sucai图片
            print("🎨 处理sucai图片...")
            process_sucai_images(page_obj, folder_path)
            
            # 处理PC图片
            print("💻 处理PC图片...")
            process_pc_images(page_obj, folder_path)
        
    except Exception as e:
        print(f"处理编辑页面时发生异常: {e}")
        import traceback
        traceback.print_exc()

def clean_duplicate_records(filename="processed_products.txt"):
    """清理重复记录"""
    try:
        if os.path.exists(filename):
            # 读取所有记录
            with open(filename, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # 去重并保持顺序
            seen = set()
            unique_lines = []
            for line in lines:
                line = line.strip()
                if line and line not in seen:
                    seen.add(line)
                    unique_lines.append(line)
            
            # 如果有重复记录，重写文件
            if len(unique_lines) < len([l for l in lines if l.strip()]):
                with open(filename, 'w', encoding='utf-8') as f:
                    for line in unique_lines:
                        f.write(line + '\n')
                print(f"🧹 已清理重复记录，保留 {len(unique_lines)} 条记录")
            else:
                print(f"✅ 无重复记录，共 {len(unique_lines)} 条记录")
    except Exception as e:
        print(f"清理重复记录时发生异常: {e}")

def get_processed_products(filename="processed_products.txt", clean_duplicates=False):
    """读取已处理的商品列表"""
    # 只在需要时清理重复记录
    if clean_duplicates:
        clean_duplicate_records(filename)
    
    processed_products = set()
    try:
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        processed_products.add(line)
            print(f"已读取 {len(processed_products)} 条已处理商品记录")
        else:
            print("未找到已处理商品记录文件，将创建新文件")
    except Exception as e:
        print(f"读取已处理商品记录时发生异常: {e}")
    
    return processed_products

def add_processed_product(product_info, processed_products, filename="processed_products.txt"):
    """添加单个商品到已处理列表（防重复）"""
    try:
        # 先检查内存中是否已存在
        if product_info in processed_products:
            print(f"⚠️ 商品已在内存中，跳过重复记录: {product_info}")
            return
        
        # 先检查文件中是否已经存在
        existing_products = set()
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                existing_products = set(line.strip() for line in f if line.strip())
        
        # 如果不存在则添加
        if product_info not in existing_products:
            with open(filename, 'a', encoding='utf-8') as f:
                f.write(product_info + '\n')
            # 同时更新内存中的集合
            processed_products.add(product_info)
            print(f"✅ 已记录处理完成的商品: {product_info}")
        else:
            # 文件中已存在，只更新内存
            processed_products.add(product_info)
            print(f"⚠️ 商品已存在记录，只更新内存: {product_info}")
    except Exception as e:
        print(f"记录已处理商品时发生异常: {e}")

def check_product_status(product_name, create_time, processed_products):
    """检查商品处理状态和文件夹状态"""
    product_info = f"{product_name},{create_time}"
    is_in_processed = product_info in processed_products
    
    if is_in_processed:
        # 如果商品在已处理列表中，检查文件夹状态
        folder_name = create_folder_name(product_name, create_time)
        folder_path = os.path.join(os.getcwd(), folder_name)
        pc_folder_path = os.path.join(folder_path, 'PC')
        
        folder_exists = os.path.exists(folder_path)
        pc_folder_exists = os.path.exists(pc_folder_path)
        
        if folder_exists and pc_folder_exists:
            # 商品已完全处理，无需再次处理
            return "fully_processed"  # 已完全处理
        elif folder_exists:
            # 商品已基础处理，需要补充PC图片
            return "needs_pc"  # 需要补充PC图片
        else:
            # 商品在列表中但文件夹不存在，需要完整处理
            return "needs_full"  # 需要完整处理
    else:
        # 商品未处理
        return "not_processed"  # 未处理

def is_product_processed(product_name, create_time, processed_products):
    """检查商品是否已处理（向后兼容）"""
    status = check_product_status(product_name, create_time, processed_products)
    return status in ["fully_processed", "needs_pc", "needs_full"]

def get_current_page_products():
    """获取当前页面的商品信息列表"""
    global page
    try:
        # 获取商品名字元素集
        name_elements = page.eles('xpath://td[@label="商品标题"]//a[@class="title-link"]')
        # 获取创建时间元素集
        time_elements = page.eles('xpath://td[@label="创建时间"]//div[@class="product-desc-span"]')
        
        if not name_elements or not time_elements:
            print("未找到商品名字或创建时间元素")
            return []
        
        if len(name_elements) != len(time_elements):
            print(f"警告：商品名字数量({len(name_elements)})与创建时间数量({len(time_elements)})不匹配")
            # 取较小的数量作为处理数量
            min_count = min(len(name_elements), len(time_elements))
            name_elements = name_elements[:min_count]
            time_elements = time_elements[:min_count]
        
        # 获取商品信息
        product_info_list = []
        for i, (name_ele, time_ele) in enumerate(zip(name_elements, time_elements)):
            try:
                product_name = name_ele.text.strip()
                create_time = time_ele.text.strip()
                product_info = {
                    'name': product_name,
                    'time': create_time,
                    'info': f"{product_name},{create_time}"
                }
                product_info_list.append(product_info)
                print(f"第{i+1}个商品信息: {product_info['info']}")
            except Exception as e:
                print(f"获取第{i+1}个商品信息时发生异常: {e}")
                continue
        
        return product_info_list
        
    except Exception as e:
        print(f"获取商品信息时发生异常: {e}")
        import traceback
        traceback.print_exc()
        return []

def check_next_page():
    """检查是否有下一页"""
    global page
    try:
        # 先尝试找到下一页按钮（可能是button或包含"下一页"文本的元素）
        next_page_element = page.ele('xpath://button//*[text()="下一页"]', timeout=3)
        
        if not next_page_element:
            # 如果没找到，尝试其他可能的选择器
            next_page_element = page.ele('xpath://*[text()="下一页"]', timeout=3)
        
        if next_page_element:
            # 检查按钮状态
            try:
                # 方法1: 检查disabled属性
                disabled_attr = next_page_element.attr('disabled')
                is_disabled_by_attr = disabled_attr is not None
                
                # 方法2: 检查元素状态
                is_enabled = next_page_element.states.is_enabled
                is_displayed = next_page_element.states.is_displayed
                
                # 方法3: 检查class是否包含disabled相关的类名
                class_attr = next_page_element.attr('class') or ''
                is_disabled_by_class = 'disabled' in class_attr.lower()
                
                # 综合判断
                is_disabled = is_disabled_by_attr or (not is_enabled) or is_disabled_by_class
                is_available = is_displayed and not is_disabled
                
                print(f"🔍 下一页按钮状态检查:")
                print(f"   └─ disabled属性: {disabled_attr}")
                print(f"   └─ is_enabled: {is_enabled}")
                print(f"   └─ is_displayed: {is_displayed}")
                print(f"   └─ class包含disabled: {is_disabled_by_class}")
                print(f"   └─ 最终可用: {is_available}")
                
                if is_disabled:
                    print("🏁 检测到下一页按钮已禁用，已到达最后一页！")
                    return None
                elif is_available:
                    print("➡️ 下一页按钮可用")
                    return next_page_element
                else:
                    print("⚠️ 下一页按钮不可用")
                    return None
                    
            except Exception as state_e:
                print(f"⚠️ 检查下一页按钮状态时发生异常: {state_e}")
                # 如果无法检查状态，假设可点击
                return next_page_element
        else:
            print("❌ 未找到下一页按钮")
            return None
            
    except Exception as e:
        print(f"⚠️ 查找下一页按钮时发生异常: {e}")
        return None

def click_next_page_and_wait():
    """点击下一页并等待页面加载"""
    global page
    try:
        next_page_element = check_next_page()
        if not next_page_element:
            return False
        
        print("➡️ 切换到下一页...")
        
        # 点击下一页
        next_page_element.click()
        
        # 等待页面开始加载（短暂等待）
        time.sleep(5)
        
        # 等待页面加载完成，最多等待30秒
        max_wait_time = 30
        wait_count = 0
        page_loaded = False
        
        while wait_count < max_wait_time:
            try:
                # 检查页面加载状态
                ready_state = page.run_js('return document.readyState')
                
                # 尝试查找商品元素，如果找到说明新页面已加载
                try:
                    test_elements = page.eles('xpath://td[@label="商品标题"]//a[@class="title-link"]', timeout=2)
                    if test_elements and ready_state == 'complete':
                        page_loaded = True
                        break
                except:
                    pass
                
                time.sleep(2)
                wait_count += 2
                
            except Exception as e:
                time.sleep(2)
                wait_count += 2
        
        if page_loaded:
            # 额外等待确保页面完全稳定，特别是确保第一个元素可以正常点击
            print("⏳ 页面加载完成，等待元素稳定...")
            time.sleep(5)
            return True
        else:
            print("⚠️ 页面加载超时")
            return False
            
    except Exception as e:
        print(f"❌ 切换下一页失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def process_current_page(processed_products):
    """处理当前页面的所有商品"""
    global page
    try:
        # 额外等待确保页面完全稳定
        print("⏳ 等待页面完全稳定...")
        time.sleep(3)
        
        # 获取当前页面的商品信息
        product_info_list = get_current_page_products()
        
        # 查找所有名称为"编辑商品"的元素
        edit_elements = page.eles('xpath://span[text()="编辑商品"]')
        
        if not edit_elements:
            print("当前页面未找到编辑商品元素")
            return 0  # 返回处理数量
        
        print(f"找到 {len(edit_elements)} 个编辑商品元素")
        
        # 统计处理的数量
        processed_count = 0
        
        for i, element in enumerate(edit_elements, 1):
            # 标志位，确保每个商品只记录一次
            product_recorded = False
            
            try:
                print(f"\n{'='*30}")
                print(f"🔄 处理第{i}个商品，共{len(edit_elements)}个")
                
                # 获取对应的商品信息
                product_name = ""
                create_time = ""
                product_info_to_save = ""
                product_status = ""
                
                if i <= len(product_info_list):
                    product_data = product_info_list[i-1]
                    product_name = product_data['name']
                    create_time = product_data['time']
                    product_info = product_data['info']
                    product_info_to_save = f"{product_name},{create_time}"
                    
                    # 检查商品处理状态
                    product_status = check_product_status(product_name, create_time, processed_products)
                    
                    if product_status == "fully_processed":
                        print(f"✅ 商品已完全处理，跳过: {product_name}")
                        continue
                    elif product_status == "needs_pc":
                        print(f"🔄 商品需要补充PC图片: {product_name}")
                    elif product_status == "needs_full":
                        print(f"🆕 商品需要完整处理（文件夹不存在）: {product_name}")
                    else:  # not_processed
                        print(f"🆕 商品未处理过，需要完整处理: {product_name}")
                else:
                    print(f"⚠️ 无法获取第{i}个商品信息，商品列表长度: {len(product_info_list)}")
                    continue
                
                # 针对第一个元素进行特殊处理
                if i == 1:
                    print("🔍 第一个商品特殊处理 - 开始诊断...")
                    
                    # 1. 滚动到元素位置确保可见
                    try:
                        element.scroll_to()
                        time.sleep(1)
                        print("✅ 已滚动到元素位置")
                    except Exception as scroll_e:
                        print(f"⚠️ 滚动失败: {scroll_e}")
                    
                    # 2. 等待更长时间确保JavaScript完全加载
                    print("⏳ 等待JavaScript事件绑定...")
                    time.sleep(5)
                    
                    # 3. 重新获取元素（避免stale element）
                    try:
                        fresh_elements = page.eles('xpath://span[text()="编辑商品"]')
                        if fresh_elements and len(fresh_elements) >= i:
                            element = fresh_elements[i-1]
                            print("✅ 重新获取了第一个元素")
                        else:
                            print("⚠️ 重新获取元素失败")
                    except Exception as refresh_e:
                        print(f"⚠️ 重新获取元素异常: {refresh_e}")
                
                # 检查元素是否可点击
                try:
                    is_enabled = element.states.is_enabled
                    is_displayed = element.states.is_displayed
                    is_clickable = is_enabled and is_displayed
                    
                    if i == 1:
                        print(f"🔍 第一个元素状态: 启用={is_enabled}, 显示={is_displayed}, 可点击={is_clickable}")
                        
                        # 检查元素位置和大小
                        try:
                            rect = element.rect
                            print(f"🔍 元素位置: x={rect.x}, y={rect.y}, width={rect.width}, height={rect.height}")
                        except Exception as rect_e:
                            print(f"⚠️ 获取元素位置失败: {rect_e}")
                    
                except Exception as state_e:
                    print(f"⚠️ 检查元素状态时发生异常: {state_e}")
                    is_clickable = True
                
                if is_clickable:
                    print(f"🖱️ 点击编辑按钮...")
                    
                    # 记录当前tab数量和ID
                    current_tabs = page.tabs_count
                    current_tab_ids = []
                    for tab_idx in range(current_tabs):
                        try:
                            tab = page.get_tab(tab_idx)
                            current_tab_ids.append(tab.tab_id)
                        except Exception as e:
                            print(f"❌ 获取tab[{tab_idx}]失败: {e}")
                    
                    # 尝试不同的点击方式
                    click_success = False
                    
                    # 方式1: 普通点击
                    try:
                        element.click()
                        time.sleep(8)
                        new_tabs = page.tabs_count
                        if new_tabs > current_tabs:
                            click_success = True
                            print("✅ 普通点击成功")
                        else:
                            print("⚠️ 普通点击未产生新tab")
                    except Exception as click1_e:
                        print(f"⚠️ 普通点击失败: {click1_e}")
                    
                    # 方式2: 如果普通点击失败且是第一个元素，尝试JavaScript点击
                    if not click_success and i == 1:
                        try:
                            print("🔄 尝试JavaScript点击...")
                            page.run_js("arguments[0].click();", element)
                            time.sleep(8)
                            new_tabs = page.tabs_count
                            if new_tabs > current_tabs:
                                click_success = True
                                print("✅ JavaScript点击成功")
                            else:
                                print("⚠️ JavaScript点击未产生新tab")
                        except Exception as js_click_e:
                            print(f"⚠️ JavaScript点击失败: {js_click_e}")
                    
                    # 方式3: 如果还是失败，尝试模拟鼠标点击
                    if not click_success and i == 1:
                        try:
                            print("🔄 尝试鼠标点击...")
                            element.hover()
                            time.sleep(1)
                            element.click()
                            time.sleep(8)
                            new_tabs = page.tabs_count
                            if new_tabs > current_tabs:
                                click_success = True
                                print("✅ 鼠标点击成功")
                            else:
                                print("⚠️ 鼠标点击未产生新tab")
                        except Exception as mouse_click_e:
                            print(f"⚠️ 鼠标点击失败: {mouse_click_e}")
                    
                    # 获取最终的tab数量
                    new_tabs = page.tabs_count
                    
                    if new_tabs > current_tabs:
                        print(f"✅ 新tab已打开")
                        # 找到新创建的tab
                        new_tab = None
                        for tab_idx in range(new_tabs):
                            try:
                                tab = page.get_tab(tab_idx)
                                if tab.tab_id not in current_tab_ids:
                                    new_tab = tab
                                    break
                            except Exception as e:
                                print(f"❌ 检查tab[{tab_idx}]失败: {e}")
                                continue
                        
                        if new_tab:
                            # 处理编辑页面
                            if product_name and create_time:
                                # 根据商品状态确定处理方式
                                is_already_processed = product_status in ["needs_pc", "needs_full"]
                                process_edit_page(product_name, create_time, new_tab, is_already_processed)
                                
                                # 只有完全未处理的商品才需要记录到文件
                                if product_status == "not_processed" and not product_recorded:
                                    add_processed_product(product_info_to_save, processed_products)
                                    product_recorded = True
                                    print(f"✅ 商品处理完成并已记录: {product_name}")
                                elif product_status in ["needs_pc", "needs_full"]:
                                    print(f"✅ 商品PC图片补充完成: {product_name}")
                                
                                # 所有商品都算作已处理
                                if not product_recorded:
                                    processed_count += 1
                                    product_recorded = True
                            else:
                                print("❌ 缺少商品名称或创建时间信息")
                            
                            # 关闭新tab
                            new_tab.close()
                            time.sleep(1)
                            
                            # 切换回原始tab
                            try:
                                page.to_tab(0)
                                time.sleep(1)
                            except Exception as switch_e:
                                print(f"❌ 切换回原始tab失败: {switch_e}")
                                # 静默处理，不影响主流程
                        
                        else:
                            print("❌ 未能找到新创建的tab")
                            # 备用清理
                            try:
                                while page.tabs_count > current_tabs:
                                    try:
                                        for tab_idx in range(page.tabs_count):
                                            tab = page.get_tab(tab_idx)
                                            if tab.tab_id not in current_tab_ids:
                                                tab.close()
                                                break
                                        time.sleep(0.5)
                                    except Exception as close_e:
                                        print(f"❌ 备用清理失败: {close_e}")
                                        break
                                
                                # 切换回原始tab
                                try:
                                    page.to_tab(0)
                                    time.sleep(1)
                                except Exception as switch_e2:
                                    print(f"❌ 备用清理后切换tab失败: {switch_e2}")
                                
                                # 备用清理情况下记录处理完成
                                if product_name and create_time and not product_recorded:
                                    # 只有完全未处理的商品才需要记录到文件
                                    if product_status == "not_processed":
                                        add_processed_product(product_info_to_save, processed_products)
                                        print(f"✅ 商品处理完成（备用清理）: {product_name}")
                                    else:
                                        print(f"✅ 商品PC图片补充完成（备用清理）: {product_name}")
                                    
                                    # 所有商品都算作已处理
                                    processed_count += 1
                                    product_recorded = True
                            except Exception as cleanup_e:
                                print(f"❌ 清理多余tab时异常: {cleanup_e}")
                    
                    else:
                        print(f"⚠️ 未检测到新tab，尝试关闭弹窗")
                        try:
                            close_button = page.ele('xpath://i[text()="close"]')
                            if close_button:
                                close_button.click()
                        except Exception as close_e:
                            print(f"❌ 关闭弹窗失败: {close_e}")
                    
                    # 等待页面稳定
                    time.sleep(2)
                
                else:
                    print(f"❌ 第{i}个元素不可点击，跳过")
                    continue
            
            except Exception as element_e:
                print(f"处理第{i}个编辑商品元素时发生异常: {element_e}")
                print(f"异常类型: {type(element_e).__name__}")
                import traceback
                traceback.print_exc()
                
                # 页面连接断开处理
                if isinstance(element_e, PageDisconnectedError):
                    print("检测到页面连接断开，尝试重新连接...")
                    try:
                        page = ChromiumPage(addr_or_opts=9224)
                        print("重新连接成功")
                        time.sleep(3)
                        continue
                    except Exception as reconnect_e:
                        print(f"重新连接失败: {reconnect_e}")
                        break
                
                # 清理可能的弹窗或tab
                try:
                    if page.tabs_count > 1:
                        last_tab = page.get_tab(-1)
                        last_tab.close()
                        print("已关闭编辑tab")
                        
                        time.sleep(1)
                        page.to_tab(0)
                        print("已切换回原始tab")
                        
                        # 异常情况下记录处理完成
                        if product_name and create_time and not product_recorded:
                            # 只有完全未处理的商品才需要记录到文件
                            if product_status == "not_processed":
                                add_processed_product(product_info_to_save, processed_products)
                                print(f"🎉 商品处理完成并已记录（异常处理）: {product_name}")
                            else:
                                print(f"🎉 商品PC图片补充完成（异常处理）: {product_name}")
                            
                            # 所有商品都算作已处理
                            processed_count += 1
                            product_recorded = True
                    else:
                        close_button = page.ele('xpath://i[text()="close"]')
                        if close_button:
                            close_button.click()
                            print("已关闭编辑窗口")
                except Exception as cleanup_ex:
                    print(f"清理异常时发生错误: {cleanup_ex}")
                continue
        
        # 返回统计信息
        return processed_count
        
    except Exception as e:
        print(f"处理当前页面时发生异常: {e}")
        import traceback
        traceback.print_exc()
        return 0

def click_edit_product_elements():
    """处理所有页面的编辑商品元素（支持分页）"""
    global page
    try:
        # 统计总数据
        total_processed = 0
        current_page_num = 1
        
        while True:
            print(f"\n🔄 开始处理第 {current_page_num} 页...")
            
            # 每次翻页后重新读取已处理的商品列表（确保包含最新的处理记录）
            # 只在第一页时清理重复记录
            clean_duplicates = (current_page_num == 1)
            processed_products = get_processed_products(clean_duplicates=clean_duplicates)
            print(f"📋 当前已处理商品数量: {len(processed_products)}")
            
            # 处理当前页面
            page_processed = process_current_page(processed_products)
            total_processed += page_processed
            
            print(f"📄 第{current_page_num}页: 处理{page_processed}个商品")
            
            # 检查是否有下一页
            next_page_element = check_next_page()
            if next_page_element:
                # 有下一页，尝试翻页
                if click_next_page_and_wait():
                    current_page_num += 1
                    continue
                else:
                    print("❌ 翻页失败，结束处理")
                    break
            else:
                # 没有下一页（可能是disabled或不存在），结束处理
                print("🏁 已到达最后一页，处理完成！")
                break
        
        # 显示最终统计信息
        print(f"\n{'='*40}")
        print(f"📊 总计: 页数{current_page_num} | 处理{total_processed}个商品")
        print(f"{'='*40}")
        
        return True
        
    except Exception as e:
        print(f"处理商品元素时发生异常: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主函数"""
    print(f"🚀 开始执行商品批量处理 - {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("📝 支持断点续传，已处理商品会自动跳过")
    print()
    
    try:
        # 执行点击编辑商品元素的操作
        success = click_edit_product_elements()
        
        if success:
            print("\n✅ 批量处理完成")
        else:
            print("\n❌ 处理失败或未找到商品")
        
    except PageDisconnectedError as e:
        print(f"\n❌ 浏览器连接断开: {e}")
        
    except Exception as e:
        print(f"\n❌ 发生异常: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 