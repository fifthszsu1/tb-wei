// UI工具模块
const UIUtils = {
    
    // 显示提示信息
    showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alert.style.top = '20px';
        alert.style.right = '20px';
        alert.style.zIndex = '9999';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alert);
        
        // 自动删除
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    },

    // 显示加载动画
    showSpinner() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = 'block';
        }
    },

    // 隐藏加载动画
    hideSpinner() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
    },

    // 确认对话框
    showConfirmDialog(title, message, onConfirm, onCancel = null) {
        // 创建模态框HTML
        const modalHtml = `
            <div class="modal fade" id="confirmModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            ${message}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                            <button type="button" class="btn btn-primary" id="confirmBtn">确认</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 移除已存在的模态框
        const existingModal = document.getElementById('confirmModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 添加模态框到页面
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = document.getElementById('confirmModal');
        const confirmBtn = document.getElementById('confirmBtn');
        
        // 绑定确认按钮事件
        confirmBtn.addEventListener('click', () => {
            if (onConfirm) onConfirm();
            const modalInstance = bootstrap.Modal.getInstance(modal);
            modalInstance.hide();
        });
        
        // 绑定取消事件
        modal.addEventListener('hidden.bs.modal', () => {
            if (onCancel) onCancel();
            modal.remove();
        });
        
        // 显示模态框
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
    },

    // 设置按钮加载状态
    setButtonLoading(button, loading = true, originalText = null) {
        if (!button) return;
        
        if (loading) {
            if (!button.dataset.originalText) {
                button.dataset.originalText = button.innerHTML;
            }
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';
            button.disabled = true;
        } else {
            button.innerHTML = originalText || button.dataset.originalText || button.innerHTML;
            button.disabled = false;
            delete button.dataset.originalText;
        }
    },

    // 切换侧边栏
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        
        if (sidebar && mainContent) {
            sidebar.classList.toggle('hidden');
            mainContent.classList.toggle('expanded');
        }
    },

    // 显示/隐藏页面
    showPage(pageName, event = null) {
        // 隐藏所有页面
        document.querySelectorAll('.page-content').forEach(page => {
            page.style.display = 'none';
        });
        
        // 移除所有导航活动状态
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // 显示对应页面
        const targetPage = document.getElementById(pageName + 'Page');
        if (targetPage) {
            targetPage.style.display = 'block';
        }
        
        // 设置导航活动状态
        if (event && event.target) {
            event.target.classList.add('active');
        } else {
            // 如果没有事件对象，根据页面名称设置活动状态
            const navLinks = document.querySelectorAll('.sidebar .nav-link');
            navLinks.forEach(link => {
                if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(`'${pageName}'`)) {
                    link.classList.add('active');
                }
            });
        }
    },

    // 平滑滚动到元素
    scrollToElement(element, behavior = 'smooth') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (element) {
            element.scrollIntoView({ 
                behavior: behavior, 
                block: 'start' 
            });
        }
    },

    // 格式化数字
    formatNumber(value, type = 'default') {
        if (value === null || value === undefined || value === '') return '-';
        
        const num = parseFloat(value);
        if (isNaN(num)) return '-';
        
        switch (type) {
            case 'currency':
                return `¥${num.toFixed(2)}`;
            case 'percentage':
                return `${num.toFixed(2)}%`;
            case 'integer':
                return parseInt(num).toLocaleString();
            case 'decimal':
                return num.toFixed(2);
            default:
                return num.toString();
        }
    },

    // 格式化日期
    formatDate(dateString, format = 'zh-CN') {
        if (!dateString) return '-';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        
        switch (format) {
            case 'zh-CN':
                return date.toLocaleDateString('zh-CN');
            case 'datetime':
                return date.toLocaleString('zh-CN');
            case 'iso':
                return date.toISOString().split('T')[0];
            default:
                return date.toLocaleDateString(format);
        }
    },

    // 截断文本
    truncateText(text, maxLength) {
        if (!text) return '-';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    // 设置默认日期为今天
    setDefaultDate(elementId) {
        const element = document.getElementById(elementId);
        if (element && !element.value) {
            const today = new Date().toISOString().split('T')[0];
            element.value = today;
        }
    },

    // 清空表单
    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    },

    // 添加拖拽样式
    addDragOverClass(element) {
        if (element) {
            element.classList.add('dragover');
        }
    },

    // 移除拖拽样式
    removeDragOverClass(element) {
        if (element) {
            element.classList.remove('dragover');
        }
    },

    // 更新按钮文本和状态
    updateButton(buttonId, text, disabled = false) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.innerHTML = text;
            button.disabled = disabled;
        }
    },

    // 显示空状态
    showEmptyState(containerId, message = '暂无数据') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-inbox fa-3x mb-3"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    },

    // 创建加载状态
    createLoadingState(message = '加载中...') {
        return `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">${message}</span>
                </div>
                <p class="mt-2 text-muted">${message}</p>
            </div>
        `;
    }
};

// 导出到全局
window.UIUtils = UIUtils; 