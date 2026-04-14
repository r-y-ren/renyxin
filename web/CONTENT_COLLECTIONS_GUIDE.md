# Astro 内容集合配置指南

## 概述

项目已配置了两个 Astro Content Collections，用于管理 Markdown 驱动的内容：

1. **Blog** - 博客文章集合
2. **Achievements** - 成就集合

---

## 配置文件

### `src/content/config.ts`

这个文件定义了两个集合的 Schema：

```typescript
import { defineCollection, z } from 'astro:content';

// Blog 集合
const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),                    // 必需：文章标题
    date: z.coerce.date(),               // 必需：发布日期
    tags: z.array(z.string()).default([]); // 可选：标签数组
    coverImage: z.string().optional();   // 可选：封面图URL
  }),
});

// Achievements 集合
const achievementsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),           // 必需：成就标题
    date: z.coerce.date(),      // 必需：获得日期
    category: z.string(),        // 必需：分类
    icon: z.string().optional(); // 可选：emoji或图标
  }),
});

export const collections = {
  blog: blogCollection,
  achievements: achievementsCollection,
};
```

---

## 集合结构

```
src/content/
├── config.ts                    # Schema 定义
├── blog/                         # Blog 集合
│   ├── astro-react.md
│   ├── framer-motion-guide.md
│   └── tailwind-glassmorphism.md
└── achievements/                 # Achievements 集合
    ├── astro-certification.md
    ├── first-open-source.md
    └── tech-talk.md
```

---

## Blog 集合

### Frontmatter Schema

```yaml
---
title: "文章标题" # 字符串，必需
date: "2024-04-14" # 日期（YYYY-MM-DD格式），必需
tags: ["标签1", "标签2"] # 字符串数组，可选（默认为空数组）
coverImage: "图片URL" # 字符串，可选
---
```

### 创建新文章示例

创建文件：`src/content/blog/my-article.md`

```markdown
---
title: "我的第一篇文章"
date: "2024-04-14"
tags: ["web", "development", "astro"]
coverImage: "https://example.com/image.jpg"
---

这是文章的内容。

## 第一部分

内容...

## 第二部分

内容...
```

### 文件名规则

- 使用 kebab-case（用连字符分隔）
- 例如：`my-awesome-article.md`、`web-development-guide.md`

---

## Achievements 集合

### Frontmatter Schema

```yaml
---
title: "成就标题" # 字符串，必需
date: "2024-04-14" # 日期（YYYY-MM-DD格式），必需
category: "分类" # 字符串，必需（如：certification, project, speaking）
icon: "🏆" # emoji，可选
---
```

### 创建新成就示例

创建文件：`src/content/achievements/my-achievement.md`

```markdown
---
title: "获得 AWS 认证"
date: "2024-04-14"
category: "certification"
icon: "🎓"
---

成功通过了 AWS Solutions Architect 考试！

## 学到的知识

- EC2、S3 等核心服务
- 高可用性架构设计
- 成本优化策略
```

---

## 在页面中使用集合

### 获取所有条目

```astro
---
import { getCollection } from 'astro:content';

// 获取所有博客文章
const allPosts = await getCollection('blog');

// 获取所有成就
const allAchievements = await getCollection('achievements');

// 排序
const sortedPosts = allPosts.sort((a, b) =>
  new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
);
---
```

### 过滤条目

```astro
---
import { getCollection } from 'astro:content';

const allPosts = await getCollection('blog');

// 按标签过滤
const astroArticles = allPosts.filter(post =>
  post.data.tags.includes('astro')
);

// 按日期范围过滤
const recentPosts = allPosts.filter(post => {
  const postDate = new Date(post.data.date);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return postDate > thirtyDaysAgo;
});
---
```

### 获取单个条目

```astro
---
import { getEntryBySlug } from 'astro:content';

// 获取特定文章
const post = await getEntryBySlug('blog', 'astro-react');

// 渲染内容
const { Content } = await post.render();
---

<h1>{post.data.title}</h1>
<Content />
```

### 渲染集合内容

```astro
---
import { getCollection } from 'astro:content';
import { render } from 'astro:content';

const posts = await getCollection('blog');
---

{posts.map(async (post) => {
  const { Content } = await render(post);
  return (
    <article>
      <h2>{post.data.title}</h2>
      <time>{post.data.date.toLocaleDateString()}</time>
      <Content />
    </article>
  );
})}
```

---

## 测试页面

### 页面位置

访问：`http://localhost:4322/content-test`

[查看文件：src/pages/content-test.astro](src/pages/content-test.astro)

### 页面功能

- ✅ 显示所有博客文章列表
- ✅ 显示所有成就列表
- ✅ 验证数据流和 Schema
- ✅ 展示正确的日期格式化
- ✅ 展示标签和分类

---

## 高级用法

### 动态路由

创建文件：`src/pages/blog/[...slug].astro`

```astro
---
import { getCollection, getEntryBySlug } from 'astro:content';
import Layout from '../../layouts/Layout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map(post => ({
    params: { slug: post.slug },
    props: { post }
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();
---

<Layout title={post.data.title}>
  <article>
    <h1>{post.data.title}</h1>
    <time>{post.data.date.toLocaleDateString('zh-CN')}</time>
    <Content />
  </article>
</Layout>
```

### 生成 RSS 源

```astro
---
import { getCollection } from 'astro:content';

const blog = await getCollection('blog');

export const get = () => {
  return new Response(
    generateRSS(blog),
    {
      headers: { 'Content-Type': 'application/rss+xml' }
    }
  );
};
```

---

## 日期处理

### 支持的日期格式

- ISO 格式：`"2024-04-14"` ✅ 推荐
- 完整日期：`"2024-04-14T10:30:00"` ✅
- JavaScript Date: `new Date()` ✅

### 日期操作示例

```typescript
// 获取日期对象
const postDate: Date = post.data.date;

// 格式化为字符串
const formatted = postDate.toLocaleDateString("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// 比较日期
const isPublished = postDate <= new Date();
```

---

## Frontmatter 最佳实践

### ✅ 正确做法

```yaml
---
title: "最佳实践"
date: "2024-04-14"
tags: ["tag1", "tag2"]
---
```

### ❌ 错误做法

```yaml
---
title: "最佳实践"
date: 2024-04-14 # 应该加引号
tags: tag1, tag2 # 应该用数组格式
---
```

---

## 常见问题

### Q: 页面显示不出数据？

A: 检查以下几点：

1. Frontmatter 格式是否正确（检查缩进和引号）
2. 日期是否为 `YYYY-MM-DD` 格式
3. 是否已保存文件
4. 是否重启了开发服务器

### Q: 如何按日期排序？

A:

```javascript
const sorted = collection.sort(
  (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime(),
);
```

### Q: 能否在 Markdown 中使用变量？

A: 可以！使用 `.mdx` 文件格式而不是 `.md`，然后可以使用 JSX。

### Q: 如何验证集合配置？

A: 运行 `npm run build` 或检查开发服务器输出中是否有错误。

---

## 文件清单

| 文件                            | 说明             |
| ------------------------------- | ---------------- |
| `src/content/config.ts`         | 集合 Schema 定义 |
| `src/content/blog/*.md`         | 博客文章         |
| `src/content/achievements/*.md` | 成就记录         |
| `src/pages/content-test.astro`  | 测试页面         |

---

## 下一步

1. ✅ 创建更多博客文章和成就
2. ✅ 创建详情页面使用 `getEntryBySlug()`
3. ✅ 构建博客列表页面
4. ✅ 添加搜索和过滤功能
5. ✅ 配置 RSS 源（可选）

---

**Happy blogging! 📝✨**
