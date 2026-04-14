# 🗂️ 项目导航与快速指南

## 📍 文件导航

### 🎯 快速开始（按顺序查看）
1. **本文件** - 你在这里 📍
2. **README.md** - 项目概述
3. **QUICK_START.md** - 如何启动网站
4. **ARCHITECTURE.md** - 完整的系统设计
5. **SYSTEM_STATUS.md** - 当前进度和统计

### 🏗️ 架构文档
- **ARCHITECTURE.md** - 数据模型、API设计、页面流程、等级系统
- **APPS_IMPLEMENTATION.md** - 各应用页面的详细规划
- **SYSTEM_STATUS.md** - 已完成工作总结、下一步路线图

### 💻 代码文件

#### 核心系统
- `js/db.js` - 数据库模拟层（数据持久化）
- `js/api.js` - API服务层（业务逻辑）
- `js/utils.js` - 工具函数库（通用函数）
- `js/router.js` - 路由和UI管理系统

#### 页面文件
- `start.html` - 🌟 开始页面（用户入口）
- `feature.html` - ✨ 功能展示页面
- `dashboard.html` - 🏠 仪表板（用户主页）
- `index.html` - 📱 原生首页

#### 应用模板
- `apps/template.html` - 📋 应用页面模板（快速创建新页面）

### 📚 已有页面
- `components.html` - UI组件演示

### 🎨 样式文件
- `styles.css` - 主样式文件（包含主题系统）

---

## 🚀 如何使用这个项目

### 第一步：启动网站
```bash
# 方式1：直接打开（最快）
双击 start.html

# 方式2：使用Python服务器（推荐）
cd c:\Users\OSS\Desktop\MyWeb\renyxin
python -m http.server 8000
# 访问 http://localhost:8000/start.html
```

### 第二步：创建账户
1. 访问 `start.html`
2. 点击"立即开始"
3. 选择"注册"
4. 填写用户名、邮箱、密码
5. 进入 `dashboard.html`

### 第三步：探索功能
- 查看 `feature.html` 了解所有功能
- 在 `dashboard.html` 上查看快速访问卡片
- 点击卡片访问各个应用页面

---

## 📊 系统结构速览

### 用户流程
```
start.html (开始)
    ↓
[登录/注册]
    ↓
dashboard.html (仪表板)
    ↓
快速访问 → apps/mailbox.html (邮局)
        → apps/treehole.html (树洞)
        → apps/calendar.html (日历)
        → apps/chat.html (聊天)
        → apps/games.html (游戏)
        → apps/profile.html (资料)
```

### 数据流
```
用户界面 (HTML)
    ↓
JavaScript 事件处理
    ↓
API 业务逻辑 (js/api.js)
    ↓
数据库操作 (js/db.js)
    ↓
localStorage (浏览器存储)
```

---

## 🔧 核心功能说明

### 1. 认证系统
```javascript
// 注册
api.register({ username, email, password })

// 登录
api.login(email, password)

// 登出
api.logout()

// 获取当前用户
api.getCurrentUser()
```

### 2. 经验值系统
```javascript
// 增加经验值（不同操作不同奖励）
api.addExp('action_type', amount)

// 获取等级信息
api.getUserLevel()  // 返回: level, exp, nextLevelExp, expProgress

// 自动升级：经验值达到阈值时自动升级
```

### 3. 数据CRUD
```javascript
// 邮件操作
api.createMail(mailData)
api.getMails()
api.updateMail(mailId, updates)
api.sendMail(mailId)
api.deleteMail(mailId)

// 树洞操作
api.createTreehole(holeData)
api.getAllTreeholes()
api.deleteTreehole(id)

// 日历事件
api.createEvent(eventData)
api.getEventsForMonth(year, month)
api.deleteEvent(eventId)
```

---

## 🎨 UI组件和工具

### 通知系统
```javascript
// 显示通知
notificationManager.success('成功消息')
notificationManager.error('错误消息')
notificationManager.warning('警告消息')
notificationManager.info('信息消息')

// 显示Toast
Utils.showToast('消息', '✓')
```

