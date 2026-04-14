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

// 导出所有集合
export const collections = {
  blog: blogCollection,
  achievements: achievementsCollection,
};
