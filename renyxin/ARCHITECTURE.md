# 🎨 项目整体架构规划

## 项目结构（待实现）

```
renyxin/
├── start.html              # 开始页面
├── feature.html            # 特性展示页面
├── index.html              # 主首页（已有）
├── apps/                   # 应用功能页面
│   ├── mailbox.html        # 时间邮局
│   ├── treehole.html       # 互动树洞
│   ├── calendar.html       # 个性化日历
│   ├── chat.html           # 在线聊天室
│   ├── profile.html        # 用户资料/技能树
│   ├── games.html          # 小游戏中心
│   └── dashboard.html      # 用户仪表板
├── api/                    # 模拟接口
│   ├── auth.js             # 认证相关
│   ├── mailbox.js          # 邮箱相关
│   ├── treehole.js         # 树洞相关
│   ├── calendar.js         # 日历相关
│   ├── chat.js             # 聊天相关
│   ├── user.js             # 用户相关
│   └── game.js             # 游戏相关
├── css/                    # 样式文件
│   ├── styles.css          # 核心样式（已有）
│   ├── pages.css           # 各页面样式
│   ├── components.css      # 组件样式
│   ├── animation.css       # 动画样式
│   └── theme.css           # 主题系统
├── js/                     # 脚本文件
│   ├── script.js           # 核心脚本（已有）
│   ├── pages.js            # 页面管理
│   ├── router.js           # 路由管理
│   ├── store.js            # 状态管理
│   ├── auth.js             # 认证模块
│   ├── components.js       # 组件模块
│   └── utils.js            # 工具函数
├── data/                   # 本地数据存储
│   └── db.js               # localStorage管理
└── res/                    # 素材文件夹（已有）
```

## 🎯 核心数据模型

### 1. 用户模型 (User Model)
```javascript
{
  id: "user_123",
  username: "username",
  email: "user@example.com",
  avatar: "url",
  level: 1,                    // 等级 1-30
  exp: 0,                      // 经验值
  registeredAt: timestamp,
  lastActiveAt: timestamp,
  status: "online|offline|away",
  preferences: {
    theme: "light|dark|auto",
    calendarBg: "default|custom_url",
    language: "zh-CN"
  },
  stats: {
    totalMails: 0,             // 发送邮件总数
    totalTreeHoles: 0,         // 发送树洞总数
    loginDays: 0,              // 登录天数
    activeScore: 0             // 活跃度评分
  },
  skills: {                    // 技能树
    communication: 0,          // 沟通能力
    creativity: 0,             // 创意能力
    exploration: 0             // 探索能力
  }
}
```

### 2. 邮件模型 (Mail Model)
```javascript
{
  id: "mail_123",
  senderId: "user_123",
  title: "标题",
  content: "内容",
  scheduleSendAt: timestamp,   // 定时发送时间
  status: "draft|scheduled|sent",
  createdAt: timestamp,
  tags: ["tag1", "tag2"]
}
```

### 3. 树洞模型 (TreeHole Model)
```javascript
{
  id: "hole_123",
  userId: "user_123",
  content: "内容",
  images: ["url1", "url2"],
  anonymous: true,             // 匿名发布
  createdAt: timestamp,
  likes: 0,
  replies: 10
}
```

### 4. 日历事件模型 (Calendar Event Model)
```javascript
{
  id: "event_123",
  userId: "user_123",
  date: "2026-04-14",
  type: "goal|reminder|birthday",
  title: "标题",
  description: "描述",
  color: "#ff6b9d",
  completed: false
}
```

### 5. 游戏数据模型 (Game Model)
```javascript
{
  id: "game_123",
  userId: "user_123",
  type: "farm|puzzle|quest",
  score: 1000,
  level: 5,
  progress: 45,
  lastPlayedAt: timestamp,
  achievements: []
}
```

## 🔌 API 接口设计

### 认证接口 (Authentication)
```javascript
// 注册
POST /api/auth/register
{ username, email, password } → { user, token, success }

// 登录
POST /api/auth/login
{ email, password } → { user, token, success }

// 登出
POST /api/auth/logout → { success }

// 获取当前用户
GET /api/auth/me → { user }

// 更新用户信息
PUT /api/auth/profile
{ username, avatar, preferences } → { user, success }
```

