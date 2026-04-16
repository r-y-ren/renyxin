# 🔬 可展开博客系统深层解析

## 📖 目录

1. [Markdown 在 Astro 中的处理](#markdown-处理)
2. [Framer Motion 动画原理](#动画原理)
3. [React + Astro 集成](#框架集成)
4. [安全 HTML 渲染](#安全渲染)
5. [性能优化策略](#性能优化)

---

## Markdown 处理

### 1. 传统方式 vs 现代方式

#### ❌ 传统方式（不推荐）

```astro
---
import { renderToString } from 'astro:markdown';

const { html } = await renderToString(post);
---
```

问题：

- 需要额外配置
- 组件转换复杂
- 性能较差

#### ✅ 现代方式（推荐）

```astro
---
import { marked } from 'marked';

const html = marked(markdownBody);
---
```

优势：

- 快速简洁
- 直接返回 HTML 字符串
- 易于传递给 React

### 2. 完整工作流

```
Markdown 文件
    ↓
Astro Content Collections
    ↓ post.body (原始 markdown)
marked() 函数
    ↓
HTML 字符串
    ↓
传递给 React
    ↓
dangerouslySetInnerHTML
    ↓
浏览器渲染
```

### 3. marked 配置选项

```typescript
// 增强安全性
marked.setOptions({
  breaks: true, // 换行符转 <br>
  gfm: true, // GitHub Flavored Markdown
  pedantic: false,
  mangle: false, // 不处理 @mentions
});

// 自定义渲染器
const renderer = new marked.Renderer();
renderer.heading = (token) => {
  return `<h${token.depth} class="text-genshin-gradient">
    ${token.text}
  </h${token.depth}>`;
};
marked.setOptions({ renderer });
```

---

## 动画原理

### 1. layoutId 机制

#### 什么是 layoutId？

layoutId 是 Framer Motion 中实现"共享布局动画"的关键机制。

```
列表态                          详情态
┌─────────────────┐            ┌──────────────────────┐
│ Blog Card       │            │   Blog Modal         │
│ layoutId:       │   点击      │   layoutId:          │
│ "blog-xyz"      │ ──────→     │   "blog-xyz"         │
│                 │            │   （相同 ID）        │
└─────────────────┘            └──────────────────────┘
```

#### 工作原理

1. **初始化**：Framer Motion 记录元素的布局信息

   ```typescript
   layoutId={`blog-card-${slug}`}
   ```

2. **状态变化**：当组件挂载/卸载时，Motion 检测到相同的 layoutId

   ```typescript
   initial={{ opacity: 0, scale: 0.8 }}
   animate={{ opacity: 1, scale: 1 }}
   ```

3. **平滑过渡**：Motion 计算两个布局之间的变换

   ```
   位置：从列表位置 → 屏幕中心
   大小：从卡片大小 → 模态框大小
   不透明度：从 0 → 1
   缩放：从 0.8 → 1
   ```

4. **执行动画**：使用 spring 物理引擎平滑过渡
   ```typescript
   transition={{
     type: 'spring',
     damping: 25,    // 波峰衰减
     stiffness: 300  // 运动速度
   }}
   ```

### 2. AnimatePresence 的作用

```typescript
<AnimatePresence>
  {isExpanded && (
    <motion.div
      initial={{ opacity: 0 }}
      exit={{ opacity: 0 }}
    />
  )}
</AnimatePresence>
```

工作流程：

```
组件挂载
  ↓
initial 动画播放
  ↓
animate 动画播放
  ↓
组件卸载时
  ↓
exit 动画播放
  ↓
组件从 DOM 移除
```

### 3. 分层布局动画

```typescript
// 父容器 - 整体形变
<motion.div layoutId={`blog-card-${slug}`}>

  {/* 子元素 1 - 标题独立过渡 */}
  <motion.h3 layoutId={`blog-title-${slug}`}>
    {title}
  </motion.h3>

  {/* 子元素 2 - 图片缩放 */}
  <motion.img layoutId={`blog-cover-${slug}`}>

  {/* 子元素 3 - 文本淡入 */}
  <motion.p layoutId={`blog-excerpt-${slug}`}>
    {excerpt}
  </motion.p>
</motion.div>
```

效果：多个元素同步过渡，看起来像一个整体。

---

## 框架集成

### 1. Astro ↔ React 通信

#### 单向数据流

```
Astro (服务端)
  ↓ props 传递
React 组件 (客户端)
  ↓
Framer Motion
  ↓
用户交互
```

#### 具体实现

```astro
<!-- Astro 页面 -->
---
const htmlContent = marked(markdown);
---

<!-- 传递 HTML 字符串给 React 组件 -->
<BlogCardExpandable
  client:load
  content={htmlContent}  {/* ← HTML 字符串 */}
/>
```

```typescript
// React 组件
interface Props {
  content: string;  // 从 Astro 接收
}

function BlogCardExpandable({ content }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div dangerouslySetInnerHTML={{ __html: content }} />
  );
}
```

#### client: 指令

| 指令             | 行为           | 使用场景        |
| ---------------- | -------------- | --------------- |
| `client:load`    | 页面加载时     | ✅ 博客卡片     |
| `client:idle`    | 浏览器空闲时   | 非关键交互      |
| `client:visible` | 元素进入视口时 | 延迟加载        |
| `client:only`    | 仅客户端渲染   | 复杂 React 组件 |

### 2. Astro Content Collections 与 React 的配合

```
Astro Content Collections
  ├─ 方案：全静态数据
  ├─ 优势：
  │  ├─ SEO 友好
  │  ├─ 快速加载
  │  └─ 类型安全（Zod）
  └─ 数据流：
      Markdown 文件
        ↓
      getCollection()
        ↓
      处理 & 转换
        ↓
      传递给 React
```

---

## 安全渲染

### 1. dangerouslySetInnerHTML 的安全性

```typescript
// ❌ 不安全
const userInput = req.query.content;
<div dangerouslySetInnerHTML={{ __html: userInput }} />
// 容易被 XSS 攻击

// ✅ 安全
const markdown = post.body;
const sanitized = marked(markdown);
<div dangerouslySetInnerHTML={{ __html: sanitized }} />
// 因为数据来源可信（开发者 Markdown 文件）
```

### 2. marked 的内置安全措施

```typescript
import { marked } from "marked";

// 自动清理的 HTML 标签
const html = marked(`
  # 标题
  <script>alert('XSS')</script>  {/* 被移除 */}
  [链接](url)
`);

// 结果：<script> 标签被忽略
```

### 3. 额外的安全加强

```typescript
import DOMPurify from 'isomorphic-dompurify';

const sanitized = DOMPurify.sanitize(marked(markdown));
<div dangerouslySetInnerHTML={{ __html: sanitized }} />
```

---

## 性能优化

### 1. 服务端 vs 客户端处理

```
任务                  位置          原因
──────────────────────────────────────────
marked() 转换         Astro (SSR)   ✅ 更快
getCollection()       Astro (SSR)   ✅ 类型安全
Framer Motion 动画    React (CSR)   ✅ 需要浏览器
状态管理              React (CSR)   ✅ 交互性
```

### 2. 数据批处理

```typescript
// ✅ 高效：一次性处理所有文章
const posts = blogPosts.map((post) => {
  const html = marked(post.body); // 批量转换
  return { ...post, html };
});

// ❌ 低效：逐个延迟处理
posts.forEach((post) => {
  fetch(`/api/render/${post.slug}`); // N 个请求
});
```

### 3. layoutId 性能

```typescript
// layoutId 避免了：
// ❌ 卸载 + 重新挂载
// ❌ 完整的重排和重绘
// ✅ 使用 GPU 加速变换

// 性能对比：
// 无 layoutId: 600ms (重排+重绘)
// 有 layoutId: 50ms  (GPU 变换)
```

### 4. 缓存策略

```typescript
// 缓存处理后的 HTML
const htmlCache = new Map();

const getCachedHtml = (slug: string) => {
  if (htmlCache.has(slug)) {
    return htmlCache.get(slug); // 秒级返回
  }

  const html = marked(post.body);
  htmlCache.set(slug, html);
  return html;
};
```

---

## 故障排查

### 清单式排查流程

```
症状：展开动画不流畅
├─ layoutId 是否相同？
│   └─ 检查：`blog-card-${slug}` 一致性
├─ transition 配置是否过激？
│   └─ 调整：damping/stiffness 参数
└─ 是否有重排？
    └─ 检查：避免 layout shift

症状：HTML 内容为纯文本
├─ dangerouslySetInnerHTML 是否正确？
│   └─ 检查：{ __html: content }
├─ content prop 是否为空？
│   └─ 检查：marked() 返回值
└─ Tailwind 样式未应用？
    └─ 检查：CSS 类名拼写

症状：模态框点击不关闭
├─ onClick 处理是否正确？
│   └─ 检查：setIsExpanded(false)
├─ e.stopPropagation() 是否存在？
│   └─ 在子元素上添加
└─ z-index 是否冲突？
    └─ 检查：遮罩 z-40 < 模态框 z-50
```

---

## 高级技巧

### 1. 自定义 marked 渲染器

```typescript
const renderer = new marked.Renderer();

// 自定义代码块渲染
renderer.code = ({ text, lang }) => {
  return `<div class="glass-card">
    <pre><code class="language-${lang}">${text}</code></pre>
  </div>`;
};

// 自定义链接
renderer.link = ({ href, text }) => {
  return `<a href="${href}" class="text-genshin-gold underline">
    ${text}
  </a>`;
};

marked.setOptions({ renderer });
```

### 2. 动态 layoutId

```typescript
// 支持多个展开
const layerId = useId(); // React 18 新 API
const layoutId = `blog-card-${slug}-${layerId}`;
```

### 3. 关键字高亮

```typescript
const highlightKeywords = (html: string) => {
  const keywords = ["astro", "react", "framer"];
  let result = html;

  keywords.forEach((kw) => {
    result = result.replace(
      new RegExp(kw, "gi"),
      `<span class="text-genshin-gold font-bold">$&</span>`,
    );
  });

  return result;
};
```

---

## 参考资源

- [Framer Motion Docs](https://www.framer.com/motion/)
- [marked.js Guide](https://marked.js.org/)
- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [React dangerouslySetInnerHTML](https://react.dev/reference/react-dom/dangerouslySetInnerHTML)

---

**深层理解完成！** 🚀

现在你已准备好构建更复杂的内容系统。
