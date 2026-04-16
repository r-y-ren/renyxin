# 📚 内容集合快速参考卡

## 配置状态：✅ 完成

---

## 集合定义

### Blog Collection

```
Schema:
• title (string) - 必需
• date (date) - 必需，格式 "YYYY-MM-DD"
• tags (array) - 可选
• coverImage (string) - 可选

位置: src/content/blog/
```

### Achievements Collection

```
Schema:
• title (string) - 必需
• date (date) - 必需，格式 "YYYY-MM-DD"
• category (string) - 必需
• icon (string) - 可选 emoji

位置: src/content/achievements/
```

---

## 关键文件

| 文件                           | 描述            |
| ------------------------------ | --------------- |
| `src/content/config.ts`        | ⚙️ Schema 定义  |
| `src/pages/content-test.astro` | 🧪 测试页面     |
| `src/content/blog/`            | 📝 3 篇示例文章 |
| `src/content/achievements/`    | 🏆 3 个示例成就 |

---

## 基本用法

### 在 .astro 页面中获取数据

```astro
---
import { getCollection } from 'astro:content';

// 获取所有
const posts = await getCollection('blog');
const achievements = await getCollection('achievements');

// 排序
const sorted = posts.sort((a, b) =>
  new Date(b.data.date) - new Date(a.data.date)
);
---
```

### Frontmatter 模板

**Blog:**

```yaml
---
title: "标题"
date: "2024-04-14"
tags: ["tag1", "tag2"]
coverImage: "url"
---
```

**Achievements:**

```yaml
---
title: "标题"
date: "2024-04-14"
category: "分类"
icon: "🏆"
---
```

---

## 测试页面

### 访问方式

http://localhost:4322/content-test

### 验证内容

✅ Blog 集合读取成功
✅ Achievements 集合读取成功
✅ Frontmatter Schema 验证
✅ 数据绑定和渲染

---

## Markdown 示例

### 创建博客文章

```
src/content/blog/my-post.md

---
title: "我的文章"
date: "2024-04-14"
tags: ["astro", "markdown"]
coverImage: "https://example.com/image.jpg"
---

# 文章内容

这是 Markdown 内容...
```

### 创建成就记录

```
src/content/achievements/my-achievement.md

---
title: "我的成就"
date: "2024-04-14"
category: "project"
icon: "🚀"
---

成就描述...
```

---

## 常用代码片段

### 按日期排序

```javascript
collection.sort((a, b) => new Date(b.data.date) - new Date(a.data.date));
```

### 过滤特定标签

```javascript
posts.filter((post) => post.data.tags.includes("astro"));
```

### 获取特定文章

```javascript
import { getEntryBySlug } from "astro:content";
const post = await getEntryBySlug("blog", "post-slug");
```

### 渲染内容

```javascript
const { Content } = await post.render();
```

---

## 项目结构

```
src/content/
├── config.ts
├── blog/
│   ├── astro-react.md
│   ├── framer-motion-guide.md
│   └── tailwind-glassmorphism.md
└── achievements/
    ├── astro-certification.md
    ├── first-open-source.md
    └── tech-talk.md
```

---

## 文档位置

| 文档     | 位置                                               |
| -------- | -------------------------------------------------- |
| 详细指南 | `CONTENT_COLLECTIONS_GUIDE.md`                     |
| 快速参考 | 本文件                                             |
| 配置文件 | `src/content/config.ts`                            |
| 测试页面 | [content-test](http://localhost:4322/content-test) |

---

## Obsidian 集成建议

1. **在 Obsidian 中创建 notes**
2. **使用正确的 Frontmatter 格式**
3. **保存到 `src/content/blog/` 或 `src/content/achievements/`**
4. **Astro 会自动检测和编译**

---

## 下一步行动

- [ ] 创建个人博客页面显示所有文章
- [ ] 创建成就展示页面
- [ ] 实现搜索功能
- [ ] 添加博客评论功能
- [ ] 配置 RSS 源

---

**数据流已验证 ✅ | 准备就绪 🚀**
