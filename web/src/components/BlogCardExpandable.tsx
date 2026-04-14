import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BlogCardExpandableProps {
  title: string;
  date: Date;
  tags: string[];
  coverImage?: string;
  slug: string;
  excerpt: string;
  content: string; // HTML 字符串
}

export default function BlogCardExpandable({
  title,
  date,
  tags,
  coverImage,
  slug,
  excerpt,
  content,
}: BlogCardExpandableProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedDate = date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <>
      {/* 列表态卡片 */}
      <motion.div
        layoutId={`blog-card-${slug}`}
        layout
        onClick={() => setIsExpanded(true)}
        className="glass-card hover:shadow-genshin-glow transition-all duration-300 cursor-pointer"
        whileHover={{ translateY: -5 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <motion.h3
              layoutId={`blog-title-${slug}`}
              layout
              initial={false}
              exit={{ opacity: 1 }}
              className="text-2xl font-bold text-genshin-light mb-2"
            >
              {title}
            </motion.h3>
            <p className="text-genshin-light/70 text-sm mb-3">
              📅 {formattedDate}
            </p>
            {coverImage && (
              <motion.img
                layoutId={`blog-cover-${slug}`}
                layout
                initial={false}
                exit={{ opacity: 1 }}
                src={coverImage}
                alt={title}
                className="w-full h-40 object-cover rounded mb-3"
              />
            )}
            <motion.p
              layout
              className="text-genshin-light/80 text-sm mb-3 line-clamp-2"
            >
              {excerpt}
            </motion.p>
            <div className="flex flex-wrap gap-2">
              {tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-block bg-genshin-gold/20 text-genshin-gold px-3 py-1 rounded-full text-xs font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-genshin-gold/20">
          <code className="text-genshin-gold/60 text-xs">{slug}</code>
        </div>
      </motion.div>

      {/* Modal 遮罩和详情框 */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* 高斯模糊背景 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-lg z-40"
            />

            {/* 详情弹窗 */}
            <motion.div
              layoutId={`blog-card-${slug}`}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 26, stiffness: 240 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="glass-panel max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
                {/* 关闭按钮 */}
                <motion.button
                  onClick={() => setIsExpanded(false)}
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
                {coverImage && (
                  <motion.img
                    layoutId={`blog-cover-${slug}`}
                    layout
                    initial={false}
                    exit={{ opacity: 1 }}
                    src={coverImage}
                    alt={title}
                    className="w-full h-80 object-cover rounded-lg mb-6"
                  />
                )}

                {/* 标题和元数据 */}
                <div className="mb-6">
                  <motion.h1
                    layoutId={`blog-title-${slug}`}
                    layout
                    initial={false}
                    exit={{ opacity: 1 }}
                    className="text-5xl font-bold text-genshin-gradient mb-4"
                  >
                    {title}
                  </motion.h1>
                  <div className="flex items-center gap-6 text-genshin-light/70">
                    <span className="flex items-center gap-2">
                      📅 {formattedDate}
                    </span>
                    <span className="text-genshin-gold/60">•</span>
                    <span className="text-sm">阅读时间: ~5 分钟</span>
                  </div>
                </div>

                {/* 标签 */}
                <div className="mb-8 flex flex-wrap gap-3">
                  {tags?.map((tag) => (
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
                <motion.div className="h-px bg-gradient-to-r from-genshin-gold/0 via-genshin-gold/40 to-genshin-gold/0 mb-8" />

                {/* 文章内容 */}
                <motion.div
                  layout
                  className="prose prose-invert max-w-none mb-8"
                  initial={false}
                >
                  <div
                    className="genshin-text text-lg leading-relaxed space-y-4"
                    dangerouslySetInnerHTML={{
                      __html: content,
                    }}
                  />
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
