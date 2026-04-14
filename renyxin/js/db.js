/**
 * 数据库模拟层 (LocalStorage)
 * 模拟一个简单的数据库系统
 */

class Database {
    constructor() {
        this.prefix = 'anime_portal_';
        this.initDB();
    }

    initDB() {
        // 初始化默认数据
        if (!this.getItem('users')) {
            this.setItem('users', []);
        }
        if (!this.getItem('mails')) {
            this.setItem('mails', []);
        }
        if (!this.getItem('treeholes')) {
            this.setItem('treeholes', []);
        }
        if (!this.getItem('events')) {
            this.setItem('events', []);
        }
        if (!this.getItem('currentUser')) {
            this.setItem('currentUser', null);
        }
    }

    // 基础操作
    getItem(key) {
        const data = localStorage.getItem(this.prefix + key);
        return data ? JSON.parse(data) : null;
    }

    setItem(key, value) {
        localStorage.setItem(this.prefix + key, JSON.stringify(value));
    }

    removeItem(key) {
        localStorage.removeItem(this.prefix + key);
    }

    clear() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                localStorage.removeItem(key);
            }
        });
    }

    // 用户操作
    createUser(userData) {
        const users = this.getItem('users') || [];
        const user = {
            id: this.generateId(),
            ...userData,
            createdAt: Date.now(),
            level: 1,
            exp: 0,
            stats: {
                totalMails: 0,
                totalTreeHoles: 0,
                loginDays: 1,
                activeScore: 0
            },
            skills: {
                communication: 0,
                creativity: 0,
                exploration: 0
            },
            lastActiveAt: Date.now()
        };
        users.push(user);
        this.setItem('users', users);
        return user;
    }

    getUserByEmail(email) {
        const users = this.getItem('users') || [];
        return users.find(u => u.email === email);
    }

    getUserById(id) {
        const users = this.getItem('users') || [];
        return users.find(u => u.id === id);
    }

    updateUser(id, updates) {
        const users = this.getItem('users') || [];
        const userIndex = users.findIndex(u => u.id === id);
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...updates, updatedAt: Date.now() };
            this.setItem('users', users);
            return users[userIndex];
        }
        return null;
    }

    // 邮件操作
    createMail(mailData) {
        const mails = this.getItem('mails') || [];
        const mail = {
            id: this.generateId(),
            ...mailData,
            createdAt: Date.now(),
            status: 'draft'
        };
        mails.push(mail);
        this.setItem('mails', mails);
        return mail;
    }

    getMailsByUser(userId) {
        const mails = this.getItem('mails') || [];
        return mails.filter(m => m.senderId === userId);
    }

    updateMail(id, updates) {
        const mails = this.getItem('mails') || [];
        const mailIndex = mails.findIndex(m => m.id === id);
        if (mailIndex !== -1) {
            mails[mailIndex] = { ...mails[mailIndex], ...updates };
            this.setItem('mails', mails);
            return mails[mailIndex];
        }
        return null;
    }

    deleteMail(id) {
        const mails = this.getItem('mails') || [];
        this.setItem('mails', mails.filter(m => m.id !== id));
    }

    // 树洞操作
    createTreehole(holeData) {
        const holes = this.getItem('treeholes') || [];
        const hole = {
            id: this.generateId(),
            ...holeData,
            createdAt: Date.now(),
            likes: 0,
            replies: []
        };
        holes.push(hole);
        this.setItem('treeholes', holes);
        return hole;
    }

    getAllTreeholes() {
        return this.getItem('treeholes') || [];
    }

    getTreeholeById(id) {
        const holes = this.getItem('treeholes') || [];
        return holes.find(h => h.id === id);
    }

    deleteTreehole(id) {
        const holes = this.getItem('treeholes') || [];
        this.setItem('treeholes', holes.filter(h => h.id !== id));
    }

    // 日历事件操作
    createEvent(eventData) {
        const events = this.getItem('events') || [];
        const event = {
            id: this.generateId(),
            ...eventData,
            createdAt: Date.now()
        };
        events.push(event);
        this.setItem('events', events);
        return event;
    }

    getEventsByUser(userId) {
        const events = this.getItem('events') || [];
        return events.filter(e => e.userId === userId);
    }

    getEventsByDate(userId, date) {
        const events = this.getItem('events') || [];
        return events.filter(e => e.userId === userId && e.date === date);
    }

    deleteEvent(id) {
        const events = this.getItem('events') || [];
        this.setItem('events', events.filter(e => e.id !== id));
    }

    // 工具方法
    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// 创建全局数据库实例
const db = new Database();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Database;
}
