# 📱 应用功能页面实现指南

## 页面列表

### 1. 📮 时间邮局 (mailbox.html)

**核心功能:**
- 创建邮件（标题、内容）
- 定时发送（选择日期和时间）
- 邮件管理（查看、编辑、删除）
- 邮件模板

**UI组件:**
- 邮件编辑器（富文本）
- 日期时间选择器
- 邮件列表和详情
- 预览窗口

**API调用:**
- `api.createMail(mailData)` - 创建邮件
- `api.getMails()` - 获取邮件列表
- `api.updateMail(mailId, updates)` - 更新邮件
- `api.sendMail(mailId)` - 发送邮件
- `api.deleteMail(mailId)` - 删除邮件

**数据模型:**
```javascript
{
  title: "标题",
  content: "内容",
  scheduleSendAt: timestamp,  // 或 null 表示立即
  status: "draft|scheduled|sent",
  tags: ["tag1", "tag2"]
}
```

---

### 2. 🌳 互动树洞 (treehole.html)

**核心功能:**
- 发布树洞（文字+图片）
- 匿名发布选项
- 浏览所有树洞
- 点赞和评论
- 删除自己的树洞

**UI组件:**
- 树洞编辑器
- 图片上传器
- 树洞卡片（含头像、内容、操作）
- 评论区

**API调用:**
- `api.createTreehole(holeData)` - 发布树洞
- `api.getAllTreeholes()` - 获取列表
- `api.getTreeholeById(id)` - 获取详情
- `api.likeTreehole(id)` - 点赞
- `api.deleteTreehole(id)` - 删除

**数据模型:**
```javascript
{
  content: "内容",
  images: ["url1", "url2"],
  anonymous: true,
  userId: "user_id",  // 如果匿名会隐藏
  likes: 0,
  replies: []
}
```

---

### 3. 📅 个性化日历 (calendar.html)

**核心功能:**
- 月历视图
- 添加事件（目标、提醒、生日）
- 自定义日历背景
- 事件统计
- 目标追踪

**UI组件:**
- 日历网格
- 事件创建/编辑对话框
- 背景上传器
- 事件列表过滤

**API调用:**
- `api.getEventsForMonth(year, month)` - 获取月份事件
- `api.getEventsForDate(date)` - 获取特定日期事件
- `api.createEvent(eventData)` - 创建事件
- `api.deleteEvent(eventId)` - 删除事件

**数据模型:**
```javascript
{
  date: "2026-04-14",
  type: "goal|reminder|birthday",
  title: "标题",
  description: "描述",
  color: "#ff6b9d",
  completed: false
}
```

---

### 4. 💬 在线聊天 (chat.html)

**核心功能:**
- 实时消息发送
- 在线人数显示
- 消息历史记录
- 用户列表
- 简单的表情等

**UI组件:**
- 消息列表（自动滚动）
- 消息输入框
- 在线用户列表
- 用户信息卡片

**API调用:**
- 模拟 WebSocket 连接
- `api.sendMessage(content)` - 发送消息
- `api.getOnlineCount()` - 获取在线人数
- `api.getMessageHistory()` - 获取历史

---

### 5. 🎮 小游戏 (games.html)

**核心功能:**
- 游戏列表展示
- 养成农场游戏
- 拼图游戏
- 季节任务
- 排行榜

**游戏类型:**
1. **养成农场** - 基于活跃度生长
2. **心情拼图** - 完成拼图获得成就
3. **季节任务** - 根据季节改变

**API调用:**
- `api.createGame(gameType)` - 创建游戏实例
- `api.submitGameScore(gameId, score)` - 提交分数
- `api.getGameLeaderboard(gameId)` - 获取排行

---

### 6. 👤 用户资料 (profile.html)

**核心功能:**
- 用户信息展示
- 技能树展示（彩蛋形式）
- 成就徽章展示
- 等级进度
- 编辑个人信息

**UI组件:**
- 用户头像（可编辑）
- 技能树可视化
- 成就网格
- 个人统计

**API调用:**
- `api.getMe()` - 获取当前用户
- `api.updateProfile(updates)` - 更新资料
- `api.getUserStats()` - 获取统计
- `api.getUserLevel()` - 获取等级

