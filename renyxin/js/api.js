/**
 * API 模拟层
 * 模拟后端接口，提供所有业务逻辑
 */

class APIService {
    constructor() {
        this.db = db;
        this.currentUser = this.db.getItem('currentUser');
        this.tokenKey = 'anime_portal_token';
    }

    // ==================== 认证接口 ====================
    
    register(userData) {
        const { username, email, password } = userData;
        
        // 验证邮箱是否已注册
        if (this.db.getUserByEmail(email)) {
            return { success: false, error: '邮箱已被注册' };
        }

        // 创建用户
        const user = this.db.createUser({
            username,
            email,
            passwordHash: this.hashPassword(password),
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            status: 'online',
            preferences: {
                theme: 'auto',
                calendarBg: 'default',
                language: 'zh-CN'
            }
        });

        // 生成token
        const token = this.generateToken(user.id);
        localStorage.setItem(this.tokenKey, token);
        
        // 设置当前用户
        const userCopy = { ...user };
        delete userCopy.passwordHash;
        this.currentUser = userCopy;
        this.db.setItem('currentUser', this.currentUser);

        return {
            success: true,
            user: userCopy,
            token
        };
    }

    login(email, password) {
        const user = this.db.getUserByEmail(email);
        
        if (!user || !this.verifyPassword(password, user.passwordHash)) {
            return { success: false, error: '邮箱或密码错误' };
        }

        // 更新最后活动时间
        this.db.updateUser(user.id, { lastActiveAt: Date.now(), status: 'online' });

        // 生成token
        const token = this.generateToken(user.id);
        localStorage.setItem(this.tokenKey, token);
        
        // 设置当前用户
        const userCopy = { ...user };
        delete userCopy.passwordHash;
        this.currentUser = userCopy;
        this.db.setItem('currentUser', this.currentUser);

        return {
            success: true,
            user: userCopy,
            token
        };
    }

    logout() {
        if (this.currentUser) {
            this.db.updateUser(this.currentUser.id, { status: 'offline' });
        }
        localStorage.removeItem(this.tokenKey);
        this.currentUser = null;
        this.db.setItem('currentUser', null);
        return { success: true };
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getMe() {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }
        return { success: true, user: this.currentUser };
    }

    updateProfile(updates) {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }

        const updatedUser = this.db.updateUser(this.currentUser.id, updates);
        const userCopy = { ...updatedUser };
        delete userCopy.passwordHash;
        this.currentUser = userCopy;
        this.db.setItem('currentUser', this.currentUser);