### 确认对话框
```javascript
ConfirmDialog.show('确认删除？', () => {
    // 确认回调
    console.log('已删除');
}, () => {
    // 取消回调
    console.log('已取消');
});
```

### 加载动画
```javascript
LoadingOverlay.show('加载中...')
// ... 执行操作 ...
LoadingOverlay.hide()
```

### 工具函数
```javascript
// 时间处理
Utils.formatDate(date)          // 2026-04-14
Utils.formatTime(date)          // 14:30
Utils.getRelativeTime(timestamp) // 2小时前
Utils.getSeason()               // spring/summer/autumn/winter

// DOM操作
Utils.createElement('div', 'class', 'inner HTML')
Utils.addClass(element, 'class-name')
Utils.fadeIn(element, 300)

// 验证
Utils.validateEmail('email@test.com')
Utils.validatePassword('password')
Utils.validateUsername('username')

// 存储
Utils.setLocalStorage('key', value)
Utils.getLocalStorage('key')

// 其他
Utils.debounce(function, delay)
Utils.throttle(function, delay)
Utils.deepClone(object)
Utils.randomId()
```

---

## 📋 创建新应用页面的步骤

### 1. 复制模板
```bash
# 复制 apps/template.html 并重命名
cp apps/template.html apps/mynewapp.html
```

### 2. 修改基본信息
```html
<title>新应用 - 二次元天堂</title>
<h1 class="app-title">✨ 新应用名称</h1>
```

### 3. 在API层添加方法
编辑 `js/api.js`：
```javascript
myNewFunction(data) {
    if (!this.currentUser) {
        return { success: false, error: '未登录' };
    }
    // 业务逻辑
    return { success: true, data: result };
}
```

### 4. 在仪表板添加入口
编辑 `dashboard.html`：
```html
<div class="quick-card" data-action="mynewapp">
    <div class="quick-icon">🎯</div>
    <div class="quick-title">新应用</div>
    <div class="quick-description">应用描述</div>
</div>
```

### 5. 在侧边栏添加菜单
```html
<li class="sidebar-menu-item" data-page="mynewapp">
    <span class="icon">🎯</span>
    <span>新应用</span>
</li>
```

---

## 🎓 常见代码模式

### 页面初始化模式
```javascript
document.addEventListener('DOMContentLoaded', () => {
    // 检查登录
    if (!api.isAuthenticated()) {
        window.location.href = '../start.html';
    }

    // 加载数据
    const user = api.getCurrentUser();
    
    // 初始化UI
    updateUI();
    
    // 绑定事件
    attachEventListeners();
});
```

### 表单处理模式
```javascript
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // 收集数据
    const data = {
        field1: input1.value,
        field2: input2.value
    };
    
    // 验证
    if (!Utils.validateEmail(data.field1)) {
        notificationManager.error('邮箱格式错误');
        return;
    }
    
    // 提交API
    const result = api.createSomething(data);
    
    // 处理结果
    if (result.success) {
        notificationManager.success('操作成功');
        form.reset();
    } else {
        notificationManager.error(result.error);
    }
});
```

### 列表渲染模式
```javascript
function renderList(items) {
    const container = document.getElementById('listContainer');
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>还没有项目</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = items.map(item => `
        <div class="list-item">
            <div class="list-item-title">${item.title}</div>
            <div class="list-item-description">${item.description}</div>
            <div class="list-item-meta">${Utils.getRelativeTime(item.timestamp)}</div>
        </div>
    `).join('');
}
```

---

## 🔐 数据模型参考

### 用户模型
```javascript
{
  id: "user_xxx",
  username: "用户名",
  email: "email@test.com",
  avatar: "avatar_url",
  level: 1,
  exp: 0,
  status: "online|offline",
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
  }
}
```