### 邮箱接口 (Mailbox API)
```javascript
// 获取所有邮件
GET /api/mailbox?status=sent&limit=10 → { mails, total }

// 创建邮件（草稿或定时发送）
POST /api/mailbox
{ title, content, scheduleSendAt } → { mail, success }

// 更新邮件
PUT /api/mailbox/:id
{ title, content, scheduleSendAt } → { mail, success }

// 发送邮件
POST /api/mailbox/:id/send → { success, id }

// 删除邮件
DELETE /api/mailbox/:id → { success }

// 搜索邮件
GET /api/mailbox/search?q=keyword → { mails }
```

### 树洞接口 (TreeHole API)
```javascript
// 获取树洞列表
GET /api/treehole?page=1&limit=20 → { holes, total, page }

// 发布树洞
POST /api/treehole
{ content, images, anonymous } → { hole, success }

// 获取树洞详情
GET /api/treehole/:id → { hole, replies }

// 回复树洞
POST /api/treehole/:id/reply
{ content, images } → { reply, success }

// 点赞树洞
POST /api/treehole/:id/like → { likes, success }

// 删除树洞
DELETE /api/treehole/:id → { success }
```

### 日历接口 (Calendar API)
```javascript
// 获取用户的日历事件
GET /api/calendar/:year/:month → { events }

// 创建日历事件
POST /api/calendar
{ date, type, title, description, color } → { event, success }

// 更新事件
PUT /api/calendar/:id
{ title, description, completed } → { event, success }

// 删除事件
DELETE /api/calendar/:id → { success }

// 获取聚合数据
GET /api/calendar/stats/:year/:month → { stats }
```

### 用户数据接口 (User Data API)
```javascript
// 获取用户等级和经验
GET /api/user/level → { level, exp, nextLevelExp }

// 获取用户技能树
GET /api/user/skills → { skills, unlockedAchievements }

// 增加经验值
POST /api/user/addExp
{ action, amount } → { newExp, levelUp, success }

// 获取用户统计数据
GET /api/user/stats → { stats }

// 更新用户状态
PUT /api/user/status
{ status, lastActiveAt } → { success }
```

### 聊天接口 (Chat API)
```javascript
// WebSocket连接
WS /api/chat → { connected, onlineCount }

// 获取在线人数
GET /api/chat/online → { count, users }

// 发送消息
POST /api/chat/message
{ content, type } → { success }

// 获取消息历史
GET /api/chat/history?limit=50 → { messages }

// 获取当前用户信息
GET /api/chat/user → { user }
```

### 游戏接口 (Game API)
```javascript
// 获取游戏列表
GET /api/games → { games }

// 获取游戏进度
GET /api/games/:gameId → { game, progress }

// 提交游戏分数
POST /api/games/:gameId/score
{ score, level } → { newScore, achievement, success }

// 获取游戏排行榜
GET /api/games/:gameId/leaderboard → { rankings }

// 获取成就列表
GET /api/user/achievements → { achievements }
```

### 推送接口 (Push Notification API)
```javascript
// 获取推送设置
GET /api/notifications/settings → { settings }

// 更新推送设置
PUT /api/notifications/settings
{ reminders, birthdays, dailyMsg } → { success }

// 获取推送历史
GET /api/notifications/history → { notifications }
```

## 🎨 UI 组件规划

### 全局组件
- HeaderNav - 导航栏（已有）
- SidebarNav - 侧边栏导航
- ThemeToggle - 主题切换（已有）
- UserPanel - 用户面板
- NotificationCenter - 通知中心

### 功能组件
- DatePicker - 日期选择器
- TimeSelector - 时间选择器（用于邮局定时）
- ImageUploader - 图片上传
- Calendar - 日历组件
- SkillTree - 技能树
- ProgressBar - 进度条
- AchievementBadge - 成就徽章
- LevelIndicator - 等级指示器

### 页面特定组件
- MailEditor - 邮件编辑器
- TreeHoleCard - 树洞卡片
- ChatMessage - 聊天消息
- GameCard - 游戏卡片
- FarmArea - 农场交互区域
- SeasonalWeather - 季节天气组件

## 🗂️ 页面流程

### 1. 开始页面流程 (Start Page)
```
用户访问 → 检查登录状态
  ├─ 未登录 → 显示开始页面
  │   ├─ 登录按钮 → 跳转登录
  │   ├─ 注册按钮 → 跳转注册
  │   └─ 浏览按钮 → 进入特性展示
  └─ 已登录 → 直接跳转仪表板
```

