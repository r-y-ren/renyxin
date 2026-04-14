# 原神风格 UI 主题使用指南

## 概述

这个项目配置了一套完整的二次元/原神风格的 UI 设计系统，包含：

- **主题色系**：深邃夜空蓝 (#0c1220) + 淡金色 (#ece5d8)
- **毛玻璃特效**：Glassmorphism 设计模式
- **星空背景**：动态星空动画效果
- **动画系统**：基于 Framer Motion 的交互动画

---

## 颜色系统

### 主色调

```css
@apply text-genshin-dark       /* 深邃夜空蓝 #0c1220 */
@apply text-genshin-gold       /* 淡金色 #ece5d8 */
@apply text-genshin-accent     /* 暖金色 #b8936d */
@apply text-genshin-purple; /* 深紫色 #7b68ee */
```

### 用法示例

```astro
<p class="text-genshin-gold">淡金色文字</p>
<div class="bg-genshin-dark">深邃夜空蓝背景</div>
```

---

## 毛玻璃组件库

### 1. 基础毛玻璃效果

```html
<div class="glassmorphism">半透明背景 + 背景模糊 + 金色边框</div>
```

### 2. 玻璃卡片（标准版）

```html
<div class="glass-card">
  <h3>卡片标题</h3>
  <p>卡片内容</p>
</div>
```

**特点**：

- 半透明白色背景（white/10）
- 10px 背景模糊
- 金色半透明边框（genshin-gold/30）
- 悬停时发光效果
- 圆角 lg + 内边距

### 3. 玻璃卡片（金色版）

```html
<div class="glass-card-gold">
  <h3>金色卡片</h3>
  <p>更华丽的版本</p>
</div>
```

**特点**：

- 渐变背景（from-white/5 to-white/0）
- 更强的金色边框（genshin-gold/40）
- 增强的发光阴影

### 4. 玻璃按钮

```html
<button class="glass-button">点击我</button>
<button class="glass-button hover:bg-white/20">可交互按钮</button>
```

### 5. 玻璃输入框

```html
<input type="text" class="glass-input" placeholder="输入内容..." />
```

### 6. 玻璃面板

```html
<div class="glass-panel">
  <h2>面板标题</h2>
  <p>面板内容</p>
</div>
```

**特点**：

- 增强的背景模糊和透明度
- 强发光效果（genshin-glow）
- 更大的圆角和内边距

---

## 文字和颜色类

### 文字样式

```html
<!-- 原神风格标题 -->
<h1 class="genshin-title">大标题</h1>

<!-- 原神风格文字 -->
<p class="genshin-text">普通文字</p>

<!-- 金色强调 -->
<span class="genshin-accent">强调部分</span>

<!-- 渐变文字（深蓝到金色） -->
<h2 class="text-genshin-gradient">渐变标题</h2>
```

### 效果类

```html
<!-- 发光效果 -->
<div class="genshin-glow">会发光的元素</div>

<!-- 3D 内置阴影 -->
<div class="genshin-inset">3D 效果</div>
```

---

## 动画和过渡

### Tailwind 自带动画

```html
<!-- 闪烁动画 -->
<span class="animate-twinkle">闪烁效果</span>

<!-- 浮动动画 -->
<div class="animate-float">浮动效果</div>
```

### React 组件中使用 Framer Motion

```tsx
import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  动画内容
</motion.div>;
```

---

## 星空背景

### 在 Layout 中启用

```astro
<Layout title="页面标题" showStarfield={true}>
  <!-- 内容会显示在星空背景之上 -->
</Layout>
```

### 自定义星空背景

如需调整星空效果，编辑 `src/styles/globals.css` 中的 `.starfield-bg` 部分。

---

## 实战示例

### 响应式卡片网格

```astro
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <div class="glass-card">
    <h3 class="text-genshin-gradient">卡片1</h3>
    <p class="genshin-text">内容</p>
  </div>

  <div class="glass-card-gold">
    <h3 class="text-genshin-gradient">卡片2</h3>
    <p class="genshin-text">内容</p>
  </div>
</div>
```

### 按钮组合

```astro
<div class="flex gap-4">
  <button class="glass-button">取消</button>
  <button class="glass-button hover:from-genshin-gold/30 hover:to-genshin-accent/30">
    确认
  </button>
</div>
```

### 信息面板

```astro
<div class="glass-panel">
  <h2 class="text-genshin-gradient mb-4">系统提示</h2>
  <p class="genshin-text mb-4">这是一条重要消息</p>
  <button class="glass-button">了解了</button>
</div>
```

---

## 响应式设计

所有组件都支持 Tailwind CSS 的响应式前缀：

```html
<div class="glass-card p-4 md:p-6 lg:p-8">响应式内边距</div>
```

---

## 深色/浅色模式

主布局已配置为深色主题，所有颜色都针对深色背景进行了优化。

---

## 常见用法

### 导航栏

```astro
<nav class="glass-panel fixed top-0 w-full">
  <div class="flex justify-between items-center px-6 py-4">
    <h1 class="text-genshin-gradient">Logo</h1>
    <ul class="flex gap-6">
      <li><a href="#" class="genshin-text hover:text-genshin-gold">首页</a></li>
      <li><a href="#" class="genshin-text hover:text-genshin-gold">功能</a></li>
    </ul>
  </div>
</nav>
```

### 页脚

```astro
<footer class="glass-panel mt-20 py-10">
  <div class="text-center genshin-text/60">
    <p>&copy; 2026 Your Project. All rights reserved.</p>
  </div>
</footer>
```

---

## 自定义扩展

### 添加新颜色

在 `tailwind.config.mjs` 中扩展 `colors` 对象：

```js
colors: {
  'custom-color': '#123456',
}
```

### 添加新动画

```js
keyframes: {
  'custom-animation': {
    '0%': { transform: 'translateX(0)' },
    '100%': { transform: 'translateX(100px)' },
  }
}
```

---

## 文件位置

- **配置文件**：`tailwind.config.mjs`
- **全局样式**：`src/styles/globals.css`
- **主 Layout**：`src/layouts/Layout.astro`
- **示例页面**：`src/pages/genshin-theme.astro`
- **组件示例**：`src/components/`

---

**开始使用吧！🎨✨**
