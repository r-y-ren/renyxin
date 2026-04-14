import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DraggableCard from "./DraggableCard";

interface BlogPostWithContent {
  slug: string;
  data: {
    title: string;
    date: Date;
    tags: string[];
    coverImage?: string;
  };
  html: string;
  excerpt: string;
}

interface BlogGridProps {
  posts: BlogPostWithContent[];
}

export default function BlogGrid({ posts }: BlogGridProps) {
  const [expandedPost, setExpandedPost] = useState<BlogPostWithContent | null>(
    null,
  );

  return (
    <>
      {/* 博客网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <DraggableCard
            key={post.slug}
            title={post.data.title}
            subtitle={post.excerpt}
            coverImage={post.data.coverImage}
            tags={post.data.tags}
            metadata={[
              `📅 ${post.data.date.toLocaleDateString("zh-CN")}`,
              post.slug,
            ]}
            accentLabel="博客"
            onClick={() => setExpandedPost(post)}
          />
        ))}
      </div>

      {/* 详情弹窗 */}
      <AnimatePresence>
        {expandedPost && (
          <>
            {/* 高斯模糊背景 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpandedPost(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-lg z-40"
            />

            {/* 详情弹窗 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 26, stiffness: 240 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="glass-panel max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
                {/* 关闭按钮 */}
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

                {/* 封面图 */}
                {expandedPost.data.coverImage && (
                  <img
                    src={expandedPost.data.coverImage}
                    alt={expandedPost.data.title}
                    className="w-full h-80 object-cover rounded-lg mb-6"
                  />
                )}

                {/* 标题和元数据 */}
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

                {/* 标签 */}
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

                {/* 分隔线 */}
                <div className="h-px bg-gradient-to-r from-genshin-gold/0 via-genshin-gold/40 to-genshin-gold/0 mb-8" />

                {/* 文章内容 */}
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
