/**
 * 路由管理系统
 */

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.beforeRouteChange = null;
        this.afterRouteChange = null;
        this.init();
    }

    init() {
        // 监听浏览器返回按钮
        window.addEventListener('popstate', () => this.handleRouteChange());
        
        // 拦截所有链接点击
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-route]');
            if (link && !link.target) {
                e.preventDefault();
                const route = link.getAttribute('data-route');
                this.navigate(route);
            }
        });
    }

    register(path, component) {
        this.routes.set(path, component);
    }

    registerMultiple(routes) {
        Object.entries(routes).forEach(([path, component]) => {
            this.register(path, component);
        });
    }

    async navigate(path, params = {}) {
        const route = this.routes.get(path);
        
        if (!route) {
            console.warn(`Route not found: ${path}`);
            return false;
        }

        // 执行路由前钩子
        if (this.beforeRouteChange) {
            const shouldContinue = await this.beforeRouteChange(path, params);
            if (!shouldContinue) return false;
        }

        this.currentRoute = path;
        
        // 执行路由组件
        if (typeof route === 'function') {
            await route(params);
        }

        // 更新浏览器历史
        window.history.pushState({ path, params }, '', `?page=${path}`);

        // 执行路由后钩子
        if (this.afterRouteChange) {
            this.afterRouteChange(path, params);
        }

        return true;
    }

    getCurrentRoute() {
        return this.currentRoute;
    }

    onBeforeRouteChange(callback) {
        this.beforeRouteChange = callback;
    }

    onAfterRouteChange(callback) {
        this.afterRouteChange = callback;
    }

    handleRouteChange() {
        const params = new URLSearchParams(window.location.search);
        const page = params.get('page') || 'home';
        this.navigate(page);
    }
}

/**
 * 模态框管理系统
 */

class ModalManager {
    constructor() {
        this.modals = new Map();
        this.activeModals = [];
    }

    register(name, options) {
        this.modals.set(name, options);
    }

    open(name, data = {}) {
        const config = this.modals.get(name);
        if (!config) {
            console.warn(`Modal not found: ${name}`);
            return;
        }

        const modal = this.createModal(name, config, data);
        this.activeModals.push(name);
        document.body.appendChild(modal);

        // 触发打开动画
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);

        return modal;
    }

    close(name) {
        const modal = document.querySelector(`[data-modal="${name}"]`);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
                this.activeModals = this.activeModals.filter(m => m !== name);
            }, 300);
        }
    }

    createModal(name, config, data) {
        const modal = Utils.createElement('div', `modal modal-${name}`, `
            <div class="modal-overlay" data-close="${name}"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <h2>${config.title || '提示'}</h2>
                    <button class="modal-close" data-close="${name}">✕</button>
                </div>
                <div class="modal-body">
                    ${config.content || ''}
                </div>
                <div class="modal-footer">
                    ${config.footer || '<button class="btn btn-secondary" data-close="' + name + '">关闭</button>'}
                </div>
            </div>
        `);

        modal.setAttribute('data-modal', name);
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;

        // 关闭按钮处理
        const closeButtons = modal.querySelectorAll('[data-close]');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => this.close(name));
        });

        // 执行初始化回调
        if (config.onOpen) {
            config.onOpen(modal, data);
        }

        return modal;
    }
}

/**
 * 通知/提示管理系统
 */

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.maxNotifications = 5;
    }

    show(message, type = 'info', duration = 3000, actions = []) {
        if (this.notifications.length >= this.maxNotifications) {
            this.notifications.shift().remove();
        }

        const notification = Utils.createElement('div', `notification notification-${type}`, `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                ${actions.map(action => `<button class="notification-action">${action.label}</button>`).join('')}
            </div>
        `);

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: white;
            border-left: 4px solid ${Utils.getNotificationColor(type)};
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
            min-width: 300px;
        `;

        document.body.appendChild(notification);
        this.notifications.push(notification);

        // 绑定操作按钮
        const buttons = notification.querySelectorAll('.notification-action');
        buttons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                if (actions[index].onClick) {
                    actions[index].onClick();
                }
            });
        });

        // 自动关闭
        if (duration > 0) {
            setTimeout(() => {
                this.hide(notification);
            }, duration);
        }

        return notification;
    }

    success(message, duration = 2000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 3000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 3000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 2000) {
        return this.show(message, 'info', duration);
    }

    hide(notification) {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            notification.remove();
            this.notifications = this.notifications.filter(n => n !== notification);
        }, 300);
    }

    clear() {
        this.notifications.forEach(n => this.hide(n));
    }
}

/**
 * 确认对话框
 */

class ConfirmDialog {
    static show(message, onConfirm, onCancel) {
        const modal = Utils.createElement('div', 'confirm-dialog', `
            <div class="confirm-overlay"></div>
            <div class="confirm-container">
                <div class="confirm-message">${message}</div>
                <div class="confirm-buttons">
                    <button class="btn btn-secondary confirm-cancel">取消</button>
                    <button class="btn btn-primary confirm-ok">确认</button>
                </div>
            </div>
        `);

        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;

        const okBtn = modal.querySelector('.confirm-ok');
        const cancelBtn = modal.querySelector('.confirm-cancel');

        okBtn.addEventListener('click', () => {
            modal.remove();
            onConfirm && onConfirm();
        });

        cancelBtn.addEventListener('click', () => {
            modal.remove();
            onCancel && onCancel();
        });

        document.body.appendChild(modal);
        return modal;
    }
}

/**
 * 加载动画
 */

class LoadingOverlay {
    static show(message = '加载中...') {
        const overlay = Utils.createElement('div', 'loading-overlay', `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `);

        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3000;
        `;

        document.body.appendChild(overlay);
        return overlay;
    }

    static hide() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
}

// 创建全局实例
const router = new Router();
const modalManager = new ModalManager();
const notificationManager = new NotificationManager();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Router, ModalManager, NotificationManager, ConfirmDialog, LoadingOverlay };
}
