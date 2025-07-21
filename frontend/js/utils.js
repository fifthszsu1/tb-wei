// 工具函数模块
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

    // 截断文本
    truncateText(text, maxLength) {
        if (!text) return '-';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    // 格式化日期
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN');
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
    }
};

// 导出到全局作用域（兼容现有代码）
window.showAlert = UIUtils.showAlert;
window.showSpinner = UIUtils.showSpinner;
window.hideSpinner = UIUtils.hideSpinner;
window.truncateText = UIUtils.truncateText;
window.formatDate = UIUtils.formatDate;
window.showConfirmDialog = UIUtils.showConfirmDialog;

// 也可以通过UIUtils对象访问
window.UIUtils = UIUtils; 