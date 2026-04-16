# 📚 可展开博客卡片系统使用指南

## ✨ 功能概览

这是一个完整的原神风格博客展示系统，具有以下特性：

### 核心功能特性

✅ **平滑形变动画** - 使用 Framer Motion 的 `layoutId` 实现卡片从列表态到详情态的无缝过渡
✅ **动态模态框** - 详情内容在当前页面以模态框形式展开
✅ **高斯模糊背景** - 使用 `backdrop-blur-lg` 创建沉浸式UI体验
✅ **原神主题样式** - 毛玻璃特效、深邃夜空蓝和淡金色配色
✅ **Markdown 支持** - 自动将 Markdown 内容转换为 HTML 并渲染
✅ **响应式设计** - 完美适配各种屏幕尺寸

---

## 📁 文件结构

```
src/
├── components/
│   └── BlogCardExpandable.tsx      # ✨ 核心组件
├── pages/
│   └── blog.astro                  # 博客列表页面
├── content/
│   └── blog/                       # 博客 Markdown 文件
│       ├── astro-react.md
│       ├── framer-motion-guide.md
│       └── tailwind-glassmorphism.md
└── styles/
    └── globals.css                 # 原神主题样式
```

---

## 🔧 核心组件：BlogCardExpandable

### 组件位置

```
src/components/BlogCardExpandable.tsx
```

### Props 接口

```typescript
interface BlogCardExpandableProps {
  title: string; // 博客标题
  date: Date; // 发布日期
  tags: string[]; // 标签数组
  coverImage?: string; // 封面图 URL（可选）
  slug: string; // 文章唯一标识符
  excerpt: string; // 文章摘要（前 150 字符）
  content: string; // 完整 HTML 内容
}
```

### 使用示例

```astro
---
import BlogCardExpandable from '../components/BlogCardExpandable';

const post = {
  title: "我的文章",
  date: new Date("2024-04-14"),
  tags: ["astro", "react"],
  coverImage: "https://example.com/image.jpg",
  slug: "my-article",
  excerpt: "文章摘要...",
  content: "<h2>标题</h2><p>内容...</p>"
};
---

<BlogCardExpandable
  client:load
  {...post}
/>
```

### 关键特性

#### 1. 列表态卡片

- 显示标题、日期、标签
- 支持封面图展示
- 鼠标悬停时浮起动画
- 点击时展开详情

#### 2. 模态框详情态

- 背后高斯模糊遮罩（黑色半透明）
- 完整的 Framer Motion 过渡动画
- 响应式布局，适配多屏幕

#### 3. 关闭交互

- 点击背景遮罩关闭
- 点击右上角 ✕ 按钮关闭
- 平滑缩小回到原卡片位置

---

## 📄 Astro 页面集成

### 页面位置

```
src/pages/blog.astro
```

### 核心逻辑

**1. 数据获取与转换**

```astro
---
import { getCollection } from 'astro:content';
import { marked } from 'marked';

const blogPosts = await getCollection('blog');

const postsWithContent = blogPosts.map((post) => {
  const body = post.body.replace(/^---[\s\S]*?---\s*/, '');
  const html = marked(body);  // Markdown → HTML
  return { ...post, html };
});
---
```

**2. 组件调用**

```astro
{postsWithContent.map((post) => (
  <BlogCardExpandable
    client:load
    title={post.data.title}
    date={post.data.date}
    tags={post.data.tags}
    coverImage={post.data.coverImage}
    slug={post.slug}
    excerpt={post.excerpt}
    content={post.html}
  />
))}
```

---

## 🎨 动画实现详解

### 使用的 Framer Motion API

#### layoutId - 共享布局动画

```typescript
layoutId={`blog-card-${slug}`}
```

为卡片容器分配 layoutId，使其在展开/收缩时能平滑过渡。

#### AnimatePresence - 动画生命周期

```typescript
<AnimatePresence>
  {isExpanded && (
    <>
      {/* 模态框内容 */}
    </>
  )}
</AnimatePresence>
```

在组件挂载/卸载时控制动画。

#### Motion 变体

```typescript
initial={{ opacity: 0, scale: 0.8 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.8 }}
transition={{ type: 'spring', damping: 25, stiffness: 300 }}
```

- **initial**: 初始状态（不可见、缩小）
- **animate**: 目标状态（可见、正常大小）
- **exit**: 退出动画（消失、缩小）
- **transition**: 使用弹簧动画获得流畅效果

### 分层动画效果

| 元素     | layoutId               | 作用         |
| -------- | ---------------------- | ------------ |
| 卡片容器 | `blog-card-${slug}`    | 控制整体形变 |
| 标题     | `blog-title-${slug}`   | 独立标题动画 |
| 封面图   | `blog-cover-${slug}`   | 图片平滑缩放 |
| 摘要     | `blog-excerpt-${slug}` | 文本过渡     |

---

## 🎯 原神 UI 样式

### 颜色配置