---

## 页面基础结构模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>功能名称 - 二次元天堂</title>
    <link rel="stylesheet" href="../styles.css">
    <style>
        /* 页面特定样式 */
    </style>
</head>
<body>
    <!-- 返回按钮 -->
    <a href="../dashboard.html" class="back-button">← 返回仪表板</a>

    <!-- 页面顶部 -->
    <div class="app-header">
        <h1 class="app-title">功能名称</h1>
    </div>

    <!-- 主要内容 -->
    <div class="app-container">
        <!-- 功能内容 -->
    </div>

    <!-- 底部导航 -->
    <div class="app-footer">
        <!-- 页脚内容 -->
    </div>

    <script src="../js/utils.js"></script>
    <script src="../js/db.js"></script>
    <script src="../js/api.js"></script>
    <script src="../js/router.js"></script>

    <script>
        // 检查登录
        if (!api.isAuthenticated()) {
            window.location.href = '../start.html';
        }

        // 初始化页面
        function initPage() {
            // 页面初始化逻辑
        }

        document.addEventListener('DOMContentLoaded', initPage);
    </script>
</body>
</html>
```

---

## 通用样式规范

```css
/* 应用页面通用样式 */
.app-header {
    padding: 2rem;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    color: white;
    text-align: center;
}

.app-title {
    font-size: 2rem;
    font-weight: 900;
}

.app-container {
    max-width: 1000px;
    margin: 2rem auto;
    padding: 0 1rem;
}

.app-footer {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
}

.back-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 2rem;
    background: var(--bg-secondary);
    color: var(--text-primary);
    text-decoration: none;
    border-radius: 8px;
    transition: all 0.3s ease;
    margin: 1rem;
}

.back-button:hover {
    background: var(--accent-light);
    color: var(--accent-primary);
}
```

---

## 交互流程示例

### 邮局编辑流程
```
用户点击"写邮件"
  ↓
打开邮件编辑器
  ├─ 输入标题
  ├─ 输入内容
  ├─ 选择发送方式
  │  ├─ 立即发送
  │  └─ 定时发送 → 选择日期和时间
  ├─ 预览邮件
  └─ 确认发送
  ↓
显示成功提示 + 增加经验值
  ↓
邮件进入发送队列
```

### 树洞发布流程
```
用户点击"发树洞"
  ↓
打开编辑器
  ├─ 输入内容
  ├─ 上传图片（可选）
  ├─ 选择是否匿名
  └─ 点击发送
  ↓
树洞即时发布
  ↓
显示成功提示 + 增加经验值
  ↓
用户可以在树洞列表看到
```

---

## 状态管理策略

### 本地状态
```javascript
// 使用 localStorage 保存临时状态
const draftMail = Utils.getLocalStorage('draft_mail');
const selectedDate = Utils.getLocalStorage('selected_date');
```

### 全局状态
```javascript
// 使用 API 提供的当前用户状态
const user = api.getCurrentUser();
const stats = api.getUserStats();
```

---

## 错误处理模式

```javascript
// 标准错误处理
const result = api.createMail(mailData);
if (result.success) {
    notificationManager.success('邮件创建成功！');
    // 刷新列表
} else {
    notificationManager.error(result.error || '操作失败');
}
```

---

## 性能优化建议

1. **懒加载**: 只加载可见的内容
2. **防抖**: 使用防抖处理高频操作
3. **缓存**: 缓存频繁访问的数据
4. **虚拟滚动**: 大列表使用虚拟滚动

```javascript
const debouncedSearch = Utils.debounce((query) => {
    // 搜索操作
}, 500);
```

---

## 下一步实现清单

- [ ] mailbox.html - 时间邮局
- [ ] treehole.html - 互动树洞
- [ ] calendar.html - 个性日历
- [ ] chat.html - 在线聊天
- [ ] games.html - 小游戏
- [ ] profile.html - 用户资料
- [ ] 时间感应主题系统
- [ ] 推送系统实现
- [ ] 表单验证完善
- [ ] 错误处理优化

每个页面的实现会遵循这个模板和规范。
