# 🎬 可展开博客系统快速参考

## 🚀 访问链接

| 页面             | URL                                 |
| ---------------- | ----------------------------------- |
| **博客列表**     | http://localhost:4322/blog          |
| **原神主题演示** | http://localhost:4322/genshin-theme |
| **内容测试**     | http://localhost:4322/content-test  |

---

## 📂 核心文件

| 文件                       | 功能               | 位置              |
| -------------------------- | ------------------ | ----------------- |
| **BlogCardExpandable.tsx** | ✨ 可展开卡片组件  | `src/components/` |
| **blog.astro**             | 📄 博客列表页面    | `src/pages/`      |
| **marked**                 | 📝 Markdown → HTML | npm 依赖          |
| **globals.css**            | 🎨 原神主题样式    | `src/styles/`     |

---

## 🔧 核心技术栈

```
Frontend:
  ├─ Astro 5.18.1       (SSR + Content Collections)
  ├─ React 18           (交互组件)
  ├─ Framer Motion 11   (动画引擎)
  ├─ Tailwind CSS 3     (样式框架)
  └─ marked 11          (Markdown解析)

Animation:
  ├─ layoutId          (共享布局动画)
  ├─ AnimatePresence   (生命周期控制)
  ├─ spring            (弹簧动画)
  └─ backdrop-blur-lg  (高斯模糊)
```

---

## 📊 完整工作流

```
1. 创建 Markdown 文件
   ↓
2. Astro 读取 Content Collection
   ↓
3. marked 转换为 HTML
   ↓
4. 传递给 React 组件
   ↓
5. Framer Motion 渲染动画
   ↓
6. 用户交互展开/关闭
```

---

## 💾 创建博客的 3 步

### Step 1: 创建文件

```bash
src/content/blog/my-article.md
```

### Step 2: 添加 Frontmatter

```yaml
---
title: "标题"
date: "2024-04-14"
tags: ["tag1", "tag2"]
coverImage: "url"
---
```

### Step 3: 编写内容

```markdown
# 标题

正文...
```

**结果**: 自动出现在 /blog

---

## 🎨 组件 Props

```typescript
<BlogCardExpandable
  title="标题"              // string
  date={new Date()}        // Date
  tags={["tag1"]}          // string[]
  coverImage="url"         // string?
  slug="id"                // string
  excerpt="摘要..."        // string
  content="<html>"         // string (HTML)
  client:load              // 必需！
/>
```

---

## 🎬 动画配置

### Framer Motion layoutId

```typescript
const slug = "astro-react";
layoutId={`blog-card-${slug}`}  // 列表态
layoutId={`blog-card-${slug}`}  // 详情态（相同）
```

### 过渡效果

```typescript
transition={{
  type: 'spring',
  damping: 25,        // 阻尼（↓数值=更弹性）
  stiffness: 300      // 刚度（数值越大越快）
}}
```

### 高斯模糊背景

```html
<div class="backdrop-blur-lg bg-black/60" />
<!-- 10px 高斯模糊 + 半透明黑色 -->
```

---

## 🎨 原神配色

| 名称   | 值      | 用途       |
| ------ | ------- | ---------- |
| 夜空蓝 | #0c1220 | 背景       |
| 淡金   | #ece5d8 | 边框、强调 |
| 暖金   | #b8936d | 中间调     |
| 紫色   | #7b68ee | 点缀       |

---

## 🔐 安全渲染 HTML

```typescript
<div dangerouslySetInnerHTML={{ __html: content }} />
```

✅ 安全原因：

- marked 已清理危险标签
- Markdown 由开发者控制
- 非用户生成内容

---

## 📱 响应式断点

```
sm: 640px
md: 768px   ← 主要断点
lg: 1024px
xl: 1280px
```

---

## ⚡ 性能要点

✅ 服务端 Markdown 转换（marked）
✅ layoutId 减少重排
✅ client:load 按需加载
✅ 批量数据处理在 Astro 中

---

## 🐛 调试技巧

```typescript
// React 中查看状态
console.log("isExpanded:", isExpanded);
console.log("content:", content);

// 检查 HTML
console.log("HTML:", post.html);

// 验证 layoutId
console.log("slugId:", `blog-card-${slug}`);
```

---

## 📚 关键 API

### getCollection() - 获取所有文章

```typescript
const posts = await getCollection("blog");
```

### marked() - 转换 Markdown

```typescript
const html = marked(markdownString);
```

### Framer Motion - 动画

```typescript
<motion.div layoutId="unique-id" />
<AnimatePresence>
  {isVisible && <motion.div />}
</AnimatePresence>
```

---

## 🚨 常见错误

| 错误         | 原因                           | 解决           |
| ------------ | ------------------------------ | -------------- |
| 模态框不显示 | 缺少 `client:load`             | 添加到组件调用 |
| 内容为纯文本 | 忘记 `dangerouslySetInnerHTML` | 检查 JSX       |
| 动画卡顿     | layoutId 不一致                | 使用相同 ID    |
| 样式丢失     | Tailwind 类不存在              | 检查配置       |

---

## ✅ 验证清单

- [ ] `/blog` 页面能访问
- [ ] 卡片显示所有 3 篇文章
- [ ] 点击卡片展开模态框
- [ ] 模态框有关闭按钮
- [ ] 动画流畅无闪烁
- [ ] HTML 内容正确呈现
- [ ] 移动端响应正常

---

## 📞 技术支持

查看详细文档：

```
EXPANDABLE_BLOG_GUIDE.md
```

---

**系统状态：✅ 运行正常**

开发服务器：http://localhost:4322/
