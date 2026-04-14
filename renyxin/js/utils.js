/**
 * 工具函数库
 */

class Utils {
    // 时间相关
    static formatDate(date) {
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    static formatTime(date) {
        return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static formatDateTime(timestamp) {
        const date = new Date(timestamp);
        return this.formatDate(date) + ' ' + this.formatTime(date);
    }

    static getRelativeTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;
        
        return this.formatDate(date);
    }

    static getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        return 'night';
    }

    static getSeason() {
        const month = new Date().getMonth();
        if (month >= 2 && month < 5) return 'spring';
        if (month >= 5 && month < 8) return 'summer';
        if (month >= 8 && month < 11) return 'autumn';
        return 'winter';
    }

    // DOM 相关
    static createElement(tag, className, innerHTML) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    }

    static addClass(element, className) {
        element.classList.add(...className.split(' '));
    }

    static removeClass(element, className) {
        element.classList.remove(...className.split(' '));
    }

    static hasClass(element, className) {
        return element.classList.contains(className);
    }

    static toggleClass(element, className) {
        element.classList.toggle(className);
    }

    static show(element) {
        element.style.display = '';
    }

    static hide(element) {
        element.style.display = 'none';
    }

    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        this.show(element);
        
        return new Promise(resolve => {
            setTimeout(() => {
                element.style.transition = `opacity ${duration}ms`;
                element.style.opacity = '1';
                setTimeout(() => {
                    element.style.transition = '';
                    resolve();
                }, duration);
            }, 10);
        });
    }

    static fadeOut(element, duration = 300) {
        element.style.transition = `opacity ${duration}ms`;
        element.style.opacity = '0';
        
        return new Promise(resolve => {
            setTimeout(() => {
                this.hide(element);
                element.style.transition = '';
                resolve();
            }, duration);
        });
    }

    // 验证相关
    static validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    static validatePassword(password) {
        return password && password.length >= 6;
    }

    static validateUsername(username) {
        return username && username.length >= 3 && username.length <= 20;
    }

    // 存储相关
    static setLocalStorage(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    static getLocalStorage(key) {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    }

    static removeLocalStorage(key) {
        localStorage.removeItem(key);
    }

    // 消息提示
    static showNotification(message, type = 'info', duration = 3000) {
        const notification = this.createElement('div', `notification notification-${type}`, message);
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        if (duration > 0) {
            setTimeout(() => {
                notification.remove();
            }, duration);
        }
        
        return notification;
    }

    static getNotificationColor(type) {
        const colors = {
            info: '#3498db',
            success: '#2ecc71',
            warning: '#f39c12',
            error: '#e74c3c'
        };
        return colors[type] || colors.info;
    }

    static showToast(message, icon = 'ℹ️') {
        const toast = this.createElement('div', 'toast', `${icon} ${message}`);
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            background: rgba(0,0,0,0.8);
            color: white;
            border-radius: 20px;
            font-size: 14px;
            z-index: 10000;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 2000);
    }

    // 动画相关
    static animateCount(element, start, end, duration = 1000) {
        const startValue = parseInt(start);
        const endValue = parseInt(end);
        const range = endValue - startValue;
        const increment = range / (duration / 16);
        let current = startValue;

        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= endValue) || (increment < 0 && current <= endValue)) {
                current = endValue;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current);
        }, 16);
    }

    static scrollToElement(element, offset = 0) {
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
            top: elementPosition + offset,
            behavior: 'smooth'
        });
    }

    // 字符串相关
    static truncate(str, length) {
        return str.length > length ? str.substring(0, length) + '...' : str;
    }

    static capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    static slugify(str) {
        return str.toLowerCase().replace(/\s+/g, '-');
    }

    // 随机相关
    static randomId() {
        return Math.random().toString(36).substr(2, 9);
    }

    static randomColor() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16);
    }

    static randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // 数组相关
    static shuffle(array) {
        return array.sort(() => Math.random() - 0.5);
    }

    static chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    // 防抖和节流
    static debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    }

    static throttle(func, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                func(...args);
            }
        };
    }

    // 深度克隆
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        
        const cloned = {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
