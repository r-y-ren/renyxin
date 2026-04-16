# 在 src/content 目录中存放 Markdown 内容

这个目录用于存放您的 Markdown 内容文件。

## 使用方法

1. 创建 `.md` 或 `.mdx` 文件
2. 在您的 Astro 页面中使用 `getCollection()` 来查询内容
3. 使用 Astro Content Collections 来管理您的内容

## 示例

```astro
---
import { getCollection } from 'astro:content';

const posts = await getCollection('blog');
---

{posts.map(post => (
  <h2>{post.data.title}</h2>
))}
```
