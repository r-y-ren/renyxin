/**
 * src/content/config.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Astro Content Collections 统一类型定义文件。
 * 每个集合对应 src/content/<集合名>/ 目录下的 Markdown 文件。
 * 在页面/组件中通过 getCollection() / getEntry() 读取，Astro 会在构建时
 * 按此处的 schema 进行 frontmatter 类型校验，字段不符合则构建报错。
 *
 * 数据来源（Markdown 文件目录）：
 *   blog         → src/content/blog/*.md
 *   achievements → src/content/achievements/*.md
 *   daily-log    → src/content/daily-log/*.md
 *   skills       → src/content/skills/*.md
 *   site-info    → src/content/site-info/*.md
 *
 * 消费方（读取这些集合的文件）：
 *   src/pages/index.astro          — 读取全部集合渲染首页
 *   src/pages/daily-log/[...slug]  — 读取 daily-log 生成详情页
 */
import { defineCollection, z } from "astro:content";

// ──────────────────────────────────────────────────────────────────────────────
// Blog 集合
// 数据来源：src/content/blog/*.md
// 消费方：index.astro → postsWithContent → BlogGrid.tsx
// ──────────────────────────────────────────────────────────────────────────────
const blogCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(), // 文章标题（必填）
    date: z.coerce.date(), // 发布日期，自动强制转换为 Date 对象
    tags: z.array(z.string()).default([]), // 标签数组，默认为空数组
    coverImage: z.string().optional(), // 封面图路径（相对 public/），可选
  }),
});

// ──────────────────────────────────────────────────────────────────────────────
// Achievements 集合（成就系统）
// 数据来源：src/content/achievements/*.md
// 消费方：index.astro → sortedAchievements → AchievementGrid.tsx
// ──────────────────────────────────────────────────────────────────────────────
const achievementsCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(), // 成就名称（必填）
    date: z.coerce.date(), // 获得日期
    category: z.string(), // 分类（如 project/certification/milestone 等）
    icon: z.string().optional(), // emoji 图标，可选（默认 🏅）
  }),
});

// ──────────────────────────────────────────────────────────────────────────────
// Daily-log 集合（每日日志，兼容 Obsidian 导出格式）
// 数据来源：src/content/daily-log/*.md，文件名格式为 YYYY-MM-DD.md
// 消费方：
//   index.astro → dailyLogs → ContributionGraph.tsx（热力图）
//   src/pages/daily-log/[...slug].astro（详情页动态路由）
// ──────────────────────────────────────────────────────────────────────────────
const dailyLogCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(), // 日志标题（必填）
    date: z.coerce.date(), // 日志日期，对应热力图格子
    tags: z.array(z.string()).default([]), // 标签，用于详情页展示
  }),
});

// ──────────────────────────────────────────────────────────────────────────────
// Skills 集合（技能数据，每个 .md 文件代表一项技能）
// 数据来源：src/content/skills/*.md
// 消费方：index.astro → skillsData → SkillConstellation.tsx（技能星座图）
//                                  → 侧边栏技能列表
// ──────────────────────────────────────────────────────────────────────────────
const skillsCollection = defineCollection({
  type: "content",
  schema: z.object({
    name: z.string(), // 技能名称，如 "React"
    proficiency: z.number().min(0).max(100), // 熟练度 0-100，驱动星座节点大小
    class: z.string(), // 分类，如 frontend/backend/framework
    description: z.string(), // 技能描述文字
  }),
});

// ──────────────────────────────────────────────────────────────────────────────
// Site-info 集合（站点全局文案配置）
// 数据来源：src/content/site-info/*.md
//   - hero.md    → 首页个人介绍区域（标题/头像/正文）
//   - outlook.md → "关于未来"卡片（DraggableOutlook 组件）
//   - footer.md  → 页脚版权信息与社交链接
// 消费方：index.astro，通过 getEntry('site-info', 'hero') 等单条查询
// ──────────────────────────────────────────────────────────────────────────────
const siteInfoCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(), // 标题（通用字段）
    subtitle: z.string().optional(), // 副标题，可选
    // ── Hero 专用字段 ──────────────────────────────────────────────
    avatarImage: z.string().optional(), // 侧边栏头像路径（与立绘分开）
    characterImage: z.string().optional(), // 角色立绘路径，如 /pictures/胡桃.png
    avatarAlt: z.string().optional(), // 立绘 alt 文字，用于无障碍访问
    // ── Footer 专用字段 ────────────────────────────────────────────
    copyright: z.string().optional(), // 版权文字，如 "© 2025 人亦心"
    links: z
      .array(
        z.object({
          label: z.string(), // 链接显示文字（如 "GitHub"）
          href: z.string(), // 链接地址（完整 URL）
        }),
      )
      .optional(),
  }),
});

// ──────────────────────────────────────────────────────────────────────────────
// 统一导出：Astro 通过此对象发现并注册所有集合
// ──────────────────────────────────────────────────────────────────────────────
export const collections = {
  blog: blogCollection,
  achievements: achievementsCollection,
  "daily-log": dailyLogCollection,
  skills: skillsCollection,
  "site-info": siteInfoCollection,
};