### 2. 特性展示流程 (Feature Page)
```
展示核心功能卡片
  ├─ 时间邮局卡片 → 点击查看详情
  ├─ 树洞卡片 → 点击查看详情
  ├─ 日历卡片 → 点击查看详情
  ├─ 聊天卡片 → 点击查看详情
  └─ 游戏卡片 → 点击查看详情

底部CTA按钮
  └─ 立即开始 → 登录/注册
```

### 3. 用户认证流程 (Auth Flow)
```
用户点击登录 → 显示登录模态框
  ├─ 输入邮箱密码
  ├─ 验证
  ├─ 成功 → 跳转仪表板，显示欢迎动画
  └─ 失败 → 显示错误提示

或

用户点击注册 → 显示注册模态框
  ├─ 输入用户名、邮箱、密码
  ├─ 验证
  ├─ 成功 → 创建用户，跳转仪表板
  └─ 失败 → 显示错误提示
```

### 4. 仪表板流程 (Dashboard)
```
仪表板/主页
  ├─ 顶部：用户卡片，显示等级、经验条、当前在线状态
  ├─ 主区域：
  │  ├─ 快速访问卡片
  │  │  ├─ 写邮件
  │  │  ├─ 发树洞
  │  │  ├─ 打开日历
  │  │  ├─ 进入聊天室
  │  │  └─ 玩游戏
  │  ├─ 日历预览
  │  │ └─ 显示本月目标和提醒
  │  └─ 最近活动
  │     └─ 显示最近发送的邮件、树洞等
  └─ 底部：农场交互区（反映用户活跃度）
```

## 🎬 用户交互流程示例

### 时间邮局流程
```
用户点击"写邮件" 
  → 打开邮件编辑器
  → 输入标题、内容
  → 选择发送方式（立即/定时）
  → 如果定时，选择日期和时间
  → 点击预览
  → 确认发送
  → 显示成功提示 + 获得经验值
```

### 互动树洞流程
```
用户点击"发表" 
  → 打开树洞编辑器
  → 输入内容
  → 可选上传图片
  → 选择是否匿名
  → 点击发送
  → 显示成功提示 + 获得经验值
  → 树洞出现在列表中
```

## ⏰ 时间感应系统

### 日间主题（6:00 - 18:00）
- 色系：明亮、温暖
- 背景：白色、浅蓝
- 文字：深色

### 夜间主题（18:00 - 6:00）
- 色系：深色、柔和
- 背景：深紫黑、深蓝
- 文字：浅色

### 季节变化
```
春季（3-5月）：樱花粉
夏季（6-8月）：清爽蓝
秋季（9-11月）：温暖橙
冬季（12-2月）：冰冷银
```

## 📊 等级与权限系统

### 等级划分
```
Lv.1-5:    新手村   - 解锁基础功能
Lv.6-10:   学徒     - 解锁树洞附件、聊天室
Lv.11-20:  探索者   - 解锁自定义日历、游戏
Lv.21-30:  大师     - 解锁所有高级功能
```

### 权限矩阵
```
Lv:        邮局  树洞  日历  聊天  游戏  推送
Lv.1-5:    ✓     ✓     基础  ✗     ✗     ✗
Lv.6-10:   ✓     ✓+附件 ✓    ✓     ✓     ✓
Lv.11-20:  ✓     ✓+附件 ✓自定义 ✓    ✓    ✓
Lv.21-30:  ✓+高级 ✓+高级 ✓高级  ✓VIP  ✓   ✓+高级
```

## 🎮 小游戏设计

### 1. 养成小农场
- 用户活跃度 → 农作物生长
- 日登录 → 浇水
- 发送邮件 → 施肥
- 完成目标 → 丰收

### 2. 心情拼图
- 每日获得拼图块
- 根据树洞发布频率获得
- 完成拼图获得成就

### 3. 季节任务
- 春：收集花束
- 夏：清凉大冒险
- 秋：丰收祭
- 冬：雪花收集

## 🔔 推送系统

### 触发条件
1. **每日早报**（8:00） - "早起的太阳"
2. **阅读提醒**（12:00） - "午间读书"
3. **晚安提醒**（22:00） - "晚安，记录今天"
4. **生日祝福**（生日当天 8:00）
5. **等级升级** - 即时推送
6. **有人回复树洞** - 即时推送

---

**下一步**：开始实现各个页面和组件