        return { success: true, user: userCopy };
    }

    // ==================== 邮箱接口 ====================

    createMail(mailData) {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }

        const mail = this.db.createMail({
            ...mailData,
            senderId: this.currentUser.id
        });

        // 增加经验值
        this.addExp('mail_created', 10);

        return { success: true, mail };
    }

    getMails() {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }

        const mails = this.db.getMailsByUser(this.currentUser.id);
        return { success: true, mails, total: mails.length };
    }

    updateMail(mailId, updates) {
        const mail = this.db.updateMail(mailId, updates);
        return mail ? { success: true, mail } : { success: false, error: '邮件不存在' };
    }

    sendMail(mailId) {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }

        const updated = this.db.updateMail(mailId, {
            status: 'sent',
            sentAt: Date.now()
        });

        if (updated) {
            this.db.updateUser(this.currentUser.id, {
                'stats.totalMails': (this.currentUser.stats?.totalMails || 0) + 1
            });
            return { success: true, mail: updated };
        }
        return { success: false, error: '邮件不存在' };
    }

    deleteMail(mailId) {
        this.db.deleteMail(mailId);
        return { success: true };
    }

    // ==================== 树洞接口 ====================

    createTreehole(holeData) {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }

        const hole = this.db.createTreehole({
            ...holeData,
            userId: this.currentUser.id
        });

        // 增加经验值
        this.addExp('treehole_created', 15);

        return { success: true, hole };
    }

    getAllTreeholes() {
        const holes = this.db.getAllTreeholes();
        return { success: true, holes, total: holes.length };
    }

    getTreeholeById(id) {
        const hole = this.db.getTreeholeById(id);
        return hole ? { success: true, hole } : { success: false, error: '树洞不存在' };
    }

    deleteTreehole(id) {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }

        this.db.deleteTreehole(id);
        return { success: true };
    }

    likeTreehole(holeId) {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }

        const hole = this.db.getTreeholeById(holeId);
        if (hole) {
            const updated = this.db.updateMail(holeId, { likes: hole.likes + 1 });
            return { success: true, hole: updated };
        }
        return { success: false, error: '树洞不存在' };
    }

    // ==================== 日历接口 ====================

    createEvent(eventData) {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }

        const event = this.db.createEvent({
            ...eventData,
            userId: this.currentUser.id
        });

        // 增加经验值
        this.addExp('event_created', 5);

        return { success: true, event };
    }

    getEventsForMonth(year, month) {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }

        const events = this.db.getEventsByUser(this.currentUser.id);
        return { success: true, events };
    }

    getEventsForDate(date) {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }

        const events = this.db.getEventsByDate(this.currentUser.id, date);
        return { success: true, events };
    }

    deleteEvent(eventId) {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }

        this.db.deleteEvent(eventId);
        return { success: true };
    }

    // ==================== 用户数据接口 ====================

    addExp(action, amount) {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }

        const newExp = (this.currentUser.exp || 0) + amount;
        const lastLevel = this.currentUser.level || 1;
        const nextLevelexp = lastLevel * 100 + 100;
        
        let levelUp = false;
        let newLevel = lastLevel;
        let finalExp = newExp;

        if (newExp >= nextLevelexp) {
            newLevel = lastLevel + 1;
            finalExp = newExp - nextLevelexp;
            levelUp = true;

            // 增加技能点数
            const updatedStats = {
                ...this.currentUser.stats,
                activeScore: (this.currentUser.stats?.activeScore || 0) + 10
            };
            
            this.db.updateUser(this.currentUser.id, {
                exp: finalExp,
                level: newLevel,
                stats: updatedStats
            });
        } else {
            this.db.updateUser(this.currentUser.id, { exp: newExp });
        }

        // 重新加载当前用户
        this.currentUser = this.db.getUserById(this.currentUser.id);
        this.db.setItem('currentUser', this.currentUser);

        return {
            success: true,
            newExp: finalExp,
            levelUp,
            newLevel
        };
    }

    getUserLevel() {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }

        const nextLevelExp = this.currentUser.level * 100 + 100;
        return {
            success: true,
            level: this.currentUser.level,
            exp: this.currentUser.exp,
            nextLevelExp,
            expProgress: (this.currentUser.exp / nextLevelExp * 100).toFixed(0)
        };
    }

    getUserStats() {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }

        return {
            success: true,
            stats: this.currentUser.stats,
            skills: this.currentUser.skills,
            registeredDays: Math.ceil((Date.now() - this.currentUser.createdAt) / (1000 * 60 * 60 * 24))
        };
    }

    updateUserStatus(status) {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }

        const updated = this.db.updateUser(this.currentUser.id, {
            status,
            lastActiveAt: Date.now()
        });

        return { success: true, user: updated };
    }

    // ==================== 工具方法 ====================

    generateToken(userId) {
        return `token_${userId}_${Date.now()}_${Math.random().toString(36).substr(2)}`;
    }

    hashPassword(password) {
        // 简单的密码哈希（生产环境应使用bcrypt）
        return 'hash_' + btoa(password);
    }

    verifyPassword(password, hash) {
        return this.hashPassword(password) === hash;
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    isTokenValid() {
        return !!localStorage.getItem(this.tokenKey);
    }
}

// 创建全局API实例
const api = new APIService();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIService;
}