```typescript
// tailwind.config.mjs
colors: {
  'genshin-dark': '#0c1220',    // 深邃夜空蓝
  'genshin-gold': '#ece5d8',    // 淡金色
  'genshin-accent': '#b8936d',  // 暖金色
  'genshin-purple': '#7b68ee',  // 深紫色
}
```

### 毛玻璃效果

```html
<!-- 基础毛玻璃 -->
<div class="glassmorphism">半透明背景 + 背景模糊 + 金色边框</div>

<!-- 卡片（标准版） -->
<div class="glass-card">标准卡片样式</div>

<!-- 卡片（金色版） -->
<div class="glass-card-gold">金色版本卡片</div>
```

### 高斯模糊背景

```typescript
// 在 React 中
<motion.div
  className="fixed inset-0 bg-black/60 backdrop-blur-lg z-40"
/>
```

效果：

- `bg-black/60` - 60% 不透明度的黑色
- `backdrop-blur-lg` - 大型高斯模糊（10px）
- `z-40` - 分层在卡片下方

---

## 📝 创建新博客文章

### 步骤 1: 创建 Markdown 文件

在 `src/content/blog/` 下创建文件：

```markdown
---
title: "我的第一篇博客"
date: "2024-04-14"
tags: ["web", "astro", "design"]
coverImage: "https://example.com/cover.jpg"
---

# 文章标题

这是文章的正文内容...

## 小标题

更多文本...
```

### 步骤 2: 访问页面

文章会自动出现在：

```
http://localhost:4322/blog
```

### 注意事项

- ✅ 日期格式：`YYYY-MM-DD`（用引号包裹）
- ✅ 标签格式：字符串数组
- ✅ 文件名使用 kebab-case（如 `my-article.md`）
- ✅ Markdown 内容会自动转换为 HTML

---

## 🔒 HTML 安全渲染

在 React 组件中使用 `dangerouslySetInnerHTML` 渲染 HTML 内容：

```typescript
<div
  className="genshin-text text-lg leading-relaxed"
  dangerouslySetInnerHTML={{
    __html: content,  // marked 生成的 HTML 字符串
  }}
/>
```

**为什么安全？**

1. `marked` 已默认限制危险的 HTML 标签
2. Markdown 源文件由开发者控制，不是用户输入
3. 可进一步配置 marked 的选项来增强安全性

---

## 💡 性能优化

### 1. Lazy Loading

```astro
<BlogCardExpandable
  client:load   {/* 组件加载时初始化 */}
  {...props}
/>
```

### 2. 批处理数据转换

```typescript
// 所有 Markdown 在服务器端转换，不在浏览器进行
const postsWithContent = blogPosts.map((post) => {
  const html = marked(post.body); // 服务端 ✅
  return { ...post, html };
});
```

### 3. layoutId 优化

使用 `layoutId` 而非 `key` 结合动画，减少重排。

---

## 🎯 推荐的扩展

### 1. 添加评论系统

```typescript
// 在模态框底部添加
<CommentSection slug={slug} />
```

### 2. 实现分享功能

```typescript
// 页脚按钮
<button onClick={() => shareArticle(slug)}>
  分享文章
</button>
```

### 3. 阅读进度指示

```typescript
// 模态框顶部
<div className="h-1 bg-genshin-gold w-full"
     style={{ width: `${scrollProgress}%` }} />
```

### 4. 文章目录（TOC）

```typescript
// 从 HTML 中提取标题，生成目录
const generateTOC = (html) => {
  // 实现逻辑
};
```

### 5. 相关文章推荐

```typescript
interface BlogCardExpandableProps extends CommonProps {
  relatedArticles?: RelatedArticle[];
}
```

---

## 🚨 常见问题

### Q: 模态框不显示？

A: 确保：

1. React 组件使用了 `client:load` 指令
2. `isExpanded` 状态正确更新
3. `AnimatePresence` 被正确导入

### Q: HTML 内容显示为纯文本？

A: 检查：

1. `dangerouslySetInnerHTML` 的 `__html` 属性
2. `marked()` 是否正确转换了 Markdown
3. CSS 类是否正确应用

### Q: 动画不流畅？

A: 调整：

1. `transition` 的 `damping` 和 `stiffness`
2. 初始屏幕尺寸
3. 浏览器硬件加速设置

### Q: 移动端显示异常？

A: 使用响应式类：

```html
<div class="p-4 md:p-6 lg:p-8">响应式内边距</div>
```

---

## 📚 关键依赖

```json
{
  "framer-motion": "^11.0.0",
  "marked": "^11.0.0",
  "react": "^18.3.1",
  "astro": "^5.0.0"
}
```

---

## 🔗 相关资源

- [Framer Motion 文档](https://www.framer.com/motion/)
- [marked 中文文档](https://marked.js.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)

---

## 📋 检验清单

- [ ] 创建了新的博客文件
- [ ] Frontmatter 格式正确
- [ ] 访问 `/blog` 页面看到文章
- [ ] 点击卡片展开详情
- [ ] 关闭按钮工作正常
- [ ] 动画流畅无卡顿
- [ ] 移动端响应正确

---

**🎉 系统已就绪，开始写文章吧！**

访问：http://localhost:4322/blog
