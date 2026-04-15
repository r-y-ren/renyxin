import { defineCollection, z } from "astro:content";

// Blog 集合定义
const blogCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    coverImage: z.string().optional(),
  }),
});

// Achievements 集合定义
const achievementsCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.string(),
    icon: z.string().optional(),
  }),
});

// Daily-log 集合定义（对接 Obsidian 同步的每日日志）
const dailyLogCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
  }),
});

// Skills 集合（type: "content"，每个 MD 文件代表一项技能，frontmatter 存储结构化数据）
const skillsCollection = defineCollection({
  type: "content",
  schema: z.object({
    name: z.string(),
    proficiency: z.number().min(0).max(100),
    class: z.string(),
    description: z.string(),
  }),
});

// Site-info 集合（站点文案：Hero、关于未来、页脚社交链接等）
const siteInfoCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    // Hero 专用
    characterImage: z.string().optional(),
    characterAlt: z.string().optional(),
    // Footer 专用
    copyright: z.string().optional(),
    links: z
      .array(
        z.object({
          label: z.string(),
          href: z.string(),
        }),
      )
      .optional(),
  }),
});

// 导出所有集合
export const collections = {
  blog: blogCollection,
  achievements: achievementsCollection,
  "daily-log": dailyLogCollection,
  skills: skillsCollection,
  "site-info": siteInfoCollection,
};
