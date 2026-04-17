/**
 * src/components/BlogGrid.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * 博客文章网格组件：以卡片网格展示博客列表，点击展开全文弹窗。
 *
 * 功能：
 *   1. 以 1/2/3 列响应式网格渲染可拖拽的 DraggableCard 卡片
 *   2. 点击卡片 → 展开全屏弹窗（AnimatePresence + 弹簧动画过渡）
 *   3. 弹窗包含：封面图 / 标题 / 日期 / 标签 / 完整 HTML 内容 / 关闭按钮
 *   4. 全屏遮罩层：点击遮罩等同于关闭弹窗
 *
 * 数据来源（由父组件 index.astro 传入）：
 *   props.posts → index.astro 中的 postsWithContent 数组
 *                 来源：src/content/blog/*.md，frontmatter + marked 渲染后的 HTML
 *
 * 消费方：src/pages/index.astro（博客文章区块，client:load 激活）
 */
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DraggableCard from "./DraggableCard";

/**
 * 博客文章数据结构（与 index.astro 中的 BlogPostWithContent 接口保持一致）
 */
interface BlogPostWithContent {
  slug: string; // 文章标识符 = 文件名（无扩展名）
  data: {
    title: string; // 文章标题，来自 frontmatter.title
    date: Date; // 发布日期，来自 frontmatter.date
    tags: string[]; // 标签数组，来自 frontmatter.tags
    coverImage?: string; // 封面图路径（可选），来自 frontmatter.coverImage
  };
  html: string; // marked.parse 渲染后的完整 HTML，用于弹窗展示
  excerpt: string; // 纯文本前 150 字摘要，用于卡片预览
}

/** 组件 Props 接口 */
interface BlogGridProps {
  posts: BlogPostWithContent[]; // 博客文章数组（已排序）
}

export default function BlogGrid({ posts }: BlogGridProps) {
  // 当前展开的文章（null = 无弹窗）
  const [expandedPost, setExpandedPost] = useState<BlogPostWithContent | null>(
    null,
  );

  return (
    <>
      {/* ── 博客卡片网格：响应式 1/2/3 列 ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <DraggableCard
            key={post.slug}
            title={post.data.title}
            subtitle={post.excerpt} // 摘要作为副标题
            coverImage={post.data.coverImage}
            tags={post.data.tags}
            metadata={[
              `📅 ${post.data.date.toLocaleDateString("zh-CN")}`, // 中文格式化日期
              post.slug, // 文章 slug（文件名）
            ]}
            accentLabel="博客"
            onClick={() => setExpandedPost(post)} // 点击打开弹窗
          />
        ))}
      </div>

      {/* ── 详情展开弹窗：AnimatePresence 控制进入/退出动画 ──────────────────── */}
      <AnimatePresence>
        {expandedPost && (
          <>
            {/* 全屏遮罩：高斯模糊背景，点击关闭弹窗 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpandedPost(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-lg z-40"
            />

            {/* 弹窗容器：弹簧缩放进入，居中定位 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 26, stiffness: 240 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              {/* 弹窗内容区：毛玻璃面板，最大宽 4xl，最大高 90vh，可滚动 */}
              <div className="glass-panel max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
                {/* ── 关闭按钮（右上角圆形）──────────────────────────────────── */}
                <motion.button
                  onClick={() => setExpandedPost(null)}
                  className="absolute top-6 right-6 w-12 h-12 rounded-full bg-genshin-accent/80 backdrop-blur-sm border-2 border-genshin-gold/60 flex items-center justify-center z-10 group shadow-lg hover:shadow-genshin-glow transition-all duration-300"
                  whileHover={{
                    scale: 1.1,
                    backgroundColor: "rgba(184, 147, 109, 0.9)",
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-2xl text-genshin-light group-hover:text-genshin-gold transition-colors font-bold">
                    ✕
                  </span>
                </motion.button>

                {/* ── 封面图（可选）────────────────────────────────────────────── */}
                {expandedPost.data.coverImage && (
                  <img
                    src={expandedPost.data.coverImage}
                    alt={expandedPost.data.title}
                    className="w-full h-80 object-cover rounded-lg mb-6"
                  />
                )}

                {/* ── 文章标题 + 日期元数据 ──────────────────────────────────── */}
                <div className="mb-6">
                  <h1 className="text-5xl font-bold text-genshin-gradient mb-4">
                    {expandedPost.data.title}
                  </h1>
                  <div className="flex items-center gap-6 text-genshin-light/70">
                    <span className="flex items-center gap-2">
                      📅{" "}
                      {expandedPost.data.date.toLocaleDateString("zh-CN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </span>
                    <span className="text-genshin-gold/60">•</span>
                    <span className="text-sm">阅读时间: ~5 分钟</span>
                  </div>
                </div>

                {/* ── 标签云 ─────────────────────────────────────────────────── */}
                <div className="mb-8 flex flex-wrap gap-3">
                  {expandedPost.data.tags?.map((tag) => (
                    <motion.span
                      key={tag}
                      whileHover={{ scale: 1.1 }}
                      className="inline-block bg-genshin-accent/30 text-genshin-gold px-4 py-2 rounded-full text-sm font-medium cursor-default border border-genshin-gold/40"
                    >
                      #{tag}
                    </motion.span>
                  ))}
                </div>

                {/* ── 标题与内容之间的金色渐变分隔线 ──────────────────────────── */}
                <div className="h-px bg-gradient-to-r from-genshin-gold/0 via-genshin-gold/40 to-genshin-gold/0 mb-8" />

                {/* ── 文章正文（dangerouslySetInnerHTML 注入已渲染的 HTML）── */}
                {/* 内容来源：src/content/blog/*.md 正文，由 marked 在 index.astro 中渲染 */}
                <div
                  className="prose prose-invert max-w-none mb-8 genshin-text text-lg leading-relaxed space-y-4"
                  dangerouslySetInnerHTML={{
                    __html: expandedPost.html,
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
