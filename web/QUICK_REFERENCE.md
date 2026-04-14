# 🎨 原神 UI 主题快速参考

## 已完成的配置

✅ **Tailwind 自定义配置** (`tailwind.config.mjs`)

- 4 个自定义颜色
- 3 个动画定义
- 2 个自定义阴影
- 响应式设计支持

✅ **全局样式系统** (`src/styles/globals.css`)

- 星空背景动画
- 9 个 Glassmorphism 组件类
- 文字样式类
- 效果类库

✅ **主题 Layout** (`src/layouts/Layout.astro`)

- 星空背景集成
- 深色主题
- 可配置背景显示

✅ **演示组件**

- `GenshinCard.tsx` - 毛玻璃卡片
- `GlassButton.tsx` - 玻璃按钮

✅ **示例页面**

- `src/pages/genshin-theme.astro` - 完整展示

---

## 核心类名速查

### 颜色

```
text-genshin-gold        淡金色
text-genshin-accent      暖金色
bg-genshin-dark          深邃夜空蓝
border-genshin-gold      金色边框
```

### 毛玻璃效果

```
glassmorphism            基础毛玻璃
glass-card              标准卡片
glass-card-gold         金色卡片
glass-button            按钮
glass-input             输入框
glass-panel             面板
```

### 文字

```
genshin-title           标题（粗体、宽行距）
genshin-text            普通文字
genshin-accent          强调色
text-genshin-gradient   渐变文字（金色）
```

### 效果

```
genshin-glow            发光效果
genshin-inset           3D 内置阴影
```

### 动画

```
animate-twinkle         闪烁（3s 循环）
animate-float           浮动（6s 循环）
```

---

## 页面访问

| 页面         | URL                                 | 说明           |
| ------------ | ----------------------------------- | -------------- |
| 原神主题展示 | http://localhost:4322/genshin-theme | 完整的界面演示 |
| 首页（原始） | http://localhost:4322/              | 项目初始首页   |

---

## 常用模式

### 简单卡片

```astro
<div class="glass-card">
  <h3 class="text-genshin-gradient">标题</h3>
  <p class="genshin-text">内容</p>
</div>
```

### 响应式网格

```astro
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- 卡片 -->
</div>
```

### 带按钮的面板

```astro
<div class="glass-panel">
  <h2 class="text-genshin-gradient mb-6">标题</h2>
  <p class="genshin-text mb-6">内容</p>
  <button class="glass-button">操作</button>
</div>
```

### React 动画组件

```tsx
<GenshinCard title="标题" delay={0}>
  这是卡片内容
</GenshinCard>
```

---

## 文件结构

```
web/
├── src/
│   ├── components/
│   │   ├── AnimatedBox.tsx           (原始示例)
│   │   ├── GenshinCard.tsx          ✨ 毛玻璃卡片
│   │   └── GlassButton.tsx          ✨ 玻璃按钮
│   ├── layouts/
│   │   └── Layout.astro             ✨ 星空主题
│   ├── pages/
│   │   ├── index.astro              (原始首页)
│   │   └── genshin-theme.astro      ✨ 展示页面
│   ├── styles/
│   │   └── globals.css              ✨ 全局样式
│   └── content/
├── tailwind.config.mjs              ✨ 主题配置
└── GENSHIN_UI_GUIDE.md             📖 完整指南
```

---

## 下一步建议

1. **编辑首页**：装饰 `index.astro` 使用新的样式
2. **创建页面**：在 `src/pages/` 下创建新页面
3. **构建组件**：在 `src/components/` 下创建更多 React 组件
4. **添加内容**：在 `src/content/` 下管理 Markdown 内容
5. **自定义颜色**：编辑 `tailwind.config.mjs` 调整主题

---

**🚀 项目已就绪，开始构建您的原神风格网站吧！**