### 邮件模型
```javascript
{
  id: "mail_xxx",
  senderId: "user_xxx",
  title: "邮件标题",
  content: "邮件内容",
  scheduleSendAt: timestamp,  // null = 立即发送
  status: "draft|scheduled|sent",
  createdAt: timestamp
}
```

### 树洞模型
```javascript
{
  id: "hole_xxx",
  userId: "user_xxx",
  content: "树洞内容",
  images: ["url1", "url2"],
  anonymous: true,
  likes: 10,
  replies: 5,
  createdAt: timestamp
}
```

---

## 📱 主题系统

### CSS变量
```css
/* 浅色模式 */
--bg-primary: #ffffff;
--bg-secondary: #f5f7fb;
--text-primary: #1a1a2e;
--text-secondary: #666666;
--accent-primary: #ff6b9d;
--accent-secondary: #c06c84;
--border-color: #e0e0e0;
--shadow-color: rgba(0,0,0,0.1);
```

### 禁用暗色模式
```javascript
// 添加到 body
document.body.classList.add('dark-mode')
```

---

## 🐛 调试技巧

### 在浏览器控制台调试
```javascript
// 查看用户数据
db.getItem('currentUser')

// 查看所有用户
db.getItem('users')

// 模拟操作
api.addExp('debug', 50)

// 查看等级
api.getUserLevel()
```

### 启用更多日志
```javascript
// 在 script.js 中添加
console.log('当前用户:', api.getCurrentUser());
console.log('认证状态:', api.isAuthenticated());
```

---

## 🎯 下一步任务

### 立即可做
- [ ] 启动网站并测试注册登录
- [ ] 浏览 start.html 和 feature.html
- [ ] 查看 dashboard.html
- [ ] 阅读 ARCHITECTURE.md 理解系统设计

### 短期（1-2周）
- [ ] 实现 mailbox.html 功能页面
- [ ] 实现 treehole.html 功能页面
- [ ] 实现 calendar.html 功能页面
- [ ] 实现 chat.html 功能页面
- [ ] 实现 games.html 功能页面
- [ ] 实现 profile.html 功能页面

### 中期（1个月）
- [ ] 添加时间感应主题
- [ ] 实现推送系统
- [ ] 完善表单验证
- [ ] 添加更多动画效果
- [ ] 优化性能

### 长期（1-3个月）
- [ ] 后端集成
- [ ] 实时数据同步
- [ ] 社交功能
- [ ] 部署上线

---

## 💡 关键概念

### 等级系统
```
用户活跃度 → 获得经验值 → EXP达到阈值 → 自动升级
Lv.1-5:   新手村  (基础功能)
Lv.6-10:  学徒    (+社交功能)
Lv.11-20: 探索者  (+高级功能)
Lv.21-30: 大师    (VIP特权)
```

### 农场系统
```
活跃度评分 → 页面底部农作物数量和状态
活跃度越高 → 农作物越多越茂盛
```

### 时间感应
```
可以根据时间（白天/晚上）或季节改变主题
```

---

## 📞 常见问题

**Q: 数据会保留吗？**
A: 是的，使用 localStorage，关闭浏览器后数据仍然存在。

**Q: 如何清除所有数据？**
A: 在控制台运行：`db.clear()`

**Q: 如何添加真实后端？**
A: 修改 `js/api.js` 中的方法，改为调用真实的API端点。

**Q: 可以部署到服务器吗？**
A: 可以，这是纯前端项目，可以部署到任何静态托管服务。

**Q: 如何自定义样式？**
A: 编辑 `styles.css` 或在各页面添加 `<style>` 标签。

---

## 🎉 现在开始吧！

1. ✅ 打开 `start.html`
2. ✅ 创建一个测试账户
3. ✅ 浏览 `feature.html` 看所有功能
4. ✅ 进入 `dashboard.html` 体验仪表板
5. ✅ 阅读文档了解如何添加功能

**祝你开发愉快！** 🚀✨

---

**最后更新**: 2026-04-14  
**项目状态**: ✅ 架构完成 | ⏳ 等待功能实现  
**当前版本**: 1.0 Alpha
